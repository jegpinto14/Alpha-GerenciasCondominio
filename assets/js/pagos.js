// Variables globales
let selectedMonths = []
let currentUser = null
let currentHousing = null
let selectedPaymentMethod = null
let paymentData = null
let paidMonths = []
let pendingMonths = []
let rejectedMonths = []
let autoRefreshInterval = null
let currentPaymentType = 'mensualidad' // 'mensualidad' o 'deuda_acumulada'
let dollarRate = 40.0 // Tasa del dólar por defecto (se actualizará con la última tasa)
let selectedMonthsUsdTotal = 0
let deudaAcumulada = null
let customPaymentAmount = null // Monto personalizado ingresado por el usuario
let activeHousingSummary = null
let activeHousingId = null
let initialMonthsRendered = false
let periodosMontos = {} // Cache de montos por periodo

// Variable global para banco receptor
let bancoReceptorData = null

async function loadDollarRate(fecha = null) {
  try {
    const url = fecha ? `../../api/get_tasa.php?fecha=${encodeURIComponent(fecha)}` : '../../api/get_tasa.php'
    const response = await fetch(url)
    const data = await response.json()

    if (!data.success || !data.data) {
      console.warn('⚠️ No se pudo obtener la tasa desde get_tasa.php, usando valor actual:', dollarRate)
      return dollarRate
    }

    dollarRate = parseFloat(data.data.tasa) || dollarRate
    console.log(`💱 Tasa del dólar actualizada: ${dollarRate} Bs/USD (fecha ${data.data.fecha})`)
    updateSelectedSummaryTotals()
    return dollarRate
  } catch (error) {
    console.error('❌ Error obteniendo la tasa desde get_tasa.php:', error)
    return dollarRate
  }
}

// Función para obtener monto de un periodo específico según obligaciones
async function getPeriodoAmount(year, month) {
  try {
    const fechaPeriodo = `${year}-${String(month).padStart(2, '0')}-01`
    const cacheKey = fechaPeriodo
    
    // Verificar cache
    if (periodosMontos[cacheKey]) {
      console.log(`💰 Usando monto en cache para ${fechaPeriodo}: $${periodosMontos[cacheKey]} USD`)
      return periodosMontos[cacheKey]
    }
    
    const query = buildHousingQuery()
    const response = await fetch(`../../api/get_periodo_amount.php?fecha_periodo=${fechaPeriodo}${query}`)
    const data = await response.json()
    
    if (data.success) {
      const montoUsd = parseFloat(data.cuota_apartamento_usd) || 0
      periodosMontos[cacheKey] = montoUsd
      console.log(`💰 Monto del periodo ${fechaPeriodo}: $${montoUsd} USD (${data.obligaciones_count} obligaciones)`)
      return montoUsd
    } else {
      console.warn(`⚠️ No se pudo obtener monto para periodo ${fechaPeriodo}:`, data.message)
      return 0
    }
  } catch (error) {
    console.error(`❌ Error obteniendo monto del periodo:`, error)
    return 0
  }
}

// Función para cargar montos de todos los periodos del año
async function loadPeriodosMontos(year) {
  console.log(`🔄 Cargando montos de periodos para el año ${year}...`)
  const promises = []
  
  for (let month = 1; month <= 12; month++) {
    promises.push(getPeriodoAmount(year, month))
  }
  
  await Promise.all(promises)
  console.log(`✅ Montos de periodos cargados para ${year}:`, periodosMontos)
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

// Calcular monto en Bs basado en USD
function calculateBsFromUsd(usdAmount) {
  return parseFloat((usdAmount * dollarRate).toFixed(2))
}

// Inicializar página
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Inicializando página de pagos...")

  hydrateActiveHousingFromStorage()
  await checkSession()

  console.log("🏠 Cargando datos de vivienda...")
  await loadHousingData()

  initializeYearSelector()

  console.log("📡 Cargando bancos...")
  await loadBancos()

  console.log("📡 Cargando banco receptor...")
  await loadBancoReceptor()

  console.log("💱 Obteniendo tasa de cambio...")
  await loadDollarRate()
  updateSelectedSummaryTotals()

  console.log("📡 Cargando meses pagados...")
  await loadPaidMonths()

  console.log("📡 Cargando meses pendientes...")
  await loadPendingMonths()

  console.log("📡 Cargando meses rechazados...")
  await loadRejectedMonths()

  console.log("📡 Cargando deuda acumulada...")
  await loadDeudaAcumulada()

  if (!initialMonthsRendered) {
    console.log("🔁 Renderizando meses iniciales tras carga base...")
    loadAvailableMonths()
    initialMonthsRendered = true
  }

  // Iniciar actualización automática de estados
  startStatusAutoRefresh()

  // Inicializar event listeners para pago personalizado
  initializeCustomPaymentListeners()

  // Debug: verificar que el campo esté disponible
  setTimeout(() => {
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) {
      console.log("✅ Campo de entrada encontrado y funcional:", customAmountInput);
      console.log("✅ Campo habilitado:", !customAmountInput.disabled);
      console.log("✅ Campo no es solo lectura:", !customAmountInput.readOnly);
    } else {
      console.error("❌ Campo de entrada no encontrado");
    }
  }, 1000);

  console.log("✅ Página inicializada correctamente")
})

function hydrateActiveHousingFromStorage() {
  try {
    const summary = sessionStorage.getItem('activeHousingSummary')
    const storedHousingId = sessionStorage.getItem('activeHousingId')
    if (summary) {
      activeHousingSummary = summary
      const display = document.getElementById('paymentsHousingDisplay')
      if (display) {
        display.textContent = summary
      }
    }
    if (storedHousingId) {
      const parsedId = parseInt(storedHousingId, 10)
      if (!Number.isNaN(parsedId)) {
        activeHousingId = parsedId
      }
    }
  } catch (error) {
    console.warn('No se pudo recuperar la vivienda activa desde sessionStorage en pagos:', error)
  }
}

function buildHousingQuery() {
  return activeHousingId ? `?inmueble_id=${encodeURIComponent(activeHousingId)}` : ''
}

function initializeYearSelector() {
  const yearSelect = document.getElementById("yearSelect")

  // Agregar 2025 y 2026
  yearSelect.innerHTML = `
    <option value="2025">2025</option>
    <option value="2026">2026</option>
  `

  // Seleccionar 2025 por defecto (o el año actual si coincide)
  const currentYear = new Date().getFullYear()
  if (currentYear === 2026) {
    yearSelect.value = "2026"
  } else {
    yearSelect.value = "2025"
  }
}

// Verificar sesión
async function checkSession() {
  try {
    const response = await fetch("../../api/check_session.php")
    const data = await response.json()

    if (data.success) {
      currentUser = data.user
      document.getElementById("userName").textContent = data.user.username
      if (!activeHousingId && data.active_inmueble_id) {
        activeHousingId = parseInt(data.active_inmueble_id, 10)
        if (!Number.isNaN(activeHousingId)) {
          sessionStorage.setItem('activeHousingId', String(activeHousingId))
        } else {
          activeHousingId = null
        }
      }
    } else {
      window.location.href = "/pages/auth/index.html"
    }
  } catch (error) {
    console.error("Error verificando sesión:", error)
    window.location.href = "/pages/auth/index.html"
  }
}

// Cargar información de la vivienda activa
async function loadHousingData() {
  try {
    console.log("🏠 Cargando información de la vivienda...")
    const response = await fetch("../../api/get_housing.php")
    const data = await response.json()

    if (data.success && data.housing) {
      const housingList = Array.isArray(data.housing) ? data.housing : [data.housing]

      // Buscar la vivienda activa
      currentHousing = housingList.find(h => h.is_active) || housingList[0]

      if (currentHousing) {
        console.log("✅ Vivienda cargada:", currentHousing)
        console.log("💰 Monto mensual USD:", currentHousing.montoMensualUsd)

        if (!activeHousingId && currentHousing.inmueble_id) {
          activeHousingId = currentHousing.inmueble_id
        }
      } else {
        console.warn("⚠️ No se encontró vivienda activa")
      }
    } else {
      console.warn("⚠️ No se pudo cargar información de vivienda:", data.message)
    }
  } catch (error) {
    console.error("❌ Error cargando información de vivienda:", error)
  }
}

// Cargar meses pagados desde la base de datos
async function loadPaidMonths() {
  try {
    console.log("🔄 Cargando meses pagados desde la API...")
    const response = await fetch(`../../api/get_paid_months.php${buildHousingQuery()}`)
    const data = await response.json()

    console.log("📡 Respuesta de la API:", data)

    if (data.success) {
      paidMonths = data.paidMonths || []
      console.log("✅ Meses pagados cargados:", paidMonths)

      // Log detallado de cada mes pagado
      paidMonths.forEach((month, index) => {
        console.log(`  ${index + 1}. ${month.name} ${month.year} (ID: ${month.id})`)
      })

      // FORZAR actualización de la vista inmediatamente
      console.log("🔄 Forzando actualización de la vista...")
      loadAvailableMonths()
      initialMonthsRendered = true
    } else {
      console.error("❌ Error cargando meses pagados:", data.message)
      paidMonths = []
      initialMonthsRendered = false
    }
  } catch (error) {
    console.error("❌ Error cargando meses pagados:", error)
    paidMonths = []
    initialMonthsRendered = false
  }
}

