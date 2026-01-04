// Funcionalidad específica para la gestión de viviendas

// Configuración de la API
const API_BASE_URL = '../api';

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Gestión de Viviendas iniciado');
    
    // Permitir búsqueda con Enter
    const inputCedula = document.getElementById('cedulaPropietario');
    if (inputCedula) {
        // Solo permitir números
        inputCedula.addEventListener('input', function(e) {
            // Remover caracteres que no sean números
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        // Permitir búsqueda con Enter
        inputCedula.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarVivienda();
            }
        });
        
        // Validación en tiempo real
        inputCedula.addEventListener('blur', function(e) {
            validarCedula(e.target.value);
        });
    }
});

// Función para validar cédula
function validarCedula(cedula) {
    const input = document.getElementById('cedulaPropietario');
    
    if (!cedula) {
        input.setCustomValidity('Debe ingresar un número de cédula');
        return false;
    }
    
    if (!/^\d{7,8}$/.test(cedula)) {
        input.setCustomValidity('La cédula debe tener entre 7 y 8 dígitos');
        return false;
    }
    
    input.setCustomValidity('');
    return true;
}

// Función para buscar vivienda por cédula
async function buscarVivienda() {
    const cedula = document.getElementById('cedulaPropietario').value.trim();
    
    // Validar formato de cédula
    if (!validarCedula(cedula)) {
        mostrarNotificacion('Por favor ingresa un número de cédula válido (7-8 dígitos)', 'error');
        return;
    }
    
    // Mostrar spinner de carga
    mostrarLoading(true);
    ocultarResultados();
    
    try {
        // Realizar petición a la API
        const response = await fetch(`${API_BASE_URL}/buscar-vivienda.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cedula: cedula })
        });
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            mostrarInformacionVivienda(data.data);
            mostrarNotificacion(`${data.total} vivienda(s) encontrada(s) exitosamente`, 'success');
        } else {
            mostrarNoResultados();
            mostrarNotificacion(data.message || 'No se encontró ninguna vivienda con esa cédula', 'error');
        }
        
    } catch (error) {
        console.error('Error al buscar vivienda:', error);
        mostrarNoResultados();
        mostrarNotificacion('Error al conectar con la base de datos', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Función para mostrar la información de la vivienda
function mostrarInformacionVivienda(viviendas) {
    const resultsSection = document.getElementById('resultsSection');
    const viviendaInfo = document.getElementById('viviendaInfo');
    
    // Si hay múltiples viviendas, mostrar todas
    let html = '';
    
    viviendas.forEach((vivienda, index) => {
        const estadoClass = vivienda.estado === 'activa' ? 'status-activa' : 
                           vivienda.estado === 'morosa' ? 'status-morosa' : 'status-inactiva';
        
        const estadoTexto = vivienda.estado === 'activa' ? 'Activa' : 
                           vivienda.estado === 'morosa' ? 'Morosa' : 'Inactiva';
        
        // Determinar el icono según el tipo de vivienda
        let iconoTipo = 'fas fa-home';
        if (vivienda.tipo_vivienda === 'Apartamento') {
            iconoTipo = 'fas fa-building';
        } else if (vivienda.tipo_vivienda === 'Local Comercial') {
            iconoTipo = 'fas fa-store';
        } else if (vivienda.tipo_vivienda === 'Mercadito') {
            iconoTipo = 'fas fa-shopping-cart';
        }
        
        html += `
            <div class="vivienda-card">
                <div class="vivienda-header">
                    <h3>
                        <i class="${iconoTipo}"></i>
                        ${vivienda.tipo_vivienda} ${index + 1}
                    </h3>
                </div>
                
                <div class="vivienda-content">
                    <div class="info-section">
                        <h4>
                            <i class="fas fa-info-circle"></i>
                            Información del Inmueble
                        </h4>
                        <div class="info-item">
                            <span class="info-label">Tipo de Vivienda:</span>
                            <span class="info-value">${vivienda.tipo_vivienda}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Nombre/Ubicación:</span>
                            <span class="info-value">${vivienda.nombre_inmueble}</span>
                        </div>
                        ${vivienda.ubicacion_info ? `
                        <div class="info-item">
                            <span class="info-label">Ubicación:</span>
                            <span class="info-value">${vivienda.ubicacion_info}</span>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <span class="info-label">Fecha de Adquisición:</span>
                            <span class="info-value">${vivienda.fecha_adquirido}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Antigüedad:</span>
                            <span class="info-value">${vivienda.anio_antiguedad} años</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Estado:</span>
                            <span class="info-value ${estadoClass}">${estadoTexto}</span>
                        </div>
                        ${vivienda.meses_morosos > 0 ? `
                        <div class="info-item">
                            <span class="info-label">Meses Morosos:</span>
                            <span class="info-value status-morosa">${vivienda.meses_morosos}</span>
                        </div>
                        ` : ''}
                        ${vivienda.monto_deuda_usd > 0 ? `
                        <div class="info-item">
                            <span class="info-label">Deuda Pendiente:</span>
                            <span class="info-value status-morosa">$${vivienda.monto_deuda_usd} USD</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="info-section">
                        <h4>
                            <i class="fas fa-user"></i>
                            Información del Propietario
                        </h4>
                        <div class="info-item">
                            <span class="info-label">Cédula:</span>
                            <span class="info-value">${vivienda.propietario.cedula}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Nombre Completo:</span>
                            <span class="info-value">${vivienda.propietario.nombre_completo}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Teléfono:</span>
                            <span class="info-value">${vivienda.propietario.telefono}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${vivienda.propietario.email}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fecha de Registro:</span>
                            <span class="info-value">${vivienda.propietario.fecha_registro}</span>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h4>
                            <i class="fas fa-chart-bar"></i>
                            Estadísticas de Pagos
                        </h4>
                        <div class="info-item">
                            <span class="info-label">Pagos Realizados:</span>
                            <span class="info-value status-activa">${vivienda.estadisticas_pagos.pagos_realizados}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Pagos Parciales:</span>
                            <span class="info-value ${vivienda.estadisticas_pagos.pagos_parciales > 0 ? 'status-morosa' : 'status-activa'}">${vivienda.estadisticas_pagos.pagos_parciales}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Pagos Rechazados:</span>
                            <span class="info-value ${vivienda.estadisticas_pagos.pagos_rechazados > 0 ? 'status-morosa' : 'status-activa'}">${vivienda.estadisticas_pagos.pagos_rechazados}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total Períodos:</span>
                            <span class="info-value">${vivienda.estadisticas_pagos.total_periodos}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Último Pago:</span>
                            <span class="info-value">${vivienda.estadisticas_pagos.ultimo_pago}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    viviendaInfo.innerHTML = html;
    resultsSection.style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
}

// Función para mostrar mensaje de no resultados
function mostrarNoResultados() {
    document.getElementById('noResults').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
}

// Función para ocultar todos los resultados
function ocultarResultados() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

// Función para mostrar/ocultar el spinner de carga
function mostrarLoading(mostrar) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = mostrar ? 'flex' : 'none';
}

// Función para limpiar la búsqueda
function limpiarBusqueda() {
    document.getElementById('cedulaPropietario').value = '';
    ocultarResultados();
    mostrarLoading(false);
    document.getElementById('cedulaPropietario').focus();
}

// Función para navegar desde el dashboard
function abrirViviendas() {
    window.location.href = 'gestionar-viviendas.html';
}

// Función para volver al dashboard
function volverDashboard() {
    window.location.href = 'index.html';
}

// Función para exportar información de la vivienda (futura funcionalidad)
function exportarInformacionVivienda() {
    const viviendaInfo = document.getElementById('viviendaInfo');
    if (!viviendaInfo || viviendaInfo.innerHTML.trim() === '') {
        mostrarNotificacion('No hay información de vivienda para exportar', 'error');
        return;
    }
    
    // Aquí se implementaría la funcionalidad de exportación
    mostrarNotificacion('Funcionalidad de exportación en desarrollo', 'info');
}

// Función para imprimir información de la vivienda (futura funcionalidad)
function imprimirInformacionVivienda() {
    const viviendaInfo = document.getElementById('viviendaInfo');
    if (!viviendaInfo || viviendaInfo.innerHTML.trim() === '') {
        mostrarNotificacion('No hay información de vivienda para imprimir', 'error');
        return;
    }
    
    // Aquí se implementaría la funcionalidad de impresión
    mostrarNotificacion('Funcionalidad de impresión en desarrollo', 'info');
}

// Función para validar formato de cédula colombiana
function validarCedulaColombiana(cedula) {
    // Eliminar espacios y caracteres no numéricos
    cedula = cedula.replace(/\D/g, '');
    
    // Verificar longitud (entre 6 y 10 dígitos para cédulas colombianas)
    if (cedula.length < 6 || cedula.length > 10) {
        return false;
    }
    
    return true;
}

// Función para formatear número de cédula
function formatearCedula(cedula) {
    // Eliminar espacios y caracteres no numéricos
    cedula = cedula.replace(/\D/g, '');
    
    // Formatear con puntos cada 3 dígitos
    return cedula.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Función para obtener estadísticas de viviendas (futura funcionalidad)
function obtenerEstadisticasViviendas() {
    const totalViviendas = viviendasEjemplo.length;
    const viviendasActivas = viviendasEjemplo.filter(v => v.estado === 'activa').length;
    const viviendasMorosas = viviendasEjemplo.filter(v => v.estado === 'morosa').length;
    const viviendasInactivas = viviendasEjemplo.filter(v => v.estado === 'inactiva').length;
    
    return {
        total: totalViviendas,
        activas: viviendasActivas,
        morosas: viviendasMorosas,
        inactivas: viviendasInactivas
    };
}

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buscarVivienda,
        abrirViviendas,
        limpiarBusqueda,
        validarCedulaColombiana,
        formatearCedula,
        obtenerEstadisticasViviendas
    };
}
