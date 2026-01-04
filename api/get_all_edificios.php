<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener todos los edificios
    $stmt = $pdo->query("
        SELECT DISTINCT e.edificio_id, e.nombre_edificio 
        FROM edificios e 
        ORDER BY e.nombre_edificio
    ");
    $edificios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'edificios' => $edificios
    ]);

} catch (PDOException $e) {
    error_log("Error en get_all_edificios.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
