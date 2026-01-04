// Funcionalidad específica para la página de estadísticas de ingresos

// Configuración de la API
const API_BASE_URL = '../api';

// Variables globales
let currentStatistics = null;
let metodosPagoChart = null;
let pagosPorMesChart = null;
let balancesServidor = {
    efectivo_usd: 0,
    efectivo_bs: 0,
    banco_bs: 0
};

function actualizarPanelBalances() {
    const panel = document.getElementById('balancesPanel');
    if (!panel) return;

    asignarTexto('balanceEfectivoUsd', formatearMoneda(balancesServidor.efectivo_usd));
    asignarTexto('balanceEfectivoBs', formatearMonedaBs(balancesServidor.efectivo_bs));
    asignarTexto('balanceBanco', formatearMonedaBs(balancesServidor.banco_bs));
}

function asignarTexto(id, valor) {
    const nodo = document.getElementById(id);
    if (nodo) {
        nodo.textContent = valor;
    }
}

async function cargarBalancesIniciales() {
    try {
        const response = await fetch(`${API_BASE_URL}/estadisticas-ingresos.php`);
        if (!response.ok) {
            throw new Error('No se pudieron obtener los saldos iniciales');
        }
        const data = await response.json();
        if (data.success && data.data && data.data.balances) {
            balancesServidor = data.data.balances;
        }
    } catch (error) {
        console.warn('No fue posible cargar balances iniciales:', error.message);
    } finally {
        actualizarPanelBalances();
    }
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Estadísticas de Ingresos iniciado');
    
    // Configurar fechas por defecto (último mes)
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);
    
    document.getElementById('fechaInicio').value = formatearFechaDDMMYYYY(haceUnMes);
    document.getElementById('fechaFin').value = formatearFechaDDMMYYYY(hoy);

    configurarCalendarios();
    
    // Configurar el formulario de filtros
    const form = document.getElementById('filtersForm');
    if (form) {
        form.addEventListener('submit', generarEstadisticas);
    }
    
    // Configurar el selector de tipo de reporte
    const tipoReporte = document.getElementById('tipoReporte');
    if (tipoReporte) {
        tipoReporte.addEventListener('change', configurarFechasPorTipo);
    }
    
    // Cargar métodos de pago
    cargarMetodosPago();

    cargarBalancesIniciales();
});

// Función para configurar fechas según el tipo de reporte
function configurarFechasPorTipo() {
    const tipo = document.getElementById('tipoReporte').value;
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    const hoy = new Date();
    let inicio = new Date();
    
    switch (tipo) {
        case 'mensual':
            inicio.setMonth(hoy.getMonth() - 1);
            break;
        case 'trimestral':
            inicio.setMonth(hoy.getMonth() - 3);
            break;
        case 'anual':
            inicio.setFullYear(hoy.getFullYear() - 1);
            break;
        case 'personalizado':
            // No cambiar fechas, dejar que el usuario las configure
            return;
    }
    
    fechaInicio._flatpickr.setDate(inicio, true, 'd/m/Y');
    fechaFin._flatpickr.setDate(hoy, true, 'd/m/Y');
}

