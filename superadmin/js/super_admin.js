// Super Admin JavaScript
let currentUser = null;
let users = [];
let houses = [];
let reports = [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboardData();
    loadUsers();
    loadHouses();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('../api/check_super_admin.php');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('currentUser').textContent = currentUser.username;
        } else {
            window.location.href = '/Arcorui/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        window.location.href = '/Arcorui/pages/auth/index.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
        
        // Cerrar modal de confirmación de logout al hacer clic fuera
        if (event.target.classList.contains('logout-confirmation-modal')) {
            closeLogoutConfirmation();
        }
    });
}

// Modal management
function showTab(tabName) {
    // Load tab-specific data and show modal
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            showModal('usersModal');
            break;
        case 'reports':
            loadReportHouses();
            showModal('reportsModal');
            break;
        case 'morosity':
            loadMorosityData();
            showModal('morosityModal');
            break;
        case 'houses':
            loadHouses();
            showModal('housesModal');
            break;
    }
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Navigation functions
function goToReportsPage() {
    window.location.href = '../reports/reportes_casa.html';
}

// Dashboard functions
async function loadDashboardData() {
    try {
        const response = await fetch('../api/super_admin_dashboard.php');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalUsers').textContent = data.stats.totalUsers;
            document.getElementById('totalHouses').textContent = data.stats.totalHouses;
            document.getElementById('totalRevenue').textContent = `Bs ${data.stats.totalRevenue.toLocaleString()}`;
            document.getElementById('pendingPayments').textContent = data.stats.pendingPayments;
            
            // Load recent activity
            loadRecentActivity(data.recentActivity);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function loadRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    container.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <span class="activity-text">${activity.text}</span>
            <span class="activity-time">${activity.time}</span>
        `;
        container.appendChild(item);
    });
}

// User management functions
async function loadUsers() {
    try {
        const response = await fetch('../../api/get_all_users.php');
        const data = await response.json();
        
        if (data.success) {
            users = data.users;
            displayUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(userList) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    userList.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="status-badge ${user.tipo === 'admin' ? 'status-active' : 'status-inactive'}">${user.tipo}</span></td>
            <td>${new Date(user.fecha_registro).toLocaleDateString()}</td>
            <td><span class="status-badge status-active">Activo</span></td>
            <td>
                <button onclick="editUser(${user.id})" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteUser(${user.id})" class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterUsers() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const filter = document.getElementById('userFilter').value;
    
    let filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(search) || 
                            user.email.toLowerCase().includes(search);
        const matchesFilter = !filter || user.tipo === filter;
        
        return matchesSearch && matchesFilter;
    });
    
    displayUsers(filteredUsers);
}

// Modal functions
function showCreateUserModal() {
    document.getElementById('createUserModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function createUser() {
    const formData = {
        username: document.getElementById('newUsername').value,
        email: document.getElementById('newEmail').value,
        password: document.getElementById('newPassword').value,
        tipo: document.getElementById('newUserType').value,
        house_number: document.getElementById('newHouseNumber').value,
        house_type: document.getElementById('newHouseType').value,
        owner_name: document.getElementById('newOwnerName').value,
        owner_lastname: document.getElementById('newOwnerLastname').value
    };
    
    try {
        const response = await fetch('../api/create_user_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Usuario creado exitosamente');
            closeModal('createUserModal');
            loadUsers();
            document.getElementById('createUserForm').reset();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Error creando usuario');
    }
}

async function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Fill form with user data
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editUserType').value = user.tipo;
    
    // Get house info
    try {
        const response = await fetch(`api/get_user_house.php?user_id=${userId}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('editHouseNumber').value = data.house.numero || '';
            document.getElementById('editHouseType').value = data.house.tipo || '';
            document.getElementById('editOwnerName').value = data.house.nombre_propietario || '';
            document.getElementById('editOwnerLastname').value = data.house.apellido_propietario || '';
        }
    } catch (error) {
        console.error('Error loading house data:', error);
    }
    
    document.getElementById('editUserModal').style.display = 'block';
}

async function updateUser() {
    const formData = {
        id: document.getElementById('editUserId').value,
        username: document.getElementById('editUsername').value,
        email: document.getElementById('editEmail').value,
        password: document.getElementById('editPassword').value,
        tipo: document.getElementById('editUserType').value,
        house_number: document.getElementById('editHouseNumber').value,
        house_type: document.getElementById('editHouseType').value,
        owner_name: document.getElementById('editOwnerName').value,
        owner_lastname: document.getElementById('editOwnerLastname').value
    };
    
    try {
        const response = await fetch('../api/update_user_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Usuario actualizado exitosamente');
            closeModal('editUserModal');
            loadUsers();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error actualizando usuario');
    }
}

