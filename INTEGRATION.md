# GUÍA DE INTEGRACIÓN - Frontend + Backend

## Arquitectura General

```
┌──────────────────────┐
│  App Frontend (Web)  │
│  ├─ app.js           │
│  ├─ nlp.js           │
│  ├─ database.js      │
│  ├─ sync.js          │ ◄── Sincronización HTTP
│  └─ dashboard.js     │
└──────────────────────┘
           │ HTTP/JSON
           ▼
┌──────────────────────┐
│  Backend (Node.js)   │
│  ├─ server.js        │
│  ├─ routes.js        │
│  ├─ models/          │
│  └─ .env             │
└──────────────────────┘
           │ 
           ▼
┌──────────────────────┐
│  Base de Datos       │
│  (MongoDB o similar) │
└──────────────────────┘
```

## Configuración del Frontend

### 1. Verificar que sync.js está cargado

En `www/index.html`, asegúrate de que los scripts están en orden correcto:

```html
<script src="nlp.js"></script>
<script src="database.js"></script>
<script src="sync.js"></script>           <!-- ← IMPORTANTE: debe cargar antes de app.js -->
<script src="dashboard.js"></script>
<script src="app.js"></script>
```

### 2. Configurar URL del servidor

En el navegador, abre la consola y ejecuta:

```javascript
// Opción 1: Cambiar URL del servidor
localStorage.setItem('serverUrl', 'http://localhost:3000');

// Opción 2: Verificar URL actual
console.log(localStorage.getItem('serverUrl'));
```

O en `sync.js`, línea 4, modifica:
```javascript
this.serverUrl = serverUrl || localStorage.getItem('serverUrl') || 'http://localhost:3000';
```

## Instalación y Ejecución del Backend

### Terminal 1: Iniciar el Backend

```bash
cd backend
npm install
npm start
```

Deberías ver:
```
╔════════════════════════════════════════════╗
║     🏥 ALMA Backend Server                 ║
║     Puerto: 3000                           ║
║     API: http://localhost:3000/api         ║
║     Health: http://localhost:3000/api/health
╚════════════════════════════════════════════╝
```

### Terminal 2: Ejecutar la App Frontend

```bash
cd Alma
npm start
```

## Verificar Conectividad

### Test 1: Health Check

En el navegador:
```javascript
fetch('http://localhost:3000/api/health')
    .then(r => r.json())
    .then(d => console.log('✅ Backend conectado:', d));
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 45.123,
  "pacientesTotal": 0,
  "sesionesTotal": 0,
  "alertasTotal": 0
}
```

### Test 2: Crear Paciente

```bash
curl -X POST http://localhost:3000/api/pacientes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "paciente_001",
    "nombre": "Juan García",
    "edad": 45,
    "diagnostico": "Lesión de hombro",
    "objetivoRepeticiones": 20
  }'
```

Respuesta esperada:
```json
{
  "id": "paciente_001",
  "nombre": "Juan García",
  "edad": 45,
  "diagnostico": "Lesión de hombro",
  "objetivoRepeticiones": 20,
  "fechaRegistro": "2024-01-15T10:30:00.000Z",
  "sesiones": []
}
```

## Flujo de Sincronización

### Cuando el app está ONLINE

1. Usuario ejecuta comando (ej: "velocidad 5")
2. `app.js` llama a `dbManager.actualizarVelocidadSesion()`
3. `sync.js` automáticamente detecta y llama:
   ```
   POST /api/sesiones/:sesionId/velocidad
   ```
4. Servidor responde con éxito
5. LocalStorage queue permanece vacío

**Flujo en código:**

```javascript
// En procesarComandoVelocidad() [app.js]
await dbManager.actualizarVelocidadSesion(sesionActualId, velocidad);

if (syncManager && syncManager.isOnline) {
    await syncManager.guardarSesion(sesion, pacienteId);
}
```

### Cuando el app está OFFLINE

1. Usuario ejecuta comando
2. `app.js` guarda en IndexedDB localmente
3. `sync.js` intenta sincronizar pero falla
4. Operación se agrega a `syncQueue` (localStorage)
5. LocalStorage se actualiza

**Verificar queue en consola:**

```javascript
console.log(JSON.parse(localStorage.getItem('syncQueue') || '[]'));
```

### Cuando la conexión se restaura

