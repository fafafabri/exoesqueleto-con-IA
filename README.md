# 🏥 ALMA - Asistente de Rehabilitación Inteligente con IA

**Exoesqueleto robótico controlado por voz con sincronización en servidor**

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Inicio Rápido](#inicio-rápido)
- [Arquitectura](#arquitectura)
- [Documentación](#documentación)
- [Status Actual](#status-actual)

## 🎯 Descripción

**Alma** es un asistente de rehabilitación terapéutica inteligente que se integra con un exoesqueleto robótico. Los pacientes controlan el dispositivo mediante comandos de voz en español, inglés o portugués, mientras que el sistema registra cada movimiento, detecta dolor y proporciona retroalimentación personalizada.

El sistema combina **Web Speech API** para reconocimiento de voz, **Natural Language Processing** para interpretación de comandos, **Bluetooth LE** para comunicación con el ESP32, **IndexedDB** para almacenamiento local, y un **backend en Node.js** para sincronización remota de datos.

## ✨ Características Principales

### 🎙️ Reconocimiento de Voz Multiidioma
- **Español** (es-PE), **Inglés**, **Portugués**
- Auto-detección de idioma o selectable manualmente
- Respuestas contextualizadas en el idioma elegido

### 🧠 NLP Avanzado
- **8 categorías de intención**: Flexión, Reposo, Velocidad, Objetivo, Dolor, Progreso, Emergencia
- **Extracción de parámetros**: Velocidad (1-10), Objetivo de repeticiones, Intensidad de dolor (0-10), Ubicación del dolor
- **Detección de negación**: Evita falsos positivos (ej: "no duele")

### 📊 Dashboard Interactivo
- **Gráfico de velocidad**: Tendencia de rendimiento en los últimos 30 días
- **Indicador de progreso**: Doughnut chart mostrando reps actuales vs objetivo
- **Historial de dolor**: Tabla de eventos con intensidad y ubicación
- **Recomendaciones inteligentes**: Sugerencias basadas en ML

### 🤖 Machine Learning Built-in
1. **Predictor de Riesgo de Dolor**: Analiza últimas 5 sesiones, retorna riesgo alto/medio/bajo
2. **Recomendador de Velocidad**: Ajusta automáticamente velocidad según performance
3. **Generador de Plan Terapéutico**: Crea recomendaciones personalizadas basadas en progreso

### 💾 Almacenamiento Offline-First
- **IndexedDB local**: Persiste sesiones, repeticiones, eventos de dolor
- **Queue de sincronización**: localStorage guarda operaciones pendientes
- **Batch sync automático**: Cuando vuelve la conexión, sincroniza todo

### ☁️ Sincronización Remota
- **API REST con 13 endpoints**
- **Almacenamiento en memoria** (testing) o **MongoDB** (producción)
- **Alertas automáticas**: Si dolor intenso, notifica al terapeuta

## 🚀 Inicio Rápido

### Requisitos Mínimos
- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- Dos terminales (uno para backend, otro para frontend)

### 5 Pasos (5 minutos)

#### Paso 1: Instalar Backend
```bash
cd backend
npm install
npm start
```
✅ Esperado: `Server running on http://localhost:3000`

#### Paso 2: Verificar Conectividad
```bash
curl http://localhost:3000/api/health
```
✅ Respuesta: `{"status":"ok","pacientesTotal":0,...}`

#### Paso 3: Instalar Frontend
```bash
cd Alma
npm install
```

#### Paso 4: Ejecutar Frontend
```bash
npm start
```
✅ Abre: `http://localhost:5000`

#### Paso 5: Probar Sistema
1. Haz clic en **"Iniciar Sesión"**
2. Di: **"velocidad 7"** o **"duele el hombro"**
3. Observa: Datos se sincronizan con backend automáticamente

**¡Listo!** Para más detalles: [QUICKSTART.md](QUICKSTART.md)

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│   Paciente con Exoesqueleto (Android)   │
│  ┌──────────────────────────────────┐   │
│  │  🗣️ Voz → 🧠 NLP → 🤖 Comando   │   │
│  │  ↓                               │   │
│  │  📊 Dashboard + 💾 IndexedDB     │   │
│  │  ↓                               │   │
│  │  🔄 Sincronización (offline OK)  │   │
│  └───────────────┬──────────────────┘   │
│                  │                      │
│         HTTP/JSON (Puerto 3000)         │
│                  │                      │
└──────────────────┼──────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  Backend (Node.js) │
         │  13 Endpoints      │
         ├─────────┬─────────┤
         │ MongoDB │ JSON    │
         └─────────┴─────────┘
```

**Documentación detallada**: [ARCHITECTURE.md](ARCHITECTURE.md)

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | Ejecución en 5 pasos (principiantes) |
| [INTEGRATION.md](INTEGRATION.md) | Guía técnica de integración |
| [VERIFICATION.md](VERIFICATION.md) | Checklist de verificación (testing) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diseño del sistema completo |
| [backend/README.md](backend/README.md) | Documentación de API |
| [VOICE_COMMANDS.md](VOICE_COMMANDS.md) | Referencia de comandos de voz |
| [ADVANCED_FEATURES.md](ADVANCED_FEATURES.md) | Dashboard, ML, multi-idioma |

## 📁 Estructura del Proyecto

```
exoesqueleto con IA/
├── Alma/                          ← Frontend (Capacitor/Web)
│   ├── www/
│   │   ├── app.js                 (700+ líneas - Controlador principal)
│   │   ├── nlp.js                 (450+ líneas - NLP + 3 idiomas)
│   │   ├── database.js            (350+ líneas - IndexedDB + ML)
│   │   ├── sync.js                (400+ líneas - Offline-first sync)
│   │   ├── dashboard.js           (250+ líneas - Visualización)
│   │   └── index.html             (UI + Canvas)
│   ├── android/                   (Capacitor Android build)
│   └── package.json
│
├── backend/                       ← Backend (Node.js/Express)
│   ├── server.js                  (400+ líneas - Express app + rutas)
│   ├── routes.js                  (250+ líneas - Endpoints organizados)
│   ├── models/schemas.js          (200+ líneas - Mongoose schemas)
│   ├── test-api.js                (300+ líneas - Testing automatizado)
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── 📄 QUICKSTART.md               (5 pasos ejecución)
├── 📄 INTEGRATION.md              (Detalles técnicos)
├── 📄 VERIFICATION.md             (Testing checklist)
├── 📄 ARCHITECTURE.md             (Diseño del sistema)
└── 📄 README.md                   (Este archivo)
```

## ⚙️ Tecnologías Utilizadas

### Frontend
- **Capacitor 8.3.1** - Android packaging
- **Web Speech API** - Reconocimiento de voz
- **Web Bluetooth API** - Comunicación ESP32
- **IndexedDB** - Base de datos local
- **Chart.js 4.4.0** - Visualización
- **JavaScript vanilla** - Sin frameworks pesados

### Backend
- **Node.js v16+** - Runtime
- **Express.js 4.18** - Framework web
- **Mongoose 7.0** - MongoDB ODM (optional)
- **CORS 2.8** - Cross-origin support
- **dotenv 16.0** - Configuración

### Hardware
- **ESP32** - Microcontrolador (BLE)
- **Exoesqueleto robótico** - Actuadores
- **Android device** - Cliente

## 📊 Status Actual

### ✅ Completado
- [x] Reconocimiento de voz (3 idiomas)
- [x] NLP con 8 intents
- [x] Extracción de parámetros
- [x] IndexedDB persistence
- [x] 3 algoritmos ML custom
- [x] Dashboard interactivo
- [x] Sincronización offline-first
- [x] Backend API 13 endpoints
- [x] Testing automatizado
- [x] Documentación completa

### 🔄 En Progreso
- [ ] Base de datos MongoDB (schemas listos)
- [ ] Autenticación JWT
- [ ] Portal web para terapeutas

### ⏳ Futuro
- [ ] WebSocket para notificaciones reales
- [ ] Advanced ML (TensorFlow.js)
- [ ] Cloud deployment
- [ ] Mobile app nativa

## 🧪 Testing

### Test de API Automatizado

```bash
cd backend
npm run test-api
```

Verifica:
- ✅ Conectividad servidor
- ✅ CRUD pacientes
- ✅ CRUD sesiones
- ✅ Registro de dolor
- ✅ Alertas
- ✅ Estadísticas

### Test Manual

Ver: [VERIFICATION.md](VERIFICATION.md) - Paso a paso con ejemplos curl

## 📖 Ejemplos de Comandos

### Voz (en la app)
```
"Alma, velocidad 7"           → Ajusta velocidad a 7/10
"Alma, quiero 20 flexiones"   → Actualiza objetivo a 20 reps
"Alma, duele el hombro"       → Registra dolor intensidad 5/10
"Alma, terminar"              → Finaliza sesión
```

### API (desde backend)
```bash
# Crear paciente
curl -X POST http://localhost:3000/api/pacientes \
  -H "Content-Type: application/json" \
  -d '{"id":"p1","nombre":"Juan","edad":45,"diagnostico":"test","objetivoRepeticiones":20}'

# Obtener estadísticas
curl http://localhost:3000/api/pacientes/p1/estadisticas?dias=30

# Enviar alerta
curl -X POST http://localhost:3000/api/alertas \
  -H "Content-Type: application/json" \
  -d '{"pacienteId":"p1","tipo":"riesgo_alto_dolor","mensaje":"Precaución"}'
```

## 🔧 Configuración

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/alma
JWT_SECRET=tu_secret_key
CORS_ORIGIN=http://localhost:5000
```

### Frontend (browser)
```javascript
// En DevTools Console
localStorage.setItem('serverUrl', 'http://localhost:3000');
localStorage.setItem('almaIdioma', 'es'); // es|en|pt
```

## 🚨 Troubleshooting

| Error | Solución |
|-------|----------|
| `ECONNREFUSED 3000` | Backend no ejecuta: `cd backend && npm start` |
| CORS error | Verificar CORS_ORIGIN en .env |
| Voice no reconoce | Cambiar language a `es-PE` en app.js |
| Sync queue lleno | Sincronizar manualmente: `syncManager.sincronizarCola()` |
| MongoDB no conecta | Instalar MongoDB local o usar Atlas cloud |

## 📞 Soporte

- **Issues**: Revisa [INTEGRATION.md](INTEGRATION.md) sección Troubleshooting
- **Documentación**: [ARCHITECTURE.md](ARCHITECTURE.md) para detalles técnicos
- **Testing**: [VERIFICATION.md](VERIFICATION.md) para checklist exhaustivo

## 📄 Licencia

MIT - Uso académico y comercial permitido

## 👥 Equipo

Desarrollo: Universidad Peruana de Ciencias Aplicadas (UPN)

---

## 🎓 Para Comenzar

**Primera vez?** → [QUICKSTART.md](QUICKSTART.md)  
**¿Problemas?** → [INTEGRATION.md](INTEGRATION.md)  
**¿Testing?** → [VERIFICATION.md](VERIFICATION.md)  
**¿Detalles?** → [ARCHITECTURE.md](ARCHITECTURE.md)

---

**¿Preguntas? Consulta la documentación o ejecuta el testing automatizado:**

```bash
cd backend
npm run test-api
```

✅ **Sistema listo para rehabilitación inteligente con IA**
