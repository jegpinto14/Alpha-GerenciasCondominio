<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener ID de vivienda del usuario
    $stmt = $pdo->prepare("SELECT id FROM viviendas WHERE usuario_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $housing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$housing) {
        echo json_encode(['success' => false, 'message' => 'No se encontró vivienda registrada']);
        exit;
    }
    
    $vivienda_id = $housing['id'];
    $current_year = date('Y');
    $current_month = date('n'); // Mes actual (1-12)
    
    // Obtener todos los meses de todos los años con su estado de pago
    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.nombre,
            m.año,
            m.monto_bs,
            m.monto_dolares,
            CASE WHEN pm.id IS NOT NULL THEN 1 ELSE 0 END as paid,
            CASE 
                WHEN m.año < ? THEN 'past'  -- Años pasados
                WHEN m.año = ? AND m.id < ? THEN 'past'  -- Meses pasados del año actual
                WHEN m.año = ? AND m.id = ? THEN 'current'  -- Mes actual
                WHEN m.año = ? AND m.id > ? THEN 'future'  -- Meses futuros del año actual
                WHEN m.año > ? THEN 'future'  -- Años futuros
                ELSE 'unknown'
            END as status
        FROM meses m
        LEFT JOIN pagos_mensualidades pm ON m.id = pm.mes_id AND pm.vivienda_id = ?
        ORDER BY m.año, m.id
    ");
    $stmt->execute([$current_year, $current_year, $current_month, $current_year, $current_month, $current_year, $current_month, $current_year, $vivienda_id]);
    $all_months = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Agrupar por años
    $years = [];
    foreach ($all_months as $month) {
        $year = $month['año'];
        if (!isset($years[$year])) {
            $years[$year] = [];
        }
        
        // Determinar el estado visual del mes
        $visual_status = 'unknown';
        if ($month['paid']) {
            $visual_status = 'paid'; // Verde - Pagado
        } else {
            if ($month['status'] === 'past') {
                $visual_status = 'unpaid'; // Rojo - Debe (pasado)
            } elseif ($month['status'] === 'current') {
                $visual_status = 'unpaid'; // Rojo - Debe (actual)
            } elseif ($month['status'] === 'future') {
                $visual_status = 'pending'; // Gris - Pendiente (futuro)
            }
        }
        
        $month['visual_status'] = $visual_status;
        $years[$year][] = $month;
    }
    
    // Obtener lista de años disponibles
    $available_years = array_keys($years);
    sort($available_years);
    
    echo json_encode([
        'success' => true, 
        'years' => $years,
        'available_years' => $available_years,
        'current_year' => $current_year,
        'current_month' => $current_month
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
