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

// POST = like, DELETE = unlike
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await db.like.findUnique({
    where: { postId_userId: { postId: id, userId } },
  })
  if (existing) return NextResponse.json({ liked: true })

  // Verificar bloqueo
  const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  const blockExists = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: post.authorId, blockedId: userId },
        { blockerId: userId, blockedId: post.authorId },
      ],
    },
  })
  if (blockExists) {
    return NextResponse.json({ error: 'No puedes reaccionar a esta publicación' }, { status: 403 })
  }

  await db.like.create({ data: { postId: id, userId } })

  // notification
  if (post.authorId !== userId) {
    const author = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
    if (author) {
      await db.notification.create({
        data: {
          userId: post.authorId,
          fromUserId: userId,
          type: 'LIKE',
          message: `A ${author.username} le gustó tu publicación`,
          entityId: id,
        },
      })
    }
  }

  return NextResponse.json({ liked: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  await db.like.deleteMany({ where: { postId: id, userId } })
  return NextResponse.json({ liked: false })
}