// Cargar meses pendientes desde la base de datos
async function loadPendingMonths() {
  try {
    console.log("🔄 Cargando meses pendientes desde la API...")
    const response = await fetch(`../../api/get_pending_months.php${buildHousingQuery()}`)
    const data = await response.json()

    console.log("📡 Respuesta de la API de meses pendientes:", data)

    if (data.success) {
      pendingMonths = data.pendingMonths || []
      console.log("✅ Meses pendientes cargados:", pendingMonths)

      // Log detallado de cada mes pendiente
      pendingMonths.forEach((month, index) => {
        console.log(`  ${index + 1}. ${month.name} ${month.year} (ID: ${month.id}) - Estado: ${month.status}`)
      })

      // Forzar actualización de la vista
      if (initialMonthsRendered) {
        console.log("🔄 Actualizando vista después de cargar meses pendientes...")
        loadAvailableMonths()
      }
    } else {
      console.error("❌ Error cargando meses pendientes:", data.message)
      pendingMonths = []
    }
  } catch (error) {
    console.error("❌ Error cargando meses pendientes:", error)
    pendingMonths = []
  }
}

// Cargar meses rechazados desde la base de datos
async function loadRejectedMonths() {
  try {
    console.log("🔄 Cargando meses rechazados desde la API...")
    const response = await fetch(`../../api/get_rejected_months.php${buildHousingQuery()}`)
    const data = await response.json()

    console.log("📡 Respuesta de la API de meses rechazados:", data)

    if (data.success) {
      rejectedMonths = data.rejectedMonths || []
      console.log("✅ Meses rechazados cargados:", rejectedMonths)

      // Log detallado de cada mes rechazado
      rejectedMonths.forEach((month, index) => {
        console.log(`  ${index + 1}. ${month.name} ${month.year} (ID: ${month.id}) - Estado: ${month.status}`)
      })
    } else {
      console.error("❌ Error cargando meses rechazados:", data.message)
      rejectedMonths = []
    }
  } catch (error) {
    console.error("❌ Error cargando meses rechazados:", error)
    rejectedMonths = []
  }
}

// Cargar deuda acumulada de años anteriores
async function loadDeudaAcumulada() {
  try {
    console.log("🔄 Cargando deuda acumulada desde la API...")
    const response = await fetch(`../../api/get_deuda_acumulada.php${buildHousingQuery()}`)
    const data = await response.json()

    console.log("📡 Respuesta de la API de deuda acumulada:", data)

    if (data.success) {
      // Usar los datos directamente de la respuesta
      deudaAcumulada = {
        total_bs: data.total_bs || 0,
        total_usd: data.total_usd || 0,
        tasa_actual: data.tasa_actual || 0,
        meses_count: 0 // No se usa en este contexto
      }
      console.log("✅ Deuda acumulada cargada:", deudaAcumulada)

      // Actualizar la interfaz si estamos en modo deuda acumulada
      if (currentPaymentType === 'deuda_acumulada') {
        updateDeudaAcumuladaDisplay()
      }
    } else {
      console.error("❌ Error cargando deuda acumulada:", data.message)
      deudaAcumulada = { total_bs: 0, total_usd: 0, tasa_actual: 0, meses_count: 0 }
    }
  } catch (error) {
    console.error("❌ Error cargando deuda acumulada:", error)
    deudaAcumulada = { total_bs: 0, total_usd: 0, tasa_actual: 0, meses_count: 0 }
  }
}

// Cerrar sesión
async function logout() {
  try {
    const response = await fetch("../../api/logout.php", {
      method: "POST",
    })
    const data = await response.json()

    if (data.success) {
      window.location.href = "/pages/auth/index.html"
    }
  } catch (error) {
    console.error("Error cerrando sesión:", error)
    window.location.href = "/pages/auth/index.html"
  }
}

// Cargar meses disponibles dinámicamente - Sin base de datos
async function loadAvailableMonths() {
  const selectedYear = document.getElementById("yearSelect").value
  const monthsGrid = document.getElementById("monthsGrid")
  const loadingModal = document.getElementById("loadingOverlay")

  console.log("Generando meses dinámicamente para el año:", selectedYear)
  console.log("🏠 Datos completos de currentHousing:", currentHousing)

  // Mostrar modal de carga
  if (loadingModal) {
    loadingModal.classList.add('active')
  }
  if (monthsGrid) {
    monthsGrid.style.display = "none"
  }
  
  // Cargar montos de periodos para el año seleccionado
  await loadPeriodosMontos(selectedYear)

  // Obtener fecha actual
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // getMonth() devuelve 0-11, necesitamos 1-12

  // Generar los 12 meses dinámicamente con estado inteligente
  const months = [
    { name: "Enero", number: 1, status: getMonthStatus(1, currentYear, currentMonth, selectedYear) },
    { name: "Febrero", number: 2, status: getMonthStatus(2, currentYear, currentMonth, selectedYear) },
    { name: "Marzo", number: 3, status: getMonthStatus(3, currentYear, currentMonth, selectedYear) },
    { name: "Abril", number: 4, status: getMonthStatus(4, currentYear, currentMonth, selectedYear) },
    { name: "Mayo", number: 5, status: getMonthStatus(5, currentYear, currentMonth, selectedYear) },
    { name: "Junio", number: 6, status: getMonthStatus(6, currentYear, currentMonth, selectedYear) },
    { name: "Julio", number: 7, status: getMonthStatus(7, currentYear, currentMonth, selectedYear) },
    { name: "Agosto", number: 8, status: getMonthStatus(8, currentYear, currentMonth, selectedYear) },
    { name: "Septiembre", number: 9, status: getMonthStatus(9, currentYear, currentMonth, selectedYear) },
    { name: "Octubre", number: 10, status: getMonthStatus(10, currentYear, currentMonth, selectedYear) },
    { name: "Noviembre", number: 11, status: getMonthStatus(11, currentYear, currentMonth, selectedYear) },
    { name: "Diciembre", number: 12, status: getMonthStatus(12, currentYear, currentMonth, selectedYear) }
  ]

  await displayMonthsDynamic(months, selectedYear)
}

// Función para determinar el estado del mes basado en la fecha actual y pagos
function normalizeMonthStatus(month) {
  if (!month || !month.status) return 'unpaid'
  const status = month.status
  if (status === 'paid') return 'paid'
  if (status === 'verifying' || status === 'pending') return 'verifying'
  if (status === 'partial') return 'partial'
  if (status === 'rejected') return 'rejected'
  return 'unpaid'
}

function getMonthStatus(monthNumber, currentYear, currentMonth, selectedYear) {
  const selectedYearInt = parseInt(selectedYear)
  const monthName = getMonthName(monthNumber)

  console.log(`🔍 Verificando mes ${monthName} (ID: ${monthNumber}) para año ${selectedYearInt}`)

  // PRIMERO: Verificar si el mes está pendiente de verificación (AMARILLO)
  console.log(`🔍 Verificando en pendingMonths (${pendingMonths.length} meses):`, pendingMonths)
  const isPending = pendingMonths.some(pendingMonth => {
    const match = pendingMonth.id === monthNumber &&
      pendingMonth.name === monthName &&
      pendingMonth.year === selectedYearInt
    if (match) {
      console.log(`✅ MATCH encontrado:`, pendingMonth)
    }
    return match
  })

  if (isPending) {
    console.log(`🟡 MES VERIFICANDO: ${monthName} ${selectedYearInt} - AMARILLO`)
    return "verifying"
  }

  // SEGUNDO: Verificar si el mes ya está pagado (VERDE) o es pago parcial (ROJO)
  const paidMonth = paidMonths.find(paidMonth => {
    return paidMonth.id === monthNumber &&
      paidMonth.name === monthName &&
      paidMonth.year === selectedYearInt
  })

  if (paidMonth) {
    if (paidMonth.status === 'verifying') {
      console.log(`🟡 MES EN VERIFICACIÓN: ${monthName} ${selectedYearInt}`)
      return "verifying"
    }

    if (paidMonth.status === 'partial' && paidMonth.monto_restante_usd > 0) {
      console.log(`🟠 MES PAGO PARCIAL: ${monthName} ${selectedYearInt} - VERIFICACIÓN (Restante: $${paidMonth.monto_restante_usd} USD)`)
      return "partial"
    } else if (paidMonth.status === 'paid') {
      console.log(`🟢 MES PAGADO COMPLETO: ${monthName} ${selectedYearInt} - VERDE`)
      return "paid"
    }
  }

  // TERCERO: Verificar si el mes fue rechazado (ROJO)
  const isRejected = rejectedMonths.some(rejectedMonth => {
    return rejectedMonth.id === monthNumber &&
      rejectedMonth.name === monthName &&
      rejectedMonth.year === selectedYearInt
  })

  if (isRejected) {
    console.log(`🔴 MES RECHAZADO: ${monthName} ${selectedYearInt} - ROJO`)
    return "rejected"
  }

  console.log(`❌ MES NO PAGADO: ${monthName} ${selectedYearInt}`)

  // Si no está pagado ni pendiente, determinar estado basado en fechas
  if (selectedYearInt < currentYear) {
    return "unpaid"
  }

  if (selectedYearInt > currentYear) {
    return "unpaid" // Cambiar a "unpaid" para permitir pagos adelantados
  }

  // Año actual - determinar según el mes
  if (monthNumber < currentMonth) {
    return "unpaid"
  } else if (monthNumber === currentMonth) {
    return "unpaid"
  } else {
    return "unpaid" // Cambiar a "unpaid" para permitir pagos adelantados
  }
}

// Función auxiliar para obtener el nombre del mes
function getMonthName(monthNumber) {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]
  return months[monthNumber - 1]
}

