import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { filterProfanity } from '@/lib/profanity'

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

  // Filtro anti-groserías 🧼: se guarda y difunde ya limpiecito
  const clean = filterProfanity(content.trim()).slice(0, 500)

  const message = await db.chatMessage.create({
    data: {
      userId,
      username: user.username,
      content: clean,
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json({ message })
}

// DELETE mensajes propios (uno por id, o todos con { all: true })
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] = []

  if (body?.all === true) {
    // Borrar todos los mensajes del usuario en la sala
    const mine = await db.chatMessage.findMany({
      where: { userId },
      select: { id: true },
    })
    if (mine.length > 0) {
      await db.chatMessage.deleteMany({ where: { userId } })
      ids.push(...mine.map((m) => m.id))
    }
  } else {
    // Borrar un solo mensaje (verificando que sea propio)
    const id = typeof body?.id === 'string' ? body.id : null
    if (!id) return NextResponse.json({ error: 'Falta el id del mensaje' }, { status: 400 })

    const msg = await db.chatMessage.findUnique({ where: { id } })
    if (!msg || msg.userId !== userId) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }
    await db.chatMessage.delete({ where: { id } })
    ids.push(id)
  }

  // Avisar en tiempo real a todos los clientes conectados
  if (ids.length > 0) {
    try {
      await fetch('http://localhost:3004/internal/chat-deleted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // El broadcast es best-effort: los clientes refrescan el historial al recargar
    }
  }

  return NextResponse.json({ ok: true, deleted: ids.length })
}
