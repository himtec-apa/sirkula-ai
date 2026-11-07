import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { TimeWarpSimulationDtoSchema, ActorRole } from '@sirkula/shared-types';
import { SimulationService } from './simulation.service.js';
import { ActorRoleGuard } from '../../common/guards/actor-role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Simulation')
@ApiBearerAuth()
@Controller('api/v1/simulation')
@UseGuards(ActorRoleGuard)
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('time-warp')
  @Roles(ActorRole.SIMULATOR_ADMIN)
  @ApiOperation({
    summary: 'God-Mode Simulator: Manipulasi temperatur lingkungan & percepat waktu pembusukan makanan (Khusus SIMULATOR_ADMIN)',
  })
  @ApiHeader({ name: 'x-actor-role', required: false, description: 'Role actor (SIMULATOR_ADMIN)' })
  @ApiHeader({ name: 'x-actor-id', required: false, description: 'ID Simulator Admin' })
  async timeWarp(@Body() body: any) {
    const parsed = TimeWarpSimulationDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid time-warp simulation payload',
        errors: parsed.error.format(),
      });
    }

    return this.simulationService.timeWarp(parsed.data);
  }
}
