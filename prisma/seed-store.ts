/**
 * Seed — Tienda de DevPlay
 * Inserta ~12 artículos: power-ups, avatar, premium, bundles.
 * Ejecutar con: `bun prisma/seed-store.ts`
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ITEMS = [
  // ===== Power-ups =====
  {
    name: 'Super Post Boost',
    description: 'Impulsa una publicación al top del feed durante 24h. Más visibilidad para tu contenido.',
    price: 50,
    category: 'powerup',
    icon: 'Rocket',
    effect: 'boost_post',
    duration: 1,
  },
  {
    name: 'Trending Boost',
    description: 'Coloca tu publicación en la sección Trending durante 3 días. Llega a miles de devs.',
    price: 100,
    category: 'powerup',
    icon: 'TrendingUp',
    effect: 'trending',
    duration: 3,
  },
  {
    name: 'Profile Spotlight',
    description: 'Destaca tu perfil en la página de Descubrir durante 7 días. Gana seguidores más rápido.',
    price: 75,
    category: 'powerup',
    icon: 'Sparkles',
    effect: 'spotlight',
    duration: 7,
  },

  // ===== Avatar =====
  {
    name: 'Golden Frame',
    description: 'Marco dorado exclusivo para tu avatar. Brilla con estilo premium permanente.',
    price: 150,
    category: 'avatar',
    icon: 'Crown',
    effect: 'frame_golden',
    duration: null,
  },
  {
    name: 'Neon Border',
    description: 'Borde neón animado para tu avatar. Personaliza el color a tu gusto.',
    price: 100,
    category: 'avatar',
    icon: 'Palette',
    effect: 'border_neon',
    duration: null,
  },
  {
    name: 'Animated Avatar',
    description: 'Avatar animado con efectos de partículas. Haz que tu perfil cobre vida.',
    price: 200,
    category: 'avatar',
    icon: 'Film',
    effect: 'avatar_animated',
    duration: null,
  },

  // ===== Premium =====
  {
    name: 'Verified Badge',
    description: 'Insignia de verificación azul junto a tu nombre. Demuestra que eres un dev real.',
    price: 500,
    category: 'premium',
    icon: 'BadgeCheck',
    effect: 'verified',
    duration: null,
  },
  {
    name: 'Analytics Access',
    description: 'Acceso a analíticas avanzadas: impresiones, alcance, retención y demografía de tu audiencia.',
    price: 300,
    category: 'premium',
    icon: 'BarChart3',
    effect: 'analytics',
    duration: 30,
  },
  {
    name: 'Custom Themes Pack',
    description: 'Desbloquea 8 temas personalizados para personalizar tu experiencia visual en DevPlay.',
    price: 250,
    category: 'premium',
    icon: 'SwatchBook',
    effect: 'themes',
    duration: null,
  },

  // ===== Bundles =====
  {
    name: 'Starter Pack',
    description: 'Todo lo que necesitas para empezar: Super Post Boost + Neon Border + Custom Themes Pack. Ahorra 50 DevCoins.',
    price: 300,
    category: 'bundle',
    icon: 'Package',
    effect: 'bundle_starter',
    duration: null,
  },
  {
    name: 'Pro Pack',
    description: 'Para devs serios: Verified Badge + Trending Boost + Profile Spotlight + Analytics Access. Ahorra 200 DevCoins.',
    price: 800,
    category: 'bundle',
    icon: 'Gem',
    effect: 'bundle_pro',
    duration: null,
  },
  {
    name: 'Ultimate Pack',
    description: 'El paquete definitivo: todos los power-ups, todos los items de avatar y todos los premium. Ahorra 400 DevCoins.',
    price: 1500,
    category: 'bundle',
    icon: 'Trophy',
    effect: 'bundle_ultimate',
    duration: null,
  },
]

async function main() {
  console.log('[seed-store] Limpiando artículos existentes...')
  await db.storeItem.deleteMany({})

  console.log(`[seed-store] Insertando ${ITEMS.length} artículos...`)
  for (const item of ITEMS) {
    await db.storeItem.create({ data: item })
    console.log(`  + ${item.name} (${item.category}, ${item.price} DC)`)
  }

  const total = await db.storeItem.count()
  console.log(`\n[seed-store] OK. Total de artículos en la tienda: ${total}`)
}

main()
  .catch((e) => {
    console.error('[seed-store] Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
