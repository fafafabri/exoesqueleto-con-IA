# 🗄️ Integración de SQLite/IndexedDB en Alma

## Resumen

Se ha integrado un sistema robusto de **persistencia de datos** usando **IndexedDB** (base de datos nativa del navegador web/Android). Esto permite guardar todas las sesiones de terapia, repeticiones, interacciones NLP y datos del paciente.

---

## 🏗️ Arquitectura de la Base de Datos

### Object Stores (Tablas)

| Store | Propósito | Campos Clave |
|-------|----------|--------------|
| **sesiones** | Registra cada sesión de terapia | `id`, `pacienteId`, `fecha`, `estado`, `repeticiones` |
| **repeticiones** | Detalle de cada repetición | `id`, `sesionId`, `numero`, `angle`, `timestamp` |
| **pacientes** | Información del paciente | `id`, `nombre`, `edad`, `diagnostico`, `objetivoRepeticiones` |
| **interacciones** | Registro de comandos NLP | `id`, `sesionId`, `intencion`, `confianza`, `sentimiento` |
| **notasClinicas** | Observaciones del terapeuta/sistema | `id`, `sesionId`, `tipo`, `contenido` |

---

## 📊 Flujo de Datos

```
Usuario inicia sesión
    ↓
[app.js → startSession()]
    ↓
dbManager.crearSesion() → Crea registro en "sesiones"
    ↓
Usuario habla → NLP analiza → analizarConNLP()
    ↓
dbManager.guardarInteraccion() → Guarda en "interacciones"
    ↓
Usuario realiza repetición → actualizarPanelClinico()
    ↓
dbManager.guardarRepeticion() → Guarda en "repeticiones"
    ↓
Usuario termina sesión
    ↓
dbManager.finalizarSesion() → Calcula estadísticas
    ↓
Datos persistidos en IndexedDB ✅
```

---

## 💻 Uso en el Código

### 1. Inicializar el Manager

```javascript
// En app.js - Automoática en DOMContentLoaded
dbManager = new DatabaseManager();
```

### 2. Guardar Paciente

```javascript
await dbManager.guardarPaciente({
    id: 'paciente_001',
    nombre: 'Juan García',
    edad: 45,
    diagnostico: 'Lesión de hombro',
    objetivoRepeticiones: 15
});
```

### 3. Crear Sesión

```javascript
const sesion = await dbManager.crearSesion({
    pacienteId: 'paciente_001',
    notas: 'Sesión iniciada'
});
// Retorna objeto con id, fecha, estado, etc.
sesionActualId = sesion.id; // Guardar para usar después
```

### 4. Guardar Repetición

```javascript
await dbManager.guardarRepeticion(sesionActualId, {
    numero: 1,
    angle: 45,
    maxAngleAlcanzado: 45,
    esfuerzo: 'normal'
});
```

### 5. Guardar Interacción NLP

```javascript
await dbManager.guardarInteraccion(sesionActualId, {
    textoUsuario: 'siguiente flexión',
    intencion: 'FLEXION',
    confianza: 0.95,
    sentimiento: 'positivo',
    respuestaAlma: 'Perfecto, continuamos...',
    accion: 'FLEXION'
});
```

### 6. Finalizar Sesión

```javascript
const sesionFinal = await dbManager.finalizarSesion(sesionActualId, {
    notas: 'Sesión completada',
    feedback: ['Buen progreso']
});
// Calcula automáticamente:
// - duración, repeticiones, maxAngle, promAngle, etc.
```

### 7. Obtener Estadísticas

```javascript
const stats = await dbManager.obtenerEstadisticasPaciente('paciente_001', 30);
// Retorna:
// {
//   totalSesiones: 5,
//   totalRepeticiones: 52,
//   promRepeticiones: 10,
//   maxAngleAlcanzado: 75,
//   tendencia: { cambioReps: '+15%', direccion: 'mejorando' }
// }
```

### 8. Exportar Datos (Backup)

```javascript
const datos = await dbManager.exportarDatos('paciente_001');
// Retorna JSON con todo el historial del paciente
// Se puede descargar o enviar a un servidor
```

---

## 🔌 Integración Automática en app.js

El sistema ya **guarda automáticamente** en los siguientes momentos:

| Evento | Qué se guarda |
|--------|--------------|
| `startSession()` | Se crea sesión en BD |
| Cada interacción NLP | Se guarda comando + intención + sentimiento |
| `actualizarPanelClinico()` | Se registra repetición con ángulo |
| Comando `TERMINAR` | Se finaliza sesión + se calculan estadísticas |

---

## 🧪 Pruebas

