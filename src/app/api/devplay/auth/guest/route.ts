import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { rateLimit, tooMany } from '@/lib/rate-limit'

/**
 * Creates a guest user (read-only: can view feed & streams, cannot comment/like/chat).
 * Anti-bots 🛡️: máx. 3 invitados por IP cada minuto — evita que inunden la BD.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'guest', 3, 60_000)
  if (!rl.ok) return tooMany(rl.retryAfter)

  try {
    const body = await req.json().catch(() => ({}))
    const requestedName = body?.username as string | undefined

    const username =
      (requestedName && /^[a-zA-Z0-9_]{3,20}$/.test(requestedName)
        ? requestedName
        : `Invitado-${Math.random().toString(36).slice(2, 7)}`)

    // ensure uniqueness
    let finalUsername = username
    let attempt = 0
    while (await db.user.findUnique({ where: { username: finalUsername } })) {
      attempt++
      finalUsername = `${username}${attempt}`
    }

    const guest = await db.user.create({
      data: {
        email: `guest-${randomUUID()}@devplay.guest`,
        username: finalUsername,
        passwordHash: 'guest-no-password',
        role: 'USER',
        isGuest: true,
      },
    })

    return NextResponse.json({
      id: guest.id,
      username: guest.username,
      isGuest: true,
    })
  } catch (e) {
    console.error('guest create error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
