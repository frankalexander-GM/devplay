/**
 * /api/devplay/dm/[userId] — hilo de conversación privada con un usuario 💬
 *  - GET    → últimos mensajes + datos de la contraparte (marca como leídos)
 *  - POST   → enviar mensaje (valida bloqueos, antiflood, filtro de palabras)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { filterProfanity } from '@/lib/profanity'

const TAKE = 60
const MAX_PER_MINUTE = 20

// Notifica al servicio realtime (:3004) para entrega en vivo por socket
function notifyRealtime(payload: Record<string, unknown>) {
  fetch('http://127.0.0.1:3004/internal/dm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(2500),
  }).catch(() => {}) // si realtime está caído, el mensaje igual se guarda
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const me = (session.user as any).id as string
    const { userId: peerId } = await params
    if (peerId === me) {
      return NextResponse.json({ error: 'No puedes hablar contigo mismo jaja' }, { status: 400 })
    }

    const peer = await db.user.findUnique({
      where: { id: peerId },
      select: { id: true, username: true, avatar: true, fullName: true, isGuest: true },
    })
    if (!peer || peer.isGuest) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: me, blockedId: peerId },
          { blockerId: peerId, blockedId: me },
        ],
      },
    })
    if (blocked) {
      return NextResponse.json({ error: 'No hay conversación disponible' }, { status: 403 })
    }

    const messages = await db.directMessage.findMany({
      where: {
        OR: [
          { senderId: me, recipientId: peerId },
          { senderId: peerId, recipientId: me },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: TAKE,
    })

    // Marcar como leídos los que me llegaron
    await db.directMessage.updateMany({
      where: { senderId: peerId, recipientId: me, readAt: null },
      data: { readAt: new Date() },
    })

    return NextResponse.json({
      peer,
      messages: messages.reverse().map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt ? m.readAt.toISOString() : null,
      })),
    })
  } catch (e) {
    console.error('dm thread error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const me = (session.user as any).id as string
    const { userId: peerId } = await params

    if (peerId === me) {
      return NextResponse.json({ error: 'No puedes hablar contigo mismo jaja' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    const raw = String(body?.content ?? '')
    const content = filterProfanity(raw.trim().slice(0, 2000))
    if (!content) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
    }

    const [meUser, peer] = await Promise.all([
      db.user.findUnique({ where: { id: me }, select: { id: true, username: true, avatar: true, isGuest: true } }),
      db.user.findUnique({ where: { id: peerId }, select: { id: true, isGuest: true } }),
    ])
    if (!meUser || meUser.isGuest) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!peer || peer.isGuest) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: me, blockedId: peerId },
          { blockerId: peerId, blockedId: me },
        ],
      },
    })
    if (blocked) {
      return NextResponse.json({ error: 'No hay conversación disponible' }, { status: 403 })
    }

    // Antiflood de servidor: máx. 20 mensajes por minuto
    const minuteAgo = new Date(Date.now() - 60_000)
    const recent = await db.directMessage.count({
      where: { senderId: me, createdAt: { gte: minuteAgo } },
    })
    if (recent >= MAX_PER_MINUTE) {
      return NextResponse.json({ error: 'Vas muy rápido, espera un momentito 🚦' }, { status: 429 })
    }

    const msg = await db.directMessage.create({
      data: { senderId: me, recipientId: peerId, content },
    })

    const payload = {
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      readAt: null as string | null,
      sender: { id: meUser.id, username: meUser.username, avatar: meUser.avatar },
    }
    notifyRealtime(payload)

    return NextResponse.json({ message: payload })
  } catch (e) {
    console.error('dm send error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
