<?php
header('Content-Type: application/json');

require_once '../includes/database.php';

function respondJson(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

try {
    $fechaParam = isset($_GET['fecha']) ? trim($_GET['fecha']) : null;
    $tasa = null;

    if ($fechaParam !== null && $fechaParam !== '') {
        $date = DateTime::createFromFormat('Y-m-d', $fechaParam) ?: DateTime::createFromFormat('Y-m-d H:i:s', $fechaParam);

        if (!$date) {
            respondJson([
                'success' => false,
                'message' => 'Formato de fecha inválido. Usa YYYY-MM-DD o YYYY-MM-DD HH:MM:SS.'
            ], 400);
        }

        $startOfDay = $date->format('Y-m-d 00:00:00');
        $endOfDay = $date->format('Y-m-d 23:59:59');

        $stmt = $pdo->prepare("SELECT tasa_id, tasa, fecha FROM tasas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC LIMIT 1");
        $stmt->execute([$startOfDay, $endOfDay]);
        $tasa = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tasa) {
            $stmt = $pdo->prepare("SELECT tasa_id, tasa, fecha FROM tasas WHERE fecha <= ? ORDER BY fecha DESC LIMIT 1");
            $stmt->execute([$endOfDay]);
            $tasa = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    } else {
        $stmt = $pdo->query("SELECT tasa_id, tasa, fecha FROM tasas ORDER BY fecha DESC LIMIT 1");
        $tasa = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$tasa) {
        respondJson([
            'success' => false,
            'message' => 'No se encontró ninguna tasa registrada.'
        ], 404);
    }

    respondJson([
        'success' => true,
        'data' => [
            'tasa_id' => (int) $tasa['tasa_id'],
            'tasa' => (float) $tasa['tasa'],
            'fecha' => $tasa['fecha'],
            'fecha_iso' => (new DateTime($tasa['fecha']))->format(DateTime::ATOM)
        ]
    ]);
} catch (Throwable $e) {
    error_log('Error en get_tasa.php: ' . $e->getMessage());
    respondJson([
        'success' => false,
        'message' => 'Error obteniendo la tasa: ' . $e->getMessage()
    ], 500);
}