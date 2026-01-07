// Variables globales
let currentPaymentId = null
let currentAction = null
let payments = []
let allPayments = [] // Almacenar todos los pagos/ingresos
let filteredPayments = [] // Pagos filtrados
let currentPaymentType = 'mensuales' // Tipo de pago activo
let currentPage = 1
let itemsPerPage = 10
let totalPages = 1

// Usuario administrador autorizado
const ADMIN_USER = "admin@arcorui.com"

// Inicializar página
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Inicializando página de administración...")

    // Verificar autenticación de administrador
    if (!await checkAdminAuth()) {
        window.location.href = "/Arcorui/pages/auth/index.html"
        return
    }

    // Cargar pagos
    await loadPayments()

    // Agregar eventos de cierre de modales al hacer clic fuera
    setupModalCloseEvents()

    console.log("✅ Página de administración inicializada")
})

// Configurar eventos de cierre de modales
function setupModalCloseEvents() {
    const paymentDetailsModal = document.getElementById('paymentDetailsModal')
    const confirmModal = document.getElementById('confirmModal')
    const imageModal = document.getElementById('imageModal')

    // Cerrar con clic fuera del modal
    if (paymentDetailsModal) {
        paymentDetailsModal.addEventListener('click', (e) => {
            if (e.target === paymentDetailsModal) {
                console.log("🖱️ Clic fuera del modal de detalles, cerrando...")
                closePaymentDetails()
            }
        })
    }

    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                console.log("🖱️ Clic fuera del modal de confirmación, cerrando...")
                closeConfirmModal()
            }
        })
    }

    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                console.log("🖱️ Clic fuera del modal de imagen, cerrando...")
                closeImageModal()
            }
        })
    }

    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Cerrar el modal que esté visible
            if (paymentDetailsModal && paymentDetailsModal.classList.contains('show')) {
                console.log("⌨️ Tecla ESC presionada, cerrando modal de detalles...")
                closePaymentDetails()
            } else if (confirmModal && confirmModal.classList.contains('show')) {
                console.log("⌨️ Tecla ESC presionada, cerrando modal de confirmación...")
                closeConfirmModal()
            } else if (imageModal && imageModal.classList.contains('show')) {
                console.log("⌨️ Tecla ESC presionada, cerrando modal de imagen...")
                closeImageModal()
            }
        }
    })
}

// Verificar autenticación de administrador
async function checkAdminAuth() {
    try {
        const response = await fetch("../../api/check_admin_auth.php")
        const data = await response.json()

        if (data.success && data.isAdmin) {
            document.getElementById("adminName").textContent = data.adminName || "Administrador"
            return true
        } else {
            alert("Acceso denegado. Solo administradores autorizados pueden acceder a esta página.")
            return false
        }
    } catch (error) {
        console.error("Error verificando autenticación:", error)
        alert("Error de autenticación")
        return false
    }
}

// Cargar pagos según el tipo seleccionado
async function loadPayments() {
    try {
        let endpoint = ""
        let tipoTexto = ""

        switch (currentPaymentType) {
            case 'mensuales':
                endpoint = "../../api/get_payments_admin.php"
                tipoTexto = "pagos mensuales"
                break
            case 'articulos':
                endpoint = "../../api/get_ingresos_admin.php?categoria_id=5"
                tipoTexto = "ingresos de artículos"
                break
            case 'documentos':
                endpoint = "../../api/get_ingresos_admin.php?categoria_id=4"
                tipoTexto = "ingresos de documentos"
                break
            case 'extraordinarios':
                endpoint = "../../api/get_ingresos_admin.php?categoria_id=3"
                tipoTexto = "ingresos extraordinarios"
                break
        }

        console.log(`📥 Cargando ${tipoTexto} desde: ${endpoint}`)

        const response = await fetch(endpoint)
        const data = await response.json()

        console.log("🔍 JSON completo de get_payments_admin.php:", JSON.stringify(data, null, 2))

        if (data.success) {
            payments = data.payments || data.ingresos || []
            allPayments = payments
            filteredPayments = payments
            currentPage = 1
            updatePagination()
            displayCurrentPage()
            console.log(`✅ ${payments.length} ${tipoTexto} cargados`)
        } else {
            console.error(`Error cargando ${tipoTexto}:`, data.message)
            showEmptyState(`Error cargando ${tipoTexto}`)
        }
    } catch (error) {
        console.error("Error:", error)
        showEmptyState("Error de conexión")
    }
}

// Mostrar pagos
function displayPayments(paymentsToShow) {
    const paymentsList = document.getElementById("paymentsList")

    if (paymentsToShow.length === 0) {
        showEmptyState("No hay pagos para mostrar")
        return
    }

    paymentsList.innerHTML = ""

    paymentsToShow.forEach(payment => {
        const paymentItem = createPaymentItem(payment)
        paymentsList.appendChild(paymentItem)
    })
}

