<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$edificio_id = $_GET['edificio_id'] ?? '';

if (empty($edificio_id)) {
    echo json_encode(['success' => false, 'message' => 'ID de edificio requerido']);
    exit;
}

try {
    // Obtener pisos que tienen apartamentos disponibles
    $stmt = $pdo->prepare("
        SELECT DISTINCT a.piso 
        FROM apartamentos a 
        LEFT JOIN inmueble i ON a.apartamento_id = i.entidad_id AND i.tipo_entidad = 'apartamento'
        WHERE a.edificio_id = ? AND i.inmueble_id IS NULL
        ORDER BY a.piso
    ");
    $stmt->execute([$edificio_id]);
    $pisos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'pisos' => $pisos
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_pisos_by_edificio.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
