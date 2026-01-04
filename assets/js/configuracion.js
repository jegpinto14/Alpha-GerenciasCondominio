// Funcionalidad para la página de configuración

// Variable para almacenar datos originales del usuario
let originalUserData = null;

// Función para verificar si el email ya existe
async function checkEmailUnique(email) {
    try {
        const response = await fetch('../../api/check_email_unique.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error verificando email único:', error);
        return { success: false, message: 'Error verificando email' };
    }
}

// Funciones de validación para información personal
function validatePersonalInfoField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) return false;
    
    let isValid = true;
    let errorMessage = '';
    
    switch(fieldId) {
        case 'editName':
        case 'editApellido':
            isValid = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]{2,50}$/.test(value);
            errorMessage = 'Solo letras y espacios, entre 2 y 50 caracteres';
            break;
            
        case 'editCedula':
            isValid = /^[0-9]{7,8}$/.test(value);
            errorMessage = 'Solo números, entre 7 y 8 dígitos';
            break;
            
        case 'editEmail':
            isValid = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(value);
            errorMessage = 'Debe ser una dirección de Gmail válida';
            break;
            
        case 'editTelefono':
            isValid = /^0[0-9]{9,10}$/.test(value);
            errorMessage = 'Número venezolano válido (ej: 04123456789)';
            break;
    }
    
    // Aplicar estilos visuales
    if (value.length > 0) {
        field.classList.remove('error');
        field.classList.add(isValid ? 'success' : 'error');
        
        // Mostrar mensaje de error si es inválido
        if (!isValid) {
            showFieldError(fieldId, errorMessage);
        } else {
            clearFieldError(fieldId);
        }
    } else {
        field.classList.remove('success', 'error');
        clearFieldError(fieldId);
    }
    
    return isValid;
}

// Función para validar longitud de contraseña actual en cambio de usuario
function validateCurrentPasswordLength(password) {
    const field = document.getElementById('usernamePassword');
    if (!field) return;
    
    // Aplicar estilos visuales basados en la longitud
    if (password.length > 0) {
        field.classList.remove('error');
        field.classList.add(password.length <= 20 ? 'success' : 'error');
        
        // Mostrar mensaje de error si excede el límite
        if (password.length > 20) {
            showFieldError('usernamePassword', 'La contraseña no puede tener más de 20 caracteres');
        } else {
            clearFieldError('usernamePassword');
        }
    } else {
        field.classList.remove('success', 'error');
        clearFieldError('usernamePassword');
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remover error anterior
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Crear nuevo mensaje de error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Las funciones de verificación de sesión ya no son necesarias
// porque ahora cargamos directamente los formularios con loadUserData()

// Cargar datos del usuario directamente
async function loadUserData() {
    try {
        console.log('📡 Cargando datos del usuario...');
        const response = await fetch('../../api/check_session.php', {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            console.error('❌ Error de conexión:', response.status);
            showAlert('Error de conexión al verificar sesión', 'error');
            return;
        }
        
        const data = await response.json();
        console.log('📡 Respuesta:', data);
        
        if (data.success && data.user) {
            console.log('✅ Datos cargados exitosamente:', data.user);
            console.log('👤 Username del usuario:', data.user.username);
            console.log('👤 ID del usuario:', data.user.id);
            
            originalUserData = data.user;
            
            // Mostrar el nombre del usuario en navbar INMEDIATAMENTE
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = data.user.username;
                console.log('🎯 Navbar actualizada inmediatamente con:', userNameElement.textContent);
                
                // Verificar que se aplicó correctamente
                setTimeout(() => {
                    const currentNavbarText = document.getElementById('userName').textContent;
                    console.log('🔍 Verificación navbar después de 1 segundo:', currentNavbarText);
                    if (currentNavbarText !== data.user.username) {
                        console.warn('⚠️ Navbar no se actualizó correctamente, reintentando...');
                        document.getElementById('userName').textContent = data.user.username;
                    }
                }, 1000);
            }
            
            // Cargar datos adicionales del usuario desde la base de datos
            await loadAdditionalUserData(data.user.id);
            
        } else {
            console.error('❌ Error al cargar datos del usuario:', data.message);
            showAlert('Error al cargar información del usuario: ' + (data.message || 'Error desconocido'), 'error');
            
            // Si hay error, mostrar mensaje genérico pero no "Ana"
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = 'Usuario';
            }
        }
        
    } catch (error) {
        console.error('❌ Error en loadUserData:', error);
        showAlert('Error de conexión al cargar datos del usuario', 'error');
        
        // Si hay error de conexión, mostrar mensaje genérico pero no "Ana"
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = 'Usuario';
        }
    }
}

