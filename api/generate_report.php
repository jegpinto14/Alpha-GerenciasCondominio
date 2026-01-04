<?php
// Configurar zona horaria de Venezuela al inicio
date_default_timezone_set('America/Caracas');

session_start();
header('Content-Type: application/json');

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $year = $input['year'] ?? '';
    
    if (empty($year)) {
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
    $propietario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$propietario) {
        echo json_encode(['success' => false, 'message' => 'No se encontró información del propietario']);
        exit;
    }
    
    $propietario_id = $propietario['propietario_id'];
    $active_inmueble_id = $propietario['active_inmueble_id'];
    
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
            echo json_encode(['success' => false, 'message' => 'No se encontró inmueble registrado']);
            exit;
        }
        $inmueble_id = $row['inmueble_id'];
    }
    
    // Obtener pagos para el año especificado agrupados por mes
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
    $paid_months = [];
    $total_usd = 0;
    
    $month_names = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    foreach ($pagos as $pago) {
        $mes_numero = (int)$pago['mes'];
        
        // Determinar método de pago: si hay más de un método, es "Mixto"
        $metodo_pago = $pago['cantidad_metodos'] > 1 ? 'Mixto' : $pago['metodos_pago'];
        
        $paid_months[] = [
            'mes' => $mes_numero,
            'año' => $year,
            'mes_nombre' => $month_names[$mes_numero],
            'monto_usd_total' => $pago['monto_usd_total'],
            'metodo_pago' => $metodo_pago,
            'fecha_ultimo_pago' => $pago['fecha_ultimo_pago'],
            'estado' => $pago['estado']
        ];
    }
    
    // Generar todos los meses del año seleccionado
    $all_months = [];
    
    $month_names = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    // Generar los 12 meses del año 2025
    for ($month_number = 1; $month_number <= 12; $month_number++) {
        // Verificar si este mes fue pagado
        $is_paid = false;
        $paid_data = null;
        
        foreach ($paid_months as $paid_month) {
            if ($paid_month['mes'] == $month_number && $paid_month['año'] == $year) {
                $is_paid = true;
                $paid_data = $paid_month;
                break;
            }
        }
        
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
    
    // Respuesta
    echo json_encode([
        'success' => true,
        'year' => $year,
        'propietario' => $propietario['nombre'] . ' ' . $propietario['apellido'],
        'all_months' => $all_months,
        'paid_months' => $paid_months,
        'total_usd' => $total_usd,
        'fecha_generacion' => date('d/m/Y H:i:s')
    ]);
    
} catch (Exception $e) {
    error_log("Error generando reporte: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
}
?>