// Gestión de pagos extraordinarios

const IMAGEN_PLACEHOLDER = 'https://images.unsplash.com/photo-1521540216272-a50305cd4421?auto=format&fit=crop&w=400&q=60';
const EXTRAORDINARIOS_API_URL = '../api/pago_extraordinario_guardar.php';

let productos = [];
let filtroEstadoProductos = 'todos';
let textoBusquedaProductos = '';
let productoEnEdicion = null;
let imagenTemporal = null;
let productoFechaPicker = null;

document.addEventListener('DOMContentLoaded', () => {
    configurarCalendarioProducto();
    inicializarPagosExtraordinarios();
    cargarProductos();
});

function volverDashboard() {
    window.location.href = 'index.html';
}

function configurarCalendarioProducto() {
    const campoFecha = document.getElementById('productoFecha');
    if (!campoFecha || typeof flatpickr !== 'function') {
        return;
    }

    if (flatpickr.l10ns?.es) {
        flatpickr.localize(flatpickr.l10ns.es);
    }

    productoFechaPicker = flatpickr(campoFecha, {
        locale: 'es',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd/m/Y',
        allowInput: true,
        defaultDate: null,
        onReady(selectedDates, dateStr, instance) {
            if (instance.altInput) {
                instance.altInput.placeholder = 'dd/mm/aaaa';
            }
        }
    });
}

function manejarSeleccionImagen(evento) {
    const archivo = evento.target.files?.[0];
    const nombreLabel = document.getElementById('productoImagenNombre');
    if (!archivo) {
        imagenTemporal = null;
        actualizarPreviewImagen();
        if (nombreLabel) nombreLabel.textContent = 'Ningún archivo seleccionado';
        return;
    }

    if (!archivo.type.startsWith('image/')) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Selecciona un archivo de imagen válido', 'error');
        }
        evento.target.value = '';
        if (nombreLabel) nombreLabel.textContent = 'Ningún archivo seleccionado';
        return;
    }

    const limite = 2 * 1024 * 1024;
    if (archivo.size > limite) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('La imagen supera los 2MB permitidos', 'error');
        }
        evento.target.value = '';
        if (nombreLabel) nombreLabel.textContent = 'Ningún archivo seleccionado';
        return;
    }

    const lector = new FileReader();
    lector.onload = (e) => {
        imagenTemporal = e.target?.result || null;
        actualizarPreviewImagen();
        if (nombreLabel) nombreLabel.textContent = formatearNombreArchivo(archivo.name);
    };
    lector.onerror = () => {
        imagenTemporal = null;
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo leer la imagen seleccionada', 'error');
        }
        actualizarPreviewImagen();
        if (nombreLabel) nombreLabel.textContent = 'Ningún archivo seleccionado';
    };
    lector.readAsDataURL(archivo);
}

function actualizarPreviewImagen() {
    const preview = document.getElementById('productoPreview');
    const previewImg = document.getElementById('productoPreviewImg');

    if (!preview || !previewImg) return;

    let imagen = imagenTemporal;
    if (!imagen && productoEnEdicion) {
        imagen = productoEnEdicion.imagenRuta || productoEnEdicion.imagen || '';
    }

    if (imagen) {
        previewImg.src = imagen;
        preview.removeAttribute('hidden');
    } else {
        previewImg.src = '';
        preview.setAttribute('hidden', '');
    }
}

function obtenerNombreArchivo(ruta) {
    return ruta.split('/').pop() || ruta;
}

function formatearNombreArchivo(ruta, maxLength = 28) {
    const nombre = obtenerNombreArchivo(ruta);
    if (nombre.length <= maxLength) {
        return nombre;
    }

    const punto = nombre.lastIndexOf('.');
    const extension = punto > 0 ? nombre.slice(punto) : '';
    const base = punto > 0 ? nombre.slice(0, punto) : nombre;

    const espacioBase = Math.max(1, maxLength - extension.length - 3);
    return `${base.slice(0, espacioBase)}...${extension}`;
}

