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
    // Obtener establecimientos por avenida
    $stmt = $pdo->prepare("
        SELECT DISTINCT es.tipo_vivienda_id, es.nombre_establecimiento, tv.nombre_tipo AS nombre_tipo_vivienda
        FROM establecimientos es
        INNER JOIN tipo_vivienda tv ON es.tipo_vivienda_id = tv.tipo_id
        WHERE es.avenida_id = ?
        ORDER BY es.nombre_establecimiento
    ");
    $stmt->execute([$avenidaId]);
    $establecimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'establecimientos' => $establecimientos
    ]);

} catch (PDOException $e) {
    error_log("Error en get_tipo_establecimientos_by_avenida.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>