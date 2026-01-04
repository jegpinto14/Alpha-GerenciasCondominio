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
    
    // Total casas
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM viviendas");
    $stats['totalHouses'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total ingresos (pagos aprobados)
    $stmt = $pdo->query("
        SELECT 
            SUM(CASE WHEN moneda_pago = 'bs' THEN monto_bs ELSE 0 END) as total_bs,
            SUM(CASE WHEN moneda_pago = 'dolares' THEN monto_dolares ELSE 0 END) as total_usd
        FROM pagos_mensualidades 
        WHERE estado = 'aprobado'
    ");
    $revenue = $stmt->fetch(PDO::FETCH_ASSOC);
    $stats['totalRevenue'] = $revenue['total_bs'] + ($revenue['total_usd'] * 36); // Asumiendo tasa de cambio de 36 Bs por USD
    
    // Pagos pendientes
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM pagos_mensualidades WHERE estado = 'pendiente'");
    $stats['pendingPayments'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Actividad reciente
    $recentActivity = [];
    
    // Últimos usuarios registrados
    $stmt = $pdo->query("
        SELECT username, fecha_registro 
        FROM usuarios 
        ORDER BY fecha_registro DESC 
        LIMIT 5
    ");
    $recentUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentUsers as $user) {
        $recentActivity[] = [
            'text' => "Nuevo usuario registrado: {$user['username']}",
            'time' => date('d/m/Y H:i', strtotime($user['fecha_registro']))
        ];
    }
    
    // Últimos pagos
    $stmt = $pdo->query("
        SELECT p.monto_bs, p.monto_dolares, p.moneda_pago, p.fecha_pago, v.numero as casa_numero
        FROM pagos_mensualidades p
        JOIN viviendas v ON p.vivienda_id = v.id
        ORDER BY p.fecha_pago DESC 
        LIMIT 5
    ");
    $recentPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recentPayments as $payment) {
        $amount = $payment['moneda_pago'] === 'bs' ? 
            "Bs " . number_format($payment['monto_bs']) : 
            "$" . number_format($payment['monto_dolares']);
        
        $recentActivity[] = [
            'text' => "Pago recibido de Casa {$payment['casa_numero']}: {$amount}",
            'time' => date('d/m/Y H:i', strtotime($payment['fecha_pago']))
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
