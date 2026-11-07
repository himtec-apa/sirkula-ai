import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActorRole } from '@sirkula/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { verifyJwt } from '../auth/jwt.util.js';
import { getEnv } from '../../config/env.js';

export interface AuthenticatedActor {
  id: string;
  role: ActorRole;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: AuthenticatedActor;
    }
  }
}

const ACTOR_ALIAS_MAP: Record<string, string> = {
  'actor-donor': 'a0000000-0000-0000-0000-000000000001',
  'actor-hub': 'b0000000-0000-0000-0000-000000000001',
  'actor-farmer': 'c0000000-0000-0000-0000-000000000001',
  'actor-compost': 'd0000000-0000-0000-0000-000000000001',
  'actor-auditor': 'e0000000-0000-0000-0000-000000000001',
  'actor-admin': 'f0000000-0000-0000-0000-000000000001',
};

@Injectable()
export class ActorRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const env = getEnv();
    const authHeader = req.headers['authorization'] as string | undefined;

    let actor: AuthenticatedActor | null = null;

    // 1. Prioritize Cryptographic JWT Bearer Token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const payload = verifyJwt(token, env.JWT_SECRET);
      if (!payload) {
        throw new UnauthorizedException('Invalid or expired JWT token');
      }
      actor = {
        id: payload.sub,
        role: payload.role,
        name: payload.name,
      };
    }

    // 2. Fallback to x-actor headers (ONLY allowed in non-production environments)
    if (!actor && env.NODE_ENV !== 'production') {
      const rawActorId = req.headers['x-actor-id'] as string | undefined;
      const actorRole = req.headers['x-actor-role'] as ActorRole | undefined;

      if (rawActorId) {
        const mappedId = ACTOR_ALIAS_MAP[rawActorId] || rawActorId;
        actor = {
          id: mappedId,
          role: actorRole || ActorRole.DONOR,
        };
      } else {
        const isSimulation = req.path?.includes('/simulation');
        actor = {
          id: isSimulation
            ? 'f0000000-0000-0000-0000-000000000001'
            : 'a0000000-0000-0000-0000-000000000001',
          role: isSimulation ? ActorRole.SIMULATOR_ADMIN : ActorRole.DONOR,
        };
      }
    }

    if (!actor) {
      throw new UnauthorizedException('Authentication required. Missing or invalid Bearer token.');
    }

    req.actor = actor;

    // 3. Enforce Role Permissions via @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<ActorRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(actor.role);
      if (!hasRole) {
        throw new ForbiddenException(
          `Actor role '${actor.role}' is not authorized. Required: ${requiredRoles.join(', ')}`
        );
      }
    }

    return true;
  }
}