// Cargar datos adicionales del usuario desde la base de datos
async function loadAdditionalUserData(userId) {
    try {
        console.log('📡 Cargando datos adicionales del usuario...');
        const response = await fetch('../../api/get_current_user.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
            console.log('✅ Datos adicionales cargados:', data.user);
            
            // Actualizar originalUserData con datos completos
            originalUserData = { ...originalUserData, ...data.user };
            
            // NO actualizar navbar aquí - mantener el username de la sesión
            // El navbar ya tiene el username correcto de check_session.php
            console.log('🎯 Navbar mantiene username de sesión:', document.getElementById('userName').textContent);
            
            populateUserForm(data.user);
            showAlert('Información cargada correctamente', 'success');
            
        } else {
            console.log('⚠️ No se encontraron datos adicionales del usuario');
            // Mostrar formularios vacíos pero sin error - el usuario puede editarlos igual
            showAlert('Puedes editar tus datos directamente en los formularios', 'info');
        }
        
    } catch (error) {
        console.error('❌ Error cargando datos adicionales:', error);
        // No mostrar error, simplemente dejar formularios vacíos
        showAlert('Los formularios están listos para editar', 'info');
    }
}

// Poblar formulario con campos por defecto cuando no hay datos
function populateUserForm(user) {
    document.getElementById('editName').value = user.nombre || '';
    document.getElementById('editApellido').value = user.apellido || '';
    document.getElementById('editCedula').value = user.cedula || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editTelefono').value = user.telefono || '';
    
    // Poblar campo de usuario en el tab de cambio de usuario
    const usernameField = document.getElementById('editUsername');
    if (usernameField) {
        // Usar el username real del usuario logueado, no un valor genérico
        const realUsername = user.username || user.user_id || 'Usuario actual';
        usernameField.value = realUsername;
        
        // Asegurar que el campo sea editable
        usernameField.removeAttribute('readonly');
        usernameField.removeAttribute('disabled');
        usernameField.setAttribute('autocomplete', 'username');
        
        console.log(`✅ Campo editUsername poblado con usuario real: '${realUsername}'`);
    }
}

// Función para mostrar información del usuario actual
function showCurrentUserInfo() {
    // Verificar que originalUserData existe y tiene username
    if (originalUserData && originalUserData.username) {
        console.log(`👤 Usuario actualmente logueado: '${originalUserData.username}'`);
        console.log(`👤 ID de usuario: ${originalUserData.id || 'No disponible'}`);
        
        // Mostrar información en el formulario
        const usernameField = document.getElementById('editUsername');
        if (usernameField) {
            usernameField.placeholder = `Usuario actual: ${originalUserData.username}`;
            usernameField.title = `Usuario actualmente logueado: ${originalUserData.username}`;
        }
        
        // Mostrar mensaje informativo
        showAlert(`Usuario actualmente logueado: ${originalUserData.username}`, 'info');
    } else {
        console.warn('⚠️ originalUserData no está disponible o no tiene username');
        console.log('🔍 originalUserData:', originalUserData);
        
        // Intentar cargar datos del usuario si no están disponibles
        if (!originalUserData) {
            console.log('🔄 Intentando cargar datos del usuario...');
            loadUserData();
        }
    }
}

