// Lógica para la bandeja de solicitudes de carta de residencia

const SOLICITUDES_API_URL = '../api/solicitudes_cartas.php';

const ICONOS_ESTADO = {
    aprobado: 'fa-check-circle',
    aprobada: 'fa-check-circle',
    pendiente: 'fa-clock',
    pendientes: 'fa-clock',
    rechazado: 'fa-times-circle',
    rechazada: 'fa-times-circle',
    rechazadas: 'fa-times-circle',
    rechazados: 'fa-times-circle',
    confirmado: 'fa-check-circle',
    confirmada: 'fa-check-circle',
    entregado: 'fa-hand-holding-heart',
    entregada: 'fa-hand-holding-heart',
    generado: 'fa-file-signature',
    generada: 'fa-file-signature',
    generados: 'fa-file-signature',
    generadas: 'fa-file-signature',
    procesando: 'fa-spinner',
    'en-proceso': 'fa-spinner',
    'en-progreso': 'fa-spinner',
    'en-revision': 'fa-hourglass-half',
    revisado: 'fa-hourglass-half',
    revisada: 'fa-hourglass-half'
};

const ICONOS_RESUMEN = {
    total: 'fa-clipboard-list'
};

function quitarDiacriticos(texto) {
    if (typeof texto !== 'string') {
        return '';
    }

    if (typeof texto.normalize === 'function') {
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    return texto;
}

function crearSlugEstado(estado) {
    const texto = typeof estado === 'string' ? estado : String(estado ?? '');
    const base = quitarDiacriticos(texto.toLowerCase().trim());
    const slug = base.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    return slug || 'sin-estado';
}

function obtenerClaseEstado(slug) {
    return slug ? `status-${slug}` : 'status-default';
}

function obtenerIconoEstado(slug) {
    if (!slug) {
        return 'fa-tag';
    }
    return ICONOS_ESTADO[slug] || ICONOS_ESTADO[slug.replace(/s$/, '')] || 'fa-tag';
}

function obtenerIconoResumen(slug) {
    if (!slug) {
        return 'fa-tag';
    }
    if (ICONOS_RESUMEN[slug]) {
        return ICONOS_RESUMEN[slug];
    }
    return obtenerIconoEstado(slug);
}

let solicitudes = [];
let filtroEstado = 'todos';
let textoBusqueda = '';
let paginaActual = 1;
const ITEMS_POR_PAGINA = 12;
let cartaLogoDataUrl = null;

// Inicialización de la vista
document.addEventListener('DOMContentLoaded', () => {
    inicializarControles();
    renderizarSolicitudes();
    cargarSolicitudes();
});

async function cargarSolicitudes() {
    try {
        const respuesta = await fetch(SOLICITUDES_API_URL, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (payload?.success && Array.isArray(payload.data)) {
            solicitudes = payload.data.map(normalizarSolicitudDesdeApi);
        } else {
            throw new Error('Respuesta inválida');
        }
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        solicitudes = [];
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudieron cargar las solicitudes desde la base de datos', 'error');
        }
    } finally {
        actualizarBadge();
        renderizarSolicitudes();
    }
}

function normalizarSolicitudDesdeApi(item) {
    const id = Number.parseInt(item?.id, 10) || Date.now();
    const estadoOriginal = (item?.estado ?? 'Pendiente').toString().trim() || 'Pendiente';
    const estadoSlug = crearSlugEstado(estadoOriginal);
    const fechaSolicitud = item?.fechaSolicitud ? new Date(item.fechaSolicitud).toISOString() : new Date().toISOString();
    const fechaRecibida = item?.fechaRecibida ? new Date(item.fechaRecibida).toISOString() : null;

    const solicitante = item?.solicitante || {};
    const vivienda = item?.vivienda || {};

    return {
        id,
        estado: estadoOriginal,
        estadoSlug,
        fechaSolicitud,
        fechaRecibida,
        mensaje: item?.mensaje || '',
        solicitante: {
            nombre: solicitante.nombre || 'Propietario',
            cedula: solicitante.cedula ? String(solicitante.cedula) : '',
            telefono: solicitante.telefono ? String(solicitante.telefono) : '',
            email: solicitante.email || ''
        },
        vivienda: {
            inmueble_id: vivienda.inmueble_id ?? null,
            nombre: vivienda.nombre || 'Inmueble asociado',
            tipo: vivienda.tipo || 'Inmueble',
            direccion: vivienda.direccion || '',
            avenida: vivienda.avenida || '',
            deuda: Number.isFinite(Number(vivienda.deuda)) ? Number(vivienda.deuda) : 0
        }
    };
}

function volverDashboard() {
    window.location.href = 'index.html';
}

function inicializarControles() {
    const filtroEstadoSelect = document.getElementById('estadoFiltro');
    const busquedaInput = document.getElementById('busquedaTexto');
    const wrapper = document.getElementById('solicitudesWrapper');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (filtroEstadoSelect) {
        filtroEstadoSelect.addEventListener('change', (evt) => {
            filtroEstado = evt.target.value;
            actualizarBadge();
            paginaActual = 1;
            renderizarSolicitudes();
        });
    }

    if (busquedaInput) {
        busquedaInput.addEventListener('input', (evt) => {
            textoBusqueda = evt.target.value.toLowerCase();
            paginaActual = 1;
            renderizarSolicitudes();
        });
    }

    if (wrapper) {
        wrapper.addEventListener('click', manejarAccionSolicitud);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (paginaActual > 1) {
                paginaActual -= 1;
                renderizarSolicitudes();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            paginaActual += 1;
            renderizarSolicitudes();
        });
    }

    const modalDetalle = document.getElementById('detalleSolicitudModal');
    const modalVivienda = document.getElementById('detalleViviendaModal');

    if (modalDetalle) {
        modalDetalle.addEventListener('click', (evt) => {
            if (evt.target.dataset.close === 'modal') {
                cerrarModal(modalDetalle);
            }
        });
        const cerrarDetalleBtn = document.getElementById('cerrarDetalleSolicitud');
        if (cerrarDetalleBtn) {
            cerrarDetalleBtn.addEventListener('click', () => cerrarModal(modalDetalle));
        }
    }

    if (modalVivienda) {
        modalVivienda.addEventListener('click', (evt) => {
            if (evt.target.dataset.close === 'modal') {
                cerrarModal(modalVivienda);
            }
        });
        const cerrarViviendaBtn = document.getElementById('cerrarDetalleVivienda');
        if (cerrarViviendaBtn) {
            cerrarViviendaBtn.addEventListener('click', () => cerrarModal(modalVivienda));
        }
    }
}