// Crear elemento de pago
function createPaymentItem(payment) {
    const div = document.createElement("div")

    // Determinar si es un pago mensual o un ingreso
    const isMonthlyPayment = payment.meses !== undefined
    const isIngreso = payment.ingreso_id !== undefined

    // Normalizar estado
    let estado = payment.estado || 'Pendiente'
    if (estado === 'pending') estado = 'Pendiente'
    if (estado === 'approved') estado = 'Confirmado'
    if (estado === 'rejected') estado = 'Rechazado'

    const statusClass = {
        'Pendiente': 'pending',
        'Confirmado': 'approved',
        'Rechazado': 'rejected',
        'pending': 'pending',
        'approved': 'approved',
        'rejected': 'rejected'
    }

    // ID del registro
    const recordId = payment.ingreso_id || payment.id

    div.className = `payment-item ${statusClass[estado] || 'pending'}`
    // Removido: div.onclick - solo se puede abrir con el botón "Ver Detalles"

    // Generar HTML para meses (solo pagos mensuales)
    let monthsHtml = ''
    if (isMonthlyPayment && payment.meses) {
        try {
            // Si meses ya es un array, usarlo directamente; si es string, parsearlo
            const months = Array.isArray(payment.meses) ? payment.meses : JSON.parse(payment.meses || '[]')
            monthsHtml = months.map(month =>
                `<span class="month-tag">${month.name}</span>`
            ).join('')
        } catch (e) {
            console.error('Error parsing meses:', e)
        }
    }

    // Generar HTML para item (ingresos)
    let itemHtml = ''
    if (isIngreso && payment.nombre_item) {
        itemHtml = `<span class="item-tag"><i class="fas fa-box"></i> ${payment.nombre_item}</span>`
    }

    // Determinar monto a mostrar
    let montoHtml = ''
    if (payment.total_linea_usd) {
        montoHtml = `$${payment.total_linea_usd} USD`
    } else if (payment.monto_dolares) {
        montoHtml = `$${payment.monto_dolares} USD`
    } else if (payment.monto_bs) {
        montoHtml = `${payment.monto_bs} Bs`
    }

    // Nombre del usuario/propietario
    const nombreUsuario = payment.nombre_propietario || payment.username || 'N/A'

    // Fecha
    const fecha = payment.fecha_pago || payment.fecha_ingreso || payment.creado_el || 'N/A'

    // Para pagos mensuales, usar pago_detalle_id; para ingresos, usar ingreso_id
    const displayId = isIngreso ? recordId : (payment.pago_detalle_id || recordId)
    const detailsId = displayId // Este es el ID que se enviará al hacer clic en "Ver Detalles"

    // Debug: verificar IDs
    if (!isIngreso) {
        console.log(`📋 Payment - recordId: ${recordId}, pago_detalle_id: ${payment.pago_detalle_id}, displayId: ${displayId}`)
    }

    div.innerHTML = `
        <div class="payment-header">
            <div class="payment-id">${isIngreso ? 'Ingreso' : 'Pago'} #${displayId}</div>
            <div class="payment-status ${statusClass[estado] || 'pending'}">
                ${estado}
            </div>
        </div>
        
        <div class="payment-info">
            <div class="payment-info-item">
                <div class="payment-info-label">${isIngreso ? 'Propietario' : 'Usuario'}</div>
                <div class="payment-info-value">${nombreUsuario}</div>
            </div>
            ${payment.nro_documento ? `
            <div class="payment-info-item">
                <div class="payment-info-label">Cédula</div>
                <div class="payment-info-value">${payment.nro_documento}</div>
            </div>
            ` : ''}
            <div class="payment-info-item">
                <div class="payment-info-label">Monto</div>
                <div class="payment-info-value">${montoHtml}</div>
            </div>
            <div class="payment-info-item">
                <div class="payment-info-label">Método</div>
                <div class="payment-info-value">${payment.metodo_pago || 'N/A'}</div>
            </div>
            <div class="payment-info-item">
                <div class="payment-info-label">Fecha</div>
                <div class="payment-info-value">${formatDate(fecha)}</div>
            </div>
        </div>
        
        ${monthsHtml || itemHtml ? `
        <div class="payment-months">
            ${monthsHtml}${itemHtml}
        </div>
        ` : ''}
        
        <div class="payment-actions" onclick="event.stopPropagation()">
            <button class="btn btn-info" onclick="console.log('🔍 Click en Ver Detalles para ID:', ${detailsId}); showPaymentDetails(${detailsId})">
                <i class="fas fa-eye"></i> Ver Detalles
            </button>
            ${(estado === 'Pendiente' || estado === 'pending') ? `
                <button class="btn btn-secondary" onclick="confirmAction('reject', ${detailsId})">
                    <i class="fas fa-times"></i> Rechazar
                </button>
                <button class="btn btn-primary" onclick="confirmAction('approve', ${detailsId})">
                    <i class="fas fa-check"></i> Aprobar
                </button>
            ` : ''}
            ${(estado === 'Rechazado' || estado === 'rejected') ? `
                <span class="text-muted">Rechazado</span>
            ` : ''}
        </div>
    `

    return div
}

// Mostrar detalles del pago o ingreso
async function showPaymentDetails(recordId) {
    console.log("🔍 Mostrando detalles del registro:", recordId, "Tipo:", currentPaymentType)

    try {
        let endpoint = ''

        // Determinar endpoint según el tipo actual
        if (currentPaymentType === 'mensuales') {
            endpoint = `../../api/get_payment_details.php?id=${recordId}`
            console.log(`📤 Enviando petición a get_payment_details.php con ID: ${recordId}`)
            console.log(`📤 URL completa: ${endpoint}`)
        } else {
            // Para ingresos, buscar en los datos ya cargados
            const ingreso = allPayments.find(p => p.ingreso_id === recordId)
            if (ingreso) {
                currentPaymentId = recordId
                displayPaymentDetails(ingreso)
                showModal("paymentDetailsModal")
                console.log("✅ Modal de detalles mostrado correctamente (ingreso)")
                return
            } else {
                throw new Error('Ingreso no encontrado en los datos cargados')
            }
        }

        // Cargar detalles de pago mensual
        const response = await fetch(endpoint)
        console.log("📡 Respuesta del servidor:", response.status)

        const data = await response.json()
        console.log("📊 Datos recibidos:", data)
        console.log("🔍 JSON completo de get_payment_details.php:", JSON.stringify(data, null, 2))

        if (data.success && data.payment) {
            console.log(`📥 Pago recibido - ID: ${data.payment.id}, Pago Detalle ID: ${data.payment.pago_detalle_id}`)
        }

        if (data.success) {
            currentPaymentId = recordId
            displayPaymentDetails(data.payment)
            showModal("paymentDetailsModal")
            console.log("✅ Modal de detalles mostrado correctamente")
        } else {
            console.error("❌ Error en respuesta:", data.message)
            showCustomAlert(
                "Error",
                "Error cargando detalles: " + data.message,
                'fa-exclamation-triangle',
                '#f8d7da',
                '#721c24',
                '#f5c6cb'
            )
        }
    } catch (error) {
        console.error("💥 Error en showPaymentDetails:", error)
        showCustomAlert(
            "Error de Conexión",
            "Error cargando detalles: " + error.message,
            'fa-exclamation-triangle',
            '#f8d7da',
            '#721c24',
            '#f5c6cb'
        )
    }
}