// Función principal para generar estadísticas
async function generarEstadisticas(event) {
    event.preventDefault();
    
    const fechaInicioRaw = document.getElementById('fechaInicio').value;
    const fechaFinRaw = document.getElementById('fechaFin').value;
    const fechaInicio = convertirFechaADate(fechaInicioRaw);
    const fechaFin = convertirFechaADate(fechaFinRaw);
    const tipoReporte = document.getElementById('tipoReporte').value;
    const metodoPago = document.getElementById('metodoPago').value;
    
    console.log('Generando estadísticas:', { fechaInicio, fechaFin, tipoReporte, metodoPago });
    
    // Validar fechas
    if (!fechaInicio || !fechaFin) {
        mostrarNotificacion('Debes seleccionar ambas fechas', 'error');
        return;
    }

    if (fechaInicio > fechaFin) {
        mostrarNotificacion('La fecha de inicio no puede ser posterior a la fecha fin', 'error');
        return;
    }
    
    // Mostrar spinner
    mostrarLoading(true);
    ocultarEstadisticas();
    
    try {
        const response = await fetch(`${API_BASE_URL}/estadisticas-ingresos.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fecha_inicio: convertirFechaAISO(fechaInicio),
                fecha_fin: convertirFechaAISO(fechaFin),
                tipo_reporte: tipoReporte,
                metodo_pago: metodoPago
            })
        });
        
        console.log('Respuesta recibida:', response);
        
        const data = await response.json();
        console.log('Datos parseados:', data);
        
        if (data.success) {
            currentStatistics = data.data;
            balancesServidor = data.data?.balances || balancesServidor;
            mostrarEstadisticas(data.data);
        } else {
            console.log('Error en la respuesta:', data.message);
            mostrarNotificacion(data.message || 'Error al generar las estadísticas', 'error');
        }
        
    } catch (error) {
        console.error('Error al generar estadísticas:', error);
        mostrarNotificacion('Error al conectar con el servidor: ' + error.message, 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Función para mostrar las estadísticas
function mostrarEstadisticas(data) {
    console.log('Mostrando estadísticas:', data);

    const statisticsSection = document.getElementById('statisticsSection');

    // Mostrar sección de estadísticas
    statisticsSection.style.display = 'block';

    actualizarPanelBalances();

    // Llenar tarjetas de resumen
    document.getElementById('totalViviendas').textContent = data.resumen.total_viviendas || '0';
    document.getElementById('viviendasPagaron').textContent = data.resumen.viviendas_pagaron || '0';
    document.getElementById('totalPersonas').textContent = data.resumen.total_personas || '0';
    document.getElementById('totalAcumuladoUsd').textContent = formatearMoneda(data.resumen.total_usd || 0);
    document.getElementById('totalAcumuladoBs').textContent = formatearMonedaBs(data.resumen.total_bs || 0);
    
    // Crear gráficos
    crearGraficoMetodosPago(data.metodos_pago);
    crearGraficoPagosPorMes(data.pagos_por_mes);
    
    // Llenar tablas
    llenarTablaMetodosPago(data.metodos_pago);
    llenarTablaPagosPorMes(data.pagos_por_mes);
}

// Función para crear el gráfico de métodos de pago
function crearGraficoMetodosPago(datos) {
    const ctx = document.getElementById('metodosPagoChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (metodosPagoChart) {
        metodosPagoChart.destroy();
    }
    
    const labels = datos.map(item => item.metodo_pago);
    const values = datos.map(item => item.cantidad);
    const colors = generarColores(datos.length);
    
    metodosPagoChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Función para crear el gráfico de pagos por mes
function crearGraficoPagosPorMes(datos) {
    const ctx = document.getElementById('pagosPorMesChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (pagosPorMesChart) {
        pagosPorMesChart.destroy();
    }
    
    const labels = datos.map(item => item.mes);
    const values = datos.map(item => item.viviendas_pagaron);
    
    pagosPorMesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Viviendas que Pagaron',
                data: values,
                borderColor: '#1e3c72',
                backgroundColor: 'rgba(30, 60, 114, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#1e3c72',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        color: '#e2e8f0'
                    }
                }
            }
        }
    });
}

// Función para llenar la tabla de métodos de pago
function llenarTablaMetodosPago(datos) {
    const tbody = document.getElementById('metodosPagoTableBody');
    
    const filas = datos.map(item => `
        <tr>
            <td><strong>${item.metodo_pago}</strong></td>
            <td>${item.cantidad}</td>
            <td>${formatearMoneda(item.total_usd)}</td>
            <td>${formatearMonedaBs(item.total_bs)}</td>
            <td><span class="percentage">${item.porcentaje}%</span></td>
        </tr>
    `).join('');
    
    tbody.innerHTML = filas;
}

// Función para llenar la tabla de pagos por mes
function llenarTablaPagosPorMes(datos) {
    const tbody = document.getElementById('pagosPorMesTableBody');
    
    const filas = datos.map(item => `
        <tr>
            <td><strong>${item.mes}</strong></td>
            <td>${item.viviendas_pagaron}</td>
            <td>${item.total_pagos}</td>
            <td>${formatearMoneda(item.total_usd)}</td>
            <td>${formatearMonedaBs(item.total_bs)}</td>
            <td>${formatearMoneda(item.promedio_usd)} / ${formatearMonedaBs(item.promedio_bs)}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = filas;
}

// Función para ocultar estadísticas
function ocultarEstadisticas() {
    const statisticsSection = document.getElementById('statisticsSection');
    statisticsSection.style.display = 'none';
}

// Función para mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loadingSection = document.getElementById('loadingSection');
    loadingSection.style.display = mostrar ? 'block' : 'none';
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    notification.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    container.appendChild(notification);
    
    // Mostrar la notificación
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 5000);
}

// Funciones auxiliares
function configurarCalendarios() {
    if (typeof flatpickr === 'undefined') {
        console.warn('Flatpickr no está disponible');
        return;
    }

    flatpickr.localize(flatpickr.l10ns.es);

    const opciones = {
        dateFormat: 'd/m/Y',
        defaultDate: null,
        maxDate: 'today',
        allowInput: true
    };

    flatpickr('#fechaInicio', opciones);
    flatpickr('#fechaFin', opciones);
}

function abrirCalendario(inputId) {
    const input = document.getElementById(inputId);
    if (input && input._flatpickr) {
        input._flatpickr.open();
    }
}

function formatearFechaDDMMYYYY(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
}

function convertirFechaADate(valor) {
    if (!valor) return null;
    const partes = valor.split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, año] = partes.map(Number);
    if (!dia || !mes || !año) return null;
    return new Date(año, mes - 1, dia);
}

function convertirFechaAISO(fecha) {
    if (!(fecha instanceof Date)) return '';
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

async function cargarMetodosPago() {
    try {
        const response = await fetch(`${API_BASE_URL}/metodos-pago.php`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('metodoPago');
            select.innerHTML = '<option value="">Todos los métodos</option>';
            
            data.metodos.forEach(metodo => {
                const option = document.createElement('option');
                option.value = metodo.metodo_id;
                option.textContent = metodo.descripcion;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar métodos de pago:', error);
    }
}

function formatearMoneda(monto) {
    if (!monto || monto === 0) return '$0.00';
    return '$' + parseFloat(monto).toFixed(2);
}

function formatearMonedaBs(monto) {
    if (!monto || monto === 0) return 'Bs 0.00';
    return 'Bs ' + parseFloat(monto).toFixed(2);
}

function generarColores(cantidad) {
    const colores = [
        '#1e3c72', '#2a5298', '#3b82f6', '#10b981', '#f59e0b',
        '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
    ];
    
    const resultado = [];
    for (let i = 0; i < cantidad; i++) {
        resultado.push(colores[i % colores.length]);
    }
    return resultado;
}

// Funciones de exportación
function exportarExcel() {
    mostrarNotificacion('Función de exportación a Excel en desarrollo', 'info');
}

function exportarPDF() {
    mostrarNotificacion('Función de exportación a PDF en desarrollo', 'info');
}

function imprimirReporte() {
    window.print();
}

// Función para volver al dashboard
function volverDashboard() {
    window.location.href = 'index.html';
}
