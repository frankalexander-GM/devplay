// DevPlay Realtime Service
// Port: 3003 (fixed)
// Handles: world chat + live stream notifications
// Connects to the same database as the main app (SQLite o PostgreSQL).

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createHmac } from 'crypto'
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

// Secreto compartido con el backend Next pa' verificar los tokens firmados 🔐
function getRealtimeSecret(): string {
  if (process.env.REALTIME_SECRET) return process.env.REALTIME_SECRET
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET
  const envPath = join(process.cwd(), '..', '..', '.env')
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const m = envContent.match(/^REALTIME_SECRET=(.+)$/m)
    if (m) return m[1].trim()
    const m2 = envContent.match(/^NEXTAUTH_SECRET=(.+)$/m)
    if (m2) return m2[1].trim()
  }
  return ''
}

const REALTIME_SECRET = getRealtimeSecret()
if (!REALTIME_SECRET) {
  console.error('[realtime] ⚠️ SIN REALTIME_SECRET/NEXTAUTH_SECRET — el chat quedará bloqueado. Configura la variable en Coolify.')
}

/**
 * Verifica el token emitido por /api/devplay/realtime-token
 * Formato: <expMs>.<base64url(JSON {uid,un,exp})>.<hmac-sha256>
 */
function verifyRealtimeToken(token: unknown): { uid: string; un: string } | null {
  if (!REALTIME_SECRET) return null
  if (typeof token !== 'string' || token.length > 1024) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [expStr, payload, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return null
  const expected = createHmac('sha256', REALTIME_SECRET).update(`${expStr}.${payload}`).digest('base64url')
  if (sig.length !== expected.length || sig !== expected) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (typeof data?.uid !== 'string' || typeof data?.un !== 'string') return null
    if (data.uid.length > 64 || data.un.length > 40) return null
    return { uid: data.uid, un: data.un }
  } catch {
    return null
  }
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

  // Internal endpoint: POST /internal/dm
  // Body: payload de DirectMessage + sender {id,username,avatar}
  // Emite 'dm:new' a TODOS los sockets del destinatario y del remitente
  // (el remitente lo recibe para sincronizar otras pestañas).
  if (req.method === 'POST' && req.url === '/internal/dm') {
    try {
      const body = await readBody(req)
      const data = JSON.parse(body)
      if (!data?.id || !data?.senderId || !data?.recipientId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'bad payload' }))
        return
      }
      const targets = new Set([String(data.senderId), String(data.recipientId)])
      let emitted = 0
      for (const [socketId, info] of userSockets.entries()) {
        if (targets.has(info.userId)) {
          io.to(socketId).emit('dm:new', data)
          emitted++
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, emitted }))
    } catch (e) {
      console.error('dm internal error', e)
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
  cors: { origin: true, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1 MB — nadie necesita mandar más al chat
})

// socketId -> { userId, username }
const userSockets = new Map<string, { userId: string; username: string }>()

// ===== Handshake autenticado 🔐 =====
// Sin token firmado válido NO hay conexión. La identidad del usuario sale
// SIEMPRE del token — jamás de lo que diga el cliente.
io.use((socket, next) => {
  const auth = socket.handshake.auth as { token?: unknown } | undefined
  const user = verifyRealtimeToken(auth?.token)
  if (!user) {
    console.warn(`[realtime] handshake rechazado (token inválido/ausente) from ${socket.handshake.address}`)
    return next(new Error('unauthorized'))
  }
  socket.data.user = user
  next()
})

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
  const verified = socket.data.user as { uid: string; un: string }
  console.log(`[realtime] connected: ${socket.id} as ${verified.un}`)

  // Anti-flood por socket 🛡️: máx. 5 mensajes cada 10 segundos
  let msgTimestamps: number[] = []

  // Client identifies itself — la identidad VERDADERA viene del token;
  // lo que mande el cliente se ignora (anti-suplantación).
  socket.on('chat:join', () => {
    userSockets.set(socket.id, { userId: verified.uid, username: verified.un })
    // 🤫 Sin emisión de presencia: nadie puede saber quién está en la sala
  })

  // World chat message — persist + broadcast (con filtro anti-groserías 🧼)
  socket.on('chat:message', async (data: { userId?: string; username?: string; content: string }) => {
    try {
      if (!data?.content) return
      // Anti-flood: ventana deslizante de 10 s con tope 5 mensajes
      const now = Date.now()
      msgTimestamps = msgTimestamps.filter((t) => t > now - 10_000)
      if (msgTimestamps.length >= 5) {
        socket.emit('chat:error', { message: 'Vas muy rápido 😅 Espera un momentico.' })
        return
      }
      msgTimestamps.push(now)

      const clean = filterProfanity(String(data.content).trim().slice(0, 500))
      const content = clean.trim()
      if (!content) return

      // La identidad SIEMPRE del token verificado (ignora data.userId/username)
      const user = await db.user.findUnique({
        where: { id: verified.uid },
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