// Función auxiliar para calcular el total
function calculateTotal(months, method) {
  let total = 0
  months.forEach((month) => {
    // Verificar si es un mes con pago parcial
    const selectedYear = document.getElementById("yearSelect").value
    const paidMonth = paidMonths.find(pm =>
      pm.id === month.id &&
      pm.name === month.name &&
      pm.year === parseInt(selectedYear) &&
      pm.status === 'partial'
    )

    if (paidMonth && method === "bs") {
      const remainingUsd = paidMonth.monto_restante_usd || 0
      total += calculateBsFromUsd(remainingUsd)
    } else if (paidMonth && method === "usd") {
      // Para USD, usar directamente el monto restante en USD
      const remainingUsd = paidMonth.monto_restante_usd || 0
      total += remainingUsd
    } else {
      // Obtener monto dinámico del periodo
      const selectedYear = document.getElementById("yearSelect")?.value || new Date().getFullYear()
      const fechaPeriodo = `${selectedYear}-${String(month.id).padStart(2, '0')}-01`
      const monthUsd = periodosMontos[fechaPeriodo] || month.usdAmount || 0
      if (method === "bs") {
        total += calculateBsFromUsd(monthUsd)
      } else {
        total += monthUsd
      }
    }
  })
  return total
}

// Mostrar meses dinámicamente
async function displayMonthsDynamic(months, selectedYear) {
  const monthsGrid = document.getElementById("monthsGrid")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const currentYear = new Date().getFullYear()

  monthsGrid.innerHTML = ""

  // Mostrar los meses - procesar secuencialmente para asegurar que los montos se cargan
  for (const month of months) {
    const monthCard = document.createElement("div")

    // Usar el estado que ya calculó getMonthStatus
    const finalStatus = normalizeMonthStatus(month)

    // Obtener monto dinámico del periodo
    const fechaPeriodo = `${selectedYear}-${String(month.number).padStart(2, '0')}-01`
    const montoUsd = periodosMontos[fechaPeriodo] || await getPeriodoAmount(selectedYear, month.number) || 0
    
    console.log(`📅 Mostrando mes ${month.name}: estado = ${finalStatus}, monto = ${montoUsd} USD`)

    monthCard.className = `month-card ${finalStatus}`
    monthCard.onclick = () =>
      toggleMonthSelection(
        month.number,
        monthCard,
        calculateBsFromUsd(montoUsd), // Monto en Bs calculado
        montoUsd, // Monto en USD desde periodo
        month.name
      )

    const statusText = {
      paid: "Pagado",
      partial: "Pago Parcial",
      unpaid: "Pendiente",
      pending: "Verificando",
      verifying: "Verificando",
      future: "Pendiente",
      rejected: "Rechazado",
    }

    const statusIcon = {
      paid: "fas fa-check-circle",
      partial: "fas fa-hourglass-half",
      unpaid: "fas fa-clock",
      pending: "fas fa-hourglass-half",
      verifying: "fas fa-hourglass-half",
      future: "fas fa-clock",
      rejected: "fas fa-times-circle",
    }

    // Obtener información de pago parcial si existe
    let amountDisplay = `${montoUsd} USD`
    console.log(`💲 Mes ${month.name}: Mostrando monto ${montoUsd} USD`)
    const paidMonthData = paidMonths.find(pm =>
      pm.id === month.number &&
      pm.name === month.name &&
      pm.year === parseInt(selectedYear)
    )

    if (finalStatus === 'partial' || finalStatus === 'verifying') {
      const remainingUsd = (paidMonthData?.monto_restante_usd ?? month.monto_restante_usd ?? 0).toFixed(2)
      const paidUsd = (paidMonthData?.monto_pagado_usd ?? month.monto_pagado_usd ?? 0).toFixed(2)
      const totalUsd = (paidMonthData?.monto_total_usd ?? month.monto_total_usd ?? montoUsd).toFixed(2)

      amountDisplay = `
        <div class="partial-payment-info">
          <div class="remaining-amount">Restante: $${remainingUsd} USD</div>
          <div class="paid-amount">Pagado: $${paidUsd} USD</div>
          <div class="total-amount">Total: $${totalUsd} USD</div>
        </div>
      `
    }

    monthCard.innerHTML = `
            <h4>${month.name}</h4>
            <div class="month-status">
                <i class="${statusIcon[finalStatus]}"></i>
                ${statusText[finalStatus]}
            </div>
            <div class="month-amount">
                ${amountDisplay}
            </div>
        `

    monthsGrid.appendChild(monthCard)
  }

  // Simular tiempo de carga y luego mostrar los meses
  setTimeout(() => {
    const loadingModal = document.getElementById("loadingOverlay")
    if (loadingModal) {
      loadingModal.classList.remove('active')
    }
    monthsGrid.style.display = "grid"
  }, 800) // 800ms de delay para mostrar el spinner
}

