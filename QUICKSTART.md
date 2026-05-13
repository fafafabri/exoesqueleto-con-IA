# GUÍA RÁPIDA - Ejecución Completa (5 minutos)

## Requisitos
- Node.js >= 16.0.0 instalado
- Terminal/PowerShell

## Paso 1: Instalar Backend (2 minutos)

Abre una terminal en la carpeta `backend/`:

```powershell
cd "d:\UPN 2026\INTELIG.ARTIF. Y SISTEM. LOG\Alma\exoesqueleto con IA\backend"
npm install
npm start
```

**Esperado:** 
```
╔════════════════════════════════════════════╗
║     🏥 ALMA Backend Server                 ║
║     Puerto: 3000                           ║
║     API: http://localhost:3000/api         ║
║     Health: http://localhost:3000/api/health
╚════════════════════════════════════════════╝
```

**NO cierres esta terminal.** El servidor debe seguir corriendo.

---

## Paso 2: Verificar Conectividad (1 minuto)

Abre una **NUEVA terminal** y ejecuta:

```bash
curl http://localhost:3000/api/health
```

Deberías ver JSON como:
```json
{
  "status": "ok",
  "timestamp": "...",
  "pacientesTotal": 0,
  "sesionesTotal": 0
}
```

---

## Paso 3: Crear Paciente de Prueba (1 minuto)

```bash
curl -X POST http://localhost:3000/api/pacientes ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"test_001\",\"nombre\":\"Test User\",\"edad\":45,\"diagnostico\":\"Prueba\",\"objetivoRepeticiones\":20}"
```

Respuesta esperada:
```json
{
  "id": "test_001",
  "nombre": "Test User",
  "fechaRegistro": "2024-...",
  "sesiones": []
}
```

---

## Paso 4: Ejecutar la App (1 minuto)

Abre otra terminal en `Alma/`:

```powershell
cd "d:\UPN 2026\INTELIG.ARTIF. Y SISTEM. LOG\Alma\exoesqueleto con IA\Alma"
npm start
```

Se abrirá en http://localhost:5000

---

## Paso 5: Probar Sincronización (ninguno de estos pasos requiere terminal)

1. **En el navegador**, abre DevTools (F12)
2. **Consola**, ejecuta:
   ```javascript
   // Verifica que el backend está conectado
   fetch('http://localhost:3000/api/health').then(r => r.json()).then(console.log)
   ```

3. **Inicia sesión en la app** haciendo clic en "Iniciar Sesión"

4. **Verifica los logs** en la terminal del Backend:
   ```
   ✅ Sesión creada: sesion_1234567890
   ```

5. **Di un comando de prueba**:
   - "velocidad 7" 
   - "quiero 15 flexiones"
   - "duele el hombro"

6. **Verifica en DevTools**:
   ```javascript
   console.log('Queue:', JSON.parse(localStorage.getItem('syncQueue') || '[]'))
   ```

---

## Estructura de Carpetas

```
exoesqueleto con IA/
├── Alma/                          ← Frontend (Capacitor)
│   ├── www/
│   │   ├── app.js                 ✅ Integrado con sync
│   │   ├── sync.js                ✅ NUEVO
│   │   ├── database.js
│   │   ├── nlp.js
│   │   ├── dashboard.js
│   │   └── index.html             ✅ Orden correcto
│   └── package.json
│
├── backend/                       ← Backend (NUEVO)
│   ├── server.js                  ✅ Express + API
│   ├── routes.js
│   ├── models/
│   │   └── schemas.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── INTEGRATION.md                 ✅ Guía completa
```

---

## Comandos de Referencia

### Backend

```bash
# Instalar (primera vez)
npm install

# Iniciar servidor
npm start

# Modo desarrollo (auto-reload)
npm run dev

# Cambiar puerto
PORT=3001 npm start
```

### Frontend

```bash
# Instalar (primera vez)
npm install

# Iniciar app
npm start

# Compilar para Android
npm run build
npx cap sync android
```

---

## Verificaciones Rápidas

### ¿Está el backend en línea?
```bash
curl http://localhost:3000/api/health
```

### ¿Cuántos pacientes hay?
```bash
curl http://localhost:3000/api/pacientes/test_001
```

### ¿Hay alertas pendientes?
```bash
curl http://localhost:3000/api/alertas/test_001
```

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| `ECONNREFUSED 127.0.0.1:3000` | Backend no está ejecutándose → `npm start` en carpeta backend |
| CORS error en navegador | Puerto incorrecto en localStorage.setItem('serverUrl', ...) |
| Sync queue siempre vacío | ¿Online? `navigator.onLine` debe ser true |
| npm: comando no encontrado | Node.js no instalado → [nodejs.org](https://nodejs.org) |

---

## Archivos Modificados

✅ **www/app.js** - Integración syncManager
✅ **www/index.html** - Script loading order (sync.js entre database.js y app.js)
✅ **www/sync.js** - CREADO (Offline-first queue)

**backend/** - CREADO (Todo)
- server.js
- package.json
- routes.js
- models/schemas.js
- .env.example
- README.md

**INTEGRATION.md** - CREADO (Esta guía técnica)

---

## Video de Demostración (Concepto)

```
Terminal 1 (Backend)         Terminal 2 (DevTools)         Terminal 3 (Datos)
━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━
npm start
  ✅ Server running           
                               navigator.onLine 
                               → true
                                                           curl /api/health
                                                           → ok
Usuario dice:
"velocidad 7"                 
                               Fetch POST /api/ses.../
  📊 Sesión update            velocidad 7
  
Conexión cae                  navigator.onLine
  ⚠️ Queue add               → false
                              
Usuario dice:                 localStorage
"duele el hombro"            ['op1', 'op2']
  
  ⚠️ Offline, queue                                       
Conexión restaura            navigator.onLine             
  ✅ Batch sync              → true
                             Fetch batch operations
  ✅ Sync complete
                             localStorage []
```

---

## Paso Siguente: Base de Datos Real

Cuando estés listo para producción, reemplaza el almacenamiento en memoria:

```bash
# Instalar MongoDB driver
cd backend
npm install mongoose

# Editar server.js para usar models/ y MongoDB
```

Ver: `backend/models/schemas.js` para esquemas Mongoose listos.

---

**¿Listo? Abre 3 terminales y sigue Paso 1 → Paso 5** 

Para más detalles técnicos: Ver `INTEGRATION.md`
