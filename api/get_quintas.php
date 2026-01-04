<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    $stmt = $pdo->query("SELECT casa_id, nombre_casa FROM casas ORDER BY nombre_casa");
    $casas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'casas' => $casas
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>