// Mostrar alerta bonita
function showBeautifulAlert(title, message, type = "info") {
  // Crear el modal de alerta
  const alertModal = document.createElement("div")
  alertModal.className = "beautiful-alert-modal"
  alertModal.innerHTML = `
    <div class="beautiful-alert-content">
      <div class="beautiful-alert-header ${type}">
        <div class="beautiful-alert-icon">
          ${type === "info" ? "✅" : type === "warning" ? "⏳" : "❌"}
        </div>
        <h3>${title}</h3>
      </div>
      <div class="beautiful-alert-body">
        <p>${message}</p>
      </div>
      <div class="beautiful-alert-footer">
        <button onclick="closeBeautifulAlert()" class="beautiful-alert-btn">
          Entendido
        </button>
      </div>
    </div>
  `

  // Agregar estilos
  alertModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `

  // Agregar al body
  document.body.appendChild(alertModal)

  // Auto-cerrar después de 3 segundos
  setTimeout(() => {
    if (document.body.contains(alertModal)) {
      closeBeautifulAlert()
    }
  }, 3000)
}

// Cerrar alerta bonita
function closeBeautifulAlert() {
  const alertModal = document.querySelector(".beautiful-alert-modal")
  if (alertModal) {
    alertModal.style.animation = "fadeOut 0.3s ease"
    setTimeout(() => {
      if (document.body.contains(alertModal)) {
        document.body.removeChild(alertModal)
      }
    }, 300)
  }
}

// Alternar selección de mes
function toggleMonthSelection(monthId, element, montoBs, montoDolares, monthName) {
  // Verificar si el mes ya está pagado completamente usando la misma lógica que getMonthStatus
  const selectedYear = document.getElementById("yearSelect").value
  const monthNameFromId = getMonthName(monthId)
  const paidMonth = paidMonths.find(paidMonth =>
    paidMonth.id === monthId &&
    paidMonth.name === monthNameFromId &&
    paidMonth.year === parseInt(selectedYear)
  )

  // Solo bloquear si está completamente pagado (no parcial)
  if (paidMonth && paidMonth.status === 'paid') {
    showBeautifulAlert("✅ Mes ya pagado", `El mes de ${monthName} ya fue pagado completamente y no se puede seleccionar nuevamente.`, "info")
    return
  }

  // Si es pago parcial, permitir selección pero mostrar información
  if (paidMonth && paidMonth.status === 'partial') {
    console.log(`🟠 Seleccionando mes con pago parcial: ${monthName}`)
    console.log(`💰 Monto restante: $${paidMonth.monto_restante_usd} USD`)
  }

  // Verificar si el mes está en estado "verifying" (verificando) - NO SE PUEDE SELECCIONAR
  if (element.classList.contains("verifying")) {
    showBeautifulAlert("⏳ Se está verificando", `El mes de ${monthName} está siendo verificado por el administrador y no se puede seleccionar.`, "warning")
    return
  }

  // Verificar si el mes está en estado "pending" (verificando) o "future" (no disponible)
  if (element.classList.contains("pending")) {
    showBeautifulAlert("⏳ Se está verificando", `El mes de ${monthName} está siendo verificado por el administrador y no se puede seleccionar.`, "warning")
    return
  }

  if (element.classList.contains("future")) {
    showBeautifulAlert("⏳ Mes no disponible", `El mes de ${monthName} aún no está disponible para pago.`, "warning")
    return
  }

  if (element.classList.contains("rejected")) {
    showBeautifulAlert("🔴 Pago rechazado", `El pago del mes de ${monthName} fue rechazado. Puedes volver a pagarlo.`, "error")
    return
  }

  const index = selectedMonths.findIndex((m) => m.id === monthId)

  if (index > -1) {
    // Deseleccionar
    console.log(`❌ Deseleccionando mes ${monthName}`)
    selectedMonths.splice(index, 1)
    element.classList.remove("selected")
  } else {
    // Seleccionar
    console.log(`✅ Seleccionando mes ${monthName}`)

    // Si es un pago parcial, usar el monto restante
    let finalMontoBs = montoBs
    let finalMontoDolares = montoDolares

    if (paidMonth && paidMonth.status === 'partial') {
      finalMontoDolares = paidMonth.monto_restante_usd || 0
      finalMontoBs = calculateBsFromUsd(finalMontoDolares)
      console.log(`💰 Usando monto restante: $${finalMontoDolares.toFixed(2)} USD (${finalMontoBs.toFixed(2)} Bs)`)
    }

    const usdAmount = Number.isFinite(finalMontoDolares) ? finalMontoDolares : montoDolares

    selectedMonths.push({
      id: monthId,
      name: monthName,
      usdAmount: Number.isFinite(usdAmount) ? parseFloat(usdAmount.toFixed(2)) : 0,
      partialRate: paidMonth && paidMonth.status === 'partial' ? (paidMonth.tasa_dolar || dollarRate) : null
    })
    element.classList.add("selected")
  }

  console.log("📋 Meses seleccionados actuales:", selectedMonths)
  console.log("🔘 Llamando a updateNextButton...")

  updateSelectedMonthsInfo()
  updateSelectedSummaryTotals()
  updateNextButton()
}

// Actualizar visibilidad del botón Siguiente
function updateNextButton() {
  const nextButton = document.getElementById("nextButton")
  console.log("🔘 Actualizando botón Siguiente. Meses seleccionados:", selectedMonths.length)
  console.log("🔘 Tipo de pago actual:", currentPaymentType)

  // Solo mostrar el botón si estamos en modo mensualidades
  if (currentPaymentType !== 'mensualidad') {
    console.log("❌ No estamos en modo mensualidades, ocultando botón")
    nextButton.classList.remove("show")
    return
  }

  if (selectedMonths.length > 0) {
    console.log("✅ Mostrando botón Siguiente para mensualidades")
    console.log("🔘 Elemento nextButton:", nextButton)
    console.log("🔘 Clases antes:", nextButton.className)
    nextButton.classList.add("show")
    console.log("🔘 Clases después:", nextButton.className)
    console.log("🔘 Display style:", window.getComputedStyle(nextButton).display)
  } else {
    console.log("❌ Ocultando botón Siguiente")
    nextButton.classList.remove("show")
  }
}

// Mostrar modal de monto personalizado
function showCustomAmountModal() {
  console.log("💰 Mostrando modal de monto personalizado...")

  if (selectedMonths.length === 0) {
    console.log("❌ No hay meses seleccionados")
    return
  }

  // Calcular el monto sugerido
  const method = document.querySelector('input[name="paymentType"]:checked')?.value || 'bs'
  const suggestedAmountEl = document.getElementById("suggestedAmount")
  const currencyLabel = document.getElementById("currencyLabel")
  const customAmountInput = document.getElementById("customPaymentAmount")

  const totalUsd = selectedMonths.reduce((acc, month) => acc + (month.usdAmount || 0), 0)
  const totalBs = calculateBsFromUsd(totalUsd)

  const currency = method === 'bs' ? 'Bs' : 'USD'
  const displayAmount = method === 'bs' ? totalBs : totalUsd
  suggestedAmountEl.textContent = `${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  currencyLabel.textContent = currency
  customAmountInput.value = ""
  customAmountInput.placeholder = `Máximo: ${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  customAmountInput.max = displayAmount

  console.log("💰 Monto sugerido:", displayAmount, currency)
  console.log("📊 Monto máximo permitido:", displayAmount)

  // Mostrar modal
  const modal = document.getElementById("customAmountModal")
  document.body.style.overflow = "hidden"
  modal.style.display = "flex"
  modal.offsetHeight
  setTimeout(() => modal.classList.add("show"), 10)

  console.log("✅ Modal de monto personalizado mostrado")
}

// Cerrar modal de monto personalizado
function closeCustomAmountModal() {
  const modal = document.getElementById("customAmountModal")
  modal.classList.remove("show")
  setTimeout(() => {
    document.body.style.overflow = "auto"
    modal.style.display = "none"
    // NO limpiar customPaymentAmount aquí porque puede ser cancelación o confirmación
  }, 300)
}

// Confirmar monto personalizado y continuar al resumen
function confirmCustomAmount() {
  const customAmountInput = document.getElementById("customPaymentAmount")
  const customAmount = parseFloat(customAmountInput.value)

  if (!customAmount || customAmount <= 0) {
    showCustomAlert("Por favor ingresa un monto válido mayor a 0", 'error')
    return
  }

  // Calcular el monto total máximo permitido
  const method = document.querySelector('input[name="paymentType"]:checked')?.value || 'bs'
  let maxTotal = 0

  selectedMonths.forEach(month => {
    maxTotal += method === 'bs' ? (month.monto_bs || calculateBsFromUsd(20)) : (month.monto_dolares || 20)
  })

  // Validar que no sea mayor al total
  if (customAmount > maxTotal) {
    const currency = method === 'bs' ? 'Bs' : 'USD'
    showCustomAlert(`El monto debe ser menor o igual al monto sugerido: ${maxTotal} ${currency}`, 'error')
    return
  }

  // Guardar el monto personalizado en variable global
  customPaymentAmount = customAmount

  console.log("💰 Monto personalizado confirmado:", customAmount)
  console.log("📊 Monto máximo permitido:", maxTotal)
  console.log("✅ Monto guardado en variable global:", customPaymentAmount)

  // Cerrar este modal y mostrar el resumen
  closeCustomAmountModal()

  setTimeout(() => {
    showSelectionSummary()
  }, 400)
}

// Mostrar resumen de selección
function showSelectionSummary() {
  console.log("📋 Mostrando resumen de selección...")
  console.log("💰 customPaymentAmount actual:", customPaymentAmount)

  const summaryModal = document.getElementById("summaryModal")

  // Prevenir scroll del fondo
  document.body.style.overflow = "hidden"

  // Mostrar el modal de resumen con animación
  summaryModal.style.display = "flex"

  // Forzar reflow para que la animación funcione
  summaryModal.offsetHeight

  setTimeout(() => {
    summaryModal.classList.add("show")

    // Actualizar la información del resumen DESPUÉS de mostrar el modal
    setTimeout(() => {
      updateSummaryInfo()
    }, 50)
  }, 10)
}

// Cerrar modal de resumen
function closeSummaryModal() {
  const summaryModal = document.getElementById("summaryModal")

  // Animar cierre
  summaryModal.classList.remove("show")

  setTimeout(() => {
    // Restaurar scroll del fondo
    document.body.style.overflow = "auto"
    summaryModal.style.display = "none"
  }, 300)
}

// Actualizar información del resumen en el modal
function updateSummaryInfo() {
  console.log("🔄 Actualizando información del resumen...")
  console.log("💰 customPaymentAmount en updateSummaryInfo:", customPaymentAmount)

  const selectedMonthsList = document.getElementById("selectedMonthsList")
  const summaryTotalAmount = document.getElementById("summaryTotalAmount")
  const summaryProcessBtn = document.getElementById("summaryProcessBtn")
  const summaryPaymentMethod = document.getElementById("summaryPaymentMethod")

  if (selectedMonths.length === 0) {
    selectedMonthsList.innerHTML = "<p>No hay meses seleccionados</p>"
    summaryTotalAmount.textContent = "0"
    summaryProcessBtn.disabled = true
    return
  }

  // Mostrar meses seleccionados
  selectedMonthsList.innerHTML = ""
  selectedMonths.forEach((month) => {
    const tag = document.createElement("div")
    tag.className = "selected-month-tag"
    tag.innerHTML = `
            <span>${month.name}</span>
            <button onclick="removeSelectedMonth(${month.id})" class="remove-month">
                <i class="fas fa-times"></i>
            </button>
        `
    selectedMonthsList.appendChild(tag)
  })

  // SIEMPRE usar el monto personalizado si existe
  const paymentMethod = summaryPaymentMethod.value
  let total = customPaymentAmount || 0

  console.log("🔍 Verificando monto personalizado...")
  console.log("   - customPaymentAmount:", customPaymentAmount)
  console.log("   - Total a usar:", total)

  // Si NO hay monto personalizado, calcular el total
  if (!customPaymentAmount || customPaymentAmount <= 0) {
    total = selectedMonths.reduce((acc, month) => acc + (month.usdAmount || 0), 0)
    if (paymentMethod === "bs") {
      total = calculateBsFromUsd(total)
    }
    console.log("📊 Monto calculado automáticamente:", total)
  } else {
    console.log("✅ Usando monto personalizado:", total)
  }

  const displayText = paymentMethod === "bs" ? `${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` : `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

  console.log("🔍 Elemento summaryTotalAmount:", summaryTotalAmount)

  if (summaryTotalAmount) {
    summaryTotalAmount.textContent = displayText
    console.log("✅ Total actualizado en elemento:", summaryTotalAmount.textContent)
  } else {
    console.error("❌ No se encontró el elemento summaryTotalAmount")
  }

  summaryProcessBtn.disabled = false

  console.log("💵 Total mostrado en resumen:", displayText)

  // Agregar listener para cambio de método de pago
  summaryPaymentMethod.addEventListener('change', updateSummaryInfo)
}

// Actualizar información de meses seleccionados (función simplificada)
function updateSelectedMonthsInfo() {
  const selectedMonthsContainer = document.getElementById('selectedMonthsContainer')
  const selectedMonthsList = document.getElementById('selectedMonthsListView')
  if (!selectedMonthsContainer || !selectedMonthsList) return

  if (selectedMonths.length === 0) {
    selectedMonthsContainer.classList.add('hidden')
    selectedMonthsList.innerHTML = '<p>No hay meses seleccionados</p>'
    return
  }

  selectedMonthsContainer.classList.remove('hidden')
  selectedMonthsList.innerHTML = ''

  selectedMonths.forEach(month => {
    const monthElement = document.createElement('div')
    monthElement.className = 'selected-month-item'
    const monthBs = calculateBsFromUsd(month.usdAmount || 0)
    monthElement.innerHTML = `
      <span>${month.name}</span>
      <span>${month.usdAmount.toFixed(2)} USD (${monthBs.toLocaleString()} Bs)</span>
    `
    selectedMonthsList.appendChild(monthElement)
  })
}

function updateSelectedSummaryTotals() {
  const summaryUsdEl = document.getElementById('selectedSummaryUsd')
  const summaryBsEl = document.getElementById('selectedSummaryBs')
  selectedMonthsUsdTotal = selectedMonths.reduce((acc, month) => acc + (month.usdAmount || 0), 0)
  const totalBs = calculateBsFromUsd(selectedMonthsUsdTotal)

  if (summaryUsdEl) {
    summaryUsdEl.textContent = `${selectedMonthsUsdTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  }
  if (summaryBsEl) {
    summaryBsEl.textContent = `${totalBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
  }
}

// Remover mes seleccionado
function removeSelectedMonth(monthId) {
  selectedMonths = selectedMonths.filter((m) => m.id !== monthId)
  document.querySelectorAll(".month-card").forEach((card) => {
    if (card.onclick && card.onclick.toString().includes(monthId)) {
      card.classList.remove("selected")
    }
  })
  updateSelectedMonthsInfo()
  updateNextButton()
  updateSummaryInfo()
}

// Filtrar por año
function filterByYear() {
  loadAvailableMonths()
}

// Mostrar métodos de pago
function showPaymentMethods() {
  console.log("🔍 Verificando meses seleccionados para mostrar métodos de pago...")
  console.log("selectedMonths:", selectedMonths)
  console.log("selectedMonths.length:", selectedMonths.length)

  if (selectedMonths.length === 0) {
    console.log("❌ No hay meses seleccionados")
    alert("Por favor selecciona al menos un mes")
    return
  }

  console.log("✅ Hay meses seleccionados, procediendo...")

  // Calcular total
  const paymentMethod = document.getElementById("summaryPaymentMethod").value
  let total = 0

  // Usar monto personalizado si existe, si no, calcular el total
  if (customPaymentAmount && customPaymentAmount > 0) {
    total = customPaymentAmount
    console.log("💰 Usando monto personalizado:", total)
  } else {
    total = selectedMonths.reduce((acc, month) => acc + (month.usdAmount || 0), 0)
    if (paymentMethod === "bs") {
      total = calculateBsFromUsd(total)
    }
    console.log("📊 Usando monto calculado:", total)
  }

  // Guardar datos del pago
  paymentData = {
    months: selectedMonths,
    method: paymentMethod,
    total: total
  }

  console.log("💾 Datos del pago guardados:", paymentData)

  // Mostrar modal de selección de método
  const paymentMethodModal = document.getElementById("paymentMethodModal")
  console.log("🔍 Modal encontrado:", paymentMethodModal)

  if (paymentMethodModal) {
    // Cerrar modal de resumen
    closeSummaryModal()

    // Mostrar modal de métodos de pago con animación
    setTimeout(async () => {
      // Prevenir scroll del fondo
      document.body.style.overflow = "hidden"

      paymentMethodModal.style.display = "flex"

      // Forzar reflow para que la animación funcione
      paymentMethodModal.offsetHeight

      setTimeout(() => {
        paymentMethodModal.classList.add("show")
      }, 10)

      // Cargar métodos de pago dinámicamente
      await loadPaymentMethods()

      console.log("✅ Modal de métodos de pago mostrado")
    }, 300)
  } else {
    console.log("❌ No se encontró el modal de métodos de pago")
  }
}

// Cargar métodos de pago desde la base de datos
async function loadPaymentMethods() {
  try {
    console.log("🔄 Cargando métodos de pago desde la API...")
    const response = await fetch("../../api/get_payment_methods.php")
    const data = await response.json()

    if (data.success && data.payment_methods) {
      console.log("✅ Métodos de pago cargados:", data.payment_methods)
      displayPaymentMethods(data.payment_methods)
    } else {
      console.error("❌ Error al cargar métodos de pago:", data.message)
      showCustomAlert("Error al cargar métodos de pago", "error")
    }
  } catch (error) {
    console.error("❌ Error al cargar métodos de pago:", error)
    showCustomAlert("Error al cargar métodos de pago", "error")
  }
}

// Mostrar métodos de pago en el modal
function displayPaymentMethods(methods) {
  const grid = document.getElementById("paymentMethodsGrid")

  if (!methods || methods.length === 0) {
    grid.innerHTML = `
      <div class="no-methods">
        <i class="fas fa-exclamation-triangle"></i>
        <p>No hay métodos de pago disponibles</p>
      </div>
    `
    return
  }

  console.log("📋 Mostrando métodos de pago:", methods)

  grid.innerHTML = methods.map(method => `
    <div class="payment-method-card" onclick="selectPaymentMethod('${method.id}')" data-requires-form="${method.requires_form}">
      <div class="method-icon">
        <i class="${method.icon}"></i>
      </div>
      <h4>${method.name}</h4>
      <p>${method.description}</p>
    </div>
  `).join('')
}

// Seleccionar método de pago
function selectPaymentMethod(method) {
  console.log("🔍 Seleccionando método de pago:", method)
  selectedPaymentMethod = method
  closePaymentMethodModal()
  showPaymentInfo()
}

// Mostrar información de pago
function showPaymentInfo() {
  console.log("🔍 Mostrando información de pago...")
  console.log("selectedPaymentMethod:", selectedPaymentMethod)
  console.log("paymentData:", paymentData)

  const paymentDetails = document.getElementById("paymentDetails")
  const modalTotalAmount = document.getElementById("modalTotalAmount")

  console.log("paymentDetails element:", paymentDetails)
  console.log("modalTotalAmount element:", modalTotalAmount)

  // Configurar información según el método seleccionado
  let paymentInfo = ""

  if (!bancoReceptorData) {
    paymentInfo = `<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Cargando datos de pago...</p>`
  } else if (selectedPaymentMethod === "pago_movil") {
    paymentInfo = `
      <p><strong>Teléfono:</strong> ${bancoReceptorData.telefono}</p>
      <p><strong>Cédula:</strong> ${bancoReceptorData.tipo_documento}-${bancoReceptorData.nro_documento}</p>
      <p><strong>Banco:</strong> ${bancoReceptorData.banco_nombre}</p>
      <p><strong>Concepto:</strong> Pago de mensualidades Arcorui</p>
    `
  } else if (selectedPaymentMethod === "transferencia") {
    paymentInfo = `
      <p><strong>Banco:</strong> ${bancoReceptorData.banco_nombre} (${bancoReceptorData.banco_codigo})</p>
      <p><strong>Cuenta:</strong> ${bancoReceptorData.nro_cuenta}</p>
      <p><strong>Titular:</strong> ${bancoReceptorData.tipo_documento}-${bancoReceptorData.nro_documento}</p>
      <p><strong>Teléfono:</strong> ${bancoReceptorData.telefono}</p>
      <p><strong>Concepto:</strong> Pago de mensualidades</p>
    `
  }

  paymentDetails.innerHTML = paymentInfo

  // Mostrar total con opción de monto personalizado
  const totalText = paymentData.method === "bs" ? `${paymentData.total} Bs` : `$${paymentData.total} USD`
  const currency = paymentData.method === "bs" ? "Bs" : "USD"
  const totalValue = paymentData.total

  modalTotalAmount.innerHTML = `
    <div class="total-amount-container">
      <div class="total-calculated">
        <label>Monto Total Calculado:</label>
        <span class="amount-value">${totalText}</span>
      </div>
      <div class="custom-amount-section">
        <label for="customPaymentAmount">¿Deseas pagar un monto diferente?</label>
        <div class="custom-amount-input">
          <input 
            type="number" 
            id="customPaymentAmount" 
            placeholder="Ingresa el monto a pagar"
            min="0"
            step="0.01"
            value="${totalValue}"
          >
          <span class="currency-label">${currency}</span>
        </div>
        <small class="help-text">Puedes ajustar el monto según lo que desees pagar</small>
      </div>
    </div>
  `

  // Mostrar modal
  const paymentInfoModal = document.getElementById("paymentInfoModal")
  console.log("paymentInfoModal element:", paymentInfoModal)

  if (paymentInfoModal) {
    // Prevenir scroll del fondo
    document.body.style.overflow = "hidden"

    paymentInfoModal.style.display = "flex"

    // Forzar reflow para que la animación funcione
    paymentInfoModal.offsetHeight

    setTimeout(() => {
      paymentInfoModal.classList.add("show")
    }, 10)

    console.log("✅ Modal de información de pago mostrado")
  } else {
    console.log("❌ No se encontró el modal de información de pago")
  }
}

// Mostrar formulario de registro
function showPaymentForm() {
  console.log("🔍 Mostrando formulario de registro de pago...")
  console.log("selectedMonths antes de mostrar formulario:", selectedMonths)
  console.log("paymentData antes de mostrar formulario:", paymentData)

  // Capturar el monto personalizado si existe
  const customAmountInput = document.getElementById("customPaymentAmount")
  if (customAmountInput && customAmountInput.value) {
    const customAmount = parseFloat(customAmountInput.value)
    if (customAmount > 0) {
      paymentData.total = customAmount
      console.log("💰 Monto personalizado aplicado:", customAmount)
    }
  }

  closePaymentInfoModal()

  setTimeout(() => {
    const paymentFormModal = document.getElementById("paymentFormModal")

    if (paymentFormModal) {
      // Prevenir scroll del fondo
      document.body.style.overflow = "hidden"

      paymentFormModal.style.display = "flex"

      // Forzar reflow para que la animación funcione
      paymentFormModal.offsetHeight

      setTimeout(() => {
        paymentFormModal.classList.add("show")
      }, 10)

      console.log("✅ Modal de formulario de pago mostrado")
    } else {
      console.log("❌ No se encontró el modal de formulario de pago")
    }

    // Configurar el formulario según el método seleccionado
    setupPaymentForm()
  }, 300)
}

// Configurar formulario de pago
function setupPaymentForm() {
  console.log("🔧 Configurando formulario de pago...")
  console.log("selectedMonths en setupPaymentForm:", selectedMonths)
  console.log("paymentData en setupPaymentForm:", paymentData)

  // Configurar validaciones y eventos
  const form = document.getElementById("paymentRegistrationForm")
  const fileInput = document.getElementById("comprobante")
  const imagePreview = document.getElementById("imagePreview")
  const previewImg = document.getElementById("previewImg")

  // Evento para mostrar preview de imagen
  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = function (e) {
        previewImg.src = e.target.result
        imagePreview.style.display = "block"
      }
      reader.readAsDataURL(file)
    }
  })

  // Asegurar que tenemos los datos antes de configurar el formulario
  if (!paymentData || !paymentData.months || paymentData.months.length === 0) {
    console.log("⚠️ Reconstruyendo paymentData en setupPaymentForm...")

    if (selectedMonths && selectedMonths.length > 0) {
      const summaryPaymentMethod = document.getElementById("summaryPaymentMethod")
      const paymentMethod = summaryPaymentMethod ? summaryPaymentMethod.value : "bs"

      let total = selectedMonths.reduce((acc, month) => acc + (month.usdAmount || 0), 0)
      if (paymentMethod === "bs") {
        total = calculateBsFromUsd(total)
      }

      paymentData = {
        months: selectedMonths,
        method: paymentMethod,
        total: total
      }

      console.log("✅ paymentData reconstruido en setupPaymentForm:", paymentData)
    } else {
      console.log("❌ No se pueden reconstruir los datos, selectedMonths vacío")
    }
  }

  // Evento de envío del formulario
  form.addEventListener("submit", handlePaymentRegistration)
}

