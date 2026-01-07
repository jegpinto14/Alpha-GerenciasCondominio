<?php
session_start();
header('Content-Type: application/json');
require_once '../../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Verificar que sea super admin
    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['tipo'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
        exit;
    }
    
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $houseId = $input['house_id'] ?? '';
    $year = $input['year'] ?? date('Y');
    
    // Obtener información del apartamento
    $houseInfo = null;
    if ($houseId) {
        $stmt = $pdo->prepare("
            SELECT 
                a.apartamento as numero,
                e.nombre_edificio,
                p.nombre as nombre_propietario,
                p.apellido as apellido_propietario,
                u.username
            FROM inmueble i
            JOIN apartamentos a ON i.entidad_id = a.apartamento_id
            JOIN edificios e ON a.edificio_id = e.edificio_id
            JOIN propietarios p ON i.propietario_id = p.propietario_id
            LEFT JOIN usuarios u ON p.user_id = u.user_id
            WHERE i.inmueble_id = ? AND i.tipo_entidad = 'apartamento'
        ");
        $stmt->execute([$houseId]);
        $houseInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Obtener pagos para el año especificado
    $whereClause = "WHERE YEAR(per.fecha_periodo) = ? AND pd.estado = 'Confirmado'";
    $params = [$year];
    
    if ($houseId) {
        $whereClause .= " AND p.inmueble_id = ?";
        $params[] = $houseId;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            per.fecha_periodo,
            pd.monto_Bs,
            pd.monto_usd,
            pd.fecha as fecha_pago,
            pd.estado,
            a.apartamento as casa_numero,
            e.nombre_edificio,
            p.nombre as nombre_propietario,
            p.apellido as apellido_propietario
        FROM pago_detalles pd
        JOIN pagos p ON pd.pago_id = p.pago_id
        JOIN periodos per ON p.periodo_id = per.periodo_id
        JOIN inmueble i ON p.inmueble_id = i.inmueble_id
        JOIN apartamentos a ON i.entidad_id = a.apartamento_id
        JOIN edificios e ON a.edificio_id = e.edificio_id
        JOIN propietarios p ON i.propietario_id = p.propietario_id
        $whereClause
        ORDER BY per.fecha_periodo ASC
    ");
    $stmt->execute($params);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar pagos
    $paid_months = [];
    $total_bs = 0;
    $total_usd = 0;
    
    foreach ($pagos as $pago) {
        $mes_num = (int)date('n', strtotime($pago['fecha_periodo']));
        
        $paid_months[$mes_num] = [
            'mes' => $mes_num,
            'año' => $year,
            'monto_bs' => $pago['monto_Bs'],
            'monto_dolares' => $pago['monto_usd'],
            'fecha_pago' => $pago['fecha_pago'],
            'estado' => 'Pagado'
        ];
        
        $total_bs += $pago['monto_Bs'];
        $total_usd += $pago['monto_usd'];
    }
    
    // Generar todos los meses del año
    $all_months = [];
    $month_names = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    for ($i = 1; $i <= 12; $i++) {
        $is_paid = isset($paid_months[$i]);
        $paid_data = $is_paid ? $paid_months[$i] : null;
        
        $all_months[] = [
            'mes' => $i,
            'año' => $year,
            'mes_nombre' => $month_names[$i],
            'estado' => $is_paid ? 'Pagado' : 'No Pagado',
            'monto_bs' => $is_paid ? $paid_data['monto_bs'] : 0,
            'monto_dolares' => $is_paid ? $paid_data['monto_dolares'] : 0,
            'fecha_pago' => $is_paid ? $paid_data['fecha_pago'] : null
        ];
    }
    
    // Generar título del reporte
    $title = $houseInfo ? 
        "Reporte {$houseInfo['nombre_edificio']} - Apto {$houseInfo['numero']} ($year)" :
        "Reporte General - Todos los Apartamentos ($year)";
    
    echo json_encode([
        'success' => true,
        'title' => $title,
        'totalBs' => $total_bs,
        'totalUsd' => $total_usd,
        'paidMonths' => count($paid_months),
        'months' => $all_months
    ]);
    
} catch (Exception $e) {
    error_log("Error generando reporte: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
}
?>
