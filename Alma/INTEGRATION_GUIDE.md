# Guía de Integración - Control Dinámico de Sesiones

## Descripción de Cambios Realizados

Se han agregado tres nuevas capacidades de control dinámico por voz que permiten al paciente modificar parámetros de la sesión de terapia en tiempo real, completamente mediante comandos de voz en español.

---

## Archivos Modificados

### 1. **www/nlp.js** - Motor NLP Expandido

**Nuevos Métodos Agregados:**

```javascript
extraerVelocidad(texto) → number|null
```
- Detecta números 1-10 después de palabras como "velocidad", "ritmo", "rápido"
- Soporta frases como: "velocidad 5", "ritmo rápido 7", "reducir a 2"
- Retorna el número 1-10 o null si no encuentra

```javascript
extraerObjetivo(texto) → number|null
```
- Busca palabras clave: "quiero", "objetivo", "meta", "hazme", "deseo"
- Extrae número seguido de: "flexiones", "repeticiones", "reps", "veces"
- Soporta: "quiero 20 flexiones", "objetivo 15 reps", "haz 25"
- Retorna el número o null

```javascript
evaluarDolor(texto) → object
```
- Detecta palabras de dolor: "duele", "molestia", "ardor", "pinchazos"
- Extrae intensidad 1-10: "duele 7", "molestia 5/10"
- Identifica ubicación: "hombro", "codo", "muñeca", "brazo", "articulación"
- Retorna: `{ tieneDolor, intensidad, ubicacion }`

---

### 2. **www/database.js** - Schema Expandido

**Nuevos Campos en Sesiones:**
```javascript
{
  objetivoReps: 20,           // Reps objetivo por sesión
  velocidadPromed: 5.2,       // Velocidad promedio usada
  velocidadMin: 3,            // Mínima velocidad
  velocidadMax: 7,            // Máxima velocidad
  velocidadesUsadas: [6,6,5,4,3],  // Histórico de velocidades
  eventosDolor: [...]         // Array de eventos de dolor
}
```

**Nuevos Campos en Repeticiones:**
```javascript
{
  velocidad: 6,               // Velocidad en esa rep (1-10)
  conDolor: false,            // ¿Hubo dolor?
  intensidadDolor: 0          // Intensidad si hay dolor (1-10)
}
```

**Nuevos Métodos:**

```javascript
actualizarObjetivoSesion(sesionId, nuevoObjetivo) → Promise
```
- Modifica el objetivo de reps durante la sesión
- Actualiza BD inmediatamente

```javascript
actualizarVelocidadSesion(sesionId, velocidad) → Promise
```
- Registra velocidad en histórico `velocidadesUsadas`
- Calcula promedio, min, max automáticamente
- Retorna: `{ velocidadActual, velocidadPromed }`

```javascript
registrarDolor(sesionId, datos) → Promise
```
- Agrega evento a array `eventosDolor`
- Datos: `{ repeticionActual, anguloEnMomento, intensidad, ubicacion }`
- Permite análisis posterior de correlaciones

```javascript
guardarRepeticion(sesionId, datos) → Promise (mejorado)
```
- Ahora acepta `velocidad`, `conDolor`, `intensidadDolor`
- Mantiene compatibilidad hacia atrás

---

### 3. **www/app.js** - Controladores Nuevos

**Nuevas Funciones de Procesamiento:**

```javascript
procesarComandoVelocidad(velocidad)
```
- Ejecuta cuando se detecta un comando de velocidad
- Envía `VELOCIDAD:N` a ESP32
- Guarda en BD con `dbManager.actualizarVelocidadSesion()`
- Responde al usuario con feedback contextual

```javascript
procesarComandoObjetivo(nuevoObjetivo)
```
- Actualiza objetivo de repeticiones
- Guarda en BD con `dbManager.actualizarObjetivoSesion()`
- Modifica UI para mostrar "X de {objetivo}"
- Responde personalizadamente según rango

