// Variables globales
let solicitudData = null;
let itemData = null;
let metodosPago = [];
let bancoReceptor = null;
let bancosEmisores = [];
let tasaActual = null;
let tasaActualId = null; // ID de la tasa para enviar al backend
let inmuebleInfo = null;
let propietarioInfo = null;
let esArticuloTienda = false; // Flag para identificar si es artículo de tienda

// Mapeo de métodos de pago por grupo
const METODOS_GRUPO1 = ['Pago movil', 'Transferencia']; // Requieren banco
const METODOS_GRUPO2 = ['Efectivo divisa', 'Efectivo bolivares', 'Punto de venta debito', 'Punto de venta credito'];
const METODOS_EXCLUIDOS = ['Donaciones'];
const METODO_EFECTIVO_DIVISA = 'Efectivo divisa';

// Obtener parámetros de la URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const normalizeParam = (value) => {
        if (value === null || value === undefined) return null;
        const trimmed = value.toString().trim().toLowerCase();
        return (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') ? null : value;
    };
    return {
        carta_id: normalizeParam(params.get('carta_id')),
        item_id: normalizeParam(params.get('item_id')),
        inmueble_id: normalizeParam(params.get('inmueble_id')),
        propietario_id: normalizeParam(params.get('propietario_id')),
        inmueble_info: normalizeParam(params.get('inmueble_info')),
        propietario_info: normalizeParam(params.get('propietario_info'))
    };
}

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', async function() {
    const params = getUrlParams();
    
    // Validar que al menos tenga item_id
    if (!params.item_id) {
        await modalConfirm.alert({
            title: 'Error de Parámetros',
            message: 'Los parámetros de pago son inválidos. Serás redirigido al dashboard.',
            icon: 'error',
            okText: 'Entendido'
        });
        window.location.href = '../../pages/dashboard/dashboard.html';
        return;
    }

    // Determinar si es artículo de tienda o gasto extraordinario (no tiene carta_id)
    esArticuloTienda = !params.carta_id;
    
    // El título se actualizará después de cargar el item para determinar el tipo exacto
    // Por ahora, usar título genérico
    const titulo = document.querySelector('.pago-header h1');
    if (titulo && !esArticuloTienda) {
        titulo.innerHTML = '<i class="fas fa-credit-card"></i> Pago de Servicio';
        document.title = 'Pago de Servicio - Arcorui';
    }

    // Cargar datos en paralelo
    const promises = [
        loadItemData(params.item_id),
        loadMetodosPago(),
        loadBancoReceptor(),
        loadBancosEmisores()
    ];
    
    // Solo cargar solicitud si es un servicio (tiene carta_id)
    if (!esArticuloTienda) {
        promises.push(loadSolicitudData(params.carta_id));
    } else {
        // Para artículos de tienda, cargar info de inmueble/propietario directamente
        loadInmueblePropietarioInfo();
    }
    
    await Promise.all(promises);

    // Configurar fechas (hoy como máximo)
    const today = new Date().toISOString().split('T')[0];
    ['fechaPagoG1', 'fechaPagoG2'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.setAttribute('max', today);
            input.value = today;
        }
    });

    // Configurar eventos
    setupEventListeners();
});