function actualizarBadge() {
    const badge = document.getElementById('badgeEstado');
    const select = document.getElementById('estadoFiltro');
    if (!badge) return;

    let texto = 'Mostrando todas';
    if (select) {
        const opcion = select.options[select.selectedIndex];
        if (opcion && opcion.value !== 'todos') {
            texto = `Mostrando estado: ${opcion.textContent}`;
        }
    }

    badge.textContent = texto;
}

function renderizarSolicitudes() {
    const wrapper = document.getElementById('solicitudesWrapper');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (!wrapper) return;

    actualizarOpcionesEstado();

    const solicitudesFiltradas = solicitudes.filter((solicitud) => {
        const estadoCoincide = filtroEstado === 'todos' || solicitud.estadoSlug === filtroEstado;
        const textoCoincide = textoBusqueda === ''
            || solicitud.solicitante.nombre.toLowerCase().includes(textoBusqueda)
            || solicitud.solicitante.cedula.includes(textoBusqueda)
            || solicitud.vivienda.nombre.toLowerCase().includes(textoBusqueda);
        return estadoCoincide && textoCoincide;
    });

    const totalPaginas = Math.max(1, Math.ceil(solicitudesFiltradas.length / ITEMS_POR_PAGINA));
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const paginaDatos = solicitudesFiltradas.slice(inicio, fin);

    if (solicitudesFiltradas.length === 0) {
        wrapper.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (pagination) pagination.setAttribute('hidden', '');
    } else {
        if (emptyState) emptyState.style.display = 'none';
        wrapper.innerHTML = paginaDatos.map(crearSolicitudMarkup).join('');
        if (pagination) {
            pagination.removeAttribute('hidden');
            if (paginationInfo) {
                paginationInfo.textContent = `Página ${paginaActual} de ${totalPaginas}`;
            }
            if (prevBtn) prevBtn.disabled = paginaActual === 1;
            if (nextBtn) nextBtn.disabled = paginaActual === totalPaginas;
        }
    }

    renderResumen();
}

