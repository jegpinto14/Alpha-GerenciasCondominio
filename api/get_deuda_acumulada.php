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
    // Conectar a la base de datos
    require_once __DIR__ . '/../includes/database.php';
    
    // Obtener el propietario_id del usuario actual
    $stmt = $pdo->prepare("
        SELECT propietario_id 
        FROM propietarios 
        WHERE user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $propietario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$propietario) {
        echo json_encode(['success' => false, 'message' => 'Propietario no encontrado']);
        exit;
    }
    
    $propietario_id = $propietario['propietario_id'];
    
    // Obtener la última tasa de cambio
    $stmt = $pdo->prepare("
        SELECT tasa 
        FROM tasas 
        ORDER BY fecha DESC 
        LIMIT 1
    ");
    $stmt->execute();
    $ultima_tasa = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$ultima_tasa) {
        echo json_encode(['success' => false, 'message' => 'No se encontró tasa de cambio']);
        exit;
    }
    
    $tasa_actual = $ultima_tasa['tasa'];
    
    // Obtener la deuda del propietario desde la tabla deuda_propetario
    $stmt = $pdo->prepare("
        SELECT dp.monto_deuda_usd
        FROM deuda_propetario dp
        INNER JOIN inmueble i ON dp.inmueble_id = i.inmueble_id
        WHERE i.propietario_id = ?
    ");
    $stmt->execute([$propietario_id]);
    $deudas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular totales
    $total_usd = 0;
    foreach ($deudas as $deuda) {
        $total_usd += $deuda['monto_deuda_usd'];
    }
    
    // Calcular total en bolívares
    $total_bs = $total_usd * $tasa_actual;
    
    // Respuesta
    echo json_encode([
        'success' => true,
        'total_usd' => $total_usd,
        'total_bs' => $total_bs,
        'tasa_actual' => $tasa_actual,
        'fecha_consulta' => date('d/m/Y H:i:s')
    ]);
    
} catch (Exception $e) {
    error_log("Error obteniendo deuda acumulada: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
}
?>