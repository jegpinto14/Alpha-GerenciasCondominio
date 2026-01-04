// Gestión de Usuarios - JavaScript

let allUsers = [];
let allHouses = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    loadUsers();
    loadHouses();
    setupFormValidations();
});

// Verificar sesión - SOLO SUPER ADMIN
async function checkSession() {
    try {
        // Solo verificar como super admin - acceso restringido
        const superAdminResponse = await fetch('../../superadmin/api/check_super_admin.php');
        const superAdminData = await superAdminResponse.json();
        
        if (superAdminData.success) {
            document.getElementById('userName').textContent = superAdminData.user.username;
            return;
        }
        
        // Si no es super admin, denegar acceso y redirigir
        console.log('Acceso denegado: Solo super administradores pueden acceder a esta página');
        alert('Acceso denegado. Solo super administradores pueden acceder a esta página.');
        window.location.href = '/pages/auth/index.html';
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        alert('Error verificando acceso. Redirigiendo al login.');
        window.location.href = '/pages/auth/index.html';
    }
}

// Cargar usuarios (solo Super Admin y Administradores)
async function loadUsers() {
    try {
        const response = await fetch('../../api/get_all_users.php');
        const data = await response.json();
        
        if (data.success) {
            // Filtrar solo usuarios con acceso administrativo
            const adminUsers = data.users.filter(user => 
                user.tipo === 'super_admin' || user.tipo === 'admin'
            );
            
            console.log(`🔍 Total usuarios: ${data.users.length}`);
            console.log(`🔍 Usuarios administrativos: ${adminUsers.length}`);
            console.log('🔍 Tipos de usuario encontrados:', [...new Set(data.users.map(u => u.tipo))]);
            
            allUsers = adminUsers;
            displayUsers(adminUsers);
        } else {
            console.error('Error cargando usuarios:', data.message);
            showError('Error cargando usuarios: ' + data.message);
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showError('Error cargando usuarios');
    }
}

// Cargar viviendas
async function loadHouses() {
    try {
        const response = await fetch('../../api/get_all_houses.php');
        const data = await response.json();
        
        if (data.success) {
            allHouses = data.houses;
            populateHouseSelects();
        } else {
            console.error('Error cargando viviendas:', data.message);
        }
    } catch (error) {
        console.error('Error cargando viviendas:', error);
    }
}

// Poblar selects de viviendas
function populateHouseSelects() {
    const selects = ['newViviendaId', 'editViviendaId'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Limpiar opciones existentes excepto la primera
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Agregar opciones de viviendas
            allHouses.forEach(house => {
                const option = document.createElement('option');
                option.value = house.id;
                option.textContent = `${house.tipo} #${house.numero}`;
                select.appendChild(option);
            });
        }
    });
}

// Mostrar usuarios en la tabla
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 3rem; color: #666;">
                    <i class="fas fa-user-shield" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    No hay usuarios administrativos registrados
                    <br><small style="color: #999; margin-top: 0.5rem; display: block;">
                        Solo se muestran usuarios con acceso a Super Admin y Administración de Pagos
                    </small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.nombre_completo || user.username}</td>
            <td>${user.email}</td>
            <td><span class="user-type ${user.tipo}">${user.tipo}</span></td>
            <td>${user.vivienda_tipo ? `${user.vivienda_tipo} ${user.numero_apartamento || user.nombre_casa || ''}` : 'Sin asignar'}</td>
            <td>
                <span class="status-badge ${user.status || 'activo'}">
                    ${user.status || 'Activo'}
                </span>
            </td>
            <td>
                <div class="user-actions">
                    <button class="action-icon edit-btn" onclick="editUser(${user.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon delete-btn" onclick="deleteUser(${user.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Mostrar modal de crear usuario
