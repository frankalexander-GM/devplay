import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET recent chat messages (world chat history)
export async function GET(req: NextRequest) {
  const messages = await db.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  })
  return NextResponse.json({ messages: messages.reverse() })
}

// POST a chat message (persisted - also broadcast by mini-service)
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  const guestId = req.cookies.get('devplay-guest-id')?.value
  if (guestId) {
    const guest = await db.user.findUnique({ where: { id: guestId } })
    if (guest && !guest.isGuest) return guest.id
  }
  return null
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { content } = await req.json()
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const message = await db.chatMessage.create({
    data: {
      userId,
      username: user.username,
      content: content.trim().slice(0, 500),
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json({ message })
}
