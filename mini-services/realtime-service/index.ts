// DevPlay Realtime Service
// Port: 3003 (fixed)
// Handles: world chat + live stream notifications
// Connects to the same database as the main app (SQLite o PostgreSQL).

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { filterProfanity } from '../../src/lib/profanity'

const PORT = 3003

// Detectar DATABASE_URL desde el .env del proyecto principal
function getDatabaseUrl(): string {
  // 1. Variable de entorno explícita
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  // 2. Leer el .env del proyecto principal
  const envPath = join(process.cwd(), '..', '..', '.env')
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const match = envContent.match(/^DATABASE_URL=(.+)$/m)
    if (match) return match[1].trim()
  }

  // 3. Fallback a SQLite por defecto
  return `file:${join(process.cwd(), '..', '..', 'db', 'custom.db')}`
}

const DATABASE_URL = getDatabaseUrl()
const isSQLite = DATABASE_URL.startsWith('file:')

const db = new PrismaClient(
  isSQLite
    ? {
        datasources: {
          db: { url: DATABASE_URL },
        },
      }
    : {}
)

// Configurar WAL mode si es SQLite
if (isSQLite) {
  Promise.all([
    db.$queryRaw`PRAGMA journal_mode = WAL;`,
    db.$queryRaw`PRAGMA busy_timeout = 5000;`,
    db.$queryRaw`PRAGMA synchronous = NORMAL;`,
  ])
    .then(() => console.log('[realtime] SQLite WAL mode + optimizaciones activadas'))
    .catch((e) => console.error('[realtime] Error WAL:', e))
}

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // NOTA: en este puerto, socket.io (path: '/') intercepta TODAS las peticiones HTTP,
  // así que aquí no pueden vivir endpoints internos. Viven en el puerto 3004.
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'devplay-realtime', ok: true }))
})

// Servidor HTTP interno (solo localhost) para endpoints que el backend Next
// llama para disparar eventos en tiempo real. Socket.io no interfiere aquí.
const INTERNAL_PORT = 3004

const internalServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Internal endpoint: POST /internal/broadcast-live
  // Body: { userId, username, avatar, title, streamId, message }
  if (req.method === 'POST' && req.url === '/internal/broadcast-live') {
    try {
      const body = await readBody(req)
      const data = JSON.parse(body)
      // Find followers of this dev
      const followers = await db.follow.findMany({
        where: { followeeId: data.userId },
        select: { followerId: true },
      })
      const followerIds = new Set(followers.map((f) => f.followerId))
      // Emit to connected sockets whose userId matches a follower
      for (const [socketId, info] of userSockets.entries()) {
        if (followerIds.has(info.userId)) {
          io.to(socketId).emit('notification:live', {
            id: data.streamId,
            userId: data.userId,
            username: data.username,
            avatar: data.avatar,
            title: data.title,
            message: data.message,
          })
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, notified: followerIds.size }))
    } catch (e) {
      console.error('broadcast-live error', e)
      res.writeHead(500)
      res.end(JSON.stringify({ error: 'internal' }))
    }
    return
  }

  // Internal endpoint: POST /internal/chat-deleted
  // Body: { ids: string[] } — mensajes eliminados del chat mundial
  if (req.method === 'POST' && req.url === '/internal/chat-deleted') {
    try {
      const body = await readBody(req)
      const data = JSON.parse(body)
      const ids: string[] = Array.isArray(data?.ids)
        ? data.ids.filter((x: unknown) => typeof x === 'string')
        : []
      if (ids.length > 0) {
        io.emit('chat:message:deleted', { ids })
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, emitted: ids.length }))
    } catch (e) {
      console.error('chat-deleted error', e)
      res.writeHead(500)
      res.end(JSON.stringify({ error: 'internal' }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})

const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// socketId -> { userId, username }
const userSockets = new Map<string, { userId: string; username: string }>()

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// Privacidad total 🤫: NO se emiten conteos ni listas de conectados.
// El mapa userSockets solo se usa internamente para notificaciones en vivo.

io.on('connection', (socket: Socket) => {
  console.log(`[realtime] connected: ${socket.id}`)

  // Client identifies itself
  socket.on('chat:join', (data: { userId: string; username: string }) => {
    if (!data?.userId || !data?.username) return
    userSockets.set(socket.id, { userId: data.userId, username: data.username })
    // 🤫 Sin emisión de presencia: nadie puede saber quién está en la sala
  })

  // World chat message — persist + broadcast (con filtro anti-groserías 🧼)
  socket.on('chat:message', async (data: { userId: string; username: string; content: string }) => {
    try {
      if (!data?.content || !data?.userId) return
      const clean = filterProfanity(String(data.content).trim().slice(0, 500))
      const content = clean.trim()
      if (!content) return

      const user = await db.user.findUnique({
        where: { id: data.userId },
        select: { id: true, username: true, avatar: true },
      })
      if (!user) return

      const msg = await db.chatMessage.create({
        data: { userId: user.id, username: user.username, content },
      })

      const payload = {
        id: msg.id,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        type: 'user' as const,
      }
      io.emit('chat:message', payload)
    } catch (e) {
      console.error('[realtime] chat:message error', e)
    }
  })

  socket.on('disconnect', () => {
    userSockets.delete(socket.id)
    console.log(`[realtime] disconnected: ${socket.id}`)
  })

  socket.on('error', (err) => {
    console.error(`[realtime] socket error (${socket.id})`, err)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[devplay-realtime] listening on port ${PORT}`)
  internalServer.listen(INTERNAL_PORT, '127.0.0.1', () => {
    console.log(`[devplay-realtime] internal endpoints on 127.0.0.1:${INTERNAL_PORT}`)
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[realtime] SIGTERM, shutting down...')
  io.close()
  httpServer.close(() => process.exit(0))
  internalServer.close()
})
process.on('SIGINT', () => {
  console.log('[realtime] SIGINT, shutting down...')
  io.close()
  httpServer.close(() => process.exit(0))
  internalServer.close()
})