```javascript
procesarDolor(evaluacionDolor)
```
- Maneja reportes de dolor/molestia
- Registra en BD con `dbManager.registrarDolor()`
- Ejecuta acciones automáticas según intensidad:
  - `≥ 8`: Envía `EMERGENCIA`
  - `6-7`: Envía `VELOCIDAD:3`
  - `4-5`: Envía `REPOSO`
  - `1-3`: Continúa monitoreando

**Modificación en `analizarConNLP()`:**
```javascript
// Antes de procesar intención normal, ahora:
1. Detecta velocidad → procesarComandoVelocidad()
2. Detecta objetivo → procesarComandoObjetivo()
3. Detecta dolor → procesarDolor()
4. Si no, procesa intención normal
```

**Mejora en `enviarAlESP32(comando)`:**
- Ahora documenta comandos disponibles
- Agrega logs de debug
- Maneja errores de conexión

---

## Flujo de Ejecución

### Flujo 1: Comando de Velocidad
```
Usuario dice → "velocidad 7"
         ↓
recognition.onresult() → analizarIntención()
         ↓
nlpEngine.extraerVelocidad("velocidad 7")
         ↓
Retorna: 7
         ↓
procesarComandoVelocidad(7)
  ├→ updateAlmaStatusText("Ajustando velocidad a 7/10")
  ├→ dbManager.actualizarVelocidadSesion(sesionId, 7)
  ├→ enviarAlESP32("VELOCIDAD:7")
  └→ speak("Velocidad rápida. Ritmo acelerado.")
```

### Flujo 2: Comando de Objetivo
```
Usuario dice → "quiero 20 flexiones"
         ↓
nlpEngine.extraerObjetivo("quiero 20 flexiones")
         ↓
Retorna: 20
         ↓
procesarComandoObjetivo(20)
  ├→ dbManager.actualizarObjetivoSesion(sesionId, 20)
  ├→ UI muestra: "0 de 20 repeticiones"
  └→ speak("Excelente meta: 20 repeticiones. ¡Podemos lograrlo!")
```

### Flujo 3: Reporte de Dolor
```
Usuario dice → "me duele el codo 6"
         ↓
nlpEngine.evaluarDolor("me duele el codo 6")
         ↓
Retorna: { tieneDolor: true, intensidad: 6, ubicacion: "codo" }
         ↓
procesarDolor(evaluacion)
  ├→ dbManager.registrarDolor(sesionId, {...})
  ├→ Intensidad 6 → enviarAlESP32("VELOCIDAD:3")
  ├→ setAlmaEmotion('alert')
  └→ speak("Dolor moderado detectado. Reduciendo velocidad...")
```

---

## Comunicación con ESP32

### Comandos Disponibles (Expandidos)

| Comando | Parámetro | Ejemplo | Efecto |
|---------|-----------|---------|--------|
| EMERGENCIA | — | `EMERGENCIA` | Detiene inmediatamente |
| FLEXION | — | `FLEXION` | Inicia flexión a velocidad actual |
| REPOSO | — | `REPOSO` | Pausa/descanso |
| VELOCIDAD | 1-10 | `VELOCIDAD:7` | Ajusta velocidad del motor |
| REPS | Número | `REPS:15` | Indicación de repeticiones meta |

### Ejemplo de Secuencia Real
```
Conexión BLE establecida
Alma ← "Velocidad 5"
ESP32 ← VELOCIDAD:5
Alma ← "Quiero 10 flexiones"
(Sin comando a ESP32, solo actualiza BD)
Alma ← "Siguiente"
ESP32 ← FLEXION
(Motor ejecuta flexión a velocidad 5)
Alma ← "Me duele 4"
ESP32 ← VELOCIDAD:3
(Motor reduce velocidad por seguridad)
```

---

## Testing e Integración

### Test Interactivo
- Archivo: `www/test-voice-commands.html`
- Prueba los tres nuevos métodos sin conexión ESP32
- Simula respuestas del NLP Engine
- Log en tiempo real de eventos

