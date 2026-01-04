// Validaciones dinámicas para el formulario de registro
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('reg_username');
    const passwordInput = document.getElementById('reg_password');
    const confirmPasswordInput = document.getElementById('reg_confirm_password');
    const passwordMatch = document.getElementById('password-match');
    
    // Elementos de requisitos de contraseña
    const reqLength = document.getElementById('req-length');
    const reqSpecial = document.getElementById('req-special');
    const reqUppercase = document.getElementById('req-uppercase');
    
    // Verificar que los elementos existen
    if (!reqLength || !reqSpecial || !reqUppercase) {
        console.error('No se encontraron todos los elementos de validación de contraseña');
        return;
    }
    
    // Función para alternar visibilidad de contraseña
    function togglePasswordVisibility(inputId) {
        const passwordInput = document.getElementById(inputId);
        const eyeIcon = document.getElementById(inputId + '-eye');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }
    
    // Hacer la función global para uso desde HTML
    window.togglePasswordVisibility = togglePasswordVisibility;
    
    // Función para verificar si el username ya existe
    async function checkUsernameUnique(username) {
        try {
            const response = await fetch('../../api/check_username_unique_register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username })
            });
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error verificando username único:', error);
            return { success: false, message: 'Error verificando username' };
        }
    }
    
    // Validación de username en tiempo real
    let usernameTimeout;
    usernameInput.addEventListener('input', function() {
        const username = this.value.trim();
        
        // Limpiar timeout anterior
        clearTimeout(usernameTimeout);
        
        // Validar formato básico
        if (username.length < 3 || username.length > 8) {
            showUsernameError('El usuario debe tener entre 3 y 8 caracteres');
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showUsernameError('El usuario solo puede contener letras, números y guiones bajos');
            return;
        }
        
        // Verificar unicidad después de un pequeño delay
        usernameTimeout = setTimeout(async () => {
            const uniqueCheck = await checkUsernameUnique(username);
            
            if (!uniqueCheck.success && uniqueCheck.username_exists) {
                showUsernameError('Este usuario ya está registrado');
            } else if (uniqueCheck.success) {
                clearUsernameError();
            }
        }, 500); // Delay de 500ms para evitar muchas consultas
    });
    
    // Función para mostrar error de username
    function showUsernameError(message) {
        usernameInput.style.borderColor = '#e74c3c';
        usernameInput.style.backgroundColor = '#fdf2f2';
        
        // Si es un error de usuario existente, NO mostrar mensaje de arriba (solo popup)
        if (message.includes('ya está registrado')) {
            return; // No mostrar mensaje de arriba para usuarios existentes
        }
        
        // Para otros errores (longitud, caracteres), mostrar mensaje de arriba
        let errorElement = document.getElementById('username-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'username-error';
            errorElement.className = 'validation-message error';
            usernameInput.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
    
    // Función para limpiar error de username
    function clearUsernameError() {
        usernameInput.style.borderColor = '';
        usernameInput.style.backgroundColor = '';
        
        const errorElement = document.getElementById('username-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    // Función para mostrar popup (rojo para errores, verde para éxito)
    function showPopup(title, message, type = 'info') {
        // Crear el modal si no existe
        let errorModal = document.getElementById('usernameErrorModal');
        if (!errorModal) {
            errorModal = document.createElement('div');
            errorModal.id = 'usernameErrorModal';
            errorModal.className = 'modal';
            errorModal.innerHTML = `
                <div class="modal-content username-error">
                    <div class="error-header">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 class="error-title">${title}</h3>
                    </div>
                    <div class="error-body">
                        <p class="error-message"></p>
                    </div>
                </div>
            `;
            document.body.appendChild(errorModal);
            
            // Agregar estilos CSS específicos
            const style = document.createElement('style');
            style.textContent = `
                .modal-content.username-error {
                    max-width: 400px;
                    width: 90%;
                    padding: 0;
                    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
                    border: 2px solid #f5c6cb;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(220, 53, 69, 0.3);
                    animation: slideInDown 0.4s ease-out;
                }
                
                .modal-content.username-error.success {
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                    border: 2px solid #c3e6cb;
                    box-shadow: 0 10px 30px rgba(40, 167, 69, 0.3);
                }
                
                .error-header {
                    padding: 20px 25px 15px;
                    text-align: center;
                    border-bottom: 1px solid rgba(220, 53, 69, 0.2);
                }
                
                .modal-content.username-error.success .error-header {
                    border-bottom: 1px solid rgba(40, 167, 69, 0.2);
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
                
                .modal-content.username-error.success .error-icon {
                    background: linear-gradient(135deg, #28a745 0%, #218838 100%);
                }
                
                .error-icon i {
                    font-size: 24px;
                    color: white;
                }
                
                .modal-content.username-error.success .error-icon i {
                    font-family: 'Font Awesome 5 Free';
                    font-weight: 900;
                }
                
                .modal-content.username-error.success .error-icon i:before {
                    content: "\\f00c";
                }
                
                .error-title {
                    margin: 0;
                    color: #721c24;
                    font-size: 1.3rem;
                    font-weight: 700;
                }
                
                .modal-content.username-error.success .error-title {
                    color: #155724;
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
                
                .modal-content.username-error.success .error-message {
                    color: #155724;
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
                    .modal-content.username-error {
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
        
        // Actualizar el título
        const titleElement = errorModal.querySelector('.error-title');
        titleElement.textContent = title;
        
        // Cambiar icono según el tipo
        const iconElement = errorModal.querySelector('.error-icon i');
        if (type === 'success') {
            errorModal.querySelector('.modal-content').classList.add('success');
            iconElement.className = 'fas fa-check';
        } else {
            errorModal.querySelector('.modal-content').classList.remove('success');
            iconElement.className = 'fas fa-exclamation-triangle';
        }
        
        // Mostrar el modal
        errorModal.style.display = 'flex';
        
        // Auto-cerrar después de 2 segundos
        setTimeout(() => {
            errorModal.style.display = 'none';
        }, 2000);
    }
    
    // Inicializar estilos de los elementos de validación
    function initializePasswordRequirements() {
        reqLength.classList.add('invalid');
        reqSpecial.classList.add('invalid');
        reqUppercase.classList.add('invalid');
    }
    
    // Inicializar al cargar la página
    initializePasswordRequirements();
    
    // Validación de contraseña en tiempo real
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        validatePassword(password);
        validatePasswordMatch();
    });
    
    // Validación de confirmación de contraseña
    confirmPasswordInput.addEventListener('input', function() {
        validatePasswordMatch();
    });
    
    
    // Función para validar contraseña
    function validatePassword(password) {
        // Validar longitud (7-20 caracteres)
        const isValidLength = password.length >= 7 && password.length <= 20;
        updateRequirement(reqLength, isValidLength);
        
        // Validar carácter especial
        const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        const hasSpecialChar = specialChars.test(password);
        updateRequirement(reqSpecial, hasSpecialChar);
        
        // Validar letra mayúscula
        const uppercaseRegex = /[A-Z]/;
        const hasUppercase = uppercaseRegex.test(password);
        updateRequirement(reqUppercase, hasUppercase);
    }
    
    // Función auxiliar para actualizar el estado de un requisito
    function updateRequirement(element, isValid) {
        if (!element) return;
        
        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
        }
    }
    
    // Función para validar coincidencia de contraseñas
    function validatePasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword === '') {
            hideMessage(passwordMatch);
            return;
        }
        
        if (password === confirmPassword) {
            showMessage(passwordMatch, '✓ Las contraseñas coinciden', 'success');
        } else {
            showMessage(passwordMatch, 'Las contraseñas no coinciden', 'error');
        }
    }
    
    // Validación del formulario antes del envío
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();  // Detener completamente la propagación del evento
        
        console.log("EVENT LISTENER EJECUTÁNDOSE - " + new Date().toISOString());
        
        // Prevenir envíos duplicados
        if (this.isSubmitting) {
            console.log("YA SE ESTÁ ENVIANDO, IGNORANDO");
            return;
        }
        this.isSubmitting = true;
        console.log("MARCANDO COMO ENVIANDO");
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validar username
        if (username.length < 3 || username.length > 8) {
            showUsernameError('El usuario debe tener entre 3 y 8 caracteres');
            this.isSubmitting = false;
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showUsernameError('El usuario solo puede contener letras, números y guiones bajos');
            this.isSubmitting = false;
            return;
        }
        
        // Verificar unicidad del username antes de enviar
        const usernameUniqueCheck = await checkUsernameUnique(username);
        if (!usernameUniqueCheck.success && usernameUniqueCheck.username_exists) {
            // Mostrar popup cuando el usuario ya existe al registrar
            showPopup('Usuario ya en uso', 'Este nombre de usuario no está disponible', 'error');
            this.isSubmitting = false;
            return;
        }
        
        // Validar contraseña
        const isValidPassword = validatePasswordRequirements(password);
        if (!isValidPassword) {
            showPopup('Error de Contraseña', 'La contraseña no cumple con todos los requisitos', 'error');
            this.isSubmitting = false;
            return;
        }
        
        // Validar coincidencia de contraseñas
        if (password !== confirmPassword) {
            showPopup('Error de Contraseña', 'Las contraseñas no coinciden', 'error');
            this.isSubmitting = false;
            return;
        }
        
        // Si todas las validaciones pasan, enviar el formulario
        try {
            // Deshabilitar el botón de envío para prevenir doble envío
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Registrando...';
            }
            
            const formData = new FormData(e.target);
            const data = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirm_password: formData.get('confirm_password')
            };
            
            console.log("ENVIANDO DATOS A REGISTER.PHP - " + new Date().toISOString());
            const response = await fetch('../../api/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showPopup('Exitoso', 'Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showPopup('Error de Registro', result.message, 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            showPopup('Error de Conexión', 'No se pudo conectar con el servidor', 'error');
        } finally {
            // Limpiar bandera de envío y restaurar botón
            this.isSubmitting = false;
            
            // Restaurar el botón de envío
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Registrar';
            }
        }
    });
    
    // Función para validar todos los requisitos de contraseña
    function validatePasswordRequirements(password) {
        const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        const uppercaseRegex = /[A-Z]/;
        
        return password.length >= 7 && 
               password.length <= 20 && 
               specialChars.test(password) && 
               uppercaseRegex.test(password);
    }
});
