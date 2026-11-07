# Production Dockerfile for SIRKULA-AI Web Frontend
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund

COPY server.cjs index.html ./
COPY .env* ./
COPY src/ src/
COPY assets/ assets/
COPY context/ context/

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=3s \
  CMD node -e "fetch('http://127.0.0.1:3000').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.cjs"]
