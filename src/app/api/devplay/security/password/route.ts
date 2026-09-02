import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Verificar contraseña actual
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
  }

  // Validar fortaleza de la nueva contraseña
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  })

  // Crear notificación de seguridad
  await db.notification.create({
    data: {
      userId: user.id,
      fromUserId: user.id,
      type: 'LIKE', // reusing; ideally add SECURITY type
      message: '🔒 Tu contraseña fue cambiada correctamente. Si no fuiste tú, contacta soporte.',
      entityId: user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
