// Lógica para la bandeja de reclamos de vecinos

const RECLAMOS_API_URL = '../api/reclamos.php';
const RECLAMOS_UPDATE_API_URL = '../api/actualizar_reclamo.php';

let reclamos = [];
let reclamoFiltroEstado = 'todos';
let reclamoTextoBusqueda = '';
let reclamoPaginaActual = 1;
const RECLAMOS_POR_PAGINA = 8;

document.addEventListener('DOMContentLoaded', () => {
    inicializarControlesReclamos();
    cargarReclamos();
});

async function cargarReclamos() {
    try {
        const respuesta = await fetch(RECLAMOS_API_URL, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (payload?.success && Array.isArray(payload.data)) {
            reclamos = payload.data.map(normalizarReclamoDesdeApi);
        } else {
            throw new Error('Respuesta inválida');
        }
    } catch (error) {
        console.error('Error al cargar reclamos:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudieron cargar los reclamos desde la base de datos', 'error');
        }
        reclamos = [];
    } finally {
        actualizarBadgeReclamos();
        renderizarReclamos();
    }
}

function normalizarReclamoDesdeApi(item) {
    const id = Number.parseInt(item?.id, 10) || Date.now();
    const estadoNormalizado = (item?.estado || '').toLowerCase();
    const estado = estadoNormalizado === 'recibido' ? 'recibido' : 'pendiente';

    const fecha = item?.fecha
        ? new Date(item.fecha).toISOString()
        : new Date().toISOString();

    const vecino = item?.vecino || {};
    const vivienda = item?.vivienda || {};

    return {
        id,
        estado,
        fecha,
        asunto: item?.asunto || `Reclamo #${id}`,
        mensaje: item?.mensaje || '',
        vecino: {
            nombre: vecino.nombre || 'Propietario',
            cedula: vecino.cedula ? String(vecino.cedula) : '',
            telefono: vecino.telefono ? String(vecino.telefono) : '',
            email: vecino.email || ''
        },
        vivienda: {
            nombre: vivienda.nombre || 'Inmueble asociado',
            direccion: vivienda.direccion || ''
        }
    };
}

function volverDashboard() {
    window.location.href = 'index.html';
}

function inicializarControlesReclamos() {
    const filtroSelect = document.getElementById('reclamoEstadoFiltro');
    const busquedaInput = document.getElementById('reclamoBusqueda');
    const wrapper = document.getElementById('reclamosWrapper');
    const prevBtn = document.getElementById('reclamosPrev');
    const nextBtn = document.getElementById('reclamosNext');

    if (filtroSelect) {
        filtroSelect.addEventListener('change', (event) => {
            reclamoFiltroEstado = event.target.value;
            actualizarBadgeReclamos();
            reclamoPaginaActual = 1;
            renderizarReclamos();
        });
    }

    if (busquedaInput) {
        busquedaInput.addEventListener('input', (event) => {
            reclamoTextoBusqueda = event.target.value.toLowerCase();
            reclamoPaginaActual = 1;
            renderizarReclamos();
        });
    }

    if (wrapper) {
        wrapper.addEventListener('click', manejarAccionReclamo);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (reclamoPaginaActual > 1) {
                reclamoPaginaActual -= 1;
                renderizarReclamos();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            reclamoPaginaActual += 1;
            renderizarReclamos();
        });
    }

    configurarModal('detalleReclamoModal', 'cerrarDetalleReclamo');
    configurarModal('detalleVecinoModal', 'cerrarDetalleVecino');
}

function configurarModal(idModal, idCerrar) {
    const modal = document.getElementById(idModal);
    if (!modal) return;

    modal.addEventListener('click', (event) => {
        if (event.target.dataset.close === 'modal') {
            cerrarModal(modal);
        }
    });

    if (idCerrar) {
        const btnCerrar = document.getElementById(idCerrar);
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => cerrarModal(modal));
        }
    }
}

