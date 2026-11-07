import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import pg from 'pg';
import {
  TimeWarpSimulationDto,
  StateTriggerSource,
  BatchState,
  FoodRiskCategory,
} from '@sirkula/shared-types';
import { calculateDynamicSafeWindow } from '@sirkula/bio-thermal-sdk';
import { PG_POOL } from '../../database/database.module.js';
import { TriageWorkerService } from '../triage-worker/triage-worker.service.js';
import { SirkulaWebsocketGateway } from '../websocket/websocket.gateway.js';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly triageWorkerService: TriageWorkerService,
    private readonly wsGateway: SirkulaWebsocketGateway
  ) {}

  async timeWarp(dto: TimeWarpSimulationDto) {
    const { batch_id, override_temp_c, force_expire_tier1, force_expire_tier2, notes } = dto;

    const bRes = await this.pool.query(
      `SELECT * FROM food_batches WHERE id = $1`,
      [batch_id]
    );

    if (bRes.rowCount === 0) {
      throw new NotFoundException(`Batch ${batch_id} not found`);
    }

    const batch = bRes.rows[0];

    // 1. Force instant spoilage to Tier 2 (Pakan Ternak)
    if (force_expire_tier1) {
      await this.triageWorkerService.processMutateToTier2(
        batch_id,
        StateTriggerSource.GOD_MODE_SIMULATOR,
        notes || 'Instant bio-thermal decay triggered by Judge/Admin God-Mode'
      );

      return {
        batch_id,
        simulated_action: 'FORCE_EXPIRE_TIER_1',
        new_state: BatchState.TIER_2_ANIMAL_ACTIVE,
        message: 'Batch successfully mutated to Tier 2 (Animal Feed). Human access locked.',
      };
    }

    // 2. Force instant compost mutation to Tier 3
    if (force_expire_tier2) {
      await this.triageWorkerService.processMutateToTier3(
        batch_id,
        StateTriggerSource.GOD_MODE_SIMULATOR,
        notes || 'Instant compost transition triggered by God-Mode'
      );

      return {
        batch_id,
        simulated_action: 'FORCE_EXPIRE_TIER_2',
        new_state: BatchState.TIER_3_COMPOST_ACTIVE,
        message: 'Batch successfully mutated to Tier 3 (Compost).',
      };
    }

    // 3. Environmental Temperature Override & Q10 Recalculation
    if (typeof override_temp_c === 'number') {
      const bioTimings = calculateDynamicSafeWindow({
        category: batch.highest_risk_category as FoodRiskCategory,
        ambientTempC: override_temp_c,
        humidityPct: batch.humidity_pct,
        exposedMinutesPrior: batch.exposed_minutes_prior,
        isAcRoom: false,
      });

      await this.pool.query(
        `UPDATE food_batches
         SET ambient_temp_c = $1,
             q10_decay_multiplier = $2,
             safe_window_human_min = $3,
             tier1_expires_at = $4,
             tier2_expires_at = $5
         WHERE id = $6`,
        [
          override_temp_c,
          bioTimings.q10DecayMultiplier,
          bioTimings.safeWindowHumanMin,
          bioTimings.tier1ExpiresAt.toISOString(),
          bioTimings.tier2ExpiresAt.toISOString(),
          batch_id,
        ]
      );

      await this.pool.query(
        `INSERT INTO batch_state_audit_logs (
          batch_id, previous_state, new_state, trigger_source, simulated_temp_override_c, notes
        ) VALUES ($1, $2, $2, $3, $4, $5)`,
        [
          batch_id,
          batch.current_state,
          StateTriggerSource.GOD_MODE_SIMULATOR,
          override_temp_c,
          `Temperature override to ${override_temp_c}°C. Recalculated safe window: ${bioTimings.safeWindowHumanMin}m`,
        ]
      );

      // Reschedule BullMQ triage jobs
      await this.triageWorkerService.cancelTriageJobs(batch_id);
      await this.triageWorkerService.scheduleTriageJobs(
        batch_id,
        bioTimings.tier1ExpiresAt,
        bioTimings.tier2ExpiresAt
      );

      this.logger.log(`Time-warp temperature override executed on batch ${batch_id}: ${override_temp_c}°C`);

      this.wsGateway.broadcastStateTransitioned({
        event: 'batch:state_transitioned',
        batch_id,
        previous_state: batch.current_state,
        new_state: batch.current_state,
        reason: 'SIMULATION_TEMPERATURE_OVERRIDE',
        next_expires_at: bioTimings.tier1ExpiresAt.toISOString(),
        eligible_role: null,
      });

      return {
        batch_id,
        simulated_action: 'TEMPERATURE_OVERRIDE',
        override_temp_c,
        new_q10_decay_multiplier: bioTimings.q10DecayMultiplier,
        new_safe_window_human_min: bioTimings.safeWindowHumanMin,
        tier1_expires_at: bioTimings.tier1ExpiresAt.toISOString(),
        tier2_expires_at: bioTimings.tier2ExpiresAt.toISOString(),
      };
    }

    return {
      batch_id,
      status: 'NO_ACTION_TRIGGERED',
      current_state: batch.current_state,
    };
  }
}
