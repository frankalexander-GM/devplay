import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  email: z.string().email(),
})

// POST /api/devplay/auth/forgot-password
// Genera un token de recuperación y lo guarda en la DB
// En producción: enviar email con el enlace. En demo: devolver el token.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, username: true, isGuest: true, provider: true },
  })

  // Por seguridad, siempre devolvemos success (no revelar si el email existe)
  if (!user || user.isGuest) {
    return NextResponse.json({
      ok: true,
      message: 'Si el email existe, recibirás un enlace de recuperación',
    })
  }

  // Generar token seguro
  const token = crypto.randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await db.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpiry: expiry,
    },
  })

  // En producción: enviar email con nodemailer/SendGrid/etc
  // El enlace sería: https://devplay.app/reset-password?token=XXXX
  //
  // Para demo: devolvemos el token para que se pueda usar directamente
  // (en producción, NO devolver el token en la respuesta)

  console.log(`[forgot-password] Token para ${email}: ${token}`)

  return NextResponse.json({
    ok: true,
    message: 'Si el email existe, recibirás un enlace de recuperación',
    // Solo en desarrollo/demo: devolver el token
    demoToken: process.env.NODE_ENV === 'development' ? token : undefined,
    demoResetUrl: process.env.NODE_ENV === 'development'
      ? `/?reset=${token}`
      : undefined,
  })
}
