// Información de Casas - JavaScript

let allHouses = [];
let filteredHouses = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando página...');
    
    // Esperar un poco para asegurar que el DOM esté completamente cargado
    setTimeout(async () => {
        // Verificar sesión primero
        const sessionValid = await checkSession();
        
        if (sessionValid) {
            // Solo cargar casas si la sesión es válida
            await loadHouses();
    setupEventListeners();
        } else {
            console.log('Sesión no válida, no se cargarán las casas');
        }
    }, 100);
});

// Verificar sesión - SOLO SUPER ADMIN
async function checkSession() {
    console.log('Verificando sesión...');
    
    try {
        // Solo verificar como super admin - acceso restringido
        const superAdminResponse = await fetch('../../superadmin/api/check_super_admin.php');
        console.log('Respuesta de verificación:', superAdminResponse.status);
        
        if (!superAdminResponse.ok) {
            throw new Error(`HTTP error! status: ${superAdminResponse.status}`);
        }
        
        const superAdminData = await superAdminResponse.json();
        console.log('Datos de verificación:', superAdminData);
        
        if (superAdminData.success) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = superAdminData.user.username;
            }
            console.log('Sesión verificada correctamente');
            return true;
        }
        
        // Si no es super admin, denegar acceso y redirigir
        console.log('Acceso denegado: Solo super administradores pueden acceder a esta página');
        alert('Acceso denegado. Solo super administradores pueden acceder a esta página.');
            window.location.href = '/pages/auth/index.html';
        return false;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        alert('Error verificando acceso. Redirigiendo al login.');
        window.location.href = '/pages/auth/index.html';
        return false;
    }
}

// Configurar event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('houseSearch');
    const typeFilter = document.getElementById('typeFilter');
    
    searchInput.addEventListener('input', filterHouses);
    typeFilter.addEventListener('change', filterHouses);
}

// Cargar casas
async function loadHouses() {
    console.log('Iniciando carga de casas...');
    
    try {
        const response = await fetch('../../api/get_all_houses.php');
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (data.success) {
            allHouses = data.houses || [];
            filteredHouses = [...allHouses];
            console.log('Casas cargadas:', allHouses.length);
            displayHousesTable(filteredHouses);
            updateStatistics();
        } else {
            console.error('Error cargando casas:', data.message);
            showError('Error cargando casas: ' + data.message);
        }
    } catch (error) {
        console.error('Error cargando casas:', error);
        showError('Error cargando casas: ' + error.message);
    }
}

// Filtrar casas
function filterHouses() {
    const searchTerm = document.getElementById('houseSearch').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    
    filteredHouses = allHouses.filter(house => {
        // Búsqueda por cédula del propietario, nombre de edificio o casa
        const matchesSearch = !searchTerm || 
            house.cedula.toLowerCase().includes(searchTerm) ||
            (house.nombre_casa && house.nombre_casa.toLowerCase().includes(searchTerm)) ||
            (house.nombre_edificio && house.nombre_edificio.toLowerCase().includes(searchTerm)) ||
            house.nombre_propietario.toLowerCase().includes(searchTerm) ||
            house.apellido_propietario.toLowerCase().includes(searchTerm);
        
        const matchesType = !typeFilter || house.tipo === typeFilter;
        
        return matchesSearch && matchesType;
    });
    
    displayHousesTable(filteredHouses);
    updateStatistics();
}

// Obtener estado de la casa
function getHouseStatus(house) {
    if (house.propietario_nombre) {
        return 'Ocupada';
    } else {
        return 'Desocupada';
    }
}

// Mostrar casas en la grilla
function displayHousesTable(houses) {
    const tbody = document.getElementById('housesTableBody');
    
    if (!tbody) {
        console.error('Elemento housesTableBody no encontrado');
        showError('Error: Elemento de tabla no encontrado');
        return;
    }
    
    if (!houses || houses.length === 0) {
        tbody.innerHTML = `
            <tr class="no-results-row">
                <td colspan="6" class="no-results-cell">
            <div class="no-results">
                        <i class="fas fa-home" style="font-size: 2rem; color: #ccc; margin-bottom: 0.5rem;"></i>
                        <h4>No se encontraron viviendas</h4>
                <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
                </td>
            </tr>
        `;
        return;
    }
    
    try {
        tbody.innerHTML = houses.map(house => createHouseTableRow(house)).join('');
        console.log('Tabla actualizada con', houses.length, 'viviendas');
    } catch (error) {
        console.error('Error actualizando tabla:', error);
        showError('Error actualizando la tabla de viviendas');
    }
}

