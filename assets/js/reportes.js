// Variables globales
let currentUser = null;
let currentDatePicker = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let activeHousingSummary = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function () {
    hydrateActiveHousingFromStorage();
    checkSession();
    setDefaultDates();
});

function hydrateActiveHousingFromStorage() {
    try {
        const summary = sessionStorage.getItem('activeHousingSummary');
        if (summary) {
            activeHousingSummary = summary;
            const display = document.getElementById('reportHousingDisplay');
            if (display) {
                display.textContent = summary;
            }
        }
    } catch (error) {
        console.warn('No se pudo recuperar la vivienda activa desde sessionStorage:', error);
    }
}

// Verificar sesión
async function checkSession() {
    try {
        const response = await fetch('../../api/check_session.php');
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            document.getElementById('userName').textContent = data.user.username;
        } else {
            window.location.href = '/pages/auth/index.html';
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
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

// Establecer año por defecto
function setDefaultDates() {
    const today = new Date();
    document.getElementById('yearSelect').value = today.getFullYear();
}

// Formatear fecha a formato venezolano (DD/MM/YYYY)
function formatDateToVenezuelan(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Convertir fecha venezolana a formato ISO (YYYY-MM-DD)
function convertVenezuelanToISO(dateString) {
    if (!dateString) return '';

    const parts = dateString.split('/');
    if (parts.length !== 3) return '';

    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    // Validar formato
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return '';

    return `${year}-${month}-${day}`;
}

// Agregar máscara de entrada para fechas
function addDateMask(inputId) {
    const input = document.getElementById(inputId);

    input.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, ''); // Solo números

        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        if (value.length >= 5) {
            value = value.substring(0, 5) + '/' + value.substring(5, 9);
        }

        e.target.value = value;
    });

    input.addEventListener('blur', function (e) {
        validateDate(e.target);
    });
}

// Validar fecha
function validateDate(input) {
    const value = input.value;
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);

    if (!match) {
        input.style.borderColor = '#ef4444';
        return false;
    }

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);

    // Validar rango de fechas
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
        input.style.borderColor = '#ef4444';
        return false;
    }

    // Validar fecha real
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        input.style.borderColor = '#ef4444';
        return false;
    }

    input.style.borderColor = '#10b981';
    return true;
}

// Generar reporte
async function generateReport() {
    const year = document.getElementById('yearSelect').value;

    if (!year) {
        alert('Por favor selecciona un año');
        return;
    }

    try {
        const response = await fetch('../../api/generate_report.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                year: year
            })
        });

        const data = await response.json();
        console.log('📡 Respuesta de la API:', data);

        if (data.success) {
            displayReport(data);
        } else {
            console.error('❌ Error en la API:', data.message);
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error generando reporte:', error);
        alert('Error generando reporte');
    }
}

