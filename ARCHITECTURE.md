# ARQUITECTURA DEL SISTEMA - Alma Exoesqueleto

## Visión General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PACIENTE CON EXOESQUELETO                        │
│                            [Android Device]                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              WEB APP (Capacitor/Cordova)                         │   │
│  │                                                                  │   │
│  │  Voice Input ──► NLP Engine ──► Action Router ──► ESP32 (BLE)   │   │
│  │  (Spanish/EN/PT)  (3 idiomas)   (7 comandos)   (Bluetooth)      │   │
│  │      │                │                │                │       │   │
│  │      └──────────────┬─┴────────────────┴────────────────┘       │   │
│  │                     │                                           │   │
│  │      ┌──────────────▼──────────────┐                            │   │
│  │      │   IndexedDB (Local Store)   │                            │   │
│  │      │  ├─ Sesiones                │                            │   │
│  │      │  ├─ Repeticiones            │                            │   │
│  │      │  ├─ Eventos de Dolor        │                            │   │
│  │      │  ├─ Pacientes               │                            │   │
│  │      │  └─ Interacciones           │                            │   │
│  │      └──────────────┬───────────────┘                            │   │
│  │                     │                                           │   │
│  │      ┌──────────────▼──────────────┐                            │   │
│  │      │  Dashboard Charts            │                            │   │
│  │      │  ├─ Velocity Trend           │  (Chart.js)              │   │
│  │      │  ├─ Progress Gauge           │                           │   │
│  │      │  └─ Pain History             │                           │   │
│  │      └──────────────────────────────┘                            │   │
│  │                                                                  │   │
│  │      ┌──────────────────────────────┐                            │   │
│  │      │   Sync Manager               │                            │   │
│  │      │  ├─ Offline Queue (localStorage)                         │   │
│  │      │  ├─ Connection Detection     │                            │   │
│  │      │  └─ Batch Synchronization    │                            │   │
│  │      └──────────────┬───────────────┘                            │   │
│  │                     │                                           │   │
│  └─────────────────────┼───────────────────────────────────────────┘   │
│                        │                                                │
│                  HTTP/JSON (Port 5000)                                 │
│                        │                                                │
└────────────────────────┼────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │ ONLINE        │ OFFLINE       │
         │ Sincroniza    │ Guarda en     │
         │ inmediato     │ localStorage  │
         │               │ (Batch sync)  │
         │               │               │
         ▼               ▼               ▼
    ┌────────────────────────────────────────────┐
    │   🌐 BACKEND API SERVER (Node.js/Express)  │
    │   Puerto: 3000                             │
    ├────────────────────────────────────────────┤
    │                                            │
    │  ┌──────────────────────────────────────┐  │
    │  │  13 Endpoints REST                   │  │
    │  │  ├─ Pacientes (CRUD)                 │  │
    │  │  ├─ Sesiones (CRUD + finalizar)      │  │
    │  │  ├─ Repeticiones (create)            │  │
    │  │  ├─ Eventos Dolor (create)           │  │
    │  │  ├─ Alertas (create/read/update)     │  │
    │  │  ├─ Estadísticas (aggregates)        │  │
    │  │  ├─ Exportación (JSON backup)        │  │
    │  │  └─ Health Check                     │  │
    │  └──────────────────────────────────────┘  │
    │                    │                       │
    │  ┌────────────────▼────────────────────┐   │
    │  │  Request Validation & Processing    │   │
    │  │  ├─ CORS middleware                 │   │
    │  │  ├─ JSON parsing                    │   │
    │  │  └─ Error handling                  │   │
    │  └────────────────┬────────────────────┘   │
    │                   │                        │
    │  ┌────────────────▼────────────────────┐   │
    │  │  Storage Layer                      │   │
    │  │  ├─ In-Memory (demo)               │   │
    │  │  └─ MongoDB (production) [ready]   │   │
    │  └────────────────────────────────────┘   │
    │                                            │
    └────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────────┐         ┌─────────────┐
    │  MongoDB    │    OR   │   Files     │
    │  (Production)         │  (.json)    │
    └─────────────┘         └─────────────┘
