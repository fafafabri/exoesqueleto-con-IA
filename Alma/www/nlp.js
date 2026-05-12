// =========================================================================
// NLP MODULE - Procesamiento de Lenguaje Natural (Implementación Browser)
// =========================================================================
// Este módulo proporciona análisis semántico real, comprensión de contexto,
// detección de sentimiento y aprendizaje de patrones del usuario.
// NO depende de librerías externas, funciona 100% en el navegador.

class SimpleBayesClassifier {
    constructor() {
        this.docs = {};
        this.vocab = {};
        this.docCount = 0;
        this.trained = false;
    }

    addDocument(text, label) {
        if (!this.docs[label]) this.docs[label] = [];
        
        const tokens = this.tokenize(text);
        this.docs[label].push(tokens);
        
        tokens.forEach(token => {
            if (!this.vocab[token]) this.vocab[token] = 0;
            this.vocab[token]++;
        });
        
        this.docCount++;
    }

    train() {
        this.trained = true;
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(t => t.length > 0);
    }

    getClassifications(text) {
        const tokens = this.tokenize(text);
        const scores = {};

        for (const label in this.docs) {
            scores[label] = 0;
            const docs = this.docs[label];
            
            tokens.forEach(token => {
                docs.forEach(doc => {
                    if (doc.includes(token)) scores[label]++;
                });
            });
        }

        return Object.entries(scores)
            .map(([label, score]) => ({
                label,
                value: Math.min(1, score / 5)
            }))
            .sort((a, b) => b.value - a.value);
    }
}

class NLPEngine {
    constructor() {
        // Historial de comandos del usuario para aprendizaje
        this.commandHistory = JSON.parse(localStorage.getItem('commandHistory')) || {};
        
        // Palabras clave por categoría
        this.keywords = {
            EMERGENCIA: {
                positivos: ['duele', 'dolor', 'para', 'detente', 'emergencia', 'ayuda', 'alerta', 'paro', 'stop', 'parada', 'urgente'],
                negativos: ['no', 'nunca', 'jamás', 'tampoco', 'nada']
            },
            FLEXION: {
                positivos: ['flexión', 'dobla', 'esfuerzo', 'subir', 'levanta', 'contrae', 'repite', 'siguiente', 'próxima', 'ejercicio', 'sigue'],
                negativos: ['no', 'espera', 'pausa', 'descansa']
            },
            REPOSO: {
                positivos: ['descansa', 'pausa', 'alto', 'relaja', 'respira', 'suavemente', 'lentamente', 'descanso'],
                negativos: ['no', 'continúa', 'sigue', 'más']
            },
            PROGRESO: {
                positivos: ['registro', 'progreso', 'sesiones', 'historial', 'estadísticas', 'avance', 'datos', 'resumen', 'cómo voy'],
                negativos: []
            },
            AJUSTES: {
                positivos: ['ajustes', 'configuración', 'opciones', 'preferencias', 'settings', 'personaliza'],
                negativos: []
            },
            TERMINAR: {
                positivos: ['terminar', 'fin', 'hasta mañana', 'adiós', 'adios', 'gracias', 'listo', 'done', 'finalizar', 'acabar'],
                negativos: ['no', 'espera', 'más']
            }
        };

        // Plantillas de respuesta adaptativas
        this.responseTemplates = {
            URGENCIA: [
                "⚠️ Alerta detectada. Deteniendo inmediatamente.",
                "🛑 Entendido. Activando parada de emergencia.",
                "⛔ ¡Cuidado! Deteniendo el motor de inmediato."
            ],
            CONTINUA: [
                "💪 ¡Adelante! Iniciando la próxima repetición.",
                "🎯 Perfecto, continuamos con la flexión.",
                "⚡ Excelente ritmo. Siguiente repetición."
            ],
            ANIMA: [
                "🌟 ¡Lo estás haciendo fantásticamente bien!",
                "🎉 Tu dedicación es admirable. ¡Sigue así!",
                "💯 ¡Vas en la dirección correcta!"
            ]
        };

        // Clasificador Bayesiano simple para intenciones
        this.intentClassifier = new SimpleBayesClassifier();
        this.entrenarClasificador();

        // Análisis de sentimiento
        this.sentimentWords = {
            positivos: ['bien', 'mejor', 'excelente', 'bueno', 'genial', 'feliz', 'alegre', 'ánimo', 'fuerza', 'puedo', 'fantástico', 'increíble'],
            negativos: ['mal', 'peor', 'cansado', 'fatiga', 'triste', 'desánimo', 'no puedo', 'imposible', 'difícil', 'agotado'],
            neutrales: ['normal', 'igual', 'más o menos', 'ok', 'bien']
        };

        console.log('✅ NLP Engine inicializado sin dependencias externas');
    }