function actualizarBadgeReclamos() {
    const badge = document.getElementById('reclamosBadge');
    if (!badge) return;

    let texto = 'Mostrando todos';
    if (reclamoFiltroEstado === 'pendiente') {
        texto = 'Mostrando pendientes';
    } else if (reclamoFiltroEstado === 'recibido') {
        texto = 'Mostrando recibidos';
    }
    badge.textContent = texto;
}

function renderizarReclamos() {
    const wrapper = document.getElementById('reclamosWrapper');
    const emptyState = document.getElementById('reclamosEmptyState');
    const paginacion = document.getElementById('reclamosPagination');
    const info = document.getElementById('reclamosPaginationInfo');
    const prevBtn = document.getElementById('reclamosPrev');
    const nextBtn = document.getElementById('reclamosNext');
    if (!wrapper) return;

    const filtrados = reclamos.filter((reclamo) => {
        const coincideEstado = reclamoFiltroEstado === 'todos' || reclamo.estado === reclamoFiltroEstado;
        const coincideTexto = reclamoTextoBusqueda === ''
            || reclamo.vecino.nombre.toLowerCase().includes(reclamoTextoBusqueda)
            || reclamo.vecino.cedula.includes(reclamoTextoBusqueda)
            || reclamo.vivienda.nombre.toLowerCase().includes(reclamoTextoBusqueda)
            || reclamo.asunto.toLowerCase().includes(reclamoTextoBusqueda);
        return coincideEstado && coincideTexto;
    });

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / RECLAMOS_POR_PAGINA));
    if (reclamoPaginaActual > totalPaginas) reclamoPaginaActual = totalPaginas;
    const inicio = (reclamoPaginaActual - 1) * RECLAMOS_POR_PAGINA;
    const fin = inicio + RECLAMOS_POR_PAGINA;
    const reclamosPagina = filtrados.slice(inicio, fin);

    if (filtrados.length === 0) {
        wrapper.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (paginacion) paginacion.setAttribute('hidden', '');
    } else {
        if (emptyState) emptyState.style.display = 'none';
        wrapper.innerHTML = reclamosPagina.map(crearReclamoMarkup).join('');
        if (paginacion) {
            paginacion.removeAttribute('hidden');
            if (info) info.textContent = `Página ${reclamoPaginaActual} de ${totalPaginas}`;
            if (prevBtn) prevBtn.disabled = reclamoPaginaActual === 1;
            if (nextBtn) nextBtn.disabled = reclamoPaginaActual === totalPaginas;
        }
    }

    actualizarResumenReclamos();
}

function crearReclamoMarkup(reclamo) {
    const fechaFormateada = new Date(reclamo.fecha).toLocaleString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusClass = reclamo.estado === 'recibido' ? 'received' : 'pending';
    const statusLabel = reclamo.estado === 'recibido' ? 'Recibido' : 'Pendiente';

    return `
        <article class="reclamo-item" data-id="${reclamo.id}">
            <div class="reclamo-main">
                <div class="reclamo-header">
                    <h3>${reclamo.asunto}</h3>
                    <span class="status-chip ${statusClass}">
                        <i class="fas ${reclamo.estado === 'recibido' ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${statusLabel}
                    </span>
                </div>
                <div class="reclamo-meta">
                    <span><i class="fas fa-user"></i> ${reclamo.vecino.nombre}</span>
                    <span><i class="fas fa-house"></i> ${reclamo.vivienda.nombre}</span>
                    <span><i class="fas fa-calendar"></i> ${fechaFormateada}</span>
                </div>
                <p class="reclamo-mensaje">${reclamo.mensaje}</p>
            </div>
            <div class="reclamo-actions">
                <button class="btn-secondary" data-action="detalle">
                    <i class="fas fa-eye"></i>
                    Ver reclamo
                </button>
                <button class="btn-outline" data-action="vecino">
                    <i class="fas fa-id-card"></i>
                    Ver información
                </button>
                <button class="btn-primary" data-action="recibir" ${reclamo.estado === 'recibido' ? 'disabled' : ''}>
                    <i class="fas fa-check"></i>
                    Marcar recibido
                </button>
            </div>
        </article>
    `;
}

