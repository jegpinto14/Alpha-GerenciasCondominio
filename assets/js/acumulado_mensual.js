// Acumulado Mensual - JavaScript

let monthlyData = [];
let chart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    setupEventListeners();
});

// Verificar sesión
async function checkSession() {
    try {
        const response = await fetch('../../api/check_session.php');
        const data = await response.json();
        
        if (data.logged_in) {
            document.getElementById('userName').textContent = data.user.username;
        } else {
            window.location.href = '/Arcorui/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = '/Arcorui/pages/auth/index.html';
    }
}

// Configurar event listeners
function setupEventListeners() {
    const yearRadios = document.querySelectorAll('input[name="year"]');
    yearRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                loadMonthlyData();
            }
        });
    });
}

// Cargar datos mensuales
async function loadMonthlyData() {
    const selectedYear = document.querySelector('input[name="year"]:checked').value;
    
    showLoading();
    
    try {
        const response = await fetch('../../api/get_monthly_accumulated.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ year: selectedYear })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            monthlyData = data.monthly_data;
            updateSummaryStats(data.summary);
            displayMonthlyTable(monthlyData);
            createChart(monthlyData);
        } else {
            showError('Error cargando datos: ' + data.message);
        }
    } catch (error) {
        hideLoading();
        console.error('Error cargando datos:', error);
        showError('Error cargando datos mensuales');
    }
}

// Actualizar estadísticas de resumen
function updateSummaryStats(summary) {
    document.getElementById('totalYearBs').textContent = formatCurrency(summary.total_bs, 'Bs');
    document.getElementById('totalYearUsd').textContent = formatCurrency(summary.total_usd, 'USD');
    document.getElementById('monthsWithPayments').textContent = summary.months_with_payments;
    document.getElementById('bestMonth').textContent = summary.best_month || '-';
}

// Mostrar tabla mensual
function displayMonthlyTable(data) {
    const tbody = document.getElementById('monthlyTableBody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 3rem; color: #666;">
                    <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    No hay datos para el año seleccionado
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(month => `
        <tr>
            <td class="month-name">${month.month_name}</td>
            <td class="currency-amount currency-bs">${formatCurrency(month.total_bs, 'Bs')}</td>
            <td class="currency-amount currency-usd">${formatCurrency(month.total_usd, 'USD')}</td>
            <td class="payment-count">${month.payment_count}</td>
            <td class="average-amount currency-bs">${formatCurrency(month.average_bs, 'Bs')}</td>
            <td class="average-amount currency-usd">${formatCurrency(month.average_usd, 'USD')}</td>
            <td><span class="month-status ${getStatusClass(month.status)}">${month.status}</span></td>
        </tr>
    `).join('');
}

// Obtener clase de estado
function getStatusClass(status) {
    switch (status) {
        case 'Excelente': return 'status-excellent';
        case 'Bueno': return 'status-good';
        case 'Regular': return 'status-poor';
        default: return 'status-none';
    }
}

// Crear gráfico
function createChart(data) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // Destruir gráfico existente
    if (chart) {
        chart.destroy();
    }
    
    const months = data.map(item => item.month_name);
    const bsData = data.map(item => item.total_bs);
    const usdData = data.map(item => item.total_usd);
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Bolívares (Bs)',
                    data: bsData,
                    backgroundColor: 'rgba(30, 60, 114, 0.8)',
                    borderColor: 'rgba(30, 60, 114, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                },
                {
                    label: 'Dólares (USD)',
                    data: usdData,
                    backgroundColor: 'rgba(0, 123, 255, 0.8)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Acumulado Mensual de Pagos',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    color: '#333'
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#1e3c72',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const currency = context.dataset.label.includes('Bolívares') ? 'Bs' : 'USD';
                            return `${context.dataset.label}: ${formatCurrency(value, currency)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 11,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        callback: function(value) {
                            return formatCurrency(value, 'Bs');
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Formatear moneda
function formatCurrency(amount, currency) {
    if (amount === null || amount === undefined) return '0 ' + currency;
    
    const formatter = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return formatter.format(amount) + ' ' + currency;
}

// Exportar a PDF
async function exportToPDF() {
    const selectedYear = document.querySelector('input[name="year"]:checked').value;
    
    showLoading();
    
    try {
        const response = await fetch('../../api/generate_monthly_accumulated_pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ year: selectedYear })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `acumulado_mensual_${selectedYear}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showSuccess('PDF generado exitosamente');
        } else {
            showError('Error generando PDF');
        }
    } catch (error) {
        console.error('Error generando PDF:', error);
        showError('Error generando PDF');
    } finally {
        hideLoading();
    }
}

// Exportar a Excel
async function exportToExcel() {
    const selectedYear = document.querySelector('input[name="year"]:checked').value;
    
    showLoading();
    
    try {
        const response = await fetch('../../api/generate_monthly_accumulated_excel.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ year: selectedYear })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `acumulado_mensual_${selectedYear}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showSuccess('Excel generado exitosamente');
        } else {
            showError('Error generando Excel');
        }
    } catch (error) {
        console.error('Error generando Excel:', error);
        showError('Error generando Excel');
    } finally {
        hideLoading();
    }
}

// Imprimir reporte
function printReport() {
    const selectedYear = document.querySelector('input[name="year"]:checked').value;
    
    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent(selectedYear);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// Generar contenido para impresión
function generatePrintContent(year) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Acumulado Mensual ${year}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #1e3c72; margin-bottom: 10px; }
                .header p { color: #666; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f8f9fa; font-weight: bold; }
                .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .summary h3 { color: #1e3c72; margin-bottom: 15px; }
                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                .summary-item { text-align: center; }
                .summary-value { font-size: 1.5rem; font-weight: bold; color: #333; }
                .summary-label { font-size: 0.9rem; color: #666; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Acumulado Mensual ${year}</h1>
                <p>Reporte de ingresos por mes - Arcorui</p>
                <p>Generado el: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            
            <div class="summary">
                <h3>Resumen del Año</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value" id="printTotalBs">0 Bs</div>
                        <div class="summary-label">Total en Bolívares</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value" id="printTotalUsd">0 USD</div>
                        <div class="summary-label">Total en Dólares</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value" id="printMonthsWithPayments">0</div>
                        <div class="summary-label">Meses con Pagos</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value" id="printBestMonth">-</div>
                        <div class="summary-label">Mejor Mes</div>
                    </div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>Total Bs</th>
                        <th>Total USD</th>
                        <th>Pagos</th>
                        <th>Promedio Bs</th>
                        <th>Promedio USD</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="printTableBody">
                    ${monthlyData.map(month => `
                        <tr>
                            <td>${month.month_name}</td>
                            <td>${formatCurrency(month.total_bs, 'Bs')}</td>
                            <td>${formatCurrency(month.total_usd, 'USD')}</td>
                            <td>${month.payment_count}</td>
                            <td>${formatCurrency(month.average_bs, 'Bs')}</td>
                            <td>${formatCurrency(month.average_usd, 'USD')}</td>
                            <td>${month.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
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
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Mostrar mensaje de error
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// Ir al super admin
function goToSuperAdmin() {
    window.location.href = '../superadmin/html/super_admin.html';
}

// Logout
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        fetch('../../api/logout.php', {
            method: 'POST'
        }).then(() => {
            window.location.href = '/Arcorui/pages/auth/index.html';
        });
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
`;
document.head.appendChild(style);
