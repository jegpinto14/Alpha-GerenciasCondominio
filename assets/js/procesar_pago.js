// Variables globales
let currentUser = null
let selectedPaymentMethod = null
let paymentData = null
let bancoReceptorData = null
let selectedMonths = []
let suggestedTotal = 0
let suggestedTotalUsd = 0
let dollarRate = 40.0 // Tasa del dólar por defecto (se actualizará con la última tasa)
let paymentDate = new Date().toISOString().split('T')[0] // Fecha de pago por defecto: hoy

async function loadDollarRate(fecha = null) {
  try {
    const url = fecha ? `../../api/get_tasa.php?fecha=${encodeURIComponent(fecha)}` : '../../api/get_tasa.php'
    const response = await fetch(url)
    const data = await response.json()

    if (!data.success || !data.data) {
      console.warn('⚠️ No se pudo obtener la tasa desde get_tasa.php, se mantiene el valor actual:', dollarRate)
      return dollarRate
    }

    dollarRate = parseFloat(data.data.tasa) || dollarRate
    recalculateSuggestedTotals()
    updateDebtInfo()
    updateAmountSummary()
    console.log(`💱 Tasa del dólar actualizada: ${dollarRate} Bs/USD (fecha ${data.data.fecha})`)
    return dollarRate
  } catch (error) {
    console.error('❌ Error obteniendo la tasa desde get_tasa.php:', error)
    return dollarRate
  }
}

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

// Inicializar el selector de fecha
function initializeDatePicker() {
  const paymentDateInput = document.getElementById('paymentDate')
  if (!paymentDateInput || typeof flatpickr !== 'function') {
    console.warn('⚠️ Flatpickr no está disponible o el campo de fecha no existe.')
    return
  }

  const todayISO = new Date().toISOString().split('T')[0]
  paymentDate = todayISO

  const picker = flatpickr(paymentDateInput, {
    locale: 'es',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd/m/Y',
    defaultDate: todayISO,
    maxDate: todayISO,
    allowInput: false,
    onReady: async (_selectedDates, dateStr, instance) => {
      const initialDate = dateStr || todayISO
      paymentDate = initialDate
      if (instance && instance.altInput) {
        instance.altInput.placeholder = 'dd/mm/yyyy'
        instance.altInput.classList.add('form-control')
      }
      console.log(`📅 Fecha de pago inicial: ${paymentDate}`)
      await updateExchangeRate(paymentDate)
      updateAmountSummary()
    },
    onChange: async (_selectedDates, dateStr) => {
      if (!dateStr) {
        return
      }
      paymentDate = dateStr
      console.log(`📅 Fecha de pago seleccionada: ${paymentDate}`)
      await updateExchangeRate(paymentDate)
      updateAmountSummary()
    }
  })

  if (!picker) {
    console.warn('⚠️ No se pudo inicializar Flatpickr, se usará configuración básica.')
  }
}

// Actualizar la tasa de cambio para una fecha específica
async function updateExchangeRate(date) {
  const rateValueElement = document.getElementById('dollarRateValue')
  
  try {
    // Usar la función existente loadDollarRate
    const rate = await loadDollarRate(date)
    
    if (rate) {
      const formattedDate = formatDate(date)
      rateValueElement.textContent = `1 USD = ${parseFloat(rate).toFixed(2)} Bs (${formattedDate})`
      rateValueElement.dataset.rate = rate
      dollarRate = parseFloat(rate) // Actualizar la variable global
      recalculateSuggestedTotals()
      updateDebtInfo()
      updateAmountSummary()
      console.log(`💱 Tasa actualizada: 1 USD = ${rate} Bs`)
      return rate
    } else {
      throw new Error('No se pudo obtener la tasa para la fecha especificada')
    }
  } catch (error) {
    console.error('❌ Error al actualizar la tasa de cambio:', error)
    rateValueElement.textContent = 'No disponible'
    rateValueElement.dataset.rate = ''
    return null
  }
}

// Formatear fecha a formato legible
function formatDate(dateString) {
  if (!dateString) {
    return ''
  }

  // Evitar desfases por zona horaria construyendo la fecha en horario local
  const [year, month, day] = dateString.split('-').map(part => parseInt(part, 10))

  if ([year, month, day].some(value => Number.isNaN(value))) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString('es-ES', options)
  }

  const localDate = new Date(year, month - 1, day)
  return localDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Calcular monto en Bs basado en USD
function calculateBsFromUsd(usdAmount) {
  return (usdAmount * dollarRate).toFixed(2)
}

// Inicializar página
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Inicializando página de procesamiento de pago...")
  
  await checkSession()
  await loadBancos()
  await loadBancoReceptor()
  
  // Cargar datos de pago ANTES de inicializar date picker
  loadPaymentData()
  
  // Inicializar el selector de fecha (esto cargará la tasa correcta)
  initializeDatePicker()
  
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