function manejarAccionReclamo(evento) {
    const boton = evento.target.closest('button[data-action]');
    if (!boton) return;

    const item = boton.closest('.reclamo-item');
    if (!item) return;

    const id = parseInt(item.dataset.id, 10);
    const reclamo = reclamos.find((r) => r.id === id);
    if (!reclamo) return;

    const accion = boton.dataset.action;

    switch (accion) {
        case 'detalle':
            mostrarDetalleReclamo(reclamo);
            break;
        case 'vecino':
            mostrarDetalleVecino(reclamo);
            break;
        case 'recibir':
            marcarReclamoRecibido(id);
            break;
        default:
            break;
    }
}

function mostrarDetalleReclamo(reclamo) {
    const modal = document.getElementById('detalleReclamoModal');
    const contenedor = document.getElementById('detalleReclamoContenido');
    if (!modal || !contenedor) return;

    contenedor.innerHTML = `
        <div class="detail-grid">
            <div class="detail-card">
                <p class="detail-label">Fecha</p>
                <p class="detail-value">${new Date(reclamo.fecha).toLocaleString('es-VE')}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Estado</p>
                <p class="detail-value">${reclamo.estado === 'recibido' ? 'Recibido' : 'Pendiente'}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Vivienda</p>
                <p class="detail-value">${reclamo.vivienda.nombre}</p>
            </div>
        </div>
        <div class="detail-card">
            <p class="detail-label">Descripción del reclamo</p>
            <p class="reclamo-detalle-texto">${reclamo.mensaje}</p>
        </div>
    `;

    abrirModal(modal);
}

function mostrarDetalleVecino(reclamo) {
    const modal = document.getElementById('detalleVecinoModal');
    const contenedor = document.getElementById('detalleVecinoContenido');
    if (!modal || !contenedor) return;

    contenedor.innerHTML = `
        <div class="detail-grid">
            <div class="detail-card">
                <p class="detail-label">Nombre</p>
                <p class="detail-value">${reclamo.vecino.nombre}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Cédula</p>
                <p class="detail-value">${reclamo.vecino.cedula}</p>
            </div>
            <div class="detail-card">
                <p la="detail-label">Teléfono</p>
                <p class="detail-value">${reclamo.vecino.telefono}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Correo</p>
                <p class="detail-value">${reclamo.vecino.email}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Vivienda</p>
                <p class="detail-value">${reclamo.vivienda.nombre}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Dirección</p>
                <p class="detail-value">${reclamo.vivienda.direccion}</p>
            </div>
        </div>
    `;

    abrirModal(modal);
}

async function marcarReclamoRecibido(id) {
    const reclamo = reclamos.find((item) => item.id === id);
    if (!reclamo || reclamo.estado === 'recibido') {
        return;
    }

    try {
        const respuesta = await fetch(RECLAMOS_UPDATE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ id, estado: 'recibido' })
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (!payload?.success) {
            throw new Error(payload?.message || 'Error desconocido');
        }

        reclamo.estado = payload.data?.estado || 'recibido';
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Reclamo marcado como recibido', 'success');
        }

        await cargarReclamos();
    } catch (error) {
        console.error('Error al actualizar reclamo:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo actualizar el reclamo. Intenta nuevamente.', 'error');
        }
    }
}

function actualizarResumenReclamos() {
    const pendientes = reclamos.filter((item) => item.estado === 'pendiente').length;
    const recibidos = reclamos.filter((item) => item.estado === 'recibido').length;
    const total = reclamos.length;

    asignarTexto('reclamosPendientes', pendientes);
    asignarTexto('reclamosRecibidos', recibidos);
    asignarTexto('reclamosTotal', total);
}

function abrirModal(modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
}

function cerrarModal(modal) {
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal[aria-hidden="false"]')) {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
    }
}

function asignarTexto(id, valor) {
    const nodo = document.getElementById(id);
    if (nodo) {
        nodo.textContent = valor;
    }
}

// Export para pruebas si fuera necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderizarReclamos,
        crearReclamoMarkup,
        marcarReclamoRecibido,
        mostrarDetalleReclamo,
        mostrarDetalleVecino
    };
}