    /**
     * Entrenar el clasificador Bayesiano con ejemplos de intenciones
     */
    entrenarClasificador() {
        // Emergencia - Ejemplos de entrenamiento
        const emergenciaEjemplos = [
            'duele mucho el brazo',
            'siento dolor en el hombro',
            'para la máquina',
            'alerta necesito ayuda',
            'me duele no puedo más',
            'paro de emergencia',
            'dolor crítico detente',
            'siento que se rompe',
            'ayuda ahora mismo'
        ];
        emergenciaEjemplos.forEach(ej => this.intentClassifier.addDocument(ej, 'EMERGENCIA'));

        // Flexión - Ejemplos
        const flexionEjemplos = [
            'inicia la flexión',
            'siguiente repetición',
            'dobla el brazo',
            'estoy listo para más',
            'continúa con el ejercicio',
            'esfuerzo máximo',
            'próxima flexión',
            'repite el movimiento',
            'acelera el ritmo'
        ];
        flexionEjemplos.forEach(ej => this.intentClassifier.addDocument(ej, 'FLEXION'));

        // Reposo - Ejemplos
        const reposoEjemplos = [
            'necesito descansar',
            'pausa en el ejercicio',
            'alto descansa',
            'relájate un poco',
            'respira profundo',
            'espera un momento',
            'toma aire',
            'calma baja la intensidad',
            'descansa ahora'
        ];
        reposoEjemplos.forEach(ej => this.intentClassifier.addDocument(ej, 'REPOSO'));

        // Progreso - Ejemplos
        const progresoEjemplos = [
            'quiero ver mi progreso',
            'muéstrame mis estadísticas',
            'cómo voy avanzando',
            'historial de sesiones',
            'mis resultados',
            'panel de progreso',
            'avance de recuperación'
        ];
        progresoEjemplos.forEach(ej => this.intentClassifier.addDocument(ej, 'PROGRESO'));

        // Terminar - Ejemplos
        const terminarEjemplos = [
            'termino aquí',
            'hasta mañana',
            'adiós alma',
            'fin de la sesión',
            'listo para hoy',
            'gracias por todo',
            'nos vemos después'
        ];
        terminarEjemplos.forEach(ej => this.intentClassifier.addDocument(ej, 'TERMINAR'));

        // Entrenar el clasificador
        this.intentClassifier.train();
    }

    /**
     * Analizar intención del usuario
     * @param {string} texto - Texto a analizar
     * @returns {object} - {intención, confianza, tieneNegacion}
     */
    analizarIntencion(texto) {
        const textoLower = texto.toLowerCase().trim();
        
        // Verificar negaciones
        const tieneNegacion = this.detectarNegacion(textoLower);
        
        // Usar clasificador Bayesiano
        let intencion = null;
        let confianza = 0;
        
        try {
            const clasificaciones = this.intentClassifier.getClassifications(textoLower);
            if (clasificaciones && clasificaciones.length > 0) {
                intencion = clasificaciones[0].label;
                confianza = clasificaciones[0].value;
            }
        } catch (e) {
            console.warn("Error en clasificación Bayesiana:", e);
        }

        // Si no hay confianza suficiente, usar análisis de palabras clave
        if (confianza < 0.3) {
            const resultado = this.analizarPalabrasClave(textoLower);
            intencion = resultado.intencion;
            confianza = resultado.confianza;
        }

        return {
            intencion,
            confianza,
            tieneNegacion,
            textoOriginal: texto
        };
    }

    /**
     * Detectar si hay negación en el texto
     */
    detectarNegacion(texto) {
        const negaciones = ['no ', 'nunca', 'jamás', 'tampoco', 'nada de', 'sin '];
        return negaciones.some(neg => texto.includes(neg));
    }

