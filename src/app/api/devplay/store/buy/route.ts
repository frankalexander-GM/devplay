import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimitByKey, tooMany } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

/**
 * POST /api/devplay/store/buy
 * Body: { itemId: string }
 * Compra un artículo con DevCoins.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getViewerId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión para comprar' }, { status: 401 })
    }

    // Anti-abuso 🛡️: máx. 10 compras por usuario cada minuto (evita doble-click/flood)
    const rl = rateLimitByKey(`buy:${userId}`, 10, 60_000)
    if (!rl.ok) return tooMany(rl.retryAfter, 'Demasiadas compras seguidas. Espera un momentico plis 🙏')

    const body = await req.json().catch(() => ({} as any))
    const itemId = body?.itemId
    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'Falta el parámetro itemId' }, { status: 400 })
    }

    // Cargar artículo + usuario + compra existente en paralelo
    const [item, user, existingPurchase] = await Promise.all([
      db.storeItem.findUnique({ where: { id: itemId } }),
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, devCoins: true, isGuest: true, username: true },
      }),
      db.storePurchase.findUnique({
        where: { userId_itemId: { userId, itemId } },
      }),
    ])

    if (!item) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    if (user.isGuest) {
      return NextResponse.json(
        { error: 'Los invitados no pueden comprar. Crea una cuenta para continuar.' },
        { status: 403 }
      )
    }
    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Ya posees este artículo' },
        { status: 400 }
      )
    }
    if (user.devCoins < item.price) {
      return NextResponse.json(
        { error: `Necesitas ${item.price - user.devCoins} DevCoins más para comprar este artículo` },
        { status: 400 }
      )
    }

    // Transacción: descontar monedas, crear compra, registrar transacción
    const [updatedUser, purchase, transaction] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { devCoins: { decrement: item.price } },
        select: { id: true, devCoins: true },
      }),
      db.storePurchase.create({
        data: {
          userId,
          itemId,
          pricePaid: item.price,
        },
        include: { item: true },
      }),
      db.devCoinTransaction.create({
        data: {
          userId,
          amount: -item.price,
          type: 'purchase',
          description: `Compra: ${item.name}`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      purchase,
      transaction,
      balance: updatedUser.devCoins,
    })
  } catch (err: any) {
    console.error('[store/buy] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error interno al procesar la compra' },
      { status: 500 }
    )
  }
}
