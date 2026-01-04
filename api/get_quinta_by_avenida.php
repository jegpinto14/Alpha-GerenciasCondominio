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
    // Obtener casas por avenida
    $stmt = $pdo->prepare("
        SELECT DISTINCT c.casa_id, c.nombre_casa 
        FROM casas c
        WHERE c.avenida_id = ?
        ORDER BY c.nombre_casa
    ");
    $stmt->execute([$avenidaId]);
    $casas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'casas' => $casas
    ]);

} catch (PDOException $e) {
    error_log("Error en get_quinta_by_avenida.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
