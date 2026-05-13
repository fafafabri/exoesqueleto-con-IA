#!/usr/bin/env node

/**
 * Script de Testing Automatizado - Alma Backend
 * 
 * Uso:
 * node test-api.js
 * 
 * Verifica:
 * - Conectividad al backend
 * - Todos los endpoints principales
 * - Flujo completo: paciente → sesión → repetición → dolor → alerta
 */

const http = require('http');

const API_URL = 'http://localhost:3000';
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

let testResults = [];

/**
 * Hacer request HTTP
 */
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: body ? JSON.parse(body) : null,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

/**
 * Log resultado test
 */
function logTest(name, passed, details = '') {
    const icon = passed ? '✅' : '❌';
    const status = passed ? `${COLORS.green}PASS${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`;
    console.log(`${icon} ${name.padEnd(40)} ${status}${details ? ' - ' + details : ''}`);
    testResults.push({ name, passed });
}

/**
 * Log sección
 */
function logSection(title) {
    console.log(`\n${COLORS.cyan}${'═'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.blue}${title}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${'═'.repeat(60)}${COLORS.reset}\n`);
}

/**
 * Main test suite
 */
async function runTests() {
    console.log(`\n${COLORS.yellow}🏥 ALMA Backend Testing Suite${COLORS.reset}\n`);

    // ===== TEST 1: HEALTH CHECK =====
    logSection('1. Verificación de Conectividad');
    
    try {
        const healthRes = await makeRequest('GET', '/api/health');
        const healthPassed = healthRes.status === 200 && healthRes.data.status === 'ok';
        logTest('Health Check', healthPassed, `Status: ${healthRes.status}`);
    } catch (err) {
        logTest('Health Check', false, `Error: ${err.message}`);
        console.log(`\n${COLORS.red}❌ Backend no está ejecutándose${COLORS.reset}`);
        console.log(`${COLORS.yellow}Abre una terminal y ejecuta:${COLORS.reset}`);
        console.log(`  cd backend`);
        console.log(`  npm install`);
        console.log(`  npm start\n`);
        process.exit(1);
    }

    // ===== TEST 2: PACIENTES =====
    logSection('2. Endpoints de Pacientes');

    // Crear paciente
    const pacienteData = {
        id: `test_${Date.now()}`,
        nombre: 'Test User',
        edad: 45,
        diagnostico: 'Prueba Automatizada',
        objetivoRepeticiones: 20
    };

    let pacienteId = pacienteData.id;
    const createPacRes = await makeRequest('POST', '/api/pacientes', pacienteData);
    logTest('POST /api/pacientes', createPacRes.status === 201, `Status: ${createPacRes.status}`);

    // Obtener paciente
    const getPacRes = await makeRequest('GET', `/api/pacientes/${pacienteId}`);
    logTest('GET /api/pacientes/:id', 
        getPacRes.status === 200 && getPacRes.data.nombre === pacienteData.nombre, 
        `Status: ${getPacRes.status}`);

    // ===== TEST 3: SESIONES =====
    logSection('3. Endpoints de Sesiones');

    // Crear sesión
    const sesionData = {
        pacienteId: pacienteId,
        objetivoReps: 20,
        velocidad: 5
    };

    const createSesRes = await makeRequest('POST', '/api/sesiones', sesionData);
    logTest('POST /api/sesiones', createSesRes.status === 201, `Status: ${createSesRes.status}`);

    let sesionId = createSesRes.data?.id;
    if (!sesionId) {
        console.log(`${COLORS.red}No se pudo obtener sesionId${COLORS.reset}`);
        process.exit(1);
    }

    // Obtener sesión
    const getSesRes = await makeRequest('GET', `/api/sesiones/${sesionId}`);
    logTest('GET /api/sesiones/:id', getSesRes.status === 200, `Status: ${getSesRes.status}`);

    // ===== TEST 4: REPETICIONES =====
    logSection('4. Endpoints de Repeticiones');

    const repData = {
        numero: 1,
        angle: 45,
        velocidad: 5,
        duracion: 3
    };

    const repRes = await makeRequest('POST', `/api/sesiones/${sesionId}/repeticiones`, repData);
    logTest('POST /api/sesiones/:id/repeticiones', repRes.status === 201, `Status: ${repRes.status}`);

    // ===== TEST 5: DOLOR =====
    logSection('5. Endpoints de Dolor');

    const dolorData = {
        intensidad: 7,
        ubicacion: 'hombro',
        repeticionActual: 1,
        anguloEnMomento: 45
    };

    const dolorRes = await makeRequest('POST', `/api/sesiones/${sesionId}/dolor`, dolorData);
    logTest('POST /api/sesiones/:id/dolor', dolorRes.status === 201, `Status: ${dolorRes.status}`);

    // ===== TEST 6: ALERTAS =====
    logSection('6. Endpoints de Alertas');

    const alertaData = {
        pacienteId: pacienteId,
        tipo: 'dolor_intenso',
        mensaje: 'Test de alerta automática'
    };

    const alertaRes = await makeRequest('POST', '/api/alertas', alertaData);
    logTest('POST /api/alertas', alertaRes.status === 201, `Status: ${alertaRes.status}`);

    // Obtener alertas
    const getAlertasRes = await makeRequest('GET', `/api/alertas/${pacienteId}`);
    logTest('GET /api/alertas/:pacienteId', 
        getAlertasRes.status === 200 && Array.isArray(getAlertasRes.data), 
        `Status: ${getAlertasRes.status}, Count: ${getAlertasRes.data?.length}`);

    // ===== TEST 7: FINALIZAR SESIÓN =====
    logSection('7. Finalización de Sesión');

    const finalRes = await makeRequest('PUT', `/api/sesiones/${sesionId}/finalizar`, {
        notas: 'Sesión de prueba completada',
        feedback: ['Prueba exitosa']
    });
    logTest('PUT /api/sesiones/:id/finalizar', finalRes.status === 200, `Status: ${finalRes.status}`);

    // ===== TEST 8: ESTADÍSTICAS =====
    logSection('8. Estadísticas y Exportación');

    const statsRes = await makeRequest('GET', `/api/pacientes/${pacienteId}/estadisticas?dias=30`);
    logTest('GET /api/pacientes/:id/estadisticas', 
        statsRes.status === 200 && statsRes.data.totalSesiones >= 1, 
        `Status: ${statsRes.status}, Sesiones: ${statsRes.data?.totalSesiones}`);

    const exportRes = await makeRequest('GET', `/api/pacientes/${pacienteId}/export`);
    logTest('GET /api/pacientes/:id/export', 
        exportRes.status === 200 && Array.isArray(exportRes.data?.sesiones), 
        `Status: ${exportRes.status}, Sesiones: ${exportRes.data?.sesiones?.length}`);

    // ===== RESUMEN =====
    logSection('Resumen de Resultados');

    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`Total Pruebas: ${total}`);
    console.log(`${COLORS.green}Exitosas: ${passed}${COLORS.reset}`);
    console.log(`${COLORS.red}Fallidas: ${total - passed}${COLORS.reset}`);
    console.log(`Porcentaje: ${percentage}%\n`);

    if (percentage === 100) {
        console.log(`${COLORS.green}✅ ¡TODAS LAS PRUEBAS PASARON!${COLORS.reset}`);
        console.log(`${COLORS.green}Backend está listo para usar.${COLORS.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${COLORS.yellow}⚠️ Algunas pruebas fallaron.${COLORS.reset}`);
        console.log(`${COLORS.yellow}Revisa los logs anteriores para más detalles.${COLORS.reset}\n`);
        process.exit(1);
    }
}

// Ejecutar tests
runTests().catch(err => {
    console.error(`${COLORS.red}Error en test suite:${COLORS.reset}`, err);
    process.exit(1);
});
