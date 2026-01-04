<?php
// Configuración estricta para PDF
ini_set('display_errors', 0);
error_reporting(0);

// Limpiar completamente cualquier output
if (ob_get_level()) {
    ob_end_clean();
}

try {
    // Cargar FPDF
    require_once dirname(__DIR__) . '/vendor/fpdf.php';
    
    // Cargar base de datos
    require_once dirname(__DIR__) . '/includes/database.php';
    
    // Obtener ID del pago
    $paymentId = $_GET['payment_id'] ?? '';
    
    if (empty($paymentId)) {
        throw new Exception("ID de pago requerido");
    }

    // Obtener datos básicos del pago
    $stmt = $pdo->prepare("
        SELECT 
            p.pago_id,
            p.periodo_cubierto,
            p.estado,
            pr.nombre as propietario_nombre,
            pr.apellido as propietario_apellido,
            pr.nro_documento as propietario_cedula,
            tv.nombre_tipo as tipo_vivienda,
            be.nro_referencia,
            be.fecha_pago as fecha_pago_real,
            be.tipo_documento,
            be.nro_documento,
            b.nombre_banco,
            pd.monto_Bs
        FROM pagos p
        INNER JOIN propietarios pr ON p.propietario_id = pr.propietario_id
        INNER JOIN inmueble i ON p.inmueble_id = i.inmueble_id
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
        LEFT JOIN bancos b ON be.banco_id = b.banco_id
        WHERE p.pago_id = ?
        LIMIT 1
    ");
    
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$payment) {
        throw new Exception("Pago no encontrado");
    }

    // Limpiar output antes de crear PDF
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Crear PDF simple
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    
    // Título
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->Cell(0, 10, 'ARCORUI', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(0, 5, 'Sistema de Gestion de Pagos', 0, 1, 'C');
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->Cell(0, 6, 'Comprobante de Pago', 0, 1, 'C');
    
    // Línea separadora
    $pdf->Line(15, $pdf->GetY() + 2, 195, $pdf->GetY() + 2);
    $pdf->Ln(8);
    
    // Información del pago
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, 6, 'INFORMACION DEL PAGO', 1, 1, 'C', true);
    
    $pdf->SetFont('Arial', '', 9);
    $fechaPago = date('d/m/Y', strtotime($payment['fecha_pago_real']));
    $horaPago = date('H:i:s', strtotime($payment['fecha_pago_real']));
    
    $pdf->Cell(40, 5, 'Fecha de Pago:', 1, 0);
    $pdf->Cell(0, 5, $fechaPago, 1, 1);
    $pdf->Cell(40, 5, 'Hora:', 1, 0);
    $pdf->Cell(0, 5, $horaPago, 1, 1);
    $pdf->Cell(40, 5, 'Tipo de Pago:', 1, 0);
    $pdf->Cell(0, 5, 'Pago de Mensualidades', 1, 1);
    $pdf->Cell(40, 5, 'Concepto:', 1, 0);
    $pdf->Cell(0, 5, 'Mensualidades correspondientes', 1, 1);
    
    $pdf->Ln(3);
    
    // Información de la propiedad
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, 6, 'INFORMACION DE LA PROPIEDAD', 1, 1, 'C', true);
    
    $pdf->SetFont('Arial', '', 9);
    $propietarioCompleto = $payment['propietario_nombre'] . ' ' . $payment['propietario_apellido'];
    $cedulaCompleta = 'V-' . $payment['propietario_cedula'];
    
    $pdf->Cell(40, 5, 'Propietario:', 1, 0);
    $pdf->Cell(0, 5, $propietarioCompleto, 1, 1);
    $pdf->Cell(40, 5, 'Cedula:', 1, 0);
    $pdf->Cell(0, 5, $cedulaCompleta, 1, 1);
    $pdf->Cell(40, 5, 'Tipo:', 1, 0);
    $pdf->Cell(0, 5, $payment['tipo_vivienda'], 1, 1);
    $pdf->Cell(40, 5, 'Direccion:', 1, 0);
    $pdf->Cell(0, 5, 'Caracas, ' . $payment['tipo_vivienda'], 1, 1);
    
    $pdf->Ln(3);
    
    // Tabla de detalles
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->Cell(30, 6, 'CONCEPTO', 1, 0, 'C', true);
    $pdf->Cell(60, 6, 'DESCRIPCION', 1, 0, 'C', true);
    $pdf->Cell(25, 6, 'METODO', 1, 0, 'C', true);
    $pdf->Cell(25, 6, 'BANCO', 1, 0, 'C', true);
    $pdf->Cell(25, 6, 'REFERENCIA', 1, 0, 'C', true);
    $pdf->Cell(20, 6, 'MONTO', 1, 1, 'C', true);
    
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(30, 6, 'Pago de Mensualidades', 1, 0);
    $pdf->Cell(60, 6, 'Mensualidades correspondientes', 1, 0);
    $pdf->Cell(25, 6, 'Pago Movil', 1, 0);
    $pdf->Cell(25, 6, $payment['nombre_banco'] ?: 'N/A', 1, 0);
    $pdf->Cell(25, 6, $payment['nro_referencia'] ?: 'N/A', 1, 0);
    $pdf->Cell(20, 6, 'Bs ' . number_format($payment['monto_Bs'], 2, ',', '.'), 1, 1);
    
    $pdf->Ln(3);
    
    // Total
    $pdf->SetFont('Arial', 'B', 10);
    $totalPagado = 'Bs ' . number_format($payment['monto_Bs'], 2, ',', '.');
    $pdf->Cell(0, 6, 'TOTAL PAGADO: ' . $totalPagado . ' (Bolivares)', 1, 1, 'C', true);
    
    $pdf->Ln(5);
    
    // Footer
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(3);
    
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(0, 4, 'Este documento es valido como comprobante de pago oficial.', 0, 1, 'C');
    
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->Cell(0, 4, 'ARCORUI - Sistema de Gestion de Pagos', 0, 1, 'C');
    
    $pdf->SetFont('Arial', '', 8);
    $pdf->Cell(0, 4, 'Comprobante generado el: ' . date('d/m/Y H:i:s'), 0, 1, 'C');

    // Configurar headers para PDF con descarga forzada
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="Recibo_Pago_' . $paymentId . '_' . date('Ymd_His') . '.pdf"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    // Generar PDF
    $pdf->Output('D', 'Recibo_Pago_' . $paymentId . '.pdf', true);
    exit;

} catch (Exception $e) {
    // Limpiar en caso de error
    while (ob_get_level()) {
        ob_end_clean();
    }

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
    error_log("Error PDF Recibo Simple: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    exit;
}
?>
