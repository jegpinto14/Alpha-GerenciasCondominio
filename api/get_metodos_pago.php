<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    // Obtener todos los métodos de pago disponibles
    $stmt = $pdo->prepare("
        SELECT 
            metodo_id,
            descripcion
        FROM metodos_pago
        ORDER BY metodo_id ASC
    ");
    
    $stmt->execute();
    $metodos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($metodos) {
        echo json_encode([
            'success' => true,
            'metodos' => $metodos
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontraron métodos de pago'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener métodos de pago: ' . $e->getMessage()
    ]);
}
