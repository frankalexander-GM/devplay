#!/bin/bash
# ============================================
# DevPlay - Script para subir a GitHub
# ============================================
# Ejecuta este script en tu computadora para subir
# el proyecto a tu repositorio de GitHub.
#
# ANTES DE EJECUTARLO:
# 1. Descarga devplay.zip desde el sandbox
# 2. Descomprímelo: unzip devplay.zip
# 3. Entra a la carpeta: cd devplay
# 4. Ejecuta este script: ./push-to-github.sh
#
# NECESITAS:
# - Git instalado (https://git-scm.com)
# - Una cuenta de GitHub
# - Un Personal Access Token (https://github.com/settings/tokens/new)
#   con permiso "repo"
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 DevPlay - Subir a GitHub"
echo "=========================="
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ] || [ ! -f "README.md" ]; then
  echo -e "${RED}❌ Error: Ejecuta este script dentro de la carpeta devplay/${NC}"
  echo "   Asegúrate de ver package.json y README.md en esta carpeta."
  exit 1
fi

# Verificar que git está instalado
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git no está instalado${NC}"
  echo "   Descárgalo de: https://git-scm.com/downloads"
  exit 1
fi
echo -e "${GREEN}✅ Git detectado: $(git --version)${NC}"

# Configurar git si no está configurado
if [ -z "$(git config user.name)" ]; then
  echo ""
  echo "⚙️  Configurando Git..."
  read -p "   Tu nombre: " gitname
  read -p "   Tu email: " gitemail
  git config --global user.name "$gitname"
  git config --global user.email "$gitemail"
  echo -e "${GREEN}✅ Git configurado${NC}"
fi

# Inicializar repo si no existe
if [ ! -d ".git" ]; then
  echo ""
  echo "📦 Inicializando repositorio Git..."
  git init
  git branch -M main
fi

# Preguntar por el token
echo ""
echo "🔐 Necesitas un Personal Access Token de GitHub"
echo "   Si no tienes uno, créalo en:"
echo "   https://github.com/settings/tokens/new"
echo "   - Marca la casilla 'repo'"
echo "   - Click 'Generate token'"
echo "   - Copia el token (empieza con ghp_)"
echo ""
read -s -p "   Pega tu token aquí (no se mostrará): " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ No ingresaste un token${NC}"
  exit 1
fi

# URL del repo
REPO_URL="https://frankalexander-GM:${TOKEN}@github.com/frankalexander-GM/devplay.git"

# Agregar archivos
echo ""
echo "📦 Agregando archivos..."
git add -A
echo -e "${GREEN}✅ $(git diff --cached --numstat | wc -l) archivos listos${NC}"

# Commit
echo ""
echo "💾 Creando commit..."
git commit -m "DevPlay - Red Social para Desarrolladores de Videojuegos Indie

- Next.js 16 + TypeScript + Prisma + SQLite/PostgreSQL
- 76 componentes React, 38 rutas de API
- Auth con NextAuth + Google OAuth + recuperar contraseña
- Posts, Betas, Videos, Encuestas, Chat en tiempo real
- Sistema de bloqueo, seguridad, 7 temas de color
- Proyecto Spring Boot incluido para sprint SENA
- Base de datos optimizada con WAL mode"

# Agregar remote
echo ""
echo "🔗 Configurando remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Push (--force: reemplaza el historial viejo del repo por este commit limpio)
echo ""
echo "🚀 Subiendo a GitHub..."
echo "   (Esto puede tardar unos minutos...)"
if git push --force -u origin main 2>&1; then
  echo ""
  echo "=============================="
  echo -e "${GREEN}✅ ¡ÉXITO! Proyecto subido a GitHub${NC}"
  echo "=============================="
  echo ""
  echo "📁 Tu repo está en:"
  echo "   https://github.com/frankalexander-GM/devplay"
  echo ""
  echo "¡Ya puedes clonarlo desde cualquier computadora!"
  echo ""
  echo "Para clonar en otra PC:"
  echo "  git clone https://github.com/frankalexander-GM/devplay.git"
  echo ""
  echo "ℹ️  Nota: se usó --force, así que el historial anterior"
  echo "   del repo fue reemplazado por este commit limpio."
else
  echo ""
  echo -e "${RED}❌ Error al subir${NC}"
  echo "   Posibles causas:"
  echo "   - Token inválido o expirado"
  echo "   - El repo no existe (créalo en https://github.com/new)"
  echo "   - No tienes permisos"
fi

# Limpiar token del remote por seguridad
git remote set-url origin https://github.com/frankalexander-GM/devplay.git
echo ""
echo -e "${GREEN}🔒 Token eliminado del remote por seguridad${NC}"
