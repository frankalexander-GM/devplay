import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { password, confirm } = await req.json()
  if (!password || !confirm) {
    return NextResponse.json({ error: 'Se requiere contraseña y confirmación' }, { status: 400 })
  }
  if (password !== confirm) {
    return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
  }
  if (confirm !== 'ELIMINAR MI CUENTA') {
    return NextResponse.json({ error: 'Debes escribir "ELIMINAR MI CUENTA" para confirmar' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 400 })
  }

  // Eliminar usuario (cascada elimina todo su contenido)
  await db.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
