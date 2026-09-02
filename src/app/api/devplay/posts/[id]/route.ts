import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseMediaUrls, normalizeBeta, normalizeUserTags, normalizePoll } from '@/lib/user-utils'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const viewerId = await getViewerId(req)

  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      beta: true,
      stream: true,
      poll: { include: { options: true } },
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
    },
  })

  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Votos del viewer en la encuesta del post (si hay)
  let userPollVotes: string[] = []
  if (viewerId && post.poll) {
    const votes = await db.pollVote.findMany({
      where: { pollId: post.poll.id, userId: viewerId },
      select: { optionId: true },
    })
    userPollVotes = votes.map((v) => v.optionId)
  }

  return NextResponse.json({
    post: {
      id: post.id,
      type: post.type,
      content: post.content,
      mediaUrls: parseMediaUrls(post.mediaUrls),
      createdAt: post.createdAt,
      author: normalizeUserTags(post.author),
      beta: normalizeBeta(post.beta),
      stream: post.stream,
      poll: normalizePoll(post.poll, userPollVotes),
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      liked: viewerId ? post.likes.length > 0 : false,
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (post.authorId !== userId) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  await db.post.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// PATCH = editar contenido de un post (solo autor)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({ where: { id }, select: { authorId: true, type: true } })
  if (!post) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (post.authorId !== userId) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const body = await req.json()
  const { content } = body
  if (typeof content !== 'string' || content.length > 2000) {
    return NextResponse.json({ error: 'Contenido inválido' }, { status: 400 })
  }

  await db.post.update({
    where: { id },
    data: { content: content || null },
  })

  return NextResponse.json({ ok: true })
}
