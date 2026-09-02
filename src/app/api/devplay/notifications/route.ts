import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

export async function GET(req: NextRequest) {
  const userId = await getViewerId(req)
  if (!userId) return NextResponse.json({ notifications: [], unread: 0 })

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      include: {
        fromUser: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    db.notification.count({ where: { userId, read: false } }),
  ])

  return NextResponse.json({ notifications, unread })
}

// mark all as read
export async function PATCH(req: NextRequest) {
  const userId = await getViewerId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
