import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * Flujo de eliminación de cuenta en 3 pasos:
 *  1. request-code  → genera un código de 6 dígitos, lo guarda hasheado (10 min)
 *     y lo "envía" al correo. En este entorno demo no hay SMTP configurado,
 *     así que el código se devuelve como devCode (y se loguea en servidor).
 *  2. verify-code   → valida el código sin consumirlo (feedback inmediato en UI)
 *  3. confirm       → valida código + contraseña y elimina la cuenta (cascada)
 */

const CODE_TTL_MS = 10 * 60 * 1000

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return 'tu correo'
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${'•'.repeat(Math.max(name.length - visible.length, 2))}@${domain}`
}

async function getValidCode(userId: string) {
  return db.accountDeletionCode.findFirst({
    where: { userId, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const action = body.action
  const userId = session.user.id

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // ===== 1. Pedir código al correo =====
  if (action === 'request-code') {
    if (user.isGuest) {
      return NextResponse.json({ error: 'Las cuentas de invitado no requieren eliminación por código' }, { status: 400 })
    }

    // Invalida códigos anteriores
    await db.accountDeletionCode.updateMany({
      where: { userId, consumed: false },
      data: { consumed: true },
    })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const codeHash = await bcrypt.hash(code, 10)
    const expiresAt = new Date(Date.now() + CODE_TTL_MS)

    await db.accountDeletionCode.create({
      data: { userId, codeHash, expiresAt },
    })

    // ==== Envío de correo ====
    // Este entorno no tiene SMTP configurado. Cuando haya credenciales
    // (p. ej. SMTP_HOST/SMTP_USER/SMTP_PASS) aquí se enviaría el correo real.
    // Por ahora se registra en el log del servidor y se devuelve como devCode.
    console.log(`[DEVPLAY] Código de eliminación para ${user.email}: ${code} (válido 10 min)`)

    return NextResponse.json({
      ok: true,
      email: maskEmail(user.email),
      expiresAt: expiresAt.toISOString(),
      devCode: code, // Solo en modo demo (sin SMTP)
    })
  }

  // ===== 2. Verificar código (sin consumir) =====
  if (action === 'verify-code') {
    const { code } = body
    if (!code) return NextResponse.json({ error: 'Escribe el código de 6 dígitos' }, { status: 400 })

    const record = await getValidCode(userId)
    if (!record) {
      return NextResponse.json({ error: 'No hay un código válido. Pide uno nuevo.' }, { status: 400 })
    }

    const valid = await bcrypt.compare(String(code), record.codeHash)
    if (!valid) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  // ===== 3. Confirmar eliminación (código + contraseña) =====
  if (action === 'confirm') {
    const { code, password, confirm } = body
    if (!code || !password) {
      return NextResponse.json({ error: 'Se requiere el código y tu contraseña' }, { status: 400 })
    }
    if (confirm !== 'ELIMINAR MI CUENTA') {
      return NextResponse.json({ error: 'Debes escribir "ELIMINAR MI CUENTA" para confirmar' }, { status: 400 })
    }

    const record = await getValidCode(userId)
    if (!record) {
      return NextResponse.json({ error: 'El código expiró. Pide uno nuevo.' }, { status: 400 })
    }

    const codeValid = await bcrypt.compare(String(code), record.codeHash)
    if (!codeValid) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Tu cuenta usa acceso social y no tiene contraseña' }, { status: 400 })
    }

    const passValid = await bcrypt.compare(password, user.passwordHash)
    if (!passValid) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 400 })
    }

    // Consumir el código y eliminar la cuenta (cascada borra todo)
    await db.accountDeletionCode.update({ where: { id: record.id }, data: { consumed: true } })
    await db.user.delete({ where: { id: userId } })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
