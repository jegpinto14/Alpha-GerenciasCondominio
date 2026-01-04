// Sistema de autenticación para Arcorui
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Verificar si venimos de un logout (usando localStorage para mayor robustez)
    if (localStorage.getItem('logout_flag') === 'true') {
        console.log('👋 Logout detectado por localStorage, omitiendo verificación de sesión');
        localStorage.removeItem('logout_flag');
        // Limpiar URL si tiene el parámetro (por compatibilidad)
        if (window.location.search.includes('logout=true')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else {
        // Verificar si ya está logueado
        checkSession();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function checkSession() {
    try {
        const response = await fetch('../../api/check_session.php');
        const data = await response.json();

        if (data.success) {
            // Usuario ya está logueado, redirigir según el tipo
            if (data.user.tipo === 'superadmin') {
                window.location.href = '../superadmin/html/index.html';
            } else if (data.user.tipo === 'admin') {
                window.location.href = '../admin/admin.php';
            } else {
                window.location.href = '../dashboard/dashboard.html';
            }
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('../../api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showSuccessModal();

            // Redirigir automáticamente después de 2 segundos
            setTimeout(() => {
                // Redirigir según el tipo de usuario usando redirect_url del servidor
                if (result.redirect_url) {
                    window.location.href = result.redirect_url;
                } else {
                    // Fallback basado en el tipo de usuario
                    if (result.user.tipo === 'superadmin') {
                        window.location.href = '../superadmin/html/index.html';
                    } else if (result.user.tipo === 'admin') {
                        window.location.href = '../admin/admin.php';
                    } else {
                        window.location.href = '../dashboard/dashboard.html';
                    }
                }
            }, 2000);
        } else {
            showLoginError('Usuario o contraseña incorrecto');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showLoginError('Error de conexión');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirm_password: formData.get('confirm_password')
    };

    // Validación del lado del cliente
    if (data.password !== data.confirm_password) {
        showAlert('Las contraseñas no coinciden', 'error');
        return;
    }

    if (data.password.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const response = await fetch('../../api/register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Registro exitoso. Redirigiendo al login...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showAlert('Error de conexión', 'error');
    }
}

function showLoginError(message) {
    // Crear el modal de error si no existe
    let errorModal = document.getElementById('loginErrorModal');
    if (!errorModal) {
        errorModal = document.createElement('div');
        errorModal.id = 'loginErrorModal';
        errorModal.className = 'modal';
        errorModal.innerHTML = `
            <div class="modal-content login-error">
                <div class="error-header">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="error-title">Error de Login</h3>
                </div>
                <div class="error-body">
                    <p class="error-message"></p>
                </div>
            </div>
        `;
        document.body.appendChild(errorModal);

        // Agregar estilos CSS específicos para el error de login
        const style = document.createElement('style');
        style.textContent = `
            .modal-content.login-error {
                max-width: 400px;
                width: 90%;
                padding: 0;
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
                border: 2px solid #f5c6cb;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(220, 53, 69, 0.3);
                animation: slideInDown 0.4s ease-out;
            }
            
            .error-header {
                padding: 20px 25px 15px;
                text-align: center;
                border-bottom: 1px solid rgba(220, 53, 69, 0.2);
            }
            
            .error-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 15px;
                animation: pulse 2s infinite;
            }
            
            .error-icon i {
                font-size: 24px;
                color: white;
            }
            
            .error-title {
                margin: 0;
                color: #721c24;
                font-size: 1.3rem;
                font-weight: 700;
            }
            
            .error-body {
                padding: 15px 25px 20px;
                text-align: center;
            }
            
            .error-message {
                margin: 0;
                color: #721c24;
                font-size: 1rem;
                font-weight: 500;
                line-height: 1.4;
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
            
            @keyframes pulse {
                0% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
                100% {
                    transform: scale(1);
                }
            }
            
            @media (max-width: 768px) {
                .modal-content.login-error {
                    max-width: 95%;
                    width: 95%;
                }
                
                .error-header {
                    padding: 15px 20px 12px;
                }
                
                .error-icon {
                    width: 50px;
                    height: 50px;
                    margin-bottom: 12px;
                }
                
                .error-icon i {
                    font-size: 20px;
                }
                
                .error-title {
                    font-size: 1.1rem;
                }
                
                .error-body {
                    padding: 12px 20px 15px;
                }
                
                .error-message {
                    font-size: 0.9rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Actualizar el mensaje
    const messageElement = errorModal.querySelector('.error-message');
    messageElement.textContent = message;

    // Mostrar el modal
    errorModal.style.display = 'flex';

    // Auto-cerrar después de 2 segundos
    setTimeout(() => {
        errorModal.style.display = 'none';
    }, 2000);
}

function showAlert(message, type) {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    // Insertar al inicio del body
    document.body.insertBefore(alertDiv, document.body.firstChild);

    // Remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Función para mostrar/ocultar contraseña
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        passwordIcon.className = 'fas fa-eye';
    }
}

// Función para mostrar modal de éxito
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';

        // Agregar contador visual
        startCountdown();
    }
}

// Función para mostrar contador de 2 segundos
function startCountdown() {
    const button = document.querySelector('#successModal .btn-login');
    if (!button) return;

    let timeLeft = 2;
    const originalText = button.innerHTML;

    const countdown = setInterval(() => {
        if (timeLeft > 0) {
            button.innerHTML = `<i class="fas fa-check"></i> Continuar (${timeLeft}s)`;
            timeLeft--;
        } else {
            clearInterval(countdown);
            button.innerHTML = originalText;
        }
    }, 1000);
}

// Función para cerrar modal de éxito
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para logout
async function logout() {
    try {
        const response = await fetch('../../api/logout.php', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error en logout:', error);
        // Redirigir de todas formas
        window.location.href = 'index.html';
    }
}
