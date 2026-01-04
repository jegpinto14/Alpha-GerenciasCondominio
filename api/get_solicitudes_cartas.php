<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    $inmueble_id = $_GET['inmueble_id'] ?? null;
    $propietario_id = $_GET['propietario_id'] ?? null;

    if (empty($inmueble_id)) {
        echo json_encode([
            'success' => false,
            'message' => 'Inmueble no especificado'
        ]);
        exit;
    }

    // Obtener solicitudes de cartas del usuario
    $stmt = $pdo->prepare("
        SELECT 
            sc.carta_id,
            sc.descripcion,
            sc.estado,
            sc.fecha,
            i.nombre_item,
            i.precio,
            i.item_id
        FROM solicitudes_cartas sc
        INNER JOIN items i ON sc.item_id = i.item_id
        WHERE sc.inmueble_id = ?
        ORDER BY sc.fecha DESC
    ");
    
    $stmt->execute([$inmueble_id]);
    $solicitudes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'solicitudes' => $solicitudes,
        'inmueble_id' => $inmueble_id,
        'propietario_id' => $propietario_id
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener solicitudes: ' . $e->getMessage()
    ]);
}