function crearSolicitudMarkup(solicitud) {
    const fecha = new Date(solicitud.fechaSolicitud);
    const fechaFormateada = fecha.toLocaleString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusClass = obtenerClaseEstado(solicitud.estadoSlug);
    const statusLabel = solicitud.estado || 'Sin estado';
    const statusIcon = obtenerIconoEstado(solicitud.estadoSlug);
    // Mostrar botones solo cuando el pago esté confirmado y NO se haya entregado aún
    const esEntregado = solicitud.estadoSlug === 'entregado' || solicitud.estadoSlug === 'entregada' || solicitud.estado === 'Entregado';
    const esPagoConfirmado = solicitud.estadoSlug === 'confirmado' || solicitud.estadoSlug === 'confirmada' || solicitud.estado === 'Confirmado' || solicitud.estado === 'Confirmada';

    const puedeGenerar = !esEntregado && esPagoConfirmado;
    const puedeEntregar = puedeGenerar;

    return `
        <article class="request-item" data-id="${solicitud.id}">
            <div class="request-main">
                <div class="request-header">
                    <h3>${solicitud.solicitante.nombre}</h3>
                    <span class="status-chip ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${statusLabel}
                    </span>
                </div>
                <div class="request-meta">
                    <span><i class="fas fa-id-card"></i> ${solicitud.solicitante.cedula}</span>
                    <span><i class="fas fa-house"></i> ${solicitud.vivienda.nombre}</span>
                    <span><i class="fas fa-calendar"></i> ${fechaFormateada}</span>
                </div>
                <p class="request-message">${solicitud.mensaje}</p>
            </div>
            <div class="request-actions">
                <button class="btn-secondary ver-detalle" data-action="detalle">
                    <i class="fas fa-eye"></i>
                    Ver detalle
                </button>
                <button class="btn-outline ver-vivienda" data-action="vivienda">
                    <i class="fas fa-house-user"></i>
                    Ver vivienda
                </button>
                ${puedeGenerar ? `
                <button class="btn-success generar-carta" data-action="generar">
                    <i class="fas fa-file-signature"></i>
                    Generar
                </button>` : ''}
                ${puedeEntregar ? `
                <button class="btn-primary entregar-carta" data-action="entregar">
                    <i class="fas fa-hand-holding-heart"></i>
                    Entregado
                </button>` : ''}
            </div>
        </article>
    `;

}

function manejarAccionSolicitud(evento) {
    const boton = evento.target.closest('button[data-action]');
    if (!boton) return;

    const solicitudNode = boton.closest('.request-item');
    if (!solicitudNode) return;

    const id = parseInt(solicitudNode.dataset.id, 10);
    const solicitud = solicitudes.find((item) => item.id === id);
    if (!solicitud) return;

    const accion = boton.dataset.action;

    switch (accion) {
        case 'detalle':
            mostrarDetalleSolicitud(solicitud);
            break;
        case 'vivienda':
            mostrarDetalleVivienda(solicitud.vivienda, solicitud.solicitante);
            break;
        case 'generar':
            // Generar si el estado es "Aprobada" o "Confirmado"
            if (solicitud.estadoSlug === 'aprobada' || solicitud.estadoSlug === 'confirmado' || solicitud.estadoSlug === 'confirmada') {
                generarCartaResidencia(solicitud);
            }
            break;
        case 'entregar':
            marcarComoEntregada(id);
            break;
        default:
            break;
    }
}

