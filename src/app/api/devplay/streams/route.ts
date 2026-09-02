import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseMediaUrls } from '@/lib/user-utils'

// GET list of live streams
export async function GET(req: NextRequest) {
  const streams = await db.stream.findMany({
    where: { isLive: true },
    include: {
      user: { select: { id: true, username: true, avatar: true, role: true } },
      post: {
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  return NextResponse.json({
    streams: streams.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: s.user,
      postId: s.postId,
      platform: s.platform,
      streamUrl: s.streamUrl,
      embedUrl: s.embedUrl,
      title: s.title,
      isLive: s.isLive,
      startedAt: s.startedAt,
    })),
  })
}
