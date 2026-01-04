// JavaScript para Reportes por Casa
let allHouses = [];
let selectedHouseId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de Reportes por Casa cargada.');
    
    // Verificar sesión y cargar datos iniciales
    checkSession();
    loadHouses();
    
    // Configurar el buscador de casas
    setupHouseSearch();
});

// Verificar sesión del usuario
async function checkSession() {
    try {
        const response = await fetch('../../api/check_session.php');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('userName').textContent = data.user.username || 'Usuario';
            
            // Verificar que sea super admin
            if (data.user.tipo !== 'super_admin') {
                alert('No tienes permisos para acceder a esta página.');
                window.location.href = '../dashboard/dashboard.html';
                return;
            }
        } else {
            window.location.href = '/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = '/pages/auth/index.html';
    }
}

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        fetch('../../api/logout.php', { method: 'POST' })
            .then(() => {
                window.location.href = '/pages/auth/index.html';
            })
            .catch(error => {
                console.error('Error al cerrar sesión:', error);
                window.location.href = '/pages/auth/index.html';
            });
    }
}

// Volver al dashboard
function goBack() {
    window.location.href = '../dashboard/dashboard.html';
}

// Ir al dashboard del super admin
function goToSuperAdmin() {
    window.location.href = '../superadmin/html/super_admin.html';
}

// Cargar lista de casas
async function loadHouses() {
    try {
        const response = await fetch('../../api/get_all_houses.php');
        const data = await response.json();
        
        if (data.success) {
            allHouses = data.houses;
        } else {
            console.error('Error cargando casas:', data.message);
        }
    } catch (error) {
        console.error('Error cargando casas:', error);
    }
}

// Configurar el buscador de casas
function setupHouseSearch() {
    const houseSearch = document.getElementById('houseSearch');
    const searchResults = document.getElementById('searchResults');
    
    houseSearch.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        // Filtrar casas
        const filteredHouses = allHouses.filter(house => {
            const houseText = `${house.tipo} ${house.numero} ${house.nombre_propietario} ${house.apellido_propietario}`.toLowerCase();
            return houseText.includes(query);
        });
        
        displaySearchResults(filteredHouses);
    });
    
    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!houseSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

// Mostrar resultados de búsqueda
function displaySearchResults(houses) {
    const searchResults = document.getElementById('searchResults');
    
    if (houses.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item" style="color: #999; text-align: center;">No se encontraron casas</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    searchResults.innerHTML = houses.map(house => `
        <div class="search-result-item" onclick="selectHouse(${house.id}, '${house.tipo}', ${house.numero}, '${house.nombre_propietario}', '${house.apellido_propietario}')">
            <div class="house-info">
                <div class="house-number">${house.tipo} #${house.numero}</div>
                <div class="house-owner">${house.nombre_propietario} ${house.apellido_propietario}</div>
            </div>
            <div class="house-type">${house.tipo}</div>
        </div>
    `).join('');
    
    searchResults.style.display = 'block';
}

// Seleccionar una casa
function selectHouse(id, tipo, numero, nombre, apellido) {
    selectedHouseId = id;
    
    // Actualizar el input
    const houseSearch = document.getElementById('houseSearch');
    houseSearch.value = `${tipo} #${numero}`;
    
    // Mostrar casa seleccionada
    const selectedHouse = document.getElementById('selectedHouse');
    const selectedHouseText = document.getElementById('selectedHouseText');
    
    selectedHouseText.textContent = `${tipo} #${numero} - ${nombre} ${apellido}`;
    selectedHouse.style.display = 'flex';
    
    // Ocultar resultados de búsqueda
    document.getElementById('searchResults').style.display = 'none';
}

// Limpiar casa seleccionada
function clearSelectedHouse() {
    selectedHouseId = null;
    
    // Limpiar input
    document.getElementById('houseSearch').value = '';
    
    // Ocultar casa seleccionada
    document.getElementById('selectedHouse').style.display = 'none';
}

// Generar reporte
async function generateHouseReport() {
    const selectedYearRadio = document.querySelector('input[name="year"]:checked');
    const year = selectedYearRadio ? selectedYearRadio.value : null;
    
    if (!year) {
        alert('Por favor selecciona un año.');
        return;
    }
    
    // Mostrar loading
    showLoading();
    
    try {
        const response = await fetch('../../superadmin/api/generate_house_report_super_admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                house_id: selectedHouseId || null,
                year: year
            })
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            displayReport(data, selectedHouseId, year);
        } else {
            alert('Error generando reporte: ' + data.message);
        }
    } catch (error) {
        hideLoading();
        console.error('Error generando reporte:', error);
        alert('Error generando reporte. Por favor intenta nuevamente.');
    }
}

