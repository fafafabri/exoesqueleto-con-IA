# Características Avanzadas - ML, Multi-idioma y Dashboard

## 1. Dashboard de Progreso con Chart.js

### ✅ Implementado

**Ubicación:** `www/dashboard.js`

**Gráficos incluidos:**

#### 1.1 Gráfico de Velocidad (Line Chart)
- **Tipo:** Línea con puntos
- **Datos:** Velocidad promedio por sesión (últimas 30 días)
- **Uso:** Visualizar tendencia de velocidad
- **Rango:** 1-10

```javascript
// En dashboard.js
actualizarGraficoVelocidad(sesiones)
// Genera Chart.js con datos de velocidadPromed de cada sesión
```

#### 1.2 Progreso vs Objetivo (Doughnut Chart)
- **Tipo:** Gráfico de anillo
- **Datos:** Repeticiones completadas vs pendientes
- **Actualización:** En tiempo real
- **Muestra:** Porcentaje visual

```javascript
actualizarGraficoProgreso(sesiones)
// Última sesión: X de Y repeticiones completadas
```

#### 1.3 Historial de Dolor
- **Tipo:** Tabla/Resumen
- **Datos:** Ubicaciones afectadas, eventos totales, intensidad máxima
- **Análisis:** Agrupación por ubicación corporal

```javascript
actualizarHistorialDolor(sesiones)
// Muestra: eventos totales, intensidad máxima, ubicaciones con dolor
```

### Acceso en la App

```
Pulsa botón 📊 → Panel de Progreso
├─ Estadísticas rápidas (Reps, Ángulo)
├─ Gráfico de Progreso (Doughnut)
├─ Gráfico de Velocidad (Line)
├─ Historial de Dolor
└─ Recomendaciones IA (ML Simple)
```

---

## 2. Machine Learning Simple (Sin Librerías Externas)

### ✅ Predictor de Riesgo de Dolor

**Método:** Análisis histórico + reglas adaptativas

**Ubicación:** `database.js` → `predecirRiesgoDolor(pacienteId)`

**Algoritmo:**
```javascript
1. Analizar últimas 5 sesiones
2. Buscar eventosDolor en cada sesión
3. Calcular intensidad promedio de dolor
4. Si intensidad >= 7 → Riesgo ALTO
5. Si intensidad 4-6 → Riesgo MEDIO
6. Si intensidad < 4 → Riesgo BAJO
7. Considerar velocidades altas (+20% riesgo)
```

**Ejemplo de uso:**
```javascript
const riesgo = await dbManager.predecirRiesgoDolor('paciente_001');
// Retorna: { riesgo: 'medio', confianza: 0.65, razon: 'Historial de dolor moderado' }
```

**Confianza:** 0-1 (basada en intensidad promedio)

---

### ✅ Recomendador Adaptativo de Velocidad

**Ubicación:** `database.js` → `recomendarVelocidad(pacienteId)`

**Lógica:**
```
SI último sesión tiene dolor intenso:
  → Recomendación = velocidadActual - 2 (mínimo 1)
  → Razon = "Reducida por dolor detectado"

SI completó objetivo sin problemas:
  → Recomendación = velocidadActual + 1 (máximo 10)
  → Razon = "Aumentada por buen desempeño"

SI fue muy lenta (≤3):
  → Recomendación = velocidadActual + 1
  → Razon = "Aumento gradual para progreso"

DEFECTO:
  → Recomendación = 5
```

**Ejemplo:**
```javascript
const vel = await dbManager.recomendarVelocidad('paciente_001');
// { velocidadSugerida: 6, razon: 'Aumentada por buen desempeño' }
```

---

### ✅ Plan Terapéutico Sugerido

**Ubicación:** `database.js` → `sugerirPlanTerapeutico(pacienteId)`

**Retorna:**
```javascript
{
  fecha: "2026-05-12T10:30:00Z",
  resumen: "Progreso positivo detectado",
  recomendaciones: [
    "Mantén el ritmo de sesiones",
    "Considera aumentar objetivo"
  ],
  proximaSesion: {
    velocidad: 6,
    razon: "Aumentada por buen desempeño"
  }
}
```

**Lógica:**
1. Analizar últimas 30 días
2. Calcular tendencia (reps iniciales vs finales)
3. Considerar riesgo de dolor
4. Generar recomendaciones personalizadas

---

## 3. Multi-idioma

### ✅ Idiomas Soportados

1. **Español (es)** - Por defecto
2. **English (en)** - Nuevo
3. **Português (pt)** - Nuevo

### Métodos en NLP Engine

```javascript
// Cambiar idioma
nlpEngine.establecerIdioma('en')  // Cambia a English
nlpEngine.establecerIdioma('pt')  // Cambia a Português

// Detectar idioma automático
const idioma = nlpEngine.detectarIdioma("speed 5 velocity")  // → 'en'

// Generar respuesta en idioma específico
const respuesta = nlpEngine.generarRespuestaIdioma('FLEXION', 'en')
// → "Let's do the next flex"
```

### Ejemplos de Entrenamiento

**Spanish:**
```
"velocidad 5" → VELOCIDAD
"quiero 20 flexiones" → OBJETIVO
"duele el codo" → EMERGENCIA
```

**English:**
```
"speed 5" → VELOCIDAD
"I want 20 reps" → OBJETIVO
"my arm hurts" → EMERGENCIA
```

