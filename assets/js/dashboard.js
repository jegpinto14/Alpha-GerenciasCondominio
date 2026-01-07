// Dashboard principal para Arcorui
let currentUser = null;
let currentHousing = null;
let selectedMonths = [];
let currentYear = new Date().getFullYear();
let selectedPaymentType = null;
let hasRegisteredHousing = false;
let activeHousingId = null;

document.addEventListener('DOMContentLoaded', async function () {
    // Marcar inicio de sesión si no existe
    if (!sessionStorage.getItem('sessionStart')) {
        sessionStorage.setItem('sessionStart', Date.now().toString());
        console.log('🕐 Inicio de sesión marcado:', new Date().toLocaleTimeString());
    }

    // OCULTAR MODAL INMEDIATAMENTE AL CARGAR LA PÁGINA
    const modal = document.getElementById('housingRegistrationModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        console.log("🚫 Modal ocultado inmediatamente al cargar página");
    }

    // Cargar tipos de vivienda desde la base de datos
    await loadTiposVivienda();

    // Primero verificar autenticación y estado de vivienda
    await checkAuth();

    // Luego cargar los datos
    loadUserData();
    await loadHousingData();
    loadPaymentSummary();

    // Agregar listener para el cambio de método de pago
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener('change', updateTotalAmount);
    }
});

async function hydrateHousing(inmuebleId) {
    try {
        const response = await fetch(`../../api/get_housing_FINAL_WORKING.php?inmueble_id=${inmuebleId}`);
        const data = await response.json();

        if (data.success && data.housing) {
            currentHousing = data.housing;
            currentHousing.is_active = true;
            displayHousingInfo();
            return true;
        }
    } catch (error) {
        console.error('Error hidratando vivienda activa:', error);
    }
    return false;
}

async function setActiveHousing(inmuebleId) {
    try {
        const response = await fetch('../../api/set_active_housing.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inmueble_id: inmuebleId })
        });

        const result = await response.json();
        console.log('🗂️ Respuesta de set_active_housing:', result);
        return result;
    } catch (error) {
        console.error('❌ Error persistiendo vivienda activa:', error);
        return { success: false, message: 'Error de conexión al guardar la vivienda activa' };
    }
}

// Función para mostrar alerta de deuda
function showDebtAlert(debtData) {
    console.log('🚨 Mostrando alerta de deuda:', debtData);

    // Crear overlay rojo
    const overlay = document.createElement('div');
    overlay.id = 'debtAlertOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(220, 53, 69, 0.95);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-family: Arial, sans-serif;
    `;

    // Crear mensaje
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        text-align: center;
        padding: 40px;
        background-color: rgba(0, 0, 0, 0.8);
        border-radius: 15px;
        border: 3px solid #fff;
        max-width: 500px;
        margin: 20px;
    `;

    messageDiv.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
        <h2 style="margin-bottom: 20px; color: #ffcccb;">¡ALERTA DE DEUDA!</h2>
        <p style="font-size: 1.2rem; margin-bottom: 15px;">
            Tienes deuda acumulada de años anteriores
        </p>
        <div style="background-color: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 1.1rem; margin: 5px 0;">
                <strong>Deuda Total:</strong> $${debtData.total_usd.toFixed(2)} USD
            </p>
            <p style="font-size: 1.1rem; margin: 5px 0;">
                <strong>Equivalente:</strong> Bs. ${debtData.total_bs.toLocaleString()}
            </p>
        </div>
        <p style="font-size: 1rem; color: #ffcccb; margin-bottom: 30px;">
            Por favor, regulariza tu situación lo antes posible
        </p>
        <div style="display: flex; justify-content: center; align-items: center; margin-top: 20px;">
            <button id="payDebtBtn" style="
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                border: none;
                padding: 18px 35px;
                font-size: 1.2rem;
                font-weight: bold;
                border-radius: 12px;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.5);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 12px;
                position: relative;
                z-index: 10001;
                pointer-events: auto;
                min-width: 200px;
                justify-content: center;
            ">
                <i class="fas fa-credit-card" style="font-size: 1.3rem;"></i>
                PAGAR DEUDA
            </button>
        </div>
    `;

    overlay.appendChild(messageDiv);
    document.body.appendChild(overlay);

    // Remover después de 2 segundos SOLO si no se ha hecho clic en el botón
    let buttonClicked = false;

    setTimeout(() => {
        if (document.body.contains(overlay) && !buttonClicked) {
            overlay.style.transition = 'opacity 0.5s ease-out';
            overlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(overlay);
                console.log('✅ Alerta de deuda removida');
            }, 500);
        }
    }, 2000);

    // Agregar event listener al botón
    setTimeout(() => {
        const payButton = document.getElementById('payDebtBtn');
        if (payButton) {
            payButton.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                buttonClicked = true;
                console.log('💳 Botón PAGAR DEUDA clickeado');
                payDebt();
            });
            console.log('✅ Event listener agregado al botón PAGAR DEUDA');
        }
    }, 100);
}

// Verificar autenticación
async function checkAuth() {
    try {
        const response = await fetch('../../api/check_session.php', {
            method: 'GET',
            credentials: 'same-origin' // Incluir cookies de sesión
        });

        if (!response.ok) {
            // Error de conexión o servidor
            window.location.href = '/pages/auth/index.html';
            return;
        }

        const data = await response.json();

        if (!data.success) {
            // No hay sesión activa
            window.location.href = '/pages/auth/index.html';
            return;
        }

        currentUser = data.user;
        document.getElementById('userName').textContent = currentUser.username;

        // Verificar si es la primera vez (no tiene vivienda)
        console.log("🔍 Verificando vivienda del usuario:", data.has_housing);
        console.log("🔍 Tipo de has_housing:", typeof data.has_housing);
        console.log("🔍 Valor exacto:", data.has_housing);
        console.log("🔍 Comparación con true:", data.has_housing === true);
        console.log("🔍 Comparación con false:", data.has_housing === false);

        // FORZAR OCULTACIÓN DEL MODAL PRIMERO
        const modal = document.getElementById('housingRegistrationModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            console.log("🚫 Modal FORZADO a estar oculto");
        }

        // Guardar el inmueble activo (si existe)
        activeHousingId = data.active_inmueble_id || null;

        // Solo mostrar modal si EXPLÍCITAMENTE no tiene vivienda
        if (data.has_housing === false || data.has_housing === 0 || data.has_housing === "0" || data.has_housing === null || data.has_housing === undefined) {
            console.log("📝 Usuario SIN vivienda, mostrando modal de registro");
            hasRegisteredHousing = false;
            showHousingRegistrationModal();
            // Deshabilitar todas las funciones excepto registro de vivienda
            disableAllFeaturesExceptHousing();
            hideLoadingOverlay();
        } else {
            console.log("✅ Usuario TIENE vivienda o estado incierto, NO mostrar modal");
            console.log("🔒 Modal permanece oculto");
            hasRegisteredHousing = true;
            disableHousingRegistrationModal();
            // Habilitar todas las funciones
            enableAllFeatures();

            // Verificar deuda acumulada si tiene vivienda (solo al iniciar sesión)
            if (data.has_housing === true || data.has_housing === 1 || data.has_housing === "1") {
                await checkDebtAccumulated(true); // true = solo al iniciar sesión
            }
        }

    } catch (error) {
        console.error('Error verificando autenticación:', error);
        // En caso de error, redirigir al login
        window.location.href = '/pages/auth/index.html';
    }
}

// Deshabilitar todas las funciones excepto registro de vivienda
function disableAllFeaturesExceptHousing() {
    console.log("🔒 Deshabilitando todas las funciones excepto registro de vivienda");

    // Deshabilitar botones de pagos
    const paymentButtons = document.querySelectorAll('.card button');
    paymentButtons.forEach(button => {
        if (!button.onclick || !button.onclick.toString().includes('openHousingModal')) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.title = 'Debes registrar tu vivienda primero';
        }
    });

    // Mostrar mensaje informativo
    const cardsGrid = document.querySelector('.cards-grid');
    if (cardsGrid) {
        const infoCard = document.createElement('div');
        infoCard.className = 'card info-card';
        infoCard.innerHTML = `
            <h3><i class="fas fa-info-circle"></i> Información Importante</h3>
            <p>Para acceder a todas las funciones del sistema, primero debes registrar tu vivienda.</p>
            <p>Una vez registrada, podrás realizar pagos, ver recibos y generar reportes.</p>
        `;
        cardsGrid.appendChild(infoCard);
    }
}

// Habilitar todas las funciones
function enableAllFeatures() {
    console.log("✅ Habilitando todas las funciones");

    // Habilitar todos los botones
    const paymentButtons = document.querySelectorAll('.card button');
    paymentButtons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.title = '';
    });

    // Remover mensaje informativo si existe
    const infoCard = document.querySelector('.info-card');
    if (infoCard) {
        infoCard.remove();
    }
}

// Función para verificar deuda acumulada (solo al iniciar sesión)
async function checkDebtAccumulated(onlyOnLogin = false) {
    try {
        console.log('💰 Verificando deuda acumulada...');

        // Si onlyOnLogin es true, verificar si es la primera carga de la sesión
        if (onlyOnLogin) {
            const sessionStart = sessionStorage.getItem('sessionStart');
            const currentTime = Date.now();

            // Si no hay sessionStart o ha pasado más de 5 segundos desde el inicio, no mostrar alerta
            if (!sessionStart || (currentTime - parseInt(sessionStart)) > 5000) {
                console.log('✅ No es el inicio de sesión, omitiendo alerta de deuda');
                return;
            }

            console.log('✅ Es el inicio de sesión, verificando deuda acumulada...');
        }

        const response = await fetch('../../api/get_deuda_acumulada.php', {
            method: 'GET',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            console.log('⚠️ Error obteniendo deuda acumulada');
            return;
        }

        const data = await response.json();
        console.log('💰 Datos de deuda:', data);

        if (data.success && data.total_usd > 1) {
            console.log('🚨 Usuario tiene deuda acumulada mayor a $1 USD:', data.total_usd);
            showDebtAlert(data);
        } else {
            console.log('✅ Usuario sin deuda acumulada significativa');
        }
    } catch (error) {
        console.error('❌ Error verificando deuda acumulada:', error);
    }
}

// Función para manejar el pago de deuda
function payDebt() {
    console.log('💳 Usuario quiere pagar deuda');

    // Cerrar la alerta de deuda
    closeDebtAlert();

    // Abrir el modal de pagos
    setTimeout(() => {
        openPaymentModal();
    }, 500);
}

// Función para cerrar la alerta de deuda manualmente
function closeDebtAlert() {
    const overlay = document.getElementById('debtAlertOverlay');
    if (overlay && document.body.contains(overlay)) {
        overlay.style.transition = 'opacity 0.5s ease-out';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
                console.log('✅ Alerta de deuda cerrada');
            }
        }, 500);
    }
}

// Cargar datos del usuario
async function loadUserData() {
    try {
        const response = await fetch('../../api/get_current_user.php');
        const data = await response.json();

        if (data.success && data.user) {
            currentUser = data.user;

            // Actualizar información del usuario en la interfaz
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = currentUser.username;
            }

            console.log('✅ Datos del usuario actualizados:', currentUser.username);
        } else {
            console.log('⚠️ No se pudieron cargar los datos del usuario');
        }
    } catch (error) {
        console.error('❌ Error cargando datos del usuario:', error);
    }
}

// Cargar datos de vivienda
async function loadHousingData() {
    try {
        // Usar la misma verificación que checkAuth
        const response = await fetch('../../api/check_session.php', {
            method: 'GET',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            console.error('Error verificando sesión');
            return;
        }

        const data = await response.json();

        if (data.success) {
            console.log("🏠 Estado de vivienda del usuario:", data.has_housing);
            console.log("📊 Total de inmuebles:", data.total_inmuebles || 0);
            console.log("⭐ Inmueble activo:", data.active_inmueble_id || null);

            activeHousingId = data.active_inmueble_id || null;

            if (data.has_housing === true || data.has_housing === 1 || data.has_housing === "1") {
                // El usuario tiene vivienda, cargar información detallada
                console.log("🏠 Usuario tiene vivienda, cargando detalles...");
                hasRegisteredHousing = true;
                disableHousingRegistrationModal();

                // Asegurarse de que el modal esté oculto
                const modal = document.getElementById('housingRegistrationModal');
                if (modal) {
                    modal.style.display = 'none';
                    console.log("🚫 Modal ocultado porque usuario tiene vivienda");
                }

                await loadHousingList({ silent: true });
                if (!currentHousing && activeHousingId) {
                    await hydrateHousing(activeHousingId);
                }
                if (!currentHousing) {
                    try {
                        const housingResponse = await fetch('../../api/get_housing.php');
                        const housingData = await housingResponse.json();

                        if (housingData.success && housingData.housing) {
                            const list = Array.isArray(housingData.housing) ? housingData.housing : [housingData.housing];
                            const fallback = list.find(h => h.is_active) || list[0];
                            currentHousing = fallback;
                            activeHousingId = fallback?.inmueble_id || null;
                            displayHousingInfo();
                            console.log("✅ Vivienda cargada correctamente (fallback)");
                        }
                    } catch (housingError) {
                        console.error('Error cargando detalles de vivienda:', housingError);
                    }
                }
            } else {
                // El usuario no tiene vivienda
                console.log("📝 Usuario sin vivienda registrada en loadHousingData");
                currentHousing = null; // Asegurar que currentHousing sea null
                hasRegisteredHousing = false;
                document.getElementById('housingStatus').style.display = 'block';
                document.getElementById('housingInfo').innerHTML =
                    '<p class="alert alert-info">No tienes vivienda registrada. Por favor, regístrate.</p>';
            }
        }
    } catch (error) {
        console.error('Error cargando datos de vivienda:', error);
    }
}

// Mostrar información de vivienda
function displayHousingInfo() {
    if (!currentHousing) {
        console.log('⚠️ No hay información de vivienda para mostrar');
        return;
    }

    console.log('🏠 Mostrando información de vivienda:', currentHousing);
    console.log('🏠 inmueble_id actual:', currentHousing.inmueble_id);
    window.currentHousing = currentHousing;

    const housingInfo = document.getElementById('housingInfo');
    const housingStatus = document.getElementById('housingStatus');

    if (!housingInfo) {
        console.error('❌ Elemento housingInfo no encontrado');
        return;
    }

    console.log('✅ Elemento housingInfo encontrado, actualizando contenido...');

    let info = `
        <div class="housing-info-card">
            <div class="housing-info-header">
                <h4><i class="fas fa-home"></i> ${currentHousing.tipo}</h4>
                <span class="housing-age-badge">${currentHousing.antiguedad || 0} años</span>
            </div>
            <div class="housing-info-body">
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span><strong>Propietario:</strong> ${currentHousing.nombre_propietario || ''} ${currentHousing.apellido_propietario || ''}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-id-card"></i>
                        <span><strong>Cédula:</strong> ${currentHousing.cedula || 'No especificada'}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span><strong>Teléfono:</strong> ${currentHousing.telefono || 'No especificado'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Adquirido:</strong> ${formatDate(currentHousing.fecha_adquirido)}</span>
                    </div>
                </div>
    `;

    // Agregar información específica según el tipo
    if (currentHousing.tipo_entidad === 'apartamento') {
        info += `
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-building"></i>
                        <span><strong>Edificio:</strong> ${currentHousing.nombre_edificio || 'No especificado'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-door-open"></i>
                        <span><strong>Ubicación:</strong> Piso ${currentHousing.piso || 'N/A'} - Apartamento ${currentHousing.numero_apartamento || 'N/A'}</span>
                    </div>
                </div>
                <div class="info-row">

                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span><strong>Email:</strong> ${currentHousing.gmail || 'No especificado'}</span>
                    </div>
                </div>
        `;
    }

    info += `
            </div>
        </div>
    `;

    housingInfo.innerHTML = info;

    if (housingStatus) {
        housingStatus.style.display = 'none';
    }

    console.log('✅ Información de vivienda mostrada correctamente');

    // Verificar que el contenido se actualizó correctamente
    setTimeout(() => {
        const updatedContent = housingInfo.innerHTML;
        if (updatedContent.includes(currentHousing.inmueble_id) || updatedContent.includes(currentHousing.tipo)) {
            console.log('✅ Verificación: El contenido se actualizó correctamente');
        } else {
            console.log('⚠️ Verificación: El contenido NO se actualizó correctamente');
            console.log('🔍 Contenido actual:', updatedContent.substring(0, 200));
        }
    }, 100);
}

// Cargar resumen de pagos
async function loadPaymentSummary() {
    try {
        // Si hay una vivienda seleccionada, usar su inmueble_id
        let url = '../../api/get_payment_stats.php';
        if (currentHousing && currentHousing.inmueble_id) {
            url += `?inmueble_id=${currentHousing.inmueble_id}`;
            console.log('💰 Cargando pagos para inmueble_id:', currentHousing.inmueble_id);
        } else {
            console.log('💰 Cargando pagos generales (sin vivienda seleccionada)');
        }

        console.log('💰 URL del API:', url);
        const response = await fetch(url);

        console.log('💰 Status de respuesta:', response.status);
        console.log('💰 Headers de respuesta:', response.headers.get('content-type'));

        // Verificar si la respuesta es JSON válido
        const responseText = await response.text();
        console.log('💰 Respuesta del servidor (primeros 200 caracteres):', responseText.substring(0, 200));

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Intentar parsear como JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Error parseando JSON:', parseError);
            console.error('❌ Respuesta completa del servidor:', responseText);
            throw new Error('Respuesta del servidor no es JSON válido');
        }

        console.log('💰 Datos parseados:', data);

        if (data.success) {
            displayPaymentSummary(data);
            console.log('✅ Resumen de pagos mostrado correctamente');
        } else {
            console.log('⚠️ API retornó success: false:', data.message);
            // Mostrar mensaje de error en lugar de datos
            const paymentInfo = document.getElementById('paymentInfo');
            if (paymentInfo) {
                paymentInfo.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        Error cargando pagos: ${data.message || 'Error desconocido'}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('❌ Error cargando resumen de pagos:', error);

        // Mostrar mensaje de error en la interfaz
        const paymentInfo = document.getElementById('paymentInfo');
        if (paymentInfo) {
            paymentInfo.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error cargando resumen de pagos: ${error.message}
                </div>
            `;
        }
    }
}