// Mostrar detalles en el modal
function displayPaymentDetails(payment) {
    console.log("📋 Mostrando detalles:", payment)

    const content = document.getElementById("paymentDetailsContent")
    if (!content) {
        console.error("❌ No se encontró el elemento paymentDetailsContent")
        return
    }

    // Determinar si es pago mensual o ingreso
    const isIngreso = payment.ingreso_id !== undefined
    const recordId = payment.ingreso_id || (payment.pago_detalle_id || payment.id)

    // Normalizar estado
    let estado = payment.estado || 'Pendiente'
    const statusClass = {
        'Pendiente': 'pending',
        'Confirmado': 'approved',
        'Rechazado': 'rejected',
        'pending': 'pending',
        'approved': 'approved',
        'rejected': 'rejected'
    }

    // Meses o Item
    let monthsOrItemHtml = ''
    if (isIngreso) {
        // Mostrar información del item
        if (payment.nombre_item) {
            monthsOrItemHtml = `
                <div class="detail-section">
                    <h4><i class="fas fa-box"></i> Información del Item</h4>
                    <div class="detail-items">
                        <div class="detail-item">
                            <span class="detail-label">Item:</span>
                            <span class="detail-value">${payment.nombre_item}</span>
                        </div>
                        ${payment.descripcion_item ? `
                        <div class="detail-item">
                            <span class="detail-label">Descripción:</span>
                            <span class="detail-value">${payment.descripcion_item}</span>
                        </div>
                        ` : ''}
                        ${payment.categoria_item ? `
                        <div class="detail-item">
                            <span class="detail-label">Categoría:</span>
                            <span class="detail-value">${payment.categoria_item}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Cantidad:</span>
                            <span class="detail-value">${payment.cantidad || 1}</span>
                        </div>
                        ${payment.precio_unitario_usd ? `
                        <div class="detail-item">
                            <span class="detail-label">Precio Unitario:</span>
                            <span class="detail-value">$${payment.precio_unitario_usd} USD</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `
        }
    } else {
        // Mostrar meses pagados (para pagos mensuales)
        try {
            // Si meses ya es un array, usarlo directamente; si es string, parsearlo
            const months = Array.isArray(payment.meses) ? payment.meses : JSON.parse(payment.meses || '[]')
            let monthsHtml = ''

            // Nombres de meses en español
            const monthNames = {
                1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
                5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
                9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
            }

            // Verificar si es deuda acumulada o periodo específico
            if (payment.is_deuda_acumulada || (months.length > 0 && months[0].id === 'deuda_acumulada')) {
                monthsHtml = '<span class="month-tag deuda-tag">Deuda Acumulada</span>'
            } else if (payment.periodo_mes && payment.periodo_anio) {
                // Construir el nombre del periodo desde mes y año
                const mesNombre = monthNames[payment.periodo_mes] || 'Mes ' + payment.periodo_mes
                monthsHtml = `<span class="month-tag">${mesNombre} ${payment.periodo_anio}</span>`
            } else if (months.length > 0) {
                // Fallback: mostrar meses del JSON
                monthsHtml = months.map(month =>
                    `<span class="month-tag">${month.name}</span>`
                ).join('')
            }

            monthsOrItemHtml = `
                <div class="detail-section">
                    <h4><i class="fas fa-calendar"></i> Meses Pagados</h4>
                    <div class="payment-months">
                        ${monthsHtml || '<span class="text-muted">No especificado</span>'}
                    </div>
                </div>
            `
        } catch (e) {
            console.error('Error parsing meses:', e)
        }
    }

    // Determinar monto
    const tasaValor = payment.tasa_bcv || payment.tasa || payment.tasa_valor || payment.tasa_bcv_valor
    let montoHtml = 'N/A'
    if (payment.total_linea_usd) {
        const montoUsd = parseFloat(payment.total_linea_usd)
        montoHtml = `$${montoUsd.toFixed(2)} USD`
        if (tasaValor) {
            const montoBs = montoUsd * parseFloat(tasaValor)
            montoHtml += ` <small>(${montoBs.toFixed(2)} Bs)</small>`
        }
    } else if (payment.monto_dolares) {
        montoHtml = `$${payment.monto_dolares} USD`
        if (payment.tasa_bcv || payment.tasa_bcv_valor) {
            const tasa = parseFloat(payment.tasa_bcv || payment.tasa_bcv_valor)
            const montoBs = parseFloat(payment.monto_dolares) * tasa
            montoHtml += ` <small>(${montoBs.toFixed(2)} Bs)</small>`
        }
    } else if (payment.monto_bs) {
        const montoBs = parseFloat(payment.monto_bs)
        montoHtml = `${montoBs.toFixed(2)} Bs`
        if (tasaValor) {
            const montoUsd = montoBs / parseFloat(tasaValor)
            montoHtml += ` <small>($${montoUsd.toFixed(2)} USD)</small>`
        }
    }

    const ownerName = (payment.propietario_nombre_completo
        || [payment.nombre_propietario, payment.apellido_propietario].filter(Boolean).join(' ')
        || payment.username
        || 'N/A').toString().trim();

    let ownerCedula = payment.propietario_cedula || payment.nro_documento || payment.cedula;
    if (ownerCedula) {
        ownerCedula = ownerCedula.toString();
        if (!ownerCedula.includes('-') && ownerCedula !== 'N/A') {
            ownerCedula = `V-${ownerCedula}`;
        }
    }

    const ownerEmail = payment.propietario_email || payment.gmail || payment.email || '';
    const ownerPhone = payment.propietario_telefono || payment.telefono || payment.banco_emisor?.telefono || '';

    const fechaPagoBanco = payment.fecha_pago_tasa || payment.fecha_pago || payment.banco_emisor?.fecha_pago;
    const fechaRegistroPago = payment.fecha_registro_pago || payment.fecha_ingreso || payment.creado_el;

    // Debug: verificar IDs en el modal
    console.log(`🔍 Modal - Record ID: ${recordId}, Pago Detalle ID: ${payment.pago_detalle_id}, isIngreso: ${isIngreso}`)
    console.log(`🔍 Payment object:`, payment)

    // Determinar el ID a mostrar en el badge
    let displayId
    if (isIngreso) {
        displayId = recordId
    } else {
        // Para pagos mensuales, usar pago_detalle_id
        displayId = payment.pago_detalle_id || payment.id || recordId
    }
    console.log(`🎯 ID que se mostrará en el badge: ${displayId}`)
    console.log(`🎯 Valores disponibles - pago_detalle_id: ${payment.pago_detalle_id}, payment.id: ${payment.id}, recordId: ${recordId}`)

    content.innerHTML = `
        <div class="payment-details-container">
            <div class="payment-header-info">
                <div class="payment-id-badge">
                    <i class="fas fa-receipt"></i>
                    <span>${isIngreso ? 'Ingreso' : 'Pago'} #${displayId}</span>
                </div>
                <div class="payment-status-badge ${statusClass[estado] || 'pending'}">
                    <i class="fas ${estado === 'Confirmado' || estado === 'approved' ? 'fa-check-circle' : estado === 'Rechazado' || estado === 'rejected' ? 'fa-times-circle' : 'fa-clock'}"></i>
                    <span>${estado}</span>
                </div>
            </div>

            <div class="payment-details-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-credit-card"></i> Información del ${isIngreso ? 'Ingreso' : 'Pago'}</h4>
                    <div class="detail-items">
                        <div class="detail-item">
                            <span class="detail-label">Monto:</span>
                            <span class="detail-value amount">${montoHtml}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Método:</span>
                            <span class="detail-value">${payment.metodo_pago || 'N/A'}</span>
                        </div>
                        ${payment.tasa_valor ? `
                        <div class="detail-item">
                            <span class="detail-label">Tasa de Cambio:</span>
                            <span class="detail-value">${parseFloat(payment.tasa_valor).toFixed(2)} Bs/$</span>
                        </div>
                        ` : ''}
                        ${payment.numero_referencia ? `
                        <div class="detail-item">
                            <span class="detail-label">Nro. Referencia:</span>
                            <span class="detail-value">${payment.numero_referencia}</span>
                        </div>
                        ` : ''}
                        ${payment.tasa_bcv ? `
                        <div class="detail-item">
                            <span class="detail-label">Tasa BCV:</span>
                            <span class="detail-value">${payment.tasa_bcv} Bs/$</span>
                        </div>
                        ` : ''}
                        ${fechaPagoBanco ? `
                        <div class="detail-item">
                            <span class="detail-label">Fecha del Pago:</span>
                            <span class="detail-value">${formatDate(fechaPagoBanco)}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Fecha de Registro:</span>
                            <span class="detail-value">${formatDate(fechaRegistroPago)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> Información del Propietario</h4>
                    <div class="detail-items">
                        <div class="detail-item">
                            <span class="detail-label">Nombre:</span>
                            <span class="detail-value">${ownerName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cédula:</span>
                            <span class="detail-value">${ownerCedula || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${ownerEmail || 'N/A'}</span>
                        </div>
                        ${ownerPhone ? `
                        <div class="detail-item">
                            <span class="detail-label">Teléfono:</span>
                            <span class="detail-value">${ownerPhone}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${payment.ubicacion ? `
                <div class="detail-section">
                    <h4><i class="fas fa-home"></i> Información de la Vivienda</h4>
                    <div class="detail-items">
                        <div class="detail-item">
                            <span class="detail-label">Ubicación:</span>
                            <span class="detail-value">${payment.ubicacion}</span>
                        </div>
                        ${payment.tipo_inmueble ? `
                        <div class="detail-item">
                            <span class="detail-label">Tipo:</span>
                            <span class="detail-value">${payment.tipo_inmueble}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
                
                ${monthsOrItemHtml}
                
                ${payment.comprobante_path || payment.comprobante ? (() => {
            let comprobantePath = payment.comprobante_path || payment.comprobante

            // Ajustar ruta según el origen
            if (comprobantePath.startsWith('uploads/')) {
                // Para ingresos: uploads/comprobantes/xxx.png -> ../../uploads/comprobantes/xxx.png
                comprobantePath = '../../' + comprobantePath
            } else if (comprobantePath.startsWith('../uploads/')) {
                // Para pagos mensuales: ../uploads/xxx.png -> ../../uploads/xxx.png
                comprobantePath = comprobantePath.replace('../uploads/', '../../uploads/')
            } else if (!comprobantePath.startsWith('../../uploads/') && !comprobantePath.startsWith('http')) {
                // Si no tiene prefijo correcto, agregar ruta relativa
                comprobantePath = '../../uploads/comprobantes/' + comprobantePath.split('/').pop()
            }

            const isPDF = comprobantePath.toLowerCase().endsWith('.pdf')

            if (isPDF) {
                return `
                            <div class="detail-section">
                                <h4><i class="fas fa-file-pdf"></i> Comprobante (PDF)</h4>
                                <div class="comprobante-container pdf-container">
                                    <div class="pdf-no-preview">
                                        <div class="pdf-icon-wrapper">
                                            <i class="fas fa-file-pdf"></i>
                                        </div>
                                        <p class="pdf-filename">Documento PDF</p>
                                        <p class="pdf-description">Haz clic en los botones para ver o descargar el comprobante</p>
                                        <div class="pdf-actions-center">
                                            <a href="${comprobantePath}" target="_blank" class="btn-pdf-action-large">
                                                <i class="fas fa-external-link-alt"></i>
                                                <span>Abrir PDF</span>
                                            </a>
                                            <a href="${comprobantePath}" download class="btn-pdf-action-large">
                                                <i class="fas fa-download"></i>
                                                <span>Descargar</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `
            } else {
                return `
                            <div class="detail-section">
                                <h4><i class="fas fa-image"></i> Comprobante</h4>
                                <div class="comprobante-container">
                                    <div class="image-preview-wrapper">
                                        <img src="${comprobantePath}" alt="Comprobante" class="payment-image" onclick="showImageModal('${comprobantePath}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                        <div style="display: none; text-align: center; color: #6c757d; padding: 20px;">
                                            <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.5;"></i>
                                            <p>No se pudo cargar la imagen del comprobante</p>
                                        </div>
                                    </div>
                                    <div class="image-actions">
                                        <a href="${comprobantePath}" target="_blank" class="btn-image-action" title="Abrir en nueva pestaña">
                                            <i class="fas fa-external-link-alt"></i>
                                            <span>Abrir</span>
                                        </a>
                                        <a href="${comprobantePath}" download class="btn-image-action" title="Descargar imagen">
                                            <i class="fas fa-download"></i>
                                            <span>Descargar</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `
            }
        })() : `
                    <div class="detail-section">
                        <h4><i class="fas fa-image"></i> Comprobante</h4>
                        <div class="comprobante-container">
                            <div style="text-align: center; color: #6c757d; padding: 20px;">
                                <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.5;"></i>
                                <p>No se encontró comprobante para este ${isIngreso ? 'ingreso' : 'pago'}</p>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `

    console.log("✅ HTML del modal generado correctamente")
    console.log("📊 Estado del pago:", payment.estado)
    console.log("🔘 Botones mostrados:", payment.estado === 'pending' ? 'Rechazar + Aprobar' : payment.estado === 'rejected' ? 'Solo Aprobar' : 'Solo mensaje de estado')
    console.log("📄 Contenido del modal:", content.innerHTML.substring(0, 200) + "...")
}

// Confirmar acción
function confirmAction(action, paymentId) {
    currentAction = action
    currentPaymentId = paymentId

    const modal = document.getElementById("confirmModal")
    const title = document.getElementById("confirmTitle")
    const message = document.getElementById("confirmMessage")
    const button = document.getElementById("confirmButton")

    if (action === 'approve') {
        title.textContent = "Aprobar Pago"
        message.textContent = "¿Estás seguro de que deseas aprobar este pago? Esta acción no se puede deshacer."
        button.innerHTML = '<i class="fas fa-check"></i> Aprobar'
        button.className = "btn btn-primary"
    } else if (action === 'reject') {
        title.textContent = "Rechazar Pago"
        message.textContent = "¿Estás seguro de que deseas rechazar este pago? El usuario podrá volver a pagarlo."
        button.innerHTML = '<i class="fas fa-times"></i> Rechazar'
        button.className = "btn btn-secondary"
    }

    showModal("confirmModal")
}

// Ejecutar acción (aprobar/rechazar)
async function executeAction() {
    if (!currentAction || !currentPaymentId) {
        console.error("Faltan datos: currentAction =", currentAction, "currentPaymentId =", currentPaymentId)
        return
    }

    console.log("🎯 Ejecutando acción:", currentAction, "para ID:", currentPaymentId, "Tipo:", currentPaymentType)

    try {
        let endpoint = ""
        let requestData = {}
        let tipoRegistro = ""

        // Determinar endpoint según el tipo de pago/ingreso
        if (currentPaymentType === 'mensuales') {
            // Para pagos mensuales
            endpoint = "../../api/update_payment_status.php"
            requestData = {
                paymentId: currentPaymentId,
                status: currentAction === 'approve' ? 'approved' : 'rejected'
            }
            tipoRegistro = "Pago"
        } else {
            // Para ingresos (artículos, documentos, extraordinarios)
            endpoint = "../../api/update_ingreso_status.php"
            requestData = {
                ingresoId: currentPaymentId,
                action: currentAction // 'approve' o 'reject'
            }
            tipoRegistro = "Ingreso"
        }

        console.log("📤 Enviando a:", endpoint)
        console.log("📦 Datos:", requestData)

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData)
        })

        console.log("📥 Respuesta recibida:", response.status)

        const data = await response.json()
        console.log("📊 Datos de respuesta:", data)

        if (data.success) {
            closeModal("confirmModal")
            closeModal("paymentDetailsModal")
            await loadPayments() // Recargar datos

            // Mostrar mensaje de éxito
            const actionText = currentAction === 'approve' ? 'aprobado' : 'rechazado'
            const iconClass = currentAction === 'approve' ? 'fa-check-circle' : 'fa-times-circle'
            const bgColor = currentAction === 'approve' ? '#d4edda' : '#f8d7da'
            const textColor = currentAction === 'approve' ? '#155724' : '#721c24'
            const borderColor = currentAction === 'approve' ? '#c3e6cb' : '#f5c6cb'

            showCustomAlert(
                `${tipoRegistro} ${actionText} exitosamente`,
                data.message || `El ${tipoRegistro.toLowerCase()} ha sido ${actionText} correctamente.`,
                iconClass,
                bgColor,
                textColor,
                borderColor
            )

            // Resetear variables
            currentAction = null
            currentPaymentId = null
        } else {
            showCustomAlert(
                "Error",
                data.message,
                'fa-exclamation-triangle',
                '#f8d7da',
                '#721c24',
                '#f5c6cb'
            )
        }
    } catch (error) {
        console.error("❌ Error:", error)
        showCustomAlert(
            "Error de Conexión",
            "Error procesando la acción: " + error.message,
            'fa-exclamation-triangle',
            '#f8d7da',
            '#721c24',
            '#f5c6cb'
        )
    }
}

// Mostrar estado vacío
function showEmptyState(message) {
    const paymentsList = document.getElementById("paymentsList")
    paymentsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>No hay pagos</h3>
            <p>${message}</p>
        </div>
    `
}

// Utilidades
function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'approved': 'Aprobado',
        'rejected': 'Rechazado'
    }
    return statusMap[status] || status
}

function showModal(modalId) {
    console.log("🔓 Abriendo modal:", modalId)
    const modal = document.getElementById(modalId)

    if (!modal) {
        console.error("❌ Modal no encontrado:", modalId)
        return
    }

    // Primero mostrar el modal sin animación
    modal.style.display = "flex"

    // Bloquear scroll del body
    document.body.style.overflow = "hidden"

    // Calcular si hay scrollbar para evitar saltos
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    console.log("🔒 Scroll bloqueado - overflow:", document.body.style.overflow)

    // Forzar reflow para que la transición funcione
    modal.offsetHeight

    // Agregar clase show para activar animación
    requestAnimationFrame(() => {
        modal.classList.add("show")
        console.log("✅ Modal mostrado con animación")
    })
}

function closeModal(modalId) {
    console.log("🔒 Cerrando modal:", modalId)
    const modal = document.getElementById(modalId)

    if (!modal) {
        console.error("❌ Modal no encontrado:", modalId)
        return
    }

    // Remover clase show para iniciar animación de cierre
    modal.classList.remove("show")

    // Restaurar scroll del body después de la animación
    setTimeout(() => {
        document.body.style.overflow = "auto"
        document.body.style.paddingRight = "0"
        console.log("✅ Scroll restaurado - overflow:", document.body.style.overflow)
    }, 100)

    // Ocultar modal completamente después de la animación (300ms)
    setTimeout(() => {
        modal.style.display = "none"
        console.log("✅ Modal ocultado completamente")
    }, 300)
}

function closePaymentDetails() {
    closeModal("paymentDetailsModal")
}

function closeConfirmModal() {
    closeModal("confirmModal")
    // Resetear variables solo si se cancela la acción
    currentAction = null
    currentPaymentId = null
}

/**
 * Cambiar tipo de pago/ingreso
 */
function switchPaymentType(type) {
    console.log(`🔄 Cambiando a tipo: ${type}`)
    currentPaymentType = type

    // Actualizar botones activos
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.classList.remove('active')
    })
    document.querySelector(`[data-type="${type}"]`).classList.add('active')

    // Recargar pagos según el tipo
    loadPayments()
}


// Logout
async function logout() {
    showLogoutConfirmation();
}

// Mostrar confirmación de logout personalizada
function showLogoutConfirmation() {
    // Crear el modal si no existe
    let logoutModal = document.getElementById('logoutConfirmationModal');
    if (!logoutModal) {
        logoutModal = document.createElement('div');
        logoutModal.id = 'logoutConfirmationModal';
        logoutModal.className = 'modal';
        logoutModal.innerHTML = `
            <div class="modal-content logout-confirmation">
                <div class="logout-header">
                    <button class="logout-close-btn" onclick="closeLogoutModal()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="logout-icon">
                        <i class="fas fa-sign-out-alt"></i>
                    </div>
                    <h3 class="logout-title">Cerrar Sesión</h3>
                </div>
                <div class="logout-body">
                    <p class="logout-message">¿Estás seguro de que deseas cerrar sesión?</p>
                    <p class="logout-subtitle">Se perderá el acceso a la administración de pagos.</p>
                </div>
                <div class="logout-footer">
                    <button class="btn btn-danger logout-confirm">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(logoutModal);

        // Agregar estilos CSS específicos para logout
        const style = document.createElement('style');
        style.textContent = `
            .logout-confirmation {
                max-width: 450px;
                border-radius: 20px;
                box-shadow: 0 15px 40px rgba(0,0,0,0.2);
                animation: slideInScale 0.3s ease-out;
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border: 2px solid #e9ecef;
            }
            
            .logout-header {
                text-align: center;
                padding: 30px 30px 20px;
                border-bottom: 1px solid #e9ecef;
                position: relative;
            }
            
            .logout-close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                color: #6c757d;
                font-size: 20px;
                font-weight: 300;
                cursor: pointer;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                border: 1px solid #e9ecef;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                z-index: 10;
            }
            
            .logout-close-btn:hover {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                border-color: #dc3545;
                transform: translateY(-2px) scale(1.05);
                box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
            }
            
            .logout-close-btn:active {
                transform: translateY(0) scale(1);
                box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
            }
            
            .logout-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 15px;
                box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
            }
            
            .logout-icon i {
                font-size: 24px;
                color: white;
            }
            
            .logout-title {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: #1e3c72;
            }
            
            .logout-body {
                padding: 20px 30px;
                text-align: center;
            }
            
            .logout-message {
                margin: 0 0 10px 0;
                font-size: 16px;
                font-weight: 600;
                color: #495057;
            }
            
            .logout-subtitle {
                margin: 0;
                font-size: 14px;
                color: #6c757d;
                line-height: 1.4;
            }
            
            .logout-footer {
                padding: 20px 30px 30px;
                display: flex;
                justify-content: center;
            }
            
            .logout-confirm {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .logout-confirm:hover {
                background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
            }
            
            @keyframes slideInScale {
                from {
                    opacity: 0;
                    transform: translateY(-30px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        // Agregar eventos
        logoutModal.querySelector('.logout-confirm').addEventListener('click', async () => {
            closeLogoutModal();
            await performLogout();
        });

        // Cerrar al hacer clic fuera del modal
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                closeLogoutModal();
            }
        });
    }

    // Mostrar el modal
    logoutModal.style.display = 'flex';
}

// Cerrar modal de logout
function closeLogoutModal() {
    const logoutModal = document.getElementById('logoutConfirmationModal');
    if (logoutModal) {
        console.log("🔒 Cerrando modal de logout");
        logoutModal.style.display = 'none';

        // Asegurar que el scroll se restaure
        document.body.style.overflow = "auto";
        document.body.style.paddingRight = "0";
        console.log("✅ Scroll restaurado al cerrar modal de logout");
    }
}

// Realizar logout
async function performLogout() {
    console.log("🚪 Iniciando proceso de logout...");
    try {
        stopAutoRefresh();
        console.log("📡 Enviando petición de logout...");

        // Marcar logout ANTES de llamar a la API
        localStorage.setItem('logout_flag', 'true');
        sessionStorage.clear();

        const response = await fetch('../../api/logout.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log("📡 Respuesta recibida:", response.status);
        const data = await response.json();
        console.log("📄 Datos de respuesta:", data);

        // Esperar un momento para asegurar que la sesión se destruyó
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirigir usando replace para evitar historial
        console.log("🔄 Cerrando sesión y redirigiendo...");
        window.location.replace('../auth/index.html');

    } catch (error) {
        console.error('💥 Error cerrando sesión:', error);
        // Aun con error, marcar logout y redirigir
        localStorage.setItem('logout_flag', 'true');
        sessionStorage.clear();
        window.location.replace('../auth/index.html');
    }
}

// Navegación a página de pagos
function goToPayments() {
    console.log("🔍 Navegando a página de pagos...");
    window.location.href = '../payments/pagos.html';
}

// Navegación a gestión de usuarios
function goToUsers() {
    console.log("🔍 Navegando a gestión de usuarios...");
    window.location.href = 'admin_usuarios.html';
}

// Mostrar modal de imagen del comprobante
function showImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');

    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.style.display = 'flex';
    }
}

