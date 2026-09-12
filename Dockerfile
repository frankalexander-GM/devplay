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

# Realtime (chat mundial :3003) integrado en el MISMO container — modo Dockerfile simple.
# Sus deps (socket.io, @prisma/client) ya viven en node_modules y el proxy de Next
# (REALTIME_PROXY_URL) apunta por defecto a http://localhost:3003 ✓
COPY --from=builder --chown=nextjs:nodejs /app/mini-services/realtime-service/index.ts ./realtime/index.ts
# El import '../../src/lib/profanity' desde /app/realtime resuelve a /src/lib/profanity
COPY --from=builder /app/src/lib/profanity.ts /src/lib/profanity.ts

USER nextjs

EXPOSE 3000 3003

# Healthcheck con bun (no hay curl en slim): verifica la web (/api/health)
# Y el handshake del chat (socket.io EIO=4) — si el chat muere, el container
# se marca unhealthy y Coolify lo reinicia completo.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "const h = async (u) => { const r = await fetch(u); if (!r.ok) process.exit(1) }; await h('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health'); await h('http://127.0.0.1:3003/socket.io/?EIO=4&transport=polling')" || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Chat mundial con auto-reinicio (bucle cada 2s) + web Next en primer plano.
# dumb-init reenvía las señales a ambos procesos para paradas limpias.
CMD ["sh", "-c", "(while true; do bun realtime/index.ts; echo '[realtime] proceso caído, reiniciando en 2s...'; sleep 2; done) & exec bun server.js"]
