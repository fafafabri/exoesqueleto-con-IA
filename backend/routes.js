/**
 * Rutas de API organizadas para mejor mantenimiento
 * Importa estas en server.js
 */

const express = require('express');

// ===== RUTAS DE PACIENTES =====
module.exports.pacientesRoutes = (app, store) => {
    app.get('/api/pacientes/:id', (req, res) => {
        const { id } = req.params;
        const paciente = store.pacientes[id];
        
        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        res.json(paciente);
    });

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
        
        store.pacientes[id] = paciente;
        console.log(`✅ Paciente creado: ${nombre} (${id})`);
        
        res.status(201).json(paciente);
    });

    app.get('/api/pacientes/:id/estadisticas', (req, res) => {
        const { id } = req.params;
        const { dias = 30 } = req.query;
        
        const paciente = store.pacientes[id];
        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        const sesiones = paciente.sesiones
            .map(sesionId => store.sesiones[sesionId])
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

    app.get('/api/pacientes/:id/export', (req, res) => {
        const { id } = req.params;
        const paciente = store.pacientes[id];
        
        if (!paciente) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        
        const sesiones = paciente.sesiones.map(sesionId => store.sesiones[sesionId]);
        
        const exportData = {
            exportDate: new Date().toISOString(),
            paciente,
            sesiones,
            totalSesiones: sesiones.length
        };
        
        res.json(exportData);
    });
};

// ===== RUTAS DE SESIONES =====
module.exports.sesionesRoutes = (app, store) => {
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
        
        store.sesiones[sesionId] = sesion;
        
        if (store.pacientes[pacienteId]) {
            store.pacientes[pacienteId].sesiones.push(sesionId);
        }
        
        console.log(`✅ Sesión creada: ${sesionId}`);
        res.status(201).json(sesion);
    });

    app.get('/api/sesiones/:id', (req, res) => {
        const { id } = req.params;
        const sesion = store.sesiones[id];
        
        if (!sesion) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        
        res.json(sesion);
    });

    app.put('/api/sesiones/:id/finalizar', (req, res) => {
        const { id } = req.params;
        const sesion = store.sesiones[id];
        
        if (!sesion) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        
        sesion.horaFin = new Date().getTime();
        sesion.duracion = Math.round((sesion.horaFin - sesion.horaInicio) / 60000);
        sesion.estado = 'completada';
        sesion.feedback = req.body.feedback || [];
        sesion.notas = req.body.notas || '';
        
        console.log(`✅ Sesión finalizada: ${id}`);
        res.json(sesion);
    });

    app.post('/api/sesiones/:sesionId/repeticiones', (req, res) => {
        const { sesionId } = req.params;
        const { numero, angle, velocidad, duracion, esfuerzo } = req.body;
        
        const sesion = store.sesiones[sesionId];
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

    app.post('/api/sesiones/:sesionId/dolor', (req, res) => {
        const { sesionId } = req.params;
        const { intensidad, ubicacion, repeticionActual, anguloEnMomento } = req.body;
        
        const sesion = store.sesiones[sesionId];
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
        
        console.log(`📍 Evento de dolor: ${intensidad}/10 en ${ubicacion}`);
        res.status(201).json(evento);
    });
};

// ===== RUTAS DE ALERTAS =====
module.exports.alertasRoutes = (app, store) => {
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
        
        store.alertas.push(alerta);
        
        console.log(`📬 ALERTA: [${tipo}] ${mensaje}`);
        res.status(201).json(alerta);
    });

    app.get('/api/alertas/:pacienteId', (req, res) => {
        const { pacienteId } = req.params;
        
        const alertas = store.alertas.filter(a => a.pacienteId === pacienteId);
        res.json(alertas);
    });

    app.put('/api/alertas/:id/leer', (req, res) => {
        const { id } = req.params;
        const alerta = store.alertas.find(a => a.id === id);
        
        if (!alerta) {
            return res.status(404).json({ error: 'Alerta no encontrada' });
        }
        
        alerta.estado = 'leida';
        res.json(alerta);
    });
};

// ===== RUTAS DE SALUD =====
module.exports.healthRoutes = (app, store) => {
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            pacientesTotal: Object.keys(store.pacientes).length,
            sesionesTotal: Object.keys(store.sesiones).length,
            alertasTotal: store.alertas.length
        });
    });
};
