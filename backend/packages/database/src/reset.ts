import pg from 'pg';
import { runMigration } from './migrate.js';
import { runSeeder } from './seed.js';

export async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sirkula_db';
  console.log('[db:reset] Resetting database tables...');

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      DROP TABLE IF EXISTS batch_state_audit_logs CASCADE;
      DROP TABLE IF EXISTS esg_telemetry_logs CASCADE;
      DROP TABLE IF EXISTS rescue_claims CASCADE;
      DROP TABLE IF EXISTS batch_items CASCADE;
      DROP TABLE IF EXISTS food_batches CASCADE;
      DROP TABLE IF EXISTS actors CASCADE;
    `);
    console.log('[db:reset] Dropped all tables.');
  } finally {
    await client.end();
  }

  await runMigration();
  await runSeeder();
  console.log('[db:reset] Database reset, migrated, and seeded successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('reset.js')) {
  resetDatabase().catch((err) => {
    console.error('[db:reset] Reset failed:', err);
    process.exit(1);
  });
}