// Función para asegurar que el campo de usuario actual sea editable
function ensureUsernameFieldEditable() {
    const usernameField = document.getElementById('editUsername');
    if (usernameField) {
        // Remover cualquier atributo que pueda bloquear la edición
        usernameField.removeAttribute('readonly');
        usernameField.removeAttribute('disabled');
        
        // Asegurar que el campo sea completamente editable
        usernameField.style.pointerEvents = 'auto';
        usernameField.style.cursor = 'text';
        usernameField.style.backgroundColor = '';
        
        // Agregar atributos para mejor experiencia
        usernameField.setAttribute('autocomplete', 'username');
        usernameField.setAttribute('maxlength', '50');
        
        console.log('✅ Campo editUsername forzado como editable');
        
        // Verificar que realmente es editable
        setTimeout(() => {
            if (usernameField.readOnly || usernameField.disabled) {
                console.warn('⚠️ Campo editUsername aún no es editable, intentando nuevamente...');
                usernameField.readOnly = false;
                usernameField.disabled = false;
            } else {
                console.log('✅ Campo editUsername confirmado como editable');
            }
        }, 100);
    }
}

// Función para validar nombres de usuario
function validateUsernames() {
    const newUsername = document.getElementById('newUsername').value;
    const confirmUsername = document.getElementById('confirmUsername').value;
    const currentUsername = document.getElementById('editUsername').value;
    
    // Validar longitud (mínimo 3, máximo 8)
    const isValidLength = newUsername.length >= 3 && newUsername.length <= 8;
    updateRequirement('req-user-length', isValidLength);
    
    // Validar coincidencia
    updateRequirement('req-user-match', newUsername === confirmUsername && newUsername.length > 0);
    
    // Validar que sea diferente al actual
    updateRequirement('req-user-different', newUsername !== currentUsername && newUsername.length > 0);
    
    // Si está vacío, resetear el de coincidencia
    if (newUsername === '') {
        updateRequirement('req-user-match', false);
        updateRequirement('req-user-different', false);
    }
}

// Usar el nombre real en navbar en lugar de "Usuario"
function updateUserNameInNavbar(user) {
    console.log('🔍 Intentando actualizar navbar con datos:', user);
    console.log('🔍 Verificando campos del usuario:');
    console.log('  - nombre:', user.nombre);
    console.log('  - username:', user.username);
    console.log('  - id:', user.id);
    
    const userNameSpan = document.getElementById('userName');
    
    if (!userNameSpan) {
        console.error('❌ Elemento userName no encontrado en el DOM');
        return;
    }
    
    console.log('📍 Elemento userName encontrado:', userNameSpan);
    console.log('📍 Contenido actual antes de cambiar:', userNameSpan.textContent);
    
    // Detectar qué nombre mostrar (preferir nombre real sobre username)
    let displayName = '';
    if (user.nombre && user.nombre.trim() !== '' && user.nombre !== null && user.nombre !== 'null') {
        displayName = user.nombre.trim();
        console.log('✅ Usando nombre real:', displayName);
    } else if (user.username && user.username.trim() !== '' && user.username !== null && user.username !== 'null') {
        displayName = user.username.trim();
        console.log('✅ Usando username como fallback:', displayName);
    } else {
        console.log('⚠️ No se encontraron datos válidos de nombre');
        console.log('⚠️ Tipos de datos:', typeof user.nombre, typeof user.username);
        displayName = 'Usuario Sin Nombre';
    }
    
    // Actualizar el texto
    userNameSpan.textContent = displayName;
    console.log('✅ Navbar actualizada. Ahora muestra:', userNameSpan.textContent);
    
    // Verificar si el cambio se aplicó correctamente
    setTimeout(() => {
        const currentText = document.getElementById('userName').textContent;
        console.log('🔍 Verificación después de 1 segundo:', currentText);
    }, 1000);
}

