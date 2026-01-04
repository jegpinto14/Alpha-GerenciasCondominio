<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/conexion.php';

$entrada = json_decode(file_get_contents('php://input'), true);

$id = isset($entrada['id']) ? (int) $entrada['id'] : 0;
$estadoEntrada = isset($entrada['estado']) ? strtolower(trim((string) $entrada['estado'])) : 'recibido';

if ($id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID de reclamo inválido'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

switch ($estadoEntrada) {
    case 'recibido':
        $estadoDb = 'Recibido';
        $estadoNormalizado = 'recibido';
        break;
    case 'pendiente':
        $estadoDb = 'Pendiente';
        $estadoNormalizado = 'pendiente';
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Estado no soportado'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
}

try {
    $stmt = $pdo->prepare('UPDATE reclamos SET Estado = :estado WHERE reclamos_id = :id');
    $stmt->bindParam(':estado', $estadoDb, PDO::PARAM_STR);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Reclamo no encontrado'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $id,
            'estado' => $estadoNormalizado
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al actualizar el reclamo',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