async function marcarComoEntregada(cartaId) {
    if (!confirm('¿Estás seguro de marcar esta carta como entregada? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const respuesta = await fetch('../api/entregar_carta.php', {
            method: 'POST',
            body: JSON.stringify({ carta_id: cartaId }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await respuesta.json();
        if (data.success) {
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Carta marcada como entregada exitosamente', 'success');
            }
            cargarSolicitudes(); // Recargar la lista
        } else {
            throw new Error(data.message || 'Error al actualizar');
        }
    } catch (error) {
        console.error('Error al entregar carta:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error: ' + error.message, 'error');
        }
    }
}

function mostrarDetalleSolicitud(solicitud) {
    const modal = document.getElementById('detalleSolicitudModal');
    const contenedor = document.getElementById('detalleSolicitudContenido');
    if (!modal || !contenedor) return;

    contenedor.innerHTML = `
        <div class="detail-grid">
            <div class="detail-card">
                <p class="detail-label">Solicitante</p>
                <p class="detail-value">${solicitud.solicitante.nombre}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Cédula</p>
                <p class="detail-value">${solicitud.solicitante.cedula}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Correo</p>
                <p class="detail-value">${solicitud.solicitante.email}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Teléfono</p>
                <p class="detail-value">${solicitud.solicitante.telefono}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Estado actual</p>
                <p class="detail-value">${solicitud.estado || 'Sin estado'}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Fecha solicitud</p>
                <p class="detail-value">${new Date(solicitud.fechaSolicitud).toLocaleString('es-VE')}</p>
            </div>
            ${solicitud.fechaRecibida ? `
            <div class="detail-card">
                <p class="detail-label">Fecha recibida</p>
                <p class="detail-value">${new Date(solicitud.fechaRecibida).toLocaleString('es-VE')}</p>
            </div>` : ''}
        </div>
        <div class="detail-card">
            <p class="detail-label">Mensaje del solicitante</p>
            <p class="detail-value" style="white-space: pre-line;">${solicitud.mensaje}</p>
        </div>
    `;

    abrirModal(modal);
}

function mostrarDetalleVivienda(vivienda, solicitante) {
    const modal = document.getElementById('detalleViviendaModal');
    const contenedor = document.getElementById('detalleViviendaContenido');
    if (!modal || !contenedor) return;

    contenedor.innerHTML = `
        <div class="detail-grid">
            <div class="detail-card">
                <p class="detail-label">Propietario</p>
                <p class="detail-value">${solicitante.nombre}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Documento</p>
                <p class="detail-value">${solicitante.cedula}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Vivienda</p>
                <p class="detail-value">${vivienda.nombre}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Tipo</p>
                <p class="detail-value">${vivienda.tipo}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Dirección</p>
                <p class="detail-value">${vivienda.direccion}</p>
            </div>
            <div class="detail-card">
                <p class="detail-label">Deuda USD</p>
                <p class="detail-value">${vivienda.deuda ? `$${vivienda.deuda.toFixed(2)} USD` : '$0,00 USD'}</p>
            </div>
        </div>
    `;

    abrirModal(modal);
}


async function obtenerLogoCartaResidencia() {
    if (cartaLogoDataUrl) {
        return cartaLogoDataUrl;
    }

    try {
        const respuesta = await fetch('../assets/img/logo_arcorui.png');
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }
        const blob = await respuesta.blob();
        cartaLogoDataUrl = await new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = () => resolve(lector.result);
            lector.onerror = () => reject(new Error('No se pudo leer el logo en base64'));
            lector.readAsDataURL(blob);
        });
        return cartaLogoDataUrl;
    } catch (error) {
        console.error('Error al cargar el logo de la carta:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo cargar el logo de la carta. Se generará sin logotipo.', 'warning');
        }
        return null;
    }
}