function inicializarPagosExtraordinarios() {
    const filtroSelect = document.getElementById('filtroEstadoProductos');
    const busquedaInput = document.getElementById('busquedaProductos');
    const nuevoBtn = document.getElementById('btnNuevoProducto');
    const wrapper = document.getElementById('productosWrapper');
    const productoForm = document.getElementById('productoForm');
    const inputImagen = document.getElementById('productoImagen');
    const btnQuitarImagen = document.getElementById('quitarImagen');
    const labelNombre = document.getElementById('productoImagenNombre');

    if (filtroSelect) {
        filtroSelect.addEventListener('change', (event) => {
            filtroEstadoProductos = event.target.value;
            actualizarBadgeProductos();
            renderizarProductos();
        });
    }

    if (busquedaInput) {
        busquedaInput.addEventListener('input', (event) => {
            textoBusquedaProductos = event.target.value.toLowerCase();
            renderizarProductos();
        });
    }

    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => abrirModalProducto());
    }

    if (wrapper) {
        wrapper.addEventListener('click', manejarAccionProducto);
    }

    if (productoForm) {
        productoForm.addEventListener('submit', manejarSubmitProducto);
    }

    if (inputImagen) {
        inputImagen.addEventListener('change', manejarSeleccionImagen);
    }

    if (btnQuitarImagen) {
        btnQuitarImagen.addEventListener('click', () => {
            imagenTemporal = null;
            if (inputImagen) inputImagen.value = '';
            actualizarPreviewImagen();
            if (labelNombre) labelNombre.textContent = 'Ningún archivo seleccionado';
        });
    }

    configurarModal('productoModal', 'cerrarProductoModal', () => limpiarFormularioProducto());
    configurarModal('eliminarProductoModal', 'cerrarEliminarProducto');

    const cancelarProducto = document.getElementById('cancelarProducto');
    if (cancelarProducto) {
        cancelarProducto.addEventListener('click', () => cerrarModalPorId('productoModal', true));
    }

    const cancelarEliminar = document.getElementById('cancelarEliminarProducto');
    if (cancelarEliminar) {
        cancelarEliminar.addEventListener('click', () => cerrarModalPorId('eliminarProductoModal'));
    }

    const confirmarEliminar = document.getElementById('confirmarEliminarProducto');
    if (confirmarEliminar) {
        confirmarEliminar.addEventListener('click', confirmarEliminacionProducto);
    }
}

function configurarModal(idModal, idCerrar, onClose) {
    const modal = document.getElementById(idModal);
    if (!modal) return;

    modal.addEventListener('click', (event) => {
        if (event.target.dataset.close === 'modal') {
            cerrarModal(modal);
            if (typeof onClose === 'function') onClose();
        }
    });

    if (idCerrar) {
        const btnCerrar = document.getElementById(idCerrar);
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => {
                cerrarModal(modal);
                if (typeof onClose === 'function') onClose();
            });
        }
    }
}

function actualizarBadgeProductos() {
    const badge = document.getElementById('productosBadge');
    if (!badge) return;

    let texto = 'Mostrando todos';
    if (filtroEstadoProductos === 'activo') texto = 'Mostrando activos';
    if (filtroEstadoProductos === 'inactivo') texto = 'Mostrando inactivos';
    badge.textContent = texto;
}

function renderizarProductos() {
    const wrapper = document.getElementById('productosWrapper');
    const emptyState = document.getElementById('productosEmptyState');
    if (!wrapper) return;

    const filtrados = productos.filter((producto) => {
        const coincideEstado = filtroEstadoProductos === 'todos' || producto.estado === filtroEstadoProductos;
        const coincideTexto = textoBusquedaProductos === ''
            || producto.nombre.toLowerCase().includes(textoBusquedaProductos)
            || producto.descripcion.toLowerCase().includes(textoBusquedaProductos);
        return coincideEstado && coincideTexto;
    });

    if (filtrados.length === 0) {
        wrapper.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        wrapper.innerHTML = filtrados.map(crearProductoMarkup).join('');
    }

    actualizarResumenProductos();
}

function crearProductoMarkup(producto) {
    const estadoClass = producto.estado === 'activo' ? 'activo' : 'inactivo';
    const estadoLabel = producto.estado === 'activo' ? 'Activo' : 'Inactivo';
    const imagen = (producto.imagen || '').trim();
    const imagenValida = imagen ? imagen : IMAGEN_PLACEHOLDER;
    const fechaLegible = formatearFechaCorta(producto.fecha);

    return `
        <article class="producto-item" data-id="${producto.id}">
            <div class="producto-thumb">
                ${imagenValida
                    ? `<img src="${imagenValida}" alt="${producto.nombre}">`
                    : '<i class="fas fa-image"></i>'}
            </div>
            <div class="producto-main">
                <div class="producto-header">
                    <h3>${producto.nombre}</h3>
                    <span class="status-chip ${estadoClass}">
                        <i class="fas ${producto.estado === 'activo' ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                        ${estadoLabel}
                    </span>
                </div>
                <div class="producto-meta">
                    <span><i class="fas fa-dollar-sign"></i> $${producto.precio.toFixed(2)}</span>
                    <span><i class="fas fa-calendar"></i> ${fechaLegible}</span>
                </div>
                <p class="producto-descripcion">${producto.descripcion || 'Sin descripción registrada.'}</p>
            </div>
            <div class="producto-actions">
                <button class="btn-secondary" data-action="editar">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="btn-outline" data-action="estado">
                    <i class="fas ${producto.estado === 'activo' ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    ${producto.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button class="btn-danger" data-action="eliminar">
                    <i class="fas fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </article>
    `;
}