// Mostrar resumen de pagos
function displayPaymentSummary(data) {
    const paymentInfo = document.getElementById('paymentInfo');
    const paymentSummary = document.getElementById('paymentSummary');

    const stats = data.stats;
    const months = data.months;

    // Calcular totales
    const totalUnpaid = stats.unpaid * 50; // 50 Bs por mes
    const totalPaid = stats.paid * 50;
    const totalPending = stats.pending * 50;

    let info = `
        <div class="form-row">
            <div><strong>Meses por Pagar:</strong> <span style="color: #dc3545; font-weight: bold;">${stats.unpaid}</span></div>
            <div><strong>Meses Pagados:</strong> <span style="color: #28a745; font-weight: bold;">${stats.paid}</span></div>
        </div>
        <div class="form-row">
            <div><strong>Meses Pendientes:</strong> <span style="color: #6c757d; font-weight: bold;">${stats.pending}</span></div>
            <div><strong>Total Debe (Bs):</strong> <span style="color: #dc3545; font-weight: bold;">${totalUnpaid.toLocaleString()}</span></div>
        </div>
        <div class="form-row">
            <div><strong>Total Pagado (Bs):</strong> <span style="color: #28a745; font-weight: bold;">${totalPaid.toLocaleString()}</span></div>
            <div><strong>Total Pendiente (Bs):</strong> <span style="color: #6c757d; font-weight: bold;">${totalPending.toLocaleString()}</span></div>
        </div>
    `;

    paymentInfo.innerHTML = info;
    paymentSummary.style.display = 'block';
}

// Función para manejar las pestañas
function openTab(evt, tabName) {
    // Obtener todos los elementos con clase "tab-content" y ocultarlos
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }

    // Obtener todos los elementos con clase "tab-button" y remover la clase "active"
    const tabButtons = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove("active");
    }

    // Mostrar el contenido de la pestaña actual y agregar la clase "active" al botón
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    // Si es la pestaña de seleccionar vivienda, cargar la lista
    if (tabName === 'selectHousingTab') {
        loadHousingList();
    }
}

// Función para cargar la lista de viviendas del usuario
async function populateHeaderHousingDisplay(housingList) {
    const display = document.getElementById('headerHousingDisplay');
    if (!display) {
        return;
    }

    if (!housingList || housingList.length === 0) {
        display.textContent = 'Sin viviendas registradas';
        return;
    }

    const activeId = activeHousingId !== null && activeHousingId !== undefined
        ? parseInt(activeHousingId, 10)
        : null;

    const activeHousing = housingList.find(h => {
        const housingId = parseInt(h.inmueble_id, 10);
        return activeId ? housingId === activeId : h.is_active;
    }) || housingList[0];

    if (activeHousing) {
        display.textContent = `${getHousingLocation(activeHousing)}`;
        sessionStorage.setItem('activeHousingSummary', display.textContent);
        sessionStorage.setItem('activeHousingId', String(parseInt(activeHousing.inmueble_id, 10)));
    } else {
        display.textContent = 'Sin vivienda activa';
        sessionStorage.removeItem('activeHousingSummary');
        sessionStorage.removeItem('activeHousingId');
    }

    // Ocultar overlay de carga cuando se complete
    hideLoadingOverlay();
}

// Función para ocultar el overlay de carga
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

async function loadHousingList({ silent = false, skipHeader = false } = {}) {
    const container = document.getElementById('housingListContainer');
    const headerDisplayExists = !!document.getElementById('headerHousingDisplay');
    try {
        const response = await fetch('../../api/get_housing.php');
        const data = await response.json();

        if (data.success && data.housing && data.housing.length > 0) {
            activeHousingId = data.active_inmueble_id !== null && data.active_inmueble_id !== undefined
                ? parseInt(data.active_inmueble_id, 10)
                : (activeHousingId !== null && activeHousingId !== undefined ? parseInt(activeHousingId, 10) : null);
            container.innerHTML = generateHousingListHTML(data.housing);

            const initialHousing = data.housing.find(h => h.is_active) || data.housing[0];

            if (headerDisplayExists && !skipHeader) {
                populateHeaderHousingDisplay(data.housing);
            }

            if (!silent) {
                if (initialHousing) {
                    currentHousing = initialHousing;
                    activeHousingId = parseInt(initialHousing.inmueble_id, 10);
                    displayHousingInfo();
                    console.log('✅ Vivienda inicial configurada:', initialHousing.tipo);
                }
            } else if (!currentHousing && initialHousing) {
                currentHousing = initialHousing;
                displayHousingInfo();
            }

            refreshHousingSelectionUI();
        } else {
            container.innerHTML = `
                <div class="no-housing-message">
                    <i class="fas fa-home"></i>
                    <h3>No tienes viviendas registradas</h3>
                    <p>Ve a la pestaña "Registrar Nueva Vivienda" para agregar tu primera vivienda.</p>
                </div>
            `;
            // Ocultar overlay si no hay viviendas
            if (headerDisplayExists) {
                hideLoadingOverlay();
            }
        }
    } catch (error) {
        console.error('Error cargando lista de viviendas:', error);
        container.innerHTML = `
            <div class="no-housing-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar viviendas</h3>
                <p>No se pudieron cargar las viviendas. Intenta recargar la página.</p>
            </div>
        `;
        // Ocultar overlay en caso de error
        if (headerDisplayExists) {
            hideLoadingOverlay();
        }
    }
}

