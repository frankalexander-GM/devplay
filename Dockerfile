# ============================================
# DevPlay - Dockerfile para Coolify 🚀
# ============================================
# Multi-stage build para Next.js standalone.
# Contexto de build: raíz del repo (ver docker-compose.yml).
#
# ⚠️ El esquema de la BD NO se aplica aquí: Supabase se gestiona
#    fuera del container (el dueño lo administra). Nada de
#    `prisma db push --accept-data-loss` en cada arranque.
# ============================================

# ===== Stage 1: Dependencies =====
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock* ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile
RUN bunx prisma generate

# ===== Stage 2: Build =====
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# next build (output standalone) + copia de static/public al standalone
RUN bun run build

# ===== Stage 3: Production =====
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ⚠️ oven/bun:1-slim NO trae addgroup/adduser (paquete `adduser`) ni dumb-init:
#    sin esto el build falla con "/bin/sh: addgroup: not found" (exit 127)
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    adduser \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone build + assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma client ya generado (runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Healthcheck con bun (no hay curl en slim): /api/health debe responder ok
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health'); if (!r.ok) process.exit(1)" || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["bun", "server.js"]
