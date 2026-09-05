import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
const MAX_SIZE_MEDIA = 25 * 1024 * 1024 // 25MB para media
const MAX_SIZE_BETA = 100 * 1024 * 1024 // 100MB para archivos de beta

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/octet-stream': 'bin',
}

function sanitizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-60) || 'archivo'
}

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

/**
 * POST /api/devplay/upload
 * FormData: file (File), kind ('media' | 'beta' | 'avatar')
 * Guarda el archivo en public/uploads/<carpeta>/ y devuelve la URL pública.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 })
  }

  const file = formData.get('file')
  const kindRaw = formData.get('kind')
  const kind = kindRaw === 'beta' || kindRaw === 'avatar' ? kindRaw : 'media'

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Archivo vacío o no válido' }, { status: 400 })
  }

  const isImage = ALLOWED_IMAGE.includes(file.type)
  const isVideo = ALLOWED_VIDEO.includes(file.type)
  const isZip = file.type === 'application/zip' || file.type === 'application/x-zip-compressed'

  if (kind === 'avatar' && !isImage) {
    return NextResponse.json({ error: 'El avatar debe ser una imagen (JPG, PNG, GIF, WebP)' }, { status: 400 })
  }
  if (kind === 'media' && !isImage && !isVideo) {
    return NextResponse.json({ error: 'Solo se permiten imágenes o videos' }, { status: 400 })
  }
  if (kind === 'beta' && !isImage && !isVideo && !isZip && file.type !== 'application/octet-stream') {
    return NextResponse.json({ error: 'Formato de archivo no permitido para la beta' }, { status: 400 })
  }

  const maxSize = kind === 'beta' ? MAX_SIZE_BETA : MAX_SIZE_MEDIA
  if (file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024))
    return NextResponse.json({ error: `El archivo supera el máximo de ${mb}MB` }, { status: 400 })
  }

  const folder = kind === 'avatar' ? 'avatars' : kind === 'beta' ? 'betas' : 'media'
  const ext = EXT_BY_MIME[file.type] ?? (file.name.match(/\.(\w{2,4})$/)?.[1]?.toLowerCase() ?? 'bin')
  const base = sanitizeName(file.name.replace(/\.[^.]+$/, '')) || 'archivo'
  const fileName = `${Date.now()}-${randomBytes(4).toString('hex')}-${base}.${ext}`

  const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
  const filePath = join(uploadDir, fileName)

  try {
    await mkdir(uploadDir, { recursive: true })
    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, bytes)
  } catch (e) {
    console.error('[upload] Error guardando archivo:', e)
    return NextResponse.json({ error: 'No se pudo guardar el archivo' }, { status: 500 })
  }

  const url = `/uploads/${folder}/${fileName}`

  return NextResponse.json({
    url,
    fileName,
    originalName: file.name,
    size: file.size,
    path: filePath,
    kind,
  })
}
