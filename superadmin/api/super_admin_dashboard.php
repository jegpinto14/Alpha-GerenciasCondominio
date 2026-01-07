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
    
    // Obtener estadísticas
    $stats = [];
    
    // Total usuarios
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios");
    $stats['totalUsers'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total casas (ahora solo apartamentos)
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM inmueble WHERE tipo_entidad = 'apartamento'");
    $stats['totalHouses'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total ingresos (pagos confirmados)
    // Usando pago_detalles que tiene la información de moneda
    $stmt = $pdo->query("
        SELECT 
            SUM(monto_Bs) as total_bs,
            SUM(monto_usd) as total_usd
        FROM pago_detalles 
        WHERE estado = 'Confirmado'
    ");
    $revenue = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Obtener tasa actual para el cálculo del total consolidado
    $stmt = $pdo->query("SELECT tasa FROM tasas ORDER BY fecha DESC LIMIT 1");
    $tasa = $stmt->fetch(PDO::FETCH_ASSOC)['tasa'] ?? 36;
    
    $stats['totalRevenue'] = ($revenue['total_bs'] ?? 0) + (($revenue['total_usd'] ?? 0) * $tasa);
    
    // Pagos pendientes
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM pagos WHERE estado = 'Pendiente'");
    $stats['pendingPayments'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Actividad reciente
    $recentActivity = [];
    
    // Últimos usuarios registrados
    $stmt = $pdo->query("
        SELECT username, created_at as fecha_registro 
        FROM usuarios 
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    $recentUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentUsers as $user) {
        $recentActivity[] = [
            'text' => "Nuevo usuario registrado: {$user['username']}",
            'time' => date('d/m/Y H:i', strtotime($user['fecha_registro']))
        ];
    }
    
    // Últimos pagos registrados
    $stmt = $pdo->query("
        SELECT pd.monto_Bs, pd.monto_usd, pd.fecha, a.apartamento as casa_numero, e.nombre_edificio
        FROM pago_detalles pd
        JOIN pagos p ON pd.pago_id = p.pago_id
        JOIN inmueble i ON p.inmueble_id = i.inmueble_id
        JOIN apartamentos a ON i.entidad_id = a.apartamento_id
        JOIN edificios e ON a.edificio_id = e.edificio_id
        WHERE i.tipo_entidad = 'apartamento'
        ORDER BY pd.fecha DESC 
        LIMIT 5
    ");
    $recentPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentPayments as $payment) {
        $amount = $payment['monto_usd'] > 0 ? 
            "$" . number_format($payment['monto_usd'], 2) : 
            "Bs " . number_format($payment['monto_Bs'], 2);
        
        $recentActivity[] = [
            'text' => "Pago recibido de {$payment['nombre_edificio']} - Apto {$payment['casa_numero']}: {$amount}",
            'time' => date('d/m/Y H:i', strtotime($payment['fecha']))
        ];
    }
    
    // Ordenar por fecha
    usort($recentActivity, function($a, $b) {
        return strtotime($b['time']) - strtotime($a['time']);
    });
    
    // Limitar a 10 actividades
    $recentActivity = array_slice($recentActivity, 0, 10);
    
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'recentActivity' => $recentActivity
    ]);
    
} catch (PDOException $e) {
    error_log("Error en super_admin_dashboard.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
