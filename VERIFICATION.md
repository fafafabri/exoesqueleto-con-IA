# CHECKLIST DE VERIFICACIÓN - Backend + Frontend

## Precondiciones

- [ ] Node.js >= 16.0.0 instalado
- [ ] npm >= 8.0.0 disponible
- [ ] Puerto 3000 disponible (o alternativo configurado)
- [ ] Puerto 5000 disponible para frontend

## Verificación del Backend

### Instalación
- [ ] `backend/package.json` existe
- [ ] `npm install` completado sin errores en `backend/`
- [ ] `backend/node_modules/` creado

### Estructura
- [ ] `backend/server.js` existe (400+ líneas)
- [ ] `backend/routes.js` existe
- [ ] `backend/models/schemas.js` existe
- [ ] `backend/.env.example` existe

### Ejecución
- [ ] `npm start` en `backend/` sin errores
- [ ] Logs muestran puerto 3000 disponible
- [ ] Health check: `curl http://localhost:3000/api/health` retorna JSON válido

### Endpoints Verificados

```bash
# 1. Health
curl http://localhost:3000/api/health
# Esperado: {"status": "ok", ...}

# 2. Crear paciente
curl -X POST http://localhost:3000/api/pacientes \
  -H "Content-Type: application/json" \
  -d '{"id":"test_001","nombre":"Test","edad":45,"diagnostico":"test","objetivoRepeticiones":20}'
# Esperado: 201 Created con datos del paciente

# 3. Obtener paciente
curl http://localhost:3000/api/pacientes/test_001
# Esperado: 200 OK con datos

# 4. Crear sesión
curl -X POST http://localhost:3000/api/sesiones \
  -H "Content-Type: application/json" \
  -d '{"pacienteId":"test_001","objetivoReps":20}'
# Esperado: 201 Created con sesionId

# 5. Obtener estadísticas
curl http://localhost:3000/api/pacientes/test_001/estadisticas
# Esperado: 200 OK con estadísticas

# 6. Exportar datos
curl http://localhost:3000/api/pacientes/test_001/export
# Esperado: 200 OK con todos los datos
```

**Resultado**: [ ] Todos los endpoints responden correctamente

---

## Verificación del Frontend

### Archivos Modificados
- [ ] `www/app.js` incluye `syncManager` en:
  - [ ] `startSession()` - línea ~200
  - [ ] `procesarDolor()` - línea ~575
  - [ ] case `TERMINAR` - línea ~345
- [ ] `www/index.html` tiene script loading order correcto:
  ```html
  <script src="nlp.js"></script>
  <script src="database.js"></script>
  <script src="sync.js"></script>
  <script src="dashboard.js"></script>
  <script src="app.js"></script>
  ```
- [ ] `www/sync.js` existe (400+ líneas) ✅

### Instalación Frontend
- [ ] `npm install` completado en `Alma/`
- [ ] `npm start` ejecuta sin errores
- [ ] App abre en http://localhost:5000

### Verificación en Navegador

Abre DevTools (F12) y en Console:

```javascript
// 1. ¿Está el NLP cargado?
console.log(typeof nlpEngine);  // "object"

// 2. ¿Está syncManager cargado?
console.log(typeof syncManager);  // "object"

// 3. ¿Se puede conectar al backend?
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(d => console.log('Backend:', d.status));

// 4. ¿LocalStorage está limpio?
console.log(localStorage.getItem('syncQueue'));  // null o []

// 5. ¿IndexedDB está disponible?
console.log(typeof dbManager);  // "object"
```

**Resultado**: 
- [ ] Todos los objetos globales existen
- [ ] Conexión al backend funciona
- [ ] Storage limpio

---

## Prueba de Flujo Completo

### Test 1: Crear Sesión + Sincronizar

```javascript
// En DevTools Console
async function testSession() {
    const ses = await dbManager.crearSesion({
        pacienteId: 'test_001',
        notas: 'Test session'
    });
    console.log('Sesión creada:', ses.id);
    
    // Sincronizar
    if (syncManager.isOnline) {
        await syncManager.guardarSesion(ses, 'test_001');
        console.log('✅ Sincronizado');
    }
}
testSession();
```

**Esperado**:
- [ ] Sesión creada en IndexedDB
- [ ] Petición POST a `/api/sesiones`
- [ ] Backend responde con 201
- [ ] Log: "✅ Sincronizado"

### Test 2: Comando de Voz (Velocidad)

1. Haz clic en "Iniciar Sesión"
2. Di: "velocidad 7"
3. En DevTools:
   ```javascript
   console.log(localStorage.getItem('syncQueue'));
   ```

