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

/**
 * POST /api/devplay/posts/[id]/repost
 * Crea un repost de la publicación original, manteniendo el crédito del autor.
 * Body: { content?: string } — comentario opcional del usuario que reposteó
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const content = body?.content?.trim()?.slice(0, 2000) || null

  // Verificar que el post original existe
  const original = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, type: true, repostOfId: true },
  })
  if (!original) {
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
  }

  // Si el post que se va a repostear ES un repost, apuntar al original real (root)
  // Así siempre se mantiene el crédito y contenido del autor original
  let rootPostId = id
  let rootAuthorId = original.authorId
  if (original.repostOfId) {
    const rootPost = await db.post.findUnique({
      where: { id: original.repostOfId },
      select: { id: true, authorId: true, repostOfId: true },
    })
    if (rootPost) {
      rootPostId = rootPost.id
      rootAuthorId = rootPost.authorId
    }
  }

  // No puedes repostear tu propio post (verificar contra el autor original real)
  if (rootAuthorId === userId) {
    return NextResponse.json({ error: 'No puedes repostear tu propia publicación' }, { status: 400 })
  }

  // Verificar que no haya ya reposteado este post original
  const existingRepost = await db.post.findFirst({
    where: { authorId: userId, repostOfId: rootPostId },
  })
  if (existingRepost) {
    return NextResponse.json({ error: 'Ya has reposteado esta publicación' }, { status: 400 })
  }

  // Verificar bloqueo (contra el autor original real)
  const blockExists = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: rootAuthorId, blockedId: userId },
        { blockerId: userId, blockedId: rootAuthorId },
      ],
    },
  })
  if (blockExists) {
    return NextResponse.json({ error: 'No puedes repostear esta publicación' }, { status: 403 })
  }

  // Crear el repost — siempre apunta al ROOT original, no a otro repost
  const repost = await db.post.create({
    data: {
      authorId: userId,
      type: 'POST',
      content,
      repostOfId: rootPostId,
    },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      repostOf: {
        include: {
          author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
          beta: true,
          stream: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  })

  // Crear notificación al autor ORIGINAL del post (no al que reposteó)
  if (rootAuthorId !== userId) {
    const reposter = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
    if (reposter) {
      await db.notification.create({
        data: {
          userId: rootAuthorId,
          fromUserId: userId,
          type: 'COMMENT',
          message: `@${reposter.username} reposteó tu publicación`,
          entityId: repost.id,
        },
      })
    }
  }

  return NextResponse.json({ post: repost })
}
