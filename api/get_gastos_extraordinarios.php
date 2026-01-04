<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    // Obtener items de categoría 3 (Gastos Extraordinarios) activos
    $stmt = $pdo->prepare("
        SELECT 
            i.item_id,
            i.nombre_item,
            i.descripcion,
            i.precio,
            i.activo,
            i.imagen_url,
            c.nombre_categoria
        FROM items i
        INNER JOIN categoria_items c ON i.categoria_id = c.categoria_id
        WHERE i.categoria_id = 3 
        AND i.activo = 1
        ORDER BY i.nombre_item ASC
    ");
    
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($items) {
        echo json_encode([
            'success' => true,
            'items' => $items
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'items' => [],
            'message' => 'No hay gastos extraordinarios disponibles'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener gastos extraordinarios: ' . $e->getMessage()
    ]);
}
