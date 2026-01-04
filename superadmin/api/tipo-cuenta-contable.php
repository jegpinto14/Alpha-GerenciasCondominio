<?php
/**
 * API para gestión de tipos de cuenta contable
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
            $query = "SELECT 
                        tcc.tipo_cuenta_contable_id,
                        tcc.nombre_tipo_cuenta,
                        tcc.categoria_balance_id,
                        cb.nombre_categoria,
                        cb.descripcion as categoria_descripcion,
                        cb.naturaleza_saldo
                      FROM tipo_cuenta_contable tcc
                      INNER JOIN categoria_balance cb ON tcc.categoria_balance_id = cb.categoria_balance_id
                      ORDER BY tcc.nombre_tipo_cuenta ASC";

            $stmt = $conn->prepare($query);
            $stmt->execute();
            $tipos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $tipos,
                'count' => count($tipos)
            ]);
            break;

        case 'POST':
            // Crear nuevo tipo de cuenta contable
            $data = json_decode(file_get_contents('php://input'), true);

            // Validar datos requeridos
            if (empty($data['nombre_tipo_cuenta']) || empty($data['categoria_balance_id'])) {
                throw new Exception('Nombre y categoría de balance son obligatorios');
            }

            // Verificar si el nombre ya existe
            $checkQuery = "SELECT tipo_cuenta_contable_id FROM tipo_cuenta_contable WHERE nombre_tipo_cuenta = :nombre_tipo_cuenta";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':nombre_tipo_cuenta', $data['nombre_tipo_cuenta']);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                throw new Exception('Ya existe un tipo de cuenta con este nombre');
            }

            $query = "INSERT INTO tipo_cuenta_contable (
                        nombre_tipo_cuenta,
                        categoria_balance_id
                      ) VALUES (
                        :nombre_tipo_cuenta,
                        :categoria_balance_id
                      )";

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':nombre_tipo_cuenta', $data['nombre_tipo_cuenta']);
            $stmt->bindParam(':categoria_balance_id', $data['categoria_balance_id'], PDO::PARAM_INT);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Tipo de cuenta contable registrado exitosamente',
                    'tipo_cuenta_contable_id' => $conn->lastInsertId()
                ]);
            } else {
                throw new Exception('Error al registrar el tipo de cuenta contable');
            }
            break;

        case 'PUT':
            // Actualizar tipo de cuenta contable existente
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['tipo_cuenta_contable_id'])) {
                throw new Exception('ID de tipo de cuenta es obligatorio');
            }

            $query = "UPDATE tipo_cuenta_contable SET
                        nombre_tipo_cuenta = :nombre_tipo_cuenta,
                        categoria_balance_id = :categoria_balance_id
                      WHERE tipo_cuenta_contable_id = :tipo_cuenta_contable_id";

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':tipo_cuenta_contable_id', $data['tipo_cuenta_contable_id']);
            $stmt->bindParam(':nombre_tipo_cuenta', $data['nombre_tipo_cuenta']);
            $stmt->bindParam(':categoria_balance_id', $data['categoria_balance_id'], PDO::PARAM_INT);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Tipo de cuenta contable actualizado exitosamente'
                ]);
            } else {
                throw new Exception('Error al actualizar el tipo de cuenta contable');
            }
            break;

        case 'DELETE':
            // Eliminar tipo de cuenta contable
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['tipo_cuenta_contable_id'])) {
                throw new Exception('ID de tipo de cuenta es obligatorio');
            }

            // Verificar si el tipo tiene cuentas asociadas
            $checkQuery = "SELECT COUNT(*) as count FROM cuentas_contables WHERE tipo_cuenta_contable_id = :tipo_cuenta_contable_id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':tipo_cuenta_contable_id', $data['tipo_cuenta_contable_id']);
            $checkStmt->execute();
            $result = $checkStmt->fetch();

            if ($result['count'] > 0) {
                throw new Exception('No se puede eliminar el tipo de cuenta porque tiene cuentas contables asociadas.');
            }

            $query = "DELETE FROM tipo_cuenta_contable WHERE tipo_cuenta_contable_id = :tipo_cuenta_contable_id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':tipo_cuenta_contable_id', $data['tipo_cuenta_contable_id']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Tipo de cuenta contable eliminado exitosamente'
                ]);
            } else {
                throw new Exception('Error al eliminar el tipo de cuenta contable');
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