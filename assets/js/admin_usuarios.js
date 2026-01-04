// Variables globales
let currentAdmin = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    checkAdminSession();
    loadUsers();
    setupForm();
});

// Verificar sesión de administrador
async function checkAdminSession() {
    try {
        const response = await fetch('../../api/check_admin_session.php');
        const data = await response.json();
        
        if (data.success) {
            currentAdmin = data.admin;
            document.getElementById('adminName').textContent = data.admin.username;
        } else {
            window.location.href = '/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error verificando sesión de administrador:', error);
        window.location.href = '/pages/auth/index.html';
    }
}

// Cerrar sesión
async function logout() {
    try {
        const response = await fetch('../../api/logout.php', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        window.location.href = '/pages/auth/index.html';
    }
}

// Configurar formulario
function setupForm() {
    const form = document.getElementById('createUserForm');
    form.addEventListener('submit', handleCreateUser);
}

// Manejar creación de usuario
async function handleCreateUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Validar contraseñas
    if (data.password !== data.confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    if (data.password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    try {
        const response = await fetch('../../api/create_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Usuario creado exitosamente');
            clearForm();
            loadUsers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error creando usuario:', error);
        alert('Error creando usuario');
    }
}

// Cargar usuarios
async function loadUsers() {
    try {
        const response = await fetch('../../api/get_users.php');
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.users);
        } else {
            console.error('Error cargando usuarios:', data.message);
            displayError('Error cargando usuarios');
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        displayError('Error de conexión');
    }
}

// Mostrar usuarios
function displayUsers(users) {
    const container = document.getElementById('usersTableContainer');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No hay usuarios registrados</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const statusClass = user.status === 'activo' ? 'paid' : 'unpaid';
        const statusText = user.status === 'activo' ? 'Activo' : 'Inactivo';
        const typeText = user.user_type === 'admin' ? 'Administrador' : 'Residente';
        
        html += `
            <tr>
                <td>${user.id}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td><span class="status ${statusClass}">${typeText}</span></td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="toggleUserStatus(${user.id}, '${user.status}')" class="btn-admin" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                        <i class="fas fa-${user.status === 'activo' ? 'pause' : 'play'}"></i>
                        ${user.status === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onclick="deleteUser(${user.id})" class="btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; margin-left: 0.5rem;">
                        <i class="fas fa-trash"></i>
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Mostrar error
function displayError(message) {
    const container = document.getElementById('usersTableContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #ef4444;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>${message}</p>
        </div>
    `;
}

// Cambiar estado de usuario
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    
    if (!confirm(`¿Estás seguro de ${newStatus === 'activo' ? 'activar' : 'desactivar'} este usuario?`)) {
        return;
    }
    
    try {
        const response = await fetch('../../api/toggle_user_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`);
            loadUsers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        alert('Error cambiando estado del usuario');
    }
}

// Eliminar usuario
async function deleteUser(userId) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch('../../api/delete_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Usuario eliminado exitosamente');
            loadUsers();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error eliminando usuario');
    }
}

// Limpiar formulario
function clearForm() {
    document.getElementById('createUserForm').reset();
}

// Volver al panel
function goBack() {
    window.location.href = '../admin/admin.html';
}
