import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { normalizeUserTags } from '@/lib/user-utils'

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

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ blocked: [] })

  const blocks = await db.block.findMany({
    where: { blockerId: userId },
    include: {
      blocked: {
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
          role: true,
          tags: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const blocked = blocks.map((b) => ({
    ...normalizeUserTags(b.blocked),
    blockedAt: b.createdAt,
  }))
  return NextResponse.json({ blocked })
}
