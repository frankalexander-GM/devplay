import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { verifyLoginCode } from '@/lib/login-code'

// POST /api/devplay/auth/reset-password
// Paso 2 de la recuperación 🔑: valida el CÓDIGO de 6 dígitos y guarda la
// contraseña nueva. También acepta el formato antiguo por enlace (token)
// para no romper correos ya enviados.
const codeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
  password: z.string().min(6).max(100),
})

const legacySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(100),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // ===== Camino nuevo: código de 6 dígitos =====
  const byCode = codeSchema.safeParse(body)
  if (byCode.success) {
    const { email, code, password } = byCode.data

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, isGuest: true, passwordHash: true },
    })
    if (!user || user.isGuest || !user.passwordHash) {
      return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
    }

    const valid = await verifyLoginCode(user.id, code)
    if (!valid) {
      return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    })

    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    })
  }

  // ===== Camino antiguo (compatibilidad): enlace con token =====
  const legacy = legacySchema.safeParse(body)
  if (legacy.success) {
    const { token, password } = legacy.data

    const user = await db.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    })

    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    })
  }

  return NextResponse.json(
    { error: 'Datos inválidos. La contraseña debe tener mínimo 6 caracteres.' },
    { status: 400 }
  )
}
