#!/bin/bash
# ALMA - Setup Completo Automatizado
# Ejecutar en PowerShell (Windows) o Bash (Mac/Linux)

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  🏥 ALMA - Sistema de Rehabilitación      ║"
echo "║     Setup Automatizado                     ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si existe comando
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "📋 Verificando requisitos..."
echo ""

# Verificar Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js no está instalado"
    echo "   Descarga desde: https://nodejs.org"
    exit 1
fi

# Verificar npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm no está instalado"
    exit 1
fi

echo ""
echo "🔧 Instalando dependencias..."
echo ""

# Backend
echo "📦 Backend..."
cd backend
echo "  → npm install"
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Instalado"
else
    echo "  ❌ Error en instalación"
    exit 1
fi
cd ..

# Frontend
echo "📦 Frontend..."
cd Alma
echo "  → npm install"
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Instalado"
else
    echo "  ❌ Error en instalación"
    exit 1
fi
cd ..

echo ""
echo "✅ Setup completado!"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "🚀 Para ejecutar el sistema:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && npm start"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd Alma && npm start"
echo ""
echo "Terminal 3 - Testing (opcional):"
echo "  cd backend && npm run test-api"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "📖 Documentación:"
echo "  • README.md          → Descripción general"
echo "  • QUICKSTART.md      → 5 pasos en 5 minutos"
echo "  • ARCHITECTURE.md    → Diseño del sistema"
echo ""
echo "🎉 ¡Listo para usar!"
echo ""
