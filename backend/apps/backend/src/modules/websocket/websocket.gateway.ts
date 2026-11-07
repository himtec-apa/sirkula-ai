import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  BatchCreatedEventPayload,
  BatchStateTransitionedEventPayload,
  BatchClaimedEventPayload,
  BatchHandoverCompletedEventPayload,
  ActorRole,
} from '@sirkula/shared-types';
import { verifyJwt } from '../../common/auth/jwt.util.js';
import { getEnv } from '../../config/env.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SirkulaWebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SirkulaWebsocketGateway.name);

  handleConnection(client: Socket) {
    const env = getEnv();
    const token =
      client.handshake.auth?.token ||
      (typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined) ||
      (typeof client.handshake.query?.token === 'string' ? client.handshake.query.token : undefined);

    if (token) {
      const payload = verifyJwt(token, env.JWT_SECRET);
      if (payload) {
        client.data.actor = payload;
        client.join(`room:actor:${payload.sub}`);
        if (payload.role) {
          client.join(`room:${payload.role}`);
        }
        this.logger.log(`Authenticated WS client ${client.id} (actor: ${payload.sub}, role: ${payload.role})`);
        return;
      }
    }

    const authObj = client.handshake.auth || {};
    const headers = client.handshake.headers || {};
    const actorId = authObj['x-actor-id'] || headers['x-actor-id'];
    const actorRole = authObj['x-actor-role'] || headers['x-actor-role'];
    if (actorId && actorRole) {
      client.data.actor = {
        sub: actorId,
        role: actorRole,
      };
      client.join(`room:actor:${actorId}`);
      client.join(`room:${actorRole}`);
      this.logger.log(`Authenticated WS client via headers ${client.id} (actor: ${actorId}, role: ${actorRole})`);
      return;
    }

    this.logger.log(`Anonymous WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket: ${client.id}`);
  }

  
  @SubscribeMessage('actor:subscribe')
  handleActorSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { actor_id: string; role: ActorRole }
  ) {
    if (payload?.actor_id) {
      client.join(`room:actor:${payload.actor_id}`);
    }
    if (payload?.role) {
      client.join(`room:${payload.role}`);
    }
    client.data.actor = {
      sub: payload?.actor_id,
      role: payload?.role,
    };
    this.logger.log(`Client ${client.id} subscribed to actor: ${payload?.actor_id}, role: ${payload?.role}`);
    return { status: 'subscribed' };
  }

  @SubscribeMessage('join:room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    const actor = client.data?.actor;

    // 1. Command center room
    if (room === 'room:COMMAND_CENTER') {
      if (!actor || (actor.role !== ActorRole.SIMULATOR_ADMIN && actor.role !== ActorRole.ESG_AUDITOR)) {
        return { status: 'rejected', reason: 'Unauthorized: Insufficient role for COMMAND_CENTER room' };
      }
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
      return { status: 'joined', room };
    }

    // 2. Private actor room
    if (room.startsWith('room:actor:')) {
      const targetActorId = room.replace('room:actor:', '');
      if (!actor || (actor.sub !== targetActorId && actor.role !== ActorRole.SIMULATOR_ADMIN)) {
        return { status: 'rejected', reason: 'Unauthorized: Cannot join private actor room' };
      }
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
      return { status: 'joined', room };
    }

    // 3. Role-scoped rooms
    const roleRooms = [
      ActorRole.TIER_1_HUB,
      ActorRole.TIER_2_FARMER,
      ActorRole.TIER_3_COMPOST,
      ActorRole.DONOR,
      ActorRole.ESG_AUDITOR,
      ActorRole.SIMULATOR_ADMIN,
    ].map((r) => `room:${r}`);

    if (roleRooms.includes(room)) {
      const requiredRole = room.replace('room:', '');
      if (!actor || (actor.role !== requiredRole && actor.role !== ActorRole.SIMULATOR_ADMIN)) {
        return { status: 'rejected', reason: `Unauthorized: Must have role ${requiredRole} to join ${room}` };
      }
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
      return { status: 'joined', room };
    }

    return { status: 'rejected', reason: 'Unauthorized: Unknown or restricted room' };
  }

  broadcastBatchCreated(payload: BatchCreatedEventPayload) {
    if (!this.server) return;
    this.server.emit('batch:created', payload);
  }

  broadcastStateTransitioned(payload: BatchStateTransitionedEventPayload) {
    if (!this.server) return;
    this.server.emit('batch:state_transitioned', payload);
  }

  broadcastBatchClaimed(payload: BatchClaimedEventPayload) {
    if (!this.server) return;
    this.server.emit('batch:claimed', payload);
    if (payload.receiver_id) {
      this.server.to(`room:actor:${payload.receiver_id}`).emit('batch:claimed', payload);
    }
  }

  broadcastHandoverCompleted(payload: BatchHandoverCompletedEventPayload) {
    if (!this.server) return;
    this.server.emit('batch:handover_completed', payload);
    if (payload.donor_id) {
      this.server.to(`room:actor:${payload.donor_id}`).emit('batch:handover_completed', payload);
    }
    if (payload.receiver_id) {
      this.server.to(`room:actor:${payload.receiver_id}`).emit('batch:handover_completed', payload);
    }
  }
}
