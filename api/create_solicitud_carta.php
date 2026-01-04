<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    // Obtener datos del POST
    $data = json_decode(file_get_contents('php://input'), true);
    
    $motivo = $data['motivo'] ?? '';
    $item_id = $data['item_id'] ?? null;
    $inmueble_id = $data['inmueble_id'] ?? null;
    $propietario_id = $data['propietario_id'] ?? null;

    if (empty($motivo) || empty($item_id) || empty($inmueble_id)) {
        echo json_encode([
            'success' => false,
            'message' => 'Faltan datos requeridos'
        ]);
        exit;
    }

    // Insertar solicitud de carta
    $stmt = $pdo->prepare("
        INSERT INTO solicitudes_cartas 
        (inmueble_id, item_id, descripcion, estado, fecha) 
        VALUES (?, ?, ?, 'Pendiente', NOW())
    ");
    
    $stmt->execute([
        $inmueble_id,
        $item_id,
        $motivo
    ]);
    
    $carta_id = $pdo->lastInsertId();
    
    // Obtener información del item para respuesta
    $stmt = $pdo->prepare("
        SELECT nombre_item, precio 
        FROM items 
        WHERE item_id = ?
    ");
    $stmt->execute([$item_id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Solicitud de carta creada exitosamente',
        'carta_id' => $carta_id,
        'item' => $item,
        'inmueble_id' => $inmueble_id,
        'propietario_id' => $propietario_id
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al crear solicitud: ' . $e->getMessage()
    ]);
}
