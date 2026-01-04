<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$edificio_id = $_GET['edificio_id'] ?? '';
$piso = $_GET['piso'] ?? '';

if (empty($edificio_id) || empty($piso)) {
    echo json_encode(['success' => false, 'message' => 'ID de edificio y piso requeridos']);
    exit;
}

try {
    // Obtener apartamentos disponibles (no ocupados)
    $stmt = $pdo->prepare("
        SELECT a.apartamento_id, a.apartamento 
        FROM apartamentos a 
        LEFT JOIN inmueble i ON a.apartamento_id = i.entidad_id AND i.tipo_entidad = 'apartamento'
        WHERE a.edificio_id = ? AND a.piso = ? AND i.inmueble_id IS NULL
        ORDER BY a.apartamento
    ");
    $stmt->execute([$edificio_id, $piso]);
    $apartamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'apartamentos' => $apartamentos
    ]);

} catch (PDOException $e) {
    error_log("Error en get_apartamentos_by_piso.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>