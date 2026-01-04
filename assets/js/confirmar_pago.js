// Variables globales
let currentUser = null
let paymentData = null
let bancoReceptorData = null
let dollarRate = 40.0 // Se actualizará con la tasa seleccionada en procesar_pago
let isProcessingPayment = false // Flag para evitar múltiples envíos

// Cargar bancos desde la base de datos
async function loadBancos() {
  try {
    const response = await fetch("../../api/get_bancos.php")
    const data = await response.json()

    if (data.success && data.bancos) {
      const bancoSelect = document.getElementById("banco")

      if (bancoSelect) {
        // Limpiar opciones existentes excepto la primera
        bancoSelect.innerHTML = '<option value="">Seleccionar banco</option>'

        // Agregar bancos desde la base de datos
        data.bancos.forEach(banco => {
          const option = document.createElement("option")
          option.value = banco.banco_id
          option.textContent = `${banco.nombre_banco} (${banco.codigo_banco})`
          bancoSelect.appendChild(option)
        })

        console.log(`✅ ${data.bancos.length} bancos cargados correctamente`)
        console.log("📋 Bancos disponibles:", data.bancos)
      } else {
        console.error("❌ Elemento banco no encontrado en el DOM")
      }
    } else {
      console.error("❌ Error al cargar bancos:", data.message)
    }
  } catch (error) {
    console.error("❌ Error en loadBancos:", error)
  }
}

// Cargar datos del banco receptor
async function loadBancoReceptor() {
  try {
    const response = await fetch("../../api/get_banco_receptor.php")
    const data = await response.json()

    if (data.success && data.banco_receptor) {
      bancoReceptorData = data.banco_receptor
      console.log(`✅ Banco receptor cargado: ${bancoReceptorData.banco_nombre}`)
    } else {
      console.error("❌ Error al cargar banco receptor:", data.message)
    }
  } catch (error) {
    console.error("❌ Error en loadBancoReceptor:", error)
  }
}

// Inicializar página
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Inicializando página de confirmación de pago...")

  // Configurar formulario INMEDIATAMENTE para evitar parpadeo
  const urlParams = new URLSearchParams(window.location.search)
  const formTypeData = urlParams.get('form')
  const formType = formTypeData ? decodeURIComponent(formTypeData) : 'complete'

  console.log("🔧 Configurando formulario inicial:", formType)
  configureFormType(formType)

  await checkSession()
  await loadBancos()
  await loadBancoReceptor()

  await hydratePaymentDataFromSession()

  // Inicializar event listeners
  initializeEventListeners()

  console.log("✅ Página inicializada correctamente")
})

// Verificar sesión
async function checkSession() {
  try {
    const response = await fetch("../../api/check_session.php")
    const data = await response.json()

    if (data.success) {
      currentUser = data.user
      document.getElementById("userName").textContent = data.user.username
    } else {
      window.location.href = "/pages/auth/index.html"
    }
  } catch (error) {
    console.error("Error verificando sesión:", error)
    window.location.href = "/pages/auth/index.html"
  }
}

// Cargar datos de pago desde la URL
async function hydratePaymentDataFromSession() {
  console.log("🔄 Cargando datos de pago desde sessionStorage...")
  try {
    const stored = sessionStorage.getItem('pendingPaymentData')
    if (!stored) {
      console.warn('⚠️ No se encontró pendingPaymentData en sessionStorage. Redirigiendo...')
      window.location.href = 'procesar_pago.html'
      return
    }

    const parsed = JSON.parse(stored)
    if (!parsed || !Array.isArray(parsed.months) || parsed.months.length === 0) {
      console.warn('⚠️ pendingPaymentData inválido o sin meses. Redirigiendo...')
      window.location.href = 'procesar_pago.html'
      return
    }

    paymentData = {
      ...parsed,
      months: parsed.months.map(normalizeMonthFromSession)
    }

    if (typeof paymentData.exchangeRate === 'number' && !Number.isNaN(paymentData.exchangeRate)) {
      dollarRate = paymentData.exchangeRate
    }

    console.log('💱 Tasa seteada para confirmación:', dollarRate)
    console.log('🧾 paymentData cargado:', paymentData)

    updateConfirmationInfo()
    updatePaymentDetails()
  } catch (error) {
    console.error('❌ Error leyendo pendingPaymentData:', error)
    showCustomAlert('Error cargando datos de pago. Por favor regresa e inténtalo de nuevo.', 'error')
    setTimeout(() => {
      window.location.href = 'procesar_pago.html'
    }, 1500)
  }
}

