<?php
ob_start();
session_start();

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    header('HTTP/1.1 401 Unauthorized');
    exit('No autorizado');
}

try {
    // Cargar FPDF
    require_once dirname(__DIR__) . '/vendor/fpdf.php';
    
    // Cargar base de datos
    require_once dirname(__DIR__) . '/includes/database.php';
    
    // Obtener parámetros
    $year = $_GET['year'] ?? date('Y');
    
    // Obtener información del propietario
    $user_id = $_SESSION['user_id'];
    $stmt = $pdo->prepare("
        SELECT 
            pr.propietario_id,
            pr.nombre,
            pr.apellido,
            i.inmueble_id
        FROM propietarios pr
        INNER JOIN inmueble i ON pr.propietario_id = i.propietario_id
        WHERE pr.user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $propietario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$propietario) {
        throw new Exception("No se encontró información del propietario");
    }
    
    $propietario_id = $propietario['propietario_id'];
    
    // Obtener pagos para el año especificado
    $stmt = $pdo->prepare("
        SELECT 
            p.pago_id,
            p.periodo_cubierto,
            p.estado,
            pd.monto_Bs,
            pd.monto_usd,
            pd.Tasa,
            be.fecha_pago
        FROM pagos p
        INNER JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
        WHERE p.propietario_id = ? 
        AND p.estado = 'confirmado'
        AND YEAR(be.fecha_pago) = ?
        ORDER BY be.fecha_pago ASC
    ");
    $stmt->execute([$propietario_id, $year]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar pagos para extraer meses individuales
    $paid_months = [];
    $meses_unicos = [];
    $total_bs = 0;
    $total_usd = 0;
    
    foreach ($pagos as $pago) {
        if ($pago['periodo_cubierto']) {
            $mes_numero = date('n', strtotime($pago['periodo_cubierto']));
            $mes_key = $mes_numero . '_' . $year;
            
            if (!isset($meses_unicos[$mes_key])) {
                $meses_unicos[$mes_key] = true;
                
                $month_names = [
                    1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
                    5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
                    9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
                ];
                
                $paid_months[] = [
                    'mes' => $mes_numero,
                    'año' => $year,
                    'mes_nombre' => $month_names[$mes_numero],
                    'monto_bs' => $pago['monto_Bs'],
                    'monto_dolares' => $pago['monto_usd'],
                    'tasa_bs' => $pago['Tasa'],
                    'fecha_pago' => $pago['fecha_pago'],
                    'estado' => $pago['estado']
                ];
                
                $total_bs += $pago['monto_Bs'];
                $total_usd += $pago['monto_usd'];
            }
        }
    }
    
    // Generar todos los meses del año seleccionado
    $all_months = [];
    $month_names = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    for ($month_number = 1; $month_number <= 12; $month_number++) {
        $is_paid = false;
        $paid_data = null;
        
        foreach ($paid_months as $paid_month) {
            if ($paid_month['mes'] === $month_number && $paid_month['año'] == $year) {
                $is_paid = true;
                $paid_data = $paid_month;
                break;
            }
        }
        
        $all_months[] = [
            'mes' => $month_number,
            'año' => $year,
            'mes_nombre' => $month_names[$month_number],
            'estado' => $is_paid ? 'PAGADO' : 'NO PAGADO',
            'monto_bs' => $is_paid ? $paid_data['monto_bs'] : 0,
            'monto_dolares' => $is_paid ? $paid_data['monto_dolares'] : 0,
            'metodo_pago' => $is_paid ? 'pago_movil' : 'N/A',
            'moneda' => $is_paid ? 'Bolivares' : 'N/A',
            'tasa_bs' => $is_paid ? $paid_data['tasa_bs'] : 'N/A',
            'fecha_pago' => $is_paid ? date('d/m/Y', strtotime($paid_data['fecha_pago'])) : 'N/A'
        ];
    }
    
    // Limpiar output
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Crear PDF
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetMargins(15, 15, 15);
    
    // Logo
    $logo_path = dirname(__DIR__) . '/assets/images/logo_gerencia_condominio.png';
    if (file_exists($logo_path)) {
        // Reducir tamaño: de 80x20 a 50x12
        // Reposicionar: X=80 para que con ancho 50 esté centrado (80 + 50/2 = 105)
        $pdf->Image($logo_path, 80, 10, 50, 12); 
        $pdf->Ln(20);
    }
    
    // Información del reporte
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', '', 12);
    $pdf->Cell(0, 8, 'Propietario: ' . $propietario['nombre'] . ' ' . $propietario['apellido'], 0, 1);
    $pdf->Cell(0, 8, 'Ano: ' . $year, 0, 1);
    $pdf->Cell(0, 8, 'Fecha de generacion: ' . date('d/m/Y H:i:s'), 0, 1);
    
    $pdf->Ln(10);
    
    // Estadísticas con fondo azul petróleo
    $pdf->SetFillColor(26, 58, 74);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 12);
    
    // Calcular estadísticas
    $meses_pagados = count($paid_months);
    $meses_no_pagados = 12 - $meses_pagados;
    $pagos_parciales = 0; // Placeholder ya que no tenemos esta info discriminada aún
    
    $column_width = 180 / 4;
    $pdf->Cell($column_width, 15, 'MESES PAGADOS', 1, 0, 'C', true);
    $pdf->Cell($column_width, 15, 'PAGOS PARCIALES', 1, 0, 'C', true);
    $pdf->Cell($column_width, 15, 'MESES NO PAGADOS', 1, 0, 'C', true);
    $pdf->Cell($column_width, 15, 'TOTAL PAGADO (USD)', 1, 1, 'C', true);
    
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->Cell($column_width, 15, $meses_pagados, 1, 0, 'C', true);
    $pdf->Cell($column_width, 15, $pagos_parciales, 1, 0, 'C', true);
    $pdf->Cell($column_width, 15, $meses_no_pagados, 1, 0, 'C', true);
    $pdf->Cell($column_width, 15, '$' . number_format($total_usd, 2, ',', '.'), 1, 1, 'C', true);
    
    $pdf->Ln(15);
    
    // Tabla de meses
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 10);
    
    // Encabezados de la tabla (6 columnas según la imagen)
    $w = [30, 20, 30, 35, 35, 30]; // Total 180
    $pdf->Cell($w[0], 8, 'MES', 1, 0, 'C', true);
    $pdf->Cell($w[1], 8, 'ANO', 1, 0, 'C', true);
    $pdf->Cell($w[2], 8, 'ESTADO', 1, 0, 'C', true);
    $pdf->Cell($w[3], 8, 'METODO PAGO', 1, 0, 'C', true);
    $pdf->Cell($w[4], 8, 'MONTO (USD)', 1, 0, 'C', true);
    $pdf->Cell($w[5], 8, 'FECHA PAGO', 1, 1, 'C', true);
    
    // Datos de la tabla
    $pdf->SetFont('Arial', '', 9);
    
    foreach ($all_months as $month) {
        $pdf->SetTextColor(0, 0, 0);
        
        // Color para el mes según estado
        if ($month['estado'] === 'PAGADO') {
            $pdf->SetTextColor(0, 100, 0); // Verde oscuro
        } else {
            $pdf->SetTextColor(200, 0, 0); // Rojo
        }
        $pdf->Cell($w[0], 8, $month['mes_nombre'], 1, 0, 'C');
        
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($w[1], 8, $month['año'], 1, 0, 'C');
        
        // Estado con color
        if ($month['estado'] === 'PAGADO') {
            $pdf->SetTextColor(0, 100, 0);
        } else {
            $pdf->SetTextColor(200, 0, 0);
        }
        $pdf->Cell($w[2], 8, ucwords(strtolower($month['estado'])), 1, 0, 'C');
        
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($w[3], 8, $month['metodo_pago'], 1, 0, 'C');
        $pdf->Cell($w[4], 8, $month['monto_dolares'] > 0 ? '$' . number_format($month['monto_dolares'], 2, ',', '.') : 'N/A', 1, 0, 'C');
        $pdf->Cell($w[5], 8, $month['fecha_pago'], 1, 1, 'C');
    }
    
    $pdf->Ln(10);
    
    $pdf->Cell(0, 8, 'Reporte generado automaticamente por el Sistema Gerencia Express', 0, 1, 'C');
    
    // Limpiar output antes de enviar PDF
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Configurar headers para descarga
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="Reporte_Pagos_' . $year . '_' . date('Ymd_His') . '.pdf"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');
    
    // Generar PDF
    $pdf->Output('D', 'Reporte_Pagos_' . $year . '.pdf', true);
    exit;
    
} catch (Exception $e) {
    // Limpiar en caso de error
    while (ob_get_level()) {
        ob_end_clean();
    }
    
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
    
    error_log("Error PDF Reporte: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    exit;
}

