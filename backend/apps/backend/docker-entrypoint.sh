#!/bin/sh
set -e

echo "[docker-entrypoint] Waiting for PostgreSQL to accept TCP connections..."
until node --input-type=module -e "
  import net from 'node:net';
  const url = new URL(process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@postgres:5432/sirkula_db');
  const socket = net.createConnection({ host: url.hostname, port: Number(url.port || 5432), timeout: 2000 });
  socket.on('connect', () => { socket.destroy(); process.exit(0); });
  socket.on('error', () => { process.exit(1); });
  socket.on('timeout', () => { socket.destroy(); process.exit(1); });
" 2>/dev/null; do
  echo "[docker-entrypoint] Database not ready yet, sleeping 2s..."
  sleep 2
done

echo "[docker-entrypoint] Running database migrations..."
node packages/database/dist/migrate.js || true

echo "[docker-entrypoint] Running database seeder (11 Bandung actors)..."
node packages/database/dist/seed.js || true

echo "[docker-entrypoint] Starting Sirkula NestJS Backend..."
exec node apps/backend/dist/main.js
