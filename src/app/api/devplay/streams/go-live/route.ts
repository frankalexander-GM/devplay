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

const schema = z.object({
  platform: z.enum(['TWITCH', 'YOUTUBE', 'KICK']),
  streamUrl: z.string().url(),
  embedUrl: z.string().url(),
  title: z.string().min(3).max(120),
  content: z.string().max(2000).optional().nullable(),
})

function buildEmbedUrl(platform: string, rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    if (platform === 'TWITCH') {
      // twitch.tv/username or twitch.tv/videos/123
      if (u.hostname.includes('twitch.tv')) {
        const parts = u.pathname.split('/').filter(Boolean)
        if (parts[0] === 'videos' && parts[1]) {
          return `https://player.twitch.tv/?video=${parts[1]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&autoplay=false`
        }
        if (parts[0]) {
          return `https://player.twitch.tv/?channel=${parts[0]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&autoplay=false`
        }
      }
    }
    if (platform === 'YOUTUBE') {
      // youtu.be/ID or youtube.com/watch?v=ID
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}?autoplay=1`
      if (u.hostname === 'youtu.be' && parts[0]) return `https://www.youtube.com/embed/${parts[0]}?autoplay=1`
    }
    if (platform === 'KICK') {
      // kick.com/username
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0]) return `https://player.kick.com/${parts[0]}`
    }
  } catch {}
  return rawUrl
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const data = parsed.data
  const embedUrl = buildEmbedUrl(data.platform, data.streamUrl)

  // Check if user already has a live stream
  const existing = await db.stream.findFirst({
    where: { userId, isLive: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ya tienes un directo en curso' }, { status: 409 })
  }

  const post = await db.post.create({
    data: {
      authorId: userId,
      type: 'STREAM',
      content: data.content ?? null,
      stream: {
        create: {
          userId,
          platform: data.platform,
          streamUrl: data.streamUrl,
          embedUrl,
          title: data.title,
          isLive: true,
          startedAt: new Date(),
        },
      },
    },
    include: {
      stream: true,
      author: { select: { id: true, username: true, avatar: true } },
    },
  })

  // Create notifications for all followers
  const followers = await db.follow.findMany({
    where: { followeeId: userId },
    select: { followerId: true },
  })
  const author = await db.user.findUnique({ where: { id: userId }, select: { username: true, avatar: true } })
  if (followers.length && author && post.stream) {
    await db.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        fromUserId: userId,
        type: 'LIVE',
        message: `🎮 ${author.username} está en vivo ahora mismo`,
        entityId: post.stream.id,
      })),
    })

    // Broadcast in real-time via the realtime mini-service
    try {
      await fetch('http://localhost:3004/internal/broadcast-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username: author.username,
          avatar: author.avatar,
          title: post.stream.title,
          streamId: post.stream.id,
          message: `🎮 ${author.username} está en vivo ahora mismo`,
        }),
      })
    } catch (e) {
      console.error('Failed to broadcast live to realtime service', e)
    }
  }

  return NextResponse.json({ post, stream: post.stream })
}