async function deleteUser(userId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        return;
    }
    
    try {
        const response = await fetch('../api/delete_user_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Usuario eliminado exitosamente');
            loadUsers();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error eliminando usuario');
    }
}

// Report functions
async function loadReportHouses() {
    try {
        const response = await fetch('../../api/get_all_houses.php');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('reportHouse');
            select.innerHTML = '<option value="">Todas las casas</option>';
            
            data.houses.forEach(house => {
                const option = document.createElement('option');
                option.value = house.id;
                option.textContent = `Casa ${house.numero} - ${house.nombre_propietario} ${house.apellido_propietario}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading houses:', error);
    }
}

async function generateHouseReport() {
    const houseId = document.getElementById('reportHouse').value;
    const year = document.getElementById('reportYear').value;
    
    if (!year) {
        alert('Por favor selecciona un año');
        return;
    }
    
    try {
        const response = await fetch('../api/generate_house_report_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                house_id: houseId,
                year: year
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayHouseReport(data);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generando reporte');
    }
}

function displayHouseReport(data) {
    const results = document.getElementById('houseReportResults');
    results.style.display = 'block';
    
    document.getElementById('reportTitle').textContent = data.title;
    document.getElementById('reportTotalBs').textContent = `Bs ${data.totalBs.toLocaleString()}`;
    document.getElementById('reportTotalUsd').textContent = `$${data.totalUsd.toLocaleString()}`;
    document.getElementById('reportPaidMonths').textContent = data.paidMonths;
    
    // Display report details
    const detailsContainer = document.getElementById('reportDetails');
    detailsContainer.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mes</th>
                    <th>Estado</th>
                    <th>Monto</th>
                    <th>Fecha Pago</th>
                </tr>
            </thead>
            <tbody>
                ${data.months.map(month => `
                    <tr>
                        <td>${month.mes_nombre}</td>
                        <td><span class="status-badge ${month.estado === 'Pagado' ? 'status-active' : 'status-inactive'}">${month.estado}</span></td>
                        <td>${month.estado === 'Pagado' ? (month.moneda_pago === 'bs' ? `Bs ${month.monto_bs}` : `$${month.monto_dolares}`) : 'N/A'}</td>
                        <td>${month.fecha_pago ? new Date(month.fecha_pago).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Morosity functions
async function loadMorosityData() {
    const year = document.getElementById('morosityYear').value;
    
    try {
        const response = await fetch('../../api/get_morosity_data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ year: year })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayMorosityData(data);
        }
    } catch (error) {
        console.error('Error loading morosity data:', error);
    }
}

function displayMorosityData(data) {
    document.getElementById('totalDebtBs').textContent = `Bs ${data.summary.totalDebtBs.toLocaleString()}`;
    document.getElementById('totalDebtUsd').textContent = `$${data.summary.totalDebtUsd.toLocaleString()}`;
    document.getElementById('housesInDebt').textContent = data.summary.housesInDebt;
    
    const tbody = document.getElementById('morosityTableBody');
    tbody.innerHTML = '';
    
    data.houses.forEach(house => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Casa ${house.numero}</td>
            <td>${house.nombre_propietario} ${house.apellido_propietario}</td>
            <td>${house.monthsInDebt}</td>
            <td>Bs ${house.debtBs.toLocaleString()}</td>
            <td>$${house.debtUsd.toLocaleString()}</td>
            <td><span class="status-badge ${house.debtBs > 0 || house.debtUsd > 0 ? 'status-pending' : 'status-active'}">${house.debtBs > 0 || house.debtUsd > 0 ? 'En Deuda' : 'Al Día'}</span></td>
            <td>
                <button onclick="viewHouseDetails(${house.id})" class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// House functions
async function loadHouses() {
    try {
        const response = await fetch('../../api/get_all_houses.php');
        const data = await response.json();
        
        if (data.success) {
            houses = data.houses;
            displayHouses(houses);
        }
    } catch (error) {
        console.error('Error loading houses:', error);
    }
}

function displayHouses(houseList) {
    const grid = document.getElementById('housesGrid');
    grid.innerHTML = '';
    
    houseList.forEach(house => {
        const card = document.createElement('div');
        card.className = 'house-card';
        card.onclick = () => viewHouseDetails(house.id);
        
        card.innerHTML = `
            <h4><i class="fas fa-home"></i> Casa ${house.numero}</h4>
            <div class="house-info">
                <span><strong>Tipo:</strong> ${house.tipo}</span>
                <span><strong>Propietario:</strong> ${house.nombre_propietario} ${house.apellido_propietario}</span>
                <span><strong>Usuario:</strong> ${house.username || 'N/A'}</span>
                <span><strong>Email:</strong> ${house.email || 'N/A'}</span>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function viewHouseDetails(houseId) {
    try {
        const response = await fetch(`api/get_house_details.php?house_id=${houseId}`);
        const data = await response.json();
        
        if (data.success) {
            const content = document.getElementById('houseDetailsContent');
            content.innerHTML = `
                <div class="house-details">
                    <h4><i class="fas fa-home"></i> Casa ${data.house.numero}</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <strong>Tipo:</strong> ${data.house.tipo}
                        </div>
                        <div class="detail-item">
                            <strong>Propietario:</strong> ${data.house.nombre_propietario} ${data.house.apellido_propietario}
                        </div>
                        <div class="detail-item">
                            <strong>Usuario:</strong> ${data.house.username || 'N/A'}
                        </div>
                        <div class="detail-item">
                            <strong>Email:</strong> ${data.house.email || 'N/A'}
                        </div>
                    </div>
                    
                    <h5>Historial de Pagos (2025)</h5>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Mes</th>
                                    <th>Estado</th>
                                    <th>Monto</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.payments.map(payment => `
                                    <tr>
                                        <td>${payment.mes_nombre}</td>
                                        <td><span class="status-badge ${payment.estado === 'Pagado' ? 'status-active' : 'status-inactive'}">${payment.estado}</span></td>
                                        <td>${payment.estado === 'Pagado' ? (payment.moneda_pago === 'bs' ? `Bs ${payment.monto_bs}` : `$${payment.monto_dolares}`) : 'N/A'}</td>
                                        <td>${payment.fecha_pago ? new Date(payment.fecha_pago).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('houseDetailsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading house details:', error);
    }
}

// Go to reports page
function goToReportsPage() {
    window.location.href = '../reports/reportes_casa.html';
}

// Go to user management page
function goToUserManagement() {
    console.log("🔍 Intentando ir a gestión de usuarios...");
    console.log("🔍 Ruta actual:", window.location.href);
    console.log("🔍 Ruta destino:", '../housing/gestion_usuarios.html');
    
    try {
        // Usar replace en lugar de href para mejor navegación
        window.location.replace('../housing/gestion_usuarios.html');
        console.log("✅ Redirección ejecutada");
    } catch (error) {
        console.error("❌ Error en redirección:", error);
        // Fallback con href
        window.location.href = '../housing/gestion_usuarios.html';
    }
}

// Go to house info page
function goToHouseInfo() {
    window.location.href = '../housing/informacion_casas.html';
}

// Go to monthly accumulated page
function goToMonthlyAccumulated() {
    window.location.href = '../reports/acumulado_mensual.html';
}

// Logout function
function logout() {
    showLogoutConfirmation();
}

// Mostrar modal de confirmación de logout
function showLogoutConfirmation() {
    const modal = document.createElement('div');
    modal.className = 'logout-confirmation-modal';
    modal.innerHTML = `
        <div class="logout-confirmation-content">
            <div class="logout-confirmation-header">
                <button class="logout-confirmation-close" onclick="closeLogoutConfirmation()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="logout-confirmation-icon">
                    <i class="fas fa-sign-out-alt"></i>
                </div>
                <h3 class="logout-confirmation-title">Cerrar Sesión</h3>
            </div>
            <div class="logout-confirmation-body">
                <p class="logout-confirmation-message">¿Estás seguro de que deseas cerrar sesión?</p>
                <p class="logout-confirmation-submessage">Se perderá el acceso a la administración del sistema.</p>
            </div>
            <div class="logout-confirmation-footer">
                <button class="logout-confirmation-btn logout-confirm" onclick="confirmLogout()">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Mostrar modal con animación
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Prevenir scroll del fondo
    document.body.style.overflow = 'hidden';
}

// Cerrar modal de confirmación
function closeLogoutConfirmation() {
    const modal = document.querySelector('.logout-confirmation-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            // Restaurar scroll del fondo
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Confirmar logout
function confirmLogout() {
    closeLogoutConfirmation();
    
    // Ejecutar logout
    fetch('../../api/logout.php', { method: 'POST' })
        .then(() => {
            window.location.href = '/Arcorui/pages/auth/index.html';
        })
        .catch(error => {
            console.error('Error logging out:', error);
            window.location.href = '/Arcorui/pages/auth/index.html';
        });
}
