/** Verifica que el último mensaje del chat mundial esté en Supabase. Uso: bun scripts/check-chat.mjs [texto] */
import pg from 'pg'
const cs = 'postgresql://postgres.uizpoczewriaxbpsjena:frankalexander2025%40hhpp@aws-0-us-east-2.pooler.supabase.com:6543/postgres'
const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
await c.connect()
const q = process.argv[2]
  ? await c.query(`SELECT cm."username", cm.content, cm."createdAt" FROM "ChatMessage" cm WHERE cm.content LIKE $1 ORDER BY cm."createdAt" DESC LIMIT 5`, [`%${process.argv[2]}%`])
  : await c.query(`SELECT "username", content, "createdAt" FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT 5`)
console.table(q.rows.map(r => ({ ...r, createdAt: new Date(r.createdAt).toISOString().slice(11, 19) })))
await c.end()