function normalizeMonthFromSession(month) {
  if (!month || typeof month !== 'object') {
    return {}
  }
  const id = month.id !== undefined ? month.id : month.monthId !== undefined ? month.monthId : month.number
  const name = month.name || month.monthName || month.nombre || `Mes ${id}`
  const usdCandidates = [month.usdAmount, month.monto_dolares, month.montoUsd, month.amount_usd, month.amountUsd]
  let usdAmount = usdCandidates.find(value => typeof value === 'number' && !Number.isNaN(value))
  if (usdAmount === undefined) {
    const bsCandidates = [month.monto_bs, month.amount, month.montoBs, month.montoBolivares]
    const bsAmount = bsCandidates.find(value => typeof value === 'number' && !Number.isNaN(value))
    if (bsAmount !== undefined && dollarRate > 0) {
      usdAmount = bsAmount / dollarRate
    }
  }
  if (usdAmount === undefined) {
    usdAmount = 20
  }
  return {
    id,
    name,
    usdAmount: parseFloat(Number(usdAmount).toFixed(2))
  }
}

// Configurar tipo de formulario
function configureFormType(formType) {
  console.log("🔧 Configurando formulario tipo:", formType)

  const paymentFormCard = document.querySelector('.payment-form-card')
  const paymentForm = document.getElementById('paymentRegistrationForm')

  if (formType === 'simple') {
    // Para formulario simplificado, solo mostrar la sección de comprobante
    console.log("📷 Configurando formulario simplificado")

    // Remover clase de formulario completo y agregar clase de formulario simple
    if (paymentForm) {
      paymentForm.classList.remove('form-complete')
      paymentForm.classList.add('form-simple')
    }

    // Cambiar el título del formulario
    const formTitle = paymentFormCard.querySelector('.card-header h3')
    if (formTitle) {
      formTitle.innerHTML = '<i class="fas fa-camera"></i> Registrar Pago - Solo Comprobante'
    }

    const formDescription = paymentFormCard.querySelector('.card-header p')
    if (formDescription) {
      formDescription.textContent = 'Sube la foto del comprobante de pago'
    }

    // Hacer que los campos de banco y referencia no sean requeridos
    const bancoSelect = document.getElementById('banco')
    const referenciaInput = document.getElementById('referencia')
    const phoneInput = document.getElementById('phoneNumber')
    const cedulaInput = document.getElementById('cedula')
    const tipoDocumentoSelect = document.getElementById('tipo_documento')

    if (bancoSelect) bancoSelect.required = false
    if (referenciaInput) referenciaInput.required = false
    if (phoneInput) phoneInput.required = false
    if (cedulaInput) cedulaInput.required = false
    if (tipoDocumentoSelect) tipoDocumentoSelect.required = false

    console.log("✅ Formulario simplificado configurado")

  } else {
    // Para formulario completo, mostrar todas las secciones
    console.log("📝 Configurando formulario completo")

    // Agregar clase de formulario completo y remover clase de formulario simple
    if (paymentForm) {
      paymentForm.classList.add('form-complete')
      paymentForm.classList.remove('form-simple')
    }

    // Restaurar el título original
    const formTitle = paymentFormCard.querySelector('.card-header h3')
    if (formTitle) {
      formTitle.innerHTML = '<i class="fas fa-edit"></i> Registrar Pago'
    }

    const formDescription = paymentFormCard.querySelector('.card-header p')
    if (formDescription) {
      formDescription.textContent = 'Completa los datos requeridos para finalizar el pago'
    }

    // Hacer que todos los campos sean requeridos
    const bancoSelect = document.getElementById('banco')
    const referenciaInput = document.getElementById('referencia')
    const phoneInput = document.getElementById('phoneNumber')
    const cedulaInput = document.getElementById('cedula')
    const tipoDocumentoSelect = document.getElementById('tipo_documento')

    if (bancoSelect) bancoSelect.required = true
    if (referenciaInput) referenciaInput.required = true
    if (phoneInput) phoneInput.required = true
    if (cedulaInput) cedulaInput.required = true
    if (tipoDocumentoSelect) tipoDocumentoSelect.required = true

    console.log("✅ Formulario completo configurado")
  }
}

