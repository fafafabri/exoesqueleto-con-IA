/**
 * Modelos de Base de Datos - Mongoose
 * Para usar con MongoDB
 */

const mongoose = require('mongoose');

// ===== SCHEMA DE PACIENTE =====
const pacienteSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    nombre: { type: String, required: true },
    edad: { type: Number, required: true },
    diagnostico: String,
    objetivoRepeticiones: { type: Number, default: 10 },
    fechaRegistro: { type: Date, default: Date.now },
    contacto: String,
    medico: String,
    notas: String,
    activo: { type: Boolean, default: true }
});

// ===== SCHEMA DE SESIÓN =====
const sesionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    pacienteId: { type: String, required: true, ref: 'Paciente' },
    fecha: Date,
    horaInicio: Date,
    horaFin: Date,
    duracion: Number, // en minutos
    repeticiones: { type: Number, default: 0 },
    objetivoReps: { type: Number, default: 10 },
    velocidadPromed: { type: Number, default: 5 },
    velocidadMin: Number,
    velocidadMax: Number,
    anguloMax: Number,
    estado: { type: String, enum: ['activa', 'pausa', 'completada', 'cancelada'], default: 'activa' },
    feedback: [String],
    notas: String,
    repeticionesArray: [mongoose.Schema.Types.Mixed],
    dolorEventos: [mongoose.Schema.Types.Mixed]
});

// ===== SCHEMA DE REPETICIÓN =====
const repeticionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sesionId: { type: String, required: true, ref: 'Sesion' },
    numero: Number,
    timestamp: Date,
    angle: Number,
    velocidad: Number,
    duracion: Number,
    esfuerzo: String,
    conDolor: { type: Boolean, default: false }
});

// ===== SCHEMA DE EVENTO DE DOLOR =====
const dolorEventoSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sesionId: { type: String, required: true, ref: 'Sesion' },
    timestamp: Date,
    intensidad: { type: Number, min: 0, max: 10 },
    ubicacion: String,
    repeticionActual: Number,
    anguloEnMomento: Number,
    notas: String
});

// ===== SCHEMA DE ALERTA =====
const alertaSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    pacienteId: { type: String, required: true, ref: 'Paciente' },
    tipo: { 
        type: String, 
        enum: ['riesgo_alto_dolor', 'dolor_intenso', 'progreso', 'alerta_general', 'recomendacion'],
        default: 'alerta_general'
    },
    mensaje: String,
    timestamp: { type: Date, default: Date.now },
    estado: { type: String, enum: ['no_leida', 'leida', 'archivada'], default: 'no_leida' },
    leidaPor: String,
    fechaLectura: Date
});

// ===== SCHEMA DE INTERACCIÓN (NLP LOG) =====
const interaccionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sesionId: String,
    pacienteId: String,
    timestamp: { type: Date, default: Date.now },
    textoUsuario: String,
    idioma: String,
    intencion: String,
    confianza: Number,
    parametrosExtraidos: mongoose.Schema.Types.Mixed,
    respuestaAlma: String
});

// ===== SCHEMA DE NOTAS CLÍNICAS =====
const notasClinicasSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sesionId: String,
    pacienteId: String,
    timestamp: { type: Date, default: Date.now },
    tipo: { type: String, enum: ['observacion', 'recomendacion', 'alerta', 'nota_general'] },
    contenido: String,
    autor: String
});

// ===== SCHEMA DE ANÁLISIS ML =====
const analisisMLSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    pacienteId: String,
    fecha: { type: Date, default: Date.now },
    tipo: { type: String, enum: ['riesgo_dolor', 'recomendacion_velocidad', 'plan_terapeutico'] },
    datos: mongoose.Schema.Types.Mixed,
    prediccion: mongoose.Schema.Types.Mixed
});

// ===== EXPORTAR MODELOS =====
module.exports = {
    Paciente: mongoose.model('Paciente', pacienteSchema),
    Sesion: mongoose.model('Sesion', sesionSchema),
    Repeticion: mongoose.model('Repeticion', repeticionSchema),
    DolorEvento: mongoose.model('DolorEvento', dolorEventoSchema),
    Alerta: mongoose.model('Alerta', alertaSchema),
    Interaccion: mongoose.model('Interaccion', interaccionSchema),
    NotasClinicas: mongoose.model('NotasClinicas', notasClinicasSchema),
    AnalisisML: mongoose.model('AnalisisML', analisisMLSchema)
};
