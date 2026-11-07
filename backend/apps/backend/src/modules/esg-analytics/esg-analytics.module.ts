import { Module } from '@nestjs/common';
import { EsgAnalyticsController } from './esg-analytics.controller.js';
import { EsgAnalyticsService } from './esg-analytics.service.js';

@Module({
  controllers: [EsgAnalyticsController],
  providers: [EsgAnalyticsService],
  exports: [EsgAnalyticsService],
})
export class EsgAnalyticsModule {}