// Configurar eventos para la validación en tiempo real de nombres de usuario
document.getElementById('newUsername').addEventListener('input', function() {
    validateUsernames();
});

document.getElementById('confirmUsername').addEventListener('input', function() {
    validateUsernames();
});

// Configurar eventos para la validación de contraseñas
document.getElementById('confirmPassword').addEventListener('input', function() {
    validatePasswords();
});

document.getElementById('newPassword').addEventListener('input', function() {
    validatePasswords();
});

// Configurar eventos para validación en tiempo real de información personal
document.getElementById('editName').addEventListener('input', function() {
    validatePersonalInfoField('editName', this.value);
});

document.getElementById('editApellido').addEventListener('input', function() {
    validatePersonalInfoField('editApellido', this.value);
});

document.getElementById('editCedula').addEventListener('input', function() {
    validatePersonalInfoField('editCedula', this.value);
});

document.getElementById('editEmail').addEventListener('input', async function() {
    const email = this.value.trim();
    
    // Primero validar formato básico
    const basicValidation = validatePersonalInfoField('editEmail', email);
    
    // Si el formato es válido y no está vacío, verificar unicidad
    if (basicValidation && email.length > 0) {
        const uniqueCheck = await checkEmailUnique(email);
        
        if (!uniqueCheck.success && uniqueCheck.email_exists) {
            showFieldError('editEmail', 'Este correo ya está registrado por otro usuario');
            return;
        }
    }
    
    // Si llegamos aquí, el email es válido y único
    if (basicValidation) {
        clearFieldError('editEmail');
    }
});

document.getElementById('editTelefono').addEventListener('input', function() {
    validatePersonalInfoField('editTelefono', this.value);
});

// Configurar evento para validación de contraseña actual en cambio de usuario
document.getElementById('usernamePassword').addEventListener('input', function() {
    validateCurrentPasswordLength(this.value);
});

// Manejar envío del formulario de cambio de usuario
document.getElementById('usernameForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Deshabilitar botón y mostrar loading
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const formData = new FormData(e.target);
        const usernameData = {
            currentUsername: formData.get('currentUsername'),
            newUsername: formData.get('newUsername'),
            confirmUsername: formData.get('confirmUsername'),
            password: formData.get('password')
        };
        
        // Validaciones más estrictas
        if (!usernameData.currentUsername || usernameData.currentUsername.trim().length < 3) {
            throw new Error('Debes ingresar tu usuario actual');
        }
        
            if (!usernameData.newUsername || usernameData.newUsername.trim().length < 3) {
                throw new Error('El nuevo usuario debe tener al menos 3 caracteres');
            }
            
            if (usernameData.newUsername.trim().length > 8) {
                throw new Error('El nuevo usuario no puede tener más de 8 caracteres');
            }
        
        if (usernameData.newUsername !== usernameData.confirmUsername) {
            throw new Error('Los nuevos usuarios no coinciden');
        }
        
        if (usernameData.currentUsername === usernameData.newUsername) {
            throw new Error('El nuevo usuario debe ser diferente al actual');
        }
        
        if (!usernameData.password || usernameData.password.trim().length === 0) {
            throw new Error('Debes ingresar tu contraseña actual para confirmar el cambio');
        }
        
        if (usernameData.password.length > 20) {
            throw new Error('La contraseña actual no puede tener más de 20 caracteres');
        }
        
        // Enviar datos al servidor para cambio de usuario
        const response = await fetch('../../api/update_username.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usernameData)
        });
        
        console.log('🔧 Respuesta HTTP recibida:', response);
        console.log('🔧 Status de respuesta:', response.status);
        console.log('🔧 Headers de respuesta:', response.headers);
        
        const result = await response.json();
        console.log('🔧 Resultado parseado:', result);
        
        if (result.success) {
            // Crear mensaje de éxito
            let message = result.message || 'Usuario actualizado correctamente';
            if (result.newUsername) {
                message += ` (Nuevo usuario: ${result.newUsername})`;
            }
            
            showAlert(message, 'success');
            
            // Actualizar datos originales con el nuevo usuario
            if (result.newUsername) {
                // Asegurar que originalUserData existe antes de actualizarlo
                if (!originalUserData) {
                    originalUserData = {};
                }
                originalUserData.username = result.newUsername;
                console.log(`✅ originalUserData.username actualizado a: ${result.newUsername}`);
            }
            
            // Limpiar formulario después del éxito
            clearUserForm();
            
            console.log('🎯 Usuario actualizado exitosamente:', result);
        } else {
            console.log('❌ Respuesta indica error:', result);
            throw new Error(result.message || 'Error al cambiar el usuario');
        }
        
    } catch (error) {
        console.error('❌ Error cambiando usuario:', error);
        showAlert(error.message, 'error');
    } finally {
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
});

