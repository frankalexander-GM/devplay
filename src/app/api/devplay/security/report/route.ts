import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { rateLimitByKey, tooMany } from '@/lib/rate-limit'

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

const schema = z.object({
  type: z.enum(['POST', 'USER', 'COMMENT', 'BETA']),
  entityId: z.string().min(1),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'impersonation', 'other']),
  description: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Anti-abuso 🛡️: máx. 5 reportes por usuario cada minuto
  const rl = rateLimitByKey(`report:${userId}`, 5, 60_000)
  if (!rl.ok) return tooMany(rl.retryAfter, 'Estás enviando reportes muy rápido. Espera un momentico plis 🙏')

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { type, entityId, reason, description } = parsed.data

  // Evitar reportes duplicados
  const existing = await db.report.findFirst({
    where: { reporterId: userId, entityId, type },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ya reportaste este contenido' }, { status: 400 })
  }

  await db.report.create({
    data: {
      reporterId: userId,
      type,
      entityId,
      reason,
      description: description || null,
    },
  })

  return NextResponse.json({ ok: true })
}
