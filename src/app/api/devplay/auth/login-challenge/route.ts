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
import { rateLimit, rateLimitByKey, peekRateLimitByKey, tooMany } from '@/lib/rate-limit'

// Bloqueo por cuenta: 15 fallos de contraseña en 15 min → 15 min de descanso
const FAIL_LIMIT = 15
const FAIL_WINDOW_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  try {
    // Anti fuerza bruta 🛡️: máx. 10 intentos por IP cada minuto y máx. 15 fallos
    // por cuenta cada 15 min (aunque cambien de IP)
    const rl = rateLimit(req, 'login-challenge', 10, 60_000)
    if (!rl.ok) return tooMany(rl.retryAfter)

    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const acctRl = rateLimitByKey(`login-acct:${email}`, 15, 15 * 60_000)
    if (!acctRl.ok) return tooMany(acctRl.retryAfter, 'Demasiados intentos para esta cuenta. Espera 15 minutos plis 🙏')

    // ¿Cuenta bloqueada por fallos recientes? (peek: solo mira, no suma)
    const peek = peekRateLimitByKey(`login-fail:${email}`, FAIL_LIMIT, FAIL_WINDOW_MS)
    if (!peek.ok) {
      return tooMany(peek.retryAfter, 'Cuenta bloqueada temporalmente por intentos fallidos. Espera 15 minutos plis 🙏')
    }

    const user = await db.user.findUnique({ where: { email } })
    // Respuesta genérica: no revelar si el email existe o no
    if (!user || user.isGuest || !user.passwordHash) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      // registra el fallo pa' el bloqueo por cuenta (límite 15 en 15 min)
      rateLimitByKey(`login-fail:${email}`, FAIL_LIMIT, FAIL_WINDOW_MS)
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