// Cerrar modal de imagen
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Rechazar pago desde modal de detalles
function rejectPayment() {
    console.log("🚫 Función rejectPayment llamada")
    if (!currentPaymentId) {
        console.error("No hay ID de pago seleccionado");
        return;
    }

    console.log("🚫 Estableciendo currentAction = 'reject' para pago:", currentPaymentId)
    confirmAction('reject', currentPaymentId);
    // No cerrar el modal aquí, se cerrará automáticamente al ejecutar la acción
}

// Aprobar pago desde modal de detalles
function approvePayment() {
    console.log("✅ Función approvePayment llamada")
    if (!currentPaymentId) {
        console.error("No hay ID de pago seleccionado");
        return;
    }

    console.log("✅ Estableciendo currentAction = 'approve' para pago:", currentPaymentId)
    confirmAction('approve', currentPaymentId);
    // No cerrar el modal aquí, se cerrará automáticamente al ejecutar la acción
}

// Cerrar modal de detalles
function closePaymentDetails() {
    console.log("🔒 Cerrando modal de detalles de pago");
    closeModal("paymentDetailsModal");

    // Asegurar que el scroll se restaure completamente
    setTimeout(() => {
        document.body.style.overflow = "auto";
        document.body.style.paddingRight = "0";
        console.log("✅ Scroll restaurado manualmente");
    }, 350); // Un poco después del timeout del closeModal
}

