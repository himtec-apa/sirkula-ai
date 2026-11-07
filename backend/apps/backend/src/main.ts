import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { getEnv } from './config/env.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const env = getEnv();

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true, // Dynamically reflect request origin for valid CORS with credentials
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    },
  });

  // OWASP Recommended Defensive Security Headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.removeHeader('X-Powered-By');
    next();
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SIRKULA-AI Core Engine API')
    .setDescription(
      'Spesifikasi API SIRKULA-AI: Bio-thermal Triage Arrhenius Q10, PostGIS Geospatial Radar, BullMQ Ripple State Machine, Blind Handover Verification, dan God-Mode Simulation.'
    )
    .setVersion('1.0.0')
    .addTag('Batches', 'Ingesti AI Vision, kalkulasi Q10, dan PostGIS Nearby Radar')
    .addTag('Claims', 'Klaim terdistribusi kurir dan serah terima blind handshake')
    .addTag('Simulation', 'God-Mode Simulator untuk manipulasi temperatur lingkungan & percepatan waktu')
    .addTag('Analytics', 'Metrik dampak ESG (CO2e, air, nilai ekonomi terselamatkan)')
    .addTag('Auth', 'Mock actors dan autentikasi peran ekosistem')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'SIRKULA-AI API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`SIRKULA-AI Backend is running on port ${env.PORT} (env: ${env.NODE_ENV})`);
  logger.log(`Swagger Docs available at: http://localhost:${env.PORT}/api/docs`);
  logger.log(`WebSocket Test Console available at: http://localhost:${env.PORT}/ws-test`);
}

bootstrap().catch((err) => {
  console.error('Fatal backend bootstrap error:', err);
  process.exit(1);
});
