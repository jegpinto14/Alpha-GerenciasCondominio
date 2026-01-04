<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    $stmt = $pdo->query("SELECT id_avenida, nombre_avenida FROM avenidas ORDER BY nombre_avenida");
    $avenidas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'avenidas' => $avenidas
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_avenidas.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
