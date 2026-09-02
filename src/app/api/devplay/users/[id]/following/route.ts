import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeUserTags } from '@/lib/user-utils'

/**
 * GET /api/devplay/users/[id]/following
 * Lista a quién sigue un usuario.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const follows = await db.follow.findMany({
    where: { followerId: id },
    include: {
      followee: {
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
          role: true,
          tags: true,
          _count: { select: { followers: true, posts: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const following = follows.map((f) => ({
    ...normalizeUserTags(f.followee),
    followersCount: f.followee._count.followers,
    postsCount: f.followee._count.posts,
    followedAt: f.createdAt,
  }))

  return NextResponse.json({ following, total: following.length })
}
