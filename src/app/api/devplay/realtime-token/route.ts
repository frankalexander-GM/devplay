/**
 * GET /api/devplay/realtime-token
 * Token firmado (HMAC-SHA256) pa' autenticar la conexión Socket.io contra el
 * mini-servicio de tiempo real 🔐.
 *
 * ¿Por qué? Antes el cliente mandaba su userId por el socket y el server lo
 * creía ciegamente — cualquiera podía hacerse pasar por otro usuario en el
 * chat mundial. Ahora el token lo firma el backend con un secreto compartido
 * (REALTIME_SECRET) y el realtime lo verifica en el handshake. Sin sesión no
 * hay token, y sin token no hay socket.
 *
 * Formato: <expMs>.<base64url(payload)>.<hmac>
 * payload: { uid, un } (userId, username) — expira en 30 minutos (el cliente
 * lo renueva automáticamente en cada reconexión).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createHmac } from 'crypto'

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutos

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Los invitados no participan del chat en tiempo real (son read-only)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, isGuest: true },
  })
  if (!user || user.isGuest) {
    return NextResponse.json({ error: 'No disponible para invitados' }, { status: 403 })
  }

  const secret = process.env.REALTIME_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    console.error('[realtime-token] FALTA REALTIME_SECRET/NEXTAUTH_SECRET')
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }

  const exp = Date.now() + TOKEN_TTL_MS
  const payload = b64url(JSON.stringify({ uid: user.id, un: user.username, exp }))
  const sig = createHmac('sha256', secret).update(`${exp}.${payload}`).digest('base64url')

  return NextResponse.json(
    { token: `${exp}.${payload}.${sig}`, expiresIn: TOKEN_TTL_MS },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
