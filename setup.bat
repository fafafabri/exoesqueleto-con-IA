@echo off
REM ALMA - Setup Completo Automatizado (Windows)
REM Ejecutar en PowerShell como Administrador

echo.
echo ╔════════════════════════════════════════════╗
echo ║  🏥 ALMA - Sistema de Rehabilitación      ║
echo ║     Setup Automatizado (Windows)           ║
echo ╚════════════════════════════════════════════╝
echo.

REM Verificar Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no está instalado
    echo    Descarga desde: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js: %NODE_VERSION%

REM Verificar npm
npm -v >nul 2>&1
if errorlevel 1 (
    echo ❌ npm no está instalado
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ npm: %NPM_VERSION%

echo.
echo 🔧 Instalando dependencias...
echo.

REM Backend
echo 📦 Backend...
cd backend
echo   → npm install
call npm install >nul 2>&1
if errorlevel 1 (
    echo   ❌ Error en instalación
    pause
    exit /b 1
)
echo   ✅ Instalado
cd ..

REM Frontend
echo 📦 Frontend...
cd Alma
echo   → npm install
call npm install >nul 2>&1
if errorlevel 1 (
    echo   ❌ Error en instalación
    pause
    exit /b 1
)
echo   ✅ Instalado
cd ..

echo.
echo ✅ Setup completado!
echo.
echo ═══════════════════════════════════════════════
echo.
echo 🚀 Para ejecutar el sistema:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm start
echo.
echo Terminal 2 - Frontend:
echo   cd Alma
echo   npm start
echo.
echo Terminal 3 - Testing (opcional):
echo   cd backend
echo   npm run test-api
echo.
echo ═══════════════════════════════════════════════
echo.
echo 📖 Documentación:
echo   • README.md          → Descripción general
echo   • QUICKSTART.md      → 5 pasos en 5 minutos
echo   • ARCHITECTURE.md    → Diseño del sistema
echo.
echo 🎉 ¡Listo para usar!
echo.
pause