async function generarCartaResidencia(solicitud) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('jsPDF no está disponible en la ventana.');
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo generar la carta porque falta la librería jsPDF.', 'error');
        }
        return;
    }

    try {
        const doc = new window.jspdf.jsPDF({
            unit: 'mm',
            format: 'letter'
        });

        const margenIzquierdo = 20;
        const anchoPagina = doc.internal.pageSize.getWidth();
        let cursorY = 10;

        const logoDataUrl = await obtenerLogoCartaResidencia();
        if (logoDataUrl) {
            const logoAncho = 85;
            const logoAlto = 35;
            const posicionX = (anchoPagina - logoAncho) / 2;
            const posicionY = 12;
            doc.addImage(logoDataUrl, 'PNG', posicionX, posicionY, logoAncho, logoAlto);
            cursorY = posicionY + logoAlto + 18;
        } else {
            cursorY = 40;
        }

        const textoPrincipal = {
            encabezado: 'Arcorui',
            subtitulo: 'Junta de Condominio',
            direccion: 'Conjunto Residencial Colina de los Ruices'
        };

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(textoPrincipal.encabezado, margenIzquierdo, cursorY);
        cursorY += 6;

        doc.setFontSize(12);
        doc.text(textoPrincipal.subtitulo, margenIzquierdo, cursorY);
        cursorY += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(textoPrincipal.direccion, margenIzquierdo, cursorY, { maxWidth: 170 });

        cursorY += 15;
        const ahora = new Date();
        const formatter = new Intl.DateTimeFormat('es-VE', {
            timeZone: 'America/Caracas',
            year: 'numeric',
            month: 'long',
            day: '2-digit'
        });
        const fechaTexto = formatter.format(ahora);
        doc.text(`Caracas, ${fechaTexto}`, margenIzquierdo, cursorY);

        cursorY += 18;
        doc.text('Señores:', margenIzquierdo, cursorY);
        cursorY += 6;
        doc.setFont('Helvetica', 'bold');
        doc.text('A quien pueda interesar.', margenIzquierdo, cursorY);
        doc.setFont('Helvetica', 'normal');
        cursorY += 6;


        cursorY += 20;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('CONSTANCIA', margenIzquierdo, cursorY);

        cursorY += 15;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(11);

        const nombrePropietario = solicitud.solicitante?.nombre || 'Propietario';
        const cedulaPropietario = solicitud.solicitante?.cedula || '';
        const tipoVivienda = solicitud.vivienda?.tipo?.toLowerCase() || '';
        const nombreVivienda = solicitud.vivienda?.nombre || '';
        const direccionVivienda = solicitud.vivienda?.direccion || '';
        const avenidaVivienda = solicitud.vivienda?.avenida || '';

        let descripcionVivienda = '';
        if (tipoVivienda.includes('apartamento')) {
            descripcionVivienda = [nombreVivienda].filter(Boolean).join(', ');
        } else if (tipoVivienda.includes('casa')) {
            descripcionVivienda = [nombreVivienda, avenidaVivienda].filter(Boolean).join(', ');
        } else {
            descripcionVivienda = [nombreVivienda, direccionVivienda || avenidaVivienda].filter(Boolean).join(', ');
        }

        const parrafo = `Quien suscribe MILTON ARROYO CARDOZO, mayor de edad, titular de la Cédula de Identidad Nro. V- 6.519.874 actuando en mi carácter de Presidente de la Junta de Vecinos de la Asociación de Residentes de la Urbanización Colinas de los Ruices ARCORUI, hace constar por medio de la presente que ${nombrePropietario}, mayor de edad, titular de la Cédula de Identidad Nro. ${cedulaPropietario}, es residente de esta Urbanización${descripcionVivienda ? `, en la vivienda ${descripcionVivienda}` : ''}, Urbanización Colinas de Los Ruices, Caracas (Petare), Estado Miranda.`;

        doc.text(parrafo, margenIzquierdo, cursorY, { maxWidth: 170, lineHeightFactor: 1.5 });

        cursorY += 50;
        const anchoCarta = doc.internal.pageSize.getWidth();
        const textoPie = 'Por la Junta Directiva de la Asociación de Vecinos:';
        const textoOffset = (anchoCarta / 2);
        doc.text(textoPie, textoOffset, cursorY, { align: 'center' });

        cursorY += 25;
        const lineaWidth = 80;
        const lineaX = (anchoCarta - lineaWidth) / 2;
        doc.setLineWidth(0.5);
        doc.line(lineaX, cursorY, lineaX + lineaWidth, cursorY);

        cursorY += 6;
        doc.setFont('Helvetica', 'bold');
        doc.text('Milton Arroyo Cardozo', textoOffset, cursorY, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        cursorY += 6;
        doc.text('(Presidente de la Asociación de Vecinos)', textoOffset, cursorY, { align: 'center' });
        cursorY += 6;
        doc.text('CI: V-6.519.874', textoOffset, cursorY, { align: 'center' });
        cursorY += 12;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Avenida Horacio Lemoine. Complejo Polideportivo Látigo Chávez. Urbanización Colinas de los Ruices.', textoOffset, cursorY, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(11);


        const nombreArchivoSeguro = nombrePropietario.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const nombreArchivo = nombreArchivoSeguro ? `constancia_${nombreArchivoSeguro}.pdf` : 'constancia_residencia.pdf';

        doc.save(nombreArchivo);

        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(`Carta generada para ${nombrePropietario}`, 'success');
        }
    } catch (error) {
        console.error('Error generando la carta:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Ocurrió un error al generar la carta de residencia.', 'error');
        }
    }
}

