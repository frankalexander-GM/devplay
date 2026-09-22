/**
 * Firma y verificación de tokens realtime (HMAC-SHA256) 🔐
 *
 * Formato: <expMs>.<base64url(payload)>.<hmac>
 *   payload: { uid, un } (userId, username)
 *
 * Logica 100% pura y determinista → escribe tests aquí sin tocar red ni BD.
 */

import { createHmac } from 'crypto'

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutos

export function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url')
}

export interface RealtimeTokenPayload {
  uid: string
  un: string
  exp: number
}

/** Firma un token firmado con HMAC-SHA256 y secreto compartido. */
export function signRealtimeToken(
  secret: string,
  uid: string,
  un: string,
  now = Date.now(),
): { token: string; expiresAt: number } {
  const exp = now + TOKEN_TTL_MS
  const payload = b64url(JSON.stringify({ uid, un, exp }))
  const sig = createHmac('sha256', secret)
    .update(`${exp}.${payload}`)
    .digest('base64url')
  return { token: `${exp}.${payload}.${sig}`, expiresAt: exp }
}

/** Verifica un token: formato, HMAC válido y no expirado. Devuelve el payload o null. */
export function verifyRealtimeToken(
  secret: string,
  token: string,
  now = Date.now(),
): RealtimeTokenPayload | null {
  const [expStr, payload, sig] = token.split('.')
  if (!expStr || !payload || !sig) return null

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp <= now) return null

  const expected = createHmac('sha256', secret)
    .update(`${exp}.${payload}`)
    .digest('base64url')

  // Comparación de longitud constante (evita timing attacks)
  if (expected.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  if (diff !== 0) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as RealtimeTokenPayload
    if (!data.uid || !data.un) return null
    return data
  } catch {
    return null
  }
}
