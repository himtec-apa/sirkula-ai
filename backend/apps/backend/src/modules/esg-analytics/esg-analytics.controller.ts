import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EsgAnalyticsService } from './esg-analytics.service.js';

@ApiTags('Analytics')
@Controller('api/v1/analytics')
export class EsgAnalyticsController {
  constructor(private readonly esgAnalyticsService: EsgAnalyticsService) {}

  @Get('esg-summary')
  @ApiOperation({
    summary: 'Metrik ESG: Total kg makanan terselamatkan, CO2e reduksi, air virtual (m3), dan nilai ekonomi (IDR)',
  })
  async getEsgSummary() {
    return this.esgAnalyticsService.getEsgSummary();
  }
}
