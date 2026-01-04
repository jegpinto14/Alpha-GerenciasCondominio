const API_ESTADO_PAGOS = '../api/buscar-pagos.php';
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('estadoForm');
    const cedulaInput = document.getElementById('estadoCedula');

    if (formulario) {
        formulario.addEventListener('submit', manejarConsultaEstado);
    }

    if (cedulaInput) {
        cedulaInput.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/\D/g, '').slice(0, 8);
        });
    }
});

async function manejarConsultaEstado(event) {
    event.preventDefault();

    const cedulaInput = document.getElementById('estadoCedula');
    const anioSelect = document.getElementById('estadoAnio');

    if (!cedulaInput || !anioSelect) return;

    const cedula = cedulaInput.value.trim();
    const anio = parseInt(anioSelect.value, 10);

    if (!esCedulaValida(cedula)) {
        marcarInputError(cedulaInput, true);
        mostrarMensaje('Ingresa un número de cédula válido (7 u 8 dígitos).', 'error');
        return;
    }

    marcarInputError(cedulaInput, false);
    mostrarMensaje(null);
    ocultarResultados();

    try {
        const respuesta = await fetch(API_ESTADO_PAGOS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cedula,
                año: anio
            })
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const payload = await respuesta.json();

        if (payload?.success && payload?.data) {
            renderizarResultados(payload.data, anio);
        } else {
            const mensaje = payload?.message || 'No se encontraron pagos asociados a la cédula ingresada.';
            mostrarMensaje(mensaje, 'info');
        }
    } catch (error) {
        console.error('Error consultando estado de pagos:', error);
        mostrarMensaje('No fue posible obtener la información. Intenta nuevamente más tarde.', 'error');
    } finally {
        // No loader toggle needed
    }
}

function renderizarResultados(data, anio) {
    const propietario = data?.propietario || null;
    const vivienda = data?.vivienda_actual || (Array.isArray(data?.viviendas) ? data.viviendas[0] : null);

    if (!propietario || !vivienda) {
        mostrarMensaje('No se encontraron viviendas registradas para esta cédula.', 'info');
        return;
    }

    // Guardar datos globalmente para PDF
    datosActuales = data;
    anioActual = anio;

    actualizarTexto('resumenNombre', propietario.nombre_completo ?? '—');
    actualizarTexto('resumenCedula', propietario.cedula ?? '—');
    actualizarTexto('resumenTelefono', propietario.telefono ?? '—');
    actualizarTexto('resumenCorreo', propietario.email ?? '—');

    actualizarTexto('detalleVivienda', vivienda.nombre_inmueble ?? '—');
    actualizarTexto('detalleTipo', vivienda.tipo_vivienda ? `${vivienda.tipo_vivienda}${vivienda.tipo_entidad ? ` · ${vivienda.tipo_entidad}` : ''}` : '—');
    actualizarTexto('detalleUbicacion', vivienda.ubicacion_info ?? '—');
    actualizarTexto('detalleDeuda', formatearMonto(vivienda.monto_deuda_usd, 'USD'));

    const cuerpoTabla = document.getElementById('estadoTablaBody');
    if (cuerpoTabla) {
        cuerpoTabla.innerHTML = construirFilasPagos(vivienda, anio);
    }

    const contenedorResultados = document.getElementById('estadoResultados');
    if (contenedorResultados) {
        contenedorResultados.hidden = false;
    }

    mostrarMensaje(null);
}

function construirFilasPagos(vivienda, anio) {
    const pagos = Array.isArray(vivienda?.pagos) ? vivienda.pagos : [];
    const indicePagos = new Map(
        pagos.map((pago) => [`${pago.mes}-${pago.año}`, pago])
    );

    return MESES.map((nombreMes, index) => {
        const mesNumero = index + 1;
        const clave = `${mesNumero}-${anio}`;
        const pago = indicePagos.get(clave) || null;

        const estado = normalizarEstado(pago?.estado);
        const metodo = pago?.metodo_pago || 'N/A';
        const monto = formatearMonto(pago?.monto, pago?.moneda);
        const tasa = pago?.tasa_bs ? pago.tasa_bs : '—';
        const fecha = formatearFecha(pago?.fecha_pago);

        return `
            <tr>
                <td>${nombreMes}</td>
                <td>${anio}</td>
                <td><span class="estado-badge ${claseEstado(estado)}">${estado}</span></td>
                <td><span class="estado-metodo ${metodo === 'N/A' ? 'estado-metodo--na' : ''}">${metodo}</span></td>
                <td class="${pago && pago.monto > 0 ? 'estado-monto--pagado' : 'estado-monto--na'}">${monto}</td>
                <td>${tasa}</td>
                <td>${fecha}</td>
            </tr>
        `;
    }).join('');
}

