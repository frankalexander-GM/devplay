import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseMediaUrls, normalizeBeta, normalizeUserTags } from '@/lib/user-utils'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/auth')
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

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      bio: true,
      avatar: true,
      banner: true,
      role: true,
      isGuest: true,
      tags: true,
      fullName: true,
      location: true,
      website: true,
      profession: true,
      birthDate: true,
      socialLinks: true,
      lastSeen: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let isFollowing = false
  let isBlocked = false
  let blockedMe = false
  if (viewerId && viewerId !== id) {
    const [f, blockByViewer, blockByUser] = await Promise.all([
      db.follow.findUnique({
        where: { followerId_followeeId: { followerId: viewerId, followeeId: id } },
      }),
      db.block.findUnique({
        where: { blockerId_blockedId: { blockerId: viewerId, blockedId: id } },
      }),
      db.block.findUnique({
        where: { blockerId_blockedId: { blockerId: id, blockedId: viewerId } },
      }),
    ])
    isFollowing = !!f
    isBlocked = !!blockByViewer
    blockedMe = !!blockByUser
  }

  // Fetch their posts (feed)
  const posts = await db.post.findMany({
    where: { authorId: id },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      beta: true,
      stream: true,
      repostOf: {
        include: {
          author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
          beta: true,
          stream: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
      _count: { select: { likes: true, comments: true, reposts: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
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
    repostOf: p.repostOf ? {
      id: p.repostOf.id,
      type: p.repostOf.type,
      content: p.repostOf.content,
      mediaUrls: parseMediaUrls(p.repostOf.mediaUrls),
      createdAt: p.repostOf.createdAt,
      author: normalizeUserTags(p.repostOf.author),
      beta: normalizeBeta(p.repostOf.beta),
      stream: p.repostOf.stream,
      likesCount: p.repostOf._count.likes,
      commentsCount: p.repostOf._count.comments,
    } : null,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    repostsCount: p._count.reposts,
    liked: viewerId ? p.likes.length > 0 : false,
  }))

  return NextResponse.json({
    user: {
      ...normalizeUserTags(user),
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      isFollowing,
      isBlocked,
      blockedMe,
    },
    posts: mappedPosts,
  })
}
