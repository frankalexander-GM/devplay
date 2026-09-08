# ============================================
# DevPlay Realtime Service - Dockerfile 🔌
# ============================================
# Chat mundial (socket.io :3003) + endpoints internos (:3004)
#
# ⚠️ El contexto de build es la RAÍZ del repo (ver docker-compose.yml),
#    porque index.ts importa ../../src/lib/profanity — en el container
#    eso resuelve a /src/lib/profanity.ts y ahí lo copiamos.
# ============================================

FROM oven/bun:1-slim

WORKDIR /app

# Dependencias propias del servicio
COPY mini-services/realtime-service/package.json ./
COPY mini-services/realtime-service/bun.lock* ./
RUN bun install

# Código del servicio
COPY mini-services/realtime-service/index.ts ./

# El filtro anti-groserías vive en el repo principal; el import
# '../../src/lib/profanity' desde /app resuelve a /src/lib/profanity
COPY src/lib/profanity.ts /src/lib/profanity.ts

# Esquema Prisma ÚNICO (el del repo) + generación del cliente
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3003
# Los endpoints internos (:3004) escuchan en 0.0.0.0 dentro del container
# para que el servicio web los alcance por la red de compose
ENV REALTIME_INTERNAL_HOST=0.0.0.0

EXPOSE 3003

# Healthcheck con bun: el handshake de socket.io responde en /
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:3003/'); if (!r.ok) process.exit(1)" || exit 1

CMD ["bun", "index.ts"]