function normalizarEstado(estado) {
    if (!estado) return 'No Pagado';
    const texto = estado.toString().trim().toLowerCase();

    if (['pagado', 'confirmado'].includes(texto)) return 'Pagado';
    if (['pago parcial', 'parcial'].includes(texto)) return 'Pago Parcial';
    return texto === 'no pagado' ? 'No Pagado' : capitalizarPalabras(texto);
}

function claseEstado(estado) {
    switch (estado) {
        case 'Pagado':
            return 'estado-badge--pagado';
        case 'Pago Parcial':
            return 'estado-badge--parcial';
        default:
            return 'estado-badge--pendiente';
    }
}

function formatearMonto(valor, moneda = 'USD') {
    const numero = Number(valor);
    if (!numero || Number.isNaN(numero) || numero <= 0) {
        return 'N/A';
    }

    const formateado = numero.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return moneda === 'Bs' ? `${formateado} Bs` : `$${formateado} USD`;
}

function formatearFecha(valor) {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';

    return new Intl.DateTimeFormat('es-VE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    }).format(fecha);
}

function esCedulaValida(cedula) {
    return /^\d{7,8}$/.test(cedula);
}

function marcarInputError(input, estadoError) {
    if (!input) return;
    input.classList.toggle('input-error', Boolean(estadoError));
}

function ocultarResultados() {
    const contenedorResultados = document.getElementById('estadoResultados');
    if (contenedorResultados) {
        contenedorResultados.hidden = true;
    }

    const cuerpoTabla = document.getElementById('estadoTablaBody');
    if (cuerpoTabla) {
        cuerpoTabla.innerHTML = '';
    }
}

function mostrarMensaje(texto, tipo = 'info') {
    const contenedor = document.getElementById('estadoMensaje');
    const tarjeta = contenedor?.querySelector('.estado-mensaje-card');
    const icono = tarjeta?.querySelector('i');
    const mensaje = document.getElementById('estadoMensajeTexto');

    if (!contenedor || !tarjeta || !icono || !mensaje) return;

    if (!texto) {
        contenedor.hidden = true;
        tarjeta.classList.remove('estado-mensaje--error');
        icono.className = 'fas fa-info-circle';
        mensaje.textContent = '';
        return;
    }

    contenedor.hidden = false;
    mensaje.textContent = texto;

    const esError = tipo === 'error';
    tarjeta.classList.toggle('estado-mensaje--error', esError);
    icono.className = esError ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
}

function actualizarTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor ?? '—';
    }
}

