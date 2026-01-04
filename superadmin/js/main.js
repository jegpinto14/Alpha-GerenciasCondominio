// Funciones principales del dashboard - Versión 2.0
document.addEventListener('DOMContentLoaded', function () {
    // Inicializar la aplicación
    console.log('Sistema de Gestión de Pagos - Arcorui iniciado v2.0');

    // Agregar efectos de hover a las tarjetas
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Función para cerrar sesión
function cerrarSesion() {
    const modal = document.getElementById('logoutModal');
    if (!modal) {
        console.warn('No se encontró el modal de cierre de sesión');
        return;
    }

    const confirmarBtn = document.getElementById('confirmLogoutBtn');
    const cancelarBtn = document.getElementById('cancelLogoutBtn');
    const backdrop = modal.querySelector('[data-close="logout"]');

    const cerrarModal = () => {
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('hidden', '');
    };

    const confirmarCierre = async () => {
        cerrarModal();

        try {
            // Llamar al API de logout
            const response = await fetch('../../api/logout.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Establecer flag de logout en localStorage
                localStorage.setItem('logout_flag', 'true');
                // Redirigir al login SIN guardar en historial
                window.location.replace('../../pages/auth/index.html');
            } else {
                console.error('Error al cerrar sesión:', result.message);
                // Redirigir de todas formas
                localStorage.setItem('logout_flag', 'true');
                window.location.replace('../../pages/auth/index.html');
            }
        } catch (error) {
            console.error('Error en logout:', error);
            // Redirigir de todas formas
            localStorage.setItem('logout_flag', 'true');
            window.location.replace('../../pages/auth/index.html');
        }
    };

    if (confirmarBtn) {
        confirmarBtn.onclick = confirmarCierre;
    }
    if (cancelarBtn) {
        cancelarBtn.onclick = cerrarModal;
    }
    if (backdrop) {
        backdrop.onclick = cerrarModal;
    }

    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

// Funciones para abrir cada sección
function abrirConfiguracion() {
    alert('Abriendo Configuración de Usuario...\n\nAquí podrás:\n- Cambiar tu contraseña\n- Actualizar información personal\n- Configurar preferencias de notificación');
    // Aquí se implementaría la navegación a la página de configuración
    // window.location.href = 'configuracion.html';
}

function abrirViviendas() {
    window.location.href = 'gestionar-viviendas.html';
}

// Función para abrir gestión de usuarios
function abrirGestionUsuarios() {
    window.location.href = 'gestion-usuarios.html';
}

// Función para abrir estado de pagos
function abrirEstadoPagos() {
    window.location.href = 'estado-pagos.html';
}

function abrirIngresos() {
    console.log('🚀 Navegando a ingresos.html...');
    console.log('URL actual:', window.location.href);
    console.log('URL destino: ingresos.html');

    // Forzar navegación inmediata
    window.location.replace('ingresos.html');
}

function abrirGastos() {
    window.location.href = 'gastos.html';
}

function abrirSolicitudesResidencia() {
    window.location.href = 'solicitudes-residencia.html';
}

function abrirReclamos() {
    window.location.href = 'reclamos.html';
}

function abrirPagosExtraordinarios() {
    window.location.href = 'pagos-extraordinarios.html';
}

function abrirRegistroPagos() {
    window.location.href = '../pagos/pagos.html';
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;

    // Agregar estilos si no existen
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                color: white;
                font-weight: 500;
                z-index: 1000;
                animation: slideIn 0.3s ease;
                max-width: 300px;
            }
            .notification-success { background-color: #10b981; }
            .notification-error { background-color: #ef4444; }
            .notification-info { background-color: #3b82f6; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Remover la notificación después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Función para validar formularios (para uso futuro)
function validarFormulario(formulario) {
    const campos = formulario.querySelectorAll('input[required], select[required], textarea[required]');
    let esValido = true;

    campos.forEach(campo => {
        if (!campo.value.trim()) {
            campo.style.borderColor = '#ef4444';
            esValido = false;
        } else {
            campo.style.borderColor = '#d1d5db';
        }
    });

    return esValido;
}

// Función para formatear números como moneda
function formatearMoneda(monto) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
    }).format(monto);
}

// Función para formatear fechas
function formatearFecha(fecha) {
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(fecha));
}

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cerrarSesion,
        abrirConfiguracion,
        abrirInformacionCasa,
        abrirIngresos,
        abrirGastos,
        abrirPagosExtraordinarios,
        abrirSolicitudesResidencia,
        abrirReclamos,
        abrirRegistroPagos,
        abrirPagoCasa,
        mostrarNotificacion,
        validarFormulario,
        formatearMoneda,
        formatearFecha
    };
}