// Manejar registro de pago
async function handlePaymentRegistration(e) {
  e.preventDefault()

  console.log("🔍 Verificando datos del pago...")
  console.log("paymentData:", paymentData)
  console.log("selectedMonths:", selectedMonths)
  console.log("selectedMonths.length:", selectedMonths ? selectedMonths.length : "undefined")

  // Asegurar que siempre tenemos los datos del pago
  if (!paymentData || !paymentData.months || paymentData.months.length === 0) {
    console.log("⚠️ paymentData vacío, reconstruyendo desde selectedMonths...")

    if (selectedMonths && selectedMonths.length > 0) {
      // Obtener el método de pago del modal de resumen
      const summaryPaymentMethod = document.getElementById("summaryPaymentMethod")
      const paymentMethod = summaryPaymentMethod ? summaryPaymentMethod.value : "bs"

      let total = 0
      selectedMonths.forEach((month) => {
        if (paymentMethod === "bs") {
          total += month.monto_bs
        } else {
          total += month.usdAmount
        }
      })

      paymentData = {
        months: selectedMonths,
        method: paymentMethod,
        total: total
      }

      console.log("✅ paymentData reconstruido:", paymentData)
    } else {
      console.log("❌ No se encontraron selectedMonths o está vacío")
      console.log("selectedMonths:", selectedMonths)

      // Intentar reconstruir desde el DOM si selectedMonths está vacío
      const selectedElements = document.querySelectorAll('.month-card.selected')
      if (selectedElements.length > 0) {
        console.log("🔄 Reconstruyendo desde elementos seleccionados en el DOM...")
        const reconstructedMonths = []

        selectedElements.forEach(element => {
          const monthId = parseInt(element.getAttribute('data-month-id'))
          const monthName = element.querySelector('h4').textContent
          const defaultUsd = currentHousing?.montoMensualUsd || 15
          const montoBs = calculateBsFromUsd(defaultUsd)
          const montoDolares = defaultUsd

          reconstructedMonths.push({
            id: monthId,
            name: monthName,
            usdAmount: defaultUsd
          })
        })

        if (reconstructedMonths.length > 0) {
          selectedMonths = reconstructedMonths
          const summaryPaymentMethod = document.getElementById("summaryPaymentMethod")
          const paymentMethod = summaryPaymentMethod ? summaryPaymentMethod.value : "bs"

          let total = selectedMonths.reduce((acc, month) => acc + (month.usdAmount || 0), 0)
          if (paymentMethod === "bs") {
            total = calculateBsFromUsd(total)
          }

          paymentData = {
            months: selectedMonths,
            method: paymentMethod,
            total: total
          }

          console.log("✅ Datos reconstruidos desde DOM:", paymentData)
        } else {
          alert("Error: No se encontraron meses seleccionados. Por favor, regresa y selecciona los meses nuevamente.")
          return
        }
      } else {
        alert("Error: No se encontraron meses seleccionados. Por favor, regresa y selecciona los meses nuevamente.")
        return
      }
    }
  }

  const formData = new FormData(e.target)
  const fileInput = document.getElementById("comprobante")

  // Validar que se haya seleccionado una imagen
  if (!fileInput.files[0]) {
    alert("Por favor selecciona una foto del comprobante")
    return
  }

  // Agregar datos adicionales
  formData.append("payment_method", selectedPaymentMethod)
  formData.append("months", JSON.stringify(paymentData.months))
  formData.append("currency", paymentData.method)
  formData.append("total", paymentData.total)
  formData.append("comprobante", fileInput.files[0])

  console.log("📤 Enviando datos al servidor:")
  console.log("  - Meses:", paymentData.months)
  console.log("  - Método:", paymentData.method)
  console.log("  - Total:", paymentData.total)
  console.log("  - selectedPaymentMethod:", selectedPaymentMethod)
  console.log("  - JSON de meses:", JSON.stringify(paymentData.months))

  try {
    const response = await fetch("../../api/process_payment.php", {
      method: "POST",
      body: formData
    })

    const data = await response.json()

    if (data.success) {
      console.log("Pago procesado exitosamente, actualizando vista...")

      // Cerrar modal de formulario
      closePaymentFormModal()

      // Actualizar meses a amarillo "Verificando" inmediatamente
      updateMonthsToVerifying()

      // Mostrar mensaje de verificación por 2 segundos
      showVerificationMessage()

      // Después de 2 segundos, mostrar mensaje de éxito y recargar datos
      setTimeout(async () => {
        hideVerificationMessage()

        // Recargar meses pendientes para actualizar la vista
        await loadPendingMonths()
        loadAvailableMonths()

        // Mostrar mensaje de éxito después de actualizar la vista
        showSuccessModal(data)
      }, 2000)

    } else {
      alert("Error al registrar el pago: " + data.message)
    }
  } catch (error) {
    console.error("Error:", error)
    alert("Error al registrar el pago")
  }
}

