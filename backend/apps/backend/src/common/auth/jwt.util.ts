import crypto from 'node:crypto';
import { ActorRole } from '@sirkula/shared-types';

export interface JwtPayload {
  sub: string;
  role: ActorRole;
  name?: string;
  exp: number;
}

export function signJwt(
  payload: Omit<JwtPayload, 'exp'> & { expMinutes?: number },
  secret: string
): string {
  const exp = Math.floor(Date.now() / 1000) + (payload.expMinutes ?? 60 * 24) * 60;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ sub: payload.sub, role: payload.role, name: payload.name, exp })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;
    if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
