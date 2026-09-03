import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(100),
})

// POST /api/devplay/auth/reset-password
// Valida el token y actualiza la contraseña
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos. La contraseña debe tener mínimo 6 caracteres.' },
      { status: 400 }
    )
  }

  const { token, password } = parsed.data

  // Buscar usuario por token válido (no expirado)
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'El enlace de recuperación es inválido o ha expirado' },
      { status: 400 }
    )
  }

  // Hashear nueva contraseña
  const passwordHash = await bcrypt.hash(password, 10)

  // Actualizar usuario y limpiar token
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return NextResponse.json({
    ok: true,
    message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
  })
}
