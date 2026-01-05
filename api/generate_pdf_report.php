<?php
// Configurar zona horaria de Venezuela al inicio
date_default_timezone_set('America/Caracas');

// Limpiar cualquier output previo
while (ob_get_level()) {
    ob_end_clean();
}

session_start();

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $year = $input['year'] ?? '';

    if (empty($year)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Año requerido']);
        exit;
    }

    // Conectar a la base de datos
    require_once '../includes/database.php';

    // Obtener información del propietario y su inmueble activo
    $user_id = $_SESSION['user_id'];
    $stmt = $pdo->prepare("
        SELECT 
            pr.propietario_id,
            pr.nombre,
            pr.apellido,
            pr.active_inmueble_id
        FROM propietarios pr
        WHERE pr.user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $propietario_data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$propietario_data) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No se encontró información del propietario']);
        exit;
    }

    $propietario_id = $propietario_data['propietario_id'];
    $propietario = $propietario_data['nombre'] . ' ' . $propietario_data['apellido'];
    $active_inmueble_id = $propietario_data['active_inmueble_id'];

    // Determinar el inmueble a usar
    $inmueble_id = null;
    if ($active_inmueble_id) {
        // Verificar que el inmueble activo pertenece al propietario
        $stmt = $pdo->prepare("SELECT inmueble_id FROM inmueble WHERE inmueble_id = ? AND propietario_id = ?");
        $stmt->execute([$active_inmueble_id, $propietario_id]);
        if ($stmt->fetch()) {
            $inmueble_id = $active_inmueble_id;
        }
    }

    // Si no hay inmueble activo o no es válido, usar el primero disponible
    if (!$inmueble_id) {
        $stmt = $pdo->prepare("SELECT inmueble_id FROM inmueble WHERE propietario_id = ? LIMIT 1");
        $stmt->execute([$propietario_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'No se encontró inmueble registrado']);
            exit;
        }
        $inmueble_id = $row['inmueble_id'];
    }

    // Obtener pagos confirmados para el año especificado agrupados por mes
    $stmt = $pdo->prepare("
        SELECT 
            YEAR(pr.fecha_periodo) as anio,
            MONTH(pr.fecha_periodo) as mes,
            MIN(pr.fecha_periodo) as periodo_cubierto,
            MAX(pag.estado) as estado,
            SUM(pd.monto_usd) as monto_usd_total,
            MAX(pd.Fecha) as fecha_ultimo_pago,
            COUNT(DISTINCT pd.metodo_id) as cantidad_metodos,
            GROUP_CONCAT(DISTINCT mp.descripcion) as metodos_pago
        FROM pagos pag
        INNER JOIN periodos pr ON pag.periodo_id = pr.periodo_id
        INNER JOIN pago_detalles pd ON pag.pago_id = pd.pago_id
        LEFT JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        WHERE pag.propietario_id = ? 
        AND pag.inmueble_id = ?
        AND pag.estado IN ('Pagado', 'Pago Parcial')
        AND pd.estado = 'Confirmado'
        AND YEAR(pr.fecha_periodo) = ?
        GROUP BY YEAR(pr.fecha_periodo), MONTH(pr.fecha_periodo)
        ORDER BY anio ASC, mes ASC
    ");
    $stmt->execute([$propietario_id, $inmueble_id, $year]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Procesar pagos para extraer meses individuales
    $month_names = [
        1 => 'Enero',
        2 => 'Febrero',
        3 => 'Marzo',
        4 => 'Abril',
        5 => 'Mayo',
        6 => 'Junio',
        7 => 'Julio',
        8 => 'Agosto',
        9 => 'Septiembre',
        10 => 'Octubre',
        11 => 'Noviembre',
        12 => 'Diciembre'
    ];

    $paid_months = [];
    foreach ($pagos as $pago) {
        $mes_numero = (int) $pago['mes'];

        // Determinar método de pago: si hay más de un método, es "Mixto"
        $metodo_pago = $pago['cantidad_metodos'] > 1 ? 'Mixto' : $pago['metodos_pago'];

        $paid_months[$mes_numero] = [
            'mes' => $mes_numero,
            'estado' => $pago['estado'],
            'monto_usd_total' => $pago['monto_usd_total'],
            'metodo_pago' => $metodo_pago,
            'fecha_ultimo_pago' => $pago['fecha_ultimo_pago']
        ];
    }

    // Generar todos los meses del año seleccionado
    $all_months = [];

    for ($month_number = 1; $month_number <= 12; $month_number++) {
        $paid_data = $paid_months[$month_number] ?? null;
        $is_paid = $paid_data !== null;

        $all_months[] = [
            'mes' => $month_number,
            'año' => $year,
            'mes_nombre' => $month_names[$month_number],
            'estado' => $is_paid ? $paid_data['estado'] : 'No Pagado',
            'monto_usd_total' => $is_paid ? $paid_data['monto_usd_total'] : 0,
            'metodo_pago' => $is_paid ? $paid_data['metodo_pago'] : null,
            'fecha_ultimo_pago' => $is_paid ? $paid_data['fecha_ultimo_pago'] : null
        ];
    }

    // Calcular total USD
    $total_usd = 0;

    foreach ($all_months as $month) {
        if ($month['estado'] === 'Pagado' || $month['estado'] === 'Pago Parcial') {
            $total_usd += $month['monto_usd_total'];
        }
    }

    // Formatear fechas de pago en formato venezolano
    foreach ($all_months as &$month) {
        if ($month['estado'] === 'Pagado' && !empty($month['fecha_ultimo_pago'])) {
            $month['fecha_pago_formatted'] = date('d/m/Y H:i', strtotime($month['fecha_ultimo_pago']));
        } else {
            $month['fecha_pago_formatted'] = null;
        }
    }
    unset($month);

    // Limpiar output completamente
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Limpiar cualquier output adicional
    ob_start();

    // Incluir FPDF personalizado
    require_once '../pdf/ArcoruiPDF.php';

    // Crear PDF
    $pdf = new ArcoruiPDF('P', 'mm', 'A4');
    $pdf->AddPage();

    // Configurar márgenes
    $pdf->SetMargins(15, 15, 15); // Izquierda, arriba, derecha

    // Encabezado blanco (sin fondo azul)
    $pdf->SetFillColor(255, 255, 255);
    $pdf->Rect(0, 0, 210, 45, 'F');

    // Dibujar logo de Gerencias De Condominio
    $pdf->drawArcoruiLogo(105, 5, 1.5);

    // Espacio después del logo
    $pdf->Ln(35);

    $pdf->Ln(15);

    // Información del reporte (respetando márgenes)
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', '', 12);
    $pdf->Cell(0, 8, utf8_decode('Propietario: ' . $propietario), 0, 1);
    $pdf->Cell(0, 8, utf8_decode('Año: ' . $year), 0, 1);
    $pdf->Cell(0, 8, utf8_decode('Fecha de generación: ' . date('d/m/Y H:i:s')), 0, 1);

    $pdf->Ln(5);

    // Estadísticas con fondo azul del sistema
    $pdf->SetFillColor(26, 58, 74);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 10);

    // Calcular estadísticas
    $meses_pagados = count($paid_months);
    $meses_no_pagados = 12 - $meses_pagados;

    // Ancho total disponible respetando márgenes (210 - 30 = 180mm)
    $ancho_total = 180;
    $ancho_columna = $ancho_total / 4; // 4 columnas

    // Calcular estadísticas
    $meses_pagados_count = 0;
    $meses_parciales_count = 0;
    $meses_no_pagados_count = 0;

    foreach ($all_months as $month) {
        if ($month['estado'] === 'Pagado') {
            $meses_pagados_count++;
        } elseif ($month['estado'] === 'Pago Parcial') {
            $meses_parciales_count++;
        } else {
            $meses_no_pagados_count++;
        }
    }

    $ancho_columna = $ancho_total / 4; // 4 columnas

    $pdf->Cell($ancho_columna, 15, utf8_decode('MESES PAGADOS'), 1, 0, 'C', true);
    $pdf->Cell($ancho_columna, 15, utf8_decode('PAGOS PARCIALES'), 1, 0, 'C', true);
    $pdf->Cell($ancho_columna, 15, utf8_decode('MESES NO PAGADOS'), 1, 0, 'C', true);
    $pdf->Cell($ancho_columna, 15, utf8_decode('TOTAL PAGADO (USD)'), 1, 1, 'C', true);

    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell($ancho_columna, 15, $meses_pagados_count, 1, 0, 'C', true);
    $pdf->Cell($ancho_columna, 15, $meses_parciales_count, 1, 0, 'C', true);
    $pdf->Cell($ancho_columna, 15, $meses_no_pagados_count, 1, 0, 'C', true);
    $pdf->Cell($ancho_columna, 15, '$' . number_format($total_usd, 2, ',', '.'), 1, 1, 'C', true);

    $pdf->Ln(10);

    // Tabla de meses (centrada y con márgenes)
    $pdf->SetTextColor(255, 255, 255); // Texto blanco para encabezados
    $pdf->SetFont('Arial', 'B', 9);

    // Calcular anchos de columnas para centrar la tabla
    $ancho_total_tabla = 180; // Ancho disponible respetando márgenes
    $altura_fila = 8;

    // Anchos proporcionales de las columnas (sin columna Tasa)
    $ancho_mes = 30;
    $ancho_ano = 20;
    $ancho_estado = 28;
    $ancho_metodo = 38;
    $ancho_monto = 30;
    $ancho_fecha = 34;

    // Encabezados de la tabla (con fondo azul del sistema y texto blanco)
    $pdf->SetFillColor(26, 58, 74); // Fondo azul para encabezados
    $pdf->Cell($ancho_mes, $altura_fila, utf8_decode('MES'), 1, 0, 'C', true);
    $pdf->Cell($ancho_ano, $altura_fila, utf8_decode('AÑO'), 1, 0, 'C', true);
    $pdf->Cell($ancho_estado, $altura_fila, utf8_decode('ESTADO'), 1, 0, 'C', true);
    $pdf->Cell($ancho_metodo, $altura_fila, utf8_decode('MÉTODO PAGO'), 1, 0, 'C', true);
    $pdf->Cell($ancho_monto, $altura_fila, utf8_decode('MONTO (USD)'), 1, 0, 'C', true);
    $pdf->Cell($ancho_fecha, $altura_fila, utf8_decode('FECHA PAGO'), 1, 1, 'C', true);

    // Datos de la tabla (usando los mismos anchos)
    $pdf->SetFont('Arial', '', 8);

    foreach ($all_months as $month) {
        // Colores para estado
        if ($month['estado'] === 'Pagado') {
            $pdf->SetTextColor(0, 150, 0); // Verde
        } elseif ($month['estado'] === 'Pago Parcial') {
            $pdf->SetTextColor(245, 158, 11); // Naranja
        } else {
            $pdf->SetTextColor(200, 0, 0); // Rojo
        }

        $pdf->Cell($ancho_mes, $altura_fila, $month_names[$month['mes']], 1, 0, 'C');
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Cell($ancho_ano, $altura_fila, $month['año'], 1, 0, 'C');

        // Estado con color
        if ($month['estado'] === 'Pagado') {
            $pdf->SetTextColor(0, 150, 0);
        } elseif ($month['estado'] === 'Pago Parcial') {
            $pdf->SetTextColor(245, 158, 11); // Naranja
        } else {
            $pdf->SetTextColor(200, 0, 0);
        }
        $pdf->Cell($ancho_estado, $altura_fila, $month['estado'], 1, 0, 'C');
        $pdf->SetTextColor(0, 0, 0);

        $pdf->Cell($ancho_metodo, $altura_fila, $month['metodo_pago'] ?: 'N/A', 1, 0, 'C');

        // Monto siempre en USD (sumatoria de pago_detalles.monto_usd)
        $monto_texto = 'N/A';
        if ($month['estado'] === 'Pagado' || $month['estado'] === 'Pago Parcial') {
            $monto_texto = '$' . number_format($month['monto_usd_total'], 2, ',', '.');
        }
        $pdf->Cell($ancho_monto, $altura_fila, $monto_texto, 1, 0, 'C');

        // Fecha Pago: solo si el estado es Pagado, mostrar la fecha del último pago
        $fecha_texto = 'N/A';
        if ($month['estado'] === 'Pagado' && $month['fecha_pago_formatted']) {
            $fecha_texto = $month['fecha_pago_formatted'];
        }
        $pdf->Cell($ancho_fecha, $altura_fila, $fecha_texto, 1, 1, 'C');
    }

    $pdf->Ln(10);

    // Pie de página
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(0, 8, utf8_decode('Reporte generado automáticamente por Gerencias De Condominio'), 0, 1, 'C');

    // Fecha y hora de generación
    $fecha_generacion = date('d/m/Y H:i:s');
    $pdf->Cell(0, 8, utf8_decode('Fecha de generación: ' . $fecha_generacion), 0, 1, 'C');

    $pdf->Ln(5);

    // Barra inferior
    $pdf->SetFillColor(26, 58, 74);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->Cell(0, 8, utf8_decode('Gerencias De Condominio - Gestión de Propiedades'), 0, 1, 'C', true);

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

} catch (Exception $e) {
    // Limpiar output en caso de error
    while (ob_get_level()) {
        ob_end_clean();
    }

    error_log("Error generando PDF: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
}

?>