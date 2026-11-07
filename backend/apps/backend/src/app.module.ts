import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { WebsocketModule } from './modules/websocket/websocket.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { WeatherModule } from './modules/weather/weather.module.js';
import { VisionAiModule } from './modules/vision-ai/vision-ai.module.js';
import { TriageWorkerModule } from './modules/triage-worker/triage-worker.module.js';
import { BatchesModule } from './modules/batches/batches.module.js';
import { ClaimsModule } from './modules/claims/claims.module.js';
import { SimulationModule } from './modules/simulation/simulation.module.js';
import { EsgAnalyticsModule } from './modules/esg-analytics/esg-analytics.module.js';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware.js';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    WebsocketModule,
    AuthModule,
    WeatherModule,
    VisionAiModule,
    TriageWorkerModule,
    BatchesModule,
    ClaimsModule,
    SimulationModule,
    EsgAnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimiterMiddleware).forRoutes('*');
  }
}
