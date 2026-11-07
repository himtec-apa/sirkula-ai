import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import pg from 'pg';
import { Redis } from 'ioredis';
import crypto from 'node:crypto';
import {
  ActorRole,
  BatchState,
  ClaimStatus,
  StateTriggerSource,
  VerifyHandoverDto,
} from '@sirkula/shared-types';
import { PG_POOL } from '../../database/database.module.js';
import { REDIS_CLIENT } from '../../redis/redis.module.js';
import { getEnv } from '../../config/env.js';
import { TriageWorkerService } from '../triage-worker/triage-worker.service.js';
import { SirkulaWebsocketGateway } from '../websocket/websocket.gateway.js';

export interface QrTokenPayload {
  batch_id: string;
  claim_id: string;
  receiver_id: string;
  tier: string;
  expires_at: string;
}

const ACTOR_ALIAS_MAP: Record<string, string> = {
  'actor-donor': 'a0000000-0000-0000-0000-000000000001',
  'actor-hub': 'b0000000-0000-0000-0000-000000000001',
  'actor-farmer': 'c0000000-0000-0000-0000-000000000001',
  'actor-compost': 'd0000000-0000-0000-0000-000000000001',
  'actor-auditor': 'e0000000-0000-0000-0000-000000000001',
  'actor-admin': 'f0000000-0000-0000-0000-000000000001',
};

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly triageWorkerService: TriageWorkerService,
    private readonly wsGateway: SirkulaWebsocketGateway
  ) {}

  async claimBatch(
    batchId: string,
    rawReceiverId: string,
    _actorRole: ActorRole,
    preferredTier?: string
  ) {
    const receiverId = ACTOR_ALIAS_MAP[rawReceiverId] || rawReceiverId;
    const env = getEnv();

    // 1. ATOMIC CLAIM LOCKING via Redis SET lock:batch:<id> <actor_id> NX EX 10
    const lockKey = `lock:batch:${batchId}`;
    const acquired = await this.redis.set(lockKey, receiverId, 'PX', 10000, 'NX');
    if (!acquired) {
      throw new ConflictException({
        error: 'Conflict',
        message: 'Batch sedang diklaim oleh entitas lain (Redis Lock acquisition failed)',
        batch_id: batchId,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch batch with row lock
      const batchRes = await client.query(
        `SELECT b.*,
                ST_Y(b.exact_pickup_location::geometry) as exact_lat,
                ST_X(b.exact_pickup_location::geometry) as exact_lng,
                a.name as donor_name,
                a.address_full,
                a.handover_point_notes
         FROM food_batches b
         JOIN actors a ON b.donor_id = a.id
         WHERE b.id = $1 FOR UPDATE`,
        [batchId]
      );

      if (batchRes.rowCount === 0) {
        throw new NotFoundException(`Food batch ${batchId} not found`);
      }

      const batch = batchRes.rows[0];
      const currentState = batch.current_state as BatchState;

      // Determine claim tier and target state with strict role authorization
      let claimTier: string;
      let targetState: BatchState;

      if (currentState === BatchState.TIER_1_HUMAN_ACTIVE) {
        if (_actorRole !== ActorRole.TIER_1_HUB && _actorRole !== ActorRole.SIMULATOR_ADMIN) {
          throw new ForbiddenException(
            `Actor role '${_actorRole}' cannot claim batch in state ${currentState}. Required: ${ActorRole.TIER_1_HUB}`
          );
        }
        claimTier = 'TIER_1_HUMAN';
        targetState = BatchState.TIER_1_CLAIMED;
      } else if (currentState === BatchState.TIER_2_ANIMAL_ACTIVE) {
        if (_actorRole !== ActorRole.TIER_2_FARMER && _actorRole !== ActorRole.SIMULATOR_ADMIN) {
          throw new ForbiddenException(
            `Actor role '${_actorRole}' cannot claim batch in state ${currentState}. Required: ${ActorRole.TIER_2_FARMER}`
          );
        }
        claimTier = 'TIER_2_ANIMAL';
        targetState = BatchState.TIER_2_CLAIMED;
      } else if (currentState === BatchState.TIER_3_COMPOST_ACTIVE) {
        if (_actorRole !== ActorRole.TIER_3_COMPOST && _actorRole !== ActorRole.SIMULATOR_ADMIN) {
          throw new ForbiddenException(
            `Actor role '${_actorRole}' cannot claim batch in state ${currentState}. Required: ${ActorRole.TIER_3_COMPOST}`
          );
        }
        claimTier = 'TIER_3_COMPOST';
        targetState = BatchState.TIER_3_COMPOST_ACTIVE;
      } else {
        throw new ConflictException(
          `Batch ${batchId} cannot be claimed in state ${currentState}`
        );
      }

      if (preferredTier && preferredTier !== claimTier) {
        throw new BadRequestException(
          `Batch is in state ${currentState} (eligible for ${claimTier}), cannot claim for ${preferredTier}`
        );
      }

      // Check active claim existence
      const activeClaimCheck = await client.query(
        `SELECT id FROM rescue_claims WHERE batch_id = $1 AND status = 'ACTIVE_EN_ROUTE'`,
        [batchId]
      );
      if ((activeClaimCheck.rowCount ?? 0) > 0) {
        throw new ConflictException(`Batch ${batchId} already has an active claim en-route`);
      }

      const claimId = crypto.randomUUID();
      const qrExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour token validity

      // 2. Cryptographic HMAC-SHA256 Token Generation
      const payload: QrTokenPayload = {
        batch_id: batchId,
        claim_id: claimId,
        receiver_id: receiverId,
        tier: claimTier,
        expires_at: qrExpiresAt.toISOString(),
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', env.HMAC_SECRET_KEY)
        .update(payloadString)
        .digest('hex');

      const rawQrToken = Buffer.from(
        JSON.stringify({ ...payload, sig: signature })
      ).toString('base64url');

      const qrTokenHash = crypto.createHash('sha256').update(rawQrToken).digest('hex');

      // Update food_batches
      await client.query(
        `UPDATE food_batches SET current_state = $1 WHERE id = $2`,
        [targetState, batchId]
      );

      // Insert rescue_claims
      await client.query(
        `INSERT INTO rescue_claims (
          id, batch_id, receiver_id, claimed_for_tier, status,
          qr_token, qr_token_hash, qr_expires_at, claimed_at
        ) VALUES ($1, $2, $3, $4, 'ACTIVE_EN_ROUTE', $5, $6, $7, NOW())`,
        [claimId, batchId, receiverId, claimTier, rawQrToken, qrTokenHash, qrExpiresAt.toISOString()]
      );

      // Insert state audit log
      await client.query(
        `INSERT INTO batch_state_audit_logs (
          batch_id, previous_state, new_state, trigger_source, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          batchId,
          currentState,
          targetState,
          StateTriggerSource.USER_CLAIM_ACTION,
          `Claimed by actor ${receiverId} for ${claimTier}`,
        ]
      );

      await client.query('COMMIT');

      // Broadcast WebSocket
      this.wsGateway.broadcastBatchClaimed({
        event: 'batch:claimed',
        batch_id: batchId,
        claim_id: claimId,
        receiver_id: receiverId,
        claimed_for_tier: claimTier,
        status: ClaimStatus.ACTIVE_EN_ROUTE,
        new_state: targetState,
      });

      return {
        claim_id: claimId,
        batch_id: batchId,
        claimed_for_tier: claimTier,
        status: ClaimStatus.ACTIVE_EN_ROUTE,
        new_batch_state: targetState,
        qr_token: rawQrToken,
        qr_expires_at: qrExpiresAt.toISOString(),
        pickup_instructions: {
          donor_name: batch.donor_name,
          address_full: batch.address_full,
          handover_point_notes: batch.handover_point_notes,
          exact_pickup_location: {
            latitude: Number(batch.exact_lat),
            longitude: Number(batch.exact_lng),
          },
        },
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.logger.error(`Claim failed for batch ${batchId}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async verifyHandover(batchId: string, donorActorId: string, dto: VerifyHandoverDto) {
    const env = getEnv();

    // 1. Verify and decode QR Token HMAC
    let decodedToken: any;
    try {
      const decodedJson = Buffer.from(dto.qr_token, 'base64url').toString('utf8');
      decodedToken = JSON.parse(decodedJson);
    } catch {
      throw new BadRequestException('Malformed QR token encoding');
    }

    const { sig, ...payloadObj } = decodedToken;
    if (!sig) {
      throw new BadRequestException('QR token signature missing');
    }

    const expectedSig = crypto
      .createHmac('sha256', env.HMAC_SECRET_KEY)
      .update(JSON.stringify(payloadObj))
      .digest('hex');

    // Cryptographic timing-attack safe comparison
    if (
      typeof sig !== 'string' ||
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))
    ) {
      throw new BadRequestException('Invalid QR token cryptographic signature');
    }

    if (payloadObj.batch_id !== batchId) {
      throw new BadRequestException('QR token does not match target batch');
    }

    // Verify QR token expiration
    if (!payloadObj.expires_at || new Date(payloadObj.expires_at).getTime() <= Date.now()) {
      throw new BadRequestException('QR token has expired');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const batchRes = await client.query(
        `SELECT b.*, a.id as donor_id, a.name as donor_name
         FROM food_batches b
         JOIN actors a ON b.donor_id = a.id
         WHERE b.id = $1 FOR UPDATE`,
        [batchId]
      );

      if (batchRes.rowCount === 0) {
        throw new NotFoundException(`Batch ${batchId} not found`);
      }

      const batch = batchRes.rows[0];

      // BOLA/IDOR protection: verify caller is the genuine donor of the batch
      const effectiveDonorId = donorActorId ? (ACTOR_ALIAS_MAP[donorActorId] || donorActorId) : '';
      if (effectiveDonorId && batch.donor_id !== effectiveDonorId) {
        throw new ForbiddenException(
          `Actor ${donorActorId} is not the authorized donor of batch ${batchId}`
        );
      }

      const claimRes = await client.query(
        `SELECT * FROM rescue_claims
         WHERE id = $1 AND batch_id = $2 AND status = 'ACTIVE_EN_ROUTE' FOR UPDATE`,
        [payloadObj.claim_id, batchId]
      );

      if (claimRes.rowCount === 0) {
        throw new ConflictException(`No active claim found for batch ${batchId}`);
      }

      const claim = claimRes.rows[0];
      const now = new Date();

      if (claim.qr_expires_at && new Date(claim.qr_expires_at).getTime() <= now.getTime()) {
        throw new BadRequestException('Rescue claim QR window has expired');
      }

      // =========================================================================
      // 2. CRITICAL SAFETY INVARIANT:
      // If TIER_1_HUMAN and NOW() >= tier1_expires_at:
      // Reject verification with 422 Unprocessable Entity, revoke claim,
      // and force mutate batch to TIER_2_ANIMAL_ACTIVE.
      // =========================================================================
      if (
        claim.claimed_for_tier === 'TIER_1_HUMAN' &&
        now.getTime() >= new Date(batch.tier1_expires_at).getTime()
      ) {
        // Revoke courier claim
        await client.query(
          `UPDATE rescue_claims
           SET status = 'EXPIRED_AUTO_REVOKED', revocation_reason = 'TIER_1_BIO_EXPIRY_REJECTED'
           WHERE id = $1`,
          [claim.id]
        );

        // Mutate batch to TIER_2_ANIMAL_ACTIVE
        await client.query(
          `UPDATE food_batches SET current_state = 'TIER_2_ANIMAL_ACTIVE' WHERE id = $1`,
          [batchId]
        );

        // Record in audit logs
        await client.query(
          `INSERT INTO batch_state_audit_logs (
            batch_id, previous_state, new_state, trigger_source, notes
          ) VALUES ($1, $2, 'TIER_2_ANIMAL_ACTIVE', $3, $4)`,
          [
            batchId,
            batch.current_state,
            StateTriggerSource.BULLMQ_BIO_TIMER,
            'CRITICAL SAFETY INVARIANT BREACH: Handover rejected due to tier1_expires_at exceeded. Batch forcefully mutated to Tier 2 (Animal Feed).',
          ]
        );

        await client.query('COMMIT');

        // Broadcast WS
        this.wsGateway.broadcastStateTransitioned({
          event: 'batch:state_transitioned',
          batch_id: batchId,
          previous_state: batch.current_state,
          new_state: BatchState.TIER_2_ANIMAL_ACTIVE,
          reason: 'BIO_THERMAL_LIMIT_EXCEEDED',
          next_expires_at: batch.tier2_expires_at,
          eligible_role: ActorRole.TIER_2_FARMER,
        });

        throw new UnprocessableEntityException({
          error: 'Unprocessable Entity',
          message:
            'Batas waktu aman konsumsi manusia terlampaui (tier1_expires_at exceeded). Verifikasi serah terima DITOLAK demi keselamatan pangan, klaim kurir manusia dibatalkan otomatis, dan batch dialihkan ke TIER_2_ANIMAL_ACTIVE.',
          batch_id: batchId,
          mutated_state: BatchState.TIER_2_ANIMAL_ACTIVE,
        });
      }

      // 3. Handover Success Path: Generate Digital Liability Waiver SHA-256 Hash
      const handoverTemp = dto.handover_ambient_temp_c ?? batch.ambient_temp_c ?? 30.0;
      const handoverTimeIso = now.toISOString();

      const waiverSignatureHash = crypto
        .createHash('sha256')
        .update(`${batch.id}:${claim.receiver_id}:${handoverTimeIso}:${handoverTemp}`)
        .digest('hex');

      const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const waiverCertificateNo = `SRK-ESG-${yearMonth}-${randomSuffix}`;

      // Update rescue_claims
      await client.query(
        `UPDATE rescue_claims
         SET status = 'HANDOVER_COMPLETED',
             handover_scanned_at = NOW(),
             handover_ambient_temp_c = $1,
             liability_waiver_accepted = TRUE,
             waiver_signature_hash = $2
         WHERE id = $3`,
        [handoverTemp, waiverSignatureHash, claim.id]
      );

      // Update food_batches to COMPLETED
      await client.query(
        `UPDATE food_batches SET current_state = 'COMPLETED' WHERE id = $1`,
        [batchId]
      );

      // Insert ESG telemetry log (CO2e, CH4, Feed Savings are GENERATED columns)
      const esgRes = await client.query(
        `INSERT INTO esg_telemetry_logs (
          batch_id, claim_id, donor_id, receiver_id, final_rescued_tier,
          weight_saved_kg, portions_saved, waiver_certificate_no
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING co2e_avoided_kg, methane_ch4_avoided_kg, estimated_feed_savings_idr, recorded_at`,
        [
          batchId,
          claim.id,
          batch.donor_id,
          claim.receiver_id,
          claim.claimed_for_tier,
          batch.total_weight_kg,
          batch.total_portions,
          waiverCertificateNo,
        ]
      );

      const esgRow = esgRes.rows[0];

      // Insert audit log
      await client.query(
        `INSERT INTO batch_state_audit_logs (
          batch_id, previous_state, new_state, trigger_source, notes
        ) VALUES ($1, $2, 'COMPLETED', $3, $4)`,
        [
          batchId,
          batch.current_state,
          StateTriggerSource.QR_HANDSHAKE_SCAN,
          `Handover successfully verified via HMAC QR token. Waiver issued: ${waiverCertificateNo}`,
        ]
      );

      await client.query('COMMIT');

      // Cancel delayed jobs in BullMQ
      await this.triageWorkerService.cancelTriageJobs(batchId);

      // Broadcast WS
      this.wsGateway.broadcastHandoverCompleted({
        event: 'batch:handover_completed',
        batch_id: batchId,
        claim_id: claim.id,
        donor_id: batch.donor_id,
        receiver_id: claim.receiver_id,
        waiver_certificate_no: waiverCertificateNo,
        waiver_signature_hash: waiverSignatureHash,
        weight_saved_kg: Number(batch.total_weight_kg),
        portions_saved: Number(batch.total_portions),
        co2e_avoided_kg: Number(esgRow.co2e_avoided_kg),
        methane_ch4_avoided_kg: Number(esgRow.methane_ch4_avoided_kg),
        estimated_feed_savings_idr: Number(esgRow.estimated_feed_savings_idr),
        final_rescued_tier: claim.claimed_for_tier,
      });

      return {
        status: 'HANDOVER_COMPLETED',
        batch_id: batchId,
        claim_id: claim.id,
        current_state: BatchState.COMPLETED,
        digital_liability_waiver: {
          certificate_no: waiverCertificateNo,
          waiver_signature_hash: waiverSignatureHash,
          handover_scanned_at: handoverTimeIso,
          ambient_temp_c: handoverTemp,
          legal_status: 'DONOR_LIABILITY_FULLY_DISCHARGED',
        },
        esg_impact: {
          weight_saved_kg: Number(batch.total_weight_kg),
          portions_saved: Number(batch.total_portions),
          co2e_avoided_kg: Number(esgRow.co2e_avoided_kg),
          methane_ch4_avoided_kg: Number(esgRow.methane_ch4_avoided_kg),
          estimated_feed_savings_idr: Number(esgRow.estimated_feed_savings_idr),
        },
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.logger.error(`Handover verification error for batch ${batchId}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
}