function manejarAccionProducto(evento) {
    const boton = evento.target.closest('button[data-action]');
    if (!boton) return;

    const item = boton.closest('.producto-item');
    if (!item) return;

    const id = parseInt(item.dataset.id, 10);
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;

    const accion = boton.dataset.action;
    switch (accion) {
        case 'editar':
            abrirModalProducto(producto);
            break;
        case 'estado':
            toggleEstadoProducto(id);
            break;
        case 'eliminar':
            solicitarEliminacionProducto(producto);
            break;
        default:
            break;
    }
}

function abrirModalProducto(producto = null) {
    productoEnEdicion = producto ? { ...producto } : null;

    const titulo = document.getElementById('productoModalTitulo');
    const form = document.getElementById('productoForm');
    const inputImagen = document.getElementById('productoImagen');

    if (titulo) {
        titulo.innerHTML = producto
            ? '<i class="fas fa-gem"></i> Editar producto'
            : '<i class="fas fa-gem"></i> Nuevo producto';
    }

    if (form) {
        form.reset();
        document.getElementById('productoId').value = producto ? producto.id : '';
        document.getElementById('productoNombre').value = producto ? producto.nombre : '';
        document.getElementById('productoPrecio').value = producto ? producto.precio : '';
        document.getElementById('productoEstado').value = producto ? producto.estado : 'activo';
        document.getElementById('productoDescripcion').value = producto ? producto.descripcion : '';
        document.getElementById('productoImagenActual').value = producto ? producto.imagenRuta || '' : '';
    }

    if (productoFechaPicker) {
        if (producto?.fecha) {
            productoFechaPicker.setDate(producto.fecha, true, 'Y-m-d');
        } else {
            productoFechaPicker.clear();
        }
    } else {
        const campoFecha = document.getElementById('productoFecha');
        if (campoFecha) {
            campoFecha.value = producto ? producto.fecha : '';
        }
    }

    const nombreLabel = document.getElementById('productoImagenNombre');
    if (nombreLabel) {
        const rutaImagen = producto ? (producto.imagenRuta || producto.imagen || '') : '';
        nombreLabel.textContent = rutaImagen
            ? formatearNombreArchivo(rutaImagen)
            : 'Ningún archivo seleccionado';
    }

    productoEnEdicion = producto ? { ...producto } : null;
    imagenTemporal = null;
    actualizarPreviewImagen();

    abrirModalPorId('productoModal');
}

function limpiarFormularioProducto() {
    const form = document.getElementById('productoForm');
    if (form) form.reset();
    productoEnEdicion = null;
    imagenTemporal = null;
    actualizarPreviewImagen();
    if (productoFechaPicker) {
        productoFechaPicker.clear();
    }
}

async function manejarSubmitProducto(evento) {
    evento.preventDefault();
    const form = evento.target;

    const datos = {
        id: form.productoId.value ? parseInt(form.productoId.value, 10) : 0,
        nombre: form.productoNombre.value.trim(),
        fecha: form.productoFecha.value,
        precio: parseFloat(form.productoPrecio.value) || 0,
        estado: form.productoEstado.value,
        descripcion: form.productoDescripcion.value.trim(),
        compras: productoEnEdicion ? productoEnEdicion.compras : 0
    };

    if (!datos.nombre || !datos.fecha || datos.precio < 0 || !datos.descripcion) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Completa correctamente los datos del producto', 'error');
        }
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'guardar');
        formData.append('id', datos.id);
        formData.append('nombre', datos.nombre);
        formData.append('descripcion', datos.descripcion);
        formData.append('precio', datos.precio);
        formData.append('estado', datos.estado);
        formData.append('fecha', datos.fecha);
        formData.append('imagen_actual', form.productoImagenActual.value || '');

        const archivo = form.productoImagen.files?.[0];
        if (archivo) {
            formData.append('imagen', archivo);
        }

        const respuesta = await fetch(EXTRAORDINARIOS_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (!payload?.success) {
            throw new Error(payload?.message || 'Error desconocido');
        }

        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Producto guardado correctamente', 'success');
        }

        cerrarModalPorId('productoModal', true);
        await cargarProductos();
    } catch (error) {
        console.error('Error al guardar producto extraordinario:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo guardar el producto. Intenta nuevamente.', 'error');
        }
    }
}

