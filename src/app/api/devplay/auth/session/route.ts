import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Returns the current user (from session or guest cookie).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        banner: true,
        role: true,
        isGuest: true,
      },
    })
    if (user) return NextResponse.json({ user })
  }

  // guest fallback via cookie
  const guestCookie = req.cookies.get('devplay-guest-id')?.value
  if (guestCookie) {
    const guest = await db.user.findUnique({
      where: { id: guestCookie },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        banner: true,
        role: true,
        isGuest: true,
      },
    })
    if (guest) return NextResponse.json({ user: guest })
  }

  return NextResponse.json({ user: null })
}
