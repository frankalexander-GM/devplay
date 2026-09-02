import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

/**
 * GET /api/devplay/betas/[id]/download
 * - Increments download count
 * - Streams the file if DIRECT type
 * - 302 redirect if LINK type
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const beta = await db.beta.findUnique({ where: { postId: id } })

  if (!beta) return NextResponse.json({ error: 'Beta no encontrada' }, { status: 404 })

  // Redirect for external links
  if (beta.downloadType === 'LINK') {
    if (!beta.externalUrl) return NextResponse.json({ error: 'Sin enlace' }, { status: 400 })
    await db.beta.update({ where: { id: beta.id }, data: { downloads: { increment: 1 } } })
    return NextResponse.redirect(beta.externalUrl, 302)
  }

  // Direct file download
  if (!beta.fileUrl) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  // fileUrl stored as /api/devplay/betas/{postId}/download?file=NAME — extract file name
  const url = new URL(beta.fileUrl, req.url)
  const fileName = url.searchParams.get('file')
  if (!fileName) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })

  const filePath = path.join(process.cwd(), 'download', 'betas', fileName)
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  const stats = await stat(filePath)
  const buffer = await readFile(filePath)

  await db.beta.update({ where: { id: beta.id }, data: { downloads: { increment: 1 } } })

  const downloadName = beta.fileName || fileName
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(stats.size),
      'Content-Disposition': `attachment; filename="${downloadName}"`,
    },
  })
}
