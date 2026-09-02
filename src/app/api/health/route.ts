import { NextResponse } from 'next/server'

// GET /api/health
// Endpoint simple para healthchecks de Coolify/Docker
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'devplay',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
