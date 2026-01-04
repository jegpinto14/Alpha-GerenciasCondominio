<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    $inmueble_id = $_GET['inmueble_id'] ?? null;
    
    if (empty($inmueble_id)) {
        echo json_encode([
            'success' => false,
            'message' => 'inmueble_id es requerido'
        ]);
        exit;
    }
    
    // Obtener reclamos del inmueble
    $stmt = $pdo->prepare("
        SELECT 
            reclamos_id,
            inmueble_id,
            descripcion,
            estado,
            fecha
        FROM reclamos
        WHERE inmueble_id = ?
        ORDER BY fecha DESC
    ");
    
    $stmt->execute([$inmueble_id]);
    $reclamos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'reclamos' => $reclamos
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener reclamos: ' . $e->getMessage()
    ]);
}