function capitalizarPalabras(texto) {
    return texto
        .split(' ')
        .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

function volverDashboard() {
    window.location.href = 'index.html';
}

// Variable global para almacenar los datos actuales
let datosActuales = null;
let anioActual = null;

async function generarPDF() {
    if (!datosActuales || !anioActual) {
        mostrarMensaje('No hay datos disponibles para generar el PDF.', 'error');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('jsPDF no está disponible.');
        mostrarMensaje('No se pudo generar el PDF. Librería no disponible.', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            unit: 'mm',
            format: 'letter'
        });

        const propietario = datosActuales.propietario;
        const vivienda = datosActuales.vivienda_actual;
        const pagos = vivienda.pagos || [];

        const margenIzq = 15;
        const margenDer = 15;
        const anchoPagina = doc.internal.pageSize.getWidth();
        const anchoUtil = anchoPagina - margenIzq - margenDer;
        let cursorY = 15;

        // Cargar y agregar logo
        const logoDataUrl = await cargarLogoBase64();
        if (logoDataUrl) {
            const logoAncho = 50;
            const logoAlto = 20;
            const posX = (anchoPagina - logoAncho) / 2;
            doc.addImage(logoDataUrl, 'PNG', posX, cursorY, logoAncho, logoAlto);
            cursorY += logoAlto + 8;
        }

        // Encabezado
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(30, 60, 114);
        doc.text('ESTADO DE CUENTA', anchoPagina / 2, cursorY, { align: 'center' });
        cursorY += 8;

        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(`Año ${anioActual}`, anchoPagina / 2, cursorY, { align: 'center' });
        cursorY += 12;

        // Información del propietario
        doc.setFillColor(248, 250, 252);
        doc.rect(margenIzq, cursorY, anchoUtil, 28, 'F');
        cursorY += 6;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('PROPIETARIO', margenIzq + 3, cursorY);
        cursorY += 6;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text(propietario.nombre_completo || '—', margenIzq + 3, cursorY);
        cursorY += 6;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Cédula: ${propietario.cedula || '—'}`, margenIzq + 3, cursorY);
        doc.text(`Teléfono: ${propietario.telefono || '—'}`, margenIzq + 70, cursorY);
        cursorY += 5;
        doc.text(`Correo: ${propietario.email || '—'}`, margenIzq + 3, cursorY);
        cursorY += 10;

        // Información de la vivienda
        doc.setFillColor(248, 250, 252);
        doc.rect(margenIzq, cursorY, anchoUtil, 28, 'F');
        cursorY += 6;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('VIVIENDA', margenIzq + 3, cursorY);
        cursorY += 6;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        doc.text(vivienda.nombre_inmueble || '—', margenIzq + 3, cursorY);
        cursorY += 6;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const tipoTexto = vivienda.tipo_vivienda ? `${vivienda.tipo_vivienda}${vivienda.tipo_entidad ? ` · ${vivienda.tipo_entidad}` : ''}` : '—';
        doc.text(`Tipo: ${tipoTexto}`, margenIzq + 3, cursorY);
        cursorY += 5;
        doc.text(`Ubicación: ${vivienda.ubicacion_info || '—'}`, margenIzq + 3, cursorY);
        cursorY += 5;

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text(`Deuda actual: ${formatearMonto(vivienda.monto_deuda_usd, 'USD')}`, margenIzq + 3, cursorY);
        cursorY += 12;

        // Tabla de pagos
        const columnas = [
            { header: 'Mes', dataKey: 'mes' },
            { header: 'Año', dataKey: 'anio' },
            { header: 'Estado', dataKey: 'estado' },
            { header: 'Método', dataKey: 'metodo' },
            { header: 'Monto', dataKey: 'monto' },
            { header: 'Tasa (Bs)', dataKey: 'tasa' },
            { header: 'Fecha', dataKey: 'fecha' }
        ];

        const indicePagos = new Map(pagos.map(p => [`${p.mes}-${p.año}`, p]));
        const filas = MESES.map((nombreMes, index) => {
            const mesNumero = index + 1;
            const clave = `${mesNumero}-${anioActual}`;
            const pago = indicePagos.get(clave) || null;

            const estado = normalizarEstado(pago?.estado);
            const metodo = pago?.metodo_pago || 'N/A';
            const monto = formatearMonto(pago?.monto, pago?.moneda);
            const tasa = pago?.tasa_bs ? pago.tasa_bs : '—';
            const fecha = formatearFecha(pago?.fecha_pago);

            return {
                mes: nombreMes,
                anio: anioActual,
                estado: estado,
                metodo: metodo,
                monto: monto,
                tasa: tasa,
                fecha: fecha
            };
        });

        doc.autoTable({
            startY: cursorY,
            head: [columnas.map(c => c.header)],
            body: filas.map(fila => columnas.map(c => fila[c.dataKey])),
            theme: 'grid',
            headStyles: {
                fillColor: [30, 60, 114],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [51, 65, 85],
                cellPadding: 2
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'left' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'center' }
            },
            margin: { left: margenIzq, right: margenDer },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 2) {
                    const estado = data.cell.raw;
                    if (estado === 'Pagado') {
                        data.cell.styles.textColor = [4, 120, 87];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (estado === 'Pago Parcial') {
                        data.cell.styles.textColor = [146, 64, 14];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        // Pie de página
        const totalPaginas = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('Helvetica', 'normal');
            const fechaGeneracion = new Date().toLocaleDateString('es-VE', {
                year: 'numeric',
                month: 'long',
                day: '2-digit'
            });
            doc.text(`Generado el ${fechaGeneracion}`, margenIzq, doc.internal.pageSize.getHeight() - 10);
            doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - margenDer, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        }

        // Guardar PDF
        const nombreArchivo = `estado_cuenta_${propietario.cedula}_${anioActual}.pdf`;
        doc.save(nombreArchivo);

        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('PDF generado exitosamente', 'success');
        }
    } catch (error) {
        console.error('Error generando PDF:', error);
        mostrarMensaje('Ocurrió un error al generar el PDF.', 'error');
    }
}

async function cargarLogoBase64() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            } catch (e) {
                console.error('Error convirtiendo logo a base64:', e);
                resolve(null);
            }
        };
        img.onerror = function() {
            console.warn('No se pudo cargar el logo');
            resolve(null);
        };
        img.src = '../assets/img/logo_arcorui.png';
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        manejarConsultaEstado,
        formatearMonto,
        formatearFecha,
        normalizarEstado,
        generarPDF
    };
}