// Manejar envío del formulario de información personal
document.getElementById('userInfoForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Deshabilitar botón y mostrar loading
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const formData = new FormData(e.target);
        const userData = {
            email: formData.get('email'),
            name: formData.get('name'),
            apellido: formData.get('apellido'),
            cedula: formData.get('cedula'),
            telefono: formData.get('telefono')
        };
        
        // Validar todos los campos antes de enviar
        const validations = [
            { field: 'editName', value: userData.name, name: 'Nombre' },
            { field: 'editApellido', value: userData.apellido, name: 'Apellido' },
            { field: 'editCedula', value: userData.cedula, name: 'Cédula' },
            { field: 'editEmail', value: userData.email, name: 'Email' },
            { field: 'editTelefono', value: userData.telefono, name: 'Teléfono' }
        ];
        
        let hasErrors = false;
        validations.forEach(({ field, value, name }) => {
            if (value && value.trim() !== '') {
                if (!validatePersonalInfoField(field, value)) {
                    hasErrors = true;
                    showAlert(`El campo ${name} tiene un formato inválido`, 'error');
                }
            }
        });
        
        if (hasErrors) {
            throw new Error('Por favor corrige los errores en el formulario');
        }
        
        // Verificar unicidad del email antes de enviar
        if (userData.email && userData.email.trim().length > 0) {
            const emailUniqueCheck = await checkEmailUnique(userData.email.trim());
            if (!emailUniqueCheck.success && emailUniqueCheck.email_exists) {
                throw new Error('Este correo ya está registrado por otro usuario');
            }
        }
        
        if (!userData.name || userData.name.trim().length < 2) {
            throw new Error('El nombre debe tener al menos 2 caracteres');
        }
        
        if (!userData.apellido || userData.apellido.trim().length < 2) {
            throw new Error('El apellido debe tener al menos 2 caracteres');
        }
        
        if (!userData.cedula || !userData.cedula.match(/^[0-9]+$/)) {
            throw new Error('La cédula debe contener solo números');
        }
        
        if (userData.cedula.length < 6 || userData.cedula.length > 8) {
            throw new Error('La cédula debe tener entre 6 y 8 dígitos');
        }
        
        if (!userData.telefono || !userData.telefono.match(/^[0-9]{10,11}$/)) {
            throw new Error('El teléfono debe tener entre 10 y 11 dígitos');
        }
        
        if (userData.email && !userData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            throw new Error('Por favor ingresa un correo electrónico válido');
        }
        
        // Enviar datos al servidor (actualizará usuario Y propietario vinculado)
        const response = await fetch('../../api/update_propietario_info.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mensaje enfocado SOLO en propietarios
            let message = result.message || 'Información personal actualizada correctamente';
            
            if (result.propietario && result.propietario.id) {
                message += ` (Propietario ID: ${result.propietario.id})`;
            }
            
            showAlert(message, 'success');
            
            console.log('🎯 Información actualizada en tabla propietarios:', result.propietario);
            
            // Actualizar datos originales
            originalUserData = { ...originalUserData, ...userData };
            
            // Actualizar navbar si cambió el nombre
            if (userData.name) {
                updateUserNameInNavbar(originalUserData);
            }
            
            // 🧹 Limpiar formulario después de guardar exitosamente
            clearPersonalInfoForm();
            
            console.log('🎯 Actualización completada y formulario guardado:', result);
        } else {
            throw new Error(result.message || 'Error al actualizar la información');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando información:', error);
        showAlert(error.message, 'error');
    } finally {
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
});

