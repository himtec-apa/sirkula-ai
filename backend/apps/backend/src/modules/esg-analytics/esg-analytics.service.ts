import { Injectable, Inject } from '@nestjs/common';
import pg from 'pg';
import { PG_POOL } from '../../database/database.module.js';

@Injectable()
export class EsgAnalyticsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async getEsgSummary() {
    // Aggregation query
    const summaryQuery = `
      SELECT
        COUNT(id)::int AS total_batches_rescued,
        COALESCE(SUM(portions_saved), 0)::int AS total_portions_saved,
        COALESCE(SUM(weight_saved_kg), 0)::numeric(10,2) AS total_weight_saved_kg,
        COALESCE(SUM(co2e_avoided_kg), 0)::numeric(10,2) AS total_co2e_avoided_kg,
        COALESCE(SUM(methane_ch4_avoided_kg), 0)::numeric(10,3) AS total_methane_ch4_avoided_kg,
        COALESCE(SUM(estimated_feed_savings_idr), 0)::numeric(12,2) AS total_feed_savings_idr
      FROM esg_telemetry_logs;
    `;

    const recentWaiversQuery = `
      SELECT
        e.id,
        e.waiver_certificate_no,
        e.batch_id,
        e.final_rescued_tier,
        e.weight_saved_kg,
        e.co2e_avoided_kg,
        e.recorded_at,
        c.waiver_signature_hash,
        d.name AS donor_name,
        r.name AS receiver_name
      FROM esg_telemetry_logs e
      JOIN rescue_claims c ON e.claim_id = c.id
      JOIN actors d ON e.donor_id = d.id
      JOIN actors r ON e.receiver_id = r.id
      ORDER BY e.recorded_at DESC
      LIMIT 10;
    `;

    const [summaryRes, waiversRes] = await Promise.all([
      this.pool.query(summaryQuery),
      this.pool.query(recentWaiversQuery),
    ]);

    const stats = summaryRes.rows[0];

    return {
      summary_period: 'All-Time Real-Time Telemetry',
      total_batches_rescued: Number(stats.total_batches_rescued),
      total_portions_saved: Number(stats.total_portions_saved),
      total_weight_saved_kg: Number(stats.total_weight_saved_kg),
      co2e_avoided_kg: Number(stats.total_co2e_avoided_kg),
      methane_ch4_avoided_kg: Number(stats.total_methane_ch4_avoided_kg),
      estimated_feed_savings_idr: Number(stats.total_feed_savings_idr),
      recent_waiver_certificates: waiversRes.rows,
    };
  }
}
