<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    $inmueble_id = isset($_GET['inmueble_id']) ? intval($_GET['inmueble_id']) : null;
    
    error_log("get_payment_stats.php - User ID: " . $_SESSION['user_id']);
    error_log("get_payment_stats.php - Inmueble ID: " . ($inmueble_id ?: 'null'));
    
    $currentYear = date('Y');
    $currentMonth = (int)date('n'); // 1-12
    
    if ($inmueble_id) {
        error_log("[v0] Filtering payments for inmueble_id: $inmueble_id");
        
        // Verify the inmueble belongs to the user
        $stmt = $pdo->prepare("
            SELECT i.inmueble_id 
            FROM inmueble i
            JOIN propietarios p ON i.propietario_id = p.propietario_id
            WHERE i.inmueble_id = ? AND p.user_id = ?
        ");
        $stmt->execute([$inmueble_id, $_SESSION['user_id']]);
        $inmueble = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$inmueble) {
            echo json_encode(['success' => false, 'message' => 'Inmueble no encontrado o no tienes permisos']);
            exit;
        }
        
        // Get payments for this specific inmueble
        $stmt = $pdo->prepare("
            SELECT mes_nombre, año, estado, fecha_pago, monto_bs, monto_dolares, metodo_pago
            FROM pagos_mensualidades 
            WHERE inmueble_id = ? AND año = ?
        ");
        $stmt->execute([$inmueble_id, $currentYear]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } else {
        $stmt = $pdo->prepare("
            SELECT pm.mes_nombre, pm.año, pm.estado, pm.fecha_pago, pm.monto_bs, pm.monto_dolares, pm.metodo_pago
            FROM pagos_mensualidades pm
            JOIN inmueble i ON pm.inmueble_id = i.inmueble_id
            JOIN propietarios p ON i.propietario_id = p.propietario_id
            WHERE p.user_id = ? AND pm.año = ?
        ");
        $stmt->execute([$_SESSION['user_id'], $currentYear]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Create array of paid months
    $paidMonths = [];
    foreach ($payments as $payment) {
        $paidMonths[$payment['mes_nombre']] = $payment;
    }
    
    // Generate statistics for all 12 months
    $months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    $stats = [
        'unpaid' => 0,    // Months owed
        'paid' => 0,      // Months paid
        'pending' => 0    // Future months
    ];
    
    $monthDetails = [];
    
    foreach ($months as $index => $monthName) {
        $monthNumber = $index + 1;
        $status = 'pending'; // Default pending
        
        if ($monthNumber < $currentMonth) {
            // Past month - owed if not paid
            $status = isset($paidMonths[$monthName]) ? 'paid' : 'unpaid';
        } elseif ($monthNumber === $currentMonth) {
            // Current month - owed if not paid
            $status = isset($paidMonths[$monthName]) ? 'paid' : 'unpaid';
        } else {
            // Future month - pending
            $status = 'pending';
        }
        
        $monthDetails[] = [
            'name' => $monthName,
            'number' => $monthNumber,
            'status' => $status,
            'amount_bs' => 50, // Fixed amount as in payment page
            'amount_usd' => 15
        ];
        
        $stats[$status]++;
    }
    
    $response = [
        'success' => true,
        'stats' => $stats,
        'months' => $monthDetails,
        'inmueble_id' => $inmueble_id,
        'year' => $currentYear
    ];
    
    error_log("get_payment_stats.php - Enviando respuesta: " . json_encode($response));
    echo json_encode($response);
    
} catch (PDOException $e) {
    error_log("Error en get_payment_stats.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
