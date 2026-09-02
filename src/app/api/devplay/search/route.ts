import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseMediaUrls, normalizeBeta, normalizeUserTags } from '@/lib/user-utils'

/**
 * GET /api/devplay/search?q=query
 * Busca en posts (contenido, betas) y usuarios (username, bio).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase()

  if (!q || q.length < 2) {
    return NextResponse.json({ posts: [], users: [] })
  }

  // Buscar usuarios por username o bio
  const users = await db.user.findMany({
    where: {
      OR: [
        { username: { contains: q } },
        { bio: { contains: q } },
      ],
      isGuest: false,
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      role: true,
      tags: true,
      _count: { select: { followers: true, posts: true } },
    },
    take: 10,
  })

  // Buscar posts por contenido
  const posts = await db.post.findMany({
    where: {
      OR: [
        { content: { contains: q } },
        { beta: { title: { contains: q } } },
        { beta: { description: { contains: q } } },
      ],
    },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      beta: true,
      stream: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  })

  const mappedPosts = posts.map((p) => ({
    id: p.id,
    type: p.type,
    content: p.content,
    mediaUrls: parseMediaUrls(p.mediaUrls),
    createdAt: p.createdAt,
    author: normalizeUserTags(p.author),
    beta: normalizeBeta(p.beta),
    stream: p.stream,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    liked: false,
  }))

  const mappedUsers = users.map((u) => ({
    ...normalizeUserTags(u),
    followersCount: u._count.followers,
    postsCount: u._count.posts,
  }))

  return NextResponse.json({ posts: mappedPosts, users: mappedUsers })
}
