/**
 * PROTECCIÓN SIMPLE DE NAVEGACIÓN
 * - En login: No permite ir hacia adelante al menú
 * - Después de logout: No permite regresar al menú
 */

// Configuración simple
const NAVIGATION_PROTECTION = {
    loginUrl: '/pages/auth/index.html',
    dashboardUrl: '/pages/dashboard/dashboard.html'
};

/**
 * Verificar si estamos en la página de login
 */
function isLoginPage() {
    return window.location.pathname.includes('auth/index.html') ||
        window.location.pathname.includes('login');
}

/**
 * Verificar si estamos en una página protegida (menú)
 */
function isProtectedPage() {
    const protectedPages = [
        'dashboard.html',
        'configuracion.html',
        'admin.html',
        'superadmin/html/super_admin.html',
        'admin_usuarios.html',
        'informacion_casas.html',
        'gestion_usuarios.html',
        'pagos.html',
        'reportes.html',
        'reportes_casa.html',
        'acumulado_mensual.html',
        'calendario.html'
    ];

    return protectedPages.some(page => window.location.pathname.includes(page));
}

/**
 * Configurar protección en página de login
 */
function setupLoginProtection() {
    if (!isLoginPage()) return;

    console.log('🔒 Configurando protección para página de login...');

    // 1. Detectar navegación hacia adelante (botón adelante)
    window.addEventListener('popstate', function (event) {
        console.log('➡️ Navegación hacia adelante detectada en login');

        // Si intenta ir hacia adelante, mantenerlo en login
        if (isLoginPage()) {
            console.log('🚫 Bloqueando navegación hacia adelante desde login');
            window.history.pushState(null, null, window.location.href);
        }
    });

    // 2. Agregar entrada al historial para bloquear navegación hacia adelante
    window.history.pushState(null, null, window.location.href);

    // 3. Detectar cuando se presiona el botón adelante del navegador
    window.addEventListener('beforeunload', function (event) {
        // No hacer nada especial, solo prevenir navegación no deseada
    });

    console.log('✅ Protección de login configurada');
}

/**
 * Configurar protección después de logout
 */
function setupLogoutProtection() {
    if (!isProtectedPage()) return;

    console.log('🔒 Configurando protección para páginas protegidas...');

    // Detectar navegación hacia atrás
    window.addEventListener('popstate', function (event) {
        console.log('⬅️ Navegación hacia atrás detectada');

        // Si intenta regresar a una página protegida, redirigir al login
        if (isProtectedPage()) {
            console.log('🚫 Bloqueando regreso a página protegida, redirigiendo al login');
            window.location.replace(NAVIGATION_PROTECTION.loginUrl);
        }
    });

    // Agregar entrada al historial para detectar navegación hacia atrás
    window.history.pushState(null, null, window.location.href);

    console.log('✅ Protección de logout configurada');
}

/**
 * Función mejorada de logout
 */
async function enhancedLogout() {
    console.log('🚪 Solicitando confirmación de cierre de sesión...');

    // Mostrar modal de confirmación
    const confirmed = await window.modalConfirm.confirm({
        title: '¿Cerrar Sesión?',
        message: '¿Está seguro de que desea cerrar su sesión?',
        icon: 'question',
        confirmText: 'Sí, Cerrar Sesión',
        cancelText: 'Cancelar',
        confirmIcon: 'fa-sign-out-alt',
        cancelIcon: 'fa-times'
    });

    // Si el usuario cancela, no hacer nada
    if (!confirmed) {
        console.log('❌ Cierre de sesión cancelado por el usuario');
        return;
    }

    console.log('✅ Cierre de sesión confirmado, procediendo...');

    // Marcar logout PRIMERO
    localStorage.setItem('logout_flag', 'true');

    // Limpiar datos locales
    if (typeof currentUser !== 'undefined') currentUser = null;
    if (typeof currentHousing !== 'undefined') currentHousing = null;
    if (typeof selectedMonths !== 'undefined') selectedMonths = [];

    // Limpiar almacenamiento (excepto la flag de logout)
    sessionStorage.clear();

    // Llamar al logout del servidor
    fetch('/api/logout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).finally(() => {
        // Redirigir usando replace para evitar navegación hacia atrás
        window.location.replace('/pages/auth/index.html');
    });
}

/**
 * Inicializar protección según el tipo de página
 */
function initNavigationProtection() {
    console.log('🛡️ Iniciando protección de navegación...');

    if (isLoginPage()) {
        setupLoginProtection();
    } else if (isProtectedPage()) {
        setupLogoutProtection();
    }

    console.log('✅ Protección de navegación iniciada');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationProtection);
} else {
    initNavigationProtection();
}

// Exportar función de logout mejorada para uso global
window.enhancedLogout = enhancedLogout;