```

## Componentes Detallados

### 1. Frontend Web App (www/)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| **app.js** | 700+ | Controlador principal, routing de comandos, integración ESP32 |
| **nlp.js** | 450+ | Reconocimiento de intención, extracción parámetros, 3 idiomas |
| **database.js** | 350+ | IndexedDB manager, ML algorithms (3), estadísticas |
| **sync.js** | 400+ | Sincronización offline-first, queue management |
| **dashboard.js** | 250+ | Visualización Chart.js, recomendaciones |
| **index.html** | 350+ | UI estructura, panels, canvas para gráficos |

**Features por Archivo**:
- **app.js**: Voice recognition loop, command processing, BLE communication
- **nlp.js**: 8 intents, Spanish/English/Portuguese, parameter extraction
- **database.js**: 5 IndexedDB stores, pain risk prediction, velocity suggestions, therapy plans
- **sync.js**: Offline queue, HTTP batch sync, localStorage persistence
- **dashboard.js**: 3 interactive graphs, pain history table, ML recommendations
- **index.html**: Responsive panels, progress tracking, clinical feedback

### 2. Backend API (backend/)

| Archivo | Propósito |
|---------|-----------|
| **server.js** | Express app, route mounting, CORS, error handling |
| **routes.js** | 13 endpoints organizados en 4 módulos |
| **models/schemas.js** | 8 Mongoose schemas (ready for MongoDB) |
| **package.json** | Dependencies, scripts |
| **.env.example** | Configuración template |
| **README.md** | Documentación completa |
| **test-api.js** | Testing automatizado |

**Endpoints**:

```
Pacientes:
  POST   /api/pacientes
  GET    /api/pacientes/:id
  GET    /api/pacientes/:id/estadisticas?dias=N
  GET    /api/pacientes/:id/export

Sesiones:
  POST   /api/sesiones
  GET    /api/sesiones/:id
  PUT    /api/sesiones/:id/finalizar
  POST   /api/sesiones/:id/repeticiones
  POST   /api/sesiones/:id/dolor

Alertas:
  POST   /api/alertas
  GET    /api/alertas/:pacienteId
  PUT    /api/alertas/:id/leer

Salud:
  GET    /api/health
```

### 3. Sincronización Offline-First

```
┌─────────────────────┐
│  Acción Usuario     │
│  ej: "velocidad 7"  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ ¿Online?     │
    └──┬────────┬──┘
       │        │
     YES       NO
       │        │
       ▼        ▼
    ┌──┐    ┌───────────────┐
    │  │    │ Guardar en:   │
    │  │    │ ├─ IndexedDB  │
    │ F│    │ └─ syncQueue  │
    │ E│    │   (localStorage)
    │ T│    └─────┬─────────┘
    │ C│          │
    │  │    Cuando online:
    │  │    ▼
    └──┘    Batch sync all
       │
       ▼
   Backend ─► DB
```

### 4. Data Flow - Un Comando Completo

```
Paciente: "Duele el hombro"
    │
    ▼
┌─────────────────────────────┐
│ Voice Recognition API       │ ◄─ Web Speech API (es-PE)
│ Captura: "duele el hombro"  │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ nlp.js - analizarConNLP()           │
│ ├─ Detectar idioma: ES              │
│ ├─ Evaluar Dolor:                   │
│ │  ├─ ¿Tiene "duele"? SÍ            │
│ │  ├─ ¿Tiene negación? NO           │
│ │  ├─ Ubicación: "hombro"           │
│ │  ├─ Intensidad: 5 (default)       │
│ │  └─ Retorna: {tieneDolor: true}   │
│ └─ Intencion: DOLOR                 │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ app.js - analizarConNLP()        │
│ Caso 'DOLOR':                    │
│ └─ procesarDolor(eval)           │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────┬────────────┐
    ▼                 ▼            ▼
┌─────────┐    ┌─────────────┐  ┌──────────┐
│IndexedDB│    │ESP32 (BLE)  │  │TTS Alerta│
│Registrar│    │EMERGENCIA   │  │"Detenido"│
│Dolor    │    │(si intensidad)        │
└────┬────┘    └──────┬──────┘  └─────────┘
     │                │
     ▼                ▼
┌────────────────────────────┐
│ syncManager.registrarDolor()│
│ - Crear HTTP POST          │
│ - Si online: Enviar ya     │
│ - Si offline: Queue        │
└────────┬───────────────────┘
         │
         ▼
    Backend: /api/sesiones/:id/dolor
         │
         ▼
    DB: INSERT eventosDolor
         │
         ▼
    Respuesta: 201 Created
```

### 5. ML Algorithms (database.js)

```
┌────────────────────────────┐
│ predecirRiesgoDolor()       │
│ ├─ Analiza último 5 sesiones
│ ├─ Intensidad promedio      │
│ ├─ Si ≥7: "alto"            │
│ ├─ Si 4-6: "medio"          │
│ └─ Retorna {riesgo, confianza}
└────────────────────────────┘

┌────────────────────────────┐
│ recomendarVelocidad()       │
│ ├─ Si dolor ≥6: velocidad-2│
│ ├─ Si completó objetivo: +1│
│ ├─ Si velocidad <3: +1     │
│ └─ Retorna {velocidad, razon}
└────────────────────────────┘

