import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { normalizeUserTags } from '@/lib/user-utils'
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
  bio: z.string().max(500).optional().nullable(),
  avatar: z.string().optional().nullable(),
  banner: z.string().optional().nullable(),
  tags: z.array(z.string().max(40)).max(15).optional(),
  fullName: z.string().max(100).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  profession: z.string().max(100).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  socialLinks: z.record(z.string()).optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const data = parsed.data
  const update: any = {}
  if (data.bio !== undefined) update.bio = data.bio
  if (data.avatar !== undefined) update.avatar = data.avatar
  if (data.banner !== undefined) update.banner = data.banner
  if (data.tags !== undefined) update.tags = JSON.stringify(data.tags)
  if (data.fullName !== undefined) update.fullName = data.fullName
  if (data.location !== undefined) update.location = data.location
  if (data.website !== undefined) update.website = data.website
  if (data.profession !== undefined) update.profession = data.profession
  if (data.birthDate !== undefined) update.birthDate = data.birthDate ? new Date(data.birthDate) : null
  if (data.socialLinks !== undefined) update.socialLinks = data.socialLinks ? JSON.stringify(data.socialLinks) : null

  const user = await db.user.update({
    where: { id: userId },
    data: update,
    select: {
      id: true,
      username: true,
      email: true,
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
    },
  })

  return NextResponse.json({ user: normalizeUserTags(user) })
}
