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
            },
            VELOCIDAD: {
                positivos: ['velocidad', 'rápido', 'lento', 'ritmo', 'velocidad del movimiento'],
                negativos: []
            },
            OBJETIVO: {
                positivos: ['quiero', 'deseo', 'objetivo', 'meta', 'repeticiones', 'flexiones', 'reps', 'veces'],
                negativos: []
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

        // Datos para modelo entrenado localmente
        this.modelWeights = null;
        this.vectorizerVocab = null;
        this.labelInverseMap = null;
        this.modelReady = false;

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
     * Cargar un modelo TensorFlow.js entrenado localmente y su vocabulario
     */
    async cargarModeloLocal() {
        try {
            const modelUrl = 'model/model_weights.json';
            const vocabUrl = 'model/vectorizer_vocab.json';
            const labelUrl = 'model/label_map.json';

            const [modelResponse, vocabResponse, labelResponse] = await Promise.all([
                fetch(modelUrl),
                fetch(vocabUrl),
                fetch(labelUrl)
            ]);

            if (!modelResponse.ok || !vocabResponse.ok || !labelResponse.ok) {
                throw new Error('No se pudieron cargar los archivos del modelo local');
            }

            this.modelWeights = await modelResponse.json();
            this.vectorizerVocab = await vocabResponse.json();
            const labelMap = await labelResponse.json();
            this.labelInverseMap = Object.fromEntries(
                Object.entries(labelMap).map(([label, index]) => [parseInt(index, 10), label])
            );
            this.modelReady = true;
            console.log('✅ Modelo local de NLP cargado correctamente');
        } catch (error) {
            console.warn('⚠️ No fue posible cargar el modelo local de NLP:', error);
            this.modelReady = false;
        }
    }

    tokenize(texto) {
        return texto.toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(Boolean);
    }

    vectorizarTexto(texto) {
        const tokens = this.tokenize(texto);
        const vector = new Array(Object.keys(this.vectorizerVocab || {}).length).fill(0);

        tokens.forEach(token => {
            const index = this.vectorizerVocab[token];
            if (typeof index === 'number') {
                vector[index] += 1;
            }
        });

        return vector;
    }

    analizarConModelo(texto) {
        if (!this.modelReady || !this.modelWeights || !this.vectorizerVocab || !this.labelInverseMap) {
            return null;
        }

        const vector = this.vectorizarTexto(texto);
        if (vector.every(value => value === 0)) {
            return null;
        }

        const scores = this.predictWithWeights(vector);
        if (!scores || scores.length === 0) {
            return null;
        }

        const maxScore = Math.max(...scores);
        const predictedIndex = scores.indexOf(maxScore);
        const predictedLabel = this.labelInverseMap[predictedIndex];

        if (!predictedLabel) {
            return null;
        }

        return {
            intencion: predictedLabel,
            confianza: Math.min(1, maxScore),
            tieneNegacion: this.detectarNegacion(texto),
            textoOriginal: texto
        };
    }

    predictWithWeights(vector) {
        let activations = vector;
        for (const layer of this.modelWeights.layers) {
            activations = this.applyLayer(activations, layer.weights, layer.biases, layer.activation);
        }
        return activations;
    }

    applyLayer(inputVector, weights, biases, activation) {
        const output = new Array(biases.length).fill(0);

        for (let j = 0; j < biases.length; j++) {
            let sum = biases[j] || 0;
            for (let i = 0; i < inputVector.length; i++) {
                const w = (weights[i] && weights[i][j]) || 0;
                sum += inputVector[i] * w;
            }
            output[j] = sum;
        }

        if (activation === 'relu') {
            return output.map(value => Math.max(0, value));
        }
        if (activation === 'softmax') {
            return this.softmax(output);
        }
        return output;
    }

    softmax(values) {
        const maxValue = Math.max(...values);
        const exps = values.map(v => Math.exp(v - maxValue));
        const sum = exps.reduce((total, value) => total + value, 0) || 1;
        return exps.map(value => value / sum);
    }

    /**
     * Analizar intención del usuario
     * @param {string} texto - Texto a analizar
     * @returns {object} - {intención, confianza, tieneNegacion}
     */
    analizarIntencion(texto) {
        const textoLower = texto.toLowerCase().trim();
        const tieneNegacion = this.detectarNegacion(textoLower);

        if (this.modelReady) {
            const modelResult = this.analizarConModelo(textoLower);
            if (modelResult && modelResult.confianza >= 0.25) {
                return modelResult;
            }
        }

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
     * NUEVA: Extraer velocidad (1-10) de un comando
     * @param {string} texto - "velocidad 5", "ritmo rápido 7", etc.
     * @returns {number|null} - Número 1-10 o null si no encuentra
     */
    extraerVelocidad(texto) {
        const textoLower = texto.toLowerCase();
        
        // Buscar número después de "velocidad"
        const matchVelocidad = textoLower.match(/velocidad\s+(\d+)/i);
        if (matchVelocidad) {
            const velocidad = parseInt(matchVelocidad[1]);
            if (velocidad >= 1 && velocidad <= 10) return velocidad;
        }

        // Buscar número en el comando si hay palabra clave de velocidad
        if (textoLower.includes('velocidad') || textoLower.includes('ritmo') || textoLower.includes('rápido') || textoLower.includes('lento')) {
            const match = textoLower.match(/(\d+)/);
            if (match) {
                const velocidad = parseInt(match[1]);
                if (velocidad >= 1 && velocidad <= 10) return velocidad;
            }
        }

        return null;
    }

    /**
     * NUEVA: Extraer objetivo de repeticiones de un comando
     * @param {string} texto - "quiero 20 flexiones", "objetivo 15 reps", etc.
     * @returns {number|null} - Número de reps o null si no encuentra
     */
    extraerObjetivo(texto) {
        const textoLower = texto.toLowerCase();
        
        // Palabras clave que indican objetivo
        const palabrasObjetivo = ['quiero', 'deseo', 'objetivo', 'meta', 'hazme', 'realiza', 'haz'];
        const tieneObjetivo = palabrasObjetivo.some(palabra => textoLower.includes(palabra));
        
        if (!tieneObjetivo) return null;

        // Buscar número seguido de palabras como "flexiones", "repeticiones", "reps", "veces"
        const matchFlexiones = textoLower.match(/(\d+)\s*(flexiones|repeticiones|reps|veces|rep)/i);
        if (matchFlexiones) {
            return parseInt(matchFlexiones[1]);
        }

        // También buscar: "quiero 20" (sin especificar qué)
        const matchNumero = textoLower.match(/(?:quiero|deseo|objetivo|hazme)\s+(\d+)/i);
        if (matchNumero) {
            return parseInt(matchNumero[1]);
        }

        return null;
    }

    /**
     * NUEVA: Evaluar si hay reporte de dolor/molestia
     * @param {string} texto - Texto del usuario
     * @returns {object} - {tieneDolor: boolean, intensidad: number (0-10), ubicacion: string}
     */
    evaluarDolor(texto) {
        const textoLower = texto.toLowerCase();
        
        // Detectar palabras de dolor
        const palabrasDolor = ['duele', 'dolor', 'molesta', 'molestia', 'ardor', 'pinchazos', 'incomodidad', 'malestar'];
        const tieneDolor = palabrasDolor.some(palabra => textoLower.includes(palabra));

        // Detectar intensidad (escala 1-10)
        let intensidad = 5; // Medio por defecto
        const matchIntensidad = textoLower.match(/(\d+)(?:\s*de\s*10|\s*sobre\s*10|\/10)?/);
        if (matchIntensidad) {
            intensidad = parseInt(matchIntensidad[1]);
            if (intensidad > 10) intensidad = 10;
        }

        // Detectar ubicación
        const ubicaciones = {
            'hombro': 'hombro',
            'codo': 'codo',
            'muñeca': 'muñeca',
            'brazo': 'brazo',
            'articulación': 'articulación',
            'músculo': 'músculo'
        };

        let ubicacion = 'general';
        for (const [palabra, lugar] of Object.entries(ubicaciones)) {
            if (textoLower.includes(palabra)) {
                ubicacion = lugar;
                break;
            }
        }

        return {
            tieneDolor,
            intensidad: tieneDolor ? intensidad : 0,
            ubicacion: tieneDolor ? ubicacion : null
        };
    }

    /**
     * Limpiar historial
     */
    limpiarHistorial() {
        this.commandHistory = {};
        localStorage.removeItem('commandHistory');
    }

    /**
     * NUEVO: Establecer idioma activo
     * @param {string} idioma - 'es' (español), 'en' (english), 'pt' (portuguese)
     */
    establecerIdioma(idioma) {
        this.idioma = idioma;
        localStorage.setItem('almaIdioma', idioma);
        console.log(`🌐 Idioma cambiado a: ${idioma}`);
        
        // Entrenar clasificador con ejemplos del nuevo idioma
        if (idioma === 'en') {
            this.entrenarEnglish();
        } else if (idioma === 'pt') {
            this.entrenarPortuguese();
        }
    }

    /**
     * NUEVO: Entrenar con ejemplos en English
     */
    entrenarEnglish() {
        const ejemplosEn = [
            { texto: "stop", intencion: "EMERGENCIA", confianza: 0.95 },
            { texto: "emergency stop", intencion: "EMERGENCIA", confianza: 0.95 },
            { texto: "it hurts", intencion: "EMERGENCIA", confianza: 0.85 },
            { texto: "pain in my arm", intencion: "EMERGENCIA", confianza: 0.8 },
            
            { texto: "next flex", intencion: "FLEXION", confianza: 0.9 },
            { texto: "continue", intencion: "FLEXION", confianza: 0.9 },
            { texto: "do another flex", intencion: "FLEXION", confianza: 0.85 },
            
            { texto: "rest", intencion: "REPOSO", confianza: 0.95 },
            { texto: "pause", intencion: "REPOSO", confianza: 0.9 },
            { texto: "take a break", intencion: "REPOSO", confianza: 0.85 },
            
            { texto: "show progress", intencion: "PROGRESO", confianza: 0.85 },
            { texto: "how am I doing", intencion: "PROGRESO", confianza: 0.8 },
            
            { texto: "speed 5", intencion: "VELOCIDAD", confianza: 0.9 },
            { texto: "I want 20 reps", intencion: "OBJETIVO", confianza: 0.85 }
        ];
        
        ejemplosEn.forEach(ej => {
            this.intentClassifier.addDocument(this.extraerPalabrasClaveEN(ej.texto), ej.intencion);
        });
        this.intentClassifier.train();
    }

    /**
     * NUEVO: Entrenar con ejemplos en Portuguese
     */
    entrenarPortuguese() {
        const ejemplosPt = [
            { texto: "parar", intencion: "EMERGENCIA", confianza: 0.95 },
            { texto: "emergência", intencion: "EMERGENCIA", confianza: 0.95 },
            { texto: "dói", intencion: "EMERGENCIA", confianza: 0.85 },
            { texto: "dor no braço", intencion: "EMERGENCIA", confianza: 0.8 },
            
            { texto: "próxima flexão", intencion: "FLEXION", confianza: 0.9 },
            { texto: "continuar", intencion: "FLEXION", confianza: 0.9 },
            { texto: "fazer outra flexão", intencion: "FLEXION", confianza: 0.85 },
            
            { texto: "descansar", intencion: "REPOSO", confianza: 0.95 },
            { texto: "pausa", intencion: "REPOSO", confianza: 0.9 },
            { texto: "tire um tempo", intencion: "REPOSO", confianza: 0.85 },
            
            { texto: "mostrar progresso", intencion: "PROGRESO", confianza: 0.85 },
            { texto: "como estou", intencion: "PROGRESO", confianza: 0.8 },
            
            { texto: "velocidade 5", intencion: "VELOCIDAD", confianza: 0.9 },
            { texto: "quero 20 repetições", intencion: "OBJETIVO", confianza: 0.85 }
        ];
        
        ejemplosPt.forEach(ej => {
            this.intentClassifier.addDocument(this.extraerPalabrasClaveES(ej.texto), ej.intencion);
        });
        this.intentClassifier.train();
    }

    /**
     * NUEVO: Extraer palabras clave en English
     */
    extraerPalabrasClaveEN(texto) {
        const palabras = texto.toLowerCase().split(/\s+/);
        return palabras.join(' ');
    }

    /**
     * NUEVO: Extraer palabras clave en Español/Portugués
     */
    extraerPalabrasClaveES(texto) {
        const palabras = texto.toLowerCase().split(/\s+/);
        return palabras.join(' ');
    }

    /**
     * NUEVO: Detectar idioma automático
     * @param {string} texto
     * @returns {string} - 'es', 'en', o 'pt'
     */
    detectarIdioma(texto) {
        const textoLower = texto.toLowerCase();
        
        // Palabras clave por idioma
        const patronesES = ['duele', 'velocidad', 'flexión', 'quiero', 'objetivo', 'parada', 'sesión'];
        const patronesEN = ['speed', 'flex', 'reps', 'hurt', 'pain', 'stop', 'continue'];
        const patrones_PT = ['dói', 'velocidade', 'flexão', 'quero', 'objetivo', 'parar', 'sessão'];
        
        let conteoES = 0, conteoEN = 0, conteo_PT = 0;
        
        patronesES.forEach(p => { if (textoLower.includes(p)) conteoES++; });
        patronesEN.forEach(p => { if (textoLower.includes(p)) conteoEN++; });
        patrones_PT.forEach(p => { if (textoLower.includes(p)) conteo_PT++; });
        
        if (conteoES > conteoEN && conteoES > conteo_PT) return 'es';
        if (conteoEN > conteo_PT) return 'en';
        if (conteo_PT > 0) return 'pt';
        
        return localStorage.getItem('almaIdioma') || 'es'; // Por defecto español
    }

    /**
     * NUEVO: Generar respuesta en diferentes idiomas
     */
    generarRespuestaIdioma(intencion, idioma = 'es') {
        const respuestas = {
            es: {
                'EMERGENCIA': ['¡Deteniendo inmediatamente!', 'Parada de emergencia activada'],
                'FLEXION': ['Vamos con la siguiente flexión', 'Excelente, continuemos'],
                'REPOSO': ['Descansa un momento', 'Tiempo para recuperarte'],
                'PROGRESO': ['Aquí está tu progreso', 'Miremos cómo vas'],
                'VELOCIDAD': ['Velocidad ajustada', 'Control de velocidad activado'],
                'OBJETIVO': ['Objetivo actualizado', 'Nueva meta establecida']
            },
            en: {
                'EMERGENCIA': ['Stopping immediately!', 'Emergency stop activated'],
                'FLEXION': ['Let\'s do the next flex', 'Great, let\'s continue'],
                'REPOSO': ['Take a moment to rest', 'Time to recover'],
                'PROGRESO': ['Here\'s your progress', 'Let\'s see how you\'re doing'],
                'VELOCIDAD': ['Speed adjusted', 'Speed control activated'],
                'OBJETIVO': ['Goal updated', 'New target set']
            },
            pt: {
                'EMERGENCIA': ['Parando imediatamente!', 'Parada de emergência ativada'],
                'FLEXION': ['Vamos para a próxima flexão', 'Ótimo, continuemos'],
                'REPOSO': ['Descanse um pouco', 'Hora de se recuperar'],
                'PROGRESO': ['Aqui está seu progresso', 'Vamos ver como você está indo'],
                'VELOCIDAD': ['Velocidade ajustada', 'Controle de velocidade ativado'],
                'OBJETIVO': ['Objetivo atualizado', 'Nova meta estabelecida']
            }
        };
        
        const opcionesIdioma = respuestas[idioma] || respuestas['es'];
        const opciones = opcionesIdioma[intencion] || ['Entendido'];
        return opciones[Math.floor(Math.random() * opciones.length)];
    }
}

// Exportar como módulo global
window.NLPEngine = NLPEngine;

