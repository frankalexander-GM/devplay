import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { normalizeUserTags } from '@/lib/user-utils'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

export async function GET(req: NextRequest) {
  const userId = await getViewerId(req)
  if (!userId) return NextResponse.json({ user: null })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      avatar: true,
      banner: true,
      role: true,
      isGuest: true,
      isPrivate: true,
      tags: true,
      fullName: true,
      location: true,
      website: true,
      profession: true,
      birthDate: true,
      socialLinks: true,
      tourCompleted: true,
      language: true,
      lastSeen: true,
      createdAt: true,
    },
  })

  const normalizedUser = normalizeUserTags(user)

  // check live stream
  const liveStream = await db.stream.findFirst({
    where: { userId, isLive: true },
    select: { id: true, title: true, platform: true },
  })

  return NextResponse.json({ user: normalizedUser, liveStream })
}
