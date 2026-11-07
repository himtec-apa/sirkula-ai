import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service.js';
import { getEnv } from '../../config/env.js';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('actors')
  @ApiOperation({ summary: 'Ambil semua mock actor ekosistem (Donatur, Hub, Peternak, Komposter)' })
  async getAllActors() {
    return this.authService.getAllActors();
  }

  @Get('actors/:id')
  @ApiOperation({ summary: 'Ambil profil actor spesifik berdasarkan ID' })
  async getActorById(@Param('id') id: string, @Req() req: Request) {
    return this.authService.getActorById(id, req.actor);
  }

  @Post('register')
  @ApiOperation({ summary: 'Daftar aktor baru ke dalam ekosistem (Donatur, Hub, Peternak, Komposter)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Dapur Berkah Bandung' },
        role: { type: 'string', example: 'DONOR' },
        email: { type: 'string', example: 'dapur.berkah@example.com' },
        phone_whatsapp: { type: 'string', example: '+6281234567890' },
        address_full: { type: 'string', example: 'Jl. Riau No. 45, Cihapit, Bandung' },
        latitude: { type: 'number', example: -6.9100 },
        longitude: { type: 'number', example: 107.6150 },
      },
      required: ['name', 'role', 'email', 'phone_whatsapp'],
    },
  })
  async register(@Body() dto: any) {
    if (!dto.name || !dto.role || !dto.email || !dto.phone_whatsapp) {
      throw new BadRequestException('name, role, email, and phone_whatsapp are required');
    }
    return this.authService.registerActor(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Masuk dengan email atau No. WhatsApp terdaftar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: 'dapur.berkah@example.com' },
        email: { type: 'string', example: 'dapur.berkah@example.com' },
        password: { type: 'string', example: 'Sirkula2026!' },
      },
    },
  })
  async login(@Body() dto: { identifier?: string; email?: string; password?: string }) {
    const idf = dto.identifier || dto.email;
    if (!idf) {
      throw new BadRequestException('identifier or email is required');
    }
    return this.authService.loginActor(idf, dto.password);
  }

  @Post('token')
  @ApiOperation({ summary: 'Generate JWT Bearer token untuk aktor (autentikasi resmi)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        actor_id: { type: 'string', example: 'a0000000-0000-0000-0000-000000000001' },
      },
      required: ['actor_id'],
    },
  })
  async generateToken(@Body('actor_id') actorId: string) {
    const env = getEnv();
    if (env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock token generation is disabled in production environment');
    }
    if (!actorId) {
      throw new BadRequestException('actor_id is required');
    }
    return this.authService.createToken(actorId);
  }
}
