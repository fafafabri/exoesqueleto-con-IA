// =========================================================================
// DATABASE MODULE - Persistencia de Sesiones de Pacientes con IndexedDB
// =========================================================================
// Este módulo gestiona todo el almacenamiento de datos del paciente:
// - Sesiones de terapia
// - Progreso y repeticiones
// - Ángulos articulares
// - Historial de comandos
// - Timestamps y notas clínicas

class DatabaseManager {
    constructor() {
        this.dbName = 'Alma_Rehabilitacion';
        this.dbVersion = 1;
        this.db = null;
        this.ready = false;
        
        // Inicializar la BD al crear la instancia
        this.inicializar();
    }

    /**
     * Inicializar la base de datos con schema
     */
    async inicializar() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            // Crear o actualizar schema
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Object Store: Sesiones de Terapia
                if (!db.objectStoreNames.contains('sesiones')) {
                    const sesionesStore = db.createObjectStore('sesiones', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    sesionesStore.createIndex('fecha', 'fecha', { unique: false });
                    sesionesStore.createIndex('pacienteId', 'pacienteId', { unique: false });
                    sesionesStore.createIndex('estado', 'estado', { unique: false });
                    console.log('✅ Object Store "sesiones" creado');
                }

                // Object Store: Repeticiones por Sesión
                if (!db.objectStoreNames.contains('repeticiones')) {
                    const repeticionesStore = db.createObjectStore('repeticiones', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    repeticionesStore.createIndex('sesionId', 'sesionId', { unique: false });
                    repeticionesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('✅ Object Store "repeticiones" creado');
                }

                // Object Store: Datos de Paciente
                if (!db.objectStoreNames.contains('pacientes')) {
                    const pacientesStore = db.createObjectStore('pacientes', { 
                        keyPath: 'id' 
                    });
                    pacientesStore.createIndex('nombre', 'nombre', { unique: false });
                    console.log('✅ Object Store "pacientes" creado');
                }

                // Object Store: Interacciones NLP (para aprendizaje)
                if (!db.objectStoreNames.contains('interacciones')) {
                    const interaccionesStore = db.createObjectStore('interacciones', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    interaccionesStore.createIndex('sesionId', 'sesionId', { unique: false });
                    interaccionesStore.createIndex('intencion', 'intencion', { unique: false });
                    interaccionesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('✅ Object Store "interacciones" creado');
                }

                // Object Store: Notas Clínicas
                if (!db.objectStoreNames.contains('notasClinicas')) {
                    const notasStore = db.createObjectStore('notasClinicas', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    notasStore.createIndex('sesionId', 'sesionId', { unique: false });
                    notasStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('✅ Object Store "notasClinicas" creado');
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.ready = true;
                console.log('✅ Base de datos Alma inicializada correctamente');
                resolve(this.db);
            };

            request.onerror = () => {
                console.error('❌ Error al abrir la BD:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Crear o actualizar paciente
     */
    async guardarPaciente(paciente) {
        if (!this.ready) await this.inicializar();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pacientes'], 'readwrite');
            const store = transaction.objectStore('pacientes');
            
            const pacienteCompleto = {
                id: paciente.id || 'paciente_001',
                nombre: paciente.nombre || 'Usuario',
                edad: paciente.edad || null,
                diagnostico: paciente.diagnostico || '',
                fechaRegistro: paciente.fechaRegistro || new Date().toISOString(),
                objetivoRepeticiones: paciente.objetivoRepeticiones || 10,
                notas: paciente.notas || '',
                ...paciente
            };

            const request = store.put(pacienteCompleto);

            request.onsuccess = () => {
                console.log(`✅ Paciente "${pacienteCompleto.nombre}" guardado`);
                resolve(pacienteCompleto);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtener datos del paciente
     */
    async obtenerPaciente(pacienteId) {
        if (!this.ready) await this.inicializar();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pacientes'], 'readonly');
            const store = transaction.objectStore('pacientes');
            const request = store.get(pacienteId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Crear una nueva sesión de terapia
     */
    async crearSesion(datos) {
        if (!this.ready) await this.inicializar();
        
        const sesion = {
            pacienteId: datos.pacienteId || 'paciente_001',
            fecha: new Date().toISOString(),
            horaInicio: new Date().getTime(),
            horaFin: null,
            duracion: 0, // en minutos
            repeticiones: 0,
            maxAngle: 0,
            minAngle: 0,
            promAngle: 0,
            estado: 'activa', // activa, completada, pausada, cancelada
            notas: datos.notas || '',
            feedback: [],
            interacciones: [] // Almacenar IDs de interacciones NLP
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sesiones'], 'readwrite');
            const store = transaction.objectStore('sesiones');
            const request = store.add(sesion);

            request.onsuccess = () => {
                const sesionId = request.result;
                console.log(`✅ Sesión ${sesionId} creada`);
                resolve({ ...sesion, id: sesionId });
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Guardar repetición durante la sesión
     */
    async guardarRepeticion(sesionId, datos) {
        if (!this.ready) await this.inicializar();
        
        const repeticion = {
            sesionId: sesionId,
            numero: datos.numero || 1,
            timestamp: new Date().getTime(),
            angle: datos.angle || 0,
            maxAngleAlcanzado: datos.maxAngleAlcanzado || 0,
            duracion: datos.duracion || 0, // en segundos
            esfuerzo: datos.esfuerzo || 'normal', // bajo, normal, alto
            notas: datos.notas || ''
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['repeticiones'], 'readwrite');
            const store = transaction.objectStore('repeticiones');
            const request = store.add(repeticion);

            request.onsuccess = () => {
                console.log(`✅ Repetición #${repeticion.numero} guardada`);
                resolve({ ...repeticion, id: request.result });
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtener todas las repeticiones de una sesión
     */
    async obtenerRepeticionesSesion(sesionId) {
        if (!this.ready) await this.inicializar();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['repeticiones'], 'readonly');
            const store = transaction.objectStore('repeticiones');
            const index = store.index('sesionId');
            const request = index.getAll(sesionId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Finalizar sesión
     */
    async finalizarSesion(sesionId, datos) {
        if (!this.ready) await this.inicializar();
        
        return new Promise(async (resolve, reject) => {
            try {
                // Obtener la sesión actual
                const sesion = await this.obtenerSesion(sesionId);
                
                // Obtener todas las repeticiones
                const repeticiones = await this.obtenerRepeticionesSesion(sesionId);

                // Calcular estadísticas
                const duracionMs = new Date().getTime() - sesion.horaInicio;
                const duracionMin = Math.round(duracionMs / 1000 / 60);
                
                const angles = repeticiones.map(r => r.angle).filter(a => a > 0);
                const maxAngle = Math.max(...angles, 0);
                const minAngle = Math.min(...angles, 0);
                const promAngle = angles.length > 0 ? Math.round(angles.reduce((a, b) => a + b, 0) / angles.length) : 0;

                // Actualizar sesión
                const sesionFinalizada = {
                    ...sesion,
                    id: sesionId,
                    horaFin: new Date().getTime(),
                    duracion: duracionMin,
                    repeticiones: repeticiones.length,
                    maxAngle: maxAngle,
                    minAngle: minAngle,
                    promAngle: promAngle,
                    estado: 'completada',
                    notas: datos.notas || '',
                    feedback: datos.feedback || []
                };

                const transaction = this.db.transaction(['sesiones'], 'readwrite');
                const store = transaction.objectStore('sesiones');
                const request = store.put(sesionFinalizada);

                request.onsuccess = () => {
                    console.log(`✅ Sesión ${sesionId} finalizada - ${repeticiones.length} reps en ${duracionMin} min`);
                    resolve(sesionFinalizada);
                };

                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Obtener una sesión específica
     */
    async obtenerSesion(sesionId) {
        if (!this.ready) await this.inicializar();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sesiones'], 'readonly');
            const store = transaction.objectStore('sesiones');
            const request = store.get(sesionId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtener todas las sesiones de un paciente
     */
    async obtenerSesionesPaciente(pacienteId) {
        if (!this.ready) await this.inicializar();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sesiones'], 'readonly');
            const store = transaction.objectStore('sesiones');
            const index = store.index('pacienteId');
            const request = index.getAll(pacienteId);

            request.onsuccess = () => {
                // Ordenar por fecha descendente
                const sesiones = request.result.sort((a, b) => 
                    new Date(b.fecha) - new Date(a.fecha)
                );
                resolve(sesiones);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Guardar interacción NLP
     */
    async guardarInteraccion(sesionId, datos) {
        if (!this.ready) await this.inicializar();
        
        const interaccion = {
            sesionId: sesionId,
            timestamp: new Date().getTime(),
            textoUsuario: datos.textoUsuario || '',
            intencion: datos.intencion || null,
            confianza: datos.confianza || 0,
            sentimiento: datos.sentimiento || 'neutral',
            respuestaAlma: datos.respuestaAlma || '',
            accion: datos.accion || null
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['interacciones'], 'readwrite');
            const store = transaction.objectStore('interacciones');
            const request = store.add(interaccion);

            request.onsuccess = () => {
                resolve({ ...interaccion, id: request.result });
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Guardar nota clínica
     */
    async guardarNotaClinica(sesionId, nota) {
        if (!this.ready) await this.inicializar();
        
        const notaClinica = {
            sesionId: sesionId,
            timestamp: new Date().getTime(),
            tipo: nota.tipo || 'general', // general, alerta, progreso, retroalimentacion
            contenido: nota.contenido || '',
            autor: nota.autor || 'Sistema'
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notasClinicas'], 'readwrite');
            const store = transaction.objectStore('notasClinicas');
            const request = store.add(notaClinica);

            request.onsuccess = () => {
                resolve({ ...notaClinica, id: request.result });
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtener estadísticas de progreso del paciente
     */
    async obtenerEstadisticasPaciente(pacienteId, diasUltimos = 30) {
        if (!this.ready) await this.inicializar();
        
        try {
            const sesiones = await this.obtenerSesionesPaciente(pacienteId);
            
            // Filtrar sesiones de los últimos N días
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - diasUltimos);
            
            const sesionesRecientes = sesiones.filter(s => 
                new Date(s.fecha) >= fechaLimite && s.estado === 'completada'
            );

            // Calcular estadísticas
            const estadisticas = {
                totalSesiones: sesionesRecientes.length,
                totalRepeticiones: sesionesRecientes.reduce((sum, s) => sum + s.repeticiones, 0),
                promRepeticiones: sesionesRecientes.length > 0 ? 
                    Math.round(sesionesRecientes.reduce((sum, s) => sum + s.repeticiones, 0) / sesionesRecientes.length) : 0,
                promAngle: sesionesRecientes.length > 0 ?
                    Math.round(sesionesRecientes.reduce((sum, s) => sum + s.promAngle, 0) / sesionesRecientes.length) : 0,
                maxAngleAlcanzado: Math.max(...sesionesRecientes.map(s => s.maxAngle), 0),
                promDuracion: sesionesRecientes.length > 0 ?
                    Math.round(sesionesRecientes.reduce((sum, s) => sum + s.duracion, 0) / sesionesRecientes.length) : 0,
                progreso: 'Mejorando', // Calculado basado en tendencias
                ultimaSesion: sesionesRecientes[0]?.fecha || null
            };

            // Calcular tendencia
            if (sesionesRecientes.length >= 2) {
                const primera = sesionesRecientes[sesionesRecientes.length - 1];
                const ultima = sesionesRecientes[0];
                const cambioReps = ((ultima.repeticiones - primera.repeticiones) / primera.repeticiones * 100).toFixed(1);
                const cambioAngle = ((ultima.promAngle - primera.promAngle) / primera.promAngle * 100).toFixed(1);
                
                estadisticas.tendencia = {
                    cambioReps: cambioReps,
                    cambioAngle: cambioAngle,
                    direccion: cambioReps > 0 ? 'mejorando' : cambioReps < 0 ? 'empeorando' : 'estable'
                };
            }

            return estadisticas;
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return null;
        }
    }

    /**
     * Exportar datos en JSON (para backup)
     */
    async exportarDatos(pacienteId) {
        if (!this.ready) await this.inicializar();
        
        try {
            const paciente = await this.obtenerPaciente(pacienteId);
            const sesiones = await this.obtenerSesionesPaciente(pacienteId);

            const datos = {
                exportDate: new Date().toISOString(),
                paciente: paciente,
                sesiones: sesiones,
                totalSesiones: sesiones.length
            };

            return datos;
        } catch (error) {
            console.error('Error al exportar datos:', error);
            return null;
        }
    }

    /**
     * Limpiar todas las sesiones (para testing)
     */
    async limpiarBaseDatos() {
        if (!this.ready) await this.inicializar();
        
        const stores = ['sesiones', 'repeticiones', 'pacientes', 'interacciones', 'notasClinicas'];
        
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log(`✅ ${storeName} limpiado`);
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        }
    }
}

// Exportar como módulo global
window.DatabaseManager = DatabaseManager;