### Cómo Probar en Dispositivo
1. Conectar a BLE (Bluetooth)
2. Iniciar sesión
3. Decir: **"velocidad 6"** → Verificar consola y BD
4. Decir: **"quiero 25 flexiones"** → Verificar objetivo en BD
5. Decir: **"duele el brazo 5"** → Verificar evento en BD
6. Ejecutar flexiones, verificar que se registren con parámetros

### Validación de BD
```javascript
// En consola browser (F12):
dbManager.obtenerEstadisticasPaciente('paciente_001', 1)
  .then(stats => console.log(stats))

// Verificar sesión reciente:
// stats.sesiones[0] debe contener:
// - objetivoReps: 25
// - velocidadPromed: 6
// - eventosDolor: [{intensidad: 5, ubicacion: "brazo"}]
```

---

## Almacenamiento de Datos

### Estructura IndexedDB

**Sesiones con parámetros dinámicos:**
```
Id | Reps | Objetivo | VelProm | DolorMax | Eventos
1  | 25   | 25       | 6.0     | 5        | 1
2  | 18   | 20       | 5.5     | 0        | 0
```

**Repeticiones con parámetros:**
```
Id | Rep# | Ángulo | Vel | Dolor | Duración
1  | 1    | 45°    | 6   | 0     | 2.5s
2  | 2    | 47°    | 6   | 0     | 2.4s
3  | 3    | 50°    | 5   | 3     | 2.6s
4  | 4    | 45°    | 3   | 0     | 3.1s
```

---

## Limitaciones Actuales

❌ **No Implementado Aún:**
- Soporte para múltiples idiomas
- Integración con Dashboard de progreso visual (Chart.js)
- Predicción ML de riesgo de dolor
- Sincronización con servidor remoto
- Recomendaciones basadas en patrones históricos

✅ **Actualmente Operativo:**
- Detección de voz en español
- Extracción de parámetros numéricos
- Comunicación BLE con ESP32
- Almacenamiento persistente IndexedDB
- Respuestas contextuales adaptativas

---

## Próximos Pasos

### Fase 2: Dashboard de Progreso
- Integrar Chart.js para visualizar:
  - Línea: Repeticiones por sesión
  - Barras: Velocidad promedio
  - Gauge: Progreso actual vs objetivo
  - Heatmap: Ubicaciones de dolor

### Fase 3: Machine Learning
- Predictor de riesgo de dolor
- Recomendador automático de velocidad
- Adaptación de objetivos basada en historial

### Fase 4: Inteligencia Clínica
- Alertas al terapeuta si se detectan patrones anormales
- Sugerencias de plan terapéutico siguiente
- Exportación de datos para análisis médico

---

## Debugging y Logs

### Consola Browser (F12)
```javascript
// Ver logs de velocidad
console.log('⚡ Velocidad actualizada: 7/10')

// Ver logs de objetivo
console.log('🎯 Objetivo actualizado: 20 reps')

// Ver logs de dolor
console.log('📍 Dolor registrado: 6/10 - codo')

// Ver todos los comandos ESP32 enviados
// Buscar en consola: "📤 ESP32 ←"
```

### Base de Datos (IndexedDB)
```javascript
// En consola DevTools:
dbManager.db.objectStore('sesiones')
  .getAll().result[0]
// Verificar campos: objetivoReps, velocidadPromed, eventosDolor
```

---

## Documentación de Referencia

- **VOICE_COMMANDS.md**: Guía completa de comandos y ejemplos
- **DATABASE_INTEGRATION.md**: Esquema y operaciones de BD
- **test-voice-commands.html**: Herramienta interactiva de pruebas
- **app.js**: Controladores y flujo de ejecución (línea ~290+)
- **nlp.js**: Motor NLP con métodos de extracción (línea ~400+)
- **database.js**: Operaciones de persistencia (línea ~200+)

---

**Actualizado:** 2024
**Estado:** En Producción Beta
**Compilación:** Node v20.10.0 | Android API 34 | Capacitor 8.3.1
