<?php
/**
 * API para gestión de obligaciones (facturas/gastos)
 * Operaciones: listar, crear, actualizar, cambiar estado
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';
require_once 'utils/fecha_vencimiento.php';

// Obtener método HTTP
$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = $pdo;

    switch ($method) {
        case 'GET':
            // Obtener parámetros de filtro
            $mes = isset($_GET['mes']) ? intval($_GET['mes']) : null;
            $anio = isset($_GET['anio']) ? intval($_GET['anio']) : date('Y');

            // Si se especifica mes y año, obtener obligaciones con sus periodos
            if ($mes && $anio) {
                // Obtener o crear el periodo
                $fechaPeriodo = sprintf('%04d-%02d-01', $anio, $mes);
                $periodoQuery = "SELECT periodo_id FROM periodos WHERE fecha_periodo = :fecha_periodo";
                $periodoStmt = $conn->prepare($periodoQuery);
                $periodoStmt->bindParam(':fecha_periodo', $fechaPeriodo);
                $periodoStmt->execute();
                $periodo = $periodoStmt->fetch(PDO::FETCH_ASSOC);

                if (!$periodo) {
                    // Crear el periodo si no existe
                    $insertPeriodo = "INSERT INTO periodos (fecha_periodo) VALUES (:fecha_periodo)";
                    $insertStmt = $conn->prepare($insertPeriodo);
                    $insertStmt->bindParam(':fecha_periodo', $fechaPeriodo);
                    $insertStmt->execute();
                    $periodoId = $conn->lastInsertId();
                } else {
                    $periodoId = $periodo['periodo_id'];
                }

                // Obtener obligaciones con información de periodo (solo activas)
                $query = "SELECT 
                            o.obligacion_id,
                            o.proveedor_id,
                            p.nombre_razon_social as proveedor,
                            p.nro_documento as numero_documento,
                            o.cuenta_id,
                            c.nombre_cuenta,
                            o.fecha_emision,
                            COALESCE(MAX(op.fecha_vencimiento), o.fecha_vencimiento) as fecha_vencimiento,
                            o.monto_total_usd,
                            o.concepto,
                            o.aprobado_por,
                            o.fecha_aprobacion,
                            o.frecuencia_pago,
                            o.activa,
                            o.creado_en,
                            o.actualizado_en,
                            MAX(op.obligacion_periodo_id) as obligacion_periodo_id,
                            MAX(op.estado) as estado,
                            COALESCE(SUM(pp.monto_pagado_usd), 0) as monto_pagado_usd
                          FROM obligaciones o
                          LEFT JOIN proveedores p ON o.proveedor_id = p.proveedor_id
                          LEFT JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
                          LEFT JOIN obligacion_periodo op ON o.obligacion_id = op.obligacion_id AND op.periodo_id = :periodo_id
                          LEFT JOIN pagos_proveedores pp ON op.obligacion_periodo_id = pp.obligacion_periodo_id
                          WHERE o.activa = 1
                          GROUP BY o.obligacion_id, o.proveedor_id, p.nombre_razon_social, p.nro_documento, o.cuenta_id, 
                                   c.nombre_cuenta, o.fecha_emision, o.monto_total_usd,
                                   o.concepto, o.aprobado_por, o.fecha_aprobacion, o.frecuencia_pago,
                                   o.activa, o.creado_en, o.actualizado_en, o.fecha_vencimiento
                          ORDER BY o.fecha_emision DESC";

                $stmt = $conn->prepare($query);
                $stmt->bindParam(':periodo_id', $periodoId);
                $stmt->execute();
                $obligaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Para cada obligación activa sin periodo, crear uno
                foreach ($obligaciones as &$obl) {
                    if (!$obl['obligacion_periodo_id'] && $obl['activa'] == 1) {
                        // Para obligaciones de pago único, solo crear periodo si el mes actual coincide con el mes de emisión
                        $debeCrearPeriodo = true;

                        if ($obl['frecuencia_pago'] === 'unico') {
                            // Obtener el mes/año de emisión de la obligación
                            $fechaEmision = new DateTime($obl['fecha_emision']);
                            $mesEmision = $fechaEmision->format('Y-m');

                            // Obtener el mes/año del periodo solicitado
                            $queryPeriodo = "SELECT fecha_periodo FROM periodos WHERE periodo_id = :periodo_id";
                            $stmtPeriodo = $conn->prepare($queryPeriodo);
                            $stmtPeriodo->bindParam(':periodo_id', $periodoId);
                            $stmtPeriodo->execute();
                            $periodo = $stmtPeriodo->fetch(PDO::FETCH_ASSOC);

                            if ($periodo) {
                                $fechaPeriodo = new DateTime($periodo['fecha_periodo']);
                                $mesPeriodo = $fechaPeriodo->format('Y-m');

                                // Solo crear periodo si coincide con el mes de emisión
                                $debeCrearPeriodo = ($mesEmision === $mesPeriodo);
                            }
                        }

                        if ($debeCrearPeriodo) {
                            // Calcular fecha de vencimiento ajustada para el periodo
                            $queryPeriodoFecha = "SELECT fecha_periodo FROM periodos WHERE periodo_id = :periodo_id";
                            $stmtPeriodoFecha = $conn->prepare($queryPeriodoFecha);
                            $stmtPeriodoFecha->bindParam(':periodo_id', $periodoId);
                            $stmtPeriodoFecha->execute();
                            $periodoFecha = $stmtPeriodoFecha->fetch(PDO::FETCH_ASSOC);
                            
                            $fechaVencimientoAjustada = calcularFechaVencimientoAjustada(
                                $obl['fecha_vencimiento'],
                                $periodoFecha['fecha_periodo']
                            );

                            // Crear obligacion_periodo si no existe y la obligación está activa
                            $insertOP = "INSERT INTO obligacion_periodo (obligacion_id, periodo_id, estado, fecha_vencimiento) 
                                        VALUES (:obligacion_id, :periodo_id, 'Por Pagar', :fecha_vencimiento)";
                            $insertOPStmt = $conn->prepare($insertOP);
                            $insertOPStmt->bindParam(':obligacion_id', $obl['obligacion_id']);
                            $insertOPStmt->bindParam(':periodo_id', $periodoId);
                            $insertOPStmt->bindParam(':fecha_vencimiento', $fechaVencimientoAjustada);
                            $insertOPStmt->execute();

                            $obl['obligacion_periodo_id'] = $conn->lastInsertId();
                            $obl['estado'] = 'Por Pagar';
                            $obl['monto_pagado_usd'] = 0;
                            $obl['fecha_vencimiento'] = $fechaVencimientoAjustada;
                        }
                    }

                    $obl['saldo_pendiente_usd'] = $obl['monto_total_usd'] - $obl['monto_pagado_usd'];
                    $obl['periodo_id'] = $periodoId;
                }
                unset($obl);

                // Filtrar obligaciones de pago único que no pertenecen a este periodo
                $queryPeriodo = "SELECT fecha_periodo FROM periodos WHERE periodo_id = :periodo_id";
                $stmtPeriodo = $conn->prepare($queryPeriodo);
                $stmtPeriodo->bindParam(':periodo_id', $periodoId);
                $stmtPeriodo->execute();
                $periodo = $stmtPeriodo->fetch(PDO::FETCH_ASSOC);

                if ($periodo) {
                    $fechaPeriodo = new DateTime($periodo['fecha_periodo']);
                    $mesPeriodo = $fechaPeriodo->format('Y-m');

                    $obligaciones = array_filter($obligaciones, function ($obl) use ($mesPeriodo) {
                        // Si es pago único, solo mostrar si el mes de emisión coincide con el periodo
                        if ($obl['frecuencia_pago'] === 'unico') {
                            $fechaEmision = new DateTime($obl['fecha_emision']);
                            $mesEmision = $fechaEmision->format('Y-m');
                            return $mesEmision === $mesPeriodo;
                        }
                        // Para otros tipos de frecuencia, siempre mostrar
                        return true;
                    });

                    // Reindexar el array
                    $obligaciones = array_values($obligaciones);
                }
            } else {
                // Sin filtro de periodo, obtener todas las obligaciones
                $query = "SELECT 
                            o.obligacion_id,
                            o.proveedor_id,
                            p.nombre_razon_social as proveedor,
                            o.cuenta_id,
                            c.nombre_cuenta,
                            o.fecha_emision,
                            o.fecha_vencimiento,
                            o.monto_total_usd,
                            o.concepto,
                            o.aprobado_por,
                            o.fecha_aprobacion,
                            o.frecuencia_pago,
                            o.creado_en,
                            o.actualizado_en
                          FROM obligaciones o
                          LEFT JOIN proveedores p ON o.proveedor_id = p.proveedor_id
                          LEFT JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
                          ORDER BY o.fecha_emision DESC";

                $stmt = $conn->prepare($query);
                $stmt->execute();
                $obligaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // Calcular resumen
            $totalPendiente = 0;
            $totalPagado = 0;
            $pendientes = 0;
            $pagadas = 0;

            foreach ($obligaciones as $obl) {
                if (isset($obl['saldo_pendiente_usd'])) {
                    // Total pendiente por pagar (saldo restante)
                    $totalPendiente += floatval($obl['saldo_pendiente_usd']);

                    // Total pagado (monto pagado de todas las obligaciones)
                    $totalPagado += floatval($obl['monto_pagado_usd']);

                    // Contar estados
                    if ($obl['estado'] === 'Por Pagar' || $obl['estado'] === 'Pago Parcial') {
                        $pendientes++;
                    } elseif ($obl['estado'] === 'Pagado') {
                        $pagadas++;
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'data' => $obligaciones,
                'resumen' => [
                    'total_pendiente_usd' => $totalPendiente,
                    'total_pagado_usd' => $totalPagado,
                    'cantidad_total' => count($obligaciones),
                    'cantidad_pendientes' => $pendientes,
                    'cantidad_pagadas' => $pagadas
                ]
            ]);
            break;

        case 'PUT':
            // Actualizar obligación (incluyendo culminar/desactivar)
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['obligacion_id'])) {
                throw new Exception('ID de obligación requerido');
            }

            // Si solo se quiere cambiar el estado activa
            if (isset($data['activa']) && count($data) == 2) {
                $query = "UPDATE obligaciones SET activa = :activa WHERE obligacion_id = :obligacion_id";
                $stmt = $conn->prepare($query);
                $stmt->bindParam(':activa', $data['activa']);
                $stmt->bindParam(':obligacion_id', $data['obligacion_id']);
                $stmt->execute();

                echo json_encode([
                    'success' => true,
                    'message' => $data['activa'] ? 'Obligación reactivada' : 'Obligación culminada exitosamente'
                ]);
            } else {
                // Actualización completa de la obligación
                $query = "UPDATE obligaciones SET 
                            proveedor_id = :proveedor_id,
                            cuenta_id = :cuenta_id,
                            fecha_emision = :fecha_emision,
                            fecha_vencimiento = :fecha_vencimiento,
                            monto_total_usd = :monto_total_usd,
                            concepto = :concepto,
                            aprobado_por = :aprobado_por,
                            fecha_aprobacion = :fecha_aprobacion,
                            frecuencia_pago = :frecuencia_pago
                          WHERE obligacion_id = :obligacion_id";

                $stmt = $conn->prepare($query);
                $stmt->bindParam(':obligacion_id', $data['obligacion_id']);
                $stmt->bindParam(':proveedor_id', $data['proveedor_id']);
                $stmt->bindParam(':cuenta_id', $data['cuenta_id']);
                $stmt->bindParam(':fecha_emision', $data['fecha_emision']);
                $stmt->bindParam(':fecha_vencimiento', $data['fecha_vencimiento']);
                $stmt->bindParam(':monto_total_usd', $data['monto_total_usd']);
                $stmt->bindParam(':concepto', $data['concepto']);
                $stmt->bindParam(':aprobado_por', $data['aprobado_por']);
                $stmt->bindParam(':fecha_aprobacion', $data['fecha_aprobacion']);
                $stmt->bindParam(':frecuencia_pago', $data['frecuencia_pago']);
                $stmt->execute();

                echo json_encode([
                    'success' => true,
                    'message' => 'Obligación actualizada exitosamente'
                ]);
            }
            break;

        case 'POST':
            // Crear nueva obligación
            $data = json_decode(file_get_contents('php://input'), true);

            // Validar datos requeridos
            if (
                empty($data['proveedor_id']) || empty($data['cuenta_id']) ||
                empty($data['monto_total_usd'])
            ) {
                throw new Exception('Faltan datos obligatorios');
            }

            $query = "INSERT INTO obligaciones (
                        proveedor_id,
                        cuenta_id,
                        fecha_emision,
                        fecha_vencimiento,
                        monto_total_usd,
                        concepto,
                        aprobado_por,
                        fecha_aprobacion,
                        frecuencia_pago
                      ) VALUES (
                        :proveedor_id,
                        :cuenta_id,
                        :fecha_emision,
                        :fecha_vencimiento,
                        :monto_total_usd,
                        :concepto,
                        :aprobado_por,
                        :fecha_aprobacion,
                        :frecuencia_pago
                      )";

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':proveedor_id', $data['proveedor_id']);
            $stmt->bindParam(':cuenta_id', $data['cuenta_id']);
            $stmt->bindParam(':fecha_emision', $data['fecha_emision']);
            $stmt->bindParam(':fecha_vencimiento', $data['fecha_vencimiento']);
            $stmt->bindParam(':monto_total_usd', $data['monto_total_usd']);
            $stmt->bindParam(':concepto', $data['concepto']);
            $stmt->bindParam(':aprobado_por', $data['aprobado_por']);
            $stmt->bindParam(':fecha_aprobacion', $data['fecha_aprobacion']);
            $frecuencia_pago = $data['frecuencia_pago'] ?? 'mensual';
            $stmt->bindParam(':frecuencia_pago', $frecuencia_pago);

            if ($stmt->execute()) {
                $obligacionId = $conn->lastInsertId();

                echo json_encode([
                    'success' => true,
                    'message' => 'Obligación registrada exitosamente',
                    'obligacion_id' => $obligacionId
                ]);
            } else {
                throw new Exception('Error al registrar la obligación');
            }
            break;

        case 'DELETE':
            // Eliminar obligación
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['obligacion_id'])) {
                throw new Exception('ID de obligación es obligatorio');
            }

            // Verificar si la obligación tiene periodos con pagos asociados
            $checkQuery = "SELECT COUNT(*) as total 
                          FROM obligacion_periodo op
                          INNER JOIN pagos_proveedores pp ON op.obligacion_periodo_id = pp.obligacion_periodo_id
                          WHERE op.obligacion_id = :obligacion_id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':obligacion_id', $data['obligacion_id']);
            $checkStmt->execute();
            $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($result['total'] > 0) {
                throw new Exception('No se puede eliminar la obligación porque tiene pagos asociados');
            }

            // Eliminar primero los registros de obligacion_periodo
            $deleteOP = "DELETE FROM obligacion_periodo WHERE obligacion_id = :obligacion_id";
            $deleteOPStmt = $conn->prepare($deleteOP);
            $deleteOPStmt->bindParam(':obligacion_id', $data['obligacion_id']);
            $deleteOPStmt->execute();

            // Eliminar la obligación
            $query = "DELETE FROM obligaciones WHERE obligacion_id = :obligacion_id";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':obligacion_id', $data['obligacion_id']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Obligación eliminada exitosamente'
                ]);
            } else {
                throw new Exception('Error al eliminar la obligación');
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