1. `sync.js` detecta evento `online`
2. Llama `sincronizarCola()`
3. Procesa todas las operaciones pendientes
4. LocalStorage queue se limpia al completar

**Monitorear sincronización:**

```javascript
// Esperar a que sincronice
syncManager.addEventListener('sync-complete', () => {
    console.log('✅ Todos los datos sincronizados');
});
```

## Mapeo de Métodos Frontend ↔ Endpoints Backend

| Frontend (sync.js) | Método | Endpoint Backend | Descripción |
|---|---|---|---|
| `guardarSesion()` | POST | `/api/sesiones` | Crear nueva sesión |
| `finalizarSesion()` | PUT | `/api/sesiones/:id/finalizar` | Completar sesión |
| `guardarRepeticion()` | POST | `/api/sesiones/:id/repeticiones` | Registrar repetición |
| `registrarDolor()` | POST | `/api/sesiones/:id/dolor` | Registrar evento dolor |
| `obtenerPaciente()` | GET | `/api/pacientes/:id` | Obtener datos paciente |
| `obtenerEstadisticas()` | GET | `/api/pacientes/:id/estadisticas` | Obtener stats |
| `enviarAlerta()` | POST | `/api/alertas` | Enviar alerta terapeuta |
| `exportarDatos()` | GET | `/api/pacientes/:id/export` | Descargar JSON |

## Debugging

### 1. Ver logs del servidor

Los logs en el servidor muestran:

```
✅ Sesión creada: sesion_1234567890
📍 Evento de dolor: 7/10 en hombro
📬 ALERTA: [riesgo_alto_dolor] Riesgo alto...
```

### 2. Ver logs de sincronización en navegador

```javascript
// En console del navegador
syncManager.debug = true;  // Activa logs detallados

// Ver cola actual
console.log('Sync Queue:', syncManager.syncQueue);

// Ver estado de conexión
console.log('Is Online:', syncManager.isOnline);
```

### 3. Monitorear requests HTTP

Abre DevTools → Network y ejecuta una acción:

```javascript
// Simular comando de dolor
procesarDolor({
    intensidad: 7,
    ubicacion: 'hombro',
    tieneDolor: true
});
```

Deberías ver en Network:
- POST /api/sesiones/:id/dolor
- POST /api/alertas (si intensidad >= 7)

## Resolución de Problemas

### Error: "Connection refused" en cliente

**Causa**: Servidor no está corriendo  
**Solución**:
```bash
cd backend
npm start
```

### Error: "CORS error"

**Causa**: Origen no permitido  
**Solución**: En `server.js`, línea 10:
```javascript
app.use(cors({
    origin: 'http://localhost:5000',  // Tu puerto del frontend
    credentials: true
}));
```

### Datos no se sincronizan

**Verificar**:
1. ¿Servidor está online? `curl http://localhost:3000/api/health`
2. ¿Sync.js está cargado? `console.log(typeof syncManager)`
3. ¿Queue tiene elementos? `console.log(syncManager.syncQueue)`

**Solución manual**:
```javascript
// Forzar sincronización
await syncManager.sincronizarCola();
```

### localStorage lleno

**Síntoma**: Errores al guardar en localStorage  
**Solución**: Limpiar cache (local storage no crece indefinidamente, pero puede agotarse)
```javascript
localStorage.clear();  // ⚠️ Borra TODO
// O eliminar solo sync queue
localStorage.removeItem('syncQueue');
```

## Próximos Pasos

1. **Base de datos real**
   - Reemplazar almacenamiento en memoria con MongoDB
   - Ver: `backend/models/schemas.js`

2. **Autenticación**
   - Agregar JWT tokens
   - Proteger endpoints con middleware

3. **Dashboard web para terapeutas**
   - Vista de múltiples pacientes
   - Notificaciones en tiempo real

4. **Notificaciones**
   - Email alertas
   - SMS para eventos críticos

## Referencia Rápida

```bash
# Backend
cd backend
npm install      # Primera vez
npm start        # Iniciar servidor
npm run dev      # Modo desarrollo (con hot reload)

# Frontend
cd Alma
npm start        # Iniciar app

# Testing
curl http://localhost:3000/api/health
curl http://localhost:3000/api/pacientes/paciente_001
```

---

**¿Preguntas?** Ver logs completos en `backend/README.md`
