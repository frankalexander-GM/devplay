import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { isPrivate } = await req.json()
  if (typeof isPrivate !== 'boolean') {
    return NextResponse.json({ error: 'isPrivate debe ser boolean' }, { status: 400 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { isPrivate },
  })

  return NextResponse.json({ ok: true, isPrivate })
}
