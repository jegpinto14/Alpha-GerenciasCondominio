document.addEventListener('DOMContentLoaded', function () {
    loadData();
});

async function loadData() {
    try {
        // Mostrar loading
        document.getElementById('total').innerText = 'Cargando...';
        const inmueblesTable = document.getElementById('inmueblesTable').querySelector('tbody');
        inmueblesTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">Cargando datos...</td></tr>';

        console.log('Cargando datos de inmuebles...');
        const response = await fetch('reportes_api.php');
        console.log('Respuesta del servidor:', response);
        const data = await response.json();
        console.log('Datos recibidos:', data);

        if (data.success) {
            document.getElementById('total').innerText = data.total_inmuebles;

            // Limpiar tabla
            inmueblesTable.innerHTML = '';

            // Mostrar inmuebles
            console.log('Mostrando', data.inmuebles.length, 'inmuebles');
            data.inmuebles.forEach(inmueble => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${inmueble.nombre_vivienda}</td><td>${inmueble.nombre_propietario}</td><td>${inmueble.apellido}</td><td>${inmueble.correo}</td><td>${inmueble.calle}</td>`;
                inmueblesTable.appendChild(row);
            });

            // Mostrar cantidades
            const cantidadesTable = document.getElementById('cantidadesTable').querySelector('tbody');
            data.cantidades.forEach(cant => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${cant.nombre_avenida}</td><td>${cant.cantidad}</td>`;
                cantidadesTable.appendChild(row);
            });

            console.log('Datos cargados exitosamente');
        } else {
            alert('Error al cargar datos: ' + data.message);
            console.error('Error en respuesta:', data);
        }
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Error cargando datos:', error);
    }
}

function volverDashboard() {
    window.location.href = '../html/index.html';
}

document.getElementById('downloadPdf').addEventListener('click', function () {
    const selectedColumns = Array.from(document.querySelectorAll('#columnSelection input:checked')).map(cb => cb.value);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración de página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reportes de Inmuebles', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Fecha de generación
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fechaActual = new Date().toLocaleDateString('es-ES');
    doc.text(`Fecha de generación: ${fechaActual}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Línea separadora
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Tabla de inmuebles
    const inmueblesTable = document.getElementById('inmueblesTable');
    const inmueblesHeaders = [];
    const inmueblesBody = [];

    // Definir las claves de las columnas en el orden de los headers
    const columnKeys = ['nombre_vivienda', 'nombre_propietario', 'apellido', 'correo', 'calle'];

    // Filtrar headers
    const headerCells = inmueblesTable.querySelectorAll('thead th');
    headerCells.forEach((th, index) => {
        if (selectedColumns.includes(columnKeys[index])) {
            inmueblesHeaders.push(th.textContent);
        }
    });

    // Filtrar body
    const bodyRows = inmueblesTable.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = [];
        cells.forEach((cell, index) => {
            if (selectedColumns.includes(columnKeys[index])) {
                rowData.push(cell.textContent);
            }
        });
        inmueblesBody.push(rowData);
    });

    // Subtítulo para tabla de inmuebles
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Inmuebles Registrados', margin, yPos);
    yPos += 10;

    doc.autoTable({
        head: [inmueblesHeaders],
        body: inmueblesBody,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Tabla de cantidades
    const cantidadesTable = document.getElementById('cantidadesTable');
    const cantidadesHeaders = ['Calle', 'Cantidad'];
    const cantidadesBody = [];
    const cantRows = cantidadesTable.querySelectorAll('tbody tr');
    cantRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cantidadesBody.push([cells[0].textContent, cells[1].textContent]);
    });

    // Subtítulo para tabla de cantidades
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cantidades por Calle', margin, yPos);
    yPos += 10;

    doc.autoTable({
        head: [cantidadesHeaders],
        body: cantidadesBody,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Documento generado automáticamente por el Sistema de Gestión de Arcorui',
        pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save('reportes_inmuebles.pdf');
});
