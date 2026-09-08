# 🚀 Guía de Despliegue en Coolify

Esta guía explica cómo desplegar DevPlay en Coolify paso a paso.
**El dominio/DNS lo configuras tú en Coolify** — aquí solo va lo técnico.

## 📋 Requisitos Previos

1. **Coolify instalado** en tu servidor (VPS o propio)
   - Documentación: https://coolify.io/docs/installation
2. **Repositorio en GitHub**: https://github.com/frankalexander-GM/devplay
3. **Servidor con mínimo 1GB RAM** (recomendado 2GB)
4. **Supabase** (base de datos Postgres ya creada — la misma del desarrollo)

## 🔧 Pasos de Despliegue

### Paso 1: Conectar tu repo a Coolify

1. Entra a tu panel de Coolify (ej: `http://tu-servidor:8000`)
2. Ve a **Projects** → **New Project** → nómbralo `DevPlay`
3. **Add New Resource** → **Docker Compose** (recomendado) o **GitHub Repository**
4. Selecciona el repo `frankalexander-GM/devplay`, branch `main`
5. Si es Docker Compose, Coolify detecta el `docker-compose.yml` de la raíz
   (levanta **web** en :3000 y **realtime** en :3003)

### Paso 2: Variables de Entorno (OBLIGATORIAS)

En la sección **Environment Variables** del servicio:

```env
# Base de datos (Supabase — pooler, puerto 6543)
DATABASE_URL=postgresql://postgres.<proyecto>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10

# NextAuth (OBLIGATORIO — genera uno nuevo con openssl rand -base64 32)
NEXTAUTH_SECRET=tu-secreto-super-largo-y-seguro
NEXTAUTH_URL=https://tu-dominio.com

# 🔐 Secreto compartido con el realtime-service (MISMO valor en ambos)
REALTIME_SECRET=otro-secreto-super-largo-y-seguro

# Correo (registro/recuperación — sin esto el registro no manda códigos)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=devplay.online@gmail.com
SMTP_PASS=tu-app-password
MAIL_FROM=DevPlay <devplay.online@gmail.com>
```

Opcionales:

```env
# URL pública del realtime si lo expones aparte (ej. wss vía dominio propio).
# Si el compose maneja todo, NO la necesitas en el navegador porque el
# socket sale al mismo origen con el puerto 3003 abierto.
NEXT_PUBLIC_REALTIME_URL=https://realtime.tu-dominio.com

# En el compose ya va por defecto (web → realtime por la red interna):
# REALTIME_INTERNAL_URL=http://realtime:3004
```

#### ⚠️ NEXTAUTH_URL
Debe ser la URL pública de tu app en Coolify, NO `localhost`.
Ej: `https://devplay.tu-dominio.com`

#### 🔐 REALTIME_SECRET y el chat en tiempo real
El chat mundial está autenticado con tokens firmados:
1. El backend firma con `REALTIME_SECRET` (o `NEXTAUTH_SECRET` si falta)
2. El realtime-service verifica con el **MISMO** secreto
3. Si difieren → el chat queda en "conectando..." y nunca conecta

### Paso 3: Dominio (lo haces tú en Coolify 😎)

1. En **Domains**, agrega tu dominio (ej: `devplay.tu-dominio.com`)
2. Coolify configura SSL (Let's Encrypt) automáticamente
3. Actualiza `NEXTAUTH_URL` con ese dominio
4. Para el **chat en vivo**: abre/expón también el **puerto 3003** del
   servicio realtime (en Coolify: Ports Exposes → `3000,3003` en compose,
   o un dominio dedicado para el realtime si prefieres `NEXT_PUBLIC_REALTIME_URL`)

### Paso 4: Deploy

1. Click **Deploy**
2. Espera 3-5 minutos (el primer build tarda más)
3. Cuando termine → estado **Running** → abre tu URL

## 🗄️ Base de Datos

DevPlay usa **Supabase (PostgreSQL externo)** — no hay contenedor de DB.
- La `DATABASE_URL` es la del **pooler** (puerto 6543, pgbouncer)
- El esquema NO se aplica en cada arranque (nada de `db push --accept-data-loss`
  en el boot del container). Si cambias `prisma/schema.prisma`, aplica el
  cambio a mano en Supabase (SQL Editor) antes de desplegar.

## 🔌 Chat en Tiempo Real

- **Con Docker Compose**: el `docker-compose.yml` de la raíz ya incluye los
  dos servicios y la comunicación interna (`REALTIME_INTERNAL_URL`).
- **Como servicio separado en Coolify**: usa el Dockerfile de
  `mini-services/realtime-service` con contexto de build = **raíz del repo**
  (necesita `src/lib/profanity.ts` y `prisma/schema.prisma`).
- Variables del realtime: `DATABASE_URL`, `REALTIME_SECRET` (idéntica),
  `REALTIME_INTERNAL_HOST=0.0.0.0` (solo dentro de Docker).

## 🔍 Verificación

1. **Healthcheck**: `https://tu-dominio.com/api/health` → `{"ok":true,"db":"up",...}`
2. **Login/registro**: crea una cuenta de prueba (llega código al correo)
3. **Chat mundial**: entra y envía un mensaje (debe aparecer al instante)
4. **DMs**: perfil de otro dev → botón **Mensaje** → envía uno

## ❌ Problemas Comunes

### "Database connection error"
- Revisa `DATABASE_URL` (pooler 6543 + `?pgbouncer=true`)

### "El chat no conecta"
- `REALTIME_SECRET` IDÉNTICA en backend y realtime
- El chat exige sesión iniciada: los invitados no conectan al socket
- ¿Puerto 3003 accesible desde el navegador? (o `NEXT_PUBLIC_REALTIME_URL` bien puesta)

### "No llegan correos"
- `SMTP_USER/SMTP_PASS/MAIL_FROM` correctos (app password de Gmail)

### "Build falla"
- Mínimo 1GB RAM; el Dockerfile hace build standalone con Bun

## 📊 Recursos Recomendados

| Usuarios | RAM | CPU | Almacenamiento |
|----------|-----|-----|----------------|
| <50 | 1GB | 1 vCPU | 5GB |
| 50-500 | 2GB | 2 vCPU | 20GB |
| 500+ | 4GB | 4 vCPU | 50GB+ |

## 🔄 Actualizaciones

1. `git push` a `main`
2. En Coolify → **Deploy** (o auto-deploy activado)

## 💡 Tips

- **Auto-deploy**: cada push a `main` puede desplegar solo
- **Monitoring**: healthcheck integrado en `/api/health`
- **Logs**: Coolify los muestra en tiempo real
- 🔐 **Seguridad**: rota la contraseña de Supabase y las claves que hayan
  quedado expuestas en chats/capturas antes de producción
