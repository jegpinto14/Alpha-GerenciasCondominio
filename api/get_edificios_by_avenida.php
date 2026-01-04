<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if (!isset($_GET['avenida_id'])) {
    echo json_encode(['success' => false, 'message' => 'ID de avenida requerido']);
    exit;
}

$avenidaId = $_GET['avenida_id'];

try {
    // Obtener edificios por avenida
    $stmt = $pdo->prepare("
        SELECT DISTINCT e.edificio_id, e.nombre_edificio 
        FROM edificios e 
        WHERE e.avenida_id = ?
        ORDER BY e.nombre_edificio
    ");
    $stmt->execute([$avenidaId]);
    $edificios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'edificios' => $edificios
    ]);

} catch (PDOException $e) {
    error_log("Error en get_edificios_by_avenida.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
