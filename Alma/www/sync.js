/**
 * Sync Manager - Sincronización de datos con servidor remoto
 * Maneja: almacenamiento en caché, cola de espera, reintentos
 */

class SyncManager {
    constructor(serverUrl = 'http://localhost:3000') {
        this.serverUrl = serverUrl;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.isSyncing = false;
        
        // Cargar cola de espera del localStorage
        this.loadQueue();
        
        // Detectar cambios de conexión
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        console.log('📡 Sync Manager inicializado');
    }

    /**
     * Conectado a internet
     */
    handleOnline() {
        this.isOnline = true;
        console.log('🌐 Conectado a internet. Sincronizando datos...');
        this.sincronizarCola();
    }

    /**
     * Desconectado de internet
     */
    handleOffline() {
        this.isOnline = false;
        console.log('⚠️ Sin conexión a internet. Datos guardados localmente.');
    }

    /**
     * Guardar en cola de sincronización
     */
    agregarACola(operacion) {
        this.syncQueue.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...operacion
        });
        this.saveQueue();
        console.log(`📌 Operación agregada a cola (${this.syncQueue.length} pendientes)`);
    }

    /**
     * Persistir cola en localStorage
     */
    saveQueue() {
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    }

    /**
     * Cargar cola del localStorage
     */
    loadQueue() {
        try {
            const stored = localStorage.getItem('syncQueue');
            this.syncQueue = stored ? JSON.parse(stored) : [];
            console.log(`📋 Loaded ${this.syncQueue.length} operaciones pendientes`);
        } catch (error) {
            console.error('Error cargando cola:', error);
            this.syncQueue = [];
        }
    }

    /**
     * GUARDAR SESIÓN en servidor
     */
    async guardarSesion(sesion, pacienteId) {
        const operacion = {
            tipo: 'guardarSesion',
            pacienteId: pacienteId,
            datos: sesion
        };

        if (this.isOnline) {
            try {
                const response = await fetch(`${this.serverUrl}/api/sesiones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(operacion.datos)
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Sesión guardada en servidor (ID: ${data.id})`);
                    return { exitoso: true, id: data.id };
                } else {
                    throw new Error(`Error ${response.status}`);
                }
            } catch (error) {
                console.warn('❌ Error guardando sesión en servidor:', error);
                this.agregarACola(operacion);
                return { exitoso: false, local: true };
            }
        } else {
            this.agregarACola(operacion);
            return { exitoso: false, offline: true };
        }
    }

    /**
     * FINALIZAR SESIÓN en servidor
     */
    async finalizarSesion(sesionId, estadisticas) {
        const operacion = {
            tipo: 'finalizarSesion',
            sesionId: sesionId,
            datos: estadisticas
        };

        if (this.isOnline) {
            try {
                const response = await fetch(`${this.serverUrl}/api/sesiones/${sesionId}/finalizar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(estadisticas)
                });

                if (response.ok) {
                    console.log(`✅ Sesión ${sesionId} finalizada en servidor`);
                    return { exitoso: true };
                } else {
                    throw new Error(`Error ${response.status}`);
                }
            } catch (error) {
                console.warn('❌ Error finalizando sesión:', error);
                this.agregarACola(operacion);
                return { exitoso: false, enCola: true };
            }
        } else {
            this.agregarACola(operacion);
            return { exitoso: false, offline: true };
        }
    }

    /**
     * GUARDAR REPETICIÓN en servidor
     */
    async guardarRepeticion(sesionId, repeticion) {
        const operacion = {
            tipo: 'guardarRepeticion',
            sesionId: sesionId,
            datos: repeticion
        };

        if (this.isOnline) {
            try {
                const response = await fetch(`${this.serverUrl}/api/sesiones/${sesionId}/repeticiones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(repeticion)
                });

                if (response.ok) {
                    return { exitoso: true };
                } else {
                    throw new Error(`Error ${response.status}`);
                }
            } catch (error) {
                // Repeticiones se sincronizan cada 5 reps o al final
                console.warn('⚠️ Repetición guardada localmente');
                this.agregarACola(operacion);
                return { exitoso: false };
            }
        } else {
            this.agregarACola(operacion);
            return { exitoso: false, offline: true };
        }
    }

    /**
     * REGISTRAR EVENTO DE DOLOR en servidor
     */
    async registrarDolor(sesionId, evento) {
        const operacion = {
            tipo: 'registrarDolor',
            sesionId: sesionId,
            datos: evento
        };

        if (this.isOnline) {
            try {
                const response = await fetch(`${this.serverUrl}/api/sesiones/${sesionId}/dolor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(evento)
                });

                if (response.ok) {
                    console.log(`📍 Evento de dolor sincronizado`);
                    return { exitoso: true };
                }
            } catch (error) {
                this.agregarACola(operacion);
            }
        } else {
            this.agregarACola(operacion);
        }
        return { exitoso: false };
    }

    /**
     * OBTENER DATOS DEL PACIENTE desde servidor
     */
    async obtenerPaciente(pacienteId) {
        if (!this.isOnline) {
            console.warn('⚠️ Sin conexión. Usando datos locales.');
            return null;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/pacientes/${pacienteId}`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Datos del paciente obtenidos del servidor`);
                return data;
            }
        } catch (error) {
            console.error('Error obteniendo paciente:', error);
        }
        return null;
    }

    /**
     * SINCRONIZAR COLA pendiente
     */
    async sincronizarCola() {
        if (this.isSyncing || this.syncQueue.length === 0 || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        console.log(`🔄 Sincronizando ${this.syncQueue.length} operaciones pendientes...`);

        const itemsAEnviar = [...this.syncQueue];
        const itemsExitosos = [];

        for (const item of itemsAEnviar) {
            try {
                let response;

                switch (item.tipo) {
                    case 'guardarSesion':
                        response = await fetch(`${this.serverUrl}/api/sesiones`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.datos)
                        });
                        break;

                    case 'finalizarSesion':
                        response = await fetch(`${this.serverUrl}/api/sesiones/${item.sesionId}/finalizar`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.datos)
                        });
                        break;

                    case 'guardarRepeticion':
                        response = await fetch(`${this.serverUrl}/api/sesiones/${item.sesionId}/repeticiones`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.datos)
                        });
                        break;

                    case 'registrarDolor':
                        response = await fetch(`${this.serverUrl}/api/sesiones/${item.sesionId}/dolor`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(item.datos)
                        });
                        break;

                    default:
                        continue;
                }

                if (response && response.ok) {
                    itemsExitosos.push(item.id);
                    console.log(`✅ ${item.tipo} sincronizado`);
                }
            } catch (error) {
                console.error(`❌ Error sincronizando ${item.tipo}:`, error);
                break; // Parar en caso de error de conexión
            }
        }

        // Remover items exitosos de la cola
        this.syncQueue = this.syncQueue.filter(item => !itemsExitosos.includes(item.id));
        this.saveQueue();

        console.log(`✅ Sincronización completada. ${itemsExitosos.length}/${itemsAEnviar.length} operaciones`);
        this.isSyncing = false;
    }

    /**
     * EXPORTAR TODOS LOS DATOS del paciente
     */
    async exportarDatos(pacienteId) {
        if (!this.isOnline) {
            console.warn('⚠️ Sin conexión. No se puede hacer backup remoto.');
            return false;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/pacientes/${pacienteId}/export`, {
                method: 'GET'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `alma-backup-${pacienteId}-${new Date().toISOString()}.json`;
                a.click();
                console.log('✅ Datos exportados');
                return true;
            }
        } catch (error) {
            console.error('Error exportando datos:', error);
        }
        return false;
    }

    /**
     * OBTENER ESTADÍSTICAS del servidor (resumen agregado)
     */
    async obtenerEstadisticas(pacienteId, dias = 30) {
        if (!this.isOnline) {
            return null;
        }

        try {
            const response = await fetch(
                `${this.serverUrl}/api/pacientes/${pacienteId}/estadisticas?dias=${dias}`,
                { method: 'GET' }
            );

            if (response.ok) {
                const data = await response.json();
                console.log(`📊 Estadísticas obtenidas del servidor`);
                return data;
            }
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
        }
        return null;
    }

    /**
     * ENVIAR ALERTA al terapeuta
     */
    async enviarAlerta(pacienteId, tipo, mensaje) {
        if (!this.isOnline) {
            console.warn('⚠️ Sin conexión. Alerta no enviada.');
            return false;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/alertas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pacienteId,
                    tipo,
                    mensaje,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log(`📬 Alerta enviada al terapeuta`);
                return true;
            }
        } catch (error) {
            console.error('Error enviando alerta:', error);
        }
        return false;
    }

    /**
     * Estado de sincronización
     */
    obtenerEstado() {
        return {
            estaEnLinea: this.isOnline,
            estaSincronizando: this.isSyncing,
            operacionesPendientes: this.syncQueue.length,
            ultimaSincronizacion: localStorage.getItem('lastSync') || 'Nunca'
        };
    }
}

// Instancia global
let syncManager = null;

// Inicializar cuando cargue DOM
document.addEventListener('DOMContentLoaded', () => {
    // URL del servidor - cambiar según tu configuración
    const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
    syncManager = new SyncManager(serverUrl);
    console.log(`🔗 SyncManager conectando a: ${serverUrl}`);
});
