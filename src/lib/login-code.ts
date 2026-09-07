/**
 * Códigos de acceso de un solo uso para iniciar sesión 🔐
 * Flujo: el usuario pone email+contraseña → se le envía un código de 6 dígitos
 * por correo → lo escribe en la app → sesión creada.
 *
 * Seguridad:
 * - El código se guarda hasheado (bcrypt), nunca en texto plano
 * - Caduca en 10 minutos
 * - Un solo uso (se marca usado al verificarse)
 * - Máx. 5 intentos por código; a los 3 códigos mal escritos, expira igual
 * - Máx. 5 códigos por cuenta cada 15 minutos (antispam de correos)
 */

import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutos
const MAX_ATTEMPTS = 5
const MAX_CODES_PER_WINDOW = 5
const WINDOW_MS = 15 * 60 * 1000

/** Genera un código, lo guarda hasheado y devuelve el código en claro (para el correo). */
export async function createLoginCode(userId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const codeHash = await bcrypt.hash(code, 8) // 8 rondas: código efímero, no hace falta más

  // Antispam: si ya hubo demasiados códigos recientes, borrar los viejos y frenar
  const recent = await db.loginCode.count({
    where: { userId, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } },
  })
  if (recent >= MAX_CODES_PER_WINDOW) {
    throw new Error('TOO_MANY_CODES')
  }

  await db.loginCode.create({
    data: { userId, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  })

  return code
}

/**
 * Verifica el código del usuario. true si es válido; en otro caso incrementa
 * intentos y devuelve false. Los códigos expirados se limpian al pasar.
 */
export async function verifyLoginCode(userId: string, code: string): Promise<boolean> {
  const clean = String(code || '').replace(/\D/g, '')
  if (clean.length !== 6) return false

  const record = await db.loginCode.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return false
  if (record.attempts >= MAX_ATTEMPTS) return false

  const valid = await bcrypt.compare(clean, record.codeHash)
  if (!valid) {
    await db.loginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return false
  }

  // Un solo uso: marcar usado y limpiar códigos viejos del usuario
  await db.loginCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })
  db.loginCode.deleteMany({
    where: { userId, usedAt: { not: null } },
  }).catch(() => {})

  return true
}

/** ¿Cuántos intentos le quedan al código más reciente? (para mostrar en la UI) */
export async function remainingAttempts(userId: string): Promise<number> {
  const record = await db.loginCode.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return 0
  return Math.max(0, MAX_ATTEMPTS - record.attempts)
}

/** Oculta el email para la UI: frank**@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return email
  const visible = user.slice(0, Math.min(2, user.length))
  return `${visible}${'*'.repeat(Math.max(2, user.length - 2))}@${domain}`
}
