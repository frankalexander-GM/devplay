import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLoginCode, maskEmail } from '@/lib/login-code'
import { mailEnabled, sendMail, verificationCodeEmail } from '@/lib/mailer'

const schema = z.object({
  email: z.string().email(),
})

// POST /api/devplay/auth/forgot-password
// Paso 1 de la recuperación 🔑: envía un CÓDIGO real de 6 dígitos al correo
// (10 min de validez, un solo uso, antispam 5 códigos/15 min).
// La contraseña nueva se guarda en /reset-password con { email, code, password }.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, username: true, isGuest: true, passwordHash: true },
  })

  // Por seguridad, siempre devolvemos success (no revelar si el email existe)
  if (!user || user.isGuest || !user.passwordHash) {
    return NextResponse.json({
      ok: true,
      message: 'Si el email existe, recibirás un código de recuperación',
    })
  }

  // Genera y envía el código real (puede lanzar TOO_MANY_CODES por antispam)
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

  const tpl = verificationCodeEmail(user.username, code, 'restablecer tu contraseña de DevPlay')
  const sent = mailEnabled()
    ? await sendMail({ to: email, subject: tpl.subject, html: tpl.html })
    : false

  if (!sent) {
    console.log(`[forgot-password] Código para ${email}: ${code}`)
  }

  return NextResponse.json({
    ok: true,
    message: 'Si el email existe, recibirás un código de recuperación',
    sentTo: maskEmail(email),
    // Solo en modo demo (sin SMTP): el código vuelve para poder probar
    demoCode: !sent && process.env.NODE_ENV === 'development' ? code : undefined,
  })
}
