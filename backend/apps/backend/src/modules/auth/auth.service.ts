import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import pg from 'pg';
import { PG_POOL } from '../../database/database.module.js';
import { signJwt } from '../../common/auth/jwt.util.js';
import { getEnv } from '../../config/env.js';
import { AuthenticatedActor } from '../../common/guards/actor-role.guard.js';

const ACTOR_ALIAS_MAP: Record<string, string> = {
  'actor-donor': 'a0000000-0000-0000-0000-000000000001',
  'actor-hub': 'b0000000-0000-0000-0000-000000000001',
  'actor-farmer': 'c0000000-0000-0000-0000-000000000001',
  'actor-compost': 'd0000000-0000-0000-0000-000000000001',
  'actor-auditor': 'e0000000-0000-0000-0000-000000000001',
  'actor-admin': 'f0000000-0000-0000-0000-000000000001',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async getAllActors() {
    const query = `
      SELECT
        id,
        name,
        role,
        email,
        phone_whatsapp,
        ST_AsGeoJSON(location)::json AS location,
        address_full,
        handover_point_notes,
        daily_capacity_kg,
        priority_score,
        is_verified,
        is_active,
        created_at
      FROM actors
      WHERE is_active = TRUE
      ORDER BY priority_score DESC, name ASC;
    `;
    const result = await this.pool.query(query);
    return {
      total: result.rowCount,
      actors: result.rows,
    };
  }

  async loginActor(identifier: string, _password?: string) {
    const trimmed = identifier.trim().toLowerCase();
    const query = `
      SELECT
        id,
        name,
        role,
        phone_whatsapp,
        email,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        address_full,
        handover_point_notes,
        daily_capacity_kg,
        priority_score,
        is_verified,
        is_active
      FROM actors
      WHERE LOWER(email) = $1 OR phone_whatsapp = $2 OR id = $3
      LIMIT 1;
    `;
    const targetUuid = UUID_REGEX.test(identifier.trim()) ? identifier.trim() : '00000000-0000-0000-0000-000000000000';
    const result = await this.pool.query(query, [trimmed, identifier.trim(), targetUuid]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Akun dengan email/nomor '${identifier}' tidak ditemukan di sistem.`);
    }

    const actor = result.rows[0];
    const tokenRes = await this.createToken(actor.id);
    return {
      ...tokenRes,
      actor,
    };
  }

  async getActorById(id: string, requestingActor?: AuthenticatedActor) {
    const targetId = ACTOR_ALIAS_MAP[id] || id;
    if (!UUID_REGEX.test(targetId)) {
      throw new NotFoundException(`Actor with ID ${id} not found`);
    }

    const query = `
      SELECT
        id,
        name,
        role,
        phone_whatsapp,
        email,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        address_full,
        handover_point_notes,
        daily_capacity_kg,
        priority_score,
        is_verified,
        is_active
      FROM actors
      WHERE id = $1;
    `;
    const result = await this.pool.query(query, [targetId]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Actor with ID ${id} not found`);
    }

    const actor = result.rows[0];
    const isOwnerOrAdmin =
      requestingActor &&
      (requestingActor.id === actor.id ||
        requestingActor.role === 'SIMULATOR_ADMIN' ||
        requestingActor.role === 'ESG_AUDITOR');

    if (!isOwnerOrAdmin) {
      delete actor.phone_whatsapp;
      delete actor.email;
      delete actor.latitude;
      delete actor.longitude;
      delete actor.address_full;
      delete actor.handover_point_notes;
    }

    return actor;
  }

  async registerActor(data: {
    name: string;
    role: string;
    phone_whatsapp: string;
    email: string;
    address_full?: string;
    handover_point_notes?: string;
    latitude?: number;
    longitude?: number;
    daily_capacity_kg?: number;
  }) {
    const lat = Number(data.latitude ?? -6.8863);
    const lng = Number(data.longitude ?? 107.6080);
    const address = data.address_full || 'Kota Bandung, Jawa Barat';
    const notes = data.handover_point_notes || 'Pintu utama / Posko';
    const capacity = Number(data.daily_capacity_kg ?? 50.0);

    const query = `
      INSERT INTO actors (
        name,
        role,
        phone_whatsapp,
        email,
        location,
        address_full,
        handover_point_notes,
        daily_capacity_kg,
        is_verified,
        is_active
      ) VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
        $7, $8, $9, TRUE, TRUE
      )
      RETURNING id, name, role, email, phone_whatsapp, address_full;
    `;

    try {
      const result = await this.pool.query(query, [
        data.name,
        data.role,
        data.phone_whatsapp,
        data.email,
        lng,
        lat,
        address,
        notes,
        capacity,
      ]);
      const newActor = result.rows[0];
      const tokenRes = await this.createToken(newActor.id);
      return {
        ...tokenRes,
        actor: newActor,
      };
    } catch (err: any) {
      if (err.code === '23505') {
        // Unique violation (e.g. phone or email already registered)
        const existing = await this.pool.query(
          'SELECT id FROM actors WHERE email = $1 OR phone_whatsapp = $2 LIMIT 1;',
          [data.email, data.phone_whatsapp]
        );
        if (existing.rowCount && existing.rowCount > 0) {
          return this.createToken(existing.rows[0].id);
        }
      }
      throw err;
    }
  }

  async createToken(actorId: string) {
    const actor = await this.getActorById(actorId);
    const env = getEnv();
    const token = signJwt(
      { sub: actor.id, role: actor.role, name: actor.name, expMinutes: 60 * 24 * 7 },
      env.JWT_SECRET
    );
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in_seconds: 60 * 60 * 24 * 7,
      actor: {
        id: actor.id,
        name: actor.name,
        role: actor.role,
      },
    };
  }
}