// Función para generar el HTML de la lista de viviendas
function generateHousingListHTML(housingList) {
    let html = '<div class="housing-list">';

    const activeId = activeHousingId !== null && activeHousingId !== undefined
        ? parseInt(activeHousingId, 10)
        : null;

    housingList.forEach((housing) => {
        const housingId = parseInt(housing.inmueble_id, 10);
        const isActive = activeId ? housingId === activeId : housing.is_active;
        const tipoIcon = getHousingTypeIcon(housing.tipo);

        const ubicacion = getHousingLocation(housing);
        const housingClasses = `housing-item ${isActive ? 'selected' : ''}`.trim();
        const buttonDisabledAttr = isActive ? 'disabled' : '';
        const buttonSelectedClass = isActive ? 'is-selected' : '';
        const buttonIcon = isActive ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-check"></i>';
        const buttonLabel = isActive ? 'Seleccionado' : 'Seleccionar';
        const badgesHtml = `
            <div class="housing-badges">
                ${isActive ? '<span class="housing-badge housing-badge-active">Activo</span>' : ''}
                <span class="housing-badge housing-badge-age">${housing.antiguedad} años</span>
            </div>
        `;

        html += `
            <div class="${housingClasses}" data-housing-id="${housingId}">
                <div class="housing-item-header">
                    <div class="housing-type">
                        <i class="${tipoIcon}"></i> ${housing.tipo}
                    </div>
                    ${badgesHtml}
                </div>
                <div class="housing-details">
                    <div class="housing-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Adquirido: ${formatDate(housing.fecha_adquirido)}</span>
                    </div>
                    <div class="housing-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${ubicacion}</span>
                    </div>
                </div>
                <div class="housing-actions">
                    <button class="btn btn-primary btn-sm housing-select-button ${buttonSelectedClass}" ${buttonDisabledAttr} onclick="selectHousing(${housingId}, this)">
                        ${buttonIcon} ${buttonLabel}
                    </button>
                    <button class="btn btn-info btn-sm" onclick="viewHousingInfo(${housingId})">
                        <i class="fas fa-eye"></i> Ver Información
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function refreshHousingSelectionUI() {
    const cards = document.querySelectorAll('.housing-item');
    const activeId = activeHousingId !== null && activeHousingId !== undefined
        ? parseInt(activeHousingId, 10)
        : null;

    cards.forEach(card => {
        const cardId = parseInt(card.dataset.housingId, 10);
        const selectButton = card.querySelector('.housing-select-button');
        const activeBadge = card.querySelector('.housing-badge-active');

        if (activeId !== null && !Number.isNaN(activeId) && cardId === activeId) {
            card.classList.add('selected');
            if (selectButton) {
                selectButton.disabled = true;
                selectButton.classList.add('is-selected');
                selectButton.innerHTML = '<i class="fas fa-check-circle"></i> Seleccionado';
            }
            if (!activeBadge) {
                const badgesContainer = card.querySelector('.housing-badges');
                if (badgesContainer) {
                    const badge = document.createElement('span');
                    badge.className = 'housing-badge housing-badge-active';
                    badge.textContent = 'Activo';
                    badgesContainer.insertBefore(badge, badgesContainer.firstChild);
                }
            }
            if (activeBadge) {
                activeBadge.style.display = 'inline-flex';
            }
        } else {
            card.classList.remove('selected');
            if (selectButton) {
                selectButton.disabled = false;
                selectButton.classList.remove('is-selected');
                selectButton.innerHTML = '<i class="fas fa-check"></i> Seleccionar';
            }
            if (activeBadge) {
                activeBadge.style.display = 'none';
            }
        }
    });
}

// Función para obtener el icono según el tipo de vivienda
function getHousingTypeIcon(tipo) {
    const icons = {
        'Apartamento': 'fas fa-building'
    };
    return icons[tipo] || 'fas fa-home';
}

// Función para ver información detallada de una vivienda (solo mostrar, no seleccionar)
async function viewHousingInfo(inmuebleId) {
    try {
        console.log('🔍 Mostrando información detallada para inmueble:', inmuebleId);

        // Cargar detalles de la vivienda
        const response = await fetch(`../../api/get_housing_details.php?inmueble_id=${inmuebleId}`);
        console.log('📡 Respuesta de get_housing_details:', response.status, response.statusText);

        const data = await response.json();
        console.log('📥 Datos recibidos:', data);

        if (data.success && data.housing) {
            // Cargar el contenido en el modal de información
            displayHousingInfoInModal(data.housing);

            // Cerrar el modal de gestión de vivienda
            const housingModal = document.getElementById('housingModal');
            if (housingModal) {
                housingModal.style.display = 'none';
            }

            // Abrir el modal de información de vivienda
            const housingInfoModal = document.getElementById('housingInfoModal');
            if (housingInfoModal) {
                housingInfoModal.classList.add('show');
                housingInfoModal.style.display = 'flex';
                // Deshabilitar scroll del fondo
                document.body.classList.add('modal-open');
            }

            console.log('✅ Modal de información abierto');
        } else {
            console.error('❌ Error en respuesta:', data.message);
            showAlert(`❌ Error al cargar los detalles: ${data.message}`, 'error');
        }

    } catch (error) {
        console.error('❌ Error al cargar información de vivienda:', error);
        showAlert('❌ Error al cargar la información de la vivienda', 'error');
    }
}

// Función para mostrar información de vivienda en el modal (sin cambiar estado global)
function displayHousingInfoInModal(housing) {
    console.log('🏠 Mostrando información de vivienda en modal:', housing);

    const housingInfoContent = document.getElementById('housingInfoContent');

    if (!housingInfoContent) {
        console.error('Elemento housingInfoContent no encontrado');
        return;
    }

    let info = `
        <div class="housing-info-card">
            <div class="housing-info-header">
                <h4><i class="fas fa-home"></i> ${housing.tipo}</h4>
                <span class="housing-age-badge">${housing.antiguedad || 0} años</span>
            </div>
            <div class="housing-info-body">
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span><strong>Propietario:</strong> ${housing.nombre_propietario || ''} ${housing.apellido_propietario || ''}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-id-card"></i>
                        <span><strong>Cédula:</strong> ${housing.cedula || 'No especificada'}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span><strong>Teléfono:</strong> ${housing.telefono || 'No especificado'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Adquirido:</strong> ${formatDate(housing.fecha_adquirido)}</span>
                    </div>
                </div>
    `;

    // Agregar información específica según el tipo
    if (housing.tipo_entidad === 'apartamento') {
        info += `
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-building"></i>
                        <span><strong>Edificio:</strong> ${housing.nombre_edificio || 'No especificado'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-door-open"></i>
                        <span><strong>Ubicación:</strong> Piso ${housing.piso || 'N/A'} - Apartamento ${housing.numero_apartamento || 'N/A'}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span><strong>Email:</strong> ${housing.gmail || 'No especificado'}</span>
                    </div>
                </div>
        `;
    }

    info += `
            </div>
        </div>
    `;

    housingInfoContent.innerHTML = info;
}

// Función para mostrar información de vivienda desde datos específicos (sin cambiar estado global)
function displayHousingInfoFromData(housing) {
    console.log('🏠 Mostrando información de vivienda desde datos:', housing);

    const housingInfo = document.getElementById('housingInfo');

    if (!housingInfo) {
        console.error('Elemento housingInfo no encontrado');
        return;
    }

    let info = `
        <div class="housing-info-card">
            <div class="housing-info-header">
                <h4><i class="fas fa-home"></i> ${housing.tipo}</h4>
                <span class="housing-age-badge">${housing.antiguedad || 0} años</span>
            </div>
            <div class="housing-info-body">
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span><strong>Propietario:</strong> ${housing.nombre_propietario || ''} ${housing.apellido_propietario || ''}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-id-card"></i>
                        <span><strong>Cédula:</strong> ${housing.cedula || 'No especificada'}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span><strong>Teléfono:</strong> ${housing.telefono || 'No especificado'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Adquirido:</strong> ${formatDate(housing.fecha_adquirido)}</span>
                    </div>
                </div>
    `;

    // Agregar información específica según el tipo
    if (housing.tipo_entidad === 'apartamento') {
        info += `
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-building"></i>
                        <span><strong>Edificio:</strong> ${housing.nombre_edificio || 'No especificado'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-door-open"></i>
                        <span><strong>Ubicación:</strong> Piso ${housing.piso || 'N/A'} - Apartamento ${housing.numero_apartamento || 'N/A'}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span><strong>Email:</strong> ${housing.gmail || 'No especificado'}</span>
                    </div>
                </div>
        `;
    }

    info += `
            </div>
        </div>
    `;

    housingInfo.innerHTML = info;

    // Mostrar el contenedor de información
    housingInfo.style.display = 'block';

    // Ocultar el mensaje de estado
    const housingStatus = document.getElementById('housingStatus');
    if (housingStatus) {
        housingStatus.style.display = 'none';
    }
}

// Función para seleccionar una vivienda
async function selectHousing(inmuebleId, element) {
    try {
        console.log('✅ Seleccionando vivienda:', inmuebleId);

        // Mostrar overlay de carga mientras se actualiza la información
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }

        // Marcar el tiempo de inicio para garantizar mínimo 3 segundos de overlay
        const startTime = Date.now();

        const persistResult = await setActiveHousing(inmuebleId);
        if (!persistResult.success) {
            showAlert(persistResult.message || 'No se pudo actualizar la vivienda activa', 'error');
            return;
        }

        activeHousingId = persistResult.active_inmueble_id || inmuebleId;

        // Remover la clase selected de todos los elementos
        document.querySelectorAll('.housing-item').forEach(item => {
            item.classList.remove('selected');
            console.log('🧹 Removiendo clase selected de:', item.dataset.housingId);
        });

        // Encontrar el elemento de vivienda correcto
        const housingItem = document.querySelector(`[data-housing-id="${inmuebleId}"]`);
        if (housingItem) {
            housingItem.classList.add('selected');
            console.log('✅ Clase selected agregada a inmueble_id:', inmuebleId);

            // Forzar re-renderizado visual
            housingItem.style.transform = 'scale(1.02)';
            setTimeout(() => {
                housingItem.style.transform = 'scale(1)';
            }, 150);
        } else {
            console.log('⚠️ No se encontró el elemento housing-item para inmueble_id:', inmuebleId);
            // Fallback: usar el elemento más cercano
            const closestItem = element.closest('.housing-item');
            if (closestItem) {
                closestItem.classList.add('selected');
                console.log('✅ Clase selected agregada usando fallback');

                // Forzar re-renderizado visual
                closestItem.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    closestItem.style.transform = 'scale(1)';
                }, 150);
            }
        }

        // Obtener los detalles de la vivienda para almacenar en caché
        const response = await fetch(`../../api/get_housing_FINAL_WORKING.php?inmueble_id=${inmuebleId}`);
        const data = await response.json();

        if (data.success && data.housing) {
            // Actualizar la información mostrada
            const previousHousing = currentHousing;
            currentHousing = data.housing;
            currentHousing.is_active = true;

            console.log('🔄 Cambiando de vivienda:');
            console.log('  - Anterior:', previousHousing ? `${previousHousing.tipo} (ID: ${previousHousing.inmueble_id})` : 'Ninguna');
            console.log('  - Nueva:', `${currentHousing.tipo} (ID: ${currentHousing.inmueble_id})`);

            // Forzar actualización visual inmediata
            console.log('🔄 Actualizando información visual de la vivienda...');
            displayHousingInfo();

            // Limpiar completamente el contenido antes de actualizar
            const housingInfoElement = document.getElementById('housingInfo');
            if (housingInfoElement) {
                housingInfoElement.innerHTML = '<div class="loading">Actualizando información...</div>';
            }

            // Forzar actualización múltiple para asegurar que se muestre
            setTimeout(() => {
                console.log('🔄 Segunda actualización de información visual');
                displayHousingInfo();
            }, 200);

            setTimeout(() => {
                console.log('🔄 Tercera actualización de información visual');
                displayHousingInfo();
            }, 500);

            setTimeout(() => {
                console.log('🔄 Cuarta actualización de información visual');
                displayHousingInfo();
            }, 1000);

            // Verificar que se actualizó correctamente
            setTimeout(() => {
                const housingInfoElement = document.getElementById('housingInfo');
                if (housingInfoElement && housingInfoElement.innerHTML.includes(currentHousing.inmueble_id)) {
                    console.log('✅ Información de vivienda actualizada visualmente');
                } else {
                    console.log('⚠️ La información visual no se actualizó correctamente');
                    console.log('🔍 Contenido actual:', housingInfoElement ? housingInfoElement.innerHTML.substring(0, 200) : 'Elemento no encontrado');
                }
            }, 500);

            // ACTUALIZAR TODA LA INFORMACIÓN DEL DASHBOARD
            console.log('🔄 Actualizando toda la información del dashboard...');

            // Limpiar información anterior
            clearPreviousData();

            // Actualizar información del usuario
            await loadUserData();

            // Actualizar resumen de pagos
            await loadPaymentSummary();

            // Actualizar calendario si está visible
            if (document.getElementById('calendarContainer') && document.getElementById('calendarContainer').style.display !== 'none') {
                await loadCalendar();
            }

            // Actualizar meses disponibles si están visibles
            if (document.getElementById('availableMonthsContainer') && document.getElementById('availableMonthsContainer').style.display !== 'none') {
                loadAvailableMonths();
            }

            // Actualizar reportes si están visibles
            if (document.getElementById('reportResults') && document.getElementById('reportResults').style.display !== 'none') {
                generateReport();
            }

            // Habilitar todas las funciones
            enableAllFeatures();

            // Actualizar la lista de viviendas para reflejar la nueva selección
            setTimeout(async () => {
                console.log('🔄 Recargando lista de viviendas para actualizar selección...');
                await loadHousingList({ silent: true });
            }, 200);

            // Cerrar el modal de selección de vivienda
            closeModal('housingModal');

            // Cambiar a la pestaña principal del dashboard
            const mainTab = document.querySelector('[onclick="openTab(event, \'dashboardTab\')"]');
            if (mainTab) {
                mainTab.click();
            }

            // Verificar que todo esté funcionando correctamente
            setTimeout(() => {
                console.log('🔍 Verificando estado final del sistema...');
                console.log('  - Usuario actual:', currentUser?.username);
                console.log('  - Vivienda actual:', currentHousing?.tipo);
                console.log('  - Inmueble ID:', currentHousing?.inmueble_id);
                console.log('  - Ubicación:', currentHousing?.ubicacion);
                console.log('  - Propietario:', currentHousing?.nombre_propietario, currentHousing?.apellido_propietario);

                // Verificar que la información se esté mostrando correctamente
                const housingInfoElement = document.getElementById('housingInfo');
                if (housingInfoElement) {
                    console.log('  - Elemento housingInfo encontrado:', housingInfoElement.innerHTML.length > 0);
                    console.log('  - Contenido contiene inmueble_id:', housingInfoElement.innerHTML.includes(currentHousing.inmueble_id));
                }

                // Verificar que el elemento seleccionado visualmente sea el correcto
                const selectedItem = document.querySelector('.housing-item.selected');
                if (selectedItem) {
                    console.log('  - Elemento seleccionado visualmente:', selectedItem.dataset.housingId);
                    console.log('  - Coincide con vivienda actual:', selectedItem.dataset.housingId === currentHousing.inmueble_id);
                } else {
                    console.log('  - ⚠️ No se encontró elemento seleccionado visualmente');
                }
            }, 500);

            // Forzar actualización final del dashboard
            setTimeout(() => {
                console.log('🔄 Actualización final del dashboard...');
                displayHousingInfo();

                // Forzar actualización de elementos específicos
                const housingInfoElement = document.getElementById('housingInfo');
                if (housingInfoElement && currentHousing) {
                    // Forzar re-renderizado del elemento
                    housingInfoElement.style.display = 'none';
                    setTimeout(() => {
                        housingInfoElement.style.display = 'block';
                        displayHousingInfo();
                    }, 10);
                }
            }, 1000);

            // Mostrar mensaje de éxito
            showAlert('Vivienda seleccionada correctamente. Toda la información ha sido actualizada.', 'success');
            console.log('✅ Vivienda seleccionada y dashboard actualizado:', inmuebleId);
        } else {
            throw new Error(data.message || 'Error al obtener detalles de la vivienda');
        }

    } catch (error) {
        console.error('❌ Error al seleccionar vivienda:', error);
        showAlert('Error al seleccionar la vivienda', 'error');
    } finally {
        // Calcular tiempo transcurrido y esperar hasta completar 3 segundos
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 3000 - elapsedTime);

        setTimeout(() => {
            hideLoadingOverlay();
        }, remainingTime);
    }
}

// Función para limpiar información anterior
function clearPreviousData() {
    console.log('🧹 Limpiando información anterior...');

    // Limpiar resumen de pagos
    const paymentInfo = document.getElementById('paymentInfo');
    if (paymentInfo) {
        paymentInfo.innerHTML = '<div class="loading">Cargando información de pagos...</div>';
    }

    // Limpiar calendario
    const calendarContainer = document.getElementById('calendarContainer');
    if (calendarContainer) {
        calendarContainer.innerHTML = '<div class="loading">Cargando calendario...</div>';
    }

    // Limpiar meses disponibles
    const monthsGrid = document.getElementById('monthsGrid');
    if (monthsGrid) {
        monthsGrid.innerHTML = '<div class="loading">Cargando meses disponibles...</div>';
    }

    // Limpiar reportes
    const reportResults = document.getElementById('reportResults');
    if (reportResults) {
        reportResults.style.display = 'none';
    }

    console.log('✅ Información anterior limpiada');
}

// Función para obtener la ubicación de la vivienda
function getHousingLocation(housing) {

    console.log(' Ubicación de la vivienda:', housing);
    if (housing.tipo_entidad === 'apartamento') {
        return `${housing.nombre_edificio} • Piso ${housing.piso || 'N/A'} ${housing.numero_apartamento || 'N/A'}`;
    }
    return 'Ubicación no especificada';
}

// Función para formatear la fecha
function formatDate(dateString) {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}








// Función para mostrar campos dinámicos según el tipo de vivienda
function showDynamicFields(prefix = '') {
    const housingType = document.getElementById(prefix + 'HousingType').value;
    const dynamicFields = document.getElementById(prefix + 'DynamicFields');

    // Ocultar todos los campos dinámicos
    document.querySelectorAll(`#${prefix}DynamicFields > div`).forEach(field => {
        field.style.display = 'none';
    });
}



// Función unificada para cargar viviendas disponibles
window.loadViviendasDisponibles = async function (tipoVivienda, filtroId, selectId) {
    console.log(`🏠 ========== LOAD VIVIENDAS (${tipoVivienda}) ==========`);
    console.log('🏠 Tipo:', tipoVivienda);
    console.log('🏠 Filtro ID:', filtroId);
    console.log('🏠 Select ID:', selectId);

    const select = document.getElementById(selectId);
    if (!select) {
        console.log('❌ No se encontró el select:', selectId);
        return;
    }

    console.log('✅ Select encontrado:', select);

    // Limpiar select
    select.innerHTML = `<option value="">Selecciona un apartamento</option>`;

    if (!filtroId) {
        console.log('❌ No se proporcionó filtro_id');
        return;
    }

    try {
        const url = `../../api/api_vivienda.php?tipo=${tipoVivienda}&filtro_id=${filtroId}`;
        console.log('🏠 URL del API:', url);
        console.log('🏠 Parámetros enviados:');
        console.log('  - tipo:', tipoVivienda);
        console.log('  - filtro_id:', filtroId);
        console.log('  - filtro_id tipo:', typeof filtroId);
        console.log('🏠 Haciendo fetch...');

        const response = await fetch(url);
        console.log('🏠 Status:', response.status);
        console.log('🏠 Status Text:', response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('🏠 Datos recibidos:', data);

        if (data.success && data.viviendas) {
            console.log('✅ Cargando', data.viviendas.length, tipoVivienda + 's');

            if (data.viviendas.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = `No hay ${tipoVivienda}s disponibles`;
                option.disabled = true;
                select.appendChild(option);
                console.log('⚠️ No hay viviendas disponibles, agregada opción vacía');
            } else {
                data.viviendas.forEach((vivienda, index) => {
                    const option = document.createElement('option');
                    option.value = vivienda.id;
                    option.textContent = vivienda.nombre;
                    select.appendChild(option);
                    console.log(`🏠 Agregado ${index + 1}: ${vivienda.nombre} (ID: ${vivienda.id})`);
                });
                console.log(`✅ Total agregados: ${data.viviendas.length} ${tipoVivienda}s`);
            }

            console.log('✅ Viviendas cargadas exitosamente');
        } else {
            console.log('⚠️ Respuesta del API no exitosa:', data.message);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Error cargando opciones';
            option.disabled = true;
            select.appendChild(option);
        }
    } catch (error) {
        console.error('❌ Error cargando viviendas:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Error de conexión';
        option.disabled = true;
        select.appendChild(option);
    }
}

// Modal functions
function openHousingModal() {
    // Verificar si el usuario tiene vivienda registrada
    if (!hasRegisteredHousing || !currentHousing) {
        // Si no tiene vivienda, mostrar el modal de registro
        console.log("Usuario sin vivienda, mostrando modal de registro");
        showHousingRegistrationModal();
        return;
    }

    // Si tiene vivienda, mostrar el modal de gestión con pestañas
    const modal = document.getElementById('housingModal');
    modal.classList.add('show');

    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';

    // Cargar la lista de viviendas en la primera pestaña
    loadHousingList();
}


function openPaymentModal() {
    window.location.href = '../payments/pagos.html';
}

// Función para mostrar mensaje de pagos deshabilitados
function showPaymentDisabledMessage() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease-in;
    `;

    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 500px;
        margin: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        color: white;
        animation: slideIn 0.4s ease-out;
    `;

    messageBox.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
        <h2 style="margin-bottom: 15px; font-size: 2rem;">Pagos Temporalmente Deshabilitados</h2>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 25px;">
            El módulo de pagos se encuentra deshabilitado por el momento. 
            Por favor, intenta más tarde o contacta con la administración.
        </p>
        <button onclick="this.parentElement.parentElement.remove()" style="
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: bold;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Entendido
        </button>
    `;

    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Cerrar al hacer clic fuera del mensaje
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function openReportsModal() {
    window.location.href = '../reports/reportes.html';
}

// Función para ir a la página de configuración
function goToConfig() {
    window.location.href = '../config/configuracion.html';
}





function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    modal.classList.remove('show');
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
    document.body.classList.remove('modal-open');
}

// Función para cargar tipos de vivienda desde la base de datos
async function loadTiposVivienda() {
    try {
        console.log('📋 Cargando tipos de vivienda desde la base de datos...');

        const response = await fetch('../../api/get_tipos_vivienda.php');
        const data = await response.json();

        if (data.success && data.tipos) {
            // Filtrar para dejar solo Apartamentos
            const soloApartamentos = data.tipos.filter(t => t.nombre.toLowerCase() === 'apartamento');
            console.log('✅ Tipos de vivienda filtrados:', soloApartamentos);

            // Poblar el select del modal de registro inicial
            const housingTypeSelect = document.getElementById('housingType');
            if (housingTypeSelect) {
                // Limpiar opciones existentes excepto la primera
                housingTypeSelect.innerHTML = '<option value="">Selecciona el tipo</option>';

                // Agregar los tipos de vivienda
                soloApartamentos.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    option.textContent = tipo.nombre;
                    option.setAttribute('data-monto', tipo.monto_mensual);
                    housingTypeSelect.appendChild(option);
                });

                console.log(`✅ ${soloApartamentos.length} tipos de vivienda agregados al select`);
            }

            // Poblar el select del modal de nueva vivienda
            const newHousingTypeSelect = document.getElementById('newHousingType');
            if (newHousingTypeSelect) {
                newHousingTypeSelect.innerHTML = '<option value="">Selecciona el tipo</option>';

                soloApartamentos.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    option.textContent = tipo.nombre;
                    option.setAttribute('data-monto', tipo.monto_mensual);
                    newHousingTypeSelect.appendChild(option);
                });

                console.log(`✅ ${soloApartamentos.length} tipos de vivienda agregados al select de nueva vivienda`);
            }

            return soloApartamentos;
        } else {
            console.error('❌ Error al cargar tipos de vivienda:', data.message);
            return [];
        }
    } catch (error) {
        console.error('❌ Error en loadTiposVivienda:', error);
        return [];
    }
}

// Toggle campos de vivienda
function toggleHousingFields() {
    const housingTypeSelect = document.getElementById('housingType');
    const selectedOption = housingTypeSelect.options[housingTypeSelect.selectedIndex];
    const housingType = selectedOption ? selectedOption.textContent.toLowerCase() : '';
    const apartamentoFields = document.getElementById('apartamentoFields');

    apartamentoFields.style.display = housingType === 'apartamento' ? 'block' : 'none';

    // Hacer campos requeridos si es apartamento
    const apartamentoInputs = apartamentoFields.querySelectorAll('input');
    apartamentoInputs.forEach(input => {
        input.required = housingType === 'apartamento';
    });
}

// Poblar formulario de vivienda
function populateHousingForm() {
    if (!currentHousing) return;

    console.log('Datos de vivienda:', currentHousing); // Debug

    // Llenar campos de solo lectura (display)
    document.getElementById('housingTypeDisplay').value = currentHousing.tipo || 'No especificado';
    document.getElementById('nombrePropietarioDisplay').value = currentHousing.nombre_propietario || 'No registrado';
    document.getElementById('apellidoPropietarioDisplay').value = currentHousing.apellido_propietario || 'No registrado';
    document.getElementById('cedulaDisplay').value = currentHousing.cedula || 'No registrada';
    document.getElementById('fechaAdquiridoDisplay').value = currentHousing.fecha_adquirido || 'No registrada';
    document.getElementById('antiguedadDisplay').value = (currentHousing.antiguedad || 0) + ' años';

    // Llenar campos ocultos para el envío
    document.getElementById('housingType').value = currentHousing.tipo || '';
    document.getElementById('nombrePropietario').value = currentHousing.nombre_propietario || '';
    document.getElementById('apellidoPropietario').value = currentHousing.apellido_propietario || '';
    document.getElementById('cedula').value = currentHousing.cedula || '';
    document.getElementById('fechaAdquirido').value = currentHousing.fecha_adquirido || '';
    document.getElementById('antiguedad').value = currentHousing.antiguedad || 0;

    // Campos editables
    document.getElementById('telefono').value = currentHousing.telefono || '';

    // Mostrar campos específicos según el tipo de vivienda
    console.log('Tipo de vivienda:', currentHousing.tipo);
    console.log('Tipo entidad:', currentHousing.tipo_entidad);

    if (currentHousing.tipo === 'Apartamento' || currentHousing.tipo_entidad === 'apartamento') {
        console.log('Mostrando campos de apartamento');

        // Campos de apartamento
        document.getElementById('nombreEdificioDisplay').value = currentHousing.nombre_edificio || 'No especificado';
        document.getElementById('pisoApartamentoDisplay').value = currentHousing.piso || 'No especificado';
        document.getElementById('numeroApartamentoDisplay').value = currentHousing.numero_apartamento || 'No especificado';

        // Campos ocultos
        document.getElementById('nombreEdificio').value = currentHousing.nombre_edificio || '';
        document.getElementById('pisoApartamento').value = currentHousing.piso || '';
        document.getElementById('numeroApartamento').value = currentHousing.numero_apartamento || '';

        // Mostrar campos de apartamento
        document.getElementById('apartamentoFields').style.display = 'block';

    } else {
        console.log('Tipo de vivienda no soportado:', currentHousing.tipo);
        document.getElementById('apartamentoFields').style.display = 'none';
    }

    toggleHousingFields();
}

// Manejar envío del formulario de vivienda
document.addEventListener('DOMContentLoaded', function () {
    const housingForm = document.getElementById('housingForm');
    if (housingForm) {
        housingForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const formData = new FormData(e.target);

            const data = {
                tipo: formData.get('housingType'),
                nombre_propietario: formData.get('nombrePropietario'),
                apellido_propietario: formData.get('apellidoPropietario'),
                cedula: formData.get('cedula'),
                telefono: formData.get('telefono'),
                antiguedad: formData.get('antiguedad')
            };

            if (data.tipo === 'apartamento') {
                data.direccion_edificio = formData.get('direccionEdificio');
                data.numero_apartamento = formData.get('numeroApartamento');
                data.nombre_edificio = formData.get('nombreEdificio');
            }

            try {
                const response = await fetch('../../api/save_housing.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showAlert('Vivienda guardada exitosamente', 'success');

                    // Recargar la lista de viviendas
                    await loadHousingList();

                    // Cambiar a la pestaña de seleccionar vivienda
                    const selectTab = document.querySelector('[onclick="openTab(event, \'selectHousingTab\')"]');
                    if (selectTab) {
                        selectTab.click();
                    }

                    // Actualizar datos de vivienda y resumen de pagos
                    loadHousingData();
                    loadPaymentSummary();
                } else {
                    showAlert(result.message, 'error');
                }
            } catch (error) {
                console.error('Error guardando vivienda:', error);
                showAlert('Error de conexión', 'error');
            }
        });
    }
});

// Seleccionar tipo de pago
function selectPaymentType(type) {
    selectedPaymentType = type;

    // Remover selección anterior
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Seleccionar actual
    event.target.closest('.payment-option').classList.add('selected');

    // Mostrar formulario correspondiente
    document.getElementById('mensualidadForm').style.display = type === 'mensualidad' ? 'block' : 'none';
    document.getElementById('contribucionForm').style.display = type === 'contribucion' ? 'block' : 'none';
}

// Cargar meses disponibles dinámicamente
async function loadAvailableMonths() {
    const selectedYear = document.getElementById('yearSelect').value;
    const monthsGrid = document.getElementById('monthsGrid');

    console.log('Cargando meses para el año:', selectedYear);

    // Mostrar indicador de carga
    monthsGrid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i>
            <p>Cargando meses de ${selectedYear}...</p>
        </div>
    `;

    try {
        // Si hay una vivienda seleccionada, usar su inmueble_id
        let url = `api/get_months_simple.php?year=${selectedYear}`;
        if (currentHousing && currentHousing.inmueble_id) {
            url += `&inmueble_id=${currentHousing.inmueble_id}`;
            console.log('📅 Cargando meses para inmueble_id:', currentHousing.inmueble_id, 'año:', selectedYear);
        } else {
            console.log('📅 Cargando meses generales (sin vivienda seleccionada) año:', selectedYear);
        }

        const response = await fetch(url);
        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (data.success) {
            displayMonthsDynamic(data);
        } else {
            console.error('Error del servidor:', data.message);
            monthsGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Error: ${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando meses:', error);
        monthsGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Error de conexión</p>
            </div>
        `;
    }
}

// Mostrar meses dinámicamente
function displayMonthsDynamic(data) {
    const monthsGrid = document.getElementById('monthsGrid');
    monthsGrid.innerHTML = '';

    // Crear contenedor principal
    const mainContainer = document.createElement('div');
    mainContainer.className = 'all-years-payment-container';

    // Crear contenedor del año
    const yearContainer = document.createElement('div');
    yearContainer.className = 'year-payment-container';

    // Header del año
    const yearHeader = document.createElement('div');
    yearHeader.className = 'year-payment-header';
    yearHeader.innerHTML = `
        <h3>${data.year}</h3>
        <div class="year-payment-stats">
            <span class="paid-count">${data.months.filter(m => m.visual_status === 'paid').length} Pagados</span>
            <span class="unpaid-count">${data.months.filter(m => m.visual_status === 'unpaid').length} Debe</span>
            <span class="pending-count">${data.months.filter(m => m.visual_status === 'pending').length} Pendientes</span>
        </div>
    `;

    // Contenedor de meses
    const monthsContainer = document.createElement('div');
    monthsContainer.className = 'months-payment-container';

    // Mostrar los 12 meses
    data.months.forEach(month => {
        const monthCard = document.createElement('div');
        monthCard.className = `month-card ${month.visual_status}`;

        // Solo permitir selección en meses que se deben pagar
        if (month.visual_status === 'unpaid') {
            monthCard.onclick = () => toggleMonthSelection(month.id, monthCard, month.monto_bs, month.monto_dolares);
            monthCard.style.cursor = 'pointer';
        }

        let statusText = '';
        let statusIcon = '';

        switch (month.visual_status) {
            case 'paid':
                statusText = 'Pagado';
                statusIcon = '✅';
                break;
            case 'unpaid':
                statusText = 'Debe';
                statusIcon = '❌';
                break;
            case 'pending':
                statusText = 'Pendiente';
                statusIcon = '⏳';
                break;
            default:
                statusText = 'N/A';
                statusIcon = '❓';
        }

        monthCard.innerHTML = `
            <div class="month-card-header">
                <h4>${month.nombre}</h4>
                <span class="status-icon">${statusIcon}</span>
            </div>
            <div class="month-card-details">
                <div class="status ${month.visual_status}">${statusText}</div>
                <div class="amount">${parseFloat(month.monto_bs).toLocaleString()} Bs</div>
                <div class="amount">$${month.monto_dolares} USD</div>
            </div>
            ${month.visual_status === 'unpaid' ? '<small>Click para seleccionar</small>' : ''}
        `;

        monthsContainer.appendChild(monthCard);
    });

    yearContainer.appendChild(yearHeader);
    yearContainer.appendChild(monthsContainer);
    mainContainer.appendChild(yearContainer);
    monthsGrid.appendChild(mainContainer);
}

// Función para filtrar por año
function filterByYear() {
    loadAvailableMonths();
}

// Mostrar meses filtrados por año
function displayMonthsByYear(data, selectedYear) {
    const monthsGrid = document.getElementById('monthsGrid');
    monthsGrid.innerHTML = '';

    // Crear contenedor principal
    const mainContainer = document.createElement('div');
    mainContainer.className = 'all-years-payment-container';

    // Filtrar años a mostrar
    let yearsToShow;
    if (selectedYear === 'all') {
        yearsToShow = data.available_years;
    } else {
        const yearNum = parseInt(selectedYear);
        yearsToShow = data.years[yearNum] ? [yearNum] : [];
    }

    // Si no hay años para mostrar, mostrar mensaje
    if (yearsToShow.length === 0) {
        monthsGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No hay datos disponibles para el año seleccionado</div>';
        return;
    }

    // Iterar por cada año
    yearsToShow.forEach(year => {
        if (!data.years[year]) return;

        const yearContainer = document.createElement('div');
        yearContainer.className = 'year-payment-container';

        const yearHeader = document.createElement('div');
        yearHeader.className = 'year-payment-header';
        yearHeader.innerHTML = `
            <h3>${year}</h3>
            <div class="year-payment-stats">
                <span class="paid-count">${data.years[year].filter(m => m.visual_status === 'paid').length} Pagados</span>
                <span class="unpaid-count">${data.years[year].filter(m => m.visual_status === 'unpaid').length} Debe</span>
                <span class="pending-count">${data.years[year].filter(m => m.visual_status === 'pending').length} Pendientes</span>
            </div>
        `;

        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'months-payment-container';

        // Mostrar meses del año
        data.years[year].forEach(month => {
            const monthCard = document.createElement('div');
            monthCard.className = `month-card ${month.visual_status}`;

            // Solo permitir selección en meses que se deben pagar
            if (month.visual_status === 'unpaid') {
                monthCard.onclick = () => toggleMonthSelection(month.id, monthCard, month.monto_bs, month.monto_dolares);
                monthCard.style.cursor = 'pointer';
            }

            let statusText = '';
            let statusIcon = '';

            switch (month.visual_status) {
                case 'paid':
                    statusText = 'Pagado';
                    statusIcon = '✅';
                    break;
                case 'unpaid':
                    statusText = 'Debe';
                    statusIcon = '❌';
                    break;
                case 'pending':
                    statusText = 'Pendiente';
                    statusIcon = '⏳';
                    break;
                default:
                    statusText = 'N/A';
                    statusIcon = '❓';
            }

            monthCard.innerHTML = `
                <div class="month-card-header">
                    <h4>${month.nombre}</h4>
                    <span class="status-icon">${statusIcon}</span>
                </div>
                <div class="month-card-details">
                    <div class="status ${month.visual_status}">${statusText}</div>
                    <div class="amount">${parseFloat(month.monto_bs).toLocaleString()} Bs</div>
                    <div class="amount">$${month.monto_dolares} USD</div>
                </div>
                ${month.visual_status === 'unpaid' ? '<small>Click para seleccionar</small>' : ''}
            `;

            monthsContainer.appendChild(monthCard);
        });

        yearContainer.appendChild(yearHeader);
        yearContainer.appendChild(monthsContainer);
        mainContainer.appendChild(yearContainer);
    });

    monthsGrid.appendChild(mainContainer);
}


// Toggle selección de mes
function toggleMonthSelection(monthId, element, montoBs, montoDolares) {
    if (element.classList.contains('paid') || element.classList.contains('pending')) return;

    const existingIndex = selectedMonths.findIndex(m => m.id === monthId);

    if (existingIndex > -1) {
        // Deseleccionar
        selectedMonths.splice(existingIndex, 1);
        element.classList.remove('selected');
    } else {
        // Seleccionar
        selectedMonths.push({
            id: monthId,
            monto_bs: parseFloat(montoBs),
            monto_dolares: parseFloat(montoDolares)
        });
        element.classList.add('selected');
    }

    updateTotalAmount();
}

// Actualizar monto total
function updateTotalAmount() {
    const totalDiv = document.getElementById('totalAmount');
    const totalValue = document.getElementById('totalValue');
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (selectedMonths.length === 0) {
        totalDiv.style.display = 'none';
        return;
    }

    // Calcular total basado en los meses seleccionados
    let totalBs = 0;
    let totalUsd = 0;

    selectedMonths.forEach(month => {
        totalBs += month.monto_bs;
        totalUsd += month.monto_dolares;
    });

    totalDiv.style.display = 'block';

    if (paymentMethod === 'bs') {
        totalValue.textContent = `${totalBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES' })}`;
    } else {
        totalValue.textContent = `$${totalUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
    }
}

// Procesar pago
async function processPayment() {
    if (selectedMonths.length === 0) {
        showAlert('Selecciona al menos un mes para pagar', 'error');
        return;
    }

    const paymentMethod = document.getElementById('paymentMethod').value;
    const monthIds = selectedMonths.map(m => m.id);

    try {
        const response = await fetch('../../api/process_payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                months: monthIds,
                method: paymentMethod
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Pago procesado exitosamente', 'success');
            closeModal('paymentModal');
            loadPaymentSummary();
            selectedMonths = [];
            // Recargar la vista de meses para actualizar estados
            loadAvailableMonths();
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Error procesando pago:', error);
        showAlert('Error de conexión', 'error');
    }
}

// Procesar contribución
async function processContribution() {
    const amount = document.getElementById('contribucionAmount').value;
    const method = document.getElementById('contribucionMethod').value;
    const description = document.getElementById('contribucionDescription').value;

    if (!amount || amount <= 0) {
        showAlert('Ingresa un monto válido', 'error');
        return;
    }

    try {
        const response = await fetch('../../api/process_contribution.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                method: method,
                description: description
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Contribución procesada exitosamente', 'success');
            closeModal('paymentModal');
            loadPaymentSummary();
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Error procesando contribución:', error);
        showAlert('Error de conexión', 'error');
    }
}

// Generar reporte
async function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showAlert('Selecciona ambas fechas', 'error');
        return;
    }

    try {
        const response = await fetch('../../api/generate_report.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start_date: startDate,
                end_date: endDate,
                inmueble_id: currentHousing ? currentHousing.inmueble_id : null
            })
        });

        const result = await response.json();

        if (result.success) {
            displayReport(result);
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        showAlert('Error de conexión', 'error');
    }
}

// Mostrar reporte
function displayReport(data) {
    const reportContent = document.getElementById('reportContent');
    const reportResults = document.getElementById('reportResults');

    // Calcular estadísticas
    const paidMonths = data.all_months.filter(month => month.estado === 'Pagado');
    const unpaidMonths = data.all_months.filter(month => month.estado === 'No Pagado');

    let html = `
        <div class="report-header">
            <h3>Reporte de Pagos</h3>
            <p><strong>Período:</strong> ${data.start_date} - ${data.end_date}</p>
        </div>
        
        <div class="report-summary">
            <div class="summary-item">
                <span class="label">Meses Pagados:</span>
                <span class="value paid">${paidMonths.length}</span>
            </div>
            <div class="summary-item">
                <span class="label">Meses No Pagados:</span>
                <span class="value unpaid">${unpaidMonths.length}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Pagado (Bs):</span>
                <span class="value">${data.total_bs.toLocaleString('es-VE')}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Pagado (USD):</span>
                <span class="value">$${data.total_usd.toLocaleString('en-US')}</span>
            </div>
        </div>
        
        <table class="report-table">
            <thead>
                <tr>
                    <th>Mes</th>
                    <th>Año</th>
                    <th>Estado</th>
                    <th>Método de Pago</th>
                    <th>Moneda</th>
                    <th>Monto</th>
                    <th>Tasa (Bs)</th>
                    <th>Fecha de Pago</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.all_months.forEach(month => {
        const statusClass = month.estado === 'Pagado' ? 'status-paid' : 'status-unpaid';
        const method = month.metodo_pago || 'N/A';
        const currency = month.moneda_pago ? (month.moneda_pago === 'bs' ? 'Bolívares' : 'Dólares') : 'N/A';
        const amount = month.estado === 'Pagado' ?
            (month.moneda_pago === 'bs' ?
                month.monto_bs.toLocaleString('es-VE') + ' Bs' :
                '$' + month.monto_dolares.toLocaleString('en-US') + ' USD') : 'N/A';
        const rate = month.estado === 'Pagado' ? month.tasa_bs.toLocaleString('es-VE') : 'N/A';
        const paymentDate = month.fecha_pago_formatted || 'N/A';

        html += `
            <tr>
                <td>${month.mes_nombre}</td>
                <td>${month.año}</td>
                <td><span class="${statusClass}">${month.estado}</span></td>
                <td>${method}</td>
                <td>${currency}</td>
                <td>${amount}</td>
                <td>${rate}</td>
                <td>${paymentDate}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    reportContent.innerHTML = html;
    reportResults.style.display = 'block';
}

// Cargar calendario completo
async function loadCalendar() {
    try {
        // Si hay una vivienda seleccionada, usar su inmueble_id
        let url = '../../api/get_all_calendar.php';
        if (currentHousing && currentHousing.inmueble_id) {
            url += `?inmueble_id=${currentHousing.inmueble_id}`;
            console.log('📅 Cargando calendario para inmueble_id:', currentHousing.inmueble_id);
        } else {
            console.log('📅 Cargando calendario general (sin vivienda seleccionada)');
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            displayAllCalendar(data);
        }
    } catch (error) {
        console.error('Error cargando calendario:', error);
    }
}

// Variable global para datos del calendario
let calendarDataGlobal = null;

// Mostrar calendario completo con todos los años
function displayAllCalendar(data) {
    calendarDataGlobal = data; // Almacenar datos globalmente

    const calendarGrid = document.getElementById('calendarGrid');
    const calendarYear = document.getElementById('calendarYear');
    const calendarYearSelect = document.getElementById('calendarYearSelect');

    calendarYear.textContent = 'Calendario de Pagos';

    // Solo mostrar 2025
    calendarYearSelect.innerHTML = '<option value="all">Todos los Años</option><option value="2025">2025</option>';

    // Mostrar todos los años inicialmente
    displayCalendarByYear(data, 'all');
}

// Mostrar calendario filtrado por año
function displayCalendarByYear(data, selectedYear) {
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    // Crear contenedor principal
    const mainContainer = document.createElement('div');
    mainContainer.className = 'all-years-container';

    // Filtrar años a mostrar
    let yearsToShow;
    if (selectedYear === 'all') {
        yearsToShow = data.available_years;
    } else {
        const yearNum = parseInt(selectedYear);
        yearsToShow = data.years[yearNum] ? [yearNum] : [];
    }

    // Si no hay años para mostrar, mostrar mensaje
    if (yearsToShow.length === 0) {
        calendarGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No hay datos disponibles para el año seleccionado</div>';
        return;
    }

    // Iterar por cada año
    yearsToShow.forEach(year => {
        if (!data.years[year]) return;

        const yearContainer = document.createElement('div');
        yearContainer.className = 'year-container';

        const yearHeader = document.createElement('div');
        yearHeader.className = 'year-header';
        yearHeader.innerHTML = `
            <h3>${year}</h3>
            <div class="year-stats">
                <span class="paid-count">${data.years[year].filter(m => m.visual_status === 'paid').length} Pagados</span>
                <span class="unpaid-count">${data.years[year].filter(m => m.visual_status === 'unpaid').length} Debe</span>
                <span class="pending-count">${data.years[year].filter(m => m.visual_status === 'pending').length} Pendientes</span>
            </div>
        `;

        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'months-container';

        // Mostrar meses del año
        data.years[year].forEach(month => {
            const monthCard = document.createElement('div');
            monthCard.className = `month-calendar-card ${month.visual_status}`;

            // Solo permitir click en meses que se deben pagar
            if (month.visual_status === 'unpaid') {
                monthCard.onclick = () => {
                    closeModal('calendarModal');
                    openPaymentModal();
                };
                monthCard.style.cursor = 'pointer';
            }

            let statusText = '';
            let statusIcon = '';

            switch (month.visual_status) {
                case 'paid':
                    statusText = 'Pagado';
                    statusIcon = '✅';
                    break;
                case 'unpaid':
                    statusText = 'Debe';
                    statusIcon = '❌';
                    break;
                case 'pending':
                    statusText = 'Pendiente';
                    statusIcon = '⏳';
                    break;
                default:
                    statusText = 'N/A';
                    statusIcon = '❓';
            }

            monthCard.innerHTML = `
                <div class="month-header">
                    <h4>${month.nombre}</h4>
                    <span class="status-icon">${statusIcon}</span>
                </div>
                <div class="month-details">
                    <div class="status ${month.visual_status}">${statusText}</div>
                    <div class="amount">${parseFloat(month.monto_bs).toLocaleString()} Bs</div>
                    <div class="amount">$${month.monto_dolares} USD</div>
                </div>
                ${month.visual_status === 'unpaid' ? '<small>Click para pagar</small>' : ''}
            `;

            monthsContainer.appendChild(monthCard);
        });

        yearContainer.appendChild(yearHeader);
        yearContainer.appendChild(monthsContainer);
        mainContainer.appendChild(yearContainer);
    });

    calendarGrid.appendChild(mainContainer);
}

// Función para filtrar calendario por año
function filterCalendarByYear() {
    const selectedYear = document.getElementById('calendarYearSelect').value;
    if (calendarDataGlobal) {
        displayCalendarByYear(calendarDataGlobal, selectedYear);
    }
}

// Cambiar año del calendario (ahora no se usa, pero lo mantengo por compatibilidad)
function changeYear(direction) {
    // Esta función ya no es necesaria con el calendario completo
    // Pero la mantengo para evitar errores
    loadCalendar();
}

// Descargar reporte PDF
function downloadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showAlert('Selecciona ambas fechas para descargar el PDF', 'error');
        return;
    }

    // Crear enlace temporal para descargar PDF
    const pdfUrl = `api/generate_pdf_report.php?start_date=${startDate}&end_date=${endDate}`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `reporte_arcorui_${startDate}_${endDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función de alerta mejorada
function showAlert(message, type) {
    // Crear el contenedor principal
    const alertContainer = document.createElement('div');
    alertContainer.className = 'alert-container';

    // Crear el alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-enhanced`;

    // Crear el contenido del alert
    const alertContent = document.createElement('div');
    alertContent.className = 'alert-content';

    // Crear el icono según el tipo
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';

    // Crear el mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert-message';
    messageDiv.innerHTML = message;

    // Crear el botón de cerrar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'alert-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => removeAlert(alertContainer);

    // Ensamblar el alert
    alertContent.appendChild(icon);
    alertContent.appendChild(messageDiv);
    alertDiv.appendChild(alertContent);
    alertDiv.appendChild(closeBtn);
    alertContainer.appendChild(alertDiv);

    // Agregar al DOM
    document.body.appendChild(alertContainer);

    // Animación de entrada
    setTimeout(() => {
        alertContainer.classList.add('show');
    }, 10);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        removeAlert(alertContainer);
    }, 5000);
}

// Función para remover alert
function removeAlert(container) {
    if (container && container.parentNode) {
        container.classList.add('hide');
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 300);
    }
}

// Función de logout
async function logout() {
    try {
        const response = await fetch('../../api/logout.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            // Limpiar timestamp de sesión
            sessionStorage.removeItem('sessionStart');
            console.log('🧹 Timestamp de sesión limpiado');

            // Usar la función mejorada de logout con protección
            if (typeof enhancedLogout === 'function') {
                enhancedLogout();
            } else {
                // Fallback si no está disponible la función mejorada
                currentUser = null;
                currentHousing = null;
                selectedMonths = [];
                window.location.href = '/pages/auth/index.html';
            }
        } else {
            // Limpiar timestamp de sesión incluso si falla el logout
            sessionStorage.removeItem('sessionStart');
            console.log('🧹 Timestamp de sesión limpiado (fallback)');
            // Aunque falle el logout del servidor, redirigir de todas formas
            window.location.href = '/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Limpiar timestamp de sesión incluso si hay error
        sessionStorage.removeItem('sessionStart');
        console.log('🧹 Timestamp de sesión limpiado (error)');
        // Redirigir de todas formas
        window.location.href = '/pages/auth/index.html';
    }
}

// Verificar sesión periódicamente
setInterval(async function () {
    try {
        const response = await fetch('../../api/check_session.php');
        const data = await response.json();

        if (!data.success) {
            // Sesión expirada, redirigir al login
            window.location.href = '/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        // En caso de error de conexión, no hacer nada para no interrumpir al usuario
    }
}, 30000); // Verificar cada 30 segundos

// Detectar cuando el usuario intenta salir de la página
window.addEventListener('beforeunload', function () {
    // Opcional: mostrar mensaje de confirmación
    // return '¿Estás seguro de que quieres salir?';
});

// Cerrar modales al hacer click fuera
window.onclick = function (event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            // No permitir cerrar ciertos modales haciendo clic fuera
            if (modal.id === 'housingRegistrationModal' ||
                modal.id === 'tramitesModal' ||
                modal.id === 'housingModal' ||
                modal.id === 'tiendaModal' ||
                modal.id === 'gastosModal') {
                return;
            }
            modal.style.display = 'none';
        }
    });
}

// Mostrar modal de registro de vivienda (primera vez)
function showHousingRegistrationModal() {
    if (hasRegisteredHousing) {
        console.log('⚠️ Intento de abrir modal de registro cuando ya existe vivienda. Ignorado.');
        return;
    }

    const modal = document.getElementById('housingRegistrationModal');
    if (modal) {
        // Obtener la posición actual del scroll
        const scrollY = window.scrollY;

        // Mostrar modal
        modal.style.display = 'flex';
        modal.classList.add('show');

        // Bloquear scroll del body de múltiples maneras
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.classList.add('modal-open');

        // También bloquear scroll en el html
        document.documentElement.style.overflow = 'hidden';

        console.log('Modal abierto, scroll bloqueado en posición:', scrollY);

        // Asegurar que el botón de cerrar esté visible
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.style.display = 'block';
            closeBtn.style.visibility = 'visible';
            closeBtn.style.opacity = '1';
            closeBtn.style.pointerEvents = 'auto';
        }

        // Configurar el formulario
        setupHousingForm();

        // Agregar evento de teclado para cerrar con Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeHousingRegistrationModal();
            }
        });

        console.log('Modal abierto, scroll bloqueado');
    }
}

// Configurar formulario de vivienda
async function setupHousingForm() {
    console.log('📝 Configurando formulario de vivienda...');

    // Cargar tipos de vivienda desde la base de datos
    await loadTiposVivienda();

    console.log('✅ Formulario configurado - usar función saveHousingData()');
}

// Función para manejar el cambio del tipo de vivienda
function toggleHousingFields() {
    const housingTypeSelect = document.getElementById('housingType');
    const selectedOption = housingTypeSelect.options[housingTypeSelect.selectedIndex];
    const housingType = selectedOption ? selectedOption.textContent : '';
    const dynamicFields = document.getElementById('dynamicFields');

    console.log('🏠 Tipo de vivienda seleccionado:', housingType);

    // Ocultar todos los campos dinámicos
    const fieldsToHide = [
        'apartamentoFields'
    ];

    fieldsToHide.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.display = 'none';
        }
    });

    // Si no hay tipo seleccionado, ocultar campos dinámicos
    if (!housingType || housingType === 'Selecciona el tipo') {
        if (dynamicFields) {
            dynamicFields.style.display = 'none';
        }
        return;
    }

    // Mostrar campos dinámicos
    if (dynamicFields) {
        dynamicFields.style.display = 'block';
    }

    // Mostrar campos específicos según el tipo
    switch (housingType) {
        case 'Apartamento':
            document.getElementById('apartamentoFields').style.display = 'block';
            // Mostrar solo el campo de edificio inicialmente
            document.getElementById('edificio').parentElement.style.display = 'block';
            document.getElementById('piso').parentElement.style.display = 'none';
            document.getElementById('apartamento').parentElement.style.display = 'none';
            loadEdificios();
            break;
        default:
            console.warn('⚠️ Tipo de vivienda no reconocido:', housingType);
            break;
    }
}

// Función para cargar edificios en el formulario de primera vez
async function loadEdificios() {
    try {
        const select = document.getElementById('edificio');
        if (!select) return;

        select.innerHTML = '<option value="">Cargando edificios...</option>';
        select.disabled = true;

        const response = await fetch('../../api/get_all_edificios.php');
        const data = await response.json();

        if (data.success && data.edificios) {
            select.innerHTML = '<option value="">Selecciona un edificio</option>';

            data.edificios.forEach(edificio => {
                const option = document.createElement('option');
                option.value = edificio.edificio_id;
                option.textContent = edificio.nombre_edificio;
                select.appendChild(option);
            });

            // Agregar evento para cargar pisos cuando cambie el edificio
            select.addEventListener('change', function () {
                // Mostrar campo de piso cuando se seleccione edificio
                document.getElementById('piso').parentElement.style.display = 'block';
                // Ocultar campo de apartamento hasta que se seleccione piso
                document.getElementById('apartamento').parentElement.style.display = 'none';
                loadPisosByEdificio(this.value);
            });
        } else {
            select.innerHTML = '<option value="">Error cargando edificios</option>';
        }
    } catch (error) {
        console.error('Error cargando edificios:', error);
        const select = document.getElementById('edificio');
        if (select) {
            select.innerHTML = '<option value="">Error cargando edificios</option>';
        }
    } finally {
        const select = document.getElementById('edificio');
        if (select) {
            select.disabled = false;
        }
    }
}

// Función para cargar pisos por edificio
async function loadPisosByEdificio(edificioId) {
    try {
        const select = document.getElementById('piso');
        if (!select || !edificioId) return;

        select.innerHTML = '<option value="">Cargando pisos...</option>';
        select.disabled = true;

        const response = await fetch(`../../api/get_pisos_by_edificio.php?edificio_id=${edificioId}`);
        const data = await response.json();

        if (data.success && data.pisos) {
            select.innerHTML = '<option value="">Selecciona un piso</option>';

            data.pisos.forEach(piso => {
                const option = document.createElement('option');
                option.value = piso.piso;
                option.textContent = `Piso ${piso.piso}`;
                select.appendChild(option);
            });

            // Agregar evento para cargar apartamentos cuando cambie el piso
            select.addEventListener('change', function () {
                // Mostrar campo de apartamento cuando se seleccione piso
                document.getElementById('apartamento').parentElement.style.display = 'block';
                loadApartamentosByPiso(edificioId, this.value);
            });
        } else {
            select.innerHTML = '<option value="">Error cargando pisos</option>';
        }
    } catch (error) {
        console.error('Error cargando pisos:', error);
        const select = document.getElementById('piso');
        if (select) {
            select.innerHTML = '<option value="">Error cargando pisos</option>';
        }
    } finally {
        const select = document.getElementById('piso');
        if (select) {
            select.disabled = false;
        }
    }
}

// Función para cargar apartamentos por piso
async function loadApartamentosByPiso(edificioId, piso) {
    try {
        const select = document.getElementById('apartamento');
        if (!select || !edificioId || !piso) return;

        select.innerHTML = '<option value="">Cargando apartamentos...</option>';
        select.disabled = true;

        const response = await fetch(`../../api/get_apartamentos_by_piso.php?edificio_id=${edificioId}&piso=${piso}`);
        const data = await response.json();

        if (data.success && data.apartamentos) {
            select.innerHTML = '<option value="">Selecciona un apartamento</option>';

            data.apartamentos.forEach(apartamento => {
                const option = document.createElement('option');
                option.value = apartamento.apartamento_id;
                option.textContent = `${apartamento.apartamento}`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">Error cargando apartamentos</option>';
        }
    } catch (error) {
        console.error('Error cargando apartamentos:', error);
        const select = document.getElementById('apartamento');
        if (select) {
            select.innerHTML = '<option value="">Error cargando apartamentos</option>';
        }
    } finally {
        const select = document.getElementById('apartamento');
        if (select) {
            select.disabled = false;
        }
    }
}

// Función directa para guardar datos de vivienda
async function saveHousingData() {
    console.log('🚀 Guardando datos de vivienda...');

    // Obtener el botón y agregar efecto de carga
    const saveButton = document.querySelector('#housingRegistrationModal .btn-primary');
    const originalText = saveButton.innerHTML;

    // Mostrar estado de carga
    saveButton.classList.add('loading');
    saveButton.innerHTML = '<i class="fas fa-spinner"></i> Guardando...';
    saveButton.disabled = true;

    // Obtener datos del formulario
    const data = {
        housingType: document.getElementById('housingType').value,
        nombrePropietario: document.getElementById('nombrePropietario').value,
        apellidoPropietario: document.getElementById('apellidoPropietario').value,
        cedula: document.getElementById('cedula').value,
        telefono: document.getElementById('telefono').value,
        gmail: document.getElementById('gmail').value,
        fechaAdquirido: document.getElementById('fechaAdquirido').value
    };

    let fechaAdquiridoDate = data.fechaAdquirido.split('/').reverse().join('-');
    console.log('📝 Datos obtenidos:', data);

    // Función para restaurar el botón
    function restoreButton() {
        saveButton.classList.remove('loading');
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }

    // Validaciones básicas
    if (!data.nombrePropietario || data.nombrePropietario.trim().length < 2) {
        alert('El nombre debe tener al menos 2 caracteres');
        restoreButton();
        return;
    }

    if (!data.apellidoPropietario || data.apellidoPropietario.trim().length < 2) {
        alert('El apellido debe tener al menos 2 caracteres');
        restoreButton();
        return;
    }

    // Validar cédula (debe ser solo números)
    if (!data.cedula || !data.cedula.match(/^[0-9]+$/)) {
        alert('La cédula debe contener solo números');
        restoreButton();
        return;
    }

    // Validar que la cédula tenga entre 6 y 8 dígitos
    if (data.cedula.length < 6 || data.cedula.length > 8) {
        alert('La cédula debe tener entre 6 y 8 dígitos');
        restoreButton();
        return;
    }

    if (!data.telefono || !data.telefono.match(/^[0-9]{10,11}$/)) {
        alert('El teléfono debe tener entre 10 y 11 dígitos');
        restoreButton();
        return;
    }

    if (!data.gmail || !data.gmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        alert('Por favor ingresa un correo electrónico válido');
        restoreButton();
        return;
    }

    if (!data.fechaAdquirido) {
        alert('Por favor selecciona la fecha de adquisición del inmueble');
        restoreButton();
        return;
    }

    // Validar que la fecha no sea futura
    const fechaAdquirido = new Date(data.fechaAdquirido);
    const hoy = new Date();
    if (fechaAdquirido > hoy) {
        alert('La fecha de adquisición no puede ser futura');
        restoreButton();
        return;
    }

    // Validar que la fecha no sea muy antigua (más de 100 años)
    const hace100Anios = new Date();
    hace100Anios.setFullYear(hoy.getFullYear() - 100);
    if (fechaAdquirido < hace100Anios) {
        alert('La fecha de adquisición no puede ser anterior a hace 100 años');
        restoreButton();
        return;
    }

    if (!data.housingType) {
        alert('Por favor selecciona un tipo de vivienda');
        restoreButton();
        return;
    }

    // Validar campos según el tipo de vivienda
    let tipoVivienda = data.housingType == '1' ? 'Apartamento' : '';
    if (tipoVivienda === 'Apartamento') {
        const edificio = document.getElementById('edificio').value;
        const piso = document.getElementById('piso').value;
        const apartamento = document.getElementById('apartamento').value;

        if (!edificio || !piso || !apartamento) {
            alert('Por favor completa todos los campos requeridos para apartamento');
            restoreButton();
            return;
        }

        data.nombre_edificio = document.getElementById('edificio').selectedOptions[0].text;
        data.numero_apartamento = document.getElementById('apartamento').selectedOptions[0].text;

        // Obtener IDs y datos específicos del apartamento
        const edificioSelect = document.getElementById('edificio');
        const apartamentoSelect = document.getElementById('apartamento');
        const pisoSelect = document.getElementById('piso');

        data.edificio_id = edificioSelect.value;
        data.apartamento_id = apartamentoSelect.value;
        data.piso = pisoSelect.value; // Obtener directamente del campo piso
        data.apartamento = apartamentoSelect.selectedOptions[0]?.textContent.replace('Apartamento ', '');

        console.log('🏠 Datos del apartamento obtenidos:', {
            edificio_id: data.edificio_id,
            apartamento_id: data.apartamento_id,
            piso: data.piso,
            apartamento: data.apartamento,
            tipo_dato_apartamento: typeof data.apartamento
        });

    }

    // Preparar datos para envío
    const housingData = {
        tipo_vivienda: tipoVivienda,
        tipo_vivienda_nombre: tipoVivienda['tipo_vivienda_nombre'] || '',
        nombre_propietario: data.nombrePropietario,
        apellido_propietario: data.apellidoPropietario,
        cedula: data.cedula,
        telefono: data.telefono,
        gmail: data.gmail,
        fecha_adquirido: fechaAdquiridoDate
    };

    // Agregar campos específicos
    if (tipoVivienda === 'Apartamento') {
        housingData.edificio_id = data.edificio_id;
        housingData.apartamento_id = data.apartamento_id;
        housingData.piso = data.piso;
        housingData.apartamento = data.apartamento;
    }

    console.log('📤 Enviando datos:', housingData);
    console.log('🔍 Verificación de datos de apartamento:', {
        edificio_id: housingData.edificio_id,
        apartamento_id: housingData.apartamento_id,
        piso: housingData.piso,
        apartamento: housingData.apartamento
    });

    try {
        console.log('🌐 Enviando petición a save_housing.php...');

        const response = await fetch('../../api/save_housing.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(housingData)
        });

        console.log('📡 Respuesta recibida:', response.status, response.statusText);

        const result = await response.json();
        console.log('📥 Respuesta del servidor:', result);

        if (result.success) {
            console.log('✅ Éxito! Cerrando modal...');

            // Restaurar el botón antes de cerrar el modal
            saveButton.classList.remove('loading');
            saveButton.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            saveButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

            // Mostrar mensaje de éxito
            showAlert('🏠 ¡Vivienda registrada exitosamente!', 'success');

            // Cerrar modal después de un breve delay
            setTimeout(() => {
                closeHousingRegistrationModal();
                // Recargar datos de vivienda y resumen de pagos
                loadHousingData();
                loadPaymentSummary();
                // Habilitar todas las funciones ahora que tiene vivienda
                enableAllFeatures();
                hasRegisteredHousing = true;
                disableHousingRegistrationModal();
            }, 1000);

        } else {
            console.log('❌ Error del servidor:', result.message);
            showAlert('❌ Error al registrar la vivienda: ' + result.message, 'error');
            restoreButton();
        }
    } catch (error) {
        console.error('💥 Error en la petición:', error);

        // Si el error es de parsing JSON, mostrar el contenido raw
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            console.error('❌ Respuesta del servidor no es JSON válido');
            showAlert('❌ Error del servidor: Respuesta inválida', 'error');
        } else {
            showAlert('❌ Error al registrar la vivienda: ' + error.message, 'error');
        }
        restoreButton();
    }
}


// Cerrar modal de registro de vivienda
function closeHousingRegistrationModal() {
    console.log('closeHousingRegistrationModal llamada');
    const modal = document.getElementById('housingRegistrationModal');
    if (modal) {
        // Ocultar modal
        modal.style.display = 'none';
        modal.classList.remove('show');

        // Restaurar scroll del body
        const scrollY = document.body.style.top;
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        document.body.style.top = 'auto';
        document.body.style.width = 'auto';
        document.body.style.height = 'auto';
        document.body.classList.remove('modal-open');

        // Restaurar scroll en el html
        document.documentElement.style.overflow = 'auto';

        // Restaurar la posición del scroll
        if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }

        // Restaurar el botón al estado original
        const saveButton = document.querySelector('#housingRegistrationModal .btn-primary');
        if (saveButton) {
            saveButton.classList.remove('loading');
            saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar';
            saveButton.style.background = '';
            saveButton.disabled = false;
        }

        console.log('Modal cerrado, scroll restaurado, botón restaurado');
    } else {
        console.log('Modal no encontrado');
    }
}

function disableHousingRegistrationModal() {
    const modal = document.getElementById('housingRegistrationModal');
    if (modal) {
        modal.remove();
        console.log('🛑 Modal de registro inicial eliminado del DOM');
    }

    document.body.classList.remove('modal-open');
}



// Event listener para cerrar modales al hacer clic fuera
document.addEventListener('DOMContentLoaded', function () {
    // Modal de información de vivienda
    const housingInfoModal = document.getElementById('housingInfoModal');
    if (housingInfoModal) {
        housingInfoModal.addEventListener('click', function (e) {
            if (e.target === housingInfoModal) {
                closeModal('housingInfoModal');
            }
        });
    }

    // Modal de recibos
    const recibosModal = document.getElementById('recibosModal');
    if (recibosModal) {
        recibosModal.addEventListener('click', function (e) {
            if (e.target === recibosModal) {
                closeModal('recibosModal');
            }
        });
    }
});

// ==================== FUNCIONES DE RECIBOS ====================

// Función para abrir modal de recibos
function openRecibosModal() {
    const modal = document.getElementById('recibosModal');
    if (modal) {
        // Mostrar modal con display flex para centrado
        modal.style.display = 'flex';
        modal.classList.add('show');

        // Bloquear scroll del fondo
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');

        // Cargar recibos
        loadRecibos();

    }
}

// Función para cargar recibos
async function loadRecibos() {
    const recibosList = document.getElementById('recibosList');
    const noRecibosMessage = document.getElementById('noRecibosMessage');

    if (!recibosList) return;

    if (!currentHousing || !currentHousing.inmueble_id || !currentHousing.propietario_id) {
        console.warn('⚠️ No hay información de vivienda o propietario para filtrar recibos.');
        showNoRecibos();
        return;
    }

    try {
        // Mostrar loading
        recibosList.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando recibos...</p>
            </div>
        `;

        const params = new URLSearchParams({
            inmueble_id: currentHousing.inmueble_id,
            propietario_id: currentHousing.propietario_id
        });

        const response = await fetch(`../../api/get_recibos.php?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success && data.recibos.length > 0) {
            displayRecibos(data.recibos);
            noRecibosMessage.style.display = 'none';
        } else {
            showNoRecibos();
        }

    } catch (error) {
        console.error('Error cargando recibos:', error);
        showNoRecibos();
    }
}

