# Comandos de Voz Alma - Control Dinámico de Sesiones

## Descripción General

Los nuevos comandos de voz permiten al paciente controlar parámetros clave de la sesión de terapia en tiempo real, completamente por voz. El sistema detecta automáticamente la intención y modifica el comportamiento del exoesqueleto.

---

## 1. Comando VELOCIDAD (Nuevo)

**Propósito:** Ajustar la velocidad de movimiento de 1 a 10.

**Ejemplos de comandos:**
- "Alma, velocidad 5"
- "Velocidad 7"
- "Ritmo 3"
- "Más rápido, velocidad 8"
- "Reducir a velocidad 2"

**Procesamiento:**
1. El motor NLP detecta patrón: `velocidad\s+(\d+)` o `ritmo\s+(\d+)`
2. Extrae número (1-10) mediante `extraerVelocidad(texto)`
3. Si es válido, llama a `procesarComandoVelocidad(velocidad)`
4. Envía al ESP32: `VELOCIDAD:N` (donde N = 1-10)
5. Guarda en BD sesión: `velocidadesUsadas`, `velocidadPromed`
6. Responde con feedback contextual al usuario

**Rangos de velocidad:**
| Velocidad | Descripción | Caso de Uso |
|-----------|------------|-----------|
| 1-2 | Muy lento | Rehabilitación de movimientos finos, máximo control |
| 3-4 | Lento | Recuperación temprana, dolor presente |
| 5 | Normal | Defecto, balance velocidad-control |
| 6-7 | Rápido | Entrenamiento funcional |
| 8-10 | Muy rápido | Ejercicio intenso, bajo riesgo de lesión |

**Respuesta del sistema:**
- Velocidad 1: "Movimiento muy lento. Perfecto para máxima precisión."
- Velocidad 3: "Velocidad baja. Control total del movimiento."
- Velocidad 5: "Velocidad normal. Balance entre velocidad y control."
- Velocidad 7: "Velocidad rápida. Ritmo acelerado."
- Velocidad 10: "Velocidad máxima. ¡Mucho cuidado!"

---

## 2. Comando OBJETIVO (Nuevo)

**Propósito:** Especificar cuántas repeticiones desea hacer en la sesión actual.

**Ejemplos de comandos:**
- "Quiero 20 flexiones"
- "Objetivo 15 repeticiones"
- "Haz 25 reps conmigo"
- "Meta de 30 flexiones"
- "Repitamos 12 veces"

**Procesamiento:**
1. Detecta palabras clave: "quiero", "objetivo", "meta", "hazme", "deseo"
2. Busca patrón: `(\d+)\s*(flexiones|repeticiones|reps|veces)`
3. Extrae número mediante `extraerObjetivo(texto)`
4. Si es válido (1-100), llama a `procesarComandoObjetivo(objetivo)`
5. Actualiza BD sesión: `objetivoReps`
6. Modifica feedback UI para mostrar progreso vs objetivo

**Validación:**
- Mínimo: 1 repetición
- Máximo: 100 repeticiones
- Si está fuera de rango: solicita aclaración

**Respuesta del sistema:**
- Objetivo < 5: "Objetivo ajustado a {N} repeticiones. Vamos paso a paso."
- Objetivo 5-15: "Excelente meta: {N} repeticiones. ¡Podemos lograrlo!"
- Objetivo > 15: "¡Objetivo ambicioso! {N} repeticiones. Te voy a ayudar a alcanzarlo."

**Seguimiento en sesión:**
El panel clínico ahora muestra: `X de {objetivo} repeticiones`
Ejemplo: "5 de 20 repeticiones completadas"

---

## 3. Comando DOLOR/MOLESTIA (Nuevo)

**Propósito:** Reportar dolor o molestia para que el sistema regule automáticamente la intensidad.

**Ejemplos de comandos:**
- "Me duele el brazo"
- "Molestia en el codo, nivel 7"
- "Ardor en la articulación"
- "Duele mucho el hombro"
- "Pinchazos en el antebrazo, intensidad 4"

**Procesamiento:**
1. Detecta palabras de dolor: "duele", "dolor", "molestia", "ardor", "pinchazos", "incomodidad"
2. Busca número (1-10) para intensidad: `(\d+)(?:\s*de\s*10|\s*sobre\s*10)?`
3. Identifica ubicación: "hombro", "codo", "muñeca", "brazo", "articulación", "músculo"
4. Llama a `procesarDolor(evaluacionDolor)`
5. Registra evento en BD: `eventosDolor`
6. Adapta comportamiento según intensidad

**Respuesta automática por intensidad:**

| Intensidad | Acción | Respuesta |
|-----------|--------|----------|
| 1-3 | Monitorear | "Entendido, hay una leve molestia. Continuaremos con cuidado." |
| 4-5 | Pausa | "Vamos a hacer una pausa. Respira profundo." |
| 6-7 | Reducir velocidad | "Reduciendo velocidad y dificultad para tu comodidad." |
| 8-10 | EMERGENCIA | "¡ATENCIÓN! Deteniendo ejercicio inmediatamente." |

**Efectos en tiempo real:**
- Intensidad ≥ 8: Envía `EMERGENCIA` al ESP32
- Intensidad 6-7: Envía `VELOCIDAD:3` (muy baja)
- Intensidad 4-5: Envía `REPOSO`
- Intensidad 1-3: Continúa monitoreando

**Datos almacenados:**
```javascript
{
  timestamp: 1234567890,
  repeticionActual: 5,
  anguloEnMomento: 45,
  intensidad: 7,
  ubicacion: "codo",
  notas: "Dolor durante flexión"
}
```

---

## 4. Detección Automática de Negación

