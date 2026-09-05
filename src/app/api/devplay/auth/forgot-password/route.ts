import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'
import { mailEnabled, sendMail, resetPasswordEmail } from '@/lib/mailer'

const schema = z.object({
  email: z.string().email(),
})

// POST /api/devplay/auth/forgot-password
// Genera un token de recuperación y lo guarda en la DB.
// Con SMTP configurado envía el correo real; sin SMTP, modo demo (token en log).
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

  // Correo real si hay SMTP; si no, modo demo (token en log del servidor)
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/?reset=${token}`
  let sent = false
  if (mailEnabled()) {
    const tpl = resetPasswordEmail(user.username, resetUrl)
    sent = await sendMail({ to: email, subject: tpl.subject, html: tpl.html })
  }
  if (!sent) {
    console.log(`[forgot-password] Token para ${email}: ${token}`)
    console.log(`[forgot-password] Enlace de recuperación: /?reset=${token}`)
  }

  return NextResponse.json({
    ok: true,
    message: 'Si el email existe, recibirás un enlace de recuperación',
    // Solo en desarrollo/demo (sin SMTP): devolver el enlace para probar
    demoToken: !sent && process.env.NODE_ENV === 'development' ? token : undefined,
    demoResetUrl: !sent && process.env.NODE_ENV === 'development'
      ? `/?reset=${token}`
      : undefined,
  })
}