// Mostrar alerta personalizada con mejor diseño
function showCustomAlert(title, message, iconClass, bgColor, textColor, borderColor) {
    // Crear el modal si no existe
    let alertModal = document.getElementById('customAlertModal');
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.id = 'customAlertModal';
        alertModal.className = 'modal';
        alertModal.innerHTML = `
            <div class="modal-content custom-alert">
                <div class="alert-header">
                    <i class="fas alert-icon"></i>
                    <h3 class="alert-title"></h3>
                </div>
                <div class="alert-body">
                    <p class="alert-message"></p>
                </div>
                <div class="alert-footer">
                    <button class="btn btn-primary alert-ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(alertModal);

        // Agregar estilos CSS
        const style = document.createElement('style');
        style.textContent = `
            .custom-alert {
                max-width: 400px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                animation: slideInDown 0.3s ease-out;
            }
            
            .alert-header {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px 25px 10px;
            }
            
            .alert-icon {
                font-size: 24px;
                width: 30px;
                text-align: center;
            }
            
            .alert-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .alert-body {
                padding: 10px 25px 20px;
            }
            
            .alert-message {
                margin: 0;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .alert-footer {
                padding: 15px 25px 25px;
                text-align: center;
            }
            
            .alert-ok {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                border: none;
                padding: 10px 25px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .alert-ok:hover {
                background: linear-gradient(135deg, #2a5298 0%, #3b82f6 100%);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(30, 60, 114, 0.3);
            }
            
            @keyframes slideInDown {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        // Agregar evento de cierre
        alertModal.querySelector('.alert-ok').addEventListener('click', () => {
            alertModal.style.display = 'none';
        });

        // Cerrar al hacer clic fuera del modal
        alertModal.addEventListener('click', (e) => {
            if (e.target === alertModal) {
                alertModal.style.display = 'none';
            }
        });
    }

    // Configurar el contenido
    alertModal.querySelector('.alert-icon').className = `fas ${iconClass}`;
    alertModal.querySelector('.alert-title').textContent = title;
    alertModal.querySelector('.alert-message').textContent = message;

    // Configurar colores
    const alertContent = alertModal.querySelector('.custom-alert');
    alertContent.style.backgroundColor = bgColor;
    alertContent.style.color = textColor;
    alertContent.style.border = `2px solid ${borderColor}`;

    // Mostrar el modal
    alertModal.style.display = 'flex';
}

/**
 * Funciones de Paginación
 */
function updatePagination() {
    totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
    const paginationContainer = document.getElementById('paginationContainer')

    if (filteredPayments.length > itemsPerPage) {
        paginationContainer.style.display = 'block'
        renderPaginationControls()
    } else {
        paginationContainer.style.display = 'none'
    }
}

function displayCurrentPage() {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paymentsToShow = filteredPayments.slice(startIndex, endIndex)

    displayPayments(paymentsToShow)
    updatePaginationInfo()
}

function renderPaginationControls() {
    const paginationPages = document.getElementById('paginationPages')
    const prevBtn = document.getElementById('prevPageBtn')
    const nextBtn = document.getElementById('nextPageBtn')

    // Actualizar botones prev/next
    prevBtn.disabled = currentPage === 1
    nextBtn.disabled = currentPage === totalPages

    // Renderizar números de página
    paginationPages.innerHTML = ''

    // Lógica para mostrar páginas (máximo 5 números)
    let startPage = Math.max(1, currentPage - 2)
    let endPage = Math.min(totalPages, startPage + 4)

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4)
    }

    // Primera página
    if (startPage > 1) {
        paginationPages.appendChild(createPageNumber(1))
        if (startPage > 2) {
            const dots = document.createElement('span')
            dots.textContent = '...'
            dots.style.padding = '0 8px'
            paginationPages.appendChild(dots)
        }
    }

    // Páginas intermedias
    for (let i = startPage; i <= endPage; i++) {
        paginationPages.appendChild(createPageNumber(i))
    }

    // Última página
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span')
            dots.textContent = '...'
            dots.style.padding = '0 8px'
            paginationPages.appendChild(dots)
        }
        paginationPages.appendChild(createPageNumber(totalPages))
    }
}

