import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import {
  ClaimBatchDtoSchema,
  VerifyHandoverDtoSchema,
  ActorRole,
} from '@sirkula/shared-types';
import { ClaimsService } from './claims.service.js';
import { ActorRoleGuard } from '../../common/guards/actor-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Claims')
@Controller('api/v1/batches')
@UseGuards(ActorRoleGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post(':id/claim')
  @Roles(ActorRole.TIER_1_HUB, ActorRole.TIER_2_FARMER, ActorRole.TIER_3_COMPOST, ActorRole.SIMULATOR_ADMIN)
  @ApiOperation({ summary: 'Klaim batch pangan: Atomic Redis Lock + transisi status ke CLAIMED / EN_ROUTE' })
  @ApiHeader({ name: 'x-actor-id', required: false, description: 'ID Actor Kurir / Hub / Peternak' })
  @ApiHeader({ name: 'x-actor-role', required: false, description: 'Peran Actor (TIER_1_HUB / TIER_2_FARMER)' })
  async claimBatch(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-actor-role') headerRole?: string
  ) {
    const actorId = req.actor?.id || 'b0000000-0000-0000-0000-000000000001';
    const actorRole = req.actor?.role || (headerRole as ActorRole) || ActorRole.TIER_1_HUB;

    const parsed = ClaimBatchDtoSchema.safeParse(body);
    const preferredTier = parsed.success ? parsed.data.claimed_for_tier : undefined;

    return this.claimsService.claimBatch(id, actorId, actorRole, preferredTier);
  }

  @Post(':id/verify-handover')
  @Roles(ActorRole.DONOR)
  @ApiOperation({ summary: 'Verifikasi serah terima blind handshake: validasi token OTP, waiver hukum, dan selesaikan misi' })
  @ApiHeader({ name: 'x-actor-id', required: false, description: 'ID Actor Donatur penyerah makanan' })
  @ApiHeader({ name: 'x-actor-role', required: false, description: 'Peran Actor (DONOR)' })
  async verifyHandover(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: any
  ) {
    const donorId = req.actor?.id || 'a0000000-0000-0000-0000-000000000001';

    const parsed = VerifyHandoverDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid verify handover payload',
        errors: parsed.error.format(),
      });
    }

    return this.claimsService.verifyHandover(id, donorId, parsed.data);
  }
}