// Mostrar reporte en la página
function displayReport(data, houseId, year) {
    const reportTitle = document.getElementById('reportTitle');
    
    // Determinar el nombre de la casa
    let houseName = 'Todas las casas';
    if (houseId && selectedHouseId) {
        const selectedHouse = allHouses.find(h => h.id == houseId);
        if (selectedHouse) {
            houseName = `${selectedHouse.tipo} #${selectedHouse.numero}`;
        }
    }
    
    // Actualizar título
    reportTitle.textContent = `Reporte ${houseName} - Año ${year}`;
    
    // Actualizar estadísticas
    document.getElementById('totalPaidBs').textContent = formatCurrency(data.total_bs, 'Bs');
    document.getElementById('totalPaidUsd').textContent = formatCurrency(data.total_usd, 'USD');
    
    // Contar meses pagados y no pagados
    const paidMonths = data.all_months.filter(month => month.estado === 'Pagado').length;
    const unpaidMonths = data.all_months.filter(month => month.estado === 'No Pagado').length;
    
    document.getElementById('paidMonthsCount').textContent = paidMonths;
    document.getElementById('unpaidMonthsCount').textContent = unpaidMonths;
    
    // Llenar tabla
    fillReportTable(data.all_months);
    
    // Mostrar resultados
    document.getElementById('reportResults').style.display = 'block';
    document.getElementById('noResultsMessage').style.display = 'none';
    
    // Guardar datos para descarga
    window.currentReportData = data;
    window.currentReportYear = year;
    window.currentReportHouseId = houseId;
}