// Cargar datos del item
async function loadItemData(itemId) {
    try {
        // Intentar primero con artículos de tienda (categoría 1)
        let response = await fetch(`../../api/get_articulos_tienda.php`);
        let data = await response.json();
        
        if (data.success && data.items) {
            itemData = data.items.find(item => item.item_id == itemId);
        }
        
        // Si no se encontró, buscar en gastos extraordinarios (categoría 3)
        if (!itemData) {
            response = await fetch(`../../api/get_gastos_extraordinarios.php`);
            data = await response.json();
            
            if (data.success && data.items) {
                itemData = data.items.find(item => item.item_id == itemId);
            }
        }
        
        // Si no se encontró, buscar en servicios (cartas - categoría 2)
        if (!itemData) {
            response = await fetch(`../../api/get_carta_items.php`);
            data = await response.json();
            
            if (data.success && data.items) {
                itemData = data.items.find(item => item.item_id == itemId);
            }
        }
        
        if (itemData) {
            document.getElementById('itemName').textContent = itemData.nombre_item;
            document.getElementById('itemPrice').textContent = `$${parseFloat(itemData.precio).toFixed(2)}`;
            document.getElementById('itemDescription').textContent = itemData.descripcion || 'Sin descripción';
            
            // Actualizar título según la categoría
            const titulo = document.querySelector('.pago-header h1');
            if (titulo && esArticuloTienda) {
                // Determinar si es artículo de tienda o gasto extraordinario
                const esGastoExtraordinario = itemData.nombre_categoria && 
                    itemData.nombre_categoria.toLowerCase().includes('extraordinario');
                
                if (esGastoExtraordinario) {
                    titulo.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Pago de Gasto Extraordinario';
                    document.title = 'Pago de Gasto Extraordinario - Arcorui';
                } else {
                    titulo.innerHTML = '<i class="fas fa-shopping-cart"></i> Pago de Artículo';
                    document.title = 'Pago de Artículo - Arcorui';
                }
            }
            
            // Si es artículo de tienda y tiene stock, mostrarlo
            if (esArticuloTienda && itemData.stock) {
                const stockInfo = document.createElement('div');
                stockInfo.className = 'detail-item';
                stockInfo.innerHTML = `
                    <i class="fas fa-warehouse"></i>
                    <span>Stock disponible: ${itemData.stock}</span>
                `;
                document.querySelector('.item-details').appendChild(stockInfo);
            }
        } else {
            await modalConfirm.alert({
                title: 'Artículo No Encontrado',
                message: 'No se pudo encontrar el artículo solicitado.',
                icon: 'error',
                okText: 'Entendido'
            });
        }
    } catch (error) {
        console.error('Error cargando item:', error);
        showAlert('Error al cargar información del artículo', 'error');
    }
}

// Cargar datos de la solicitud (solo para servicios)
async function loadSolicitudData(cartaId) {
    try {
        const params = getUrlParams();
        const response = await fetch(`../../api/get_solicitudes_cartas.php?inmueble_id=${params.inmueble_id}`);
        const data = await response.json();
        
        if (data.success && data.solicitudes) {
            solicitudData = data.solicitudes.find(sol => sol.carta_id == cartaId);
            
            if (solicitudData) {
                const fecha = new Date(solicitudData.fecha).toLocaleDateString('es-VE');
                document.getElementById('fechaSolicitud').textContent = fecha;
            }
        }
        
        loadInmueblePropietarioInfo();
    } catch (error) {
        console.error('Error cargando solicitud:', error);
    }
}

// Cargar información de inmueble y propietario desde URL
function loadInmueblePropietarioInfo() {
    const urlParams = getUrlParams();
    
    if (urlParams.inmueble_info) {
        try {
            inmuebleInfo = JSON.parse(decodeURIComponent(urlParams.inmueble_info));
            displayInmuebleInfo();
        } catch (e) {
            console.error('Error parseando inmueble_info:', e);
        }
    }
    
    if (urlParams.propietario_info) {
        try {
            propietarioInfo = JSON.parse(decodeURIComponent(urlParams.propietario_info));
            displayPropietarioInfo();
        } catch (e) {
            console.error('Error parseando propietario_info:', e);
        }
    }
    
    // Para artículos de tienda, mostrar fecha actual
    if (esArticuloTienda) {
        const fecha = new Date().toLocaleDateString('es-VE');
        document.getElementById('fechaSolicitud').textContent = fecha;
    }
}

