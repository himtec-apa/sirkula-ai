import { Injectable, Logger } from '@nestjs/common';
import { getEnv } from '../../config/env.js';

export interface WeatherTelemetry {
  ambient_temp_c: number;
  humidity_pct: number;
  is_fallback: boolean;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async getWeatherData(latitude: number, longitude: number): Promise<WeatherTelemetry> {
    const env = getEnv();

    // Default tropical climate fallback
    const fallback: WeatherTelemetry = {
      ambient_temp_c: 30.0,
      humidity_pct: 75,
      is_fallback: true,
    };

    if (!env.OPENWEATHER_API_KEY || env.OPENWEATHER_API_KEY === 'mock-openweather-key') {
      return fallback;
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${env.OPENWEATHER_API_KEY}&units=metric`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
      });

      if (!response.ok) {
        this.logger.warn(`OpenWeatherMap returned status ${response.status}. Using tropical fallback.`);
        return fallback;
      }

      const data = await response.json();
      const temp = typeof data?.main?.temp === 'number' ? data.main.temp : 30.0;
      const humidity = typeof data?.main?.humidity === 'number' ? data.main.humidity : 75;

      return {
        ambient_temp_c: Number(temp.toFixed(1)),
        humidity_pct: Math.round(humidity),
        is_fallback: false,
      };
    } catch (err: any) {
      this.logger.warn(`Weather API timeout/failure (${err.message}). Bypassing to tropical fallback.`);
      return fallback;
    }
  }
}
