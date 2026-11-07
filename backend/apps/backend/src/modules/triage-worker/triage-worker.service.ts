import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import pg from 'pg';
import { BatchState, StateTriggerSource, ActorRole } from '@sirkula/shared-types';
import { PG_POOL } from '../../database/database.module.js';
import { getEnv } from '../../config/env.js';
import { SirkulaWebsocketGateway } from '../websocket/websocket.gateway.js';

export const TRIAGE_QUEUE_NAME = 'triage-state-queue';

export interface TriageJobData {
  batch_id: string;
  target_state?: BatchState;
}

@Injectable()
export class TriageWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TriageWorkerService.name);
  public queue!: Queue<TriageJobData>;
  private worker!: Worker<TriageJobData>;

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly wsGateway: SirkulaWebsocketGateway
  ) {}

  async onModuleInit() {
    const env = getEnv();
    const connection = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue<TriageJobData>(TRIAGE_QUEUE_NAME, { connection });

    this.worker = new Worker<TriageJobData>(
      TRIAGE_QUEUE_NAME,
      async (job: Job<TriageJobData>) => {
        await this.handleJob(job);
      },
      { connection, concurrency: 5 }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.name} (batch: ${job?.data?.batch_id}) failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async scheduleTriageJobs(batchId: string, tier1ExpiresAt: Date, tier2ExpiresAt: Date) {
    const now = Date.now();
    const delayTier1 = Math.max(1000, tier1ExpiresAt.getTime() - now);
    const delayTier2 = Math.max(2000, tier2ExpiresAt.getTime() - now);

    // 1. Expand ripple radius at 10 minutes (or half of delayTier1 if shorter)
    const rippleDelay = Math.min(10 * 60 * 1000, Math.floor(delayTier1 / 2));
    await this.queue.add(
      'expand-ripple',
      { batch_id: batchId },
      { delay: rippleDelay, jobId: `ripple-${batchId}` }
    );

    // 2. Auto-mutate to Tier 2 at tier1_expires_at
    await this.queue.add(
      'mutate-to-tier2',
      { batch_id: batchId, target_state: BatchState.TIER_2_ANIMAL_ACTIVE },
      { delay: delayTier1, jobId: `tier2-${batchId}` }
    );

    // 3. Auto-mutate to Tier 3 at tier2_expires_at
    await this.queue.add(
      'mutate-to-tier3',
      { batch_id: batchId, target_state: BatchState.TIER_3_COMPOST_ACTIVE },
      { delay: delayTier2, jobId: `tier3-${batchId}` }
    );

    this.logger.log(`Scheduled BullMQ triage jobs for batch ${batchId} (Tier 2 in ${Math.round(delayTier1 / 1000)}s)`);
  }

  async cancelTriageJobs(batchId: string) {
    try {
      const jobIds = [`ripple-${batchId}`, `tier2-${batchId}`, `tier3-${batchId}`];
      for (const id of jobIds) {
        const job = await this.queue.getJob(id);
        if (job) {
          await job.remove();
        }
      }
    } catch (err: any) {
      this.logger.warn(`Notice while cancelling jobs for ${batchId}: ${err.message}`);
    }
  }

  private async handleJob(job: Job<TriageJobData>) {
    const { batch_id } = job.data;
    if (!batch_id) return;

    if (job.name === 'expand-ripple') {
      await this.processExpandRipple(batch_id);
    } else if (job.name === 'mutate-to-tier2') {
      await this.processMutateToTier2(batch_id, StateTriggerSource.BULLMQ_BIO_TIMER);
    } else if (job.name === 'mutate-to-tier3') {
      await this.processMutateToTier3(batch_id, StateTriggerSource.BULLMQ_BIO_TIMER);
    }
  }

  private async processExpandRipple(batchId: string) {
    const res = await this.pool.query(
      `SELECT current_state, current_ripple_radius_m FROM food_batches WHERE id = $1`,
      [batchId]
    );
    if (res.rowCount === 0) return;

    const batch = res.rows[0];
    if (batch.current_state !== BatchState.TIER_1_HUMAN_ACTIVE) return;

    let nextRadius = 3000;
    if (batch.current_ripple_radius_m >= 3000) {
      nextRadius = 5000;
    }

    await this.pool.query(
      `UPDATE food_batches SET current_ripple_radius_m = $1 WHERE id = $2`,
      [nextRadius, batchId]
    );

    this.logger.log(`Expanded ripple radius for batch ${batchId} to ${nextRadius}m`);
  }

  public async processMutateToTier2(
    batchId: string,
    triggerSource: StateTriggerSource = StateTriggerSource.BULLMQ_BIO_TIMER,
    notes?: string
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const bRes = await client.query(
        `SELECT current_state, tier2_expires_at FROM food_batches WHERE id = $1 FOR UPDATE`,
        [batchId]
      );
      if (bRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const currentState = bRes.rows[0].current_state as BatchState;
      // If already completed or cancelled, do not mutate
      if (currentState === BatchState.COMPLETED || currentState === BatchState.CANCELLED_BY_DONOR) {
        await client.query('ROLLBACK');
        return;
      }

      // If already in Tier 2 or Tier 3, no need to regress
      if (
        currentState === BatchState.TIER_2_ANIMAL_ACTIVE ||
        currentState === BatchState.TIER_2_CLAIMED ||
        currentState === BatchState.TIER_3_COMPOST_ACTIVE
      ) {
        await client.query('ROLLBACK');
        return;
      }

      // Revoke any active Tier 1 claims
      await client.query(
        `UPDATE rescue_claims
         SET status = 'EXPIRED_AUTO_REVOKED', revocation_reason = 'TIER_1_BIO_EXPIRY_REJECTED'
         WHERE batch_id = $1 AND status = 'ACTIVE_EN_ROUTE'`,
        [batchId]
      );

      // Mutate batch to TIER_2_ANIMAL_ACTIVE
      await client.query(
        `UPDATE food_batches
         SET current_state = 'TIER_2_ANIMAL_ACTIVE'
         WHERE id = $1`,
        [batchId]
      );

      // Record audit log
      await client.query(
        `INSERT INTO batch_state_audit_logs (
          batch_id, previous_state, new_state, trigger_source, notes
        ) VALUES ($1, $2, 'TIER_2_ANIMAL_ACTIVE', $3, $4)`,
        [
          batchId,
          currentState,
          triggerSource,
          notes ?? 'Automated bio-thermal transition: Human safety threshold expired',
        ]
      );

      await client.query('COMMIT');

      this.logger.warn(`Batch ${batchId} mutated to TIER_2_ANIMAL_ACTIVE (Source: ${triggerSource})`);

      // Broadcast WebSocket
      this.wsGateway.broadcastStateTransitioned({
        event: 'batch:state_transitioned',
        batch_id: batchId,
        previous_state: currentState,
        new_state: BatchState.TIER_2_ANIMAL_ACTIVE,
        reason: 'BIO_THERMAL_LIMIT_EXCEEDED',
        next_expires_at: bRes.rows[0].tier2_expires_at,
        eligible_role: ActorRole.TIER_2_FARMER,
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.logger.error(`Error mutating batch ${batchId} to Tier 2: ${err.message}`);
    } finally {
      client.release();
    }
  }

  public async processMutateToTier3(
    batchId: string,
    triggerSource: StateTriggerSource = StateTriggerSource.BULLMQ_BIO_TIMER,
    notes?: string
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const bRes = await client.query(
        `SELECT current_state FROM food_batches WHERE id = $1 FOR UPDATE`,
        [batchId]
      );
      if (bRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const currentState = bRes.rows[0].current_state as BatchState;
      if (currentState === BatchState.COMPLETED || currentState === BatchState.CANCELLED_BY_DONOR) {
        await client.query('ROLLBACK');
        return;
      }

      if (currentState === BatchState.TIER_3_COMPOST_ACTIVE) {
        await client.query('ROLLBACK');
        return;
      }

      await client.query(
        `UPDATE rescue_claims
         SET status = 'EXPIRED_AUTO_REVOKED', revocation_reason = 'TIER_2_EXPIRY_TIMEOUT'
         WHERE batch_id = $1 AND status = 'ACTIVE_EN_ROUTE'`,
        [batchId]
      );

      await client.query(
        `UPDATE food_batches
         SET current_state = 'TIER_3_COMPOST_ACTIVE'
         WHERE id = $1`,
        [batchId]
      );

      await client.query(
        `INSERT INTO batch_state_audit_logs (
          batch_id, previous_state, new_state, trigger_source, notes
        ) VALUES ($1, $2, 'TIER_3_COMPOST_ACTIVE', $3, $4)`,
        [
          batchId,
          currentState,
          triggerSource,
          notes ?? 'Automated bio-thermal transition: Biomass feed shelf-life exceeded. Diverted to compost.',
        ]
      );

      await client.query('COMMIT');

      this.logger.warn(`Batch ${batchId} mutated to TIER_3_COMPOST_ACTIVE (Source: ${triggerSource})`);

      this.wsGateway.broadcastStateTransitioned({
        event: 'batch:state_transitioned',
        batch_id: batchId,
        previous_state: currentState,
        new_state: BatchState.TIER_3_COMPOST_ACTIVE,
        reason: 'ANIMAL_FEED_SHELF_LIFE_EXCEEDED',
        next_expires_at: null,
        eligible_role: ActorRole.TIER_3_COMPOST,
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.logger.error(`Error mutating batch ${batchId} to Tier 3: ${err.message}`);
    } finally {
      client.release();
    }
  }
}