// Función para mostrar recibos
function displayRecibos(recibos) {
    const recibosList = document.getElementById('recibosList');

    recibosList.innerHTML = recibos.map(recibo => `
        <div class="recibo-item">
        <div class="recibo-info">
                <div class="recibo-header">
                    <h4><i class="fas fa-file-invoice"></i> Recibo #${recibo.id}</h4>
                    <span class="recibo-fecha">${formatDate(recibo.fecha_aprobacion)}</span>
                </div>
                <div class="recibo-details">
                    <p><strong>Período:</strong> ${recibo.mes}</p>
                    <p><strong>Monto:</strong> ${recibo.monto_bs ? recibo.monto_bs + ' Bs' : ''} ${recibo.monto_dolares ? '/ $' + recibo.monto_dolares : ''}</p>
                    <p><strong>Método:</strong> ${recibo.metodo_pago}</p>
                    <p><strong>Estado:</strong> <span class="status-badge status-${recibo.estado_detalle ? recibo.estado_detalle.toLowerCase() : 'confirmado'}">${recibo.estado_detalle || 'Confirmado'}</span></p>
                </div>
        </div>
        <div class="recibo-actions">
                <button class="btn-download" onclick="downloadRecibo(${recibo.pago_detalle_id || recibo.pago_id}, ${recibo.pago_detalle_id ? true : false})">
                    <i class="fas fa-download"></i> Descargar
            </button>
        </div>
        </div>
    `).join('');
}