**Propósito:** Evitar falsas alarmas cuando el usuario niega dolor.

**Ejemplos:**
- "No duele" → No registra como emergencia
- "No me molesta" → Continúa normally
- "Sin dolor" → Interpreta como confirmación de bienestar

**Cómo funciona:** El método `detectarNegacion(texto)` busca palabras como "no", "sin", "nunca" antes de indicadores de dolor.

---

## 5. Flujo de Sesión Completa con Nuevos Comandos

```
1. Inicio:
   Usuario: "Alma, conecta"
   → Búsqueda de dispositivos BLE

2. Inicio sesión:
   Usuario: "Inicia sesión"
   → Crea sesión en BD, inicia tracking

3. Configurar parámetros:
   Usuario: "Velocidad 6"
   → Establece velocidad a 6/10
   
   Usuario: "Quiero 20 flexiones"
   → Establece objetivo a 20 reps
   → Panel muestra "0 de 20"

4. Ejercicio:
   Usuario: "Siguiente"
   → Ejecuta flexión a velocidad 6
   → Panel muestra "1 de 20"
   
5. Feedback de dolor (opcional):
   Usuario: "Un poco de molestia en el codo"
   → Registra: intensidad ~5, ubicación "codo"
   → Reduce velocidad automáticamente a 3/10
   → Panel muestra alerta

6. Finalizar:
   Usuario: "Adiós" o al alcanzar objetivo
   → Finaliza sesión, calcula estadísticas
   → Muestra resumen: 20 reps, velocidad promedio 5.2, sin dolor extremo
```

---

## 6. Almacenamiento en Base de Datos

### Sesiones (expandido)
```javascript
{
  id: 1,
  objetivoReps: 20,           // NUEVO
  velocidadPromed: 5.2,       // NUEVO
  velocidadMin: 3,            // NUEVO
  velocidadMax: 7,            // NUEVO
  velocidadesUsadas: [6,6,6,5,5,4,3,3], // NUEVO
  eventosDolor: [             // NUEVO
    { timestamp, intensidad, ubicacion, anguloEnMomento }
  ]
}
```

### Repeticiones (expandido)
```javascript
{
  id: 1,
  sesionId: 1,
  numero: 5,
  velocidad: 6,               // NUEVO
  conDolor: false,            // NUEVO
  intensidadDolor: 0,         // NUEVO
  angle: 45,
  duracion: 3
}
```

---

## 7. Métodos del NLP Engine Utilizados

```javascript
// En nlp.js

// Extraer velocidad 1-10
extraerVelocidad(texto)
// → Retorna: number (1-10) o null

// Extraer objetivo de reps
extraerObjetivo(texto)  
// → Retorna: number (1-100) o null

// Evaluar dolor/molestia
evaluarDolor(texto)
// → Retorna: { tieneDolor, intensidad (0-10), ubicacion }

// Detectar negación
detectarNegacion(texto)
// → Retorna: boolean
```

---

## 8. Métodos del Database Manager Utilizados

```javascript
// En database.js

// Actualizar objetivo durante sesión
actualizarObjetivoSesion(sesionId, nuevoObjetivo)

// Actualizar velocidad durante sesión
actualizarVelocidadSesion(sesionId, velocidad)

// Registrar evento de dolor
registrarDolor(sesionId, datos)

// Guardar repetición (mejorado)
guardarRepeticion(sesionId, {
  velocidad,      // NUEVO
  conDolor,       // NUEVO
  intensidadDolor // NUEVO
})
```

---

## 9. Pruebas Recomendadas

### Test 1: Velocidad
```
1. Conectar dispositivo
2. Iniciar sesión
3. Decir: "Velocidad 7"
4. Verificar en consola: ⚡ Velocidad actualizada: 7/10
5. Verificar BD: velocidadesUsadas contiene 7
```

### Test 2: Objetivo
```
1. Conectar y iniciar sesión
2. Decir: "Quiero 15 flexiones"
3. Verificar en BD: objetivoReps = 15
4. Panel debe mostrar: "0 de 15"
5. Ejecutar 5 flexiones, verificar: "5 de 15"
```

### Test 3: Dolor
```
1. Durante sesión, decir: "Duele el codo, 6"
2. Verificar en consola: 📍 Dolor registrado: 6/10 - codo
3. Verificar ESP32 recibe: VELOCIDAD:3
4. Verificar BD: eventosDolor contiene el registro
```

### Test 4: Negación
```
1. Durante sesión, decir: "No duele"
2. Verificar que NO activa EMERGENCIA
3. Continúa normalmente
```

---

## 10. Limitaciones Actuales y Mejoras Futuras

### Actual
✅ Detección de intención por voz en español
✅ Extracción de parámetros numéricos
✅ Comunicación con ESP32 mejorada
✅ Almacenamiento persistente en BD
✅ Respuestas contextuales al usuario

### Mejoras Futuras
- [ ] Soporte para otros idiomas
- [ ] Predicción de dolor basada en patrón histórico
- [ ] Ajuste automático de velocidad por máquina de aprendizaje
- [ ] Integración con sensores de presión/ángulo en real-time
- [ ] Alertas al terapeuta si se detectan patrones de dolor
- [ ] Recomendaciones de sesión siguiente basadas en sesión anterior

---

## 11. Referencias

- **nlp.js**: Motor NLP con métodos extraerVelocidad(), extraerObjetivo(), evaluarDolor()
- **database.js**: BD con actualizarObjetivoSesion(), actualizarVelocidadSesion(), registrarDolor()
- **app.js**: Controladores procesarComandoVelocidad(), procesarComandoObjetivo(), procesarDolor()
- **index.html**: UI actualizado para mostrar objetivo en tiempo real
