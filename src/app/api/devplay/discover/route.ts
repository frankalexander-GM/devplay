import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseMediaUrls, normalizeBeta, normalizeUserTags } from '@/lib/user-utils'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

/**
 * GET /api/devplay/discover
 * Returns trending content, recommended users, hashtags, and featured posts.
 * Excludes blocked users' content.
 */
export async function GET(req: NextRequest) {
  const viewerId = await getViewerId(req)

  // Get blocked IDs
  let blockedIds: string[] = []
  if (viewerId) {
    const [blocked, blockedBy] = await Promise.all([
      db.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
      db.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
    ])
    blockedIds = [...blocked.map(b => b.blockedId), ...blockedBy.map(b => b.blockerId), viewerId]
  } else if (viewerId) {
    blockedIds = [viewerId]
  }

  // 1. Trending posts (most likes + comments in recent time)
  const trending = await db.post.findMany({
    where: {
      authorId: { notIn: blockedIds },
      type: { in: ['POST', 'BETA'] },
    },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      beta: true,
      stream: true,
      _count: { select: { likes: true, comments: true, reposts: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  // Sort by engagement score (likes + comments*2 + reposts*3)
  const trendingSorted = trending
    .map(p => ({
      post: p,
      score: p._count.likes + p._count.comments * 2 + p._count.reposts * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ post: p }) => ({
      id: p.id,
      type: p.type,
      content: p.content,
      mediaUrls: parseMediaUrls(p.mediaUrls),
      createdAt: p.createdAt,
      author: normalizeUserTags(p.author),
      beta: normalizeBeta(p.beta),
      stream: p.stream,
      repostOf: null,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      repostsCount: p._count.reposts,
      liked: false,
    }))

  // 2. Recommended users (most followers, not already followed/blocked)
  let followingIds: string[] = []
  if (viewerId) {
    const following = await db.follow.findMany({
      where: { followerId: viewerId },
      select: { followeeId: true },
    })
    followingIds = following.map(f => f.followeeId)
  }

  const excludeIds = [...new Set([...blockedIds, ...followingIds])]

  const recommendedUsers = await db.user.findMany({
    where: {
      id: { notIn: excludeIds },
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
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  const mappedUsers = recommendedUsers.map(u => ({
    ...normalizeUserTags(u),
    followersCount: u._count.followers,
    postsCount: u._count.posts,
  }))

  // 3. Popular betas (most downloads)
  const popularBetas = await db.post.findMany({
    where: {
      type: 'BETA',
      authorId: { notIn: blockedIds },
    },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      beta: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  const mappedBetas = popularBetas.map(p => ({
    id: p.id,
    title: p.beta?.title ?? '',
    description: p.beta?.description ?? '',
    coverImage: p.beta?.coverImage ?? null,
    downloads: p.beta?.downloads ?? 0,
    genre: p.beta?.genre ?? null,
    version: p.beta?.version ?? null,
    author: normalizeUserTags(p.author),
    likesCount: p._count.likes,
  }))

  // 4. Hashtags populares (from beta tags + user tags)
  const allUsers = await db.user.findMany({
    where: { tags: { not: null } },
    select: { tags: true },
    take: 100,
  })
  const tagCounts = new Map<string, number>()
  allUsers.forEach(u => {
    try {
      const tags = JSON.parse(u.tags || '[]')
      tags.forEach((t: string) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
    } catch {}
  })
  const popularTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  // 5. Recent posts (latest activity)
  const recent = await db.post.findMany({
    where: {
      authorId: { notIn: blockedIds },
      type: { in: ['POST', 'BETA'] },
    },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
      beta: true,
      stream: true,
      _count: { select: { likes: true, comments: true, reposts: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  const mappedRecent = recent.map(p => ({
    id: p.id,
    type: p.type,
    content: p.content,
    mediaUrls: parseMediaUrls(p.mediaUrls),
    createdAt: p.createdAt,
    author: normalizeUserTags(p.author),
    beta: normalizeBeta(p.beta),
    stream: p.stream,
    repostOf: null,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    repostsCount: p._count.reposts,
    liked: false,
  }))

  return NextResponse.json({
    trending: trendingSorted,
    recommendedUsers: mappedUsers,
    popularBetas: mappedBetas,
    popularTags,
    recent: mappedRecent,
  })
}
