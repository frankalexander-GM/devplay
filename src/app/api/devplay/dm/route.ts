/**
 * GET /api/devplay/dm — lista de conversaciones privadas del usuario 💬
 * Devuelve por cada contraparte: datos básicos, último mensaje, no leídos.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const me = (session.user as any).id as string

    // Traer los últimos 400 mensajes donde participo (suficiente para armar
    // la lista de conversaciones a esta escala) y agrupar por contraparte.
    const msgs = await db.directMessage.findMany({
      where: { OR: [{ senderId: me }, { recipientId: me }] },
      orderBy: { createdAt: 'desc' },
      take: 400,
    })

    const convos = new Map<
      string,
      { peerId: string; lastContent: string; lastAt: string; lastMine: boolean; unread: number }
    >()

    for (const m of msgs) {
      const peerId = m.senderId === me ? m.recipientId : m.senderId
      let c = convos.get(peerId)
      if (!c) {
        c = {
          peerId,
          lastContent: m.content,
          lastAt: m.createdAt.toISOString(),
          lastMine: m.senderId === me,
          unread: 0,
        }
        convos.set(peerId, c)
      }
      if (m.recipientId === me && !m.readAt) c.unread++
    }

    const peerIds = [...convos.keys()]
    const peers = peerIds.length
      ? await db.user.findMany({
          where: { id: { in: peerIds } },
          select: { id: true, username: true, avatar: true, fullName: true },
        })
      : []

    const peerMap = new Map(peers.map((p) => [p.id, p]))

    const conversations = [...convos.values()]
      .filter((c) => peerMap.has(c.peerId))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
      .map((c) => ({
        ...c,
        peer: peerMap.get(c.peerId)!,
      }))

    return NextResponse.json({ conversations })
  } catch (e) {
    console.error('dm list error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