// Función para mostrar mensaje de no recibos
function showNoRecibos() {
    const recibosList = document.getElementById('recibosList');
    const noRecibosMessage = document.getElementById('noRecibosMessage');

    recibosList.innerHTML = '';
    noRecibosMessage.style.display = 'block';
}

/**
 * Función para descargar recibo individual
 * 
 * @param {number} id - ID del recibo (puede ser pago_detalle_id o pago_id)
 * @param {boolean} isDetail - True si es un recibo individual (pago_detalle_id), false si es legacy (pago_id)
 */
function downloadRecibo(id, isDetail = true) {
    if (!id) {
        console.error('❌ No se proporcionó el ID del recibo:', id);
        alert('Error al generar el comprobante');
        return;
    }

    // Detectar la ruta base automáticamente
    const currentPath = window.location.pathname;
    let basePath = '';

    if (currentPath.includes('/pages/dashboard/')) {
        basePath = '../../';
    } else if (currentPath.includes('/pages/')) {
        basePath = '../';
    } else {
        basePath = '';
    }

    // Construir URL con el parámetro correcto
    const paramName = isDetail ? 'payment_detail_id' : 'payment_id';
    const downloadUrl = `${basePath}api/generate_payment_receipt.php?${paramName}=${id}`;

    console.log('🔽 Descargando recibo:', {
        id: id,
        tipo: isDetail ? 'Recibo Individual (Detalle)' : 'Recibo por Período (Legacy)',
        parametro: paramName,
        url: downloadUrl
    });

    // Crear un enlace temporal para descarga
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Recibo_${id}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);

    try {
        link.click();
        console.log('✅ Descarga iniciada correctamente');
    } catch (error) {
        console.log('⚠️ Descarga automática bloqueada, abriendo en nueva ventana...');
        window.open(downloadUrl, '_blank');
    }

    document.body.removeChild(link);
}

