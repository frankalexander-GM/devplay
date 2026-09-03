import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

/**
 * GET /api/devplay/store/my-items
 * Devuelve los artículos comprados por el usuario actual.
 */
export async function GET(req: NextRequest) {
  const userId = await getViewerId(req)
  if (!userId) {
    return NextResponse.json({ items: [] })
  }

  const purchases = await db.storePurchase.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    items: purchases.map((p) => ({
      id: p.id,
      userId: p.userId,
      itemId: p.itemId,
      pricePaid: p.pricePaid,
      createdAt: p.createdAt.toISOString(),
      item: {
        id: p.item.id,
        name: p.item.name,
        description: p.item.description,
        price: p.item.price,
        category: p.item.category,
        icon: p.item.icon,
        imageUrl: p.item.imageUrl,
        effect: p.item.effect,
        duration: p.item.duration,
        createdAt: p.item.createdAt.toISOString(),
      },
    })),
  })
}