// Cargar datos de pago desde sessionStorage o parámetros de URL
function loadPaymentData() {
  let payload = null

  try {
    const stored = sessionStorage.getItem('pendingPaymentData')
    if (stored) {
      payload = JSON.parse(stored)
      console.log('📦 Datos cargados desde sessionStorage.pendingPaymentData', payload)
    }
  } catch (error) {
    console.warn('No se pudo leer pendingPaymentData desde sessionStorage:', error)
  }

  if (!payload) {
    const urlParams = new URLSearchParams(window.location.search)
    const monthsData = urlParams.get('months')
    const totalData = urlParams.get('total')

    if (monthsData) {
      try {
        payload = {
          months: JSON.parse(decodeURIComponent(monthsData)),
          total: totalData ? Number(totalData) : null
        }
        console.log('🌐 Datos de pago obtenidos vía URL', payload)
      } catch (error) {
        console.error('❌ Error parseando datos de la URL:', error)
        showCustomAlert('Error cargando datos de pago', 'error')
      }
    }
  }

  if (payload && Array.isArray(payload.months) && payload.months.length > 0) {
    selectedMonths = payload.months.map((month) => normalizeMonth(month))

    // NO usar exchangeRate del payload - se actualizará según la fecha seleccionada
    // La tasa se cargará desde el date picker con updateExchangeRate()

    // Priorizar suggestedTotalUsd y suggestedTotalBs del payload
    if (payload.suggestedTotalUsd && Number.isFinite(payload.suggestedTotalUsd)) {
      suggestedTotalUsd = parseFloat(parseFloat(payload.suggestedTotalUsd).toFixed(2))
      console.log('💵 Usando suggestedTotalUsd del payload:', suggestedTotalUsd)
    } else if (payload.totalUsd && Number.isFinite(payload.totalUsd)) {
      suggestedTotalUsd = parseFloat(parseFloat(payload.totalUsd).toFixed(2))
      console.log('💵 Usando totalUsd del payload:', suggestedTotalUsd)
    } else {
      recalculateSuggestedTotals()
      console.log('💵 Calculando suggestedTotalUsd desde meses:', suggestedTotalUsd)
    }

    if (payload.suggestedTotalBs && Number.isFinite(payload.suggestedTotalBs)) {
      suggestedTotal = parseFloat(parseFloat(payload.suggestedTotalBs).toFixed(2))
      console.log('💰 Usando suggestedTotalBs del payload:', suggestedTotal)
    } else {
      suggestedTotal = parseFloat((suggestedTotalUsd * dollarRate).toFixed(2))
      console.log('💰 Calculando suggestedTotalBs desde USD:', suggestedTotal)
    }

    updateDebtInfo()
    updateAmountInput()
    updateAmountSummary()

    console.log('✅ Datos de pago establecidos correctamente', {
      selectedMonths,
      suggestedTotal,
      suggestedTotalUsd,
      dollarRate
    })
  } else {
    selectedMonths = []
    recalculateSuggestedTotals()
    updateDebtInfo()
    updateAmountInput()
    updateAmountSummary()
    console.log('ℹ️ No se encontraron meses pendientes; la página quedará en blanco para ingreso manual.')
  }
}

function normalizeMonth(month) {
  const parsed = { ...month }
  const id = parsed.id !== undefined ? parsed.id : parsed.monthId !== undefined ? parsed.monthId : parsed.number
  const name = parsed.name || parsed.monthName || parsed.nombre || `Mes ${id}`
  const usdCandidates = [parsed.usdAmount, parsed.monto_dolares, parsed.montoUsd, parsed.amount_usd, parsed.amountUsd]
  let usdAmount = usdCandidates.find(value => typeof value === 'number' && !Number.isNaN(value))
  if (usdAmount === undefined) {
    const bsCandidates = [parsed.monto_bs, parsed.amount, parsed.montoBs, parsed.montoBolivares]
    const bsAmount = bsCandidates.find(value => typeof value === 'number' && !Number.isNaN(value))
    if (bsAmount !== undefined && dollarRate > 0) {
      usdAmount = bsAmount / dollarRate
    }
  }
  if (usdAmount === undefined) {
    console.warn(`⚠️ Mes ${name} sin usdAmount, usando 15 USD por defecto`)
    usdAmount = 15
  }
  const normalizedUsd = parseFloat(Number(usdAmount).toFixed(2))
  console.log(`📅 Mes normalizado: ${name} = ${normalizedUsd} USD`)
  return {
    id,
    name,
    usdAmount: normalizedUsd
  }
}