**Portuguese:**
```
"velocidade 5" → VELOCIDAD
"quero 20 repetições" → OBJETIVO
"dói o braço" → EMERGENCIA
```

### Integración en UI

**En index.html** (futuro):
```html
<!-- Selector de idioma -->
<button onclick="cambiarIdioma('es')">🇪🇸 Español</button>
<button onclick="cambiarIdioma('en')">🇬🇧 English</button>
<button onclick="cambiarIdioma('pt')">🇧🇷 Português</button>
```

**En app.js:**
```javascript
function cambiarIdioma(idioma) {
    nlpEngine.establecerIdioma(idioma);
    localStorage.setItem('almaIdioma', idioma);
    speak("Idioma cambiado a " + idioma);
}
```

### Detección Automática

```javascript
// El sistema detecta automáticamente el idioma
const texto = "speed 7 and I want 15 reps";
const idioma = nlpEngine.detectarIdioma(texto);  // → 'en'
```

---

## 4. Recomendaciones Visuales en Dashboard

### Panel de Recomendaciones

Ubicado en `progressSheet` → Sección "💡 Recomendaciones Alma"

**Muestra:**
- 🎯 Objetivos sugeridos
- ⚡ Ajustes de velocidad
- 📈 Tendencias de progreso
- 📍 Advertencias de dolor

**Ejemplo:**
```
⚡ Buena recuperación con velocidad baja. 
   Próxima sesión: intenta velocidad 4-5.

🎯 ¡Completaste tu objetivo de 20! 
   Aumenta a 25 próxima vez.

📈 5 sesiones completadas. 
   ¡Vas muy bien! Mantén la consistencia.
```

---

## 5. Flujo Completo con ML

```
Inicio Sesión
    ↓
Ejecutar repeticiones
    ↓
Reportar dolor (opcional)
    ↓
predecirRiesgoDolor() → Analiza historial
    ↓
Final de Sesión
    ↓
sugerirPlanTerapeutico()
    ├→ Calcular tendencia
    ├→ recomendarVelocidad()
    ├→ Generar recomendaciones
    └→ speak() a usuario
    ↓
Actualizar Dashboard
    ├→ Gráficos nuevos
    └→ Mostrar recomendaciones
```

---

## 6. Almacenamiento de Modelos

**Ubicación:** IndexedDB + LocalStorage

```javascript
// Preferencias de usuario
localStorage.setItem('almaIdioma', 'es')
localStorage.setItem('almaVelocidadPref', '6')

// Datos históricos
dbManager.db (IndexedDB)
├─ sesiones[]
├─ repeticiones[]
├─ eventosDolor[]
└─ pacientes[]
```

---

## 7. Limitaciones y Futuras Mejoras

### Actual ✅
- Predicción basada en reglas simples
- Recomendaciones determinísticas
- Idiomas con entrenamiento manual
- Análisis de últimas N sesiones

### Futuro 🔄
- [ ] Machine Learning real (Tensorflow.js)
- [ ] Redes neuronales para predicción
- [ ] Traducción automática (Google Translate API)
- [ ] Sincronización con servidor backend
- [ ] Análisis de patrones avanzados
- [ ] Alerts automáticas al terapeuta

---

## 8. Testing

### Test Interactivo
Archivo: `www/test-voice-commands.html`

Prueba los comandos con diferentes idiomas:
```
1. Abre test-voice-commands.html
2. En análisis completo, ingresa:
   - "speed 7" (English)
   - "velocidade 5" (Portuguese)
   - "velocidad 6" (Español)
3. Verifica detección de idioma
```

### Test de Predicciones
```javascript
// En consola:
dbManager.predecirRiesgoDolor('paciente_001')
  .then(r => console.log(r))

dbManager.recomendarVelocidad('paciente_001')
  .then(v => console.log(v))

dbManager.sugerirPlanTerapeutico('paciente_001')
  .then(p => console.log(p))
```

---

## 9. Resumen de Cambios

### Archivos Modificados

1. **index.html**
   - Ampliado `progressSheet` con gráficos Chart.js
   - Agregadas secciones para dolor y recomendaciones

2. **dashboard.js** (NUEVO)
   - Gestor de gráficos con Chart.js
   - 3 gráficos principales
   - Recomendaciones personalizadas

3. **nlp.js**
   - `establecerIdioma()` - Cambiar idioma
   - `entrenarEnglish()` - Ejemplos en English
   - `entrenarPortuguese()` - Ejemplos en Portuguese
   - `detectarIdioma()` - Detección automática
   - `generarRespuestaIdioma()` - Respuestas multiidioma

4. **database.js**
   - `predecirRiesgoDolor()` - Predictor ML
   - `recomendarVelocidad()` - Recomendador adaptativo
   - `sugerirPlanTerapeutico()` - Generador de planes

5. **app.js**
   - Integración con Dashboard en tiempo real
   - ML predictor en `procesarDolor()`
   - Recomendaciones en fin de sesión

---

## 10. Métricas de Éxito

✅ **Dashboard funcional** - Gráficos en tiempo real  
✅ **ML operativo** - Predicciones generadas  
✅ **Multi-idioma básico** - 3 idiomas detectados  
✅ **Recomendaciones personalizadas** - Adaptadas al usuario  
✅ **Sin dependencias externas** - Solo Chart.js (CDN)  

**Token de operación:** ~4 horas de desarrollo completadas ✓
