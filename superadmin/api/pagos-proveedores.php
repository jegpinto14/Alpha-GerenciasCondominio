<?php
/**
 * API para gestión de pagos a proveedores
 * Operaciones: listar, crear, confirmar, anular
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = $pdo;

    switch ($method) {
        case 'GET':
            // Obtener parámetros de filtro
            $mes = isset($_GET['mes']) ? intval($_GET['mes']) : null;
            $anio = isset($_GET['anio']) ? intval($_GET['anio']) : date('Y');
            $obligacion_periodo_id = isset($_GET['obligacion_periodo_id']) ? $_GET['obligacion_periodo_id'] : null;

            // Obtener pagos con información completa usando JOINs
            $query = "SELECT 
                        pp.pago_proveedor_id,
                        pp.obligacion_periodo_id,
                        pp.metodo_id,
                        mp.descripcion as metodo_pago,
                        pp.nro_documento,
                        pp.fecha_pago,
                        pp.monto_pagado_usd,
                        pp.monto_pagado_bs,
                        pp.numero_referencia,
                        pp.documento_respaldo_url,
                        pp.estado,
                        pp.notas,
                        pp.registrado_por,
                        pp.creado_en,
                        o.obligacion_id,
                        o.concepto as obligacion_concepto,
                        o.proveedor_id,
                        p.nombre_razon_social as proveedor,
                        per.fecha_periodo,
                        YEAR(pp.fecha_pago) as anio_pago,
                        MONTH(pp.fecha_pago) as mes_pago
                      FROM pagos_proveedores pp
                      INNER JOIN obligacion_periodo op ON pp.obligacion_periodo_id = op.obligacion_periodo_id
                      INNER JOIN obligaciones o ON op.obligacion_id = o.obligacion_id
                      INNER JOIN proveedores p ON o.proveedor_id = p.proveedor_id
                      INNER JOIN periodos per ON op.periodo_id = per.periodo_id
                      LEFT JOIN metodos_pago mp ON pp.metodo_id = mp.metodo_id
                      WHERE 1=1";

            if ($mes && $anio) {
                $query .= " AND YEAR(pp.fecha_pago) = :anio AND MONTH(pp.fecha_pago) = :mes";
            } elseif ($anio) {
                $query .= " AND YEAR(pp.fecha_pago) = :anio";
            }

            if ($obligacion_periodo_id) {
                $query .= " AND pp.obligacion_periodo_id = :obligacion_periodo_id";
            }

            $query .= " ORDER BY pp.fecha_pago DESC";

            $stmt = $conn->prepare($query);

            if ($mes && $anio) {
                $stmt->bindParam(':anio', $anio);
                $stmt->bindParam(':mes', $mes);
            } elseif ($anio) {
                $stmt->bindParam(':anio', $anio);
            }

            if ($obligacion_periodo_id) {
                $stmt->bindParam(':obligacion_periodo_id', $obligacion_periodo_id);
            }

            $stmt->execute();
            $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $pagos,
                'count' => count($pagos)
            ]);
            break;

        case 'POST':
            // Registrar nuevo pago
            // Verificar si es FormData (con archivo) o JSON
            if (!empty($_POST)) {
                $data = $_POST;
            } else {
                $data = json_decode(file_get_contents('php://input'), true);
            }

            // Validar datos requeridos
            if (
                empty($data['obligacion_periodo_id']) || empty($data['metodo_id']) ||
                empty($data['monto_pagado_usd']) || empty($data['nro_documento'])
            ) {
                throw new Exception('Faltan datos obligatorios');
            }

            // Verificar que el periodo de obligación existe y no está pagado completamente
            $checkQuery = "SELECT op.estado, o.monto_total_usd,
                                  COALESCE(SUM(pp.monto_pagado_usd), 0) as monto_ya_pagado
                           FROM obligacion_periodo op
                           INNER JOIN obligaciones o ON op.obligacion_id = o.obligacion_id
                           LEFT JOIN pagos_proveedores pp ON op.obligacion_periodo_id = pp.obligacion_periodo_id
                           WHERE op.obligacion_periodo_id = :obligacion_periodo_id
                           GROUP BY op.obligacion_periodo_id, op.estado, o.monto_total_usd";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':obligacion_periodo_id', $data['obligacion_periodo_id']);
            $checkStmt->execute();
            $obligacionPeriodo = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$obligacionPeriodo) {
                throw new Exception('El periodo de obligación no existe');
            }

            if ($obligacionPeriodo['estado'] === 'Pagado') {
                throw new Exception('Este periodo ya está completamente pagado');
            }

            // Verificar que el monto no exceda el saldo pendiente
            $saldoPendiente = $obligacionPeriodo['monto_total_usd'] - $obligacionPeriodo['monto_ya_pagado'];
            if (floatval($data['monto_pagado_usd']) > $saldoPendiente) {
                throw new Exception('El monto del pago excede el saldo pendiente de $' . number_format($saldoPendiente, 2));
            }

            // Manejar subida de comprobante si existe
            $documento_url = null;
            if (isset($_FILES['documento_respaldo']) && $_FILES['documento_respaldo']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = '../uploads/comprobantes_proveedores/';
                if (!file_exists($upload_dir)) {
                    mkdir($upload_dir, 0777, true);
                }

                $file_extension = pathinfo($_FILES['documento_respaldo']['name'], PATHINFO_EXTENSION);
                $file_name = 'comprobante_' . time() . '_' . uniqid() . '.' . $file_extension;
                $file_path = $upload_dir . $file_name;

                if (move_uploaded_file($_FILES['documento_respaldo']['tmp_name'], $file_path)) {
                    $documento_url = $file_path;
                }
            }

            // Iniciar transacción
            $conn->beginTransaction();

            try {
                $query = "INSERT INTO pagos_proveedores (
                            obligacion_periodo_id,
                            metodo_id,
                            nro_documento,
                            banco_receptor_gasto_id,
                            banco_emisor_gasto_id,
                            tasa_cambio_aplicada,
                            fecha_pago,
                            monto_pagado_usd,
                            monto_pagado_bs,
                            numero_referencia,
                            documento_respaldo_url,
                            estado,
                            notas,
                            registrado_por
                          ) VALUES (
                            :obligacion_periodo_id,
                            :metodo_id,
                            :nro_documento,
                            :banco_receptor_gasto_id,
                            :banco_emisor_gasto_id,
                            :tasa_cambio_aplicada,
                            :fecha_pago,
                            :monto_pagado_usd,
                            :monto_pagado_bs,
                            :numero_referencia,
                            :documento_respaldo_url,
                            :estado,
                            :notas,
                            :registrado_por
                          )";

                $stmt = $conn->prepare($query);
                $stmt->bindParam(':obligacion_periodo_id', $data['obligacion_periodo_id']);
                $stmt->bindParam(':nro_documento', $data['nro_documento']);
                $stmt->bindParam(':metodo_id', $data['metodo_id']);

                // Manejar valores NULL para campos opcionales
                $banco_receptor_id = !empty($data['banco_receptor_id']) ? $data['banco_receptor_id'] : null;
                $banco_emisor_id = !empty($data['banco_emisor_id']) ? $data['banco_emisor_id'] : null;
                $tasa_cambio_aplicada = !empty($data['tasa_cambio']) ? $data['tasa_cambio'] : null;
                $numero_referencia = !empty($data['numero_referencia']) ? $data['numero_referencia'] : null;
                $notas = !empty($data['notas']) ? $data['notas'] : null;
                $monto_pagado_bs = !empty($data['monto_pagado_bs']) ? $data['monto_pagado_bs'] : null;

                $stmt->bindParam(':banco_receptor_gasto_id', $banco_receptor_id, PDO::PARAM_INT);
                $stmt->bindParam(':banco_emisor_gasto_id', $banco_emisor_id, PDO::PARAM_INT);
                $stmt->bindParam(':tasa_cambio_aplicada', $tasa_cambio_aplicada);
                $stmt->bindParam(':fecha_pago', $data['fecha_pago']);
                $stmt->bindParam(':monto_pagado_usd', $data['monto_pagado_usd']);
                $stmt->bindParam(':monto_pagado_bs', $monto_pagado_bs);
                $stmt->bindParam(':numero_referencia', $numero_referencia);
                $stmt->bindParam(':documento_respaldo_url', $documento_url);
                $estado = $data['estado'] ?? 'registrado';
                $stmt->bindParam(':estado', $estado);
                $stmt->bindParam(':notas', $notas);
                $stmt->bindParam(':registrado_por', $data['registrado_por']);

                $stmt->execute();
                $pagoId = $conn->lastInsertId();

                // Actualizar el estado del periodo de obligación
                $nuevoMontoPagado = $obligacionPeriodo['monto_ya_pagado'] + floatval($data['monto_pagado_usd']);
                $nuevoEstado = 'Pago Parcial';

                if ($nuevoMontoPagado >= $obligacionPeriodo['monto_total_usd']) {
                    $nuevoEstado = 'Pagado';
                } elseif ($nuevoMontoPagado > 0) {
                    $nuevoEstado = 'Pago Parcial';
                } else {
                    $nuevoEstado = 'Por Pagar';
                }

                $updateEstado = "UPDATE obligacion_periodo SET estado = :estado WHERE obligacion_periodo_id = :obligacion_periodo_id";
                $updateStmt = $conn->prepare($updateEstado);
                $updateStmt->bindParam(':estado', $nuevoEstado);
                $updateStmt->bindParam(':obligacion_periodo_id', $data['obligacion_periodo_id']);
                $updateStmt->execute();

                $conn->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Pago registrado exitosamente',
                    'pago_proveedor_id' => $pagoId,
                    'nuevo_estado' => $nuevoEstado
                ]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;

        case 'PUT':
            // Actualizar estado de pago (confirmar o anular)
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['pago_proveedor_id']) || empty($data['estado'])) {
                throw new Exception('ID de pago y estado son obligatorios');
            }

            $query = "UPDATE pagos_proveedores SET estado = :estado WHERE pago_proveedor_id = :pago_proveedor_id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':pago_proveedor_id', $data['pago_proveedor_id']);
            $stmt->bindParam(':estado', $data['estado']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Estado del pago actualizado exitosamente'
                ]);
            } else {
                throw new Exception('Error al actualizar el estado del pago');
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