┌────────────────────────────┐
│ sugerirPlanTerapeutico()    │
│ ├─ Analiza 30 días         │
│ ├─ Calcula progreso        │
│ ├─ Genera 3 recomendaciones│
│ └─ Retorna {plan, próxima sesión}
└────────────────────────────┘
```

## Flujos Principales

### Flujo 1: Sesión Normal (Online)

```
1. startSession()
   └─ dbManager.crearSesion()
   └─ syncManager.guardarSesion()  ◄── HTTP POST /api/sesiones

2. Usuario dice comando
   └─ app.js procesa
   └─ dbManager.guardarRepeticion()
   └─ syncManager.guardarRepeticion()  ◄── HTTP POST /api/sesiones/:id/repeticiones

3. Usuario reporta dolor
   └─ procesarDolor()
   └─ dbManager.registrarDolor()
   └─ syncManager.registrarDolor()  ◄── HTTP POST /api/sesiones/:id/dolor
   └─ Si intensidad≥7: syncManager.enviarAlerta()  ◄── HTTP POST /api/alertas

4. case 'TERMINAR'
   └─ dbManager.finalizarSesion()
   └─ syncManager.finalizarSesion()  ◄── HTTP PUT /api/sesiones/:id/finalizar
   └─ dbManager.sugerirPlanTerapeutico()
   └─ syncManager.enviarAlerta() (si riesgo alto)
```

### Flujo 2: Offline → Online

```
1. Usuario en sesión (Internet cae)
   └─ navigator.onLine = false
   └─ sync.isOnline = false

2. Comando: "velocidad 5"
   └─ dbManager.guardarRepeticion()
   └─ syncManager intenta HTTP
   └─ FALLA (offline)
   └─ syncManager.agregarACola()
   └─ localStorage['syncQueue'] += operación

3. Internet vuelve
   └─ navigator.onLine = true
   └─ event 'online' dispara
   └─ syncManager.handleOnline()
   └─ sincronizarCola()
   └─ Batch POST /api/sesiones/batch
   └─ localStorage['syncQueue'].clear()
```

### Flujo 3: Dashboard Actualización

```
1. Sesión termina
   └─ app.js: case 'TERMINAR'
   └─ actualizarPanelProgressoAvanzado()

2. dashboardManager.actualizarDashboard()
   └─ dashboardManager.actualizarGraficoVelocidad()
   └─ dashboardManager.actualizarGraficoProgreso()
   └─ dashboardManager.actualizarHistorialDolor()
   └─ dashboardManager.mostrarRecomendaciones()

3. Chart.js renderiza
   └─ Velocity graph (línea)
   └─ Progress gauge (donut)
   └─ Pain history (tabla)
   └─ Recommendation cards
```

## Escalabilidad y Producción

### Mejoras Inmediatas

```
✅ Actual              →  📊 Mejora
─────────────────────────────────────
In-Memory Storage  →  MongoDB (schemas ready)
No Auth            →  JWT Tokens
Single Server      →  Load Balancer
No Logs            →  Centralized Logging
CORS allow all     →  Specific origins
Dev DB             →  Production DB setup
```

### Arquitectura Futura (Optional)

```
┌─────────────────────────────────────────┐
│  Web UI para Terapeutas (React/Vue)     │
│  ├─ Dashboard multi-paciente             │
│  ├─ Alertas en tiempo real               │
│  └─ Modificar planes de terapia          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  WebSocket Server (Real-time updates)   │
│  └─ Push notifications                   │
└─────────────────┬───────────────────────┘
                  │
          ┌───────▼────────┐
          │ Main Backend   │
          │  Port 3000     │
          └───────┬────────┘
          ┌───────▼──────────┐
          │  MongoDB         │
          │  + Redis Cache   │
          │  + S3 Backups    │
          └──────────────────┘
```

## Checklist de Estado

| Feature | Status | Notas |
|---------|--------|-------|
| Frontend Voice Recognition | ✅ | 3 idiomas |
| NLP Intent Classification | ✅ | 8 intents, manual Bayes |
| ESP32 BLE Communication | ✅ | Via Web Bluetooth API |
| IndexedDB Persistence | ✅ | 5 stores |
| ML Predictions | ✅ | 3 algorithms custom |
| Dashboard Visualization | ✅ | Chart.js 3 graphs |
| Multi-language UI | ✅ | ES/EN/PT |
| Backend API | ✅ | 13 endpoints |
| Offline-first Sync | ✅ | Queue + localStorage |
| MongoDB Integration | ⏳ | Schemas ready, await connection |
| Therapist Portal | ⏳ | UI not created |
| WebSocket Real-time | ⏳ | Ready for Socket.io |
| Production Deployment | ⏳ | Hosting + SSL needed |

---

**Documentación Relacionada**:
- [QUICKSTART.md](QUICKSTART.md) - Ejecución en 5 minutos
- [INTEGRATION.md](INTEGRATION.md) - Detalles técnicos
- [VERIFICATION.md](VERIFICATION.md) - Checklist testing
- [backend/README.md](backend/README.md) - API documentation
