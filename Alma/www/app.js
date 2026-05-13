// Referencias al DOM
const btnConnect = document.getElementById('btnConnect');
const statusBadge = document.getElementById('statusBadge');
const transcriptBox = document.getElementById('transcript-box');
const btnStartSession = document.getElementById('btnStartSession');
const almaBody = document.getElementById('almaBody');
const almaContainer = document.querySelector('.alma-container'); // Referencia al contenedor para la animación de escucha
const almaEyes = document.querySelectorAll('.eye');
const almaStatusText = document.getElementById('almaStatusText');

// Referencias del Panel Clínico
const statReps = document.getElementById('statReps');
const statAngle = document.getElementById('statAngle');
const iaFeedback = document.getElementById('iaFeedback');

// Variables Globales
let bluetoothDevice = null;
let bleCharacteristicTX; 
const WAKE_WORD = "alma";
let isConnected = false;
// Placeholder para el nombre del usuario, se podría cargar de un perfil
let userName = "usuario";
// Datos de la Terapia (Simulación de Base de Datos Local)
let patientData = { reps: 0, maxAngle: 0 };

// ===== INICIALIZACIÓN DEL MOTOR NLP Y BD =====
let nlpEngine = null;
let dbManager = null;
let sesionActualId = null;
let pacienteId = 'paciente_001'; // ID único del paciente

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el motor NLP cuando el DOM esté listo
    if (typeof NLPEngine !== 'undefined') {
        nlpEngine = new NLPEngine();
        console.log('✅ NLP Engine inicializado correctamente');
    } else {
        console.warn('⚠️ NLP Engine no disponible, usando análisis simple');
    }

    // Inicializar el gestor de base de datos
    if (typeof DatabaseManager !== 'undefined') {
        dbManager = new DatabaseManager();
        console.log('✅ Database Manager inicializado');
        
        // Crear paciente inicial si no existe
        dbManager.guardarPaciente({
            id: pacienteId,
            nombre: userName,
            diagnostico: 'Rehabilitación de miembros superiores',
            objetivoRepeticiones: 10
        });
    } else {
        console.warn('⚠️ Database Manager no disponible');
    }
});

// ---------------------------------------------------------
// 1. CONTROL DE LA INTERFAZ (Paneles)
// ---------------------------------------------------------
function toggleSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    sheet.classList.toggle('open');
}

// Emociones de Alma (UX visual)
function setAlmaEmotion(emotion) {
    // Centralizamos el control de las emociones únicamente a través del atributo `data-emotion`.
    // El CSS se encargará de todas las transiciones y estilos.
    almaBody.dataset.emotion = emotion; // 'normal', 'happy', 'alert', 'processing'
}

function updateAlmaStatusText(text) {
    almaStatusText.textContent = text;
}

const btnDisconnect = document.getElementById('btnDisconnect');
if(btnDisconnect) btnDisconnect.addEventListener('click', disconnectDevice);

function disconnectDevice() {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
    }
    toggleSheet('settingsSheet');
}

// ---------------------------------------------------------
// 2. AUTO-CONEXIÓN Y BLUETOOTH (Web BLE API)
// ---------------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
    // Iniciar la escucha por voz inmediatamente
    updateAlmaStatusText("Di 'Alma, conecta' para empezar.");
    transcriptBox.innerHTML = "Puedes vincular el dispositivo manualmente o por voz.";
    btnConnect.style.display = 'block';
    recognition.start();

    // Intentar reconectar automáticamente en segundo plano
    try {
        if ('getDevices' in navigator.bluetooth) {
            const dispositivosConocidos = await navigator.bluetooth.getDevices();
            const dispositivoExo = dispositivosConocidos.find(d => d.name === 'EXO_UPN');

            if (dispositivoExo) {
                updateAlmaStatusText("Dispositivo conocido encontrado. Intentando autoconexión...");
                transcriptBox.innerHTML = "Intentando reconectar automáticamente...";
                conectarAlHardware(dispositivoExo);
            }
        }
    } catch (error) {
        console.error("Error en autoconexión:", error);
        // No hacer nada, la conexión manual sigue disponible.
    }
});

