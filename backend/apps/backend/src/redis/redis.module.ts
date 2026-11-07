import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getEnv } from '../config/env.js';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const env = getEnv();
        const client = new Redis(env.REDIS_URL, {
          password: env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        client.on('error', (err) => {
          console.warn('[redis] Connection notice:', err.message);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy() {
    await this.client.quit();
  }
}
