<?php
// Configuración estricta para PDF
ini_set('display_errors', 0);
error_reporting(0);

// Limpiar completamente cualquier output
if (ob_get_level()) {
    ob_end_clean();
}

// Función para limpiar output
function limpiarOutput()
{
    while (ob_get_level()) {
        ob_end_clean();
    }
}

try {
    // Incluir archivos necesarios
    require_once __DIR__ . '/arcorui_receipt_base.php';
    require_once __DIR__ . '/../../includes/database.php';

    // Obtener ID del pago
    $paymentId = $_GET['payment_id'] ?? '';
    
    if (empty($paymentId)) {
        throw new Exception("ID de pago requerido");
    }

    // Obtener datos del pago
    $stmt = $pdo->prepare("
        SELECT 
            p.pago_id,
            p.periodo_cubierto,
            p.estado,
            pr.nombre as propietario_nombre,
            pr.apellido as propietario_apellido,
            pr.nro_documento as propietario_cedula,
            pr.telefono,
            tv.nombre_tipo as tipo_vivienda,
            be.nro_referencia,
            be.fecha_pago as fecha_pago_real,
            be.tipo_documento,
            be.nro_documento,
            b.nombre_banco,
            pd.monto_Bs,
            pd.monto_usd,
            pd.Tasa
        FROM pagos p
        INNER JOIN propietarios pr ON p.propietario_id = pr.propietario_id
        INNER JOIN inmueble i ON p.inmueble_id = i.inmueble_id
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_vivienda_id
        LEFT JOIN banco_emisor be ON p.banco_emisor_id = be.banco_emisor_id
        LEFT JOIN bancos b ON be.banco_id = b.banco_id
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE p.pago_id = ?
        LIMIT 1
    ");
    
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$payment) {
        throw new Exception("Pago no encontrado");
    }

    // Limpiar output antes de crear PDF
    limpiarOutput();

    // Crear PDF
    $pdf = new ArcoruiReceiptPDF('P', 'mm', 'A4');
    $pdf->AddPage();

    // Información del pago
    $fechaPago = date('d/m/Y', strtotime($payment['fecha_pago_real']));
    $horaPago = date('H:i:s', strtotime($payment['fecha_pago_real']));
    
    // Determinar concepto basado en el período cubierto
    $concepto = 'Pago de Mensualidades';
    $descripcion = 'Mensualidades correspondientes a: ';
    
    if ($payment['periodo_cubierto']) {
        $mes = date('F', strtotime($payment['periodo_cubierto']));
        $meses = [
            'January' => 'Enero',
            'February' => 'Febrero', 
            'March' => 'Marzo',
            'April' => 'Abril',
            'May' => 'Mayo',
            'June' => 'Junio',
            'July' => 'Julio',
            'August' => 'Agosto',
            'September' => 'Septiembre',
            'October' => 'Octubre',
            'November' => 'Noviembre',
            'December' => 'Diciembre'
        ];
        $descripcion .= $meses[$mes] ?? $mes;
    }

    $paymentInfo = [
        'Fecha de Pago:' => $fechaPago,
        'Hora:' => $horaPago,
        'Tipo de Pago:' => $concepto,
        'Concepto:' => $descripcion
    ];
    
    $pdf->CreateInfoSection('INFORMACIÓN DEL PAGO', $paymentInfo);

    // Información de la propiedad
    $propietarioCompleto = $payment['propietario_nombre'] . ' ' . $payment['propietario_apellido'];
    $cedulaCompleta = 'V-' . $payment['propietario_cedula'];
    $direccionCompleta = 'Caracas, ' . $payment['tipo_vivienda'];
    
    $propertyInfo = [
        'Propietario:' => $propietarioCompleto,
        'Cédula:' => $cedulaCompleta,
        'Tipo:' => $payment['tipo_vivienda'],
        'Dirección:' => $direccionCompleta
    ];
    
    $pdf->CreateInfoSection('INFORMACIÓN DE LA PROPIEDAD', $propertyInfo);

    // Tabla de detalles del pago
    $tableHeaders = ['CONCEPTO', 'DESCRIPCIÓN', 'MÉTODO', 'BANCO', 'REFERENCIA', 'MONTO'];
    $tableData = [
        $concepto,
        $descripcion,
        'Pago Móvil', // Método por defecto
        $payment['nombre_banco'] ?: 'N/A',
        $payment['nro_referencia'] ?: 'N/A',
        'Bs ' . number_format($payment['monto_Bs'], 2, ',', '.')
    ];
    
    $pdf->CreatePaymentTable($tableHeaders, $tableData);

    // Total pagado
    $totalPagado = 'Bs ' . number_format($payment['monto_Bs'], 2, ',', '.');
    $pdf->CreateTotalSection($totalPagado);

    // Limpiar una vez más antes de output
    limpiarOutput();

    // Configurar headers para PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="Recibo_Pago_' . $paymentId . '_' . date('Ymd_His') . '.pdf"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    // Generar PDF
    $pdf->Output('I', 'Recibo_Pago_' . $paymentId . '.pdf', true);
    exit;

} catch (Exception $e) {
    // Limpiar en caso de error
    limpiarOutput();

    // Headers para error
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(500);

    echo '<!DOCTYPE html>
    <html>
    <head>
        <title>Error PDF</title>
        <meta charset="utf-8">
    </head>
    <body>
        <h2>Error al generar PDF</h2>
        <p><strong>Error:</strong> ' . htmlspecialchars($e->getMessage()) . '</p>
        <p><strong>Archivo:</strong> ' . htmlspecialchars($e->getFile()) . '</p>
        <p><strong>Línea:</strong> ' . $e->getLine() . '</p>
        <br>
        <button onclick="window.close()">Cerrar</button>
        <button onclick="window.history.back()">Volver</button>
    </body>
    </html>';

    // Log del error
    error_log("Error PDF Recibo: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    exit;
}
?>
