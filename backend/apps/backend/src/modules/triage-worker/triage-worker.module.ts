import { Module, Global } from '@nestjs/common';
import { TriageWorkerService } from './triage-worker.service.js';

@Global()
@Module({
  providers: [TriageWorkerService],
  exports: [TriageWorkerService],
})
export class TriageWorkerModule {}
