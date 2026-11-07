import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import pg from 'pg';
import { getEnv } from '../config/env.js';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const env = getEnv();
        const pool = new pg.Pool({
          connectionString: env.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
          console.error('[database] Unexpected error on idle client:', err);
        });

        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}