**Esperado**:
- [ ] Log en backend: "📊 Velocidad actualizada"
- [ ] Petición POST a `/api/sesiones/:id/velocidad`
- [ ] syncQueue permanece vacío (online)

### Test 3: Comando de Dolor

1. Di: "duele el hombro"
2. Verifica:
   ```javascript
   // Ver dolor registrado
   const db = await dbManager.db;
   const sesion = await db.get('sesiones', 'sesionId');
   console.log('Dolor eventos:', sesion.eventosDolor);
   ```

**Esperado**:
- [ ] Log en backend: "📍 Evento de dolor"
- [ ] Petición POST a `/api/sesiones/:id/dolor`
- [ ] Backend recibe intensidad y ubicación
- [ ] Si intensidad >= 7: Alerta enviada

### Test 4: Modo Offline

1. Abre DevTools → Network
2. Marca "Offline"
3. Di: "velocidad 5"
4. En Console:
   ```javascript
   console.log('SyncQueue:', syncManager.syncQueue);
   console.log('IsOnline:', syncManager.isOnline);
   ```

**Esperado**:
- [ ] syncManager.isOnline = false
- [ ] syncQueue contiene operación pendiente
- [ ] Dato guardado localmente en IndexedDB

### Test 5: Sincronización al Conectar

1. Con Network en Offline, di un comando más
2. Marca Network como "Online"
3. En Console:
   ```javascript
   await syncManager.sincronizarCola();
   console.log('SyncQueue después:', syncManager.syncQueue);
   ```

**Esperado**:
- [ ] syncManager.isOnline = true
- [ ] Batch de operaciones enviadas a `/api/sesiones`
- [ ] syncQueue vacío después
- [ ] Backend log: "✅ Sesión creada" x2

---

## Verificación de Datos

### En Backend (Terminal)

```bash
# Ver pacientes
curl http://localhost:3000/api/pacientes/test_001 | jq .

# Ver sesiones (de console en frontend, copia sesionId)
curl http://localhost:3000/api/sesiones/{sesionId} | jq .

# Ver alertas
curl http://localhost:3000/api/alertas/test_001 | jq .

# Ver estadísticas
curl http://localhost:3000/api/pacientes/test_001/estadisticas | jq .
```

**Resultado**: 
- [ ] Datos corresponden a acciones del frontend
- [ ] Timestamps correctos
- [ ] Integridad referencial (sesionId ↔ pacienteId)

---

## Verificación de Rendimiento

### Memory Leaks

En DevTools → Performance, ejecuta:

```javascript
// Crear 100 sesiones
async function stress() {
    for (let i = 0; i < 100; i++) {
        const s = await dbManager.crearSesion({
            pacienteId: `test_${i}`,
            notas: `Session ${i}`
        });
        await syncManager.guardarSesion(s, `test_${i}`);
    }
    console.log('✅ 100 sesiones creadas');
}
stress();
```

**Esperado**:
- [ ] Memoria no crece indefinidamente
- [ ] No hay advertencias en Console
- [ ] Charts todavía responden rápido

### LocalStorage Size

```javascript
function getLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        total += localStorage[key].length;
    }
    console.log(`LocalStorage: ${(total / 1024).toFixed(2)} KB`);
}
getLocalStorageSize();
```

**Esperado**:
- [ ] < 5 MB (sincronizar regularmente para liberar)
- [ ] syncQueue no crece indefinidamente

---

## Estado de Producción

### Antes de Desplegar

- [ ] Cambiar `serverUrl` a dominio real
- [ ] Configurar CORS en backend
- [ ] Agregar autenticación JWT
- [ ] Setup base de datos MongoDB
- [ ] Habilitar HTTPS/SSL
- [ ] Configurar backups automáticos
- [ ] Agregar logging centralizado
- [ ] Configurar alertas de monitoreo

### Checklist de Seguridad

- [ ] ¿Credenciales de BD fuera de código?
- [ ] ¿JWT tokens con tiempo de expiración?
- [ ] ¿Validación de entrada en todos los endpoints?
- [ ] ¿Rate limiting en API?
- [ ] ¿HTTPS solo en producción?

---

## Resumen

**Backend**: ✅ / ❌  
**Frontend**: ✅ / ❌  
**Integración**: ✅ / ❌  
**Sincronización**: ✅ / ❌  

**Críticos**:
1. [ ] Backend ejecutándose
2. [ ] Health check exitoso
3. [ ] syncManager cargado en frontend
4. [ ] Al menos 1 paciente creado en backend
5. [ ] Sesión creada en frontend se sincroniza

---

Si todos los items están marcados como ✅, **¡El sistema está listo para usar!**

Para debugging adicional, ver: `INTEGRATION.md`
