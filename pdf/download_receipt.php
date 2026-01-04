<?php
// Configuración para PDF - Suprimir warnings deprecated de PHP 8.1+
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
ini_set('display_errors', 0);
error_log("=== INICIO download_receipt.php ===");

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
    // Verificar y cargar archivos necesarios
    $tcpdfPath = __DIR__ . '/../vendor/tcpdf/tcpdf.php';
    $dbPath = __DIR__ . '/../includes/database.php';
    
    if (!file_exists($tcpdfPath)) {
        throw new Exception("TCPDF no encontrado en: " . $tcpdfPath);
    }
    
    if (!file_exists($dbPath)) {
        throw new Exception("Database.php no encontrado en: " . $dbPath);
    }
    
    require_once $tcpdfPath;
    require_once $dbPath;
    
    // Verificar conexión a base de datos
    if (!isset($pdo)) {
        throw new Exception("Conexión a base de datos no disponible");
    }
    
    // Obtener ID del pago
    $paymentId = $_GET['payment_id'] ?? '';
    error_log("Payment ID recibido: " . $paymentId);
    
    if (empty($paymentId)) {
        error_log("ERROR: Payment ID vacío");
        throw new Exception("ID de pago requerido");
    }

    error_log("Ejecutando consulta SQL para payment_id: " . $paymentId);
    
    // Obtener datos del pago
    $stmt = $pdo->prepare("
        SELECT 
            pag.pago_id,
            pr.fecha_periodo as periodo_cubierto,
            pag.estado,
            prop.nombre as propietario_nombre,
            prop.apellido as propietario_apellido,
            prop.nro_documento as propietario_cedula,
            prop.telefono,
            tv.nombre_tipo as tipo_vivienda,
            be.nro_referencia,
            be.fecha_pago as fecha_pago_real,
            be.tipo_documento,
            be.nro_documento,
            b.nombre_banco,
            pd.monto_Bs,
            pd.monto_usd,
            t.tasa as Tasa
        FROM pagos pag
        INNER JOIN periodos pr ON pag.periodo_id = pr.periodo_id
        INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
        INNER JOIN inmueble i ON pag.inmueble_id = i.inmueble_id
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        LEFT JOIN pago_detalles pd ON pag.pago_id = pd.pago_id
        LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
        LEFT JOIN bancos b ON be.banco_id = b.banco_id
        LEFT JOIN tasas t ON pd.tasa_id = t.tasa_id
        WHERE pag.pago_id = ?
        LIMIT 1
    ");
    
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Resultado de la consulta: " . ($payment ? "Encontrado" : "No encontrado"));
    if ($payment) {
        error_log("Datos del pago: " . json_encode($payment));
    }
    
    if (!$payment) {
        error_log("ERROR: Pago no encontrado para ID: " . $paymentId);
        throw new Exception("Pago no encontrado");
    }
    
    error_log("Iniciando generación de PDF...");

    // Limpiar output antes de crear PDF
    limpiarOutput();

    // Crear PDF con TCPDF
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    
    // Configurar documento
    $pdf->SetCreator('ARCORUI');
    $pdf->SetAuthor('Sistema ARCORUI');
    $pdf->SetTitle('Comprobante de Pago');
    $pdf->SetSubject('Recibo de Pago Mensual');
    
    // Quitar header y footer por defecto
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    
    // Configurar márgenes
    $pdf->SetMargins(15, 15, 15);
    $pdf->SetAutoPageBreak(TRUE, 15);
    
    // Configurar fuente por defecto (helvetica es equivalente a Arial y viene incluida)
    $pdf->SetFont('helvetica', '', 10);
    
    // Agregar página
    $pdf->AddPage();
    
    // Definir colores azules
    $azulOscuro = [25, 55, 109];      // #19376D
    $azulMedio = [25, 55, 109];       // #2162FF  
    $azulClaro = [227, 242, 253];     // #E3F2FD
    
    // ENCABEZADO CON LOGO Y COLORES
    $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
    $pdf->Rect(0, 0, 210, 45, 'F');
    
    // Logo
    $logoPath = __DIR__ . '/../assets/images/logo_2.jpg';
    if (file_exists($logoPath)) {
        $pdf->Image($logoPath, 75, 7, 60, 24, 'JPG');
    } else {
        // Fallback si no hay logo
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 18);
        $pdf->SetY(8);
        $pdf->Cell(0, 8, 'ARCORUI', 0, 1, 'C', 0, '', 0);
        $pdf->SetFont('helvetica', '', 9);
        $pdf->Cell(0, 4, 'Sistema de Gestion de Pagos', 0, 1, 'C', 0, '', 0);
    }
    
    // Título del comprobante
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->SetY(32);
    $pdf->Cell(0, 8, 'Comprobante de Pago', 0, 1, 'C', 0, '', 0);
    
    $pdf->SetY(55);
    
    // Información del pago
    $fechaPago = $payment['fecha_pago_real'] ? date('d/m/Y', strtotime($payment['fecha_pago_real'])) : 'N/A';
    $horaPago = $payment['fecha_pago_real'] ? date('H:i:s', strtotime($payment['fecha_pago_real'])) : 'N/A';
    
    // Determinar mes
    $mesNombre = '';
    if ($payment['periodo_cubierto']) {
        $mes = date('F', strtotime($payment['periodo_cubierto']));
        $meses = [
            'January' => 'Enero', 'February' => 'Febrero', 'March' => 'Marzo',
            'April' => 'Abril', 'May' => 'Mayo', 'June' => 'Junio',
            'July' => 'Julio', 'August' => 'Agosto', 'September' => 'Septiembre',
            'October' => 'Octubre', 'November' => 'Noviembre', 'December' => 'Diciembre'
        ];
        $mesNombre = $meses[$mes] ?? $mes;
    }
    
    // SECCIÓN: INFORMACIÓN DEL PAGO
    $pdf->SetFillColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell(0, 8, 'INFORMACION DEL PAGO', 1, 1, 'C', 1, '', 0);
    
    $pdf->SetFillColor($azulClaro[0], $azulClaro[1], $azulClaro[2]);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Fecha de Pago:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $fechaPago, 1, 1, 'L', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Hora:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $horaPago, 1, 1, 'L', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Tipo de Pago:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, 'Pago de Mensualidades', 1, 1, 'L', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Mes:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $mesNombre, 1, 1, 'L', 0, '', 0);
    
    $pdf->Ln(5);
    
    // SECCIÓN: INFORMACIÓN DE LA PROPIEDAD
    $pdf->SetFillColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell(0, 8, 'INFORMACION DE LA PROPIEDAD', 1, 1, 'C', 1, '', 0);
    
    $pdf->SetFillColor($azulClaro[0], $azulClaro[1], $azulClaro[2]);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    
    $propietarioCompleto = $payment['propietario_nombre'] . ' ' . $payment['propietario_apellido'];
    $cedulaCompleta = 'V-' . $payment['propietario_cedula'];
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Propietario:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $propietarioCompleto, 1, 1, 'L', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Cedula:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $cedulaCompleta, 1, 1, 'L', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Tipo:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $payment['tipo_vivienda'], 1, 1, 'L', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Direccion:', 1, 0, 'L', 1, '', 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, 'Caracas, ' . $payment['tipo_vivienda'], 1, 1, 'L', 0, '', 0);
    
    $pdf->Ln(5);
    
    // TABLA DE DETALLES DEL PAGO
    $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 9);
    
    $pdf->Cell(40, 8, 'CONCEPTO', 1, 0, 'C', 1, '', 0);
    $pdf->Cell(25, 8, 'METODO', 1, 0, 'C', 1, '', 0);
    $pdf->Cell(70, 8, 'BANCO', 1, 0, 'C', 1, '', 0);
    $pdf->Cell(25, 8, 'REFERENCIA', 1, 0, 'C', 1, '', 0);
    $pdf->Cell(25, 8, 'MONTO', 1, 1, 'C', 1, '', 0);
    
    $pdf->SetFillColor(255, 255, 255);
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('helvetica', '', 8);
    
    $pdf->Cell(40, 8, 'Pago de Mensualidades', 1, 0, 'L', 0, '', 0);
    $pdf->Cell(25, 8, 'Pago Movil', 1, 0, 'C', 0, '', 0);
    $pdf->Cell(70, 8, $payment['nombre_banco'] ?: 'N/A', 1, 0, 'C', 0, '', 0);
    $pdf->Cell(25, 8, $payment['nro_referencia'] ?: 'N/A', 1, 0, 'C', 0, '', 0);
    $pdf->SetFont('helvetica', 'B', 8);
    $montoBs = isset($payment['monto_Bs']) && is_numeric($payment['monto_Bs']) ? (float)$payment['monto_Bs'] : 0;
    $pdf->Cell(25, 8, 'Bs ' . number_format($montoBs, 2, ',', '.'), 1, 1, 'R', 0, '', 0);
    
    $pdf->Ln(5);
    
    // TOTAL PAGADO
    $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 13);
    $totalPagado = 'Bs ' . number_format($montoBs, 2, ',', '.');
    $pdf->Cell(0, 10, 'TOTAL PAGADO: ' . $totalPagado . ' (Bolivares)', 1, 1, 'C', 1, '', 0);
    
    $pdf->Ln(8);
    
    // PIE DE PÁGINA
    $pdf->SetDrawColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
    $pdf->SetLineWidth(0.5);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->SetLineWidth(0.2);
    $pdf->SetDrawColor(0, 0, 0);
    $pdf->Ln(4);
    
    $pdf->SetTextColor(66, 66, 66);
    $pdf->SetFont('helvetica', 'I', 9);
    $pdf->Cell(0, 5, 'Este documento es valido como comprobante de pago oficial.', 0, 1, 'C', 0, '', 0);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->SetTextColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
    $pdf->Cell(0, 5, 'ARCORUI - Sistema de Gestion de Pagos', 0, 1, 'C', 0, '', 0);
    
    $pdf->SetFont('helvetica', '', 8);
    $pdf->SetTextColor(66, 66, 66);
    $pdf->Cell(0, 4, 'Comprobante generado el: ' . date('d/m/Y H:i:s'), 0, 1, 'C', 0, '', 0);

    // Limpiar completamente el buffer de salida antes de enviar el PDF
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Limpiar cualquier output previo
    if (headers_sent($file, $line)) {
        error_log("⚠️ Headers ya enviados en {$file}:{$line}");
        throw new Exception("No se puede generar PDF - Headers ya enviados en {$file}:{$line}");
    }

    // Generar PDF con nombre de archivo
    $filename = 'Recibo_Pago_' . $paymentId . '_' . date('Ymd_His') . '.pdf';
    
    error_log("Generando PDF con nombre: " . $filename);
    
    // Configurar headers manualmente antes de Output
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');
    
    // Output del PDF (modo 'I' para inline, sin headers automáticos)
    echo $pdf->Output($filename, 'S'); // 'S' retorna el string del PDF
    
    error_log("=== FIN download_receipt.php (exitoso) ===");
    exit;

} catch (Exception $e) {
    // Limpiar en caso de error
    limpiarOutput();

    // Headers para error
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(500);

    // Log del error
    error_log("❌ Error PDF Recibo: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    error_log("Stack trace: " . $e->getTraceAsString());

    echo '<!DOCTYPE html>
    <html>
    <head>
        <title>Error PDF</title>
        <meta charset="utf-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
            }
            .error-container {
                background: white;
                border-left: 4px solid #e74c3c;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h2 {
                color: #e74c3c;
                margin-top: 0;
            }
            .error-detail {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 3px;
                margin: 10px 0;
                font-family: monospace;
                font-size: 14px;
            }
            .btn-group {
                margin-top: 20px;
            }
            button {
                padding: 10px 20px;
                margin-right: 10px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            .btn-primary {
                background: #3498db;
                color: white;
            }
            .btn-secondary {
                background: #95a5a6;
                color: white;
            }
            .info-box {
                background: #e8f4f8;
                border-left: 4px solid #3498db;
                padding: 15px;
                margin-top: 20px;
                border-radius: 3px;
            }
            .info-box h3 {
                margin-top: 0;
                color: #3498db;
            }
            .info-box ul {
                margin: 10px 0;
                padding-left: 20px;
            }
        </style>
    </head>
    <body>
        <div class="error-container">
            <h2>❌ Error al generar PDF</h2>
            
            <p><strong>Mensaje de Error:</strong></p>
            <div class="error-detail">' . htmlspecialchars($e->getMessage()) . '</div>
            
            <p><strong>Ubicación:</strong></p>
            <div class="error-detail">
                Archivo: ' . htmlspecialchars($e->getFile()) . '<br>
                Línea: ' . $e->getLine() . '
            </div>
            
            <div class="info-box">
                <h3>💡 Posibles Soluciones:</h3>
                <ul>
                    <li>Verifica que el ID del pago exista en la base de datos</li>
                    <li>Asegúrate de que TCPDF esté instalado en: <code>vendor/tcpdf/</code></li>
                    <li>Verifica la conexión a la base de datos</li>
                    <li>Revisa los logs de error de PHP para más detalles</li>
                    <li>Verifica que el pago tenga todos los datos requeridos (banco, referencia, etc.)</li>
                </ul>
            </div>
            
            <div class="btn-group">
                <button class="btn-primary" onclick="window.history.back()">← Volver</button>
                <button class="btn-secondary" onclick="window.close()">Cerrar Ventana</button>
            </div>
        </div>
    </body>
    </html>';

    exit;
}
?>