// Mostrar reporte
function displayReport(data) {
    console.log('🔍 Datos recibidos del servidor:', data);

    const resultsDiv = document.getElementById('reportResults');
    const contentDiv = document.getElementById('reportContent');

    resultsDiv.style.display = 'block';

    // Usar los datos que vienen del servidor
    const allMonths = data.all_months || [];
    console.log('📅 Meses recibidos:', allMonths);

    const paidCount = allMonths.filter(m => m.estado === 'Pagado').length;
    const partialCount = allMonths.filter(m => m.estado === 'Pago Parcial').length;
    const unpaidCount = allMonths.filter(m => m.estado === 'No Pagado').length;

    console.log(`📊 Resumen: ${paidCount} pagados, ${partialCount} parciales, ${unpaidCount} no pagados`);

    let html = `
        <div class="report-header">
            <h3>Reporte de Pagos - Año ${data.year}</h3>
            <p><strong>Propietario:</strong> ${data.propietario}</p>
            <p><strong>Fecha de generación:</strong> ${data.fecha_generacion || new Date().toLocaleString('es-VE')}</p>
        </div>
        
        <div class="report-summary">
            <div class="summary-cards">
                <div class="summary-card">
                    <h4>Meses Pagados</h4>
                    <span class="summary-number">${paidCount}</span>
                </div>
                <div class="summary-card">
                    <h4>Pagos Parciales</h4>
                    <span class="summary-number">${partialCount}</span>
                </div>
                <div class="summary-card">
                    <h4>Meses No Pagados</h4>
                    <span class="summary-number">${unpaidCount}</span>
                </div>
                <div class="summary-card">
                    <h4>Total Pagado (USD)</h4>
                    <span class="summary-number">$${data.total_usd ? parseFloat(data.total_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                </div>
            </div>
        </div>
    `;

    // Mostrar tabla de meses
    html += `
        <div class="report-section">
            <h4><i class="fas fa-calendar-alt"></i> Estado de Meses</h4>
            <div class="table-container">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Año</th>
                            <th>Estado</th>
                            <th>Método de Pago</th>
                            <th>Monto (USD)</th>
                            <th>Fecha Pago</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    allMonths.forEach(month => {
        const status = month.estado;
        let statusClass = 'status-unpaid';
        if (status === 'Pagado') {
            statusClass = 'status-paid';
        } else if (status === 'Pago Parcial') {
            statusClass = 'status-partial';
        }

        // Método de pago (ya viene "Mixto" desde el backend si hay más de un método)
        const method = month.metodo_pago || 'N/A';

        // Monto siempre en USD (sumatoria de pago_detalles.monto_usd)
        let amount = 'N/A';
        if (month.estado === 'Pagado' || month.estado === 'Pago Parcial') {
            amount = `$${parseFloat(month.monto_usd_total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        // Fecha Pago: solo si el estado es Pagado, mostrar la fecha del último pago
        let date = 'N/A';
        if (month.estado === 'Pagado' && month.fecha_pago_formatted) {
            date = month.fecha_pago_formatted;
        }

        html += `
            <tr>
                <td>${month.mes_nombre}</td>
                <td>${month.año}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${method}</td>
                <td>${amount}</td>
                <td>${date}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (allMonths.length === 0) {
        html += `
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <p>No se encontraron meses en el rango de fechas seleccionado</p>
            </div>
        `;
    }

    contentDiv.innerHTML = html;
}

// Generar meses en un rango de fechas
function generateMonthsInRange(startDate, endDate) {
    const months = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
        months.push({
            name: monthNames[current.getMonth()],
            number: current.getMonth() + 1,
            year: current.getFullYear()
        });

        current.setMonth(current.getMonth() + 1);
    }

    return months;
}

// Descargar reporte PDF
async function downloadReport() {
    const year = document.getElementById('yearSelect').value;

    if (!year) {
        alert('Por favor selecciona un año');
        return;
    }

    try {
        const response = await fetch('../../api/generate_pdf_report.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                year: year
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_pagos_${year}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const errorData = await response.json();
            alert('Error generando PDF: ' + (errorData.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error descargando PDF:', error);
        alert('Error descargando PDF');
    }
}

// Imprimir reporte
function printReport() {
    const reportContent = document.getElementById('reportContent');
    if (reportContent) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Pagos - Gerencias De Condominio</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .status-paid { color: #10b981; font-weight: bold; }
                        .status-unpaid { color: #ef4444; font-weight: bold; }
                        h1 { color: #1e3c72; }
                        h2 { color: #1e3c72; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <h1>Reporte de Pagos - Gerencias De Condominio</h1>
                    <p>Año: ${document.getElementById('yearSelect').value}</p>
                    ${reportContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

// Volver al dashboard
function goBack() {
    window.location.href = '../dashboard/dashboard.html';
}

// Date Picker Functions
function openDatePicker(inputId) {
    currentDatePicker = inputId;
    const modal = document.getElementById('datePickerModal');
    modal.style.display = 'flex';

    // Establecer mes y año actual
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();

    renderCalendar();
}

function closeDatePicker() {
    const modal = document.getElementById('datePickerModal');
    modal.style.display = 'none';
    currentDatePicker = null;
}

function changeMonth(direction) {
    currentMonth += direction;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderCalendar();
}

function renderCalendar() {
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Actualizar header
    document.getElementById('currentMonthYear').textContent =
        `${monthNames[currentMonth]} ${currentYear}`;

    // Obtener primer día del mes y cuántos días tiene
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Limpiar calendario
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    // Agregar días del mes anterior
    const prevMonth = new Date(currentYear, currentMonth - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, true);
        calendarDays.appendChild(dayElement);
    }

    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, false);
        calendarDays.appendChild(dayElement);
    }

    // Agregar días del mes siguiente para completar la grilla
    const remainingDays = 42 - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, true);
        calendarDays.appendChild(dayElement);
    }
}

function createDayElement(day, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;

    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    } else {
        // Verificar si es hoy
        const today = new Date();
        if (currentYear === today.getFullYear() &&
            currentMonth === today.getMonth() &&
            day === today.getDate()) {
            dayElement.classList.add('today');
        }

        // Agregar evento de click
        dayElement.addEventListener('click', function () {
            selectDate(day);
        });
    }

    return dayElement;
}

function selectDate(day) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const formattedDate = formatDateToVenezuelan(selectedDate);

    // Actualizar el input correspondiente
    document.getElementById(currentDatePicker).value = formattedDate;

    // Cerrar el date picker
    closeDatePicker();
}

// Cerrar date picker al hacer click fuera
document.addEventListener('click', function (event) {
    const modal = document.getElementById('datePickerModal');
    if (event.target === modal) {
        closeDatePicker();
    }
});
