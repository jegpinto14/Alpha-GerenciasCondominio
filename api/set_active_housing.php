<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

$inmuebleId = 0;
if (is_array($data) && isset($data['inmueble_id'])) {
    $inmuebleId = intval($data['inmueble_id']);
} elseif (isset($_POST['inmueble_id'])) {
    $inmuebleId = intval($_POST['inmueble_id']);
}

if ($inmuebleId <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID de inmueble inválido']);
    exit;
}

try {
    // Verificar que el inmueble pertenezca al usuario autenticado
    $stmt = $pdo->prepare("
        SELECT 
            i.inmueble_id,
            p.propietario_id
        FROM inmueble i
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        WHERE i.inmueble_id = ? AND p.user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$inmuebleId, $_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'El inmueble no pertenece al usuario actual']);
        exit;
    }

    $propietarioId = intval($row['propietario_id']);

    $update = $pdo->prepare('UPDATE propietarios SET active_inmueble_id = ? WHERE propietario_id = ?');
    $update->execute([$inmuebleId, $propietarioId]);

    echo json_encode([
        'success' => true,
        'active_inmueble_id' => $inmuebleId
    ]);
} catch (Exception $e) {
    error_log('Error en set_active_housing.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la vivienda activa']);
}