// Actualizar información de confirmación
function updateConfirmationInfo() {
  console.log("🔄 Actualizando información de confirmación...")
  console.log("paymentData:", paymentData)

  // Verificar que paymentData existe y tiene los datos necesarios
  if (!paymentData || !paymentData.months || !paymentData.paymentMethod) {
    console.error("❌ paymentData incompleto:", paymentData)
    return
  }

  const confirmationMonths = document.getElementById('confirmationMonths')
  const confirmationMethod = document.getElementById('confirmationMethod')
  const confirmationAmount = document.getElementById('confirmationAmount')
  const confirmationAmountUsd = document.getElementById('confirmationAmountUsd')
  const confirmationDate = document.getElementById('confirmationDate')
  const confirmationRate = document.getElementById('confirmationRate')
  const selectedMonthsList = document.getElementById('selectedMonthsList')

  console.log("Elementos encontrados:", {
    confirmationMonths: !!confirmationMonths,
    confirmationMethod: !!confirmationMethod,
    confirmationAmount: !!confirmationAmount,
    confirmationAmountUsd: !!confirmationAmountUsd,
    confirmationDate: !!confirmationDate,
    confirmationRate: !!confirmationRate,
    selectedMonthsList: !!selectedMonthsList
  })

  // Actualizar meses
  if (confirmationMonths) {
    const monthsText = paymentData.months.map(m => m.name).join(', ')
    confirmationMonths.textContent = monthsText
    console.log("✅ Meses actualizados:", monthsText)
  }

  // Actualizar método
  if (confirmationMethod) {
    const methodNames = {
      'pago_movil': 'Pago Móvil',
      'transferencia': 'Transferencia',
      'efectivo_bs': 'Efectivo Bs',
      'efectivo_divisa': 'Efectivo USD'
    }
    const methodText = methodNames[paymentData.paymentMethod] || paymentData.paymentMethod
    confirmationMethod.textContent = methodText
    console.log("✅ Método actualizado:", methodText)
  }

  // Actualizar monto
  if (confirmationAmount) {
    const amountText = `${(paymentData.totalBs || 0).toLocaleString()} Bs`
    confirmationAmount.textContent = amountText
    console.log("✅ Monto actualizado:", amountText)
  }
  if (confirmationAmountUsd) {
    const amountUsdText = `${(paymentData.totalUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    confirmationAmountUsd.textContent = amountUsdText
    console.log("✅ Monto USD actualizado:", amountUsdText)
  }

  // Actualizar fecha
  if (confirmationDate) {
    const date = paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date()
    const dateText = date.toLocaleDateString('es-VE')
    confirmationDate.textContent = dateText
    console.log("✅ Fecha actualizada:", dateText)
  }

  if (confirmationRate) {
    confirmationRate.textContent = `${(paymentData.exchangeRate || dollarRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/USD`
  }

  const tasaInput = document.getElementById('tasa_dolar')
  if (tasaInput) {
    tasaInput.value = paymentData.exchangeRate || dollarRate
  }

  // Actualizar lista de meses
  if (selectedMonthsList) {
    selectedMonthsList.innerHTML = ''
    paymentData.months.forEach(month => {
      const monthTag = document.createElement('div')
      monthTag.className = 'month-tag'
      const monthAmountBs = calculateBsFromUsd(month.usdAmount || 20)
      const monthAmountUsd = month.usdAmount || 20
      monthTag.innerHTML = `
        <span>${month.name}</span>
        <span class="amount">${monthAmountBs.toLocaleString()} Bs (${monthAmountUsd.toFixed(2)} USD)</span>
      `
      selectedMonthsList.appendChild(monthTag)
    })
    console.log("✅ Lista de meses actualizada:", paymentData.months.length, "meses")
  }

  console.log("✅ Información de confirmación actualizada")
}

// Actualizar detalles de pago
function updatePaymentDetails() {
  console.log("🔄 Actualizando detalles de pago...")
  console.log("bancoReceptorData:", bancoReceptorData)
  console.log("paymentData:", paymentData)

  const paymentDetails = document.getElementById("paymentDetails")

  if (!paymentDetails) {
    console.error("❌ Elemento paymentDetails no encontrado")
    return
  }

  // Configurar información según el método seleccionado
  let paymentInfo = ""

  if (!bancoReceptorData) {
    console.warn("⚠️ bancoReceptorData no está cargado")
    paymentInfo = `<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando datos de pago...</p>`
  } else if (paymentData.paymentMethod === "pago_movil") {
    paymentInfo = `
      <div class="payment-info-grid">
        <div class="info-item">
          <i class="fas fa-mobile-alt"></i>
          <div class="info-content">
            <h4>Pago Móvil</h4>
            <p><strong>Teléfono:</strong> ${bancoReceptorData.telefono}</p>
            <p><strong>Rif:</strong> ${bancoReceptorData.tipo_documento}-${bancoReceptorData.nro_documento}</p>
            <p><strong>Banco:</strong> ${bancoReceptorData.banco_nombre}</p>
            <p><strong>Concepto:</strong> Pago de mensualidades Arcorui</p>
          </div>
        </div>
      </div>
    `
  } else if (paymentData.paymentMethod === "transferencia") {
    paymentInfo = `
      <div class="payment-info-grid">
        <div class="info-item">
          <i class="fas fa-university"></i>
          <div class="info-content">
            <h4>Transferencia Bancaria</h4>
            <p><strong>Banco:</strong> ${bancoReceptorData.banco_nombre} (${bancoReceptorData.banco_codigo})</p>
            <p><strong>Cuenta:</strong> ${bancoReceptorData.nro_cuenta}</p>
            <p><strong>Titular:</strong> ${bancoReceptorData.tipo_documento}-${bancoReceptorData.nro_documento}</p>
            <p><strong>Teléfono:</strong> ${bancoReceptorData.telefono}</p>
            <p><strong>Concepto:</strong> Pago de mensualidades</p>
          </div>
        </div>
      </div>
    `
  } else if (paymentData.paymentMethod === "efectivo_bs") {
    paymentInfo = `
      <div class="payment-info-grid">
        <div class="info-item">
          <i class="fas fa-money-bill-wave"></i>
          <div class="info-content">
            <h4>Efectivo en Bolívares</h4>
            <p><strong>Monto:</strong> ${paymentData.totalBs.toLocaleString()} Bs (${paymentData.totalUsd.toFixed(2)} USD)</p>
            <p><strong>Concepto:</strong> Pago de mensualidades Arcorui</p>
            <p><strong>Nota:</strong> Debes entregar el comprobante físico al administrador</p>
          </div>
        </div>
      </div>
    `
  } else if (paymentData.paymentMethod === "efectivo_divisa") {
    const tasaDolar = paymentData.exchangeRate || dollarRate
    const montoUsd = paymentData.totalUsd
    paymentInfo = `
      <div class="payment-info-grid">
        <div class="info-item">
          <i class="fas fa-dollar-sign"></i>
          <div class="info-content">
            <h4>Efectivo en Dólares</h4>
            <p><strong>Monto:</strong> $${montoUsd.toFixed(2)} USD (${paymentData.totalBs.toLocaleString()} Bs)</p>
            <p><strong>Tasa Referencial:</strong> ${tasaDolar.toLocaleString()} Bs/USD</p>
            <p><strong>Concepto:</strong> Pago de mensualidades Arcorui</p>
            <p><strong>Nota:</strong> Debes entregar el comprobante físico al administrador</p>
          </div>
        </div>
      </div>
    `
  }

  paymentDetails.innerHTML = paymentInfo
  console.log("✅ Detalles de pago actualizados:", paymentInfo)
}

// Inicializar event listeners
function initializeEventListeners() {
  console.log("🔧 Inicializando event listeners...")

  const form = document.getElementById("paymentRegistrationForm")
  const fileInput = document.getElementById("comprobante")
  const comprobanteUpload = document.getElementById("comprobanteUpload")
  const fileName = document.getElementById("fileName")

  console.log("📋 Elementos encontrados:", {
    form: !!form,
    fileInput: !!fileInput,
    comprobanteUpload: !!comprobanteUpload,
    fileName: !!fileName
  })

  if (!form) {
    console.error("❌ Formulario no encontrado")
    return
  }

  // Click en el contenedor para abrir el selector de archivos
  if (comprobanteUpload) {
    comprobanteUpload.addEventListener("click", function () {
      fileInput.click()
    })
  }

  // Evento para mostrar preview de imagen
  if (fileInput) {
    fileInput.addEventListener("change", function (e) {
      const file = e.target.files[0]
      if (file) {
        // Validar tamaño del archivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showCustomAlert("El archivo es demasiado grande. Máximo 5MB permitido.", 'error')
          e.target.value = ''
          return
        }

        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
          showCustomAlert("Tipo de archivo no permitido. Solo JPG, PNG y PDF.", 'error')
          e.target.value = ''
          return
        }

        // Agregar clase has-file y mostrar nombre del archivo
        comprobanteUpload.classList.add('has-file')
        if (fileName) {
          fileName.textContent = file.name
        }

        // Crear URL del blob para el botón de ver y mostrarlo
        const viewBtn = document.getElementById('viewComprobanteBtn')
        if (viewBtn) {
          const blobUrl = URL.createObjectURL(file)
          viewBtn.href = blobUrl
          viewBtn.style.display = 'flex'
        }

        console.log("✅ Archivo seleccionado:", file.name)
      } else {
        // Remover clase has-file si no hay archivo
        comprobanteUpload.classList.remove('has-file')
        if (fileName) {
          fileName.textContent = ''
        }

        // Limpiar el href del botón y ocultarlo
        const viewBtn = document.getElementById('viewComprobanteBtn')
        if (viewBtn) {
          viewBtn.href = '#'
          viewBtn.style.display = 'none'
        }
      }
    })
  }

  // Validaciones en tiempo real
  setupFieldValidations()

  // Evento de envío del formulario
  form.addEventListener("submit", function (e) {
    console.log("📝 Formulario enviado, llamando a handlePaymentRegistration")
    handlePaymentRegistration(e)
  })

  console.log("✅ Event listeners configurados correctamente")
}

// Configurar validaciones de campos
function setupFieldValidations() {
  // Validación de teléfono
  const phoneInput = document.getElementById("phoneNumber")
  if (phoneInput) {
    phoneInput.addEventListener("input", function (e) {
      // Solo permitir números
      e.target.value = e.target.value.replace(/[^0-9]/g, '')
      validatePhone()
    })
    phoneInput.addEventListener("blur", validatePhone)
  }

  // Validación de cédula
  const cedulaInput = document.getElementById("cedula")
  if (cedulaInput) {
    cedulaInput.addEventListener("input", function (e) {
      // Solo permitir números
      e.target.value = e.target.value.replace(/[^0-9]/g, '')
      validateCedula()
    })
    cedulaInput.addEventListener("blur", validateCedula)
  }

  // Validación de banco
  const bancoSelect = document.getElementById("banco")
  if (bancoSelect) {
    bancoSelect.addEventListener("change", validateBanco)
  }

  // Validación de referencia
  const referenciaInput = document.getElementById("referencia")
  if (referenciaInput) {
    referenciaInput.addEventListener("input", validateReferencia)
    referenciaInput.addEventListener("blur", validateReferencia)
  }
}

// Validar teléfono
function validatePhone() {
  const phoneInput = document.getElementById("phoneNumber")
  const phone = phoneInput.value.trim()

  // Solo números, exactamente 11 dígitos
  const phonePattern = /^[0-9]{11}$/

  if (phone === '') {
    showFieldError(phoneInput, "El número de teléfono es requerido")
    return false
  } else if (!phonePattern.test(phone)) {
    showFieldError(phoneInput, "El teléfono debe tener exactamente 11 dígitos")
    return false
  } else {
    clearFieldError(phoneInput)
    return true
  }
}

// Validar cédula
function validateCedula() {
  const cedulaInput = document.getElementById("cedula")
  const cedula = cedulaInput.value.trim()

  // Solo números, máximo 8 dígitos
  const cedulaPattern = /^[0-9]{1,8}$/

  if (cedula === '') {
    showFieldError(cedulaInput, "La cédula es requerida")
    return false
  } else if (!cedulaPattern.test(cedula)) {
    showFieldError(cedulaInput, "La cédula debe contener solo números (máximo 8 dígitos)")
    return false
  } else {
    clearFieldError(cedulaInput)
    return true
  }
}

// Validar banco
function validateBanco() {
  const bancoSelect = document.getElementById("banco")
  const banco = bancoSelect.value

  console.log("🔍 Validando banco:", banco)

  if (banco === '') {
    showFieldError(bancoSelect, "Debe seleccionar un banco")
    return false
  } else {
    clearFieldError(bancoSelect)
    return true
  }
}

// Validar referencia
function validateReferencia() {
  const referenciaInput = document.getElementById("referencia")
  const referencia = referenciaInput.value.trim()

  if (referencia === '') {
    showFieldError(referenciaInput, "El número de referencia es requerido")
    return false
  } else if (referencia.length < 6) {
    showFieldError(referenciaInput, "La referencia debe tener al menos 6 dígitos")
    return false
  } else if (!/^[0-9]+$/.test(referencia)) {
    showFieldError(referenciaInput, "La referencia solo puede contener números")
    return false
  } else {
    clearFieldError(referenciaInput)
    return true
  }
}

// Mostrar error en campo
function showFieldError(field, message) {
  clearFieldError(field)

  field.style.borderColor = '#dc3545'
  field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)'

  const errorDiv = document.createElement('div')
  errorDiv.className = 'field-error'
  errorDiv.style.cssText = `
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 5px;
    font-weight: 500;
  `
  errorDiv.textContent = message

  field.parentNode.appendChild(errorDiv)
}

// Limpiar error de campo
function clearFieldError(field) {
  field.style.borderColor = ''
  field.style.boxShadow = ''

  const existingError = field.parentNode.querySelector('.field-error')
  if (existingError) {
    existingError.remove()
  }
}

// Validar todo el formulario
function validateForm() {
  console.log("🔍 Iniciando validación del formulario...")
  console.log("📋 Tipo de formulario:", paymentData?.formType)

  // Validar archivo (siempre requerido)
  const fileInput = document.getElementById("comprobante")
  let fileValid = true
  if (!fileInput.files[0]) {
    showFieldError(fileInput, "Debe seleccionar un comprobante")
    fileValid = false
  } else {
    clearFieldError(fileInput)
  }

  // Para formulario simplificado, solo validar el archivo
  if (paymentData?.formType === 'simple') {
    console.log("📋 Validación simplificada - solo archivo")
    console.log("  - Archivo:", fileValid)

    const isValid = fileValid
    console.log("✅ Formulario válido:", isValid)
    return isValid
  }

  // Para formulario completo, validar todos los campos
  console.log("📋 Validación completa - todos los campos")
  const phoneValid = validatePhone()
  const cedulaValid = validateCedula()
  const bancoValid = validateBanco()
  const referenciaValid = validateReferencia()

  console.log("📋 Resultados de validación:")
  console.log("  - Teléfono:", phoneValid)
  console.log("  - Cédula:", cedulaValid)
  console.log("  - Banco:", bancoValid)
  console.log("  - Referencia:", referenciaValid)
  console.log("  - Archivo:", fileValid)

  const isValid = phoneValid && cedulaValid && bancoValid && referenciaValid && fileValid
  console.log("✅ Formulario válido:", isValid)

  return isValid
}

// Obtener tasa del dólar del BCV
function getDollarRate() {
  return dollarRate
}

// Calcular monto en Bs basado en USD
function calculateBsFromUsd(usdAmount) {
  const rate = paymentData && paymentData.exchangeRate ? paymentData.exchangeRate : dollarRate
  return parseFloat((usdAmount * rate).toFixed(2))
}

// Distribuir pago por proximidad a enero
function distributePaymentByProximity(months, totalAmount) {
  const tasa = paymentData && paymentData.exchangeRate ? paymentData.exchangeRate : dollarRate

  // Ordenar meses por proximidad a enero (enero = 1, febrero = 2, etc.)
  const sortedMonths = months.map(month => {
    const monthNumber = month.monthNumber || month.number || month.id
    return { ...month, monthNumber }
  }).sort((a, b) => a.monthNumber - b.monthNumber)

  console.log("📅 Meses ordenados por proximidad a enero:", sortedMonths)
  console.log("💱 Tasa del dólar:", dollarRate)

  let remainingAmount = totalAmount
  const paymentDistribution = []

  for (const month of sortedMonths) {
    if (remainingAmount <= 0) break

    const monthUsd = typeof month.usdAmount === 'number' ? month.usdAmount : 20
    const monthAmount = calculateBsFromUsd(monthUsd)
    const amountToPay = Math.min(remainingAmount, monthAmount)
    const amountUsd = tasa > 0 ? parseFloat((amountToPay / tasa).toFixed(2)) : 0

    paymentDistribution.push({
      monthId: month.id,
      monthName: month.name,
      totalAmountBs: monthAmount,
      totalAmountUsd: monthUsd,
      paidAmountBs: amountToPay,
      paidAmountUsd: amountUsd,
      remainingAmountBs: parseFloat((monthAmount - amountToPay).toFixed(2)),
      remainingAmountUsd: parseFloat((monthUsd - amountUsd).toFixed(2)),
      isFullyPaid: amountToPay >= monthAmount,
    })

    remainingAmount -= amountToPay
  }

  console.log("💰 Distribución de pago:", paymentDistribution)
  return paymentDistribution
}

// Obtener número del mes
function getMonthNumber(monthName) {
  const months = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
  }
  return months[monthName.toLowerCase()] || 13 // Si no se encuentra, poner al final
}

// Manejar registro de pago
async function handlePaymentRegistration(e) {
  console.log("🚀 handlePaymentRegistration llamada")
  console.log("📋 Evento:", e)
  console.log("📋 Target:", e.target)

  e.preventDefault()

  // Verificar si ya se está procesando un pago
  if (isProcessingPayment) {
    console.warn("⚠️ Ya se está procesando un pago, ignorando clic adicional")
    return
  }

  // Marcar como procesando y deshabilitar el botón
  isProcessingPayment = true
  const submitBtn = e.target.querySelector('button[type="submit"]')
  const originalBtnText = submitBtn.innerHTML

  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'
    submitBtn.style.opacity = '0.6'
    submitBtn.style.cursor = 'not-allowed'
  }

  console.log("🔍 Procesando registro de pago...")
  console.log("paymentData:", paymentData)

  // Validar todo el formulario antes de proceder
  if (!validateForm()) {
    showCustomAlert("Por favor corrige los errores en el formulario antes de continuar", 'error')
    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
    return
  }

  // Validaciones adicionales
  if (!paymentData || !paymentData.months || paymentData.months.length === 0) {
    showCustomAlert("No se encontraron datos de pago válidos", 'error')
    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
    return
  }

  if (!paymentData.total || paymentData.total <= 0) {
    showCustomAlert("El monto total debe ser mayor a 0", 'error')
    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
    return
  }

  console.log("✅ Validaciones del formulario completadas")

  const formData = new FormData(e.target)
  const fileInput = document.getElementById("comprobante")

  // Validaciones del archivo (siempre requeridas)
  if (!fileInput.files[0]) {
    // Usar modal personalizado en lugar de alert del navegador
    await modalConfirm.alert({
      title: 'Comprobante Requerido',
      message: 'Debe cargar el comprobante de pago para continuar con la transacción.',
      icon: 'warning',
      okText: 'Entendido',
      okIcon: 'fa-check'
    })

    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
    return
  }

  // Validar tamaño del archivo
  if (fileInput.files[0].size > 5 * 1024 * 1024) {
    showCustomAlert("El archivo es demasiado grande. Máximo 5MB permitido.", 'error')
    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
    return
  }

  // Validar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(fileInput.files[0].type)) {
    showCustomAlert("Tipo de archivo no permitido. Solo JPG, PNG y PDF.", 'error')
    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
    return
  }

  console.log("📋 Tipo de formulario:", paymentData.formType)
  console.log("📋 Método de pago:", paymentData.paymentMethod)

  // Distribuir el pago por proximidad a enero
  const paymentDistribution = await distributePaymentByProximity(paymentData.months, paymentData.totalBs)

  // Agregar datos adicionales
  formData.append("payment_method", paymentData.paymentMethod)
  formData.append("months", JSON.stringify(paymentData.months))
  formData.append("currency", "bs")
  formData.append("total_bs", paymentData.totalBs)
  formData.append("total_usd", paymentData.totalUsd)
  formData.append("suggested_total_bs", paymentData.suggestedTotalBs || 0)
  formData.append("suggested_total_usd", paymentData.suggestedTotalUsd || 0)
  formData.append("exchange_rate", paymentData.exchangeRate || dollarRate)
  formData.append("payment_date", paymentData.paymentDate || new Date().toISOString().split('T')[0])
  formData.append("payment_distribution", JSON.stringify(paymentDistribution))
  formData.append("comprobante", fileInput.files[0])

  console.log("📤 Enviando datos al servidor...")
  console.log("💰 Distribución de pago:", paymentDistribution)
  console.log("📋 FormData contents:")
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value)
  }

  try {
    const response = await fetch("../../api/process_partial_payment.php", {
      method: "POST",
      body: formData
    })

    console.log("📊 Status de la respuesta:", response.status)
    console.log("📊 Content-Type:", response.headers.get('content-type'))

    // Verificar si la respuesta es JSON válido
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      // Si no es JSON, leer como texto para ver qué está devolviendo
      const responseText = await response.text()
      console.error("❌ Respuesta no es JSON válido:")
      console.error("📄 Respuesta como texto:", responseText)
      showCustomAlert("Error del servidor: La respuesta no es válida. Por favor, contacta al administrador.", 'error')
      // Re-habilitar el botón en caso de error
      isProcessingPayment = false
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.innerHTML = originalBtnText
        submitBtn.style.opacity = '1'
        submitBtn.style.cursor = 'pointer'
      }
      return
    }

    const data = await response.json()

    console.log("📥 Respuesta del servidor:", data)

    if (data.success) {
      console.log("✅ Pago procesado exitosamente")

      // Mostrar mensaje de verificación
      showVerificationMessage()

      // Después de 2 segundos, mostrar mensaje de éxito
      setTimeout(() => {
        hideVerificationMessage()
        showSuccessModal(data)
      }, 2000)

    } else {
      console.error("❌ Error en la respuesta:", data.message)
      showCustomAlert("Error al registrar el pago: " + data.message, 'error')
      // Re-habilitar el botón en caso de error
      isProcessingPayment = false
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.innerHTML = originalBtnText
        submitBtn.style.opacity = '1'
        submitBtn.style.cursor = 'pointer'
      }
    }
  } catch (error) {
    console.error("❌ Error en handlePaymentRegistration:", error)

    // Si el error es de parsing JSON, mostrar mensaje más específico
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error("❌ Error de parsing JSON - posible respuesta HTML del servidor")
      showCustomAlert("Error del servidor: Respuesta no válida. Por favor, verifica que todos los datos estén correctos e intenta nuevamente.", 'error')
    } else {
      showCustomAlert("Error al registrar el pago: " + error.message, 'error')
    }

    // Re-habilitar el botón en caso de error
    isProcessingPayment = false
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalBtnText
      submitBtn.style.opacity = '1'
      submitBtn.style.cursor = 'pointer'
    }
  }
}

// Mostrar mensaje de verificación
function showVerificationMessage() {
  const verifyingModal = document.getElementById("verifyingModal")
  if (verifyingModal) {
    document.body.style.overflow = "hidden"
    verifyingModal.style.display = "flex"
    setTimeout(() => verifyingModal.classList.add("show"), 10)
  }
}

// Ocultar mensaje de verificación
function hideVerificationMessage() {
  const verifyingModal = document.getElementById("verifyingModal")
  if (verifyingModal) {
    verifyingModal.classList.remove("show")
    setTimeout(() => {
      document.body.style.overflow = "auto"
      verifyingModal.style.display = "none"
    }, 300)
  }
}

// Mostrar modal de éxito
function showSuccessModal(data) {
  const successModal = document.getElementById("successModal")
  if (successModal) {
    document.body.style.overflow = "hidden"
    successModal.style.display = "flex"
    setTimeout(() => successModal.classList.add("show"), 10)
  }
}

// Cerrar modal de éxito
function closeSuccessModal() {
  const modal = document.getElementById("successModal")
  modal.classList.remove("show")
  setTimeout(() => {
    document.body.style.overflow = "auto"
    modal.style.display = "none"

    // Redirigir a la página de pagos
    window.location.href = 'pagos.html'
  }, 300)
}

// Remover imagen
function removeImage() {
  document.getElementById("comprobante").value = ""
  document.getElementById("imagePreview").style.display = "none"
}

// Volver a la página anterior - FUNCIÓN GLOBAL
window.goBack = function () {
  console.log("🔄 Botón volver presionado")
  console.log("paymentData actual:", paymentData)

  // Verificar si paymentData existe
  if (!paymentData || !paymentData.months || !paymentData.totalBs || !paymentData.paymentMethod) {
    console.warn("⚠️ paymentData incompleto, redirigiendo sin datos")
    window.location.href = 'procesar_pago.html'
    return
  }

  // Crear URL para volver a procesar_pago.html con los datos
  const url = 'procesar_pago.html'

  console.log("🔄 Redirigiendo a procesar_pago.html con URL:", url)
  window.location.href = url
}

// Función para mostrar alertas personalizadas
function showCustomAlert(message, type = 'error') {
  // Remover alerta anterior si existe
  const existingAlert = document.getElementById('customAlertModal')
  if (existingAlert) {
    existingAlert.remove()
  }

  // Configuración según el tipo
  const config = {
    error: {
      icon: 'fa-exclamation-circle',
      color: '#dc3545',
      bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
      borderColor: '#dc3545'
    },
    warning: {
      icon: 'fa-exclamation-triangle',
      color: '#ffc107',
      bgGradient: 'linear-gradient(135deg, #fffbf0 0%, #fff3cd 100%)',
      borderColor: '#ffc107'
    },
    success: {
      icon: 'fa-check-circle',
      color: '#28a745',
      bgGradient: 'linear-gradient(135deg, #f0fff4 0%, #d4edda 100%)',
      borderColor: '#28a745'
    }
  }

  const style = config[type] || config.error

  // Crear modal
  const alertModal = document.createElement('div')
  alertModal.id = 'customAlertModal'
  alertModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease-out;
  `

  alertModal.innerHTML = `
    <div style="
      background: white;
      ${style.bgGradient};
      border: 3px solid ${style.borderColor};
      border-radius: 20px;
      padding: 30px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideInScale 0.3s ease-out;
    ">
      <div style="
        text-align: center;
        margin-bottom: 20px;
      ">
        <i class="fas ${style.icon}" style="
          font-size: 4rem;
          color: ${style.color};
          animation: pulse 0.6s ease-in-out;
        "></i>
      </div>
      <div style="
        text-align: center;
        font-size: 1.1rem;
        color: #495057;
        line-height: 1.6;
        margin-bottom: 25px;
        font-weight: 500;
      ">
        ${message}
      </div>
      <div style="text-align: center;">
        <button onclick="this.closest('#customAlertModal').remove(); document.body.style.overflow='auto'" style="
          background: ${style.color};
          color: white;
          border: none;
          padding: 12px 35px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px ${style.color}40;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px ${style.color}60'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px ${style.color}40'">
          <i class="fas fa-check"></i> Entendido
        </button>
      </div>
    </div>
  `

  // Agregar estilos de animación
  if (!document.getElementById('customAlertStyles')) {
    const styleSheet = document.createElement('style')
    styleSheet.id = 'customAlertStyles'
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `
    document.head.appendChild(styleSheet)
  }

  document.body.appendChild(alertModal)
  document.body.style.overflow = 'hidden'
}