// Mostrar información del inmueble (dinámica según tipo)
function displayInmuebleInfo() {
    if (!inmuebleInfo) {
        console.warn('No hay inmuebleInfo disponible');
        return;
    }
    
    console.log('Mostrando inmuebleInfo:', inmuebleInfo);
    
    let ubicacion = '';
    const tipo = inmuebleInfo.tipo ? inmuebleInfo.tipo.toLowerCase() : '';
    
    // Construir ubicación según el tipo de inmueble
    if (tipo === 'apartamento') {
        ubicacion = `${inmuebleInfo.nombre_edificio || 'N/A'} - Piso ${inmuebleInfo.piso || 'N/A'} - Apt ${inmuebleInfo.numero_apartamento || 'N/A'}`;
    } else if (tipo === 'quinta') {
        ubicacion = inmuebleInfo.nombre_quinta || inmuebleInfo.nombre_casa || 'N/A';
    } else if (tipo === 'casa') {
        ubicacion = inmuebleInfo.nombre_casa || 'N/A';
    } else if (tipo === 'establecimiento') {
        ubicacion = inmuebleInfo.nombre_establecimiento || 'N/A';
    } else if (tipo === 'centro comercial') {
        ubicacion = `${inmuebleInfo.nombre_local || 'N/A'} - ${inmuebleInfo.nombre_centro || 'N/A'}`;
    } else {
        ubicacion = 'Información de inmueble no disponible';
    }
    
    const inmuebleElement = document.getElementById('inmuebleInfo');
    if (inmuebleElement) {
        inmuebleElement.textContent = ubicacion;
    } else {
        console.error('Elemento inmuebleInfo no encontrado en el DOM');
    }
}

// Mostrar información del propietario
function displayPropietarioInfo() {
    if (!propietarioInfo) {
        console.warn('No hay propietarioInfo disponible');
        return;
    }
    
    console.log('Mostrando propietarioInfo:', propietarioInfo);
    
    const propietarioElement = document.getElementById('propietarioInfo');
    if (propietarioElement) {
        propietarioElement.textContent = propietarioInfo.nombre_propietario || 'No disponible';
    } else {
        console.error('Elemento propietarioInfo no encontrado en el DOM');
    }
}