function createPageNumber(pageNum) {
    const pageBtn = document.createElement('button')
    pageBtn.className = 'page-number'
    pageBtn.textContent = pageNum
    if (pageNum === currentPage) {
        pageBtn.classList.add('active')
    }
    pageBtn.onclick = () => goToPage(pageNum)
    return pageBtn
}

function goToPage(pageNum) {
    currentPage = pageNum
    displayCurrentPage()
    renderPaginationControls()
}

function changePage(direction) {
    const newPage = currentPage + direction
    if (newPage >= 1 && newPage <= totalPages) {
        goToPage(newPage)
    }
}

function updatePaginationInfo() {
    const paginationInfo = document.getElementById('paginationInfo')
    const startIndex = (currentPage - 1) * itemsPerPage + 1
    const endIndex = Math.min(currentPage * itemsPerPage, filteredPayments.length)

    paginationInfo.textContent = `Mostrando ${startIndex}-${endIndex} de ${filteredPayments.length} registros`
}

/**
 * Función de filtrado mejorada - Filtra por cédula, estado y fecha
 */
function filterPayments() {
    const searchCedula = document.getElementById('searchCedula')?.value.toLowerCase().trim() || ''
    const statusFilter = document.getElementById('statusFilter')?.value || 'all'
    const dateFilter = document.getElementById('dateFilter')?.value || ''

    console.log('🔍 Aplicando filtros:', { searchCedula, statusFilter, dateFilter, total: allPayments.length })

    filteredPayments = allPayments.filter(payment => {
        // Filtro por cédula (busca en nro_documento)
        let cedulaMatch = true
        if (searchCedula) {
            const cedula = (payment.nro_documento || payment.cedula || '').toString().toLowerCase()
            cedulaMatch = cedula.includes(searchCedula)
        }

        // Filtro por estado (normalizar estados)
        let statusMatch = true
        if (statusFilter !== 'all') {
            const estado = payment.estado || ''
            // Normalizar estados para comparación
            const normalizedEstado = estado === 'pending' ? 'Pendiente' :
                estado === 'approved' ? 'Confirmado' :
                    estado === 'rejected' ? 'Rechazado' : estado
            statusMatch = normalizedEstado === statusFilter || estado === statusFilter
        }

        // Filtro por fecha
        let dateMatch = true
        if (dateFilter) {
            const paymentDate = payment.fecha_pago || payment.fecha_ingreso || payment.creado_el
            if (paymentDate) {
                const date = new Date(paymentDate).toISOString().split('T')[0]
                dateMatch = date === dateFilter
            } else {
                dateMatch = false
            }
        }

        return cedulaMatch && statusMatch && dateMatch
    })

    console.log(`✅ Filtrado completado: ${filteredPayments.length} de ${allPayments.length} registros`)

    // Resetear a la primera página y actualizar vista
    currentPage = 1
    updatePagination()
    displayCurrentPage()
}

/**
 * Refrescar pagos - Recarga los datos y limpia filtros
 */
function refreshPayments() {
    console.log('🔄 Refrescando pagos...')

    // Limpiar filtros
    const searchCedula = document.getElementById('searchCedula')
    const statusFilter = document.getElementById('statusFilter')
    const dateFilter = document.getElementById('dateFilter')

    if (searchCedula) searchCedula.value = ''
    if (statusFilter) statusFilter.value = 'all'
    if (dateFilter) dateFilter.value = ''

    // Recargar pagos
    loadPayments()
}