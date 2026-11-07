# Multi-stage Dockerfile for Sirkula Backend Monorepo
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.18.0 --activate

# Copy configuration and workspaces
COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/backend/ apps/backend/

# Install dependencies
RUN pnpm install

# Build all workspace packages
RUN pnpm --filter @sirkula/shared-types build && \
    pnpm --filter @sirkula/bio-thermal-sdk build && \
    pnpm --filter @sirkula/database build && \
    pnpm --filter @sirkula/backend build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@12.18.0 --activate

COPY --from=builder /app ./

RUN chmod +x apps/backend/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./apps/backend/docker-entrypoint.sh"]
