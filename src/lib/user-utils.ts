import { db } from '@/lib/db'

/**
 * Returns the current user based on session or guest token.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(
  sessionUser: { id?: string } | null | undefined,
  guestId?: string | null
) {
  if (sessionUser?.id) {
    return await db.user.findUnique({
      where: { id: sessionUser.id },
    })
  }
  if (guestId) {
    return await db.user.findUnique({
      where: { id: guestId },
    })
  }
  return null
}

export function parseMediaUrls(mediaUrls: string | null | undefined): { url: string; kind: 'image' | 'video' }[] {
  if (!mediaUrls) return []
  try {
    return JSON.parse(mediaUrls)
  } catch {
    return []
  }
}

export function serializeMediaUrls(media: { url: string; kind: 'image' | 'video' }[]): string {
  return JSON.stringify(media)
}

/**
 * Normaliza un objeto Beta de Prisma para el cliente:
 * - Convierte platforms, tags, screenshots de JSON string a array
 */
export function normalizeBeta(beta: any) {
  if (!beta) return null
  return {
    id: beta.id,
    title: beta.title,
    description: beta.description,
    downloadType: beta.downloadType,
    fileUrl: beta.fileUrl,
    fileSize: beta.fileSize,
    fileName: beta.fileName,
    externalUrl: beta.externalUrl,
    downloads: beta.downloads,
    betaStatus: beta.betaStatus ?? 'open_beta',
    genre: beta.genre ?? null,
    version: beta.version ?? null,
    platforms: beta.platforms ? safeParseArray(beta.platforms) : null,
    tags: beta.tags ? safeParseArray(beta.tags) : null,
    requirements: beta.requirements ?? null,
    changelog: beta.changelog ?? null,
    installInstructions: beta.installInstructions ?? null,
    coverImage: beta.coverImage ?? null,
    screenshots: beta.screenshots ? safeParseArray(beta.screenshots) : null,
    externalPlatform: beta.externalPlatform ?? null,
  }
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/**
 * Normaliza un Poll de Prisma para el cliente.
 * Calcula totalVotes y porcentajes. userVotedOptionIds debe pasarse desde el caller
 * (suele venir de una consulta filtrada por userId).
 */
export function normalizePoll(poll: any, userVotedOptionIds: string[] = []) {
  if (!poll) return null
  const options = (poll.options ?? []).slice().sort((a: any, b: any) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  )
  const totalVotes = options.reduce(
    (sum: number, o: any) => sum + (o.voteCount ?? 0),
    0
  )
  return {
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    closesAt: poll.closesAt ? new Date(poll.closesAt).toISOString() : null,
    totalVotes,
    userVotedOptionIds,
    options: options.map((o: any) => ({
      id: o.id,
      text: o.text,
      voteCount: o.voteCount ?? 0,
      percentage:
        totalVotes > 0
          ? Math.round(((o.voteCount ?? 0) / totalVotes) * 100)
          : 0,
    })),
  }
}

/**
 * Normaliza un objeto User de Prisma: convierte tags y socialLinks (JSON string) a objetos.
 */
export function normalizeUserTags(user: any) {
  if (!user) return null
  return {
    ...user,
    tags: user.tags ? safeParseArray(user.tags) : null,
    socialLinks: user.socialLinks ? safeParseObject(user.socialLinks) : null,
  }
}

function safeParseObject(s: string): any {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
