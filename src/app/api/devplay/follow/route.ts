import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

// GET /api/devplay/follow?userId=xxx  -> { following: bool, followersCount, followingCount }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get('userId')
  if (!targetId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const viewerId = await getViewerId(req)
  const [followersCount, followingCount, existing] = await Promise.all([
    db.follow.count({ where: { followeeId: targetId } }),
    db.follow.count({ where: { followerId: targetId } }),
    viewerId
      ? db.follow.findUnique({
          where: { followerId_followeeId: { followerId: viewerId, followeeId: targetId } },
        })
      : null,
  ])

  return NextResponse.json({
    following: !!existing,
    followersCount,
    followingCount,
  })
}

// POST { followeeId } -> follow
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { followeeId } = await req.json()
  if (!followeeId || followeeId === userId) {
    return NextResponse.json({ error: 'Inválido' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: followeeId } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  try {
    await db.follow.create({ data: { followerId: userId, followeeId } })
  } catch {
    // already following
  }

  // notification
  const me = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (me) {
    await db.notification.create({
      data: {
        userId: followeeId,
        fromUserId: userId,
        type: 'FOLLOW',
        message: `${me.username} te empezó a seguir`,
        entityId: userId,
      },
    })
  }

  return NextResponse.json({ following: true })
}

// DELETE { followeeId } -> unfollow
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const followeeId = searchParams.get('followeeId')
  if (!followeeId) return NextResponse.json({ error: 'followeeId required' }, { status: 400 })

  await db.follow.deleteMany({ where: { followerId: userId, followeeId } })
  return NextResponse.json({ following: false })
}
