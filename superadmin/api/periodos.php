<?php
/**
 * API para gestión de periodos
 * Operaciones: listar, crear periodos mensuales
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = $pdo;

    switch ($method) {
        case 'GET':
            // Obtener o crear periodo para una fecha específica
            if (isset($_GET['anio']) && isset($_GET['mes'])) {
                $anio = intval($_GET['anio']);
                $mes = intval($_GET['mes']);

                // Crear fecha del periodo (primer día del mes)
                $fechaPeriodo = sprintf('%04d-%02d-01', $anio, $mes);

                // Buscar si existe el periodo
                $query = "SELECT periodo_id, fecha_periodo FROM periodos WHERE fecha_periodo = :fecha_periodo";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(':fecha_periodo', $fechaPeriodo);
                $stmt->execute();
                $periodo = $stmt->fetch(PDO::FETCH_ASSOC);

                // Si no existe, crearlo
                if (!$periodo) {
                    $insertQuery = "INSERT INTO periodos (fecha_periodo) VALUES (:fecha_periodo)";
                    $insertStmt = $conn->prepare($insertQuery);
                    $insertStmt->bindParam(':fecha_periodo', $fechaPeriodo);
                    $insertStmt->execute();

                    $periodoId = $conn->lastInsertId();
                    $periodo = [
                        'periodo_id' => $periodoId,
                        'fecha_periodo' => $fechaPeriodo
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => $periodo
                ]);
            } else {
                // Listar todos los periodos
                $query = "SELECT periodo_id, fecha_periodo FROM periodos ORDER BY fecha_periodo DESC";
                $stmt = $conn->prepare($query);
                $stmt->execute();
                $periodos = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => $periodos
                ]);
            }
            break;

        case 'POST':
            // Crear nuevo periodo
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['fecha_periodo'])) {
                throw new Exception('Fecha de periodo es obligatoria');
            }

            // Verificar si ya existe
            $checkQuery = "SELECT periodo_id FROM periodos WHERE fecha_periodo = :fecha_periodo";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':fecha_periodo', $data['fecha_periodo']);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                $existente = $checkStmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode([
                    'success' => true,
                    'message' => 'Periodo ya existe',
                    'periodo_id' => $existente['periodo_id']
                ]);
            } else {
                $query = "INSERT INTO periodos (fecha_periodo) VALUES (:fecha_periodo)";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(':fecha_periodo', $data['fecha_periodo']);
                $stmt->execute();

                echo json_encode([
                    'success' => true,
                    'message' => 'Periodo creado exitosamente',
                    'periodo_id' => $conn->lastInsertId()
                ]);
            }
            break;

        default:
            throw new Exception('Método no permitido');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>