// Manejar envío del formulario de contraseña
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Solo prevenir la ventana del navegador, pero mantener funcionalidad
    const passwordInputs = e.target.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');
    });
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Deshabilitar botón y mostrar loading
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
    
    try {
        const formData = new FormData(e.target);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
            confirmPassword: formData.get('confirmPassword')
        };
        
        // Validaciones
        if (!passwordData.currentPassword) {
            throw new Error('Debes ingresar tu contraseña actual');
        }
        
        if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
            throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
        }
        
        if (passwordData.newPassword.length > 20) {
            throw new Error('La nueva contraseña no puede tener más de 20 caracteres');
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            throw new Error('Las contraseñas nuevas no coinciden');
        }
        
        if (passwordData.currentPassword === passwordData.newPassword) {
            throw new Error('La nueva contraseña debe ser diferente a la actual');
        }
        
        // Enviar datos al servidor
        const response = await fetch('../../api/update_password.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(passwordData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            makeAllRequirementsValid();
            showAlert('Contraseña actualizada correctamente', 'success');
            clearPasswordForm();
        } else {
            throw new Error(result.message || 'Error al cambiar la contraseña');
        }
        
    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        showAlert(error.message, 'error');
    } finally {
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
});

// Validación en tiempo real de contraseñas
document.getElementById('confirmPassword').addEventListener('input', function() {
    validatePasswords();
});

document.getElementById('newPassword').addEventListener('input', function() {
    validatePasswords();
});

// Función para validar contraseñas
function validatePasswords() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validar longitud (mínimo 6, máximo 20)
    const isValidLength = newPassword.length >= 6 && newPassword.length <= 20;
    updateRequirement('req-length', isValidLength);
    
    // Validar coincidencia
    updateRequirement('req-match', newPassword === confirmPassword && newPassword.length > 0);
    
    // Validar que no sea vacía
    if (newPassword === '') {
        updateRequirement('req-match', false);
    }
}

// Función para actualizar visualización de requerimientos
function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    const icon = element.querySelector('i');
    
    if (isValid) {
        element.classList.remove('invalid', 'text-muted');
        element.classList.add('valid');
        icon.className = 'fas fa-check-circle';
    } else {
        element.classList.remove('valid', 'text-muted');
        element.classList.add('invalid');
        icon.className = 'fas fa-times-circle';
    }
}

// Función para hacer todos los requerimientos válidos
function makeAllRequirementsValid() {
    updateRequirement('req-length', true);
    updateRequirement('req-match', true);
    updateRequirement('req-current', true);
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

// Función para limpiar formulario de contraseña
function clearPasswordForm() {
    document.getElementById('passwordForm').reset();
    
    // Resetear requerimientos a estado neutro
    document.querySelectorAll('.requirement-item').forEach(item => {
        item.classList.remove('valid', 'invalid');
        item.classList.add('text-muted');
        const icon = item.querySelector('i');
        icon.className = 'fas fa-check-circle';
    });
    
    console.log('🧹 Formulario de contraseña limpiado');
}

// Función para cerrar sesión
async function logout() {
    try {
        const response = await fetch('../../api/logout.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Independientemente del resultado del servidor, limpiar la sesión local
        window.location.href = '../auth/index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '../auth/index.html';
    }
}

// Función para volver al dashboard
function goBack() {
    window.location.href = '../dashboard/dashboard.html';
}

// Función para actualizar datos (recargar página)
function refreshData() {
    showAlert('Recargando datos del usuario...', 'info');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Configuración de navegación de tabs
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase active al botón clickeado y su contenido correspondiente
            this.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
                console.log(`📄 Cambiado a tab: ${targetTab}`);
                
                // Si es el tab de cambio de usuario, asegurar que el campo sea editable
                if (targetTab === 'username') {
                    setTimeout(() => {
                        ensureUsernameFieldEditable();
                    }, 100);
                }
            }
        });
    });
}

