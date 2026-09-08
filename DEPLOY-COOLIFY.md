# 🚀 Guía de Despliegue en Coolify

Esta guía te explica cómo desplegar DevPlay en Coolify paso a paso.

## 📋 Requisitos Previos

1. **Coolify instalado** en tu servidor (VPS o propio)
   - Documentación: https://coolify.io/docs/installation
2. **Repositorio en GitHub**: https://github.com/frankalexander-GM/devplay
3. **Servidor con mínimo 1GB RAM** (recomendado 2GB)

## 🔧 Pasos de Despliegue

### Paso 1: Conectar tu repo a Coolify

1. Entra a tu panel de Coolify (ej: `http://tu-servidor:8000`)
2. Ve a **Projects** → **New Project**
3. Nombra el proyecto: `DevPlay`
4. Click **Add New Resource** → **GitHub Repository**
5. Conecta tu cuenta de GitHub si no lo has hecho
6. Selecciona el repo: `frankalexander-GM/devplay`
7. Selecciona la branch: `main`

### Paso 2: Configurar el Build

Coolify detectará automáticamente el `Dockerfile` o `nixpacks.toml`.

**Configuración recomendada:**
- **Build Pack**: Dockerfile (recomendado) o Nixpacks
- **Port**: `3000`
- **Base Directory**: `/` (raíz)

### Paso 3: Configurar Variables de Entorno

En la sección **Environment Variables**, agrega:

```env
# Base de datos
DATABASE_URL=file:/app/db/custom.db

# NextAuth (OBLIGATORIO — genera uno nuevo, nunca uses el de ejemplo)
NEXTAUTH_SECRET=tu-secreto-super-largo-y-seguro
NEXTAUTH_URL=https://tu-dominio.com

# 🔐 Secreto compartido con el realtime-service (OBLIGATORIO desde el blindaje)
# Si no coincide con el del servicio realtime, el chat mundial NO funcionará.
REALTIME_SECRET=otro-secreto-super-largo-y-seguro

# Correo (registro/recuperación — sin esto el registro no manda códigos)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=devplay.online@gmail.com
SMTP_PASS=tu-app-password
MAIL_FROM=DevPlay <devplay.online@gmail.com>
```

#### ⚠️ Importante sobre NEXTAUTH_URL
Debe ser la URL pública de tu app en Coolify, NO `localhost`.
Ej: `https://devplay.tu-dominio.com`

#### 🔑 Generar NEXTAUTH_SECRET
Ejecuta en tu terminal:
```bash
openssl rand -base64 32
```
Pega el resultado como valor de `NEXTAUTH_SECRET`.

#### 🔐 REALTIME_SECRET y el chat en tiempo real
El blindaje (tarea 33) dejó el chat mundial autenticado con tokens firmados:
1. El backend firma con `REALTIME_SECRET` (o `NEXTAUTH_SECRET` si falta)
2. El realtime-service verifica con el MISMO secreto
3. Si difieren → el chat da "conectando..." y nunca conecta
Si el realtime corre como otro servicio en Coolify, ponle la MISMA `REALTIME_SECRET` en sus variables.

### Paso 4: Configurar Dominio (opcional)

1. En **Domains**, agrega tu dominio: `devplay.tu-dominio.com`
2. Coolify configurará automáticamente el SSL (Let's Encrypt)
3. Actualiza `NEXTAUTH_URL` con este dominio

### Paso 5: Deploy

1. Click **Deploy**
2. Espera 3-5 minutos (primer build tarda más)
3. Cuando termine, verás el estado **Running**
4. Click en la URL para abrir tu app

## 🗄️ Base de Datos

### Opción A: SQLite (por defecto, más simple)
- Ya viene configurada
- Se guarda en un volume de Docker
- Adecuada para <100 usuarios concurrentes

### Opción B: PostgreSQL (recomendado para producción)

1. En Coolify, ve a **Add New Resource** → **Database** → **PostgreSQL**
2. Crea una base de datos llamada `devplay`
3. Copia la **connection string** que te da Coolify
4. En las variables de entorno de DevPlay, cambia:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/devplay
   ```
5. Redeploy

## 🔌 Servicio de Chat en Tiempo Real

El chat usa Socket.io en un servicio separado (puerto 3003).

### Opción A: Docker Compose (recomendado)
El archivo `docker-compose.yml` ya incluye ambos servicios.

### Opción B: Servicio separado en Coolify
1. **Add New Resource** → **GitHub Repository** → `frankalexander-GM/devplay`
2. **Base Directory**: `mini-services/realtime-service`
3. **Port**: `3003`
4. **Environment Variables**:
   ```env
   PORT=3003
   DATABASE_URL=file:/app/db/custom.db
   ```

## 🔍 Verificación

Después del deploy, verifica que funciona:

1. **Healthcheck**: visita `https://tu-dominio.com/api/health`
   - Debe devolver: `{"status":"ok","service":"devplay",...}`

2. **Login**: intenta registrarte/iniciar sesión

3. **Chat**: abre el Chat Mundial y verifica que conecta

## ❌ Problemas Comunes

### "Database connection error"
- Verifica que `DATABASE_URL` sea correcta
- Si usas PostgreSQL, asegúrate de que la DB existe

### "El chat no conecta"
- Verifica que el servicio de realtime esté corriendo
- Si usas Caddy/nginx, asegúrate de que el puerto 3003 esté accesible
- **Desde el blindaje**: verifica que `REALTIME_SECRET` sea IDÉNTICA en el
  backend y en el realtime-service (si difiere, el handshake es rechazado)
- El chat exige sesión iniciada: los invitados ya no conectan al socket

### "Build falla"
- Verifica que el repo tenga el `Dockerfile`
- Aumenta la memoria del servidor si es necesario (mínimo 1GB)

## 📊 Recursos Recomendados

| Usuarios | RAM | CPU | Almacenamiento |
|----------|-----|-----|----------------|
| <50 | 1GB | 1 vCPU | 5GB |
| 50-500 | 2GB | 2 vCPU | 20GB |
| 500+ | 4GB | 4 vCPU | 50GB+ |

## 🔄 Actualizaciones

Para actualizar DevPlay después de cambios:

1. Sube los cambios a GitHub (`git push`)
2. En Coolify, ve a tu app
3. Click **Deploy** (o configura auto-deploy en Settings)

## 💡 Tips

- **Auto-deploy**: Activa "Auto Deploy" en Coolify para que cada push a `main` haga deploy automático
- **Backups**: Configura backups del volume `devplay-db` si usas SQLite
- **Monitoring**: Usa el healthcheck integrado en `/api/health`
- **Logs**: Coolify muestra logs en tiempo real en la sección "Logs"

---

¿Problemas? Revisa los logs en Coolify o consulta el README.md principal.
