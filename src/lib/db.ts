import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaWALInitialized: boolean | undefined
}

async function configureSQLite(client: PrismaClient) {
  try {
    // Usar $queryRaw para todos los PRAGMA (SQLite devuelve valores)
    await client.$queryRaw`PRAGMA journal_mode = WAL;`
    await client.$queryRaw`PRAGMA busy_timeout = 5000;`
    await client.$queryRaw`PRAGMA synchronous = NORMAL;`
    await client.$queryRaw`PRAGMA cache_size = -64000;`
    await client.$queryRaw`PRAGMA foreign_keys = ON;`
    console.log('[db] SQLite WAL mode + optimizaciones activadas')
  } catch (e) {
    console.error('[db] Error configurando SQLite:', e)
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  // Si usamos SQLite, habilitar WAL mode para mejor concurrencia
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    if (!globalForPrisma.prismaWALInitialized) {
      globalForPrisma.prismaWALInitialized = true
      configureSQLite(client)
    }
  }

  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