// Actualizar meses seleccionados a estado "Verificando" (amarillo)
function updateMonthsToVerifying() {
  console.log('Actualizando meses a estado "Verificando"...')

  if (selectedMonths && selectedMonths.length > 0) {
    const yearSelect = document.getElementById('yearSelect')
    const selectedYearInt = yearSelect ? parseInt(yearSelect.value, 10) : new Date().getFullYear()

    selectedMonths.forEach(month => {
      // Registrar el mes en la lista de pendientes si aún no está
      const alreadyPending = pendingMonths.some(pendingMonth =>
        pendingMonth.id === month.id &&
        pendingMonth.name === month.name &&
        pendingMonth.year === selectedYearInt
      )

      if (!alreadyPending) {
        pendingMonths.push({
          id: month.id,
          name: month.name,
          year: selectedYearInt,
          status: 'verificando',
          created_at: new Date().toISOString()
        })
      }

      // Buscar el elemento del mes por su contenido de texto
      const monthElements = document.querySelectorAll('.month-card')
      monthElements.forEach(element => {
        const monthTitle = element.querySelector('h4')
        if (monthTitle && monthTitle.textContent.trim() === month.name) {
          console.log(`Actualizando mes ${month.name} a estado verifying`)

          // Remover todas las clases de estado
          element.classList.remove('unpaid', 'paid', 'pending', 'future', 'rejected', 'verifying', 'partial', 'selected', 'partial-payment')
          element.classList.add('verifying')

          // Actualizar el texto del estado
          const statusElement = element.querySelector('.month-status')
          if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-hourglass-half"></i> Verificando'
          }
        }
      })
    })
  }
}

// Actualizar meses pagados a verde
async function updatePaidMonths() {
  console.log('Actualizando meses pagados...')

  // Recargar meses pagados desde la base de datos
  await loadPaidMonths()

  // Actualizar la vista de meses después de cargar los datos
  loadAvailableMonths()

  console.log('Meses pagados actualizados desde la base de datos')
}

// Mostrar modal de éxito
function showSuccessModal(data) {
  // Mostrar modal de éxito inmediatamente
  const successModal = document.getElementById("successModal")
  if (successModal) {
    // Prevenir scroll del fondo
    document.body.style.overflow = "hidden"

    successModal.style.display = "flex"

    // Forzar reflow para que la animación funcione
    successModal.offsetHeight

    setTimeout(() => {
      successModal.classList.add("show")
    }, 10)
  }
}

// Funciones para cerrar modales
function closePaymentMethodModal() {
  const paymentMethodModal = document.getElementById("paymentMethodModal")

  // Animar cierre
  paymentMethodModal.classList.remove("show")

  setTimeout(() => {
    // Restaurar scroll del fondo
    document.body.style.overflow = "auto"
    paymentMethodModal.style.display = "none"
  }, 300)
}

