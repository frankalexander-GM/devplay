import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/devplay/users/by-username/[username]
// Devuelve info mínima de un usuario por su username (para menciones @)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  })
  if (!user) return NextResponse.json({ user: null }, { status: 404 })
  return NextResponse.json({ user })
}
