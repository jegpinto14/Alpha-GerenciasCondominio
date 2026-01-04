<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    $stmt = $pdo->query("
        SELECT DISTINCT es.tipo_vivienda_id, es.nombre_establecimiento, tv.nombre_tipo AS nombre_tipo_vivienda
        FROM establecimientos es
        INNER JOIN tipo_vivienda tv ON es.tipo_vivienda_id = tv.tipo_id
        ORDER BY es.nombre_establecimiento
    ");
    $establecimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'establecimientos' => $establecimientos
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>