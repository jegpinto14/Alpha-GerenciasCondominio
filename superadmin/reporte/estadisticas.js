/**
 * Estadísticas de Registro - JavaScript
 */

const API_BASE = '../api';
let barChart = null;
let pieChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstadisticas();
});

async function cargarEstadisticas() {
    try {
        console.log('Cargando estadísticas...');
        const response = await fetch(`${API_BASE}/estadisticas-registro.php`);
        const data = await response.json();
        console.log('Data:', data);

        if (data.success) {
            renderizarResumen(data.resumen);
            renderizarTabla(data.data);
            renderizarGraficos(data.data);
        } else {
            mostrarError('Error: ' + (data.message || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión: ' + error.message);
    }
}

function renderizarResumen(resumen) {
    const container = document.getElementById('summaryCards');
    container.innerHTML = `
        <div class="summary-card info">
            <h3>Total Propiedades</h3>
            <div class="value">${resumen.total_viviendas}</div>
            <div class="subtitle">Casas, apartamentos, establecimientos y locales</div>
        </div>
        <div class="summary-card success">
            <h3>Registradas</h3>
            <div class="value">${resumen.viviendas_registradas}</div>
            <div class="subtitle">${resumen.porcentaje_general}% del total</div>
        </div>
        <div class="summary-card warning">
            <h3>Pendientes</h3>
            <div class="value">${resumen.viviendas_pendientes}</div>
            <div class="subtitle">${(100 - resumen.porcentaje_general).toFixed(2)}% sin registrar</div>
        </div>
        <div class="summary-card">
            <h3>Porcentaje General</h3>
            <div class="value">${resumen.porcentaje_general}%</div>
            <div class="subtitle">Tasa de registro</div>
        </div>
    `;
}

function renderizarTabla(estadisticas) {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = estadisticas.map(stat => {
        const pendientes = stat.total - stat.registrados;
        const porcentaje = parseFloat(stat.porcentaje) || 0;

        let tipoBadge = 'Otro';
        let tipoClase = 'local';

        if (stat.tipo === 'casa') {
            tipoBadge = 'Casa';
            tipoClase = 'casa';
        } else if (stat.tipo === 'apartamento') {
            tipoBadge = 'Apartamento';
            tipoClase = 'apartamento';
        } else if (stat.tipo === 'establecimiento') {
            tipoBadge = 'Establecimiento';
            tipoClase = 'establecimiento';
        } else if (stat.tipo === 'local_cc') {
            tipoBadge = 'Local CC';
            tipoClase = 'local';
        }

        return `
            <tr>
                <td><strong>${stat.nombre_avenida}</strong></td>
                <td><span class="badge ${tipoClase}">${tipoBadge}</span></td>
                <td>${stat.total}</td>
                <td>${stat.registrados}</td>
                <td>${pendientes}</td>
                <td><strong>${porcentaje.toFixed(2)}%</strong></td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${porcentaje}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderizarGraficos(estadisticas) {
    const labels = estadisticas.map(s => s.nombre_avenida);
    const porcentajes = estadisticas.map(s => parseFloat(s.porcentaje) || 0);
    const colores = estadisticas.map(s => {
        if (s.tipo === 'casa') return '#3b82f6';
        if (s.tipo === 'apartamento') return '#ec4899';
        if (s.tipo === 'establecimiento') return '#f59e0b';
        return '#10b981';
    });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();

    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Porcentaje de Registro',
                data: porcentajes,
                backgroundColor: colores,
                borderColor: colores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.parsed.y.toFixed(2)}% registrado`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function (value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();

    const totalRegistrados = estadisticas.reduce((sum, s) => sum + parseInt(s.registrados), 0);
    const totalPendientes = estadisticas.reduce((sum, s) => sum + (parseInt(s.total) - parseInt(s.registrados)), 0);

    pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Registradas', 'Pendientes'],
            datasets: [{
                data: [totalRegistrados, totalPendientes],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = totalRegistrados + totalPendientes;
                            const percentage = ((context.parsed / total) * 100).toFixed(2);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function mostrarError(mensaje) {
    const container = document.getElementById('summaryCards');
    container.innerHTML = `
        <div class="summary-card warning" style="grid-column: 1 / -1;">
            <h3>Error</h3>
            <div class="subtitle">${mensaje}</div>
            <div class="subtitle" style="margin-top: 10px;">Abre la consola (F12) para más detalles.</div>
        </div>
    `;
}

function imprimirEstadisticas() {
    window.print();
}

async function descargarPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setTextColor(102, 126, 234);
        doc.text('Estadísticas de Registro', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Análisis del porcentaje de propiedades registradas', 14, 28);

        const fecha = new Date().toLocaleDateString('es-ES');
        doc.text(`Fecha: ${fecha}`, 14, 35);

        const tabla = document.getElementById('statsTable');
        const filas = Array.from(tabla.querySelectorAll('tbody tr'));

        const datos = filas.map(fila => {
            const celdas = fila.querySelectorAll('td');
            return [
                celdas[0]?.textContent || '',
                celdas[1]?.textContent || '',
                celdas[2]?.textContent || '',
                celdas[3]?.textContent || '',
                celdas[4]?.textContent || '',
                celdas[5]?.textContent || ''
            ];
        });

        doc.autoTable({
            head: [['Ubicación', 'Tipo', 'Total', 'Registrados', 'Pendientes', 'Porcentaje']],
            body: datos,
            startY: 45,
            theme: 'grid',
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            }
        });

        const resumenY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumen General:', 14, resumenY);

        const cards = document.querySelectorAll('.summary-card');
        let offsetY = resumenY + 8;

        cards.forEach(card => {
            const titulo = card.querySelector('h3')?.textContent || '';
            const valor = card.querySelector('.value')?.textContent || '';
            doc.setFontSize(10);
            doc.text(`${titulo}: ${valor}`, 14, offsetY);
            offsetY += 6;
        });

        doc.save(`estadisticas-registro-${fecha}.pdf`);

    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF');
    }
}