/**
 * Función para formatear fecha
 * Corrige el problema de timezone donde las fechas se mostraban un día antes
 * 
 * @param {string} dateString - Fecha en formato YYYY-MM-DD o YYYY-MM-DD HH:MM:SS
 * @return {string} Fecha formateada en español (ej: "24 de octubre de 2025")
 */
function formatDate(dateString) {
    // Si la fecha viene de la base de datos como YYYY-MM-DD HH:MM:SS
    // la parseamos manualmente para evitar problemas de timezone
    let date;

    if (dateString.includes(' ')) {
        // Formato: "2025-10-24 09:31:37" (directo de BD)
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        date = new Date(year, month - 1, day); // month-1 porque JavaScript usa 0-11
    } else {
        // Formato: "2025-10-24" o ISO string
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
    }

    // Formatear en español
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // Forzar UTC para consistencia
    });
}

// Función para verificar el estado de la sesión
window.checkSessionState = function () {
    const sessionStart = sessionStorage.getItem('sessionStart');
    const currentTime = Date.now();

    console.log('🔍 === ESTADO DE LA SESIÓN ===');
    console.log('📅 Timestamp de inicio:', sessionStart ? new Date(parseInt(sessionStart)).toLocaleString() : 'No establecido');
    console.log('⏰ Tiempo transcurrido:', sessionStart ? Math.round((currentTime - parseInt(sessionStart)) / 1000) + ' segundos' : 'N/A');
    console.log('✅ Alerta de deuda aparecerá:', sessionStart && (currentTime - parseInt(sessionStart)) <= 5000 ? 'SÍ' : 'NO');
};

