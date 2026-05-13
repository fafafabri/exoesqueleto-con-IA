/**
 * Alma Backend Server - Express.js
 * API REST para sincronización de datos médicos
 * 
 * Instalación:
 * npm install express cors mongoose dotenv
 * 
 * Ejecutar:
 * node server.js
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// ===== ALMACENAMIENTO EN MEMORIA (Reemplazar con BD real) =====
const sesionesStore = {};
const pacientesStore = {};
const alertasStore = [];

// ===== RUTAS DE PACIENTES =====

/**
 * GET /api/pacientes/:id
 * Obtener información del paciente
 */
app.get('/api/pacientes/:id', (req, res) => {
    const { id } = req.params;
    const paciente = pacientesStore[id];
    
    if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    res.json(paciente);
});

/**
 * POST /api/pacientes
 * Crear nuevo paciente
 */
app.post('/api/pacientes', (req, res) => {
    const { id, nombre, edad, diagnostico, objetivoRepeticiones } = req.body;
    
    const paciente = {
        id,
        nombre,
        edad,
        diagnostico,
        objetivoRepeticiones,
        fechaRegistro: new Date().toISOString(),
        sesiones: []
    };
    
    pacientesStore[id] = paciente;
    console.log(`✅ Paciente creado: ${nombre} (${id})`);
    
    res.status(201).json(paciente);
});

// ===== RUTAS DE SESIONES =====

/**
 * POST /api/sesiones
 * Crear nueva sesión de terapia
 */
app.post('/api/sesiones', (req, res) => {
    const { pacienteId, fecha, objetivoReps, velocidad } = req.body;
    
    const sesionId = `sesion_${Date.now()}`;
    const sesion = {
        id: sesionId,
        pacienteId,
        fecha: fecha || new Date().toISOString(),
        horaInicio: new Date().getTime(),
        horaFin: null,
        duracion: 0,
        repeticiones: 0,
        objetivoReps: objetivoReps || 10,
        velocidadPromed: velocidad || 5,
        repeticionesArray: [],
        dolorEventos: [],
        estado: 'activa'
    };
    
    sesionesStore[sesionId] = sesion;
    
    if (pacientesStore[pacienteId]) {
        pacientesStore[pacienteId].sesiones.push(sesionId);
    }
    
    console.log(`✅ Sesión creada: ${sesionId}`);
    res.status(201).json(sesion);
});

/**
 * PUT /api/sesiones/:id/finalizar
 * Finalizar sesión
 */
app.put('/api/sesiones/:id/finalizar', (req, res) => {
    const { id } = req.params;
    const sesion = sesionesStore[id];
    
    if (!sesion) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    sesion.horaFin = new Date().getTime();
    sesion.duracion = Math.round((sesion.horaFin - sesion.horaInicio) / 60000); // minutos
    sesion.estado = 'completada';
    sesion.feedback = req.body.feedback || [];
    sesion.notas = req.body.notas || '';
    
    console.log(`✅ Sesión finalizada: ${id} (${sesion.duracion} min, ${sesion.repeticiones} reps)`);
    res.json(sesion);
});

/**
 * GET /api/sesiones/:id
 * Obtener datos de una sesión
 */
app.get('/api/sesiones/:id', (req, res) => {
    const { id } = req.params;
    const sesion = sesionesStore[id];
    
    if (!sesion) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    res.json(sesion);
});

// ===== RUTAS DE REPETICIONES =====

/**
 * POST /api/sesiones/:sesionId/repeticiones
 * Registrar una repetición
 */
app.post('/api/sesiones/:sesionId/repeticiones', (req, res) => {
    const { sesionId } = req.params;
    const { numero, angle, velocidad, duracion, esfuerzo } = req.body;
    
    const sesion = sesionesStore[sesionId];
    if (!sesion) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    const repeticion = {
        id: `rep_${Date.now()}`,
        numero,
        timestamp: new Date().toISOString(),
        angle: angle || 0,
        velocidad: velocidad || 5,
        duracion: duracion || 0,
        esfuerzo: esfuerzo || 'normal'
    };
    
    sesion.repeticionesArray.push(repeticion);
    sesion.repeticiones = sesion.repeticionesArray.length;
    
    res.status(201).json(repeticion);
});

// ===== RUTAS DE DOLOR =====

/**
 * POST /api/sesiones/:sesionId/dolor
 * Registrar evento de dolor
 */
