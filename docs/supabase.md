# 🐘 Conectar DevPlay a Supabase — Guía paso a paso

> Tiempo estimado: **15 minutos**. No hace falta borrar nada: tu SQLite local
> sigue funcionando para desarrollar, y Supabase queda como base de producción.

## ¿Por qué Supabase?

DevPlay hoy usa **SQLite** (un archivo). Va genial para desarrollar y aguanta
cientos de usuarios activos, pero para **1.000+ personas en simultáneo** lo
correcto es una base PostgreSQL en la nube. Supabase da:

- PostgreSQL administrado (backups, métricas, escalado)
- Pool de conexiones PgBouncer integrado (clave para muchas conexiones)
- Plan gratuito generoso para empezar
- SMTP integrado para los correos (opcional)

---

## Paso 1 · Crear el proyecto

1. Entra a <https://supabase.com> → **New project**
2. Nombre: `devplay` · Contraseña de la DB: guárdala bien (la vamos a usar)
3. Región: la más cercana a tu comunidad (ej. `East US` o `São Paulo`)

## Paso 2 · Copiar la cadena de conexión

En el panel: **Project Settings → Database → Connection string → URI**.

Usa la pestaña **Pooler** (puerto `6543`) para la app y la **Direct** (puerto
`5432`) solo si vas a correr migraciones. En tu `.env`:

```env
DATABASE_URL="postgresql://postgres.TU_REF:TU_PASS@aws-0-TU_REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
```

> ⚠️ Reemplaza `[YOUR-PASSWORD]` por tu contraseña (sin corchetes) y fija
> `connection_limit` bajo (10) — el pooler se encarga del resto.

## Paso 3 · Cambiar el schema y crear tablas

```bash
bash scripts/use-supabase.sh     # activa prisma/schema.supabase.prisma
bunx prisma db push              # crea todas las tablas en Supabase
```

> Para volver a SQLite local: `bash scripts/use-sqlite.sh`

## Paso 4 (opcional) · Llevar tus datos actuales

Si ya tienes usuarios/publicaciones en el SQLite local y quieres conservarlos:

```bash
bun scripts/migrate-to-supabase.mjs
```

Copia todas las tablas respetando IDs y relaciones. Si una tabla ya existe con
datos en Supabase, se salta (nada se duplica).

## Paso 5 · Reiniciar servicios

```bash
# App Next (puerto 3000) y realtime (puerto 3003) leen DATABASE_URL del .env
# Reinicia ambos para conectarse a Supabase
```

Listo 🎉 — la web ya lee y escribe en Supabase.

---

## Correos con Supabase (opcional)

Supabase trae SMTP integrado: **Project Settings → Auth → SMTP Settings**.
Actívalo y pon las credenciales en tu `.env`:

```env
SMTP_HOST=...
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="DevPlay <no-reply@tudominio.com>"
```

También funcionan Gmail (con contraseña de aplicación), Outlook, Zoho o
Resend. Con esto **recuperación de contraseña, códigos de seguridad y
bienvenida** salen de verdad al correo (ver `src/lib/mailer.ts`).

## ¿Y 1.000 personas a la vez?

| Pieza | Estado con Supabase |
|---|---|
| Base de datos | ✅ PostgreSQL + pooler aguanta miles de conexiones |
| App Next.js | ✅ 1 instancia sirve miles de páginas por segundo |
| Chat en tiempo real (Socket.io) | ✅ 1 nodo maneja ~1k–5k sockets conectados |
| Uploads de imágenes | ⚠️ recomendado: Supabase Storage o Cloudinary a futuro |

Para crecer MÁS allá de ~5k conectados simultáneos, el siguiente paso sería
`@socket.io/redis-adapter` con varias instancias — con 1k estás sobrado con
una sola instancia.