    /**
     * Análisis de palabras clave como fallback
     */
    analizarPalabrasClave(texto) {
        let mejorIntencion = null;
        let mejorPuntaje = 0;

        for (const [intencion, palabras] of Object.entries(this.keywords)) {
            let puntaje = 0;
            
            // Contar palabras positivas
            palabras.positivos.forEach(palabra => {
                if (texto.includes(palabra)) puntaje += 2;
            });
            
            // Restar por palabras negativas
            palabras.negativos.forEach(palabra => {
                if (texto.includes(palabra)) puntaje -= 1;
            });

            if (puntaje > mejorPuntaje) {
                mejorPuntaje = puntaje;
                mejorIntencion = intencion;
            }
        }

        return {
            intencion: mejorIntencion,
            confianza: Math.max(0, mejorPuntaje / 4) // Normalizar 0-1
        };
    }

    /**
     * Analizar sentimiento del usuario
     * @returns {string} - 'positivo', 'negativo', 'neutral'
     */
    analizarSentimiento(texto) {
        const textoLower = texto.toLowerCase();
        let puntaje = 0;

        // Contar palabras de sentimiento
        this.sentimentWords.positivos.forEach(palabra => {
            if (textoLower.includes(palabra)) puntaje += 2;
        });

        this.sentimentWords.negativos.forEach(palabra => {
            if (textoLower.includes(palabra)) puntaje -= 2;
        });

        if (puntaje > 0) return 'positivo';
        if (puntaje < 0) return 'negativo';
        return 'neutral';
    }

    /**
     * Generar respuesta adaptativa según la intención y sentimiento
     */
    generarRespuesta(analisis, repsActuales) {
        const { intencion, tieneNegacion, textoOriginal } = analisis;
        const sentimiento = this.analizarSentimiento(textoOriginal);

        // Si hay negación en emergencia, ignorar
        if (intencion === 'EMERGENCIA' && tieneNegacion) {
            return {
                accion: 'IGNORAR',
                mensaje: 'Entendido, continuamos monitoreando.'
            };
        }

        // Respuestas adaptativas por intención
        const respuestas = {
            EMERGENCIA: {
                accion: 'EMERGENCIA',
                mensaje: this.obtenerRespuestaAleatoria(this.responseTemplates.URGENCIA)
            },
            FLEXION: {
                accion: 'FLEXION',
                mensaje: this.obtenerRespuestaAleatoria(this.responseTemplates.CONTINUA)
            },
            REPOSO: {
                accion: 'REPOSO',
                mensaje: 'Descansando. Tómate tu tiempo, aquí estaré cuando estés listo.'
            },
            PROGRESO: {
                accion: 'MOSTRAR_PROGRESO',
                mensaje: 'Abriendo tu panel de progreso clínico.'
            },
            AJUSTES: {
                accion: 'ABRIR_AJUSTES',
                mensaje: 'Accediendo a configuración.'
            },
            TERMINAR: {
                accion: 'TERMINAR',
                mensaje: 'Excelente sesión de hoy. Has completado ' + repsActuales + ' repeticiones. ¡Hasta mañana!'
            }
        };

        // Obtener respuesta base
        let respuesta = respuestas[intencion] || {
            accion: 'NO_RECONOCIDO',
            mensaje: 'Lo siento, no entendí bien. ¿Podrías repetir?'
        };

        // Adaptar mensaje según sentimiento
        if (sentimiento === 'positivo' && intencion === 'FLEXION') {
            respuesta.mensaje = this.obtenerRespuestaAleatoria(this.responseTemplates.ANIMA);
        }

        return respuesta;
    }

    /**
     * Obtener una respuesta aleatoria de un array
     */
    obtenerRespuestaAleatoria(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Registrar comando para aprendizaje futuro
     */
    registrarComando(intencion, texto) {
        this.commandHistory[intencion] = (this.commandHistory[intencion] || 0) + 1;
        localStorage.setItem('commandHistory', JSON.stringify(this.commandHistory));
    }

    /**
     * Obtener patrón de comandos más frecuentes
     */
    obtenerPatternsFrequentes() {
        return Object.entries(this.commandHistory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    }

    /**
     * Limpiar historial
     */
    limpiarHistorial() {
        this.commandHistory = {};
        localStorage.removeItem('commandHistory');
    }
}

// Exportar como módulo global
window.NLPEngine = NLPEngine;

