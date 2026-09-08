/**
 * POST /api/devplay/auth/register
 * Crea la cuenta y envía un código de 6 dígitos al correo para CONFIRMAR
 * que el email es real 🔐. La sesión NO se crea aquí — se crea en el
 * verify-register (tras escribir el código correcto).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createLoginCode, maskEmail } from '@/lib/login-code'
import { sendMail, verificationCodeEmail } from '@/lib/mailer'

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo'),
  password: z.string().min(6),
  // Datos de perfil pedidos en el registro (Ley 1581: declaramos la edad — menores de 13 no entran)
  fullName: z.string().trim().min(3).max(30, 'El nombre de perfil debe tener 3-30 caracteres'),
  age: z.number().int().min(13, 'Debes tener al menos 13 años para usar DevPlay').max(120),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const { email, username, password, fullName, age } = parsed.data

    const existing = await db.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'El email o usuario ya existe' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        fullName,
        age,
        role: 'USER',
      },
    })

    // Código de confirmación de correo 📮 (puede lanzar TOO_MANY_CODES por antispam)
    let code: string
    try {
      code = await createLoginCode(user.id)
    } catch (e: any) {
      if (e?.message === 'TOO_MANY_CODES') {
        return NextResponse.json(
          { error: 'Demasiados códigos enviados seguidos. Espera unos 15 minutos plis 🙏' },
          { status: 429 }
        )
      }
      throw e
    }

    const tpl = verificationCodeEmail(user.username, code, 'confirmar tu cuenta de DevPlay')
    const sent = await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html })

    return NextResponse.json({
      ok: true,
      id: user.id,
      username: user.username,
      sentTo: maskEmail(user.email),
      // Solo en modo demo (sin SMTP): el código vuelve para poder probar
      demoCode: sent ? undefined : code,
    })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
