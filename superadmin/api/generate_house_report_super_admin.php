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
    
    // Obtener información de la casa
    $houseInfo = null;
    if ($houseId) {
        $stmt = $pdo->prepare("
            SELECT 
                v.numero,
                v.tipo,
                v.nombre_propietario,
                v.apellido_propietario,
                u.username
            FROM viviendas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.id = ?
        ");
        $stmt->execute([$houseId]);
        $houseInfo = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Obtener pagos para el año especificado
    $whereClause = "WHERE YEAR(p.fecha_pago) = ? AND p.estado = 'aprobado'";
    $params = [$year];
    
    if ($houseId) {
        $whereClause .= " AND p.vivienda_id = ?";
        $params[] = $houseId;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            p.meses,
            p.monto_bs,
            p.monto_dolares,
            p.moneda_pago,
            p.metodo_pago,
            p.tasa_bs,
            p.fecha_pago,
            p.estado,
            v.numero as casa_numero,
            v.nombre_propietario,
            v.apellido_propietario
        FROM pagos_mensualidades p
        JOIN viviendas v ON p.vivienda_id = v.id
        $whereClause
        ORDER BY p.fecha_pago ASC
    ");
    $stmt->execute($params);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar pagos para extraer meses individuales
    $paid_months = [];
    $meses_unicos = [];
    $total_bs = 0;
    $total_usd = 0;
    
    foreach ($pagos as $pago) {
        $meses = json_decode($pago['meses'], true);
        if (is_array($meses)) {
            $cantidad_meses = count($meses);
            $monto_por_mes_bs = $pago['monto_bs'] / $cantidad_meses;
            $monto_por_mes_usd = $pago['monto_dolares'] / $cantidad_meses;
            
            foreach ($meses as $mes) {
                $mes_key = $mes['id'] . '_' . $mes['name'];
                
                if (!isset($meses_unicos[$mes_key])) {
                    $meses_unicos[$mes_key] = true;
                    
                    $paid_months[] = [
                        'mes' => $mes['id'],
                        'año' => $year,
                        'mes_nombre' => $mes['name'],
                        'monto_bs' => $monto_por_mes_bs,
                        'monto_dolares' => $monto_por_mes_usd,
                        'moneda_pago' => $pago['moneda_pago'],
                        'metodo_pago' => $pago['metodo_pago'],
                        'tasa_bs' => $pago['tasa_bs'],
                        'fecha_pago' => $pago['fecha_pago'],
                        'estado' => 'Pagado'
                    ];
                    
                    if ($pago['moneda_pago'] === 'bs') {
                        $total_bs += $monto_por_mes_bs;
                    } else {
                        $total_usd += $monto_por_mes_usd;
                    }
                }
            }
        }
    }
    
    // Generar todos los meses del año
    $all_months = [];
    $month_names = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    for ($i = 1; $i <= 12; $i++) {
        $is_paid = false;
        $paid_data = null;
        
        foreach ($paid_months as $paid_month) {
            if ($paid_month['mes'] == $i) {
                $is_paid = true;
                $paid_data = $paid_month;
                break;
            }
        }
        
        $all_months[] = [
            'mes' => $i,
            'año' => $year,
            'mes_nombre' => $month_names[$i],
            'estado' => $is_paid ? 'Pagado' : 'No Pagado',
            'monto_bs' => $is_paid ? $paid_data['monto_bs'] : 0,
            'monto_dolares' => $is_paid ? $paid_data['monto_dolares'] : 0,
            'moneda_pago' => $is_paid ? $paid_data['moneda_pago'] : null,
            'metodo_pago' => $is_paid ? $paid_data['metodo_pago'] : null,
            'tasa_bs' => $is_paid ? $paid_data['tasa_bs'] : 0,
            'fecha_pago' => $is_paid ? $paid_data['fecha_pago'] : null
        ];
    }
    
    // Generar título del reporte
    $title = $houseInfo ? 
        "Reporte Casa {$houseInfo['numero']} - {$houseInfo['nombre_propietario']} {$houseInfo['apellido_propietario']} ($year)" :
        "Reporte General - Todas las Casas ($year)";
    
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
