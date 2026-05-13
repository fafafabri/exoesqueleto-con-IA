/**
 * Dashboard Manager - Visualización de Progreso con Chart.js
 * Maneja gráficos de velocidad, progreso vs objetivo, y historial de dolor
 */

class DashboardManager {
    constructor() {
        this.charts = {
            velocidad: null,
            progreso: null,
            dolor: null
        };
        this.chartInstances = {};
    }

    /**
     * Inicializar dashboard
     */
    async inicializar() {
        console.log('📊 Dashboard Manager iniciado');
        
        // Cargar datos de BD y mostrar
        if (window.dbManager) {
            await this.actualizarDashboard();
        }
    }

    /**
     * Actualizar todos los gráficos con datos recientes
     */
    async actualizarDashboard() {
        try {
            const pacienteId = 'paciente_001'; // TODO: hacer dinámico
            const stats = await dbManager.obtenerEstadisticasPaciente(pacienteId, 30);
            
            if (stats.sesiones && stats.sesiones.length > 0) {
                this.actualizarGraficoVelocidad(stats.sesiones);
                this.actualizarGraficoProgreso(stats.sesiones);
                this.actualizarHistorialDolor(stats.sesiones);
            }
        } catch (error) {
            console.error('❌ Error actualizando dashboard:', error);
        }
    }