btnConnect.addEventListener('click', async () => {
    try {
        transcriptBox.innerHTML = "Abriendo selector de dispositivos Bluetooth...";
        updateAlmaStatusText("Selecciona tu exoesqueleto...");
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] }]
        });
        
        conectarAlHardware(device);

    } catch (error) {
        transcriptBox.innerHTML = `Error: No se pudo conectar. <br><span style="font-size:0.7rem">${error}</span>`;
        btnConnect.style.display = 'block';
    }
});

async function conectarAlHardware(bluetoothDevice) {
    try {
        const server = await bluetoothDevice.gatt.connect();
        window.bluetoothDevice = bluetoothDevice; // Store globally
        const service = await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
        bleCharacteristicTX = await service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
        const bleCharacteristicRX = await service.getCharacteristic("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
        
        // Escuchar al ESP32 (Feedback del hardware)
        await bleCharacteristicRX.startNotifications();
        bleCharacteristicRX.addEventListener('characteristicvaluechanged', handleESP32Feedback);

        // Actualizar UI
        isConnected = true;
        statusBadge.textContent = "SISTEMA ACTIVO";
        statusBadge.classList.add('connected');
        btnConnect.style.display = 'none';
        btnStartSession.style.display = 'block'; // Mostrar botón de iniciar sesión
        almaContainer.classList.remove('listening'); // Asegurarse de que no esté pulsando antes de iniciar
        transcriptBox.innerHTML = "Exoesqueleto conectado. Listo para iniciar sesión.";
        updateAlmaStatusText("Conectado. Pulsa 'Iniciar Sesión'.");
        setAlmaEmotion('normal');
        
        speak(`Hola ${userName}. Soy Alma, tu asistente de rehabilitación. Estoy sincronizada. Di 'Alma, inicia sesión' cuando estés listo.`);

        // Si se desconecta físicamente el hardware
        bluetoothDevice.addEventListener('gattserverdisconnected', () => {
            isConnected = false;
            statusBadge.textContent = "DESCONECTADO";
            statusBadge.classList.remove('connected');
            almaBody.classList.remove('listening');
            transcriptBox.innerHTML = "Dispositivo desconectado. Di 'Alma, conecta' para vincular de nuevo.";
            updateAlmaStatusText("¡Atención! Conexión perdida.");
            speak("Alerta. Se ha perdido la conexión con el exoesqueleto. Por favor, verifica el dispositivo.");
            btnConnect.style.display = 'block'; 
            btnStartSession.style.display = 'none';
            setAlmaEmotion('alert');
        });

    } catch (error) {
        transcriptBox.innerHTML = "Error al conectar con el hardware: Asegúrate de que el brazo esté encendido.";
        updateAlmaStatusText("Error al conectar hardware.");
        btnConnect.style.display = 'block';
        setAlmaEmotion('alert');
    }
}

btnStartSession.addEventListener('click', startSession);

async function startSession() {
    btnStartSession.style.display = 'none';
    almaContainer.classList.add('listening'); // Empezar a pulsar cuando escucha
    transcriptBox.innerHTML = "Micrófono abierto.<br>Di <b>'Alma'</b> seguido de tu instrucción.";
    updateAlmaStatusText("Escuchando...");
    setAlmaEmotion('normal'); // Alma en estado normal mientras escucha
    speak(`Bienvenido de nuevo, ${userName}. Sesión iniciada. Estoy lista para tus comandos.`);
    
    // Crear sesión en la BD si está disponible
    if (dbManager) {
        try {
            const sesion = await dbManager.crearSesion({
                pacienteId: pacienteId,
                notas: `Sesión iniciada automáticamente - ${new Date().toLocaleString()}`
            });
            sesionActualId = sesion.id;
            console.log(`📊 Nueva sesión creada: ID ${sesionActualId}`);
            
            // Sincronizar sesión con servidor
            if (syncManager) {
                await syncManager.guardarSesion(sesion, pacienteId);
            }
        } catch (error) {
            console.error('Error al crear sesión:', error);
        }
    }
    
    // La reconocimiento ya está en marcha, no es necesario iniciarlo aquí.
}

// ---------------------------------------------------------
// 3. RECONOCIMIENTO DE VOZ CONTINUO (Manos libres)
// ---------------------------------------------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'es-PE';
recognition.continuous = true; 
recognition.interimResults = false;

recognition.onresult = (event) => {
    const speech = event.results[event.results.length - 1][0].transcript.toLowerCase();
    setAlmaEmotion('processing'); // Set processing emotion
    updateAlmaStatusText("Procesando...");
    // Filtrado de la Palabra de Activación (Wake Word)
    if (speech.includes(WAKE_WORD)) {
        transcriptBox.innerHTML = `<strong>Enviando a IA:</strong> "${speech}"`;
        analizarIntencionLocal(speech.replace(WAKE_WORD, '').trim()); // Eliminar la palabra de activación antes de analizar
    } else {
        console.log("Ruido de fondo ignorado:", speech);
        updateAlmaStatusText("Escuchando..."); // Vuelve a escuchar si no es para Alma
        setAlmaEmotion('normal'); // Return to normal after ignoring
    }
};

recognition.onend = () => {
    // Siempre reiniciar la escucha para permitir el control total por voz
    recognition.start();
};

// ---------------------------------------------------------
// 4. LÓGICA DE CONTROL Y MONITOREO CLÍNICO (CON NLP)
// ---------------------------------------------------------

function analizarIntencionLocal(texto) {
    // Usar NLP Engine si está disponible, sino usar análisis simple
    if (nlpEngine) {
        return analizarConNLP(texto);
    } else {
        return analizarConMetodoSimple(texto);
    }
}

/**
 * Análisis inteligente con NLP
 */
async function analizarConNLP(texto) {
    // Analizar la intención con el motor NLP
    const analisis = nlpEngine.analizarIntencion(texto);
    const respuesta = nlpEngine.generarRespuesta(analisis, patientData.reps);
    const sentimiento = nlpEngine.analizarSentimiento(texto);
    
    // Registrar el comando para aprendizaje
    if (analisis.intencion) {
        nlpEngine.registrarComando(analisis.intencion, texto);
    }

    // Guardar interacción en la BD si la sesión está activa
    if (dbManager && sesionActualId) {
        try {
            await dbManager.guardarInteraccion(sesionActualId, {
                textoUsuario: texto,
                intencion: analisis.intencion,
                confianza: analisis.confianza,
                sentimiento: sentimiento,
                respuestaAlma: respuesta.mensaje,
                accion: respuesta.accion
            });
        } catch (error) {
            console.error('Error al guardar interacción:', error);
        }
    }

    // ========== NUEVOS COMANDOS: VELOCIDAD Y OBJETIVO ==========
    
    // Detectar si el usuario especifica velocidad (1-10)
    const velocidad = nlpEngine.extraerVelocidad(texto);
    if (velocidad) {
        await procesarComandoVelocidad(velocidad);
        return; // Salir después de procesar velocidad
    }

    // Detectar si el usuario especifica objetivo de repeticiones
    const objetivoReps = nlpEngine.extraerObjetivo(texto);
    if (objetivoReps) {
        await procesarComandoObjetivo(objetivoReps);
        return; // Salir después de procesar objetivo
    }

    // Detectar si hay reporte de dolor/molestia
    const evaluacionDolor = nlpEngine.evaluarDolor(texto);
    if (evaluacionDolor.tieneDolor) {
        await procesarDolor(evaluacionDolor);
        return; // Salir después de procesar dolor
    }

    // Manejar la respuesta según la acción
    switch (respuesta.accion) {
        case 'EMERGENCIA':
            setAlmaEmotion('alert');
            enviarAlESP32("EMERGENCIA");
            speak(respuesta.mensaje);
            updateAlmaStatusText("¡ALERTA! Motor detenido.");
            cerrarTodosLosPaneles();
            break;

        case 'FLEXION':
            setAlmaEmotion('happy');
            enviarAlESP32("FLEXION");
            speak(respuesta.mensaje);
            updateAlmaStatusText("Realizando flexión.");
            patientData.reps++;
            actualizarPanelClinico();
            break;

        case 'REPOSO':
            setAlmaEmotion('normal');
            enviarAlESP32("REPOSO");
            speak(respuesta.mensaje);
            updateAlmaStatusText("Reposando...");
            break;

        case 'MOSTRAR_PROGRESO':
            speak(respuesta.mensaje);
            abrirPanelControlado('progressSheet');
            setAlmaEmotion('happy');
            break;

        case 'ABRIR_AJUSTES':
            speak(respuesta.mensaje);
            abrirPanelControlado('settingsSheet');
            setAlmaEmotion('normal');
            break;

        case 'TERMINAR':
            setAlmaEmotion('normal');
            enviarAlESP32("REPOSO");
            updateAlmaStatusText("Finalizando sesión.");
            speak(respuesta.mensaje);
            
            // Finalizar sesión en la BD
            if (dbManager && sesionActualId) {
                try {
                    await dbManager.finalizarSesion(sesionActualId, {
                        notas: 'Sesión finalizada por comando del usuario',
                        feedback: [respuesta.mensaje]
                    });
                    console.log(`✅ Sesión ${sesionActualId} finalizada en BD`);
                    
                    // Sincronizar con servidor
                    if (syncManager) {
                        await syncManager.finalizarSesion(sesionActualId, {
                            duracion: patientData.reps,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Enviar alerta si hay riesgo alto
                        const riesgo = await dbManager.predecirRiesgoDolor(pacienteId);
                        if (riesgo.riesgo === 'alto') {
                            await syncManager.enviarAlerta(pacienteId, 'riesgo_alto_dolor', 
                                `Riesgo alto de dolor detectado: ${riesgo.razon}`);
                        }
                    }
                    
                    // Mostrar recomendaciones para próxima sesión (ML)
                    const plan = await dbManager.sugerirPlanTerapeutico(pacienteId);
                    if (plan) {
                        console.log(`📋 Plan sugerido: ${plan.resumen}`);
                        speak(`Tu próxima sesión: ${plan.proximaSesion.razon}`);
                    }
                    
                    // Actualizar gráficos finales
                    if (dashboardManager) {
                        await dashboardManager.actualizarDashboard();
                    }
                    
                    sesionActualId = null;
                } catch (error) {
                    console.error('Error al finalizar sesión:', error);
                }
            }
            
            programarProximaSesion();
            if (bluetoothDevice && bluetoothDevice.gatt.connected) {
                bluetoothDevice.gatt.disconnect();
            }
            return;

        case 'IGNORAR':
            speak(respuesta.mensaje);
            setAlmaEmotion('normal');
            updateAlmaStatusText("Escuchando...");
            break;

        case 'NO_RECONOCIDO':
        default:
            speak(respuesta.mensaje);
            updateAlmaStatusText("Comando no reconocido.");
            setAlmaEmotion('alert');
            setTimeout(() => {
                setAlmaEmotion('normal');
                updateAlmaStatusText("Escuchando...");
            }, 2000);
    }

    // Log para debugging
    console.log(`NLP - Intención: ${analisis.intencion} (confianza: ${(analisis.confianza * 100).toFixed(1)}%)`);
}

/**
 * Análisis simple como fallback (método original)
 */
function analizarConMetodoSimple(texto) {
    // A. COMANDOS DE NAVEGACIÓN (Manipulación de la Interfaz)
    if (texto.includes("registro") || texto.includes("progreso") || texto.includes("sesiones")) {
        speak("¡Claro! Abriendo tu panel de progreso clínico.");
        abrirPanelControlado('progressSheet');
        setAlmaEmotion('happy');
    }
    else if (texto.includes("ajustes") || texto.includes("configuración") || texto.includes("opciones")) {
        speak("Accediendo a los ajustes del sistema. Aquí puedes personalizar mi experiencia.");
        abrirPanelControlado('settingsSheet');
        setAlmaEmotion('normal');
    }
    else if (texto.includes("cierra") || texto.includes("regresa") || texto.includes("atrás") || texto.includes("oculta")) {
        speak("Entendido, regresando a la pantalla principal.");
        cerrarTodosLosPaneles();
        setAlmaEmotion('normal');
        updateAlmaStatusText("Esperando comandos.");
    }

    // B. COMANDOS MECATRÓNICOS (Seguridad y Motor)
    else if (texto.includes("duele") || texto.includes("para") || texto.includes("detente") || texto.includes("emergencia")) {
        setAlmaEmotion('alert');
        enviarAlESP32("EMERGENCIA");
        speak("Alerta detectada. Deteniendo motor y liberando tensión.");
        updateAlmaStatusText("¡ALERTA! Motor detenido.");
        cerrarTodosLosPaneles();
    }
    else if (texto.includes("esfuerzo") || texto.includes("subir") || texto.includes("dobla")) {
        setAlmaEmotion('happy');
        enviarAlESP32("FLEXION");
        speak("Iniciando flexión controlada. Mantén la calma.");
        updateAlmaStatusText("Realizando flexión.");
        patientData.reps++;
        actualizarPanelClinico();
    }
    
    // C. COMANDOS DE DESPEDIDA
    else if (texto.includes("terminar") || texto.includes("fin") || texto.includes("hasta mañana") || texto.includes("adiós")) {
        setAlmaEmotion('normal');
        enviarAlESP32("REPOSO");
        updateAlmaStatusText("Finalizando sesión.");
        speak("Excelente trabajo hoy. He guardado tu progreso. Hasta la próxima.");
        programarProximaSesion();
        
        if (bluetoothDevice && bluetoothDevice.gatt.connected) {
            bluetoothDevice.gatt.disconnect();
        }
        return;
    }
    // COMANDOS DE CONEXIÓN Y SESIÓN
    else if ((texto.includes("conecta") || texto.includes("vincula") || texto.includes("enlaza")) && btnConnect.style.display !== 'none') {
        speak("Iniciando la búsqueda de dispositivos. Por favor, selecciona el exoesqueleto.");
        updateAlmaStatusText("Buscando dispositivos...");
        btnConnect.click();
        return;
    }
    else if ((texto.includes("inicia sesión") || texto.includes("empecemos")) && btnStartSession.style.display !== 'none') {
        startSession();
        return;
    }
    else if ((texto.includes("desvincula") || texto.includes("desconecta")) && isConnected) {
        speak("Entendido. Desvinculando el dispositivo actual.");
        updateAlmaStatusText("Desvinculando...");
        disconnectDevice();
        return;
    }
    else if (texto.length > 0) {
        speak("Lo siento, no entendí ese comando. ¿Podrías repetirlo?");
        updateAlmaStatusText("Comando no reconocido.");
        setAlmaEmotion('alert');
        setTimeout(() => {
            setAlmaEmotion('normal');
            updateAlmaStatusText("Escuchando...");
        }, 2000);
    }
}

// =========================================================================
// NUEVAS FUNCIONES DE CONTROL DINÁMICO
// =========================================================================

/**
 * Procesar comando de velocidad (1-10)
 */
async function procesarComandoVelocidad(velocidad) {
    setAlmaEmotion('processing');
    updateAlmaStatusText(`Ajustando velocidad a ${velocidad}/10...`);
    
    // Guardar velocidad en sesión
    if (dbManager && sesionActualId) {
        try {
            await dbManager.actualizarVelocidadSesion(sesionActualId, velocidad);
        } catch (error) {
            console.error('Error al guardar velocidad:', error);
        }
    }
    
    // Enviar comando ESP32 con velocidad
    const comando = `VELOCIDAD:${velocidad}`;
    enviarAlESP32(comando);
    
    // Respuesta
    const mensajes = {
        1: "Movimiento muy lento. Perfecto para máxima precisión.",
        3: "Velocidad baja. Control total del movimiento.",
        5: "Velocidad normal. Balance entre velocidad y control.",
        7: "Velocidad rápida. Ritmo acelerado.",
        10: "Velocidad máxima. ¡Mucho cuidado!"
    };
    
    const mensaje = mensajes[velocidad] || `Velocidad ajustada a ${velocidad} de 10.`;
    speak(mensaje);
    
    setAlmaEmotion('happy');
    updateAlmaStatusText(`Velocidad: ${velocidad}/10`);
    
    console.log(`⚡ Velocidad configurada: ${velocidad}/10`);
}

/**
 * Procesar comando de objetivo personalizado
 */
async function procesarComandoObjetivo(nuevoObjetivo) {
    if (nuevoObjetivo < 1 || nuevoObjetivo > 100) {
        speak("Por favor, especifica un número entre 1 y 100 repeticiones.");
        return;
    }
    
    setAlmaEmotion('happy');
    updateAlmaStatusText(`Nuevo objetivo: ${nuevoObjetivo} repeticiones`);
    
    // Actualizar en sesión
    if (dbManager && sesionActualId) {
        try {
            await dbManager.actualizarObjetivoSesion(sesionActualId, nuevoObjetivo);
        } catch (error) {
            console.error('Error al actualizar objetivo:', error);
        }
    }
    
    // Respuesta personalizada
    let mensaje = '';
    if (nuevoObjetivo < 5) {
        mensaje = `Objetivo ajustado a ${nuevoObjetivo} repeticiones. Vamos paso a paso.`;
    } else if (nuevoObjetivo < 15) {
        mensaje = `Excelente meta: ${nuevoObjetivo} repeticiones. ¡Podemos lograrlo!`;
    } else {
        mensaje = `¡Objetivo ambicioso! ${nuevoObjetivo} repeticiones. Te voy a ayudar a alcanzarlo.`;
    }
    
    speak(mensaje);
    console.log(`🎯 Objetivo actualizado: ${nuevoObjetivo} reps`);
}

/**
 * Procesar reporte de dolor/molestia
 */
async function procesarDolor(evaluacionDolor) {
    const { intensidad, ubicacion, tieneDolor } = evaluacionDolor;
    
    setAlmaEmotion('alert');
    updateAlmaStatusText(`Alerta de dolor: ${intensidad}/10 en ${ubicacion}`);
    
    // Registrar evento de dolor en BD
    if (dbManager && sesionActualId) {
        try {
            const eventoDocencia = {
                repeticionActual: patientData.reps,
                anguloEnMomento: patientData.maxAngle,
                intensidad: intensidad,
                ubicacion: ubicacion,
                notas: 'Reporte de dolor durante sesión'
            };
            
            await dbManager.registrarDolor(sesionActualId, eventoDocencia);
            
            // Sincronizar evento de dolor con servidor
            if (syncManager) {
                await syncManager.registrarDolor(sesionActualId, eventoDocencia);
            }
            
            // Predecir riesgo futuro basado en este evento
            const riesgo = await dbManager.predecirRiesgoDolor(pacienteId);
            console.log(`⚠️ Riesgo predicho: ${riesgo.riesgo} (${(riesgo.confianza * 100).toFixed(0)}%) - ${riesgo.razon}`);
            
            // Enviar alerta inmediata si es grave
            if (intensidad >= 7 && syncManager) {
                await syncManager.enviarAlerta(pacienteId, 'dolor_intenso', 
                    `Paciente reporta dolor ${intensidad}/10 en ${ubicacion}`);
            }
        } catch (error) {
            console.error('Error al registrar dolor:', error);
        }
    }
    
    // Respuesta según intensidad
    let mensaje = '';
    let accion = '';
    
    if (intensidad >= 8) {
        // EMERGENCIA - Dolor muy intenso
        mensaje = `¡ATENCIÓN! Dolor muy intenso detectado. Deteniendo ejercicio inmediatamente por tu seguridad.`;
        accion = 'EMERGENCIA';
        enviarAlESP32("EMERGENCIA");
    } else if (intensidad >= 6) {
        // Dolor moderado-intenso - Reduce velocidad
        mensaje = `Dolor moderado detectado en ${ubicacion}. Reduciendo velocidad y dificultad.`;
        accion = 'REDUCIR_VELOCIDAD';
        enviarAlESP32("VELOCIDAD:3"); // Velocidad muy baja
    } else if (intensidad >= 4) {
        // Dolor leve - Pausa
        mensaje = `Molestia detectada en ${ubicacion}. Vamos a hacer una pausa. Respira profundo.`;
        accion = 'PAUSA';
        enviarAlESP32("REPOSO");
    } else {
        // Molestia muy leve
        mensaje = `Entendido, hay una leve molestia en ${ubicacion}. Continuaremos con cuidado. Dime si empeora.`;
        accion = 'MONITOREAR';
    }
    
    speak(mensaje);
    console.log(`📍 Dolor registrado: ${intensidad}/10 - ${ubicacion} - Acción: ${accion}`);
    
    // Volver a normalidad después de unos segundos
    setTimeout(() => {
        if (intensidad < 8) {
            setAlmaEmotion('normal');
            updateAlmaStatusText('Escuchando...');
        }
    }, 3000);
}

// Funciones auxiliares para una UI fluida
function abrirPanelControlado(id) {
    cerrarTodosLosPaneles(); // Cerramos otros para evitar conflictos
    document.getElementById(id).classList.add('open');
    almaContainer.classList.remove('listening'); // Detener animación de escucha al abrir panel
    // Efecto visual: la tarjeta principal de Alma se encoge un poco para dar espacio
    document.getElementById('mainCard').style.transform = "scale(0.85)";
    document.getElementById('mainCard').style.opacity = "0.5";
    recognition.stop(); // Detener escucha mientras el panel está abierto
    updateAlmaStatusText("Panel abierto.");
}

function cerrarTodosLosPaneles() {
    document.querySelectorAll('.bottom-sheet').forEach(sheet => {
        sheet.classList.remove('open');
    });
    almaContainer.classList.add('listening'); // Reanudar animación de escucha al cerrar paneles
    document.getElementById('mainCard').style.transform = "scale(1)";
    document.getElementById('mainCard').style.opacity = "1";
    recognition.start(); // Reanudar escucha
    updateAlmaStatusText("Escuchando...");
}

async function actualizarPanelClinico() {
    statReps.textContent = patientData.reps;
    statAngle.textContent = patientData.maxAngle + "°";

    // Guardar repetición en la BD si la sesión está activa
    if (dbManager && sesionActualId) {
        try {
            await dbManager.guardarRepeticion(sesionActualId, {
                numero: patientData.reps,
                angle: patientData.maxAngle,
                maxAngleAlcanzado: patientData.maxAngle,
                esfuerzo: 'normal'
            });
            
            // Actualizar gráficos en tiempo real
            if (dashboardManager) {
                dashboardManager.actualizarEstadisticasSimples(
                    patientData.reps,
                    patientData.maxAngle,
                    patientData.objetivo || 10
                );
            }
        } catch (error) {
            console.error('Error al guardar repetición:', error);
        }
    }

    // Feedback más dinámico y personalizado
    if (patientData.reps === 0) {
        iaFeedback.innerHTML = "✨ <strong>Sugerencia Clínica:</strong><br>¡Ánimo! Tu primera repetición es el inicio de un gran progreso.";
    } else if (patientData.reps === 1) {
        iaFeedback.innerHTML = "✨ <strong>Sugerencia Clínica:</strong><br>¡Excelente! Ya tienes tu primera repetición. Sigue así.";
    } else if (patientData.reps > 1 && patientData.reps < 5) {
        iaFeedback.innerHTML = `✨ <strong>Progreso:</strong><br>¡Vas muy bien! Llevas ${patientData.reps} repeticiones. Sigue con ese ritmo.`;
    }
    else if (patientData.reps >= 5 && patientData.reps < 10) {
        iaFeedback.innerHTML = "✨ <strong>Sugerencia Clínica:</strong><br>La articulación está respondiendo muy bien. Recomiendo mantener la rutina actual para no sobrecargar el músculo.";
    } else if (patientData.reps >= 10) {
        iaFeedback.innerHTML = "✨ <strong>¡Logro!</strong><br>Has alcanzado 10 o más repeticiones. Tu dedicación es admirable. ¡Sigue así!";
    }
}

/**
 * Actualizar panel de progreso con recomendaciones ML
 */
async function actualizarPanelProgressoAvanzado() {
    if (!dbManager || !sesionActualId) return;
    
    try {
        // Mostrar recomendaciones personalizadas
        const sesiones = await dbManager.obtenerSesionesPaciente(pacienteId);
        if (dashboardManager && sesiones.length > 0) {
            await dashboardManager.mostrarRecomendaciones(sesiones);
            await dashboardManager.actualizarDashboard();
        }
    } catch (error) {
        console.error('Error al actualizar panel avanzado:', error);
    }
}

// ---------------------------------------------------------
// 5. COMUNICACIÓN HARDWARE Y TTS
// ---------------------------------------------------------
/**
 * Enviar comando mejorado al ESP32
 * Comandos disponibles:
 *   - EMERGENCIA: Detener inmediatamente
 *   - FLEXION: Iniciar flexión
 *   - REPOSO: Modo reposo
 *   - VELOCIDAD:1-10: Ajustar velocidad (1=muy lento, 10=muy rápido)
 *   - REPS:N: Indicar cantidad de repeticiones
 */
async function enviarAlESP32(comando) {
    if (!bleCharacteristicTX) {
        console.warn('⚠️ Característica TX no disponible. No se puede enviar comando.');
        return;
    }
    
    try {
        const encoder = new TextEncoder();
        const datos = comando + '\n';
        await bleCharacteristicTX.writeValue(encoder.encode(datos));
        console.log(`📤 ESP32 ← ${comando}`);
    } catch (error) {
        console.error('❌ Error al enviar comando ESP32:', error);
    }
}

function handleESP32Feedback(event) {
    const respuesta = new TextDecoder().decode(event.target.value).trim();
    console.log("ESP32 dice:", respuesta);
    if(respuesta === "ALERTA_PARADA") {
        updateAlmaStatusText("Alerta del exoesqueleto.");
        setAlmaEmotion('alert');
        setTimeout(() => {
            setAlmaEmotion('normal');
            updateAlmaStatusText("Escuchando...");
        }, 3000);
    }
}

function speak(texto, emotion = 'normal') { // Añadir parámetro de emoción para variar tono
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'es-PE';
    utter.pitch = 1.05; // Tono ligeramente más agudo para sonar amigable
    utter.rate = 0.95; // Ligeramente más lento para claridad médica
    window.speechSynthesis.speak(utter);
}

// Botón de emergencia manual en ajustes
function emergencyStopApp() {
    if(isConnected) {
        enviarAlESP32("EMERGENCIA");
        toggleSheet('settingsSheet');
        setAlmaEmotion('alert');
        updateAlmaStatusText("Parada de emergencia manual.");
        speak("Parada de emergencia activada manualmente.");
    }
}

// ---------------------------------------------------------
// 6. SISTEMA PROACTIVO DE ALMA (Notificaciones)
// ---------------------------------------------------------

// Función para pedir permiso de notificaciones al celular
async function solicitarPermisosAlma() {
    if (window.Capacitor && Capacitor.Plugins.LocalNotifications) {
        const { LocalNotifications } = Capacitor.Plugins;
        let permStatus = await LocalNotifications.checkPermissions();
        
        if (permStatus.display !== 'granted') {
            await LocalNotifications.requestPermissions();
        }
    }
}

// Función que Alma ejecuta para programar la próxima terapia
async function programarProximaSesion() {
    if (window.Capacitor && Capacitor.Plugins.LocalNotifications) {
        const { LocalNotifications } = Capacitor.Plugins;

        // Programar para dentro de 24 horas (u otra hora específica)
        // Para probarlo en tu tesis, puedes cambiar '1000 * 60 * 60 * 24' por '1000 * 10' (10 segundos)
        const fechaProximaSesion = new Date(new Date().getTime() + 1000 * 60 * 60 * 24); 

        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "Hola, soy Alma 🤖",
                    body: "Es hora de nuestra sesión de rehabilitación. Toca aquí para empezar.",
                    id: 1,
                    schedule: { at: fechaProximaSesion },
                    sound: null, // Usa el sonido por defecto del celular
                    actionTypeId: "",
                    extra: null
                }
            ]
        });

        console.log("Alma ha programado la siguiente sesión para:", fechaProximaSesion);
    }
}

// Ejecutar la petición de permisos apenas se abre la app
window.addEventListener('DOMContentLoaded', () => {
    solicitarPermisosAlma();
});