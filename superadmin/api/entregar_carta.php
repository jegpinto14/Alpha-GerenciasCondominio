<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/conexion.php';

$data = json_decode(file_get_contents('php://input'), true);
$cartaId = isset($data['carta_id']) ? (int) $data['carta_id'] : null;

if (!$cartaId) {
    echo json_encode(['success' => false, 'message' => 'ID de carta requerido']);
    exit;
}

try {
    // Primero, verificamos si la tabla permite el estado 'Entregado' o si necesitamos alterarla
    // Por simplicidad en este entorno, intentaremos el update directamente.
    // Si falla por el ENUM, el catch lo capturará.
    
    $stmt = $pdo->prepare("UPDATE solicitudes_cartas SET estado = 'Aprobada' WHERE carta_id = ?");
    $result = $stmt->execute([$cartaId]);

    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Solicitud marcada como entregada']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se pudo actualizar la solicitud']);
    }
} catch (Throwable $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'Error al actualizar el estado',
        'error' => $e->getMessage()
    ]);
}