// Funciones específicas para configuración de cuenta
function refreshAccountData() {
    showAlert('Actualizando información de la cuenta...', 'info');
    setTimeout(() => {
        loadAccountData();
    }, 1000);
}

function exportData() {
    showAlert('Función de exportación pronto disponible', 'info');
}


// Función para mostrar alertas mejoradas
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
    const closeButton = document.createElement('button');
    closeButton.className = 'alert-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => removeAlert(alertContainer);
    
    // Ensamblar el alert
    alertContent.appendChild(icon);
    alertContent.appendChild(messageDiv);
    alertDiv.appendChild(alertContent);
    alertDiv.appendChild(closeButton);
    alertContainer.appendChild(alertDiv);
    
    // Agregar al DOM
    document.body.appendChild(alertContainer);
    
    // Animación de entrada
    setTimeout(() => {
        alertContainer.classList.add('show');
    }, 100);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        removeAlert(alertContainer);
    }, 5000);
}

// Función para remover alertas
function removeAlert(container) {
    if (container && container.parentNode) {
        container.classList.add('hide');
        setTimeout(() => {
            container.parentNode.removeChild(container);
        }, 300);
    }
}

// 🧹 Función para limpiar formulario de información personal
function clearPersonalInfoForm() {
    console.log('🧹 Limpiando formulario de información personal...');
    
    // Lista de campos a limpiar
    const fieldsToClear = [
        'editName',
        'editApellido', 
        'editCedula',
        'editEmail',
        'editTelefono'
    ];
    
    // Limpiar cada campo
    fieldsToClear.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = ''; // Limpiar el valor
            field.classList.remove('success', 'error'); // Remover clases de validación
            
            console.log(`✅ Campo ${fieldId} limpiado`);
        } else {
            console.warn(`⚠️ Campo ${fieldId} no encontrado`);
        }
    });
    
    // Limpiar también los datos originales actualizados
    originalUserData = {};
    
    // Mostrar mensaje de confirmación
    setTimeout(() => {
        showAlert('Formulario limpiado. Puedes ingresar nuevos datos.', 'info');
    }, 1000);
    
    console.log('🧴 Formulario de información personal limpiado exitosamente');
}

// 🧹 Función para limpiar formulario de cambio de usuario
function clearUserForm() {
    console.log('🧹 Limpiando formulario de cambio de usuario...');
    
    // Limpiar solo campos de nuevos datos
    const fieldsToClear = [
        'newUsername',
        'confirmUsername',
        'usernamePassword'
    ];
    
    // Mantener el username actual como referencia
    fieldsToClear.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            field.classList.remove('success', 'error');
            console.log(`✅ Campo ${fieldId} limpiado`);
        }
    });
    
    // Actualizar el campo de usuario actual con el nuevo valor si está disponible
    const currentUsernameField = document.getElementById('editUsername');
    if (currentUsernameField) {
        if (originalUserData && originalUserData.username) {
            currentUsernameField.value = originalUserData.username;
            console.log(`✅ Campo editUsername actualizado con: ${originalUserData.username}`);
        } else {
            console.warn('⚠️ originalUserData no disponible para actualizar campo editUsername');
            // Mantener el valor actual del campo
            console.log(`🔍 Valor actual del campo: '${currentUsernameField.value}'`);
        }
    }
    
    console.log('🧹 Formulario de cambio de usuario limpiado');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de configuración...');
    
    // Cargar datos del usuario
    loadUserData();
    
    // Configurar navegación de pestañas
    setupTabNavigation();
    
    console.log('✅ Página de configuración inicializada');
});