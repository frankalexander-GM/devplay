import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeUserTags } from '@/lib/user-utils'

/**
 * GET /api/devplay/users/[id]/followers
 * Lista los seguidores de un usuario.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const follows = await db.follow.findMany({
    where: { followeeId: id },
    include: {
      follower: {
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

  const followers = follows.map((f) => ({
    ...normalizeUserTags(f.follower),
    followersCount: f.follower._count.followers,
    postsCount: f.follower._count.posts,
    followedAt: f.createdAt,
  }))

  return NextResponse.json({ followers, total: followers.length })
}