    /**
     * Gráfico de Velocidad Promedio por Sesión
     */
    actualizarGraficoVelocidad(sesiones) {
        const ctx = document.getElementById('chartVelocidad');
        if (!ctx) return;

        const datos = sesiones.map(s => ({
            fecha: new Date(s.fecha).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }),
            velocidad: s.velocidadPromed || 5,
            objetivo: s.objetivoReps || 10
        })).reverse();

        if (this.chartInstances.velocidad) {
            this.chartInstances.velocidad.destroy();
        }

        this.chartInstances.velocidad = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datos.map(d => d.fecha),
                datasets: [
                    {
                        label: 'Velocidad Promedio (1-10)',
                        data: datos.map(d => d.velocidad),
                        borderColor: '#5c6bc0',
                        backgroundColor: 'rgba(92, 107, 192, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#5c6bc0',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { size: 12 }, color: '#2c3e50' }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 10,
                        beginAtZero: true,
                        ticks: { color: '#666', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        ticks: { color: '#666', font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /**
     * Gráfico de Progreso vs Objetivo (Actual)
     */
    actualizarGraficoProgreso(sesiones) {
        const ctx = document.getElementById('chartProgreso');
        if (!ctx) return;

        // Última sesión
        const ultimaSesion = sesiones[sesiones.length - 1];
        const objetivo = ultimaSesion.objetivoReps || 10;
        const completadas = ultimaSesion.repeticiones || 0;
        const faltantes = Math.max(0, objetivo - completadas);

        if (this.chartInstances.progreso) {
            this.chartInstances.progreso.destroy();
        }

        this.chartInstances.progreso = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completadas', 'Por Alcanzar'],
                datasets: [{
                    data: [completadas, faltantes],
                    backgroundColor: ['#66bb6a', '#e0e0e0'],
                    borderColor: ['#fff', '#fff'],
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, color: '#2c3e50', padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + ' reps';
                            }
                        }
                    }
                }
            }
        });

        // Actualizar texto de progreso
        const textoProgreso = document.getElementById('textoProgreso');
        if (textoProgreso) {
            const porcentaje = Math.round((completadas / objetivo) * 100);
            textoProgreso.textContent = `${completadas} de ${objetivo} (${porcentaje}%)`;
        }
    }

    /**
     * Historial de Eventos de Dolor
     */
    actualizarHistorialDolor(sesiones) {
        const container = document.getElementById('historialdolor');
        if (!container) return;

        let html = '';
        let totalEventosDolor = 0;
        let intensidadMax = 0;
        const ubicacionesConDolor = {};

        // Recopilar todos los eventos de dolor
        sesiones.forEach(sesion => {
            if (sesion.eventosDolor && sesion.eventosDolor.length > 0) {
                sesion.eventosDolor.forEach(evento => {
                    totalEventosDolor++;
                    if (evento.intensidad > intensidadMax) {
                        intensidadMax = evento.intensidad;
                    }
                    
                    // Contar ubicaciones
                    ubicacionesConDolor[evento.ubicacion] = 
                        (ubicacionesConDolor[evento.ubicacion] || 0) + 1;
                });
            }
        });

        if (totalEventosDolor === 0) {
            html = '<p style="text-align: center; color: #999; font-size: 13px;">✅ Sin reportes de dolor</p>';
        } else {
            // Tabla de resumen
            html += `<div style="background: #fff3e0; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #f57c00;">⚠️ Resumen de Dolor</p>
                <p style="margin: 0; font-size: 12px; color: #333;">
                    <strong>Eventos totales:</strong> ${totalEventosDolor}<br>
                    <strong>Intensidad máxima:</strong> ${intensidadMax}/10
                </p>
            </div>`;

            // Ubicaciones afectadas
            if (Object.keys(ubicacionesConDolor).length > 0) {
                html += '<p style="margin: 12px 0 8px 0; font-weight: 600; color: #333; font-size: 13px;">Ubicaciones afectadas:</p>';
                html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
                
                Object.entries(ubicacionesConDolor).forEach(([ubicacion, cantidad]) => {
                    html += `<div style="background: #ffcccc; padding: 8px; border-radius: 5px; font-size: 12px;">
                        <strong>${ubicacion}</strong><br>
                        ${cantidad} evento(s)
                    </div>`;
                });
                
                html += '</div>';
            }
        }

        container.innerHTML = html;
    }

    /**
     * Mostrar recomendación personalizada (ML Simple)
     */
    async mostrarRecomendaciones(sesiones) {
        const container = document.getElementById('recomendaciones');
        if (!container) return;

        let recomendaciones = [];

        if (sesiones.length > 0) {
            const ultimaSesion = sesiones[sesiones.length - 1];
            const sesionAnterior = sesiones[sesiones.length - 2];

            // Recomendación 1: Velocidad
            if (ultimaSesion.velocidadPromed) {
                if (ultimaSesion.velocidadPromed <= 3) {
                    recomendaciones.push({
                        tipo: '⚡',
                        texto: 'Buena recuperación con velocidad baja. Próxima sesión: intenta velocidad 4-5.'
                    });
                } else if (ultimaSesion.velocidadPromed >= 8) {
                    recomendaciones.push({
                        tipo: '⚡',
                        texto: 'Excelente rendimiento. ¿Quieres intentar velocidad 9-10?'
                    });
                }
            }

            // Recomendación 2: Progreso
            if (ultimaSesion.repeticiones >= ultimaSesion.objetivoReps) {
                recomendaciones.push({
                    tipo: '🎯',
                    texto: `¡Completaste tu objetivo de ${ultimaSesion.objetivoReps}! Aumenta a ${ultimaSesion.objetivoReps + 5} próxima vez.`
                });
            }

            // Recomendación 3: Dolor
            if (ultimaSesion.eventosDolor && ultimaSesion.eventosDolor.length > 0) {
                const maxDolor = Math.max(...ultimaSesion.eventosDolor.map(e => e.intensidad));
                if (maxDolor >= 6) {
                    const ubicacion = ultimaSesion.eventosDolor[0].ubicacion;
                    recomendaciones.push({
                        tipo: '📍',
                        texto: `Dolor detectado en ${ubicacion}. Próxima sesión: reduce velocidad a 3-4.`
                    });
                }
            }

            // Recomendación 4: Consistencia
            if (sesiones.length >= 5) {
                recomendaciones.push({
                    tipo: '📈',
                    texto: `${sesiones.length} sesiones completadas. ¡Vas muy bien! Mantén la consistencia.`
                });
            }
        }

        // Mostrar recomendaciones
        let html = '';
        recomendaciones.forEach(rec => {
            html += `<div style="background: #f0f4ff; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #5c6bc0;">
                <span style="font-size: 16px; margin-right: 8px;">${rec.tipo}</span>
                <span style="font-size: 13px; color: #333;">${rec.texto}</span>
            </div>`;
        });

        if (html) {
            container.innerHTML = html;
        }
    }

    /**
     * Actualizar estadísticas simples (sin gráficos)
     */
    actualizarEstadisticasSimples(reps, maxAngle, objetivo) {
        const statReps = document.getElementById('statReps');
        const statAngle = document.getElementById('statAngle');
        
        if (statReps) statReps.textContent = `${reps}/${objetivo || 10}`;
        if (statAngle) statAngle.textContent = `${maxAngle}°`;
    }
}

// Instancia global
let dashboardManager = null;

// Inicializar cuando cargue DOM
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new DashboardManager();
    dashboardManager.inicializar();
});
