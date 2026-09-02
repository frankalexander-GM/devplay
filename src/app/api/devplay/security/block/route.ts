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

// POST { blockedId } = bloquear
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { blockedId } = await req.json()
  if (!blockedId || blockedId === userId) {
    return NextResponse.json({ error: 'Inválido' }, { status: 400 })
  }

  // Eliminar follow si existe
  await db.follow.deleteMany({ where: { followerId: userId, followeeId: blockedId } })
  await db.follow.deleteMany({ where: { followerId: blockedId, followeeId: userId } })

  try {
    await db.block.create({ data: { blockerId: userId, blockedId } })
  } catch {
    // already blocked
  }

  return NextResponse.json({ blocked: true })
}

// DELETE { blockedId } = desbloquear
export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const blockedId = searchParams.get('blockedId')
  if (!blockedId) return NextResponse.json({ error: 'blockedId required' }, { status: 400 })

  await db.block.deleteMany({ where: { blockerId: userId, blockedId } })
  return NextResponse.json({ blocked: false })
}