function toggleEstadoProducto(id) {
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;

    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';
    guardarCambioEstadoProducto(id, nuevoEstado);
}

let productoPendienteEliminar = null;

function solicitarEliminacionProducto(producto) {
    productoPendienteEliminar = producto;
    const mensaje = document.getElementById('eliminarProductoMensaje');
    if (mensaje) {
        mensaje.textContent = `¿Eliminar "${producto.nombre}"? No podrás revertir esta acción.`;
    }
    abrirModalPorId('eliminarProductoModal');
}

async function confirmarEliminacionProducto() {
    if (!productoPendienteEliminar) return;

    try {
        const formData = new FormData();
        formData.append('action', 'eliminar');
        formData.append('id', productoPendienteEliminar.id);

        const respuesta = await fetch(EXTRAORDINARIOS_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (!payload?.success) {
            throw new Error(payload?.message || 'Error desconocido');
        }

        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Producto eliminado', 'success');
        }
        productoPendienteEliminar = null;
        cerrarModalPorId('eliminarProductoModal');
        await cargarProductos();
    } catch (error) {
        console.error('Error al eliminar producto extraordinario:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo eliminar el producto. Intenta nuevamente.', 'error');
        }
    }
}

function actualizarResumenProductos() {
    const activos = productos.filter((p) => p.estado === 'activo').length;
    const inactivos = productos.filter((p) => p.estado === 'inactivo').length;
    const total = productos.length;

    asignarTexto('productosActivos', activos);
    asignarTexto('productosInactivos', inactivos);
    asignarTexto('productosTotal', total);
    asignarTexto('productosCompras', 0);
}

function abrirModal(modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

function cerrarModal(modal) {
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal[aria-hidden="false"]')) {
        document.body.classList.remove('modal-open');
    }
}

function abrirModalPorId(idModal) {
    const modal = document.getElementById(idModal);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

function cerrarModalPorId(idModal, limpiar = false) {
    const modal = document.getElementById(idModal);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    if (limpiar) limpiarFormularioProducto();
    if (!document.querySelector('.modal[aria-hidden="false"]')) {
        document.body.classList.remove('modal-open');
    }
}

function asignarTexto(id, valor) {
    const nodo = document.getElementById(id);
    if (nodo) nodo.textContent = valor;
}

// Export para pruebas
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderizarProductos,
        crearProductoMarkup,
        toggleEstadoProducto,
        confirmarEliminacionProducto,
        cargarProductos
    };
}

async function cargarProductos() {
    try {
        const respuesta = await fetch(`${EXTRAORDINARIOS_API_URL}?action=listar`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (!payload?.success || !Array.isArray(payload.data)) {
            throw new Error('Respuesta inválida');
        }

        productos = payload.data.map(normalizarProductoDesdeApi);
        renderizarProductos();
    } catch (error) {
        console.error('Error al cargar productos extraordinarios:', error);
        productos = [];
        renderizarProductos();
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudieron cargar los productos extraordinarios', 'error');
        }
    }
}

function normalizarProductoDesdeApi(item) {
    const foto = item?.foto || '';
    return {
        id: Number.parseInt(item?.id, 10) || 0,
        nombre: item?.nombre || 'Producto extraordinario',
        descripcion: item?.descripcion || '',
        precio: Number.parseFloat(item?.precio) || 0,
        estado: (item?.estado || 'activo').toLowerCase() === 'inactivo' ? 'inactivo' : 'activo',
        imagen: foto,
        imagenRuta: foto ? foto.replace(/^\.\.\//, '') : '',
        fecha: item?.fecha || new Date().toISOString().slice(0, 10),
        compras: Number.parseInt(item?.compras, 10) || 0
    };
}

function formatearFechaCorta(fechaIso) {
    if (!fechaIso) {
        return 'Sin fecha';
    }

    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) {
        return 'Sin fecha';
    }

    return fecha.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

async function guardarCambioEstadoProducto(id, estado) {
    try {
        const formData = new FormData();
        formData.append('action', 'estado');
        formData.append('id', id);
        formData.append('estado', estado);

        const respuesta = await fetch(EXTRAORDINARIOS_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();
        if (!payload?.success) {
            throw new Error(payload?.message || 'Error desconocido');
        }

        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Estado actualizado', 'info');
        }

        await cargarProductos();
    } catch (error) {
        console.error('Error al actualizar el estado del producto:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo cambiar el estado. Intenta nuevamente.', 'error');
        }
    }
}
