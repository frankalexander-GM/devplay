# ============================================
# DevPlay - Dockerfile para Coolify
# ============================================
# Multi-stage build para Next.js standalone
# ============================================

# ===== Stage 1: Dependencies =====
FROM oven/bun:1 AS deps
WORKDIR /app

# Copiar package.json y lockfile
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Instalar dependencias
RUN bun install --frozen-lockfile

# Generar Prisma client
RUN bunx prisma generate

# ===== Stage 2: Build =====
FROM oven/bun:1 AS builder
WORKDIR /app

# Copiar dependencias
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar código fuente
COPY . .

# Build de Next.js (standalone output)
RUN bun run build

# ===== Stage 3: Production =====
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Instalar solo lo necesario para runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar Prisma (para db push en runtime si es necesario)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Crear directorio para DB SQLite
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# dumb-init maneja señales correctamente
ENTRYPOINT ["dumb-init", "--"]

# Script de inicio: hace db push y arranca el servidor
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bun server.js"]