// Llenar tabla del reporte
function fillReportTable(months) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    
    if (months.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="9" style="text-align: center; padding: 2rem; color: #666;">No hay datos disponibles para los filtros seleccionados.</td>';
        tbody.appendChild(row);
        return;
    }
    
    months.forEach(month => {
        const row = document.createElement('tr');
        
        const statusClass = month.estado === 'Pagado' ? 'status-paid' : 'status-unpaid';
        const statusIcon = month.estado === 'Pagado' ? 'fas fa-check-circle' : 'fas fa-times-circle';
        
        row.innerHTML = `
            <td>${month.vivienda_tipo} #${month.vivienda_numero}</td>
            <td>${month.propietario}</td>
            <td>${month.mes_nombre}</td>
            <td>${month.año}</td>
            <td><span class="${statusClass}"><i class="${statusIcon}"></i> ${month.estado}</span></td>
            <td>${month.estado === 'Pagado' ? formatCurrency(month.monto_bs || month.monto_dolares, month.moneda_pago) : '-'}</td>
            <td>${month.estado === 'Pagado' ? month.moneda_pago.toUpperCase() : '-'}</td>
            <td>${month.estado === 'Pagado' ? month.metodo_pago : '-'}</td>
            <td>${month.fecha_pago_formatted || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Formatear moneda
function formatCurrency(amount, currency) {
    if (!amount || amount === 0) return '0';
    
    const formatter = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return `${formatter.format(amount)} ${currency}`;
}

// Descargar reporte en PDF
async function downloadReportPDF() {
    if (!window.currentReportData) {
        alert('No hay reporte para descargar. Genera un reporte primero.');
        return;
    }
    
    try {
        const response = await fetch('../../api/generate_house_report_pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                house_id: window.currentReportHouseId,
                year: window.currentReportYear
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_casa_${window.currentReportYear}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Error generando PDF. Por favor intenta nuevamente.');
        }
    } catch (error) {
        console.error('Error descargando PDF:', error);
        alert('Error descargando PDF. Por favor intenta nuevamente.');
    }
}

// Imprimir reporte
function printReport() {
    if (!window.currentReportData) {
        alert('No hay reporte para imprimir. Genera un reporte primero.');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const reportData = window.currentReportData;
    const year = window.currentReportYear;
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Pagos - Año ${year}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { margin-bottom: 20px; }
                .summary-item { margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .status-paid { color: green; }
                .status-unpaid { color: red; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Reporte de Pagos - Año ${year}</h1>
                <p>Generado el ${new Date().toLocaleDateString('es-VE')}</p>
            </div>
            
            <div class="summary">
                <h3>Resumen</h3>
                <div class="summary-item">Total Pagado (Bs): ${formatCurrency(reportData.total_bs, 'Bs')}</div>
                <div class="summary-item">Total Pagado (USD): ${formatCurrency(reportData.total_usd, 'USD')}</div>
                <div class="summary-item">Meses Pagados: ${reportData.all_months.filter(m => m.estado === 'Pagado').length}</div>
                <div class="summary-item">Meses Sin Pagar: ${reportData.all_months.filter(m => m.estado === 'No Pagado').length}</div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Vivienda</th>
                        <th>Propietario</th>
                        <th>Mes</th>
                        <th>Año</th>
                        <th>Estado</th>
                        <th>Monto</th>
                        <th>Moneda</th>
                        <th>Método de Pago</th>
                        <th>Fecha de Pago</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.all_months.map(month => `
                        <tr>
                            <td>${month.vivienda_tipo} #${month.vivienda_numero}</td>
                            <td>${month.propietario}</td>
                            <td>${month.mes_nombre}</td>
                            <td>${month.año}</td>
                            <td class="${month.estado === 'Pagado' ? 'status-paid' : 'status-unpaid'}">${month.estado}</td>
                            <td>${month.estado === 'Pagado' ? formatCurrency(month.monto_bs || month.monto_dolares, month.moneda_pago) : '-'}</td>
                            <td>${month.estado === 'Pagado' ? month.moneda_pago.toUpperCase() : '-'}</td>
                            <td>${month.estado === 'Pagado' ? month.metodo_pago : '-'}</td>
                            <td>${month.fecha_pago_formatted || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Exportar a Excel (función básica)
function exportToExcel() {
    if (!window.currentReportData) {
        alert('No hay reporte para exportar. Genera un reporte primero.');
        return;
    }
    
    const reportData = window.currentReportData;
    const year = window.currentReportYear;
    
    // Crear CSV content
    let csvContent = "Vivienda,Propietario,Mes,Año,Estado,Monto,Moneda,Método de Pago,Fecha de Pago\n";
    
    reportData.all_months.forEach(month => {
        const row = [
            `${month.vivienda_tipo} #${month.vivienda_numero}`,
            month.propietario,
            month.mes_nombre,
            month.año,
            month.estado,
            month.estado === 'Pagado' ? (month.monto_bs || month.monto_dolares) : '',
            month.estado === 'Pagado' ? month.moneda_pago : '',
            month.estado === 'Pagado' ? month.metodo_pago : '',
            month.fecha_pago_formatted || ''
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_casa_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Mostrar loading
function showLoading() {
    document.getElementById('loadingModal').style.display = 'block';
}

// Ocultar loading
function hideLoading() {
    document.getElementById('loadingModal').style.display = 'none';
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const loadingModal = document.getElementById('loadingModal');
    if (event.target === loadingModal) {
        loadingModal.style.display = 'none';
    }
}
