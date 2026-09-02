import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseMediaUrls, normalizeBeta, normalizeUserTags } from '@/lib/user-utils'

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
 * GET /api/devplay/users/me/bookmarks
 * Lista los posts guardados por el usuario actual.
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ posts: [] })

  const bookmarks = await db.bookmark.findMany({
    where: { userId },
    include: {
      post: {
        include: {
          author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
          beta: true,
          stream: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const posts = bookmarks.map((b) => ({
    id: b.post.id,
    type: b.post.type,
    content: b.post.content,
    mediaUrls: parseMediaUrls(b.post.mediaUrls),
    createdAt: b.post.createdAt,
    author: normalizeUserTags(b.post.author),
    beta: normalizeBeta(b.post.beta),
    stream: b.post.stream,
    likesCount: b.post._count.likes,
    commentsCount: b.post._count.comments,
    liked: false,
    savedAt: b.createdAt,
  }))

  return NextResponse.json({ posts })
}
