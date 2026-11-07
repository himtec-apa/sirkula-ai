import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service.js';

@ApiTags('Weather')
@Controller('api/v1/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('telemetry')
  @ApiOperation({
    summary: 'Cek live telemetry cuaca OpenWeatherMap (suhu ambient, kelembaban, dan status fallback)',
  })
  @ApiQuery({ name: 'latitude', required: false, example: -6.9175 })
  @ApiQuery({ name: 'longitude', required: false, example: 107.6191 })
  async getTelemetry(
    @Query('latitude') lat?: string,
    @Query('longitude') lon?: string
  ) {
    const latitude = lat ? Number(lat) : -6.9175;
    const longitude = lon ? Number(lon) : 107.6191;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Latitude and longitude must be valid numbers');
    }

    return this.weatherService.getWeatherData(latitude, longitude);
  }
}