app.post('/api/sesiones/:sesionId/dolor', (req, res) => {
    const { sesionId } = req.params;
    const { intensidad, ubicacion, repeticionActual, anguloEnMomento } = req.body;
    
    const sesion = sesionesStore[sesionId];
    if (!sesion) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    const evento = {
        id: `dolor_${Date.now()}`,
        timestamp: new Date().toISOString(),
        intensidad,
        ubicacion,
        repeticionActual,
        anguloEnMomento
    };
    
    sesion.dolorEventos.push(evento);
    
    console.log(`📍 Evento de dolor registrado: ${intensidad}/10 en ${ubicacion}`);
    res.status(201).json(evento);
});

// ===== RUTAS DE ESTADÍSTICAS =====

/**
 * GET /api/pacientes/:id/estadisticas?dias=30
 * Obtener estadísticas agregadas
 */
app.get('/api/pacientes/:id/estadisticas', (req, res) => {
    const { id } = req.params;
    const { dias = 30 } = req.query;
    
    const paciente = pacientesStore[id];
    if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    const sesiones = paciente.sesiones
        .map(sesionId => sesionesStore[sesionId])
        .filter(s => s && s.estado === 'completada');
    
    const totalSesiones = sesiones.length;
    const totalRepeticiones = sesiones.reduce((sum, s) => sum + s.repeticiones, 0);
    const velocidadPromedio = sesiones.length > 0 
        ? (sesiones.reduce((sum, s) => sum + s.velocidadPromed, 0) / sesiones.length).toFixed(1)
        : 0;
    
    const dolorEventos = sesiones.flatMap(s => s.dolorEventos);
    const intensidadMaxDolor = dolorEventos.length > 0 
        ? Math.max(...dolorEventos.map(d => d.intensidad))
        : 0;
    
    const estadisticas = {
        pacienteId: id,
        totalSesiones,
        totalRepeticiones,
        promRepeticiones: totalSesiones > 0 ? (totalRepeticiones / totalSesiones).toFixed(1) : 0,
        velocidadPromedio,
        dolorEventos: dolorEventos.length,
        intensidadMaxDolor,
        lastUpdated: new Date().toISOString()
    };
    
    res.json(estadisticas);
});

/**
 * GET /api/pacientes/:id/export
 * Exportar todos los datos del paciente
 */
app.get('/api/pacientes/:id/export', (req, res) => {
    const { id } = req.params;
    const paciente = pacientesStore[id];
    
    if (!paciente) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    const sesiones = paciente.sesiones.map(sesionId => sesionesStore[sesionId]);
    
    const exportData = {
        exportDate: new Date().toISOString(),
        paciente,
        sesiones,
        totalSesiones: sesiones.length
    };
    
    res.json(exportData);
});

// ===== RUTAS DE ALERTAS =====

/**
 * POST /api/alertas
 * Enviar alerta al terapeuta
 */
app.post('/api/alertas', (req, res) => {
    const { pacienteId, tipo, mensaje } = req.body;
    
    const alerta = {
        id: `alert_${Date.now()}`,
        pacienteId,
        tipo,
        mensaje,
        timestamp: new Date().toISOString(),
        estado: 'no_leida'
    };
    
    alertasStore.push(alerta);
    
    console.log(`📬 ALERTA: [${tipo}] ${mensaje}`);
    
    // TODO: Enviar notificación push al terapeuta
    // sendPushNotification(pacienteId, mensaje);
    
    res.status(201).json(alerta);
});

/**
 * GET /api/alertas/:pacienteId
 * Obtener alertas de un paciente
 */
app.get('/api/alertas/:pacienteId', (req, res) => {
    const { pacienteId } = req.params;
    
    const alertas = alertasStore.filter(a => a.pacienteId === pacienteId);
    res.json(alertas);
});

/**
 * PUT /api/alertas/:id/leer
 * Marcar alerta como leída
 */
app.put('/api/alertas/:id/leer', (req, res) => {
    const { id } = req.params;
    const alerta = alertasStore.find(a => a.id === id);
    
    if (!alerta) {
        return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    alerta.estado = 'leida';
    res.json(alerta);
});

// ===== RUTAS DE SALUD =====

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pacientesTotal: Object.keys(pacientesStore).length,
        sesionesTotal: Object.keys(sesionesStore).length,
        alertasTotal: alertasStore.length
    });
});

// ===== INICIAR SERVIDOR =====

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║     🏥 ALMA Backend Server                 ║
    ║     Puerto: ${PORT}                         ║
    ║     API: http://localhost:${PORT}/api      ║
    ║     Health: http://localhost:${PORT}/api/health
    ╚════════════════════════════════════════════╝
    `);
});

module.exports = app;