function showCreateUserModal() {
    document.getElementById('createUserForm').reset();
    document.getElementById('createUserModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Cerrar modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Crear usuario
async function createUser() {
    const form = document.getElementById('createUserForm');
    const formData = new FormData(form);
    
    // Obtener todos los valores del formulario
    const username = formData.get('username')?.trim();
    const email = formData.get('email')?.trim();
    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');
    const nombre = formData.get('nombre')?.trim();
    const apellido = formData.get('apellido')?.trim();
    const cedula = formData.get('cedula')?.trim();
    const telefono = formData.get('telefono')?.trim();
    const tipo = formData.get('tipo');
    
    // Validaciones completas
    const validationErrors = [];
    
    // Validar Usuario
    if (!username) {
        validationErrors.push('El campo Usuario es requerido');
    } else if (username.length < 3) {
        validationErrors.push('El Usuario debe tener al menos 3 caracteres');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        validationErrors.push('El Usuario solo puede contener letras, números y guiones bajos');
    }
    
    // Validar Email
    if (!email) {
        validationErrors.push('El campo Email es requerido');
    } else if (!isValidEmail(email)) {
        validationErrors.push('El Email debe tener un formato válido (ejemplo@dominio.com)');
    }
    
    // Validar Contraseña
    if (!password) {
        validationErrors.push('El campo Contraseña es requerido');
    } else if (password.length < 6) {
        validationErrors.push('La Contraseña debe tener al menos 6 caracteres');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        validationErrors.push('La Contraseña debe contener al menos una mayúscula, una minúscula y un número');
    }
    
    // Validar Confirmación de Contraseña
    if (!passwordConfirm) {
        validationErrors.push('El campo Confirmar Contraseña es requerido');
    } else if (password !== passwordConfirm) {
        validationErrors.push('Las contraseñas no coinciden');
    }
    
    // Validar Nombre
    if (!nombre) {
        validationErrors.push('El campo Nombre es requerido');
    } else if (nombre.length < 2) {
        validationErrors.push('El Nombre debe tener al menos 2 caracteres');
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
        validationErrors.push('El Nombre solo puede contener letras y espacios');
    }
    
    // Validar Apellido
    if (!apellido) {
        validationErrors.push('El campo Apellido es requerido');
    } else if (apellido.length < 2) {
        validationErrors.push('El Apellido debe tener al menos 2 caracteres');
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
        validationErrors.push('El Apellido solo puede contener letras y espacios');
    }
    
    // Validar Cédula
    if (!cedula) {
        validationErrors.push('El campo Cédula es requerido');
    } else if (!/^\d{7,8}$/.test(cedula)) {
        validationErrors.push('La Cédula debe tener entre 7 y 8 dígitos numéricos');
    }
    
    // Validar Teléfono
    if (!telefono) {
        validationErrors.push('El campo Teléfono es requerido');
    } else if (!/^0\d{10}$/.test(telefono)) {
        validationErrors.push('El Teléfono debe comenzar con 0 y tener 11 dígitos (ej: 04121234567)');
    }
    
    // Validar Tipo de Usuario
    if (!tipo) {
        validationErrors.push('El campo Tipo de Usuario es requerido');
    } else if (!['user', 'admin', 'super_admin'].includes(tipo)) {
        validationErrors.push('El Tipo de Usuario seleccionado no es válido');
    }
    
    // Si hay errores de validación, mostrarlos
    if (validationErrors.length > 0) {
        showError('Errores de validación:<br>• ' + validationErrors.join('<br>• '));
        return;
    }
    
    // Convertir FormData a objeto
    const userData = {
        username,
        email,
        password,
        nombre,
        apellido,
        cedula,
        telefono,
        tipo
    };
    
    showLoading();
    
    try {
        const response = await fetch('../../superadmin/api/create_user_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showSuccess('Usuario creado exitosamente');
            closeModal('createUserModal');
            form.reset(); // Limpiar formulario
            loadUsers(); // Recargar lista
        } else {
            showError('Error creando usuario: ' + data.message);
        }
    } catch (error) {
        hideLoading();
        console.error('Error creando usuario:', error);
        showError('Error creando usuario');
    }
}

// Función auxiliar para validar email
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Editar usuario
function editUser(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (!user) return;
    
    // Llenar formulario de edición
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editNombre').value = user.nombre;
    document.getElementById('editApellido').value = user.apellido;
    document.getElementById('editCedula').value = user.cedula;
    document.getElementById('editTelefono').value = user.telefono;
    document.getElementById('editTipo').value = user.tipo;
    document.getElementById('editViviendaId').value = user.vivienda_id || '';
    
    // Mostrar modal
    document.getElementById('editUserModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Actualizar usuario
async function updateUser() {
    const form = document.getElementById('editUserForm');
    const formData = new FormData(form);
    
    // Convertir FormData a objeto
    const userData = {};
    for (let [key, value] of formData.entries()) {
        userData[key] = value;
    }
    
    showLoading();
    
    try {
        const response = await fetch('../../superadmin/api/update_user_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showSuccess('Usuario actualizado exitosamente');
            closeModal('editUserModal');
            loadUsers(); // Recargar lista
        } else {
            showError('Error actualizando usuario: ' + data.message);
        }
    } catch (error) {
        hideLoading();
        console.error('Error actualizando usuario:', error);
        showError('Error actualizando usuario');
    }
}

// Eliminar usuario
async function deleteUser(userId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('../../superadmin/api/delete_user_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showSuccess('Usuario eliminado exitosamente');
            loadUsers(); // Recargar lista
        } else {
            showError('Error eliminando usuario: ' + data.message);
        }
    } catch (error) {
        hideLoading();
        console.error('Error eliminando usuario:', error);
        showError('Error eliminando usuario');
    }
}

// Refrescar usuarios
function refreshUsers() {
    loadUsers();
    showSuccess('Lista de usuarios actualizada');
}

// Mostrar loading
function showLoading() {
    document.getElementById('loadingModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Ocultar loading
function hideLoading() {
    document.getElementById('loadingModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Mostrar mensaje de error
function showError(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}


// Volver a la página anterior (Super Admin)
function goBack() {
    // Redirigir específicamente a la página de Super Admin
    window.location.href = '../superadmin/html/super_admin.html';
}

// Logout (mantenido por si se necesita en el futuro)
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        fetch('../../api/logout.php', {
            method: 'POST'
        }).then(() => {
            window.location.href = '/pages/auth/index.html';
        });
    }
}

// Configurar validaciones en tiempo real para el formulario
function setupFormValidations() {
    // Validación en tiempo real para email
    const emailInput = document.getElementById('newEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmailField(this);
        });
        
        emailInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para contraseña
    const passwordInput = document.getElementById('newPassword');
    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            validatePasswordField(this);
        });
        
        passwordInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para confirmar contraseña
    const passwordConfirmInput = document.getElementById('newPasswordConfirm');
    if (passwordConfirmInput) {
        passwordConfirmInput.addEventListener('blur', function() {
            validatePasswordConfirmField(this);
        });
        
        passwordConfirmInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para cédula
    const cedulaInput = document.getElementById('newCedula');
    if (cedulaInput) {
        cedulaInput.addEventListener('blur', function() {
            validateCedulaField(this);
        });
        
        cedulaInput.addEventListener('input', function() {
            // Solo permitir números
            this.value = this.value.replace(/\D/g, '');
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para teléfono
    const telefonoInput = document.getElementById('newTelefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('blur', function() {
            validateTelefonoField(this);
        });
        
        telefonoInput.addEventListener('input', function() {
            // Solo permitir números
            this.value = this.value.replace(/\D/g, '');
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para nombre
    const nombreInput = document.getElementById('newNombre');
    if (nombreInput) {
        nombreInput.addEventListener('blur', function() {
            validateNombreField(this);
        });
        
        nombreInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para apellido
    const apellidoInput = document.getElementById('newApellido');
    if (apellidoInput) {
        apellidoInput.addEventListener('blur', function() {
            validateApellidoField(this);
        });
        
        apellidoInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
    
    // Validación en tiempo real para username
    const usernameInput = document.getElementById('newUsername');
    if (usernameInput) {
        usernameInput.addEventListener('blur', function() {
            validateUsernameField(this);
        });
        
        usernameInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
}

// Funciones de validación individual para cada campo
function validateEmailField(field) {
    const email = field.value.trim();
    if (email && !isValidEmail(email)) {
        showFieldError(field, 'El Email debe tener un formato válido (ejemplo@dominio.com)');
        return false;
    }
    return true;
}

function validatePasswordField(field) {
    const password = field.value;
    if (password && password.length < 6) {
        showFieldError(field, 'La Contraseña debe tener al menos 6 caracteres');
        return false;
    }
    if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        showFieldError(field, 'La Contraseña debe contener al menos una mayúscula, una minúscula y un número');
        return false;
    }
    return true;
}

function validatePasswordConfirmField(field) {
    const password = document.getElementById('newPassword').value;
    const passwordConfirm = field.value;
    if (passwordConfirm && password !== passwordConfirm) {
        showFieldError(field, 'Las contraseñas no coinciden');
        return false;
    }
    return true;
}

function validateCedulaField(field) {
    const cedula = field.value.trim();
    if (cedula && !/^\d{7,8}$/.test(cedula)) {
        showFieldError(field, 'La Cédula debe tener entre 7 y 8 dígitos numéricos');
        return false;
    }
    return true;
}

function validateTelefonoField(field) {
    const telefono = field.value.trim();
    if (telefono && !/^0\d{10}$/.test(telefono)) {
        showFieldError(field, 'El Teléfono debe comenzar con 0 y tener 11 dígitos (ej: 04121234567)');
        return false;
    }
    return true;
}

function validateNombreField(field) {
    const nombre = field.value.trim();
    if (nombre && nombre.length < 2) {
        showFieldError(field, 'El Nombre debe tener al menos 2 caracteres');
        return false;
    }
    if (nombre && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
        showFieldError(field, 'El Nombre solo puede contener letras y espacios');
        return false;
    }
    return true;
}

function validateApellidoField(field) {
    const apellido = field.value.trim();
    if (apellido && apellido.length < 2) {
        showFieldError(field, 'El Apellido debe tener al menos 2 caracteres');
        return false;
    }
    if (apellido && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
        showFieldError(field, 'El Apellido solo puede contener letras y espacios');
        return false;
    }
    return true;
}

function validateUsernameField(field) {
    const username = field.value.trim();
    if (username && username.length < 3) {
        showFieldError(field, 'El Usuario debe tener al menos 3 caracteres');
        return false;
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        showFieldError(field, 'El Usuario solo puede contener letras, números y guiones bajos');
        return false;
    }
    return true;
}

// Mostrar error en un campo específico
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.style.borderColor = '#dc3545';
    field.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
    `;
    
    field.parentNode.appendChild(errorDiv);
}

// Limpiar error de un campo
function clearFieldError(field) {
    field.style.borderColor = '';
    field.style.boxShadow = '';
    
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .status-badge.active {
        background: #e8f5e8;
        color: #28a745;
    }
    
    .status-badge.inactive {
        background: #ffebee;
        color: #dc3545;
    }
`;
document.head.appendChild(style);
