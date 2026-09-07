/**
 * POST /api/devplay/auth/login-challenge
 * Paso 1 del acceso con código 🔐: valida email+contraseña y envía un código
 * de 6 dígitos al correo del usuario. La sesión NO se crea aquí — se crea en
 * el signIn de NextAuth cuando el usuario escribe el código correcto.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createLoginCode, maskEmail } from '@/lib/login-code'
import { sendMail, verificationCodeEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    // Respuesta genérica: no revelar si el email existe o no
    if (!user || user.isGuest || !user.passwordHash) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
    }

    // Genera y envía el código (puede lanzar TOO_MANY_CODES por antispam)
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

    const tpl = verificationCodeEmail(user.username, code, 'iniciar sesión en DevPlay')
    const sent = await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html })

    return NextResponse.json({
      ok: true,
      sentTo: maskEmail(user.email),
      // Solo en modo demo (sin SMTP): el código vuelve para poder probar
      demoCode: sent ? undefined : code,
    })
  } catch (e) {
    console.error('login-challenge error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
