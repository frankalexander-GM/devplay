#!/bin/bash
# DevPlay - Script de inicio rápido
# ================================
# Ejecuta este script para instalar y arrancar todo el proyecto

set -e

echo "🎮 DevPlay - Configuración inicial"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar Bun
if ! command -v bun &> /dev/null; then
  echo -e "${YELLOW}⚠️  Bun no está instalado${NC}"
  echo "Instálalo con: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo -e "${GREEN}✅ Bun detectado${NC}"

# 2. Instalar dependencias del proyecto principal
echo ""
echo "📦 Instalando dependencias del proyecto principal..."
bun install

# 3. Configurar .env si no existe
if [ ! -f .env ]; then
  echo ""
  echo "⚙️  Creando archivo .env..."
  cp .env.example .env
  echo -e "${GREEN}✅ .env creado desde .env.example${NC}"
fi

# 4. Crear base de datos
echo ""
echo "🗄️  Configurando base de datos..."
bun run db:push
echo -e "${GREEN}✅ Base de datos lista${NC}"

# 5. Instalar dependencias del realtime service
echo ""
echo "🔌 Instalando servicio de chat en tiempo real..."
cd mini-services/realtime-service
bun install
cd ../..
echo -e "${GREEN}✅ Realtime service listo${NC}"

# 6. Verificar Spring Boot
if [ -d "devplay-springboot" ]; then
  echo ""
  echo "☕ Proyecto Spring Boot detectado en devplay-springboot/"
  echo "   Para ejecutarlo: cd devplay-springboot && mvn spring-boot:run"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ ¡Todo configurado!${NC}"
echo "=================================="
echo ""
echo "🚀 Para iniciar el proyecto:"
echo ""
echo "  Terminal 1 (app principal):"
echo "    bun run dev"
echo ""
echo "  Terminal 2 (chat en tiempo real):"
echo "    cd mini-services/realtime-service"
echo "    bun run dev"
echo ""
echo "  Luego abre: http://localhost:3000"
echo ""
echo "📖 Lee README.md para más información"
