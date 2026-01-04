<?php
/**
 * API para gestión de cuentas contables
 * Operaciones: listar, crear, actualizar, eliminar
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = $pdo;

    switch ($method) {
        case 'GET':

            // Obtener tipo de cuenta si se especifica
            $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : null;
            $todas = isset($_GET['todas']) ? $_GET['todas'] : false;

            $query = "SELECT 
                        cc.cuenta_id,
                        cc.codigo_cuenta,
                        cc.nombre_cuenta,
                        cc.tipo_cuenta_contable_id,
                        tcc.nombre_tipo_cuenta,
                        tcc.categoria_balance_id,
                        cb.nombre_categoria,
                        cb.naturaleza_saldo,
                        cc.descripcion,
                        cc.activa
                      FROM cuentas_contables cc
                      INNER JOIN tipo_cuenta_contable tcc ON cc.tipo_cuenta_contable_id = tcc.tipo_cuenta_contable_id
                      INNER JOIN categoria_balance cb ON tcc.categoria_balance_id = cb.categoria_balance_id";

            // Si no se pide 'todas', filtrar solo activas
            if (!$todas) {
                $query .= " WHERE cc.activa = TRUE";
            } else {
                $query .= " WHERE 1=1";
            }

            if ($tipo) {
                $query .= " AND tcc.tipo_cuenta_contable_id = :tipo";
            }

            $query .= " ORDER BY cc.codigo_cuenta ASC";

            $stmt = $conn->prepare($query);

            if ($tipo) {
                $stmt->bindParam(':tipo', $tipo);
            }

            $stmt->execute();
            $cuentas = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $cuentas,
                'count' => count($cuentas)
            ]);
            break;

        case 'POST':
            // Crear nueva cuenta contable
            $data = json_decode(file_get_contents('php://input'), true);

            // Validar datos requeridos
            if (
                empty($data['codigo_cuenta']) || empty($data['nombre_cuenta']) ||
                empty($data['tipo_cuenta_contable_id'])
            ) {
                throw new Exception('Código, nombre y tipo de cuenta contable son obligatorios');
            }

            // Verificar si el código ya existe
            $checkQuery = "SELECT cuenta_id FROM cuentas_contables WHERE codigo_cuenta = :codigo_cuenta";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':codigo_cuenta', $data['codigo_cuenta']);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                throw new Exception('Ya existe una cuenta con este código');
            }

            $query = "INSERT INTO cuentas_contables (
                        codigo_cuenta,
                        nombre_cuenta,
                        tipo_cuenta_contable_id,
                        descripcion,
                        activa
                      ) VALUES (
                        :codigo_cuenta,
                        :nombre_cuenta,
                        :tipo_cuenta_contable_id,
                        :descripcion,
                        :activa
                      )";

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':codigo_cuenta', $data['codigo_cuenta']);
            $stmt->bindParam(':nombre_cuenta', $data['nombre_cuenta']);
            $stmt->bindParam(':tipo_cuenta_contable_id', $data['tipo_cuenta_contable_id'], PDO::PARAM_INT);
            $stmt->bindParam(':descripcion', $data['descripcion']);
            $activa = isset($data['activa']) ? $data['activa'] : true;
            $stmt->bindParam(':activa', $activa, PDO::PARAM_BOOL);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Cuenta contable registrada exitosamente',
                    'cuenta_id' => $conn->lastInsertId()
                ]);
            } else {
                throw new Exception('Error al registrar la cuenta contable');
            }
            break;

        case 'PUT':
            // Actualizar cuenta contable existente
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['cuenta_id'])) {
                throw new Exception('ID de cuenta es obligatorio');
            }

            $query = "UPDATE cuentas_contables SET
                        codigo_cuenta = :codigo_cuenta,
                        nombre_cuenta = :nombre_cuenta,
                        tipo_cuenta_contable_id = :tipo_cuenta_contable_id,
                        descripcion = :descripcion,
                        activa = :activa
                      WHERE cuenta_id = :cuenta_id";

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':cuenta_id', $data['cuenta_id']);
            $stmt->bindParam(':codigo_cuenta', $data['codigo_cuenta']);
            $stmt->bindParam(':nombre_cuenta', $data['nombre_cuenta']);
            $stmt->bindParam(':tipo_cuenta_contable_id', $data['tipo_cuenta_contable_id'], PDO::PARAM_INT);
            $stmt->bindParam(':descripcion', $data['descripcion']);
            $stmt->bindParam(':activa', $data['activa'], PDO::PARAM_BOOL);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Cuenta contable actualizada exitosamente'
                ]);
            } else {
                throw new Exception('Error al actualizar la cuenta contable');
            }
            break;

        case 'DELETE':
            // Eliminar cuenta contable
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['cuenta_id'])) {
                throw new Exception('ID de cuenta es obligatorio');
            }

            // Verificar si la cuenta tiene obligaciones asociadas
            $checkQuery = "SELECT COUNT(*) as count FROM obligaciones WHERE cuenta_id = :cuenta_id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':cuenta_id', $data['cuenta_id']);
            $checkStmt->execute();
            $result = $checkStmt->fetch();

            if ($result['count'] > 0) {
                throw new Exception('No se puede eliminar la cuenta porque tiene obligaciones asociadas. Cambia su estado a inactiva en su lugar.');
            }

            $query = "DELETE FROM cuentas_contables WHERE cuenta_id = :cuenta_id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':cuenta_id', $data['cuenta_id']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Cuenta contable eliminada exitosamente'
                ]);
            } else {
                throw new Exception('Error al eliminar la cuenta contable');
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