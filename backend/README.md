# Alma Backend Server

Backend de sincronización de datos para la aplicación Alma de terapia de rehabilitación con exoesqueleto.

## Características

- ✅ API REST para sesiones de terapia
- ✅ Almacenamiento de datos de pacientes
- ✅ Registro de eventos de dolor
- ✅ Sistema de alertas para terapeutas
- ✅ Exportación de datos en JSON
- ✅ Estadísticas de progreso
- ✅ Health check endpoint

## Requisitos

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB (opcional, actualmente usa almacenamiento en memoria)

## Instalación

1. Navega a la carpeta del backend:
```bash
cd backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. Edita `.env` con tus configuraciones:
```
PORT=3000
NODE_ENV=development
```

## Uso

### Modo Desarrollo (con hot-reload)
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Verificar estado del servidor

### Pacientes
- **POST** `/api/pacientes` - Crear nuevo paciente
- **GET** `/api/pacientes/:id` - Obtener datos del paciente
- **GET** `/api/pacientes/:id/estadisticas?dias=30` - Estadísticas del paciente
- **GET** `/api/pacientes/:id/export` - Exportar datos del paciente

### Sesiones
- **POST** `/api/sesiones` - Crear nueva sesión
- **GET** `/api/sesiones/:id` - Obtener datos de sesión
- **PUT** `/api/sesiones/:id/finalizar` - Finalizar sesión

### Repeticiones
- **POST** `/api/sesiones/:sesionId/repeticiones` - Registrar repetición

### Eventos de Dolor
- **POST** `/api/sesiones/:sesionId/dolor` - Registrar evento de dolor

### Alertas
- **POST** `/api/alertas` - Enviar alerta al terapeuta
- **GET** `/api/alertas/:pacienteId` - Obtener alertas del paciente
- **PUT** `/api/alertas/:id/leer` - Marcar alerta como leída

## Ejemplos de Uso

### Crear un paciente
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

### Crear una sesión
```bash
curl -X POST http://localhost:3000/api/sesiones \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteId": "paciente_001",
    "objetivoReps": 20,
    "velocidad": 5
  }'
```

### Registrar una repetición
```bash
curl -X POST http://localhost:3000/api/sesiones/sesion_1234567890/repeticiones \
  -H "Content-Type: application/json" \
  -d '{
    "numero": 1,
    "angle": 45,
    "velocidad": 5,
    "duracion": 3
  }'
```

### Registrar evento de dolor
```bash
curl -X POST http://localhost:3000/api/sesiones/sesion_1234567890/dolor \
  -H "Content-Type: application/json" \
  -d '{
    "intensidad": 7,
    "ubicacion": "hombro",
    "repeticionActual": 5
  }'
```

### Obtener estadísticas
```bash
curl http://localhost:3000/api/pacientes/paciente_001/estadisticas?dias=30
```

### Finalizar sesión
```bash
curl -X PUT http://localhost:3000/api/sesiones/sesion_1234567890/finalizar \
  -H "Content-Type: application/json" \
  -d '{
    "notas": "Sesión completada exitosamente",
    "feedback": ["Buen progreso"]
  }'
```

## Integración con App Frontend

En `www/sync.js`, actualiza la URL del servidor:

```javascript
const syncManager = new SyncManager('http://localhost:3000');
```

O en navegador, establece:
```javascript
localStorage.setItem('serverUrl', 'http://localhost:3000');
```

## Almacenamiento de Datos

Actualmente, el servidor almacena datos en memoria. Para producción:

### Integración con MongoDB
1. Instala Mongoose:
```bash
npm install mongoose
```

2. Crea modelos en `models/` (ver: `models/Sesion.js`, `models/Paciente.js`)

3. Conecta en `server.js`:
```javascript
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
```

## Desarrollo Futuro

- [ ] Autenticación JWT
- [ ] Base de datos MongoDB
- [ ] Dashboard web para terapeutas
- [ ] Notificaciones push
- [ ] Backup automático
- [ ] API GraphQL
- [ ] Containerización Docker
- [ ] Tests unitarios

## Troubleshooting

### Puerto 3000 ya está en uso
```bash
# Cambia el puerto en .env
PORT=3001
```

### CORS Error
Actualiza `CORS_ORIGIN` en `.env`:
```
CORS_ORIGIN=http://tu-dominio.com
```

### Base de datos no conecta
Verifica que MongoDB está ejecutándose:
```bash
mongod
```

## Soporte

Para reportar issues: [GitHub Issues](https://github.com/UPN/alma-backend/issues)

## Licencia

MIT