function createHouseTableRow(house) {
    const tipo = house.tipo;
    // Iconos según el tipo
    let tipoIcon = 'fas fa-home';
    if (tipo === 'apartamento') tipoIcon = 'fas fa-building';
    else if (tipo === 'local') tipoIcon = 'fas fa-store';
    else if (tipo === 'mercadito') tipoIcon = 'fas fa-shopping-cart';
    else if (tipo === 'deporte') tipoIcon = 'fas fa-futbol';
    
    const tipoClass = tipo;
    
    // Identificación según el tipo
    let identificacion = '';
    if (tipo === 'casa') {
        identificacion = `
            <div class="house-identification">
                <span class="house-name">${house.nombre_casa || 'Sin nombre'}</span>
                <span class="house-details">Casa</span>
            </div>
        `;
    } else if (tipo === 'apartamento') {
        identificacion = `
            <div class="house-identification">
                <span class="house-name">${house.nombre_edificio || 'Sin nombre'}</span>
                <span class="house-details">Apto. ${house.numero_apartamento || 'N/A'}</span>
            </div>
        `;
    } else {
        // Para local, mercadito, deporte, etc.
        identificacion = `
            <div class="house-identification">
                <span class="house-name">${house.nombre_casa || house.nombre_edificio || 'Sin nombre'}</span>
                <span class="house-details">${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
            </div>
        `;
    }
    
    // Propietario
    const propietario = `
        <div class="house-owner">
            <span class="owner-name">${house.nombre_propietario} ${house.apellido_propietario}</span>
            <span class="owner-cedula">C.I. ${house.cedula}</span>
        </div>
    `;
    
    // Dirección según el tipo
    let direccion = '';
    if (tipo === 'casa') {
        direccion = house.direccion_casa || 'Sin dirección';
    } else {
        direccion = house.direccion_edificio || 'Sin dirección';
    }
    
    // Usuario
    const usuario = house.username ? `
        <div class="house-user">
            <i class="fas fa-user"></i>
            <span>${house.username}</span>
        </div>
    ` : '<span style="color: #adb5bd;">Sin usuario</span>';
    
    return `
        <tr>
            <td>
                <span class="house-type ${tipoClass}">
                    <i class="${tipoIcon}"></i>
                    ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </span>
            </td>
            <td>${identificacion}</td>
            <td>${propietario}</td>
            <td>
                <div class="house-address">${direccion}</div>
            </td>
            <td>${usuario}</td>
            <td>
                <button class="btn-view-details" onclick="showHouseDetails(${house.id})">
                    <i class="fas fa-eye"></i>
                    Ver Detalles
                </button>
            </td>
        </tr>
    `;
}

// Crear tarjeta de casa
function createHouseCard(house) {
    const status = getHouseStatus(house);
    const statusClass = status === 'Ocupada' ? 'status-occupied' : 'status-vacant';
    
    return `
        <div class="house-card" onclick="showHouseDetails(${house.id})">
            <div class="house-header">
                <div class="house-number">
                    <i class="fas fa-home"></i>
                    Casa #${house.numero}
                </div>
                <div class="house-type">${house.tipo}</div>
            </div>
            
            <div class="house-info">
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Dirección: ${house.direccion || 'No especificada'}</span>
                </div>
                
                ${house.propietario_nombre ? `
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span>Propietario: ${house.propietario_nombre} ${house.propietario_apellido || ''}</span>
                    </div>
                ` : ''}
                
                ${house.propietario_telefono ? `
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span>Teléfono: ${house.propietario_telefono}</span>
                    </div>
                ` : ''}
                
                ${house.propietario_email ? `
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span>Email: ${house.propietario_email}</span>
                    </div>
                ` : ''}
                
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Registrada: ${formatDate(house.fecha_registro)}</span>
                </div>
            </div>
            
            <div class="house-status">
                <div class="status-badge ${statusClass}">${status}</div>
                <button class="view-details-btn" onclick="event.stopPropagation(); showHouseDetails(${house.id})">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
            </div>
        </div>
    `;
}

