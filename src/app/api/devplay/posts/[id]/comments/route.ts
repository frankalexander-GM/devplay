import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const comments = await db.comment.findMany({
    where: { postId: id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  return NextResponse.json({ comments })
}

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Comentario inválido' }, { status: 400 })
  }

  const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

  // Verificar que el autor del post no haya bloqueado al usuario (ni viceversa)
  const blockExists = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: post.authorId, blockedId: userId },
        { blockerId: userId, blockedId: post.authorId },
      ],
    },
  })
  if (blockExists) {
    return NextResponse.json({ error: 'No puedes comentar en esta publicación' }, { status: 403 })
  }

  const comment = await db.comment.create({
    data: {
      postId: id,
      userId,
      content: parsed.data.content,
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  })

  // notification to post author (if not self)
  if (post.authorId !== userId) {
    const author = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
    if (author) {
      await db.notification.create({
        data: {
          userId: post.authorId,
          fromUserId: userId,
          type: 'COMMENT',
          message: `${author.username} comentó tu publicación`,
          entityId: id,
        },
      })
    }
  }

  return NextResponse.json({ comment })
}