function closePaymentInfoModal() {
  const paymentInfoModal = document.getElementById("paymentInfoModal")

  // Animar cierre
  paymentInfoModal.classList.remove("show")

  setTimeout(() => {
    // Restaurar scroll del fondo
    document.body.style.overflow = "auto"
    paymentInfoModal.style.display = "none"
  }, 300)
}

function closePaymentFormModal() {
  const paymentFormModal = document.getElementById("paymentFormModal")

  // Animar cierre
  paymentFormModal.classList.remove("show")

  setTimeout(() => {
    // Restaurar scroll del fondo
    document.body.style.overflow = "auto"
    paymentFormModal.style.display = "none"
    // Limpiar formulario
    document.getElementById("paymentRegistrationForm").reset()
    document.getElementById("imagePreview").style.display = "none"
  }, 300)
}

function closeSuccessModal() {
  const successModal = document.getElementById("successModal")

  // Animar cierre
  successModal.classList.remove("show")

  setTimeout(() => {
    // Restaurar scroll del fondo
    document.body.style.overflow = "auto"
    successModal.style.display = "none"

    // Limpiar selección pero NO recargar los meses para mantener el estado verde
    clearSelection()
    updateSelectedMonthsInfo()
  }, 300)
}

// Remover imagen
function removeImage() {
  document.getElementById("comprobante").value = ""
  document.getElementById("imagePreview").style.display = "none"
}

// Procesar pago (función original mantenida para compatibilidad)
async function processPayment() {
  if (selectedMonths.length === 0) {
    alert("Por favor selecciona al menos un mes")
    return
  }

  const paymentMethod = document.getElementById("paymentMethod").value

  // Mostrar estado "Verificando"
  showVerifyingStatus()

  try {
    const response = await fetch("../../api/process_payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        months: selectedMonths,
        method: paymentMethod,
      }),
    })

    const data = await response.json()

    if (data.success) {
      hideVerifyingStatus()
      closePaymentFormModal()
      showSuccessModal()
    } else {
      hideVerifyingStatus()
      alert("Error: " + data.message)
    }
  } catch (error) {
    console.error("Error procesando pago:", error)
    hideVerifyingStatus()
    alert("Error procesando pago")
  }
}

// Mostrar estado "Verificando"
function showVerifyingStatus() {
  const verifyingModal = document.getElementById("verifyingModal")
  if (verifyingModal) {
    verifyingModal.style.display = "flex"
    setTimeout(() => {
      verifyingModal.classList.add("show")
    }, 10)
  }
}

// Ocultar estado "Verificando"
function hideVerifyingStatus() {
  const verifyingModal = document.getElementById("verifyingModal")
  if (verifyingModal) {
    verifyingModal.classList.remove("show")
    setTimeout(() => {
      verifyingModal.style.display = "none"
    }, 300)
  }
}