// Función para verificar el estado de la vivienda actual
window.checkHousingState = function () {
    console.log('🔍 === ESTADO DE LA VIVIENDA ===');
    console.log('🏠 currentHousing:', currentHousing);

    if (currentHousing) {
        console.log('  - inmueble_id:', currentHousing.inmueble_id);
        console.log('  - tipo:', currentHousing.tipo);
        console.log('  - ubicación:', currentHousing.ubicacion);
        console.log('  - propietario:', currentHousing.nombre_propietario, currentHousing.apellido_propietario);
    } else {
        console.log('  - ⚠️ No hay vivienda seleccionada');
    }

    // Verificar elemento visual
    const housingInfoElement = document.getElementById('housingInfo');
    if (housingInfoElement) {
        console.log('📋 Elemento housingInfo encontrado:', housingInfoElement.innerHTML.length > 0);
        if (currentHousing && housingInfoElement.innerHTML.includes(currentHousing.inmueble_id)) {
            console.log('✅ La información visual coincide con currentHousing');
        } else {
            console.log('⚠️ La información visual NO coincide con currentHousing');
        }
    } else {
        console.log('❌ Elemento housingInfo no encontrado');
    }

    // Verificar elementos seleccionados
    const selectedItems = document.querySelectorAll('.housing-item.selected');
    console.log('🎯 Elementos seleccionados visualmente:', selectedItems.length);
    selectedItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.dataset.housingId}`);
    });
};

// Función para forzar actualización de la vivienda
window.forceHousingUpdate = function () {
    console.log('🔄 Forzando actualización completa de la vivienda...');

    if (currentHousing) {
        displayHousingInfo();
        loadPaymentSummary();
        loadCalendar();
        loadAvailableMonths();
        generateReport();
        console.log('✅ Actualización forzada completada');
    } else {
        console.log('⚠️ No hay vivienda seleccionada para actualizar');
    }
};

// Función para forzar actualización completa de información de vivienda
window.forceHousingInfoUpdate = function (inmuebleId) {
    console.log('🔄 === FORZANDO ACTUALIZACIÓN COMPLETA DE VIVIENDA ===');
    console.log('🏠 inmueble_id:', inmuebleId);

    if (!inmuebleId) {
        console.log('❌ No se proporcionó inmueble_id');
        return;
    }

    // Limpiar contenido actual
    const housingInfoElement = document.getElementById('housingInfo');
    if (housingInfoElement) {
        housingInfoElement.innerHTML = '<div class="loading">Cargando información de la vivienda...</div>';
    }

    // Obtener datos de la vivienda
    fetch(`../../api/get_housing_FINAL_WORKING.php?inmueble_id=${inmuebleId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.housing) {
                currentHousing = data.housing;
                console.log('✅ Datos de vivienda obtenidos:', currentHousing);

                // Actualizar información visual
                displayHousingInfo();

                // Actualizar toda la información del dashboard
                setTimeout(() => {
                    loadPaymentSummary();
                    loadCalendar();
                    loadAvailableMonths();
                    generateReport();
                    console.log('✅ Actualización completa finalizada');
                }, 500);
            } else {
                console.error('❌ Error obteniendo datos de vivienda:', data.message);
            }
        })
        .catch(error => {
            console.error('❌ Error en la petición:', error);
        });
}

// ========================================
// FUNCIONES PARA MÓDULO DE TRÁMITES
// ========================================

// Abrir modal de trámites
function openTramitesModal() {
    console.log('📋 Abriendo modal de trámites');
    const modal = document.getElementById('tramitesModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        // Cargar datos iniciales
        loadCartas();
        loadReclamos();
    }
}

// Cambiar entre tabs
function switchTab(tabId) {
    console.log('🔄 Cambiando a tab:', tabId);

    // Ocultar todos los tabs
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => tab.classList.remove('active'));

    // Desactivar todos los botones
    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));

    // Activar el tab seleccionado
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Activar el botón correspondiente
    const selectedButton = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Cargar datos cuando se cambia al tab de reclamos
    if (tabId === 'reclamosTab') {
        loadReclamos();
    }
}

// ========================================
// FUNCIONES PARA CARTAS DE RESIDENCIA
// ========================================