// Cargar métodos de pago (excluyendo donaciones)
async function loadMetodosPago() {
    try {
        const response = await fetch('../../api/get_metodos_pago.php');
        const data = await response.json();
        
        if (data.success && data.metodos) {
            // Filtrar métodos excluidos
            metodosPago = data.metodos.filter(metodo => 
                !METODOS_EXCLUIDOS.some(excluido => 
                    metodo.descripcion.toLowerCase().includes(excluido.toLowerCase())
                )
            );
            
            const select = document.getElementById('metodoPago');
            select.innerHTML = '<option value="">Seleccione un método</option>';
            
            metodosPago.forEach(metodo => {
                const option = document.createElement('option');
                option.value = metodo.metodo_id;
                option.textContent = metodo.descripcion;
                option.dataset.descripcion = metodo.descripcion;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando métodos de pago:', error);
        showAlert('Error al cargar métodos de pago', 'error');
    }
}

// Cargar banco receptor
async function loadBancoReceptor() {
    try {
        const response = await fetch('../../api/get_banco_receptor.php');
        const data = await response.json();
        
        if (data.success && data.banco_receptor) {
            bancoReceptor = data.banco_receptor;
            displayBancoReceptor();
        }
    } catch (error) {
        console.error('Error cargando banco receptor:', error);
    }
}

// Mostrar información del banco receptor
function displayBancoReceptor() {
    if (!bancoReceptor) return;
    
    const container = document.getElementById('bancoReceptorDetails');
    container.innerHTML = `
        <div class="banco-detail">
            <div class="banco-detail-label">Banco</div>
            <div class="banco-detail-value">${bancoReceptor.banco_nombre}</div>
        </div>
        <div class="banco-detail">
            <div class="banco-detail-label">Código</div>
            <div class="banco-detail-value">${bancoReceptor.banco_codigo}</div>
        </div>
        <div class="banco-detail">
            <div class="banco-detail-label">Teléfono</div>
            <div class="banco-detail-value">${bancoReceptor.telefono}</div>
        </div>
        <div class="banco-detail">
            <div class="banco-detail-label">Documento</div>
            <div class="banco-detail-value">${bancoReceptor.tipo_documento}-${bancoReceptor.nro_documento}</div>
        </div>
        <div class="banco-detail">
            <div class="banco-detail-label">Nro. Cuenta</div>
            <div class="banco-detail-value">${bancoReceptor.nro_cuenta}</div>
        </div>
    `;
}

// Cargar bancos emisores
async function loadBancosEmisores() {
    try {
        const response = await fetch('../../api/get_bancos.php');
        const data = await response.json();
        
        if (data.success && data.bancos) {
            bancosEmisores = data.bancos;
            
            const select = document.getElementById('bancoEmisorG1');
            select.innerHTML = '<option value="">Seleccione un banco</option>';
            
            bancosEmisores.forEach(banco => {
                const option = document.createElement('option');
                option.value = banco.banco_id;
                option.textContent = `${banco.codigo_banco} - ${banco.nombre_banco}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando bancos emisores:', error);
    }
}

// Obtener tasa del día
async function getTasaBCV(fecha) {
    try {
        const response = await fetch(`../../api/get_tasa.php?fecha=${fecha}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            return data.data; // Devolver objeto completo con tasa_id y tasa
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo tasa:', error);
        return null;
    }
}

// Calcular monto en bolívares o dólares
async function calcularMontoBs(fecha, grupoId = 'G1', metodoPago = '') {
    if (!itemData) return;
    
    // Obtener tasa del día para todos los métodos (necesaria para BD)
    const tasaData = await getTasaBCV(fecha);
    if (tasaData) {
        tasaActual = tasaData.tasa; // Guardar solo el valor de la tasa
        tasaActualId = tasaData.tasa_id; // Guardar el ID de la tasa
    }
    
    // Si es efectivo divisa, mostrar monto en USD (no mostrar tasa)
    if (metodoPago && metodoPago.toLowerCase().includes('efectivo divisa')) {
        const montoField = document.getElementById(`montoBs${grupoId}`);
        if (montoField) {
            montoField.value = `$${parseFloat(itemData.precio).toFixed(2)} USD`;
        }
        // Limpiar info de tasa (no mostrar)
        const tasaInfoElements = document.querySelectorAll('.tasa-info');
        tasaInfoElements.forEach(el => el.style.display = 'none');
        return;
    }
    
    // Si es efectivo bolivares, mostrar monto en Bs pero no mostrar tasa
    if (metodoPago && metodoPago.toLowerCase().includes('efectivo bolivares')) {
        if (tasaData) {
            const montoBs = parseFloat(itemData.precio) * parseFloat(tasaData.tasa);
            const montoField = document.getElementById(`montoBs${grupoId}`);
            if (montoField) {
                montoField.value = `Bs. ${montoBs.toFixed(2)}`;
            }
        }
        // No mostrar info de tasa
        const tasaInfoElements = document.querySelectorAll('.tasa-info');
        tasaInfoElements.forEach(el => el.style.display = 'none');
        return;
    }
    
    // Para otros métodos (pago móvil, transferencia, punto de venta), mostrar monto y tasa
    if (tasaData) {
        const montoBs = parseFloat(itemData.precio) * parseFloat(tasaData.tasa);
        
        // Actualizar campo de monto según el grupo
        const montoField = document.getElementById(`montoBs${grupoId}`);
        if (montoField) {
            montoField.value = `Bs. ${montoBs.toFixed(2)}`;
        }
        
        // Mostrar tasa utilizada
        displayTasaInfo(tasaData, fecha);
    }
}

// Mostrar información de la tasa
function displayTasaInfo(tasaData, fecha) {
    const tasaInfoElements = document.querySelectorAll('.tasa-info');
    tasaInfoElements.forEach(el => {
        el.innerHTML = `<i class="fas fa-info-circle"></i> Tasa BCV: <strong>Bs. ${parseFloat(tasaData.tasa || tasaData).toFixed(2)}</strong> (${fecha})`;
        el.style.display = 'block';
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Cambio de método de pago
    document.getElementById('metodoPago').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const descripcion = selectedOption.dataset.descripcion || '';
        
        // Ocultar todos los formularios
        document.getElementById('formGrupo1').style.display = 'none';
        document.getElementById('formGrupo2').style.display = 'none';
        document.getElementById('comprobanteSection').style.display = 'none';
        
        // Limpiar required de todos los campos
        clearAllRequired();
        
        if (!this.value) return;
        
        // Determinar qué formulario mostrar
        const esGrupo1 = METODOS_GRUPO1.some(metodo => 
            descripcion.toLowerCase().includes(metodo.toLowerCase())
        );
        
        const esGrupo2 = METODOS_GRUPO2.some(metodo => 
            descripcion.toLowerCase().includes(metodo.toLowerCase())
        );
        
        if (esGrupo1) {
            document.getElementById('formGrupo1').style.display = 'block';
            document.getElementById('comprobanteSection').style.display = 'block';
            setRequiredGrupo1(true);
            
            // Calcular monto en Bs
            const fecha = document.getElementById('fechaPagoG1').value;
            if (fecha) calcularMontoBs(fecha, 'G1', descripcion);
        } else if (esGrupo2) {
            document.getElementById('formGrupo2').style.display = 'block';
            document.getElementById('comprobanteSection').style.display = 'block';
            setRequiredGrupo2(true);
            
            // Calcular monto en Bs o USD para Grupo 2
            const fecha = document.getElementById('fechaPagoG2').value;
            if (fecha) calcularMontoBs(fecha, 'G2', descripcion);
        }
    });
    
    // Cambio de fecha en Grupo 1 (recalcular monto)
    document.getElementById('fechaPagoG1').addEventListener('change', function() {
        if (this.value) {
            const metodoPago = document.getElementById('metodoPago');
            const descripcion = metodoPago.options[metodoPago.selectedIndex].dataset.descripcion || '';
            calcularMontoBs(this.value, 'G1', descripcion);
        }
    });
    
    // Cambio de fecha en Grupo 2 (recalcular monto)
    document.getElementById('fechaPagoG2').addEventListener('change', function() {
        if (this.value) {
            const metodoPago = document.getElementById('metodoPago');
            const descripcion = metodoPago.options[metodoPago.selectedIndex].dataset.descripcion || '';
            calcularMontoBs(this.value, 'G2', descripcion);
        }
    });
    
    // Validación de teléfono (solo números, 11 dígitos)
    document.getElementById('telefonoG1').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').substring(0, 11);
    });
    
    // Validación de referencia (solo números, 6 dígitos)
    document.getElementById('referenciaG1').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').substring(0, 6);
    });
    
    // Upload de comprobante
    const uploadArea = document.getElementById('comprobanteUpload');
    const fileInput = document.getElementById('comprobanteFile');
    
    uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-file-btn')) {
            fileInput.click();
        }
    });
    
    fileInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Validar tipo de archivo
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                await modalConfirm.alert({
                    title: 'Formato No Válido',
                    message: 'Solo se permiten archivos en formato JPG, PNG o PDF.',
                    icon: 'error',
                    okText: 'Entendido'
                });
                this.value = '';
                return;
            }
            
            // Validar tamaño (5MB)
            if (file.size > 5 * 1024 * 1024) {
                await modalConfirm.alert({
                    title: 'Archivo Muy Grande',
                    message: 'El archivo no debe superar los 5MB de tamaño.',
                    icon: 'error',
                    okText: 'Entendido'
                });
                this.value = '';
                return;
            }
            
            uploadArea.classList.add('has-file');
            displayFilePreview(file);
        }
    });
    
    // Submit del formulario
    document.getElementById('paymentForm').addEventListener('submit', handleSubmit);
}

