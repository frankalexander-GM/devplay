# ============================================
# DevPlay Realtime Service - Dockerfile
# ============================================
# Servicio de chat con Socket.io
# ============================================

FROM oven/bun:1-slim

WORKDIR /app

# Copiar archivos
COPY package.json bun.lock* ./
COPY index.ts ./
COPY prisma ./prisma

# Instalar dependencias
RUN bun install --frozen-lockfile

# Generar Prisma client
RUN bunx prisma generate

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3003/ || exit 1

CMD ["bun", "index.ts"]