// Mostrar detalles de la casa
// Función showHouseDetails eliminada - ahora se usa la versión que trabaja con datos locales

// Función displayHouseDetails eliminada - ahora se usa showHouseDetails que trabaja con datos locales

// Actualizar estadísticas
function updateStatistics() {
    const totalCasas = allHouses.filter(house => house.tipo === 'casa').length;
    const totalApartamentos = allHouses.filter(house => house.tipo === 'apartamento').length;
    const totalGeneral = allHouses.length;
    
    // Actualizar elementos si existen
    const totalCasasElement = document.getElementById('totalCasas');
    const totalApartamentosElement = document.getElementById('totalApartamentos');
    const totalGeneralElement = document.getElementById('totalGeneral');
    
    if (totalCasasElement) {
        totalCasasElement.textContent = totalCasas;
    }
    if (totalApartamentosElement) {
        totalApartamentosElement.textContent = totalApartamentos;
    }
    if (totalGeneralElement) {
        totalGeneralElement.textContent = totalGeneral;
    }
    
    console.log('Estadísticas actualizadas:', {
        casas: totalCasas,
        apartamentos: totalApartamentos,
        total: totalGeneral
    });
}

// Limpiar filtros
window.clearFilters = function() {
    document.getElementById('houseSearch').value = '';
    document.getElementById('typeFilter').value = '';
    filterHouses();
}

