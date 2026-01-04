<?php
/**
 * API para gestión de proveedores
 * Operaciones: listar, crear, actualizar
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
            // Listar todos los proveedores con sus datos bancarios
            $query = "SELECT 
                        p.proveedor_id,
                        p.nombre_razon_social,
                        p.tipo_documento,
                        p.nro_documento,
                        p.email,
                        p.telefono,
                        p.notas,
                        p.estado,
                        p.creado_en,
                        p.actualizado_en,
                        brg.banco_receptor_gasto_id,
                        brg.banco_id,
                        b.nombre_banco,
                        brg.tipo_cuenta,
                        brg.numero_cuenta,
                        brg.titular_cuenta
                      FROM proveedores p
                      LEFT JOIN banco_receptor_gastos brg ON p.proveedor_id = brg.proveedor_id AND brg.activa = TRUE
                      LEFT JOIN bancos b ON brg.banco_id = b.banco_id
                      ORDER BY p.nombre_razon_social ASC";

            $stmt = $conn->prepare($query);
            $stmt->execute();
            $proveedores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $proveedores,
                'count' => count($proveedores)
            ]);
            break;

        case 'POST':
            // Crear nuevo proveedor
            $data = json_decode(file_get_contents('php://input'), true);

            // Validar datos requeridos
            if (empty($data['nombre_razon_social']) || empty($data['nro_documento'])) {
                throw new Exception('Nombre y número de documento son obligatorios');
            }

            // Verificar si el número de documento ya existe
            $checkQuery = "SELECT proveedor_id FROM proveedores WHERE nro_documento = :nro_documento";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':nro_documento', $data['nro_documento']);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                throw new Exception('Ya existe un proveedor con este número de documento');
            }

            // Iniciar transacción
            $conn->beginTransaction();

            try {
                // Insertar proveedor
                $query = "INSERT INTO proveedores (
                            nombre_razon_social,
                            tipo_documento,
                            nro_documento,
                            email,
                            telefono,
                            notas,
                            estado
                          ) VALUES (
                            :nombre_razon_social,
                            :tipo_documento,
                            :nro_documento,
                            :email,
                            :telefono,
                            :notas,
                            :estado
                          )";

                $stmt = $conn->prepare($query);
                $stmt->bindParam(':nombre_razon_social', $data['nombre_razon_social']);
                $tipoDocumento = $data['tipo_documento'] ?? 'J';
                $stmt->bindParam(':tipo_documento', $tipoDocumento);
                $stmt->bindParam(':nro_documento', $data['nro_documento']);
                $stmt->bindParam(':email', $data['email']);
                $stmt->bindParam(':telefono', $data['telefono']);
                $stmt->bindParam(':notas', $data['notas']);
                $estado = $data['estado'] ?? 'activo';
                $stmt->bindParam(':estado', $estado);

                $stmt->execute();
                $proveedorId = $conn->lastInsertId();

                // Insertar datos bancarios si se proporcionan
                if (!empty($data['banco_id']) && !empty($data['numero_cuenta'])) {
                    $queryBanco = "INSERT INTO banco_receptor_gastos (
                                    banco_id,
                                    proveedor_id,
                                    numero_cuenta,
                                    titular_cuenta,
                                    activa
                                  ) VALUES (
                                    :banco_id,
                                    :proveedor_id,
                                    :numero_cuenta,
                                    :titular_cuenta,
                                    TRUE
                                  )";

                    $stmtBanco = $conn->prepare($queryBanco);
                    $stmtBanco->bindParam(':banco_id', $data['banco_id']);
                    $stmtBanco->bindParam(':proveedor_id', $proveedorId);
                    $stmtBanco->bindParam(':numero_cuenta', $data['numero_cuenta']);
                    $stmtBanco->bindParam(':titular_cuenta', $data['titular_cuenta']);
                    $stmtBanco->execute();
                }

                $conn->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Proveedor registrado exitosamente',
                    'proveedor_id' => $proveedorId
                ]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;

        case 'PUT':
            // Actualizar proveedor existente
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['proveedor_id'])) {
                throw new Exception('ID de proveedor es obligatorio');
            }

            $query = "UPDATE proveedores SET
                        nombre_razon_social = :nombre_razon_social,
                        tipo_documento = :tipo_documento,
                        nro_documento = :nro_documento,
                        email = :email,
                        telefono = :telefono,
                        notas = :notas,
                        estado = :estado
                      WHERE proveedor_id = :proveedor_id";

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':proveedor_id', $data['proveedor_id']);
            $stmt->bindParam(':nombre_razon_social', $data['nombre_razon_social']);
            $stmt->bindParam(':tipo_documento', $data['tipo_documento']);
            $stmt->bindParam(':nro_documento', $data['nro_documento']);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':telefono', $data['telefono']);
            $stmt->bindParam(':notas', $data['notas']);
            $stmt->bindParam(':estado', $data['estado']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Proveedor actualizado exitosamente'
                ]);
            } else {
                throw new Exception('Error al actualizar el proveedor');
            }
            break;

        case 'DELETE':
            // Eliminar proveedor
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['proveedor_id'])) {
                throw new Exception('ID de proveedor es obligatorio');
            }

            // Verificar si el proveedor tiene obligaciones asociadas
            $checkQuery = "SELECT COUNT(*) as count FROM obligaciones WHERE proveedor_id = :proveedor_id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':proveedor_id', $data['proveedor_id']);
            $checkStmt->execute();
            $result = $checkStmt->fetch();

            if ($result['count'] > 0) {
                throw new Exception('No se puede eliminar el proveedor porque tiene obligaciones asociadas. Cambia su estado a inactivo en su lugar.');
            }

            $query = "DELETE FROM proveedores WHERE proveedor_id = :proveedor_id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':proveedor_id', $data['proveedor_id']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Proveedor eliminado exitosamente'
                ]);
            } else {
                throw new Exception('Error al eliminar el proveedor');
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