function recalculateSuggestedTotals() {
  suggestedTotalUsd = selectedMonths.reduce((total, month) => total + (month.usdAmount || 0), 0)
  suggestedTotalUsd = parseFloat(suggestedTotalUsd.toFixed(2))
  suggestedTotal = dollarRate > 0 ? parseFloat((suggestedTotalUsd * dollarRate).toFixed(2)) : 0
}

// Actualizar información de la deuda
function updateDebtInfo() {
  const selectedMonthsCount = document.getElementById('selectedMonthsCount')
  const suggestedTotalEl = document.getElementById('suggestedTotal')
  const suggestedTotalUsdEl = document.getElementById('suggestedTotalUsd')
  const selectedMonthsList = document.getElementById('selectedMonthsList')
  
  if (selectedMonthsCount) {
    selectedMonthsCount.textContent = selectedMonths.length
  }
  
  if (suggestedTotalEl) {
    suggestedTotalEl.textContent = `${suggestedTotal.toLocaleString()} Bs`
  }

  if (suggestedTotalUsdEl) {
    suggestedTotalUsdEl.textContent = `${suggestedTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  }
  
  if (selectedMonthsList) {
    selectedMonthsList.innerHTML = ''
    selectedMonths.forEach(month => {
      const monthTag = document.createElement('div')
      monthTag.className = 'month-tag'
      
      // Usar el monto correcto según el tipo de mes
      let amount = 50
      if (month && typeof month.usdAmount === 'number') {
        amount = dollarRate > 0 ? parseFloat((month.usdAmount * dollarRate).toFixed(2)) : 0
      }
      
      monthTag.innerHTML = `
        <span>${month.name}</span>
        <span class="amount">${amount} Bs</span>
      `
      selectedMonthsList.appendChild(monthTag)
    })
  }
}

// Actualizar campo de entrada de monto
function updateAmountInput() {
  const customAmountInput = document.getElementById('customAmount')
  // if (customAmountInput) {
  //   customAmountInput.placeholder = `Monto`
  // }
}

// Inicializar event listeners
function initializeEventListeners() {
  const customAmountInput = document.getElementById('customAmount')
  if (customAmountInput) {
    customAmountInput.addEventListener('input', updateAmountSummary)
    customAmountInput.addEventListener('change', updateAmountSummary)
  }
  
  // Configurar event listeners para métodos de pago
  document.querySelectorAll('.payment-method-option').forEach(option => {
    option.addEventListener('click', () => {
      const method = option.dataset.method
      selectPaymentMethod(method)
    })
  })
  
  // Configurar event listener para el botón continuar
  const continueBtn = document.getElementById('continueBtn')
  if (continueBtn) {
    continueBtn.addEventListener('click', proceedToPayment)
  }
}

// Establecer porcentaje del monto
function setAmountPercentage(percentage) {
  const customAmountInput = document.getElementById('customAmount')
  if (customAmountInput) {
    const amount = (suggestedTotal * percentage) / 100
    customAmountInput.value = amount.toFixed(2)
    updateAmountSummary()
  }
}

// Actualizar resumen del monto
function updateAmountSummary() {
  const customAmountInput = document.getElementById('customAmount')
  const paymentAmountEl = document.getElementById('paymentAmount')
  const remainingAmountEl = document.getElementById('remainingAmount')
  const paymentAmountUsdEl = document.getElementById('paymentAmountUsd')
  const remainingAmountUsdEl = document.getElementById('remainingAmountUsd')
  
  if (!customAmountInput || !paymentAmountEl || !remainingAmountEl) return
  
  const amount = parseFloat(customAmountInput.value) || 0
  const remaining = Math.max(0, suggestedTotal - amount)
  const amountUsd = dollarRate > 0 ? parseFloat((amount / dollarRate).toFixed(2)) : 0
  const remainingUsd = dollarRate > 0 ? parseFloat((remaining / dollarRate).toFixed(2)) : 0
  
  paymentAmountEl.textContent = `${amount.toLocaleString()} Bs`
  remainingAmountEl.textContent = `${remaining.toLocaleString()} Bs`
  if (paymentAmountUsdEl) {
    paymentAmountUsdEl.textContent = `${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  }
  if (remainingAmountUsdEl) {
    remainingAmountUsdEl.textContent = `${remainingUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  }
  
  // Habilitar/deshabilitar botón de continuar (sin validación de monto máximo)
  updateContinueButton()
}

// Seleccionar método de pago
function selectPaymentMethod(method) {
  // Remover selección anterior
  document.querySelectorAll('.payment-method-option').forEach(option => {
    option.classList.remove('selected')
  })
  
  // Seleccionar nuevo método
  const selectedOption = document.querySelector(`[data-method="${method}"]`)
  if (selectedOption) {
    selectedOption.classList.add('selected')
    selectedPaymentMethod = method
    console.log("✅ Método de pago seleccionado:", method)
  }
  
  // Actualizar botón de continuar
  updateContinueButton()
}

// Actualizar botón de continuar
function updateContinueButton() {
  const continueBtn = document.getElementById('continueBtn')
  const customAmountInput = document.getElementById('customAmount')
  
  if (!continueBtn || !customAmountInput) return
  
  const amount = parseFloat(customAmountInput.value) || 0
  const hasValidAmount = amount > 0 // Solo validar que sea mayor a 0, no el máximo
  const hasSelectedMethod = selectedPaymentMethod !== null
  
  continueBtn.disabled = !(hasValidAmount && hasSelectedMethod)
  
  if (hasValidAmount && hasSelectedMethod) {
    continueBtn.classList.add('enabled')
  } else {
    continueBtn.classList.remove('enabled')
  }
}

// Proceder al pago
async function proceedToPayment() {
  if (!selectedPaymentMethod) {
    showCustomAlert("Por favor selecciona un método de pago", 'error')
    return
  }
  
  // Verificar que la fecha de pago sea válida
  if (!paymentDate) {
    showCustomAlert("Por favor selecciona una fecha de pago válida", 'error')
    return
  }
  
  // Verificar que la tasa de cambio esté disponible
  if (!dollarRate || isNaN(dollarRate)) {
    showCustomAlert("No se pudo obtener la tasa de cambio para la fecha seleccionada. Por favor, intente nuevamente.", 'error')
    return
  }
  
  const customAmountInput = document.getElementById('customAmount')
  let totalBs = parseFloat(customAmountInput && customAmountInput.value ? customAmountInput.value : '0') || 0
  let totalUsd = dollarRate > 0 ? parseFloat((totalBs / dollarRate).toFixed(2)) : 0
  const suggestedUsd = suggestedTotalUsd
  const suggestedBs = suggestedTotal

  // Métodos que requieren solo foto (formulario simplificado)
  const simpleFormMethods = ['punto_venta_debito', 'punto_venta_credito', 'donaciones', 'efectivo_bs', 'efectivo_divisa']
  const formType = simpleFormMethods.includes(selectedPaymentMethod) ? 'simple' : 'complete'

  // Si el usuario no ingresó monto, usar el sugerido según el método
  if (totalBs <= 0 && totalUsd <= 0) {
    if (selectedPaymentMethod === 'efectivo_divisa') {
      totalUsd = parseFloat(suggestedUsd.toFixed(2))
      totalBs = dollarRate > 0 ? parseFloat((totalUsd * dollarRate).toFixed(2)) : suggestedBs
    } else {
      totalBs = parseFloat(suggestedBs.toFixed(2))
      totalUsd = dollarRate > 0 ? parseFloat((totalBs / dollarRate).toFixed(2)) : suggestedUsd
    }
    console.log('💵 Monto ingresado vacío, usando sugerido:', { totalBs, totalUsd })
  }

  // Crear objeto con los datos del pago
  const paymentInfo = {
    months: selectedMonths,
    paymentMethod: selectedPaymentMethod,
    totalBs,
    totalUsd,
    suggestedTotalBs: suggestedBs,
    suggestedTotalUsd: suggestedUsd,
    exchangeRate: dollarRate,
    paymentDate: paymentDate,
    currency: 'BS',
    formType,
    total: selectedPaymentMethod === 'efectivo_divisa' ? totalUsd : totalBs
  }
  
  // Guardar datos del pago
  paymentData = paymentInfo
  try {
    sessionStorage.setItem('pendingPaymentData', JSON.stringify(paymentData))
  } catch (error) {
    console.error('No se pudo guardar pendingPaymentData en sessionStorage:', error)
  }
  
  // Siempre ir a confirmar_pago.html, pero con parámetro adicional para indicar tipo de formulario
  proceedToConfirmationWithFormType(formType)
}


// Proceder a confirmación con tipo de formulario
function proceedToConfirmationWithFormType(formType) {
  // Crear URL para la página de confirmación
  const formTypeData = encodeURIComponent(formType)
  
  const url = `confirmar_pago.html?form=${formTypeData}`
  
  // Redirigir a la página de confirmación
  window.location.href = url
}

// Obtener nombre de visualización del método
function getMethodDisplayName(method) {
  const methodNames = {
    'punto_venta_debito': 'Punto de Venta Débito',
    'punto_venta_credito': 'Punto de Venta Crédito',
    'donaciones': 'Donaciones',
    'efectivo_bs': 'Efectivo Bs',
    'efectivo_divisa': 'Efectivo USD'
  }
  return methodNames[method] || method
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


// Volver al dashboard
function goBack() {
  window.location.href = "pagos.html"
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
