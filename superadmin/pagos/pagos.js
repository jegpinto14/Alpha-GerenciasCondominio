// Archivo: pagos.js
// Funcionalidad para el registro de pagos

document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const propietarioSelect = document.getElementById('propietarioSelect');
    const inmuebleSelect = document.getElementById('inmuebleSelect');
    const periodoSelect = document.getElementById('periodoSelect');
    const metodoPagoSelect = document.getElementById('metodoPagoSelect');
    const tasaCambio = document.getElementById('tasaCambio');
    const montoUSD = document.getElementById('montoUSD');
    const montoBs = document.getElementById('montoBs');
    const montoPagado = document.getElementById('montoPagado');
    const bancoEmisor = document.getElementById('bancoEmisor');
    const bancoReceptor = document.getElementById('bancoReceptor');
    const paymentForm = document.getElementById('paymentForm');
    const paymentStatus = document.getElementById('paymentStatus');
    const statusContent = document.getElementById('statusContent');

    // Cargar datos iniciales
    cargarPropietarios();
    cargarPeriodos();
    cargarMetodosPago();
    cargarTasasCambio();
    cargarBancos();

    // Event Listeners
    propietarioSelect.addEventListener('change', cargarInmueblesPorPropietario);
    inmuebleSelect.addEventListener('change', function () {
        const inmuebleId = inmuebleSelect.value;
        if (inmuebleId) {
            // Recargar períodos filtrados por inmueble (solo no pagados)
            cargarPeriodos(inmuebleId);
        } else {
            // Si no hay inmueble seleccionado, limpiar períodos
            periodoSelect.innerHTML = '<option value="">Primero seleccione un inmueble...</option>';
        }
        // También cargar deuda del inmueble
        cargarDeudaInmueble();
    });
    periodoSelect.addEventListener('change', mostrarPeriodosSeleccionados);
    tasaCambio.addEventListener('change', calcularMontoBs);
    montoUSD.addEventListener('input', calcularMontoBs);
    paymentForm.addEventListener('submit', registrarPago);

    // Event listener para guardar deuda
    const btnGuardarDeuda = document.getElementById('btnGuardarDeuda');
    if (btnGuardarDeuda) {
        btnGuardarDeuda.addEventListener('click', guardarDeuda);
    }

    // Función para mostrar notificaciones
    function mostrarNotificacion(mensaje, tipo = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${tipo}`;
        notification.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            ${mensaje}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Función para cargar propietarios
    async function cargarPropietarios() {
        try {
            const response = await fetch('pagos_api.php?action=get_propietarios');
            const data = await response.json();

            if (data.success) {
                // Guardar todos los propietarios para filtrado
                window.todosLosPropietarios = data.propietarios;

                propietarioSelect.innerHTML = '<option value="">Seleccione un propietario...</option>';
                data.propietarios.forEach(propietario => {
                    const option = document.createElement('option');
                    option.value = propietario.propietario_id;
                    option.textContent = `${propietario.nombre} ${propietario.apellido} - ${propietario.nro_documento}`;
                    propietarioSelect.appendChild(option);
                });

                // Agregar funcionalidad de búsqueda
                const searchInput = document.getElementById('propietarioSearch');
                if (searchInput) {
                    searchInput.addEventListener('input', function () {
                        const searchTerm = this.value.toLowerCase();
                        const filteredPropietarios = window.todosLosPropietarios.filter(p => {
                            const nombreCompleto = `${p.nombre} ${p.apellido}`.toLowerCase();
                            const documento = p.nro_documento.toString();
                            return nombreCompleto.includes(searchTerm) || documento.includes(searchTerm);
                        });

                        propietarioSelect.innerHTML = '<option value="">Seleccione un propietario...</option>';
                        filteredPropietarios.forEach(propietario => {
                            const option = document.createElement('option');
                            option.value = propietario.propietario_id;
                            option.textContent = `${propietario.nombre} ${propietario.apellido} - ${propietario.nro_documento}`;
                            propietarioSelect.appendChild(option);
                        });
                    });
                }
            } else {
                mostrarNotificacion('Error al cargar propietarios: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al cargar propietarios', 'error');
        }
    }

    // Función para cargar inmuebles por propietario
    async function cargarInmueblesPorPropietario() {
        const propietarioId = propietarioSelect.value;
        if (!propietarioId) {
            inmuebleSelect.innerHTML = '<option value="">Seleccione un inmueble...</option>';
            periodoSelect.innerHTML = '<option value="">Primero seleccione un inmueble...</option>';
            return;
        }

        try {
            const response = await fetch(`pagos_api.php?action=get_inmuebles&propietario_id=${propietarioId}`);
            const data = await response.json();

            if (data.success) {
                inmuebleSelect.innerHTML = '<option value="">Seleccione un inmueble...</option>';
                data.inmuebles.forEach(inmueble => {
                    const option = document.createElement('option');
                    option.value = inmueble.inmueble_id;
                    option.textContent = inmueble.nombre_inmueble;
                    inmuebleSelect.appendChild(option);
                });
            } else {
                mostrarNotificacion('Error al cargar inmuebles: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al cargar inmuebles', 'error');
        }
    }

    // Función para cargar períodos (con filtro opcional por inmueble)
    async function cargarPeriodos(inmuebleId = null) {
        try {
            let url = 'pagos_api.php?action=get_periodos';
            if (inmuebleId) {
                url += `&inmueble_id=${inmuebleId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                periodoSelect.innerHTML = '';

                if (data.periodos.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '✓ Todos los períodos están pagados';
                    option.disabled = true;
                    periodoSelect.appendChild(option);
                    mostrarNotificacion('Este inmueble tiene todos los períodos pagados', 'success');
                } else {
                    data.periodos.forEach(periodo => {
                        const option = document.createElement('option');
                        option.value = periodo.periodo_id;
                        // Usar el nombre formateado desde el servidor
                        option.textContent = periodo.periodo_nombre || formatoFechaPeriodo(periodo.fecha_periodo);
                        periodoSelect.appendChild(option);
                    });
                }
            } else {
                mostrarNotificacion('Error al cargar períodos: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al cargar períodos', 'error');
        }
    }

    // Función para mostrar períodos seleccionados
    function mostrarPeriodosSeleccionados() {
        const selected = Array.from(periodoSelect.selectedOptions);
        const container = document.getElementById('periodosSeleccionados');

        if (selected.length > 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <strong>✓ ${selected.length} período(s) seleccionado(s):</strong>
                    <ul>
                        ${selected.map(opt => `<li>${opt.textContent}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    }

    // Función para cargar métodos de pago
    async function cargarMetodosPago() {
        try {
            const response = await fetch('pagos_api.php?action=get_metodos_pago');
            const data = await response.json();

            if (data.success) {
                metodoPagoSelect.innerHTML = '<option value="">Seleccione método de pago...</option>';
                data.metodos.forEach(metodo => {
                    const option = document.createElement('option');
                    option.value = metodo.metodo_id;
                    option.textContent = metodo.descripcion;
                    metodoPagoSelect.appendChild(option);
                });
            } else {
                mostrarNotificacion('Error al cargar métodos de pago: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al cargar métodos de pago', 'error');
        }
    }

    // Función para cargar tasas de cambio
    async function cargarTasasCambio() {
        try {
            const response = await fetch('pagos_api.php?action=get_tasas');
            const data = await response.json();

            if (data.success) {
                tasaCambio.innerHTML = '<option value="">Seleccione tasa...</option>';
                data.tasas.forEach(tasa => {
                    const option = document.createElement('option');
                    option.value = tasa.tasa_id;
                    option.textContent = `${tasa.tasa} Bs/USD (${formatoFecha(tasa.fecha)})`;
                    tasaCambio.appendChild(option);
                });
            } else {
                mostrarNotificacion('Error al cargar tasas: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al cargar tasas', 'error');
        }
    }

    // Función para cargar bancos
    async function cargarBancos() {
        try {
            const response = await fetch('pagos_api.php?action=get_bancos');
            const data = await response.json();

            if (data.success) {
                const bancosEmisor = document.getElementById('bancoEmisor');
                const bancosReceptor = document.getElementById('bancoReceptor');

                bancosEmisor.innerHTML = '<option value="">Seleccione banco emisor...</option>';
                bancosReceptor.innerHTML = '<option value="">Seleccione banco receptor...</option>';

                data.bancos.forEach(banco => {
                    const optionEmisor = document.createElement('option');
                    optionEmisor.value = banco.banco_id;
                    optionEmisor.textContent = banco.nombre_banco;
                    bancosEmisor.appendChild(optionEmisor);

                    const optionReceptor = document.createElement('option');
                    optionReceptor.value = banco.banco_id;
                    optionReceptor.textContent = banco.nombre_banco;
                    bancosReceptor.appendChild(optionReceptor);
                });
            } else {
                mostrarNotificacion('Error al cargar bancos: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al cargar bancos', 'error');
        }
    }

    // Función para calcular monto en Bs
    function calcularMontoBs() {
        const usd = parseFloat(montoUSD.value) || 0;
        const tasaId = tasaCambio.value;

        if (usd >= 0 && tasaId) {
            // Buscar la tasa seleccionada
            const tasaOption = tasaCambio.options[tasaCambio.selectedIndex];
            const tasaText = tasaOption.textContent;
            const tasaValue = parseFloat(tasaText.split(' ')[0]) || 0;

            const bs = usd * tasaValue;
            montoBs.value = bs.toFixed(2);
        } else {
            montoBs.value = '0.00';
        }
    }

    // Función para registrar pago
    async function registrarPago(e) {
        e.preventDefault();

        // Validar formulario
        if (!validarFormulario()) {
            return;
        }

        // Validar que se hayan seleccionado períodos
        const selectedPeriods = Array.from(periodoSelect.selectedOptions).map(opt => opt.value);
        if (selectedPeriods.length === 0) {
            mostrarNotificacion('Debe seleccionar al menos un período', 'error');
            return;
        }

        // Confirmar si son múltiples períodos
        if (selectedPeriods.length > 1) {
            const confirmMsg = `¿Está seguro de registrar ${selectedPeriods.length} pagos con los mismos datos?`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        // Mostrar loading
        const submitBtn = paymentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Procesando...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(paymentForm);

            const response = await fetch('pagos_api.php?action=registrar_pago', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Respuesta no válida del servidor');
            }

            const data = await response.json();

            if (data.success) {
                const mensaje = data.pagos_registrados > 1
                    ? `${data.pagos_registrados} pagos registrados exitosamente`
                    : 'Pago registrado exitosamente';

                mostrarNotificacion(mensaje, 'success');

                if (data.errores && data.errores.length > 0) {
                    mostrarNotificacion('Algunos períodos tuvieron errores: ' + data.errores.join(', '), 'warning');
                }

                paymentForm.reset();
                montoBs.value = '';
                document.getElementById('periodosSeleccionados').innerHTML = '';
                // Recargar datos
                cargarPropietarios();
                cargarPeriodos();
            } else {
                mostrarNotificacion('Error al registrar pago: ' + (data.message || 'Intente nuevamente'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al registrar pago. Detalle: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Función para validar formulario
    function validarFormulario() {
        const propietario = propietarioSelect.value;
        const inmueble = inmuebleSelect.value;
        const selectedPeriods = Array.from(periodoSelect.selectedOptions);
        const metodo = metodoPagoSelect.value;
        const usd = parseFloat(montoUSD.value);
        const pagado = parseFloat(montoPagado.value);

        if (!propietario) {
            mostrarNotificacion('Debe seleccionar un propietario', 'error');
            return false;
        }

        if (!inmueble) {
            mostrarNotificacion('Debe seleccionar un inmueble', 'error');
            return false;
        }

        if (selectedPeriods.length === 0) {
            mostrarNotificacion('Debe seleccionar al menos un período', 'error');
            return false;
        }

        if (!metodo) {
            mostrarNotificacion('Debe seleccionar un método de pago', 'error');
            return false;
        }

        if (isNaN(usd) || usd < 0) {
            mostrarNotificacion('Debe ingresar un monto USD válido', 'error');
            return false;
        }

        if (isNaN(pagado) || pagado < 0) {
            mostrarNotificacion('El monto pagado debe ser mayor o igual a 0', 'error');
            return false;
        }

        return true;
    }

    // Función para mostrar estado del pago
    function mostrarEstadoPago(pago) {
        paymentStatus.style.display = 'block';
        statusContent.innerHTML = `
            <div class="pago-info">
                <h4>Información del Pago Registrado</h4>
                <div class="info-grid">
                    <div><strong>ID del Pago:</strong> ${pago.pago_id}</div>
                    <div><strong>Propietario:</strong> ${pago.propietario}</div>
                    <div><strong>Inmueble:</strong> ${pago.inmueble}</div>
                    <div><strong>Período:</strong> ${pago.periodo}</div>
                    <div><strong>Método:</strong> ${pago.metodo}</div>
                    <div><strong>Monto USD:</strong> $${pago.monto_usd}</div>
                    <div><strong>Monto Bs:</strong> ${pago.monto_bs} Bs</div>
                    <div><strong>Monto Pagado:</strong> ${pago.monto_pagado} Bs</div>
                    <div><strong>Estado:</strong> <span class="estado-${pago.estado.toLowerCase()}">${pago.estado}</span></div>
                    ${pago.comprobante ? `<div><strong>Comprobante:</strong> <a href="${pago.comprobante}" target="_blank" class="btn-secondary btn-sm">Ver comprobante</a></div>` : ''}
                </div>
            </div>
        `;

        // Scroll to status
        paymentStatus.scrollIntoView({ behavior: 'smooth' });
    }

    // Funciones de utilidad
    function formatoFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-ES');
    }

    function formatoFechaPeriodo(fecha) {
        const date = new Date(fecha);
        const mes = date.toLocaleString('es-ES', { month: 'long' });
        const año = date.getFullYear();
        return `${mes} ${año}`;
    }

    // Función para cargar deuda del inmueble seleccionado
    async function cargarDeudaInmueble() {
        const inmuebleId = inmuebleSelect.value;
        const montoDeudaInput = document.getElementById('montoDeuda');
        const deudaActualDiv = document.getElementById('deudaActual');

        if (!inmuebleId) {
            montoDeudaInput.value = '';
            deudaActualDiv.textContent = '$0.00 USD';
            return;
        }

        try {
            const response = await fetch(`pagos_api.php?action=get_deuda&inmueble_id=${inmuebleId}`);
            const data = await response.json();

            if (data.success && data.deuda) {
                const montoDeuda = parseFloat(data.deuda.monto_deuda_usd) || 0;
                montoDeudaInput.value = montoDeuda.toFixed(2);
                deudaActualDiv.textContent = `$${montoDeuda.toFixed(2)} USD`;

                // Cambiar color según si hay deuda
                if (montoDeuda > 0) {
                    deudaActualDiv.style.backgroundColor = '#f8d7da';
                    deudaActualDiv.style.color = '#dc3545';
                } else {
                    deudaActualDiv.style.backgroundColor = '#d4edda';
                    deudaActualDiv.style.color = '#155724';
                }
            }
        } catch (error) {
            console.error('Error cargando deuda:', error);
            mostrarNotificacion('Error al cargar deuda del inmueble', 'error');
        }
    }

    // Función para guardar deuda
    async function guardarDeuda() {
        const inmuebleId = inmuebleSelect.value;
        const montoDeuda = document.getElementById('montoDeuda').value;

        if (!inmuebleId) {
            mostrarNotificacion('Por favor seleccione un inmueble primero', 'error');
            return;
        }

        if (!montoDeuda || parseFloat(montoDeuda) < 0) {
            mostrarNotificacion('Por favor ingrese un monto válido', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('action', 'guardar_deuda');
            formData.append('inmueble_id', inmuebleId);
            formData.append('monto_deuda_usd', montoDeuda);

            const response = await fetch('pagos_api.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                mostrarNotificacion(data.message, 'success');
                // Actualizar la visualización de deuda actual
                cargarDeudaInmueble();
            } else {
                mostrarNotificacion('Error: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error guardando deuda:', error);
            mostrarNotificacion('Error al guardar deuda', 'error');
        }
    }
});

// Función para volver al dashboard (debe estar disponible globalmente)
function volverDashboard() {
    window.location.href = '../html/index.html';
}