// Mostrar mensaje de verificación personalizado
function showVerificationMessage() {
  // Crear notificación flotante en la esquina superior derecha
  const notification = document.createElement("div")
  notification.className = "verification-notification"
  notification.innerHTML = `
    <div class="verification-notification-content">
      <div class="verification-notification-icon">
        <i class="fas fa-hourglass-half fa-spin"></i>
      </div>
      <div class="verification-notification-text">
        <h4>Verificando Pago</h4>
        <p>Tu pago está siendo procesado...</p>
      </div>
      <div class="verification-notification-progress">
        <div class="progress-bar"></div>
      </div>
    </div>
  `

  // Agregar estilos para notificación flotante
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ffc107, #ffb300);
    color: #856404;
    padding: 0;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(255, 193, 7, 0.4);
    z-index: 10000;
    animation: slideInRight 0.5s ease, pulse-verifying 2s infinite;
    max-width: 350px;
    min-width: 300px;
    border: 2px solid rgba(255, 193, 7, 0.3);
    backdrop-filter: blur(10px);
  `

  // Agregar al body
  document.body.appendChild(notification)

  // Auto-remover después de 2 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = "slideOutRight 0.5s ease"
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 500)
    }
  }, 2000)
}

// Ocultar mensaje de verificación
function hideVerificationMessage() {
  const notification = document.querySelector(".verification-notification")
  if (notification) {
    notification.style.animation = "slideOutRight 0.5s ease"
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 500)
  }
}

// Cambiar método de pago
const paymentMethodSelect = document.getElementById("paymentMethod") || document.getElementById("summaryPaymentMethod")
if (paymentMethodSelect) {
  paymentMethodSelect.addEventListener("change", updateSelectedMonthsInfo)
}

function clearSelection() {
  selectedMonths = []
  customPaymentAmount = null // Limpiar monto personalizado
  document.querySelectorAll(".month-card.selected").forEach((card) => {
    card.classList.remove("selected")
  })
  updateSelectedMonthsInfo()
  console.log("🧹 Selección limpiada, monto personalizado reseteado")
}

// Proceder al procesamiento de pago
function launchPaymentProcess(page = "procesar_pago.html") {
  if (selectedMonths.length === 0) {
    showBeautifulAlert("📭 Sin meses seleccionados", "Selecciona al menos un mes para continuar", "warning")
    return
  }

  // Calcular el monto sugerido
  let totalUsd = 0
  let totalBs = 0
  selectedMonths.forEach(month => {
    totalUsd += month.usdAmount
    totalBs += calculateBsFromUsd(month.usdAmount)
  })

  console.log("💰 Total calculado:", totalUsd)

  // Crear URL con los datos
  const paymentPayload = {
    months: selectedMonths,
    totalUsd,
    totalBs,
    exchangeRate: dollarRate,
    suggestedTotalUsd: totalUsd,
    suggestedTotalBs: totalBs,
    paymentType: currentPaymentType
  }

  try {
    sessionStorage.setItem('pendingPaymentData', JSON.stringify(paymentPayload))
  } catch (error) {
    console.warn('No se pudo guardar pendingPaymentData en sessionStorage desde pagos:', error)
  }

  const url = `${page}`
  console.log("🔗 Redirigiendo a:", url, paymentPayload)
  window.location.href = url
}

if (typeof window !== 'undefined') {
  window.proceedToPaymentProcessing = function () {
    launchPaymentProcess()
  }
}

// Volver al dashboard
function goBack() {
  window.location.href = "../dashboard/dashboard.html"
}

// Seleccionar tipo de pago
function selectPaymentType(type) {
  console.log("🔍 Seleccionando tipo de pago:", type)
  currentPaymentType = type

  // Actualizar botones de opción
  document.querySelectorAll('.payment-option').forEach(option => {
    option.classList.remove('active')
  })
  event.target.closest('.payment-option').classList.add('active')

  // Mostrar/ocultar formularios correspondientes
  const mensualidadForm = document.getElementById('mensualidadForm')
  const deudaAcumuladaForm = document.getElementById('deudaAcumuladaForm')

  if (type === "mensualidad") {
    mensualidadForm.style.display = "block"
    deudaAcumuladaForm.style.display = "none"
    loadAvailableMonths() // Cargar meses cuando se selecciona mensualidades
    // Restaurar el display del botón para mensualidades
    document.getElementById('nextButton').style.display = 'block'
    // Actualizar el botón de pagar para mensualidades
    updateNextButton()
  } else if (type === "deuda_acumulada") {
    mensualidadForm.style.display = "none"
    deudaAcumuladaForm.style.display = "block"
    updateDeudaAcumuladaDisplay() // Actualizar display de deuda acumulada
    // Ocultar el botón de pagar para deuda acumulada
    document.getElementById('nextButton').style.display = 'none'
  }

  // Limpiar selecciones previas
  clearSelection()
  updateNextButton()
}

// Actualizar display de deuda acumulada
async function updateDeudaAcumuladaDisplay() {
  try {
    console.log("🔄 Cargando datos de deuda acumulada...")

    const response = await fetch('../../api/get_deuda_acumulada.php', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    if (!data.success) {
      console.error("❌ Error al cargar deuda acumulada:", data.message)
      showCustomAlert(data.message || "Error al cargar la deuda acumulada", "error")
      return
    }

    // Actualizar variable global
    deudaAcumulada = {
      total_bs: data.total_bs,
      total_usd: data.total_usd,
      tasa_actual: data.tasa_actual
    }

    // Actualizar display
    const deudaTotalBs = document.getElementById('deudaTotalBs')
    const deudaTotalUsd = document.getElementById('deudaTotalUsd')

    if (deudaTotalBs) {
      deudaTotalBs.textContent = `${data.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
    }

    if (deudaTotalUsd) {
      deudaTotalUsd.textContent = `$${data.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    }

    console.log("✅ Display de deuda acumulada actualizado:", deudaAcumulada)

  } catch (error) {
    console.error("❌ Error al cargar deuda acumulada:", error)
    showCustomAlert("Error de conexión al cargar la deuda acumulada", "error")
  }
}

// Seleccionar deuda acumulada para pago
function selectDeudaAcumulada() {
  if (!deudaAcumulada || deudaAcumulada.total_bs === 0) {
    showBeautifulAlert("ℹ️ Sin deuda", "No tienes deuda acumulada de años anteriores.", "info")
    return
  }

  console.log("🔍 Seleccionando deuda acumulada para pago")

  // Crear objeto de deuda para el pago
  const deudaPayment = {
    id: 'deuda_acumulada',
    name: 'Deuda Acumulada',
    usdAmount: deudaAcumulada.total_usd,
    type: 'deuda_acumulada'
  }

  // Limpiar selecciones previas y agregar deuda
  selectedMonths = [deudaPayment]

  // Mostrar resumen inmediatamente (sin depender del botón azul)
  showSelectionSummary()

  console.log("✅ Deuda acumulada seleccionada:", deudaPayment)
}

// Establecer monto personalizado basado en porcentaje
function setCustomAmount(percentage) {
  if (!deudaAcumulada) {
    console.log("⚠️ Deuda acumulada no cargada aún");
    return;
  }

  const customAmountInput = document.getElementById('customAmount');

  if (!customAmountInput) {
    console.log("⚠️ Campo de entrada no encontrado");
    return;
  }

  // Calcular el monto basado en el porcentaje de la deuda en bolívares
  const amount = (deudaAcumulada.total_bs * percentage) / 100;

  // Escribir el monto en el campo
  customAmountInput.value = amount.toFixed(2);

  console.log(`✅ Calculado ${percentage}% de ${deudaAcumulada.total_bs} Bs = ${amount.toFixed(2)} Bs`);

  // Actualizar resumen
  updateCustomPaymentSummary();
}

// Actualizar resumen de pago personalizado
function updateCustomPaymentSummary() {
  const customAmountInput = document.getElementById('customAmount');
  const customPaymentAmount = document.getElementById('customPaymentAmount');
  const payCustomDebtBtn = document.getElementById('payCustomDebtBtn');

  if (!customAmountInput) return;

  const amount = parseFloat(customAmountInput.value) || 0;

  // Actualizar monto a pagar
  customPaymentAmount.textContent = `${amount.toLocaleString()} Bs`;

  // Habilitar/deshabilitar botón de pago
  const isValidAmount = amount > 0;
  if (payCustomDebtBtn) {
    payCustomDebtBtn.disabled = !isValidAmount;
    payCustomDebtBtn.style.opacity = isValidAmount ? '1' : '0.6';
    payCustomDebtBtn.style.cursor = isValidAmount ? 'pointer' : 'not-allowed';
  }
}

// Pagar deuda personalizada
function payCustomDebt() {
  console.log("🔍 Función payCustomDebt llamada");
  console.log("🔍 deudaAcumulada:", deudaAcumulada);

  if (!deudaAcumulada) {
    console.log("❌ No se puede procesar: falta deuda acumulada");
    showCustomAlert("No hay información de deuda acumulada disponible", 'error');
    return;
  }

  // Usar el monto total de la deuda acumulada
  const amount = deudaAcumulada.total_bs;

  if (amount <= 0) {
    showCustomAlert("No hay deuda acumulada para pagar", 'warning');
    return;
  }

  console.log("💳 Procesando pago de deuda acumulada:", { amount, currency: 'bs' });

  // Crear objeto de pago para deuda acumulada
  const debtPayment = {
    id: 'deuda_acumulada',
    name: 'Pago de Deuda Acumulada',
    usdAmount: deudaAcumulada.total_usd,
    type: 'deuda_acumulada',
    customAmount: amount,
    customCurrency: 'bs',
    description: 'Pago de deuda acumulada de años anteriores'
  };

  // Crear array con el pago de deuda
  const debtMonths = [debtPayment];

  console.log("💰 Total calculado para deuda:", amount);

  // Crear URL con los datos de la deuda
  const paymentPayload = {
    months: debtMonths,
    totalUsd: deudaAcumulada.total_usd,
    totalBs: amount,
    exchangeRate: dollarRate,
    suggestedTotalUsd: deudaAcumulada.total_usd,
    suggestedTotalBs: calculateBsFromUsd(deudaAcumulada.total_usd),
    paymentType: 'deuda_acumulada'
  }

  try {
    sessionStorage.setItem('pendingPaymentData', JSON.stringify(paymentPayload))
  } catch (error) {
    console.warn('No se pudo guardar pendingPaymentData para deuda en sessionStorage:', error)
  }

  const url = `procesar_pago.html`
  console.log("🔗 Redirigiendo a procesamiento de pago para deuda:", url, paymentPayload)

  window.location.href = url;
}

// Función de prueba para verificar el pago de deuda acumulada
window.testDebtPayment = function () {
  console.log('🧪 === PRUEBA DE PAGO DE DEUDA ACUMULADA ===');

  // Simular datos de deuda acumulada
  deudaAcumulada = {
    total_bs: 1952.50,
    total_usd: 10.00,
    tasa_actual: 195.25,
    fecha_consulta: new Date().toISOString()
  };

  console.log('📊 Datos de deuda simulados:', deudaAcumulada);

  // Llamar a la función de pago
  payCustomDebt();

  console.log('✅ Prueba de pago de deuda completada');
};

// Inicializar event listeners para pago personalizado
function initializeCustomPaymentListeners() {
  const customAmountInput = document.getElementById('customAmount');

  if (customAmountInput) {
    // Asegurar que el campo esté habilitado
    customAmountInput.disabled = false;
    customAmountInput.readOnly = false;

    // Agregar event listeners
    customAmountInput.addEventListener('input', updateCustomPaymentSummary);
    customAmountInput.addEventListener('keyup', updateCustomPaymentSummary);
    customAmountInput.addEventListener('change', updateCustomPaymentSummary);

    console.log("✅ Campo de entrada configurado:", customAmountInput);
  }

  // Forzar actualización inicial
  setTimeout(() => {
    updateCustomPaymentSummary();
  }, 100);

  console.log("✅ Event listeners de pago personalizado inicializados");
}

// Iniciar actualización automática de estados de pago
function startStatusAutoRefresh() {
  // Actualizar cada 10 segundos
  autoRefreshInterval = setInterval(async () => {
    try {
      await updatePaymentStatuses()
    } catch (error) {
      console.error("Error en actualización automática de estados:", error)
    }
  }, 10000) // 10 segundos
}

// Detener actualización automática
function stopStatusAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
}

// Actualizar estados de pagos
async function updatePaymentStatuses() {
  try {
    console.log("🔄 Verificando actualizaciones de estado de pagos...")
    const response = await fetch(`../../api/get_payment_status_updates.php${buildHousingQuery()}`)
    const data = await response.json()

    if (data.success) {
      const statusUpdates = data.statusUpdates || []

      // Procesar actualizaciones
      let hasChanges = false

      statusUpdates.forEach(update => {
        console.log(`Procesando actualización para mes ${update.name}: ${update.status}`)

        // Verificar si hay cambios en los estados
        if (update.status === 'approved') {
          // Mover de pending a paid
          const pendingIndex = pendingMonths.findIndex(p =>
            p.id === update.id && p.name === update.name
          )
          if (pendingIndex > -1) {
            pendingMonths.splice(pendingIndex, 1)
            paidMonths.push(update)
            hasChanges = true
            console.log(`✅ Pago aprobado: ${update.name}`)
            showStatusChangeNotification(`Pago aprobado: ${update.name}`, 'success')

            // Actualizar inmediatamente el elemento en el DOM
            updateMonthInDOM(update.name, 'paid', 'Pagado', 'fas fa-check-circle')
          }
        } else if (update.status === 'rejected') {
          // Mover de pending a rejected
          const pendingIndex = pendingMonths.findIndex(p =>
            p.id === update.id && p.name === update.name
          )
          if (pendingIndex > -1) {
            pendingMonths.splice(pendingIndex, 1)
            rejectedMonths.push(update)
            hasChanges = true
            console.log(`❌ Pago rechazado: ${update.name}`)
            showStatusChangeNotification(`Pago rechazado: ${update.name}`, 'error')

            // Actualizar inmediatamente el elemento en el DOM
            updateMonthInDOM(update.name, 'rejected', 'Rechazado', 'fas fa-times-circle')
          }
        }
      })

      // Actualizar la vista si hay cambios
      if (hasChanges) {
        loadAvailableMonths()
      }
    }
  } catch (error) {
    console.error("Error actualizando estados de pago:", error)
  }
}

// Función auxiliar para actualizar el mes directamente en el DOM
function updateMonthInDOM(monthName, newStatus, newStatusText, newIcon) {
  const monthElements = document.querySelectorAll('.month-card')
  monthElements.forEach(element => {
    const monthTitle = element.querySelector('h4')
    if (monthTitle && monthTitle.textContent.trim() === monthName) {
      console.log(`Actualizando DOM para mes ${monthName} a estado ${newStatus}`)

      // Remover todas las clases de estado
      element.classList.remove('unpaid', 'paid', 'pending', 'future', 'rejected', 'verifying', 'selected')
      element.classList.add(newStatus)

      // Actualizar el texto del estado
      const statusElement = element.querySelector('.month-status')
      if (statusElement) {
        statusElement.innerHTML = `<i class="${newIcon}"></i> ${newStatusText}`
      }
    }
  })
}

// Mostrar notificación de cambio de estado
function showStatusChangeNotification(message, type) {
  const notification = document.createElement("div")
  notification.className = `status-notification ${type}`
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            <span>${message}</span>
        </div>
    `

  // Estilos
  const bgColor = type === 'success' ? '#4CAF50' : '#f44336'
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `

  document.body.appendChild(notification)

  // Auto-remover después de 4 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = "slideOutRight 0.3s ease"
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }
  }, 4000)
}

// Nota: La funcionalidad de pagos parciales ahora está integrada en paidMonths
// que maneja tanto pagos completos (status: 'confirmado') como parciales (status: 'parcial')

// Limpiar intervalos al salir de la página
window.addEventListener('beforeunload', () => {
  stopStatusAutoRefresh()
})