### Opción 1: Test Interactivo

Abre en el navegador:
```
test-database.html
```

Puedes:
- ✅ Crear pacientes
- ✅ Simular sesiones completas con 8 repeticiones
- ✅ Ver estadísticas de progreso
- ✅ Exportar datos en JSON
- ✅ Ver último acceso

### Opción 2: Consola del Navegador

```javascript
// Abrir DevTools (F12)

// Ver todas las sesiones
const sesiones = await dbManager.obtenerSesionesPaciente('paciente_001');
console.table(sesiones);

// Ver estadísticas
const stats = await dbManager.obtenerEstadisticasPaciente('paciente_001');
console.log(stats);

// Exportar y descargar
const datos = await dbManager.exportarDatos('paciente_001');
console.log(JSON.stringify(datos, null, 2));
```

---

## 📱 Almacenamiento en Diferentes Plataformas

| Plataforma | Límite | Comportamiento |
|-----------|--------|-----------------|
| **Navegador Web** | ~50MB | IndexedDB nativo ✅ |
| **Android (Capacitor)** | ~50MB | IndexedDB en WebView ✅ |
| **Sincronización Cloud** | Ilimitado | Necesita API backend |

---

## 🔒 Privacidad y Seguridad

- ✅ **Datos locales:** Todo se guarda en el dispositivo, NO en servidores
- ✅ **Privacidad:** Cumple GDPR - ningún dato sale del dispositivo sin consentimiento
- ⚠️ **Backup:** Los datos se pierden si se limpia storage del navegador
- 💡 **Solución:** Opción de exportar JSON para backup manual

---

## 🚀 Próximas Mejoras

1. **Sincronización con Backend**
   - API REST para subir datos al servidor
   - Copias de seguridad automáticas en la nube
   - Acceso multidispositivo

2. **Análisis Avanzado**
   - Algoritmos de tendencia más complejos
   - Predicción de recuperación
   - Detección de mesetas (no avanza)

3. **Reportes Clínicos**
   - PDF exportable
   - Gráficos de progreso
   - Comparativas con otros pacientes (anonimizadas)

4. **Integración con Wearables**
   - Smartwatch para captura de datos
   - Sensores de presión/movimiento

---

## 📝 Esquema Detallado

### Sesión
```javascript
{
    id: 1,                           // Auto-increment
    pacienteId: 'paciente_001',      // FK
    fecha: '2026-05-12T10:30:00',    // ISO string
    horaInicio: 1715496600000,       // Timestamp
    horaFin: 1715497800000,          // Timestamp
    duracion: 20,                     // minutos
    repeticiones: 8,                  // count
    maxAngle: 75,                     // grados
    minAngle: 40,
    promAngle: 62,
    estado: 'completada',             // activa|completada|pausada|cancelada
    notas: '',
    feedback: []
}
```

### Repetición
```javascript
{
    id: 1,
    sesionId: 1,                      // FK
    numero: 1,                        // Número de rep en la sesión
    timestamp: 1715496605000,
    angle: 45,                        // Ángulo actual
    maxAngleAlcanzado: 45,
    duracion: 8.5,                    // segundos
    esfuerzo: 'normal',               // bajo|normal|alto
    notas: ''
}
```

### Interacción NLP
```javascript
{
    id: 1,
    sesionId: 1,                      // FK
    timestamp: 1715496610000,
    textoUsuario: 'siguiente flexión',
    intencion: 'FLEXION',             // EMERGENCIA|FLEXION|REPOSO|PROGRESO|AJUSTES|TERMINAR
    confianza: 0.95,                  // 0-1
    sentimiento: 'positivo',          // positivo|negativo|neutral
    respuestaAlma: 'Perfecto, continuamos...',
    accion: 'FLEXION'                 // Acción ejecutada
}
```

---

## 🔧 Troubleshooting

### "Base de datos no inicializada"
- Espera a que termineready el `DOMContentLoaded`
- Verifica que `database.js` esté cargado antes que `app.js`

### "No se guardan los datos"
- Abre DevTools → Application → IndexedDB
- Verifica que existan los object stores
- Comprueba la cuota de almacenamiento

### "Eliminación de IndexedDB"
```javascript
// En consola del navegador
indexedDB.deleteDatabase('Alma_Rehabilitacion');
```

---

## 📞 Soporte

Para preguntas o problemas:
1. Verifica `test-database.html` para ejemplos de uso
2. Abre DevTools Console para ver logs
3. Revisa la estructura en Application → IndexedDB

---

**Última actualización:** 12 de mayo de 2026  
**Versión:** 1.0  
**Estado:** ✅ Producción