// Mostrar preview del archivo
function displayFilePreview(file) {
    const fileInfo = document.getElementById('fileName');
    const uploadArea = document.getElementById('comprobanteUpload');
    
    // Crear preview
    let preview = '';
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview = `
                <div class="file-preview">
                    <img src="${e.target.result}" alt="Preview" style="max-width: 100px; max-height: 100px; border-radius: 8px;">
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${(file.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <button type="button" class="remove-file-btn" onclick="removeFile()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            fileInfo.innerHTML = preview;
        };
        reader.readAsDataURL(file);
    } else {
        preview = `
            <div class="file-preview">
                <i class="fas fa-file-pdf" style="font-size: 3rem; color: #ef4444;"></i>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <button type="button" class="remove-file-btn" onclick="removeFile()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        fileInfo.innerHTML = preview;
    }
}

// Remover archivo
function removeFile() {
    const fileInput = document.getElementById('comprobanteFile');
    const uploadArea = document.getElementById('comprobanteUpload');
    const fileInfo = document.getElementById('fileName');
    
    fileInput.value = '';
    uploadArea.classList.remove('has-file');
    fileInfo.innerHTML = '';
}

// Limpiar todos los required
function clearAllRequired() {
    const allInputs = document.querySelectorAll('#formGrupo1 input, #formGrupo1 select, #formGrupo2 input, #formGrupo2 select, #comprobanteFile');
    allInputs.forEach(input => input.removeAttribute('required'));
}

