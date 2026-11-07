import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
  Req,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import {
  CreateBatchDtoSchema,
  NearbyBatchesQuerySchema,
  ActorRole,
} from '@sirkula/shared-types';
import { BatchesService } from './batches.service.js';
import { ActorRoleGuard } from '../../common/guards/actor-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Batches')
@Controller('api/v1/batches')
@UseGuards(ActorRoleGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post('analyze-and-create')
  @Roles(ActorRole.DONOR)
  @ApiOperation({ summary: 'Ingesti makanan: AI Vision analysis + kalkulasi Bio-thermal Q10 + registrasi batch' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiHeader({ name: 'x-actor-id', required: false, description: 'ID Actor Donatur' })
  @ApiHeader({ name: 'x-actor-role', required: false, description: 'Peran Actor (DONOR)' })
  @UseInterceptors(FileInterceptor('image'))
  async analyzeAndCreate(
    @Req() req: Request,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const actorId = req.actor?.id || 'a0000000-0000-0000-0000-000000000001';

    // Parse with zod schema
    const parsed = CreateBatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed for create batch',
        errors: parsed.error.format(),
      });
    }

    return this.batchesService.analyzeAndCreateBatch(actorId, parsed.data, file);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'PostGIS Radar: Temukan batch aktif terdekat berdasarkan radius dan role penerima' })
  @ApiHeader({ name: 'x-actor-role', required: false, description: 'Peran Actor (TIER_1_HUB / TIER_2_FARMER)' })
  @ApiHeader({ name: 'x-actor-id', required: false, description: 'ID Actor' })
  async getNearby(
    @Req() req: Request,
    @Query() query: any,
    @Headers('x-actor-role') headerRole?: string,
    @Headers('x-actor-id') headerActorId?: string
  ) {
    const parsed = NearbyBatchesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid nearby query parameters',
        errors: parsed.error.format(),
      });
    }

    const role = (headerRole as ActorRole) || req.actor?.role || ActorRole.TIER_1_HUB;
    const actorId = req.actor?.id || headerActorId;
    return this.batchesService.getNearbyBatches(parsed.data, role, actorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail batch: histori status, timer Q10, waiver blind handshake, dan estimasi ESG' })
  async getById(@Param('id') id: string, @Req() req: Request) {
    return this.batchesService.getBatchById(id, req.actor?.id);
  }
}
