import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import pg from 'pg';
import {
  CreateBatchDto,
  NearbyBatchesQuery,
  ActorRole,
  BatchState,
  StateTriggerSource,
} from '@sirkula/shared-types';
import { calculateDynamicSafeWindow } from '@sirkula/bio-thermal-sdk';
import { PG_POOL } from '../../database/database.module.js';
import { WeatherService } from '../weather/weather.service.js';
import { VisionAiService } from '../vision-ai/vision-ai.service.js';
import { TriageWorkerService } from '../triage-worker/triage-worker.service.js';
import { SirkulaWebsocketGateway } from '../websocket/websocket.gateway.js';
import { createObfuscatedLocation } from './utils/geo-jitter.js';

const ACTOR_ALIAS_MAP: Record<string, string> = {
  'actor-donor': 'a0000000-0000-0000-0000-000000000001',
  'actor-hub': 'b0000000-0000-0000-0000-000000000001',
  'actor-farmer': 'c0000000-0000-0000-0000-000000000001',
  'actor-compost': 'd0000000-0000-0000-0000-000000000001',
  'actor-auditor': 'e0000000-0000-0000-0000-000000000001',
  'actor-admin': 'f0000000-0000-0000-0000-000000000001',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly weatherService: WeatherService,
    private readonly visionAiService: VisionAiService,
    private readonly triageWorkerService: TriageWorkerService,
    private readonly wsGateway: SirkulaWebsocketGateway
  ) {}

  async analyzeAndCreateBatch(
    donorId: string,
    dto: CreateBatchDto,
    file?: Express.Multer.File
  ) {
    const lat = dto.latitude;
    const lng = dto.longitude;

    let base64Image = dto.image_base64;
    if (file && file.buffer) {
      base64Image = file.buffer.toString('base64');
    }

    // 1. Parallel Intelligence Fetch: Vision AI + Weather API via Promise.allSettled()
    const [visionResult, weatherResult] = await Promise.allSettled([
      this.visionAiService.analyzeFoodImage(base64Image),
      this.weatherService.getWeatherData(lat, lng),
    ]);

    const visionData =
      visionResult.status === 'fulfilled'
        ? visionResult.value
        : (await this.visionAiService.analyzeFoodImage());

    const weatherData =
      weatherResult.status === 'fulfilled'
        ? weatherResult.value
        : { ambient_temp_c: 30.0, humidity_pct: 75, is_fallback: true };

    // 2. Microbiology Q10 Decay Calculation
    const bioTimings = calculateDynamicSafeWindow({
      category: visionData.highest_risk_category,
      ambientTempC: weatherData.ambient_temp_c,
      humidityPct: weatherData.humidity_pct,
      exposedMinutesPrior: dto.exposed_minutes,
      isAcRoom: dto.is_ac_room,
    });

    // 3. Coordinate Obfuscation (Jitter 200-300m for public radar before claim)
    const obfuscated = createObfuscatedLocation(lat, lng, 200, 300);

    const imageUrl = base64Image
      ? (base64Image.startsWith('data:') ? base64Image : `data:${file?.mimetype || 'image/jpeg'};base64,${base64Image}`)
      : (dto.image_url || '/assets/food-rescue-scenes.png');

    // 4. Atomic Database Transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Verify donor exists with alias & fallback support
      let effectiveDonorId = ACTOR_ALIAS_MAP[donorId] || donorId;
      if (!UUID_REGEX.test(effectiveDonorId)) {
        effectiveDonorId = 'a0000000-0000-0000-0000-000000000001';
      }
      let donorCheck = await client.query('SELECT id, name FROM actors WHERE id = $1', [effectiveDonorId]);
      if (donorCheck.rowCount === 0) {
        effectiveDonorId = 'a0000000-0000-0000-0000-000000000001';
        donorCheck = await client.query('SELECT id, name FROM actors WHERE id = $1', [effectiveDonorId]);
      }

      // Insert food_batches
      const insertBatchQuery = `
        INSERT INTO food_batches (
          donor_id,
          image_url,
          batch_summary,
          vision_raw_json,
          highest_risk_category,
          total_portions,
          total_weight_kg,
          recommended_container,
          ambient_temp_c,
          humidity_pct,
          is_ac_room,
          exposed_minutes_prior,
          base_shelf_life_min,
          q10_decay_multiplier,
          safe_window_human_min,
          exact_pickup_location,
          obfuscated_location,
          current_ripple_radius_m,
          current_state,
          tier1_expires_at,
          tier2_expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          ST_SetSRID(ST_MakePoint($16, $17), 4326)::geography,
          ST_SetSRID(ST_MakePoint($18, $19), 4326)::geography,
          1500,
          'TIER_1_HUMAN_ACTIVE',
          $20,
          $21
        )
        RETURNING id, created_at;
      `;

      const batchRes = await client.query(insertBatchQuery, [
        effectiveDonorId,
        imageUrl,
        visionData.batch_summary,
        JSON.stringify(visionData),
        visionData.highest_risk_category,
        visionData.total_portions,
        visionData.total_weight_kg,
        visionData.recommended_container,
        weatherData.ambient_temp_c,
        weatherData.humidity_pct,
        dto.is_ac_room,
        dto.exposed_minutes,
        bioTimings.baseShelfLifeMin,
        bioTimings.q10DecayMultiplier,
        bioTimings.safeWindowHumanMin,
        lng,
        lat,
        obfuscated.longitude,
        obfuscated.latitude,
        bioTimings.tier1ExpiresAt.toISOString(),
        bioTimings.tier2ExpiresAt.toISOString(),
      ]);

      const batchId = batchRes.rows[0].id;

      // Insert batch_items
      for (const item of visionData.items) {
        await client.query(
          `INSERT INTO batch_items (
            batch_id, menu_name, category, estimated_portions, estimated_weight_kg,
            contains_coconut_milk, animal_feed_suitable, ai_confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            batchId,
            item.menu_name,
            item.category,
            item.estimated_portions,
            item.estimated_weight_kg,
            item.contains_coconut_milk,
            item.animal_feed_suitable,
            item.ai_confidence_score,
          ]
        );
      }

      // Insert initial audit log
      await client.query(
        `INSERT INTO batch_state_audit_logs (
          batch_id, previous_state, new_state, trigger_source, notes
        ) VALUES ($1, NULL, 'TIER_1_HUMAN_ACTIVE', $2, $3)`,
        [batchId, StateTriggerSource.INITIAL_INGESTION, 'Batch initial zero-click AI ingestion']
      );

      await client.query('COMMIT');

      // 5. Schedule BullMQ Triage Jobs
      await this.triageWorkerService.scheduleTriageJobs(
        batchId,
        bioTimings.tier1ExpiresAt,
        bioTimings.tier2ExpiresAt
      );

      // 6. Broadcast Real-Time WebSocket Event
      const createdBatch = await this.getBatchById(batchId);
      this.wsGateway.broadcastBatchCreated({
        batch: createdBatch as any,
        event: 'batch:created',
        batch_id: batchId,
        batch_summary: visionData.batch_summary,
        highest_risk_category: visionData.highest_risk_category,
        total_portions: visionData.total_portions,
        total_weight_kg: visionData.total_weight_kg,
        current_state: BatchState.TIER_1_HUMAN_ACTIVE,
        tier1_expires_at: bioTimings.tier1ExpiresAt.toISOString(),
        tier2_expires_at: bioTimings.tier2ExpiresAt.toISOString(),
        obfuscated_location: obfuscated,
        current_ripple_radius_m: 1500,
      });

      return {
        batch_id: batchId,
        detected_items: visionData.items,
        environmental_metrics: {
          ambient_temp_c: weatherData.ambient_temp_c,
          humidity_pct: weatherData.humidity_pct,
          effective_temp_c: bioTimings.effectiveTempC,
          is_fallback: weatherData.is_fallback,
        },
        bio_thermal_timings: {
          base_shelf_life_min: bioTimings.baseShelfLifeMin,
          q10_decay_multiplier: bioTimings.q10DecayMultiplier,
          safe_window_human_min: bioTimings.safeWindowHumanMin,
          tier1_expires_at: bioTimings.tier1ExpiresAt.toISOString(),
          tier2_expires_at: bioTimings.tier2ExpiresAt.toISOString(),
        },
        current_state: BatchState.TIER_1_HUMAN_ACTIVE,
        obfuscated_location: obfuscated,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to create batch: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async getNearbyBatches(query: NearbyBatchesQuery, actorRole: ActorRole, actorId?: string) {
    const radiusM = query.radius_m || 50000;
    const lat = query.latitude;
    const lng = query.longitude;

    let effectiveActorId = actorId;
    if (effectiveActorId && ACTOR_ALIAS_MAP[effectiveActorId]) {
      effectiveActorId = ACTOR_ALIAS_MAP[effectiveActorId];
    }

    // PostGIS GIST spatial query with ST_DWithin and ST_Distance
    const sql = `
      SELECT
        b.id,
        b.donor_id,
        b.image_url,
        b.batch_summary,
        b.highest_risk_category,
        b.total_portions,
        b.total_weight_kg,
        b.recommended_container,
        b.ambient_temp_c,
        b.humidity_pct,
        b.safe_window_human_min,
        b.current_state,
        b.tier1_expires_at,
        b.tier2_expires_at,
        b.current_ripple_radius_m,
        b.created_at,
        ST_Y(b.obfuscated_location::geometry) AS obfuscated_lat,
        ST_X(b.obfuscated_location::geometry) AS obfuscated_lng,
        ROUND(ST_Distance(
          b.obfuscated_location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )::numeric, 1) AS distance_meters,
        (
          SELECT json_build_object(
            'id', rc.id,
            'batch_id', rc.batch_id,
            'receiver_id', rc.receiver_id,
            'claimed_for_tier', rc.claimed_for_tier,
            'status', rc.status,
            'qr_token', rc.qr_token,
            'qr_token_hash', rc.qr_token_hash,
            'qr_expires_at', rc.qr_expires_at,
            'claimed_at', rc.claimed_at,
            'handover_scanned_at', rc.handover_scanned_at,
            'handover_ambient_temp_c', rc.handover_ambient_temp_c,
            'liability_waiver_accepted', rc.liability_waiver_accepted,
            'waiver_signature_hash', rc.waiver_signature_hash,
            'revocation_reason', rc.revocation_reason
          )
          FROM rescue_claims rc
          WHERE rc.batch_id = b.id
          ORDER BY rc.claimed_at DESC
          LIMIT 1
        ) AS active_claim
      FROM food_batches b
      WHERE (
        ($5::text IS NOT NULL AND b.donor_id::text = $5::text)
        OR
        ST_DWithin(
          b.obfuscated_location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      )
      AND (
        ($4 = 'TIER_1_HUB' AND b.current_state IN ('TIER_1_HUMAN_ACTIVE', 'TIER_1_CLAIMED')) OR
        ($4 = 'TIER_2_FARMER' AND b.current_state IN ('TIER_2_ANIMAL_ACTIVE', 'TIER_2_CLAIMED')) OR
        ($4 = 'TIER_3_COMPOST' AND b.current_state = 'TIER_3_COMPOST_ACTIVE') OR
        ($4 IN ('DONOR', 'ESG_AUDITOR', 'SIMULATOR_ADMIN'))
      )
      ORDER BY distance_meters ASC;
    `;

    const result = await this.pool.query(sql, [lng, lat, radiusM, actorRole, effectiveActorId || null]);
    const batches = result.rows.map((row) => ({
      ...row,
      distance_meters: Number(row.distance_meters),
      obfuscated_lat: Number(row.obfuscated_lat),
      obfuscated_lng: Number(row.obfuscated_lng),
      total_weight_kg: Number(row.total_weight_kg),
    }));

    return {
      total: result.rowCount,
      radius_m: radiusM,
      actor_role: actorRole,
      batches,
    };
  }

  async getBatchById(id: string, actorId?: string) {
    const batchQuery = `
      SELECT
        b.id,
        b.donor_id,
        a.name AS donor_name,
        b.image_url,
        b.batch_summary,
        b.highest_risk_category,
        b.total_portions,
        b.total_weight_kg,
        b.recommended_container,
        b.ambient_temp_c,
        b.humidity_pct,
        b.safe_window_human_min,
        b.current_state,
        b.tier1_expires_at,
        b.tier2_expires_at,
        b.current_ripple_radius_m,
        b.created_at,
        ST_Y(b.obfuscated_location::geometry) AS obfuscated_lat,
        ST_X(b.obfuscated_location::geometry) AS obfuscated_lng,
        ST_Y(b.exact_pickup_location::geometry) AS exact_lat,
        ST_X(b.exact_pickup_location::geometry) AS exact_lng,
        a.address_full,
        a.handover_point_notes
      FROM food_batches b
      JOIN actors a ON b.donor_id = a.id
      WHERE b.id = $1;
    `;

    const result = await this.pool.query(batchQuery, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Food batch with ID ${id} not found`);
    }

    const batch = result.rows[0];

    // Check if requester is allowed to see exact location (donor or authorized claim receiver)
    let isClaimHolder = false;
    if (actorId) {
      const claimCheck = await this.pool.query(
        `SELECT id FROM rescue_claims WHERE batch_id = $1 AND receiver_id = $2 AND status IN ('ACTIVE_EN_ROUTE', 'HANDOVER_COMPLETED')`,
        [id, actorId]
      );
      isClaimHolder = (claimCheck.rowCount ?? 0) > 0 || actorId === batch.donor_id;
    }

    // Get detected items
    const itemsRes = await this.pool.query(
      `SELECT id, menu_name, category, estimated_portions, estimated_weight_kg, contains_coconut_milk, animal_feed_suitable, ai_confidence_score
       FROM batch_items WHERE batch_id = $1`,
      [id]
    );

    // Get active claim if present
    const claimRes = await this.pool.query(
      `SELECT
        id,
        batch_id,
        receiver_id,
        claimed_for_tier,
        status,
        qr_token,
        qr_token_hash,
        qr_expires_at,
        claimed_at,
        handover_scanned_at,
        handover_ambient_temp_c,
        liability_waiver_accepted,
        waiver_signature_hash,
        revocation_reason,
        updated_at
      FROM rescue_claims
      WHERE batch_id = $1
      ORDER BY claimed_at DESC
      LIMIT 1`,
      [id]
    );

    const revealExact = isClaimHolder;

    return {
      id: batch.id,
      donor_id: batch.donor_id,
      donor_name: batch.donor_name,
      image_url: batch.image_url,
      batch_summary: batch.batch_summary,
      highest_risk_category: batch.highest_risk_category,
      total_portions: batch.total_portions,
      total_weight_kg: batch.total_weight_kg,
      recommended_container: batch.recommended_container,
      ambient_temp_c: batch.ambient_temp_c,
      humidity_pct: batch.humidity_pct,
      safe_window_human_min: batch.safe_window_human_min,
      current_state: batch.current_state,
      tier1_expires_at: batch.tier1_expires_at,
      tier2_expires_at: batch.tier2_expires_at,
      current_ripple_radius_m: batch.current_ripple_radius_m,
      created_at: batch.created_at,
      obfuscated_location: {
        latitude: batch.obfuscated_lat,
        longitude: batch.obfuscated_lng,
      },
      exact_pickup_location: revealExact
        ? {
            latitude: batch.exact_lat,
            longitude: batch.exact_lng,
          }
        : null,
      address_full: revealExact ? batch.address_full : null,
      handover_point_notes: revealExact ? batch.handover_point_notes : null,
      items: itemsRes.rows,
      active_claim: claimRes.rows[0] ?? null,
    };
  }
}