// Establecer required para Grupo 1
function setRequiredGrupo1(required) {
    const fields = ['fechaPagoG1', 'bancoEmisorG1', 'telefonoG1', 'referenciaG1'];
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            if (required) {
                field.setAttribute('required', 'required');
            } else {
                field.removeAttribute('required');
            }
        }
    });
}

// Establecer required para Grupo 2
function setRequiredGrupo2(required) {
    const fields = ['fechaPagoG2'];
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            if (required) {
                field.setAttribute('required', 'required');
            } else {
                field.removeAttribute('required');
            }
        }
    });
}

// Manejar envío del formulario
async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation(); // Prevenir propagación del evento
    
    const submitBtn = document.getElementById('submitBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Validar datos (solicitudData solo es requerido para servicios)
    if (!itemData || (!esArticuloTienda && !solicitudData)) {
        await modalConfirm.alert({
            title: 'Datos Incompletos',
            message: 'Faltan datos necesarios para procesar el pago.',
            icon: 'error',
            okText: 'Entendido'
        });
        return false;
    }
    
    const metodoId = document.getElementById('metodoPago').value;
    if (!metodoId) {
        await modalConfirm.alert({
            title: 'Método de Pago Requerido',
            message: 'Debe seleccionar un método de pago para continuar.',
            icon: 'warning',
            okText: 'Entendido'
        });
        return false;
    }
    
    // Validar comprobante si es requerido (ANTES de cualquier otra validación)
    const comprobanteSection = document.getElementById('comprobanteSection');
    const comprobanteFile = document.getElementById('comprobanteFile');
    if (comprobanteSection && comprobanteSection.style.display !== 'none') {
        if (!comprobanteFile.files || comprobanteFile.files.length === 0) {
            await modalConfirm.alert({
                title: 'Comprobante Requerido',
                message: 'Debe cargar el comprobante de pago para continuar con la transacción.',
                icon: 'warning',
                okText: 'Entendido',
                okIcon: 'fa-upload'
            });
            return false;
        }
    }
    
    // Deshabilitar botón y mostrar loading
    submitBtn.disabled = true;
    loadingOverlay.classList.add('active');
    
    try {
        // Preparar FormData
        const formData = new FormData();
        const params = getUrlParams();
        
        // Datos básicos
        if (params.carta_id) {
            formData.append('carta_id', params.carta_id);
        }
        formData.append('item_id', params.item_id);
        formData.append('inmueble_id', params.inmueble_id);
        formData.append('propietario_id', params.propietario_id || '');
        formData.append('metodo_pago_id', metodoId);
        formData.append('monto_usd', itemData.precio);
        formData.append('es_articulo_tienda', esArticuloTienda ? '1' : '0');
        
        // Determinar qué grupo de datos enviar
        const selectedOption = document.getElementById('metodoPago').options[document.getElementById('metodoPago').selectedIndex];
        const descripcion = selectedOption.dataset.descripcion || '';
        
        const esGrupo1 = METODOS_GRUPO1.some(metodo => 
            descripcion.toLowerCase().includes(metodo.toLowerCase())
        );
        
        if (esGrupo1) {
            // Validar teléfono (11 dígitos)
            const telefono = document.getElementById('telefonoG1').value;
            if (telefono.length !== 11) {
                loadingOverlay.classList.remove('active');
                await modalConfirm.alert({
                    title: 'Teléfono Inválido',
                    message: 'El número de teléfono debe tener exactamente 11 dígitos.',
                    icon: 'error',
                    okText: 'Entendido'
                });
                submitBtn.disabled = false;
                return;
            }
            
            // Validar referencia (6 dígitos)
            const referencia = document.getElementById('referenciaG1').value;
            if (referencia.length !== 6) {
                loadingOverlay.classList.remove('active');
                await modalConfirm.alert({
                    title: 'Referencia Inválida',
                    message: 'La referencia debe tener exactamente 6 dígitos.',
                    icon: 'error',
                    okText: 'Entendido'
                });
                submitBtn.disabled = false;
                return;
            }
            
            // Datos Grupo 1
            formData.append('fecha_pago', document.getElementById('fechaPagoG1').value);
            formData.append('banco_receptor_id', bancoReceptor.id);
            formData.append('banco_emisor_id', document.getElementById('bancoEmisorG1').value);
            formData.append('telefono', telefono);
            formData.append('referencia', referencia);
            
            // Calcular monto en Bs y enviar tasa_id
            if (tasaActual && tasaActualId) {
                const montoBs = parseFloat(itemData.precio) * parseFloat(tasaActual);
                formData.append('monto_bs', montoBs);
                formData.append('tasa_bcv', tasaActual);
                formData.append('tasa_id', tasaActualId); // Enviar el ID de la tasa
            }
            
            // Comprobante
            const comprobanteFile = document.getElementById('comprobanteFile').files[0];
            if (comprobanteFile) {
                formData.append('comprobante', comprobanteFile);
            }
        } else {
            // Datos Grupo 2
            formData.append('fecha_pago', document.getElementById('fechaPagoG2').value);
            
            // Calcular monto en Bs para Grupo 2 (excepto efectivo divisa)
            if (descripcion && descripcion.toLowerCase().includes('efectivo divisa')) {
                // Para efectivo divisa, el monto es en USD
                formData.append('monto_usd', itemData.precio);
                // Para efectivo divisa, usar tasa_id = 1 o el que corresponda
                if (tasaActualId) {
                    formData.append('tasa_id', tasaActualId);
                }
            } else if (tasaActual && tasaActualId) {
                const montoBs = parseFloat(itemData.precio) * parseFloat(tasaActual);
                formData.append('monto_bs', montoBs);
                formData.append('tasa_bcv', tasaActual);
                formData.append('tasa_id', tasaActualId); // Enviar el ID de la tasa
            }
            
            // Comprobante para Grupo 2
            const comprobanteFile = document.getElementById('comprobanteFile').files[0];
            if (comprobanteFile) {
                formData.append('comprobante', comprobanteFile);
            }
        }
        
        // Agregar información de inmueble y propietario
        if (inmuebleInfo) {
            formData.append('inmueble_info', JSON.stringify(inmuebleInfo));
        }
        if (propietarioInfo) {
            formData.append('propietario_info', JSON.stringify(propietarioInfo));
        }
        
        // Enviar al servidor usando el nuevo endpoint
        const response = await fetch('../../api/process_item_payment.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadingOverlay.classList.remove('active');
            await modalConfirm.alert({
                title: '¡Pago Exitoso!',
                message: 'Tu pago ha sido procesado exitosamente. Serás redirigido al dashboard.',
                icon: 'success',
                okText: 'Continuar'
            });
            window.location.href = '../../pages/dashboard/dashboard.html';
        } else {
            loadingOverlay.classList.remove('active');
            await modalConfirm.alert({
                title: 'Error al Procesar Pago',
                message: data.message || 'Ocurrió un error al procesar el pago. Por favor, intenta nuevamente.',
                icon: 'error',
                okText: 'Entendido'
            });
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error:', error);
        loadingOverlay.classList.remove('active');
        await modalConfirm.alert({
            title: 'Error de Conexión',
            message: 'Ocurrió un error al procesar el pago. Verifica tu conexión e intenta nuevamente.',
            icon: 'error',
            okText: 'Entendido'
        });
        submitBtn.disabled = false;
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Mostrar alerta
function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    container.innerHTML = '';
    container.appendChild(alert);
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Cancelar pago
async function cancelarPago() {
    const confirmar = await modalConfirm.confirm({
        title: 'Cancelar Pago',
        message: '¿Está seguro de que desea cancelar el proceso de pago?',
        icon: 'warning',
        confirmText: 'Sí, Cancelar',
        cancelText: 'No, Continuar',
        confirmIcon: 'fa-times',
        cancelIcon: 'fa-arrow-left'
    });
    
    if (confirmar) {
        window.location.href = '../../pages/dashboard/dashboard.html';
    }
}
