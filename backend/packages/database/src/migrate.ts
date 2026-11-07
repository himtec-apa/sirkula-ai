import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sirkula_db';
  console.log(`[db:migrate] Connecting to database: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}`);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const migrationFile = path.resolve(__dirname, '../migrations/001_initial_schema.sql');
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found at: ${migrationFile}`);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log('[db:migrate] Applying 001_initial_schema.sql...');
    await client.query(sql);
    console.log('[db:migrate] Migration applied successfully.');
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration().catch((err) => {
    console.error('[db:migrate] Migration failed:', err);
    process.exit(1);
  });
}