// Mostrar formulario de nueva carta
function openNuevaCartaForm() {
    console.log('📝 Abriendo formulario de nueva carta');
    const form = document.getElementById('nuevaCartaForm');
    const inmuebleDetails = document.getElementById('cartaInmuebleDetails');

    if (form) {
        // Mostrar información del inmueble desde currentHousing
        if (currentHousing && inmuebleDetails) {
            let ubicacion = '';

            // Construir ubicación según el tipo de inmueble
            if (currentHousing.tipo === 'Apartamento') {
                ubicacion = `<strong>Edificio:</strong> ${currentHousing.nombre_edificio || 'N/A'}<br>
                            <strong>Piso:</strong> ${currentHousing.piso || 'N/A'}<br>
                            <strong>Apartamento:</strong> ${currentHousing.numero_apartamento || 'N/A'}`;
            }

            inmuebleDetails.innerHTML = `
                <strong>Tipo:</strong> ${currentHousing.tipo || 'N/A'}<br>
                ${ubicacion}<br>
                <strong>Propietario:</strong> ${currentHousing.nombre_propietario || 'N/A'}
            `;
        }

        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Cancelar nueva carta
function cancelarNuevaCarta() {
    console.log('❌ Cancelando nueva carta');
    const form = document.getElementById('nuevaCartaForm');
    if (form) {
        form.style.display = 'none';
        document.getElementById('cartaForm').reset();
        const counter = document.getElementById('cartaMotivoCounter');
        if (counter) {
            counter.textContent = '0 / 1250';
        }
    }
}

// Variable global para almacenar items de cartas
let cartaItems = [];

// Cargar items de cartas disponibles
function loadCartaItems() {
    console.log('📥 Cargando items de cartas...');

    fetch('../../api/get_carta_items.php')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.items) {
                cartaItems = data.items;
                const select = document.getElementById('cartaTipo');
                if (select) {
                    select.innerHTML = '<option value="">Selecciona un tipo</option>';
                    data.items.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.item_id;
                        option.textContent = item.nombre_item;
                        option.dataset.precio = item.precio;
                        select.appendChild(option);
                    });

                    // Agregar evento para mostrar precio
                    select.addEventListener('change', function () {
                        const selectedOption = this.options[this.selectedIndex];
                        const precio = selectedOption.dataset.precio;
                        const precioGroup = document.getElementById('cartaPrecioGroup');
                        const precioValue = document.getElementById('cartaPrecio');

                        if (precio && this.value) {
                            precioValue.textContent = `$${parseFloat(precio).toFixed(2)}`;
                            precioGroup.style.display = 'block';
                        } else {
                            precioGroup.style.display = 'none';
                        }
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error cargando items:', error);
        });
}

// Cargar lista de solicitudes de cartas
function loadCartas() {
    console.log('📥 Cargando solicitudes de cartas...');
    const cartasList = document.getElementById('cartasList');

    if (!currentHousing || !currentHousing.inmueble_id) {
        console.warn('⚠️ No se encontró información de vivienda para cargar solicitudes');
        if (cartasList) {
            cartasList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-home"></i>
                    <p>No se pudo identificar tu vivienda actual.</p>
                </div>
            `;
        }
        return;
    }

    fetch(`../../api/get_solicitudes_cartas.php?inmueble_id=${currentHousing.inmueble_id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.solicitudes && data.solicitudes.length > 0) {
                cartasList.innerHTML = data.solicitudes.map(solicitud => {
                    const fecha = new Date(solicitud.fecha).toLocaleDateString('es-VE');
                    const estadoClass = solicitud.estado.toLowerCase().replace(' ', '_');

                    // Mostrar texto personalizado según el estado
                    let estadoTexto = solicitud.estado;
                    let mensajeEntrega = '';

                    const esPagada = solicitud.estado === 'Pagada' ||
                        solicitud.estado === 'Confirmado' ||
                        solicitud.estado === 'Confirmada';

                    const esEntregada = solicitud.estado === 'Entregado' ||
                        solicitud.estado === 'Entregada';

                    if (esPagada) {
                        estadoTexto = 'Pagada - Esperando Entrega';
                        mensajeEntrega = `
                            <div class="alert alert-warning mt-2" style="background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; width: 100%;">
                                <i class="fas fa-info-circle"></i>
                                La Junta de Condominio se comunicará con usted para coordinar la entrega física de su carta de residencia.
                            </div>
                        `;
                    } else if (esEntregada) {
                        estadoTexto = 'Entregado';
                    }

                    let botonPago = '';
                    if (solicitud.estado === 'Pendiente') {
                        botonPago = `
                            <button class="btn-primary btn-sm" onclick="pagarSolicitud(${solicitud.carta_id}, ${solicitud.precio}, ${solicitud.item_id})">
                                <i class="fas fa-credit-card"></i> Pagar $${parseFloat(solicitud.precio).toFixed(2)}
                            </button>
                        `;
                    }

                    return `
                        <div class="solicitud-card">
                            <div class="solicitud-header">
                                <div class="solicitud-title">${solicitud.nombre_item}</div>
                                <span class="status-badge ${estadoClass}">${estadoTexto}</span>
                            </div>
                            <div class="solicitud-body">
                                <p>${solicitud.descripcion}</p>
                                ${mensajeEntrega}
                            </div>
                            <div class="solicitud-footer">
                                <span class="solicitud-date">
                                    <i class="fas fa-calendar"></i> ${fecha}
                                </span>
                                <div class="solicitud-actions">
                                    ${botonPago}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                cartasList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No tienes solicitudes de cartas registradas</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error cargando solicitudes:', error);
        });
}

// Filtrar cartas por estado
function filterCartas() {
    const filter = document.getElementById('cartasFilter').value;
    console.log('🔍 Filtrando cartas por:', filter);
    // TODO: Implementar filtrado
}

// Función para pagar solicitud de carta
function pagarSolicitud(cartaId, precio, itemId) {
    console.log(`💳 Iniciando pago para solicitud ${cartaId} - Monto: $${precio}`);

    // Validar que existe currentHousing
    if (!currentHousing || !currentHousing.inmueble_id) {
        alert('❌ Error: No se pudo obtener la información del inmueble');
        return;
    }

    // Preparar información del inmueble
    const inmuebleInfo = {
        tipo: currentHousing.tipo || '',
        nombre_edificio: currentHousing.nombre_edificio || '',
        piso: currentHousing.piso || '',
        numero_apartamento: currentHousing.numero_apartamento || '',
    };

    // Preparar información del propietario
    const propietarioInfo = {
        nombre_propietario: currentHousing.nombre_propietario || ''
    };

    // Construir URL con parámetros
    const params = new URLSearchParams({
        carta_id: cartaId,
        item_id: itemId || '',
        inmueble_id: currentHousing.inmueble_id,
        propietario_id: currentHousing.propietario_id || '',
        inmueble_info: encodeURIComponent(JSON.stringify(inmuebleInfo)),
        propietario_info: encodeURIComponent(JSON.stringify(propietarioInfo))
    });

    // Redirigir a página de pago
    window.location.href = `../pagos/pago_item.html?${params.toString()}`;
}

// Manejar envío de formulario de carta
document.addEventListener('DOMContentLoaded', function () {
    const cartaForm = document.getElementById('cartaForm');
    const cartaMotivo = document.getElementById('cartaMotivo');
    const cartaCounter = document.getElementById('cartaMotivoCounter');
    const tramitesModal = document.getElementById('tramitesModal');

    if (cartaMotivo && cartaCounter) {
        const updateCartaCounter = () => {
            const length = cartaMotivo.value.length;
            cartaCounter.textContent = `${length} / 1250`;
        };

        cartaMotivo.addEventListener('input', updateCartaCounter);
        updateCartaCounter();
    }

    // Cargar items al abrir el modal
    loadCartaItems();

    if (cartaForm) {
        cartaForm.addEventListener('submit', function (e) {
            e.preventDefault();
            console.log('📤 Enviando solicitud de carta...');

            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            // Validar que existe currentHousing
            if (!currentHousing || !currentHousing.inmueble_id) {
                alert('❌ No se pudo obtener la información del inmueble');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
                return;
            }

            const formData = {
                motivo: document.getElementById('cartaMotivo').value,
                item_id: document.getElementById('cartaTipo').value,
                inmueble_id: currentHousing.inmueble_id,
                propietario_id: currentHousing.propietario_id || null
            };

            fetch('../../api/create_solicitud_carta.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('✅ ' + data.message);
                        cancelarNuevaCarta();
                        loadCartas();
                    } else {
                        alert('❌ ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('❌ Error al enviar solicitud');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
                });
        });
    }
});

// ========================================
// FUNCIONES PARA RECLAMOS O SUGERENCIAS
// ========================================

// Mostrar formulario de nuevo reclamo o sugerencia
function openNuevoReclamoForm() {
    console.log('📝 Abriendo formulario de nuevo reclamo o sugerencia');
    const form = document.getElementById('nuevoReclamoForm');
    if (form) {
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Cancelar nuevo reclamo o sugerencia
function cancelarNuevoReclamo() {
    console.log('❌ Cancelando nuevo reclamo o sugerencia');
    const form = document.getElementById('nuevoReclamoForm');
    if (form) {
        form.style.display = 'none';
        document.getElementById('reclamoForm').reset();
    }
}

// Cargar lista de reclamos o sugerencias
function loadReclamos() {
    console.log('📥 Cargando reclamos o sugerencias...');
    console.log('🏠 currentHousing:', currentHousing);

    const reclamosList = document.getElementById('reclamosList');
    if (!reclamosList) {
        console.error('Elemento reclamosList no encontrado');
        return;
    }

    if (!currentHousing || !currentHousing.inmueble_id) {
        console.warn('⚠️ No hay currentHousing o inmueble_id');
        reclamosList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-home"></i>
                <p>Debes tener una vivienda registrada para ver tus reclamos o sugerencias</p>
            </div>
        `;
        return;
    }

    console.log('🔍 Buscando reclamos para inmueble_id:', currentHousing.inmueble_id);
    fetch(`../../api/get_reclamos.php?inmueble_id=${currentHousing.inmueble_id}`)
        .then(response => response.json())
        .then(data => {
            console.log('📦 Respuesta de get_reclamos.php:', data);
            if (data.success && data.reclamos && data.reclamos.length > 0) {
                console.log('✅ Se encontraron', data.reclamos.length, 'reclamos');
                reclamosList.innerHTML = data.reclamos.map(reclamo => {
                    const fecha = new Date(reclamo.fecha).toLocaleDateString('es-VE');
                    const estadoClass = reclamo.estado.toLowerCase().replace(' ', '_');

                    // Extraer el título de la descripción (primera línea después de "TÍTULO:")
                    let tituloCorto = 'Reclamo o sugerencia';
                    const tituloMatch = reclamo.descripcion.match(/TÍTULO:\s*(.+)/);
                    if (tituloMatch) {
                        tituloCorto = tituloMatch[1].trim();
                    }

                    return `
                        <div class="solicitud-card">
                            <div class="solicitud-header">
                                <div class="solicitud-title">${tituloCorto}</div>
                                <span class="status-badge ${estadoClass}">${reclamo.estado}</span>
                            </div>
                            <div class="solicitud-body">
                                <p style="white-space: pre-line;">${reclamo.descripcion}</p>
                            </div>
                            <div class="solicitud-footer">
                                <span class="solicitud-date">
                                    <i class="fas fa-calendar"></i> ${fecha}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                reclamosList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No tienes reclamos o sugerencias registrados</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error cargando reclamos:', error);
            reclamosList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar los reclamos o sugerencias</p>
                </div>
            `;
        });
}

// Filtrar reclamos o sugerencias por estado
function filterReclamos() {
    const filter = document.getElementById('reclamosFilter').value;
    console.log('🔍 Filtrando reclamos o sugerencias por:', filter);
    // TODO: Implementar filtrado
}

// Manejar envío de formulario de reclamo o sugerencia
document.addEventListener('DOMContentLoaded', function () {
    const reclamoForm = document.getElementById('reclamoForm');
    if (reclamoForm) {
        reclamoForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            console.log('📤 Enviando reclamo o sugerencia...');

            // Validar que haya vivienda registrada
            if (!currentHousing || !currentHousing.inmueble_id) {
                showAlert('Debes tener una vivienda registrada para enviar un reclamo o sugerencia', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('inmueble_id', currentHousing.inmueble_id);
            formData.append('titulo', document.getElementById('reclamoTitulo').value);
            formData.append('categoria', document.getElementById('reclamoCategoria').value);
            formData.append('descripcion', document.getElementById('reclamoDescripcion').value);
            formData.append('prioridad', document.getElementById('reclamoPrioridad').value);

            console.log('Datos del formulario:', {
                inmueble_id: currentHousing.inmueble_id,
                titulo: formData.get('titulo'),
                categoria: formData.get('categoria'),
                descripcion: formData.get('descripcion'),
                prioridad: formData.get('prioridad')
            });

            try {
                const response = await fetch('../../api/create_reclamo.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('✅ Reclamo o sugerencia enviado correctamente', 'success');
                    cancelarNuevoReclamo();
                    loadReclamos();
                } else {
                    showAlert('❌ ' + (data.message || 'Error al enviar el reclamo o sugerencia'), 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('❌ Error al enviar el reclamo o sugerencia', 'error');
            }
        });
    }
});

// ============================================
// MÓDULO DE TIENDA - COMPRA DE ARTÍCULOS
// ============================================

/**
 * Cargar artículos disponibles en la tienda (categoría_id = 5)
 */
async function loadArticulosTienda() {
    console.log('🛒 Cargando artículos de la tienda...');

    try {
        const response = await fetch('../../api/get_articulos_tienda.php');
        const data = await response.json();

        if (data.success && data.items) {
            console.log(`✅ ${data.items.length} artículos cargados`);
            displayArticulosTienda(data.items);
        } else {
            console.log('⚠️ No hay artículos disponibles');
            displayArticulosTienda([]);
        }
    } catch (error) {
        console.error('❌ Error cargando artículos:', error);
        showAlert('Error al cargar los artículos de la tienda', 'error');
    }
}

/**
 * Mostrar artículos en el contenedor
 */
function displayArticulosTienda(articulos) {
    const container = document.getElementById('articulosContainer');

    if (!container) {
        console.error('❌ Contenedor articulosContainer no encontrado');
        return;
    }

    if (articulos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                No hay artículos disponibles en este momento.
            </div>
        `;
        return;
    }

    // Generar HTML para cada artículo
    const articulosHTML = articulos.map(articulo => {
        // Determinar la imagen del artículo
        const imagenUrl = articulo.imagen_url;
        const imagenHTML = imagenUrl
            ? `<img src="../../superadmin/${imagenUrl}" alt="${articulo.nombre_item}" class="articulo-image" onclick="verImagenGrande(this.src)" title="Clic para ampliar" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-box articulo-image-placeholder\\'></i>'">`
            : `<i class="fas fa-box articulo-image-placeholder"></i>`;

        return `
        <div class="articulo-card" data-item-id="${articulo.item_id}">
            <div class="articulo-image-container">
                ${imagenHTML}
            </div>
            
            <div class="articulo-content">
                <div class="articulo-header">
                    <h5 class="articulo-nombre">
                        ${articulo.nombre_item}
                    </h5>
                    <span class="articulo-stock ${articulo.stock < 5 ? 'stock-bajo' : ''}">
                        <i class="fas fa-warehouse"></i>
                        ${articulo.stock}
                    </span>
                </div>
                
                <div class="articulo-body">
                    <p class="articulo-descripcion">
                        ${articulo.descripcion || 'Sin descripción disponible'}
                    </p>
                    
                    <div class="articulo-footer">
                        <div class="articulo-precio">
                            <span class="precio-label">Precio</span>
                            <span class="precio-valor">$${parseFloat(articulo.precio).toFixed(2)}</span>
                        </div>
                        
                        <button 
                            class="btn btn-primary btn-comprar"
                            onclick="comprarArticulo(${articulo.item_id}, '${articulo.nombre_item.replace(/'/g, "\\'")}', ${articulo.precio})"
                            ${articulo.stock === 0 ? 'disabled' : ''}
                        >
                            <i class="fas fa-shopping-cart"></i>
                            ${articulo.stock === 0 ? 'Agotado' : 'Comprar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = articulosHTML;
}

/**
 * Comprar un artículo (redirige al sistema de pago)
 */
async function comprarArticulo(itemId, nombreItem, precio) {
    console.log(`🛒 Iniciando compra: ${nombreItem} - $${precio}`);

    // Validar que existe currentHousing
    if (!currentHousing || !currentHousing.inmueble_id) {
        showAlert('❌ Error: No se pudo obtener la información del inmueble', 'error');
        return;
    }

    // Confirmar compra con modal profesional
    const confirmar = await modalConfirm.confirm({
        title: '🛒 Confirmar Compra',
        message: `¿Deseas comprar "${nombreItem}"?`,
        details: [
            { label: 'Artículo', value: nombreItem },
            { label: 'Precio', value: `$${parseFloat(precio).toFixed(2)} USD` },
            { label: 'Acción', value: 'Se te redirigirá a la página de pago' }
        ],
        icon: 'info',
        confirmText: 'Proceder al Pago',
        cancelText: 'Cancelar',
        confirmIcon: 'fa-shopping-cart',
        cancelIcon: 'fa-times'
    });

    if (!confirmar) {
        console.log('❌ Compra cancelada por el usuario');
        return;
    }

    // Usar la función pagarSolicitud existente
    // Nota: pagarSolicitud espera (cartaId, precio, itemId)
    // Para artículos de tienda, usamos itemId como identificador principal
    pagarSolicitud(null, precio, itemId);
}

/**
 * Abrir modal de tienda
 */
function abrirTienda() {
    const modal = document.getElementById('tiendaModal');

    if (!modal) {
        console.error('❌ Modal de tienda no encontrado');
        return;
    }

    // Validar que el usuario tenga vivienda registrada
    if (!currentHousing || !currentHousing.inmueble_id) {
        showAlert('❌ Debes tener una vivienda registrada para acceder a la tienda', 'error');
        return;
    }

    console.log('🛒 Abriendo tienda...');
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('no-scroll');

    // Cargar artículos
    loadArticulosTienda();
}

/**
 * Cerrar modal de tienda
 */
function cerrarTienda() {
    const modal = document.getElementById('tiendaModal');

    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');

        // Solo quitar no-scroll si no hay otros modales abiertos
        const gastosModal = document.getElementById('gastosModal');
        const zoomModal = document.getElementById('imageZoomModal');
        if ((!gastosModal || gastosModal.style.display === 'none') &&
            (!zoomModal || zoomModal.style.display === 'none' || zoomModal.style.display === '')) {
            document.body.classList.remove('no-scroll');
        }

        console.log('🛒 Tienda cerrada');
    }
}

/**
 * Recargar artículos de la tienda
 */
function recargarTienda() {
    console.log('🔄 Recargando artículos...');
    loadArticulosTienda();
}

/**
 * Ver imagen en grande (Zoom)
 */
function verImagenGrande(url) {
    const modal = document.getElementById('imageZoomModal');
    const img = document.getElementById('zoomedImage');
    if (modal && img) {
        img.src = url;
        modal.style.display = 'block';
        document.body.classList.add('no-scroll');
    }
}

/**
 * Cerrar zoom de imagen
 */
function cerrarImagenGrande() {
    const modal = document.getElementById('imageZoomModal');
    if (modal) {
        modal.style.display = 'none';
        // Solo quitar no-scroll si no hay otros modales abiertos
        const tiendaModal = document.getElementById('tiendaModal');
        const gastosModal = document.getElementById('gastosModal');
        if ((!tiendaModal || tiendaModal.style.display === 'none') &&
            (!gastosModal || gastosModal.style.display === 'none')) {
            document.body.classList.remove('no-scroll');
        }
    }
}
// Event listener para cerrar modal al hacer clic fuera - DESHABILITADO
// Los modales tiendaModal y gastosModal están protegidos en window.onclick
// y no deben cerrarse al hacer clic fuera
/*
document.addEventListener('click', function(event) {
    const modal = document.getElementById('tiendaModal');
    if (modal && event.target === modal) {
        cerrarTienda();
    }
    
    const gastosModal = document.getElementById('gastosModal');
    if (gastosModal && event.target === gastosModal) {
        cerrarGastosExtraordinarios();
    }
});
*/

// ============================================================================
// MÓDULO DE GASTOS EXTRAORDINARIOS
// ============================================================================

/**
 * Cargar gastos extraordinarios desde el API
 */
async function loadGastosExtraordinarios() {
    try {
        console.log('📋 Cargando gastos extraordinarios...');

        const response = await fetch('../../api/get_gastos_extraordinarios.php');
        const data = await response.json();

        if (data.success) {
            console.log(`✅ ${data.items.length} gastos extraordinarios cargados`);
            displayGastosExtraordinarios(data.items);
        } else {
            console.error('❌ Error al cargar gastos:', data.message);
            showAlert('Error al cargar gastos extraordinarios', 'error');
        }
    } catch (error) {
        console.error('❌ Error en loadGastosExtraordinarios:', error);
        showAlert('Error al conectar con el servidor', 'error');
    }
}

/**
 * Mostrar gastos extraordinarios en el modal
 */
function displayGastosExtraordinarios(gastos) {
    const container = document.getElementById('gastosContainer');

    if (!container) {
        console.error('❌ No se encontró el contenedor gastosContainer');
        return;
    }

    if (!gastos || gastos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>No hay gastos extraordinarios disponibles</strong>
                <p>No hay gastos extraordinarios en este momento.</p>
            </div>
        `;
        return;
    }

    const gastosHTML = gastos.map(gasto => {
        // Determinar la imagen del gasto
        const imagenUrl = gasto.imagen_url;
        const imagenHTML = imagenUrl
            ? `<img src="../../superadmin/${imagenUrl}" alt="${gasto.nombre_item}" class="gasto-image" onclick="verImagenGrande(this.src)" title="Clic para ampliar" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-exclamation-triangle articulo-image-placeholder\\'></i>'">`
            : `<i class="fas fa-exclamation-triangle articulo-image-placeholder"></i>`;

        return `
        <div class="gasto-card" data-item-id="${gasto.item_id}">
            <div class="gasto-image-container">
                ${imagenHTML}
            </div>
            
            <div class="gasto-content">
                <div class="gasto-header">
                    <h5 class="gasto-nombre">
                        ${gasto.nombre_item}
                    </h5>
                </div>
                
                <div class="gasto-body">
                    <p class="gasto-descripcion">
                        ${gasto.descripcion || 'Sin descripción disponible'}
                    </p>
                    
                    <div class="gasto-footer">
                        <div class="gasto-precio">
                            <span class="precio-label">Monto</span>
                            <span class="precio-valor">$${parseFloat(gasto.precio).toFixed(2)}</span>
                        </div>
                        
                        <button 
                            class="btn-pagar-gasto"
                            onclick="pagarGastoExtraordinario(${gasto.item_id}, '${gasto.nombre_item.replace(/'/g, "\\'")}', ${gasto.precio})"
                        >
                            <i class="fas fa-credit-card"></i>
                            Pagar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = gastosHTML;
}

/**
 * Pagar un gasto extraordinario
 */
async function pagarGastoExtraordinario(itemId, nombreItem, precio) {
    console.log(`💳 Iniciando pago de gasto: ${nombreItem} ($${precio})`);

    // Validar que existe currentHousing
    if (!currentHousing || !currentHousing.inmueble_id) {
        showAlert('❌ Error: No se pudo obtener la información del inmueble', 'error');
        return;
    }

    // Confirmar pago con modal profesional
    const confirmar = await modalConfirm.confirm({
        title: '💳 Confirmar Pago',
        message: `¿Deseas pagar "${nombreItem}"?`,
        details: [
            { label: 'Concepto', value: nombreItem },
            { label: 'Monto', value: `$${parseFloat(precio).toFixed(2)} USD` },
            { label: 'Acción', value: 'Se te redirigirá a la página de pago' }
        ],
        icon: 'warning',
        confirmText: 'Proceder al Pago',
        cancelText: 'Cancelar',
        confirmIcon: 'fa-credit-card',
        cancelIcon: 'fa-times'
    });

    if (!confirmar) {
        console.log('❌ Pago cancelado por el usuario');
        return;
    }

    // Usar la misma función pagarSolicitud que usa la tienda
    // Para gastos extraordinarios, usamos null como cartaId
    pagarSolicitud(null, precio, itemId);
}

/**
 * Abrir modal de gastos extraordinarios
 */
function abrirGastosExtraordinarios() {
    const modal = document.getElementById('gastosModal');

    if (!modal) {
        console.error('❌ No se encontró el modal de gastos extraordinarios');
        showAlert('Error: Modal no encontrado', 'error');
        return;
    }

    // Validar que el usuario tenga vivienda registrada
    if (!window.currentHousing || !window.currentHousing.inmueble_id) {
        showAlert('❌ Debes tener una vivienda registrada para ver gastos extraordinarios', 'error');
        return;
    }

    console.log('📋 Abriendo gastos extraordinarios...');
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');

    // Cargar gastos
    loadGastosExtraordinarios();
}

/**
 * Cerrar modal de gastos extraordinarios
 */
function cerrarGastosExtraordinarios() {
    const modal = document.getElementById('gastosModal');

    if (modal) {
        modal.style.display = 'none';

        // Solo quitar no-scroll si no hay otros modales abiertos
        const tiendaModal = document.getElementById('tiendaModal');
        const zoomModal = document.getElementById('imageZoomModal');
        if ((!tiendaModal || tiendaModal.style.display === 'none') &&
            (!zoomModal || zoomModal.style.display === 'none' || zoomModal.style.display === '')) {
            document.body.classList.remove('no-scroll');
        }

        console.log('📋 Modal de gastos cerrado');
    }
}

/**
 * Recargar gastos extraordinarios
 */
function recargarGastosExtraordinarios() {
    console.log('🔄 Recargando gastos extraordinarios...');
    loadGastosExtraordinarios();
}
