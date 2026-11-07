import { SetMetadata } from '@nestjs/common';
import { ActorRole } from '@sirkula/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ActorRole[]) => SetMetadata(ROLES_KEY, roles);
