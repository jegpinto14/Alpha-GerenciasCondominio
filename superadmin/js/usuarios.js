// Funcionalidad específica para la gestión de usuarios

// Configuración de la API
const API_BASE_URL = '../api';

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Gestión de Usuarios iniciado');
    
    // Configurar el formulario de creación
    const form = document.getElementById('userForm');
    if (form) {
        form.addEventListener('submit', crearUsuario);
    }
    
    // Configurar el formulario de edición
    const editForm = document.getElementById('editUserForm');
    if (editForm) {
        editForm.addEventListener('submit', actualizarUsuario);
    }
    
    // Cargar usuarios al inicio
    cargarUsuarios();
    
    // Configurar validación de contraseñas
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (password && confirmPassword) {
        confirmPassword.addEventListener('input', validarContraseñas);
    }
});

// Función para validar que las contraseñas coincidan
function validarContraseñas() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmField = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmField.setCustomValidity('Las contraseñas no coinciden');
        confirmField.style.borderColor = '#ef4444';
    } else {
        confirmField.setCustomValidity('');
        confirmField.style.borderColor = '#10b981';
    }
}

// Función para crear un nuevo usuario
async function crearUsuario(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const rol = formData.get('rol');
    
    // Validaciones
    if (!username || !password || !confirmPassword || !rol) {
        mostrarNotificacion('Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        mostrarNotificacion('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 7 || password.length > 12) {
        mostrarNotificacion('La contraseña debe tener entre 7 y 12 caracteres', 'error');
        return;
    }
    
    // Mostrar spinner
    mostrarLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/crear-usuario.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                rol_id: parseInt(rol)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Usuario creado exitosamente', 'success');
            limpiarFormulario();
            cargarUsuarios(); // Recargar la lista
        } else {
            mostrarNotificacion(data.message || 'Error al crear el usuario', 'error');
        }
        
    } catch (error) {
        console.error('Error al crear usuario:', error);
        mostrarNotificacion('Error al conectar con el servidor', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Función para cargar la lista de usuarios
async function cargarUsuarios() {
    mostrarLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/listar-usuarios.php`);
        const data = await response.json();
        
        if (data.success) {
            mostrarUsuarios(data.data);
        } else {
            mostrarNotificacion(data.message || 'Error al cargar usuarios', 'error');
        }
        
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        mostrarNotificacion('Error al conectar con el servidor', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Función para mostrar usuarios en la tabla
function mostrarUsuarios(usuarios) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No hay usuarios registrados</h3>
                    <p>Crea tu primer usuario usando el formulario superior</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = usuarios.map(usuario => `
        <tr>
            <td>${usuario.user_id}</td>
            <td>${usuario.username}</td>
            <td>
                <span class="role-badge role-${usuario.rol_nombre.toLowerCase()}">
                    ${usuario.rol_nombre}
                </span>
            </td>
            <td>
                <span class="status-badge status-${usuario.status}">
                    ${usuario.status === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${formatearFecha(usuario.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editarUsuario(${usuario.user_id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="eliminarUsuario(${usuario.user_id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Función para limpiar el formulario
function limpiarFormulario() {
    document.getElementById('userForm').reset();
    const confirmField = document.getElementById('confirmPassword');
    if (confirmField) {
        confirmField.style.borderColor = '#d1d5db';
    }
}

// Función para editar usuario
async function editarUsuario(userId) {
    try {
        // Obtener información del usuario
        const response = await fetch(`${API_BASE_URL}/obtener-usuario.php?id=${userId}`);
        const data = await response.json();
        
        if (data.success) {
            const usuario = data.data;
            
            // Llenar el formulario del modal
            document.getElementById('editUserId').value = usuario.user_id;
            document.getElementById('editUsername').value = usuario.username;
            document.getElementById('editRol').value = usuario.rol_id;
            
            // Mostrar el modal
            document.getElementById('editUserModal').style.display = 'flex';
            
        } else {
            mostrarNotificacion('Error al obtener información del usuario', 'error');
        }
        
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        mostrarNotificacion('Error al conectar con el servidor', 'error');
    }
}

// Función para eliminar usuario (futura funcionalidad)
function eliminarUsuario(userId) {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        mostrarNotificacion('Funcionalidad de eliminación en desarrollo', 'info');
        // Aquí se implementaría la eliminación de usuarios
    }
}

// Función para navegar desde el dashboard
function abrirGestionUsuarios() {
    window.location.href = 'gestion-usuarios.html';
}

// Función para volver al dashboard
function volverDashboard() {
    window.location.href = 'index.html';
}

// Función para mostrar/ocultar el spinner de carga
function mostrarLoading(mostrar) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = mostrar ? 'flex' : 'none';
}

// Función para formatear fechas
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(fecha));
}

// Función para validar nombre de usuario
function validarUsername(username) {
    // Solo permitir letras, números y guiones bajos
    const regex = /^[a-zA-Z0-9_]+$/;
    return regex.test(username) && username.length >= 3;
}

// Función para validar contraseña
function validarPassword(password) {
    // Entre 7 y 12 caracteres
    return password.length >= 7 && password.length <= 12;
}

// Función para cerrar el modal
function cerrarModal() {
    document.getElementById('editUserModal').style.display = 'none';
    document.getElementById('editUserForm').reset();
}

// Función para actualizar usuario
async function actualizarUsuario(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userId = formData.get('userId');
    const username = formData.get('username');
    const rol = formData.get('rol');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validaciones
    if (!username || !rol) {
        mostrarNotificacion('Nombre de usuario y rol son obligatorios', 'error');
        return;
    }
    
    if (username.length > 10) {
        mostrarNotificacion('El nombre de usuario no puede tener más de 10 caracteres', 'error');
        return;
    }
    
    // Si se proporciona una nueva contraseña, validarla
    if (password) {
        if (password.length < 7 || password.length > 12) {
            mostrarNotificacion('La contraseña debe tener entre 7 y 12 caracteres', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            mostrarNotificacion('Las contraseñas no coinciden', 'error');
            return;
        }
    }
    
    // Mostrar spinner
    mostrarLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/actualizar-usuario.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                username: username,
                rol_id: parseInt(rol),
                password: password || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacion('Usuario actualizado exitosamente', 'success');
            cerrarModal();
            cargarUsuarios(); // Recargar la lista
        } else {
            mostrarNotificacion(data.message || 'Error al actualizar el usuario', 'error');
        }
        
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        mostrarNotificacion('Error al conectar con el servidor', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    // Agregar estilos si no existen
    if (!document.querySelector('#notificacion-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notificacion-styles';
        styles.textContent = `
            .notificacion {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                color: white;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                z-index: 1001;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            .notificacion-success { background-color: #10b981; }
            .notificacion-error { background-color: #ef4444; }
            .notificacion-info { background-color: #3b82f6; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Agregar al DOM
    document.body.appendChild(notificacion);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 5000);
}

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        abrirGestionUsuarios,
        volverDashboard,
        crearUsuario,
        cargarUsuarios,
        validarUsername,
        validarPassword
    };
}
