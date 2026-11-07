import { Module } from '@nestjs/common';
import { VisionAiService } from './vision-ai.service.js';

@Module({
  providers: [VisionAiService],
  exports: [VisionAiService],
})
export class VisionAiModule {}
