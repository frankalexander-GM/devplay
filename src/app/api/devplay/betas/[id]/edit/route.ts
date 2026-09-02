import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  const guestId = req.cookies.get('devplay-guest-id')?.value
  if (guestId) {
    const guest = await db.user.findUnique({ where: { id: guestId } })
    if (guest && !guest.isGuest) return guest.id
  }
  return null
}

const editSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(2000).optional(),
  downloadType: z.enum(['DIRECT', 'LINK']).optional(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  betaStatus: z.enum(['alpha', 'closed_beta', 'open_beta', 'tech_test', 'early_access', 'ended', 'coming_soon']).optional(),
  genre: z.string().optional().nullable(),
  version: z.string().optional().nullable(),
  platforms: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  requirements: z.string().optional().nullable(),
  changelog: z.string().optional().nullable(),
  installInstructions: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  screenshots: z.array(z.string()).max(10).optional(),
  externalPlatform: z.string().optional().nullable(),
  // Post fields
  content: z.string().max(2000).optional().nullable(),
})

/**
 * PATCH /api/devplay/betas/[id]/edit
 * Edita una beta existente. Solo el autor del post puede editarla.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = editSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const data = parsed.data

  // Find the post and verify ownership
  const post = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, type: true },
  })
  if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
  if (post.type !== 'BETA') return NextResponse.json({ error: 'No es una beta' }, { status: 400 })
  if (post.authorId !== userId) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  // Update the beta
  const betaUpdate: any = {}
  if (data.title !== undefined) betaUpdate.title = data.title
  if (data.description !== undefined) betaUpdate.description = data.description
  if (data.downloadType !== undefined) betaUpdate.downloadType = data.downloadType
  if (data.fileUrl !== undefined) betaUpdate.fileUrl = data.fileUrl
  if (data.fileName !== undefined) betaUpdate.fileName = data.fileName
  if (data.fileSize !== undefined) betaUpdate.fileSize = data.fileSize
  if (data.externalUrl !== undefined) betaUpdate.externalUrl = data.externalUrl
  if (data.betaStatus !== undefined) betaUpdate.betaStatus = data.betaStatus
  if (data.genre !== undefined) betaUpdate.genre = data.genre
  if (data.version !== undefined) betaUpdate.version = data.version
  if (data.platforms !== undefined) betaUpdate.platforms = JSON.stringify(data.platforms)
  if (data.tags !== undefined) betaUpdate.tags = JSON.stringify(data.tags)
  if (data.requirements !== undefined) betaUpdate.requirements = data.requirements
  if (data.changelog !== undefined) betaUpdate.changelog = data.changelog
  if (data.installInstructions !== undefined) betaUpdate.installInstructions = data.installInstructions
  if (data.coverImage !== undefined) betaUpdate.coverImage = data.coverImage
  if (data.screenshots !== undefined) betaUpdate.screenshots = JSON.stringify(data.screenshots)
  if (data.externalPlatform !== undefined) betaUpdate.externalPlatform = data.externalPlatform

  // Update post content if provided
  const postUpdate: any = {}
  if (data.content !== undefined) postUpdate.content = data.content

  // Execute updates
  await db.$transaction([
    db.post.update({ where: { id }, data: postUpdate }),
    db.beta.update({ where: { postId: id }, data: betaUpdate }),
  ])

  // Create a notification about the update
  await db.notification.create({
    data: {
      userId,
      fromUserId: userId,
      type: 'LIKE',
      message: 'Tu beta ha sido actualizada correctamente',
      entityId: id,
    },
  }).catch(() => {}) // silent fail

  return NextResponse.json({ ok: true })
}