// Cerrar modal
window.closeModal = function(modalId) {
    console.log('Cerrando modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    document.body.style.overflow = 'auto';
        console.log('Modal cerrado correctamente');
    } else {
        console.error('Modal no encontrado:', modalId);
    }
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return 'No especificada';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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

// Mostrar detalles de la vivienda
window.showHouseDetails = function(houseId) {
    console.log('showHouseDetails llamada con ID:', houseId);
    console.log('allHouses disponibles:', allHouses.length);
    
    // Convertir a número para asegurar comparación correcta
    const numericId = parseInt(houseId);
    const house = allHouses.find(h => parseInt(h.id) === numericId);
    
    if (!house) {
        console.error('Casa no encontrada con ID:', houseId);
        console.log('IDs disponibles:', allHouses.map(h => h.id));
        showError('No se encontró la vivienda con ID: ' + houseId);
        return;
    }
    
    console.log('Casa encontrada:', house);
    
    const modal = document.getElementById('houseDetailsModal');
    const content = document.getElementById('houseDetailsContent');
    
    if (!modal) {
        console.error('Modal no encontrado');
        showError('Error: Modal no encontrado');
        return;
    }
    
    if (!content) {
        console.error('Contenido del modal no encontrado');
        showError('Error: Contenido del modal no encontrado');
        return;
    }
    
    const tipo = house.tipo;
    const tipoIcon = tipo === 'casa' ? 'fas fa-home' : 'fas fa-building';
    
    // Construir contenido del modal estilo formulario
    let modalContent = `
        <div class="registro-header">
            <h2>Registro de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</h2>
        </div>
        
        <div class="registro-form">
            <div class="form-section">
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Tipo de Vivienda:</label>
                        <div class="field-value">${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</div>
                    </div>
                </div>`;
    
    // Campos específicos según el tipo
    if (tipo === 'casa') {
        modalContent += `
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Nombre de la Casa:</label>
                        <div class="field-value">${house.nombre_casa || ''}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Dirección:</label>
                        <div class="field-value">${house.direccion_casa || ''}</div>
                    </div>
                </div>
        `;
    } else if (tipo === 'apartamento') {
        modalContent += `
                <div class="form-row">
                    <div class="form-field">
                        <label>Nombre del Edificio:</label>
                        <div class="field-value">${house.nombre_edificio || ''}</div>
                    </div>
                    <div class="form-field">
                        <label>Nº Apartamento:</label>
                        <div class="field-value">${house.numero_apartamento || ''}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Dirección del Edificio:</label>
                        <div class="field-value">${house.direccion_edificio || ''}</div>
                    </div>
                </div>
        `;
    } else {
        // Para local, mercadito, deporte u otros
        modalContent += `
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Nombre:</label>
                        <div class="field-value">${house.nombre_casa || house.nombre_edificio || ''}</div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Dirección:</label>
                        <div class="field-value">${house.direccion_casa || house.direccion_edificio || ''}</div>
                    </div>
                </div>
        `;
    }
    
    modalContent += `
                <div class="form-section-title">Datos del Propietario</div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label>Nombre:</label>
                        <div class="field-value">${house.nombre_propietario}</div>
                    </div>
                    <div class="form-field">
                        <label>Apellido:</label>
                        <div class="field-value">${house.apellido_propietario}</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label>Cédula:</label>
                        <div class="field-value">${house.cedula}</div>
                    </div>
                    <div class="form-field">
                        <label>Teléfono:</label>
                        <div class="field-value">${house.telefono || 'No especificado'}</div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label>Email:</label>
                        <div class="field-value">${house.gmail || 'No especificado'}</div>
                    </div>
                    <div class="form-field">
                        <label>Antigüedad:</label>
                        <div class="field-value">${house.antiguedad || 0} años</div>
                    </div>
                </div>
    `;
    
    if (house.username) {
        modalContent += `
                <div class="form-section-title">Usuario del Sistema</div>
                
                <div class="form-row">
                    <div class="form-field">
                        <label>Usuario:</label>
                        <div class="field-value">${house.username}</div>
                    </div>
                    <div class="form-field">
                        <label>Email:</label>
                        <div class="field-value">${house.email || 'No especificado'}</div>
                    </div>
                </div>
        `;
    }
    
    modalContent += `
                <div class="form-section-title">Información de Registro</div>
                
                <div class="form-row">
                    <div class="form-field full-width">
                        <label>Fecha de Registro:</label>
                        <div class="field-value">${new Date(house.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = modalContent;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    console.log('Modal abierto correctamente');
}

// Volver al menú anterior (Super Admin Dashboard)
window.goBack = function() {
    window.location.href = '../superadmin/html/super_admin.html';
}

// Ir al super admin (mantener por compatibilidad)
function goToSuperAdmin() {
    window.location.href = '../superadmin/html/super_admin.html';
}

// Logout (mantener por si se necesita)
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        fetch('../../api/logout.php', {
            method: 'POST'
        }).then(() => {
            window.location.href = '/pages/auth/index.html';
        });
    }
}

// Agregar estilos CSS para el modal de detalles
const style = document.createElement('style');
style.textContent = `
    .house-details {
        max-width: 100%;
    }
    
    .detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e9ecef;
    }
    
    .detail-header h4 {
        margin: 0;
        color: #333;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .house-type-badge {
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .detail-sections {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }
    
    .detail-section h5 {
        margin: 0 0 1rem 0;
        color: #1e3c72;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid #e9ecef;
        padding-bottom: 0.5rem;
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .detail-item label {
        font-weight: 600;
        color: #666;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .detail-item span {
        color: #333;
        font-size: 1rem;
    }
    
    .vacant-notice {
        background: #fff3cd;
        color: #856404;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #ffc107;
        margin: 0;
        font-style: italic;
    }
    
    .no-results {
        text-align: center;
        padding: 3rem;
        color: #666;
        grid-column: 1 / -1;
    }
    
    .no-results h3 {
        margin: 1rem 0 0.5rem 0;
        color: #333;
    }
    
    .no-results p {
        margin: 0;
        font-size: 0.9rem;
    }
    
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
    
    @media (max-width: 768px) {
        .detail-grid {
            grid-template-columns: 1fr;
        }
        
        .detail-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }
    }
`;
document.head.appendChild(style);