function actualizarOpcionesEstado() {
    const select = document.getElementById('estadoFiltro');
    if (!select) return;

    // Obtener estados únicos de las solicitudes
    const estadosUnicos = new Set();
    solicitudes.forEach((solicitud) => {
        if (solicitud.estadoSlug) {
            estadosUnicos.add(solicitud.estadoSlug);
        }
    });

    // Guardar la opción seleccionada actual
    const valorActual = select.value;

    // Mantener solo la opción "Todas"
    select.innerHTML = '<option value="todos">Todas</option>';

    // Agregar opciones para cada estado único
    estadosUnicos.forEach((slug) => {
        const solicitud = solicitudes.find((s) => s.estadoSlug === slug);
        if (solicitud) {
            const option = document.createElement('option');
            option.value = slug;
            option.textContent = solicitud.estado;
            select.appendChild(option);
        }
    });

    // Restaurar la selección si todavía existe
    if (valorActual && Array.from(select.options).some(opt => opt.value === valorActual)) {
        select.value = valorActual;
    }
}

function renderResumen() {
    const contenedor = document.getElementById('summarySection');
    if (!contenedor) return;

    // Contar solicitudes por estado
    const contadores = {};
    let total = 0;

    solicitudes.forEach((solicitud) => {
        const estado = solicitud.estado || 'Sin estado';
        const slug = solicitud.estadoSlug || 'sin-estado';

        if (!contadores[slug]) {
            contadores[slug] = {
                estado: estado,
                slug: slug,
                count: 0
            };
        }
        contadores[slug].count++;
        total++;
    });

    // Crear HTML para las tarjetas de resumen
    let html = '';

    // Tarjeta de total
    html += `
        <div class="summary-card status-total">
            <div class="summary-icon status-total">
                <i class="fas ${obtenerIconoResumen('total')}"></i>
            </div>
            <div class="summary-content">
                <h3>${total}</h3>
                <p>Total de solicitudes 📋</p>
            </div>
        </div>
    `;

    // Tarjetas por estado
    Object.values(contadores).forEach((item) => {
        const claseEstado = obtenerClaseEstado(item.slug);
        const icono = obtenerIconoEstado(item.slug);

        html += `
            <div class="summary-card ${claseEstado}">
                <div class="summary-icon">
                    <i class="fas ${icono}"></i>
                </div>
                <div class="summary-content">
                    <h3>${item.count}</h3>
                    <p>${item.estado}</p>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

function actualizarResumen() {
    const pendientes = solicitudes.filter((item) => item.estado === 'pendiente').length;
    const recibidas = solicitudes.filter((item) => item.estado === 'recibida').length;
    const total = solicitudes.length;

    asignarTexto('pendientesCount', pendientes);
    asignarTexto('recibidasCount', recibidas);
    asignarTexto('totalCount', total);
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
    if (!nodo) return;
    nodo.textContent = valor;
}

// Permitir reutilizar en pruebas
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderizarSolicitudes,
        crearSolicitudMarkup,
        mostrarDetalleSolicitud,
        mostrarDetalleVivienda
    };
}
