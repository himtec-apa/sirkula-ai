import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller.js';
import { BatchesService } from './batches.service.js';
import { WeatherModule } from '../weather/weather.module.js';
import { VisionAiModule } from '../vision-ai/vision-ai.module.js';

@Module({
  imports: [WeatherModule, VisionAiModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
