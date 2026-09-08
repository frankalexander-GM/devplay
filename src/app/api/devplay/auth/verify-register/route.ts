/**
 * POST /api/devplay/auth/verify-register
 * Paso 2 del registro 🔐: confirma el código de 6 dígitos enviado al correo.
 * Si el código es válido → correo de bienvenida y ok para crear la sesión.
 *
 * Body: { email, code }            → verifica el código
 *       { email, resend: true }    → reenvía un código nuevo (antispam: 5/15min)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createLoginCode, verifyLoginCode, maskEmail } from '@/lib/login-code'
import { sendMail, verificationCodeEmail, welcomeEmail } from '@/lib/mailer'
import { rateLimit, tooMany } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Anti-bots 🛡️: máx. 15 verificaciones/reenvíos por IP cada minuto
    const rl = rateLimit(req, 'verify-register', 15, 60_000)
    if (!rl.ok) return tooMany(rl.retryAfter)

    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const code = String(body?.code || '').replace(/\D/g, '')
    const resend = Boolean(body?.resend)

    if (!email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user || user.isGuest || !user.passwordHash) {
      // Error genérico: no revelar si el email existe o no (anti-enumeración)
      return NextResponse.json({ error: 'Código incorrecto o expirado. Revisa tu correo.' }, { status: 400 })
    }

    // ===== Reenvío de código =====
    if (resend) {
      let newCode: string
      try {
        newCode = await createLoginCode(user.id)
      } catch (e: any) {
        if (e?.message === 'TOO_MANY_CODES') {
          return NextResponse.json(
            { error: 'Demasiados códigos enviados seguidos. Espera unos 15 minutos plis 🙏' },
            { status: 429 }
          )
        }
        throw e
      }
      const tpl = verificationCodeEmail(user.username, newCode, 'confirmar tu cuenta de DevPlay')
      const sent = await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html })
      return NextResponse.json({
        ok: true,
        sentTo: maskEmail(user.email),
        demoCode: sent ? undefined : newCode,
      })
    }

    // ===== Verificación =====
    if (code.length !== 6) {
      return NextResponse.json({ error: 'Escribe los 6 dígitos del código' }, { status: 400 })
    }

    const valid = await verifyLoginCode(user.id, code)
    if (!valid) {
      return NextResponse.json({ error: 'Código incorrecto o expirado. Revisa tu correo.' }, { status: 400 })
    }

    // Correo de bienvenida 🎉 (no bloquea la respuesta si falla)
    const tpl = welcomeEmail(user.username)
    sendMail({ to: user.email, subject: tpl.subject, html: tpl.html }).catch(() => {})

    return NextResponse.json({ ok: true, username: user.username })
  } catch (e) {
    console.error('verify-register error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
