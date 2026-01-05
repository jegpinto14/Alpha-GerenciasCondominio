<?php
/**
 * API para generación de recibos de condominio
 * Calcula gastos por alícuota y genera datos para PDF
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
            // Obtener datos para generar recibo
            if (isset($_GET['apartamento_id']) && isset($_GET['fecha'])) {
                $apartamentoId = intval($_GET['apartamento_id']);
                $fecha = $_GET['fecha'];

                generarDatosRecibo($conn, $apartamentoId, $fecha);
            } else {
                throw new Exception('Parámetros requeridos: apartamento_id, fecha');
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

function generarDatosRecibo($conn, $apartamentoId, $fecha)
{
    // 1. Obtener información del apartamento y propietario
    $queryApto = "SELECT 
                    a.apartamento_id,
                    a.piso,
                    a.apartamento,
                    a.alicuota,
                    p.nombre,
                    p.apellido,
                    p.nro_documento,
                    i.inmueble_id
                  FROM apartamentos a
                  LEFT JOIN inmueble i ON i.entidad_id = a.apartamento_id AND i.tipo_entidad = 'apartamento'
                  LEFT JOIN propietarios p ON p.propietario_id = i.propietario_id
                  WHERE a.apartamento_id = :apartamento_id";

    $stmtApto = $conn->prepare($queryApto);
    $stmtApto->bindParam(':apartamento_id', $apartamentoId);
    $stmtApto->execute();
    $apartamento = $stmtApto->fetch(PDO::FETCH_ASSOC);

    if (!$apartamento) {
        throw new Exception('Apartamento no encontrado');
    }

    // 2. Obtener tasa del dólar para la fecha
    $queryTasa = "SELECT tasa FROM tasas 
                  WHERE DATE(fecha) <= :fecha 
                  ORDER BY fecha DESC 
                  LIMIT 1";
    $stmtTasa = $conn->prepare($queryTasa);
    $stmtTasa->bindParam(':fecha', $fecha);
    $stmtTasa->execute();
    $tasaData = $stmtTasa->fetch(PDO::FETCH_ASSOC);
    $tasaDolar = $tasaData ? floatval($tasaData['tasa']) : 0;

    // 3. Obtener el periodo correspondiente a la fecha (opcional)
    $fechaPeriodo = date('Y-m-01', strtotime($fecha));
    $queryPeriodo = "SELECT periodo_id FROM periodos WHERE fecha_periodo = :fecha_periodo";
    $stmtPeriodo = $conn->prepare($queryPeriodo);
    $stmtPeriodo->bindParam(':fecha_periodo', $fechaPeriodo);
    $stmtPeriodo->execute();
    $periodoData = $stmtPeriodo->fetch(PDO::FETCH_ASSOC);

    // Si no existe el periodo, intentar crearlo
    if (!$periodoData) {
        $insertPeriodo = "INSERT INTO periodos (fecha_periodo) VALUES (:fecha_periodo)";
        $stmtInsert = $conn->prepare($insertPeriodo);
        $stmtInsert->bindParam(':fecha_periodo', $fechaPeriodo);
        $stmtInsert->execute();
        $periodoId = $conn->lastInsertId();
    } else {
        $periodoId = $periodoData['periodo_id'];
    }

    // 4. Obtener gastos ordinarios (gastos fijos) del periodo
    $mesPeriodo = date('Y-m', strtotime($fecha));
    $queryGastosFijos = "SELECT 
                            o.concepto,
                            o.monto_total_usd,
                            c.nombre_cuenta
                         FROM obligaciones o
                         INNER JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
                         INNER JOIN tipo_cuenta_contable tcc ON c.tipo_cuenta_contable_id = tcc.tipo_cuenta_contable_id
                         WHERE tcc.nombre_tipo_cuenta = 'Gasto Fijo'
                         AND o.activa = 1
                         AND (
                             o.frecuencia_pago != 'unico' 
                             OR DATE_FORMAT(o.fecha_emision, '%Y-%m') = :mes_periodo
                         )";

    $stmtGastosFijos = $conn->prepare($queryGastosFijos);
    $stmtGastosFijos->bindParam(':mes_periodo', $mesPeriodo);
    $stmtGastosFijos->execute();
    $gastosFijos = $stmtGastosFijos->fetchAll(PDO::FETCH_ASSOC);

    // 5. Obtener gastos extraordinarios del periodo
    $queryGastosExtra = "SELECT 
                            o.concepto,
                            o.monto_total_usd,
                            c.nombre_cuenta
                         FROM obligaciones o
                         INNER JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
                         INNER JOIN tipo_cuenta_contable tcc ON c.tipo_cuenta_contable_id = tcc.tipo_cuenta_contable_id
                         WHERE tcc.nombre_tipo_cuenta = 'Gasto Extraordinario'
                         AND o.activa = 1
                         AND (
                             o.frecuencia_pago != 'unico' 
                             OR DATE_FORMAT(o.fecha_emision, '%Y-%m') = :mes_periodo
                         )";

    $stmtGastosExtra = $conn->prepare($queryGastosExtra);
    $stmtGastosExtra->bindParam(':mes_periodo', $mesPeriodo);
    $stmtGastosExtra->execute();
    $gastosExtraordinarios = $stmtGastosExtra->fetchAll(PDO::FETCH_ASSOC);

    // 6. Obtener previsiones
    $queryPrevisiones = "SELECT 
                            o.concepto,
                            o.monto_total_usd,
                            c.nombre_cuenta
                         FROM obligaciones o
                         INNER JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
                         INNER JOIN tipo_cuenta_contable tcc ON c.tipo_cuenta_contable_id = tcc.tipo_cuenta_contable_id
                         WHERE tcc.nombre_tipo_cuenta = 'Previsiones'
                         AND o.activa = 1
                         AND (
                             o.frecuencia_pago != 'unico' 
                             OR DATE_FORMAT(o.fecha_emision, '%Y-%m') = :mes_periodo
                         )";

    $stmtPrevisiones = $conn->prepare($queryPrevisiones);
    $stmtPrevisiones->bindParam(':mes_periodo', $mesPeriodo);
    $stmtPrevisiones->execute();
    $previsiones = $stmtPrevisiones->fetchAll(PDO::FETCH_ASSOC);

    // 7. Obtener gastos variables
    $queryGastosVar = "SELECT 
                            o.concepto,
                            o.monto_total_usd,
                            c.nombre_cuenta
                         FROM obligaciones o
                         INNER JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
                         INNER JOIN tipo_cuenta_contable tcc ON c.tipo_cuenta_contable_id = tcc.tipo_cuenta_contable_id
                         WHERE tcc.nombre_tipo_cuenta = 'Gasto Variable'
                         AND o.activa = 1
                         AND (
                             o.frecuencia_pago != 'unico' 
                             OR DATE_FORMAT(o.fecha_emision, '%Y-%m') = :mes_periodo
                         )";

    $stmtGastosVar = $conn->prepare($queryGastosVar);
    $stmtGastosVar->bindParam(':mes_periodo', $mesPeriodo);
    $stmtGastosVar->execute();
    $gastosVariables = $stmtGastosVar->fetchAll(PDO::FETCH_ASSOC);

    // 8. Obtener gastos individuales (deuda de condominio del propietario)
    // Aquí buscaríamos pagos pendientes del propietario en meses anteriores
    // Por ahora lo dejamos vacío hasta tener la tabla de pagos de condominio
    $gastosIndividuales = [];

    // 9. Calcular totales aplicando alícuota
    $alicuota = floatval($apartamento['alicuota']) / 100;

    $totalGastosFijos = 0;
    foreach ($gastosFijos as &$gasto) {
        // Concatenar nombre_cuenta + concepto
        $descripcion = $gasto['nombre_cuenta'];
        if (!empty($gasto['concepto'])) {
            $descripcion .= ' ' . $gasto['concepto'];
        }
        $gasto['concepto'] = $descripcion;

        $montoTotal = floatval($gasto['monto_total_usd']);
        $gasto['monto_bs'] = $montoTotal * $tasaDolar;
        $gasto['cuota_bs'] = $gasto['monto_bs'] * $alicuota;
        $gasto['cuota_usd'] = $montoTotal * $alicuota;
        $totalGastosFijos += $gasto['cuota_usd'];
    }

    $totalGastosExtra = 0;
    foreach ($gastosExtraordinarios as &$gasto) {
        // Concatenar nombre_cuenta + concepto
        $descripcion = $gasto['nombre_cuenta'];
        if (!empty($gasto['concepto'])) {
            $descripcion .= ' ' . $gasto['concepto'];
        }
        $gasto['concepto'] = $descripcion;

        $montoTotal = floatval($gasto['monto_total_usd']);
        $gasto['monto_bs'] = $montoTotal * $tasaDolar;
        $gasto['cuota_bs'] = $gasto['monto_bs'] * $alicuota;
        $gasto['cuota_usd'] = $montoTotal * $alicuota;
        $totalGastosExtra += $gasto['cuota_usd'];
    }

    $totalPrevisiones = 0;
    foreach ($previsiones as &$gasto) {
        // Concatenar nombre_cuenta + concepto
        $descripcion = $gasto['nombre_cuenta'];
        if (!empty($gasto['concepto'])) {
            $descripcion .= ' ' . $gasto['concepto'];
        }
        $gasto['concepto'] = $descripcion;

        $montoTotal = floatval($gasto['monto_total_usd']);
        $gasto['monto_bs'] = $montoTotal * $tasaDolar;
        $gasto['cuota_bs'] = $gasto['monto_bs'] * $alicuota;
        $gasto['cuota_usd'] = $montoTotal * $alicuota;
        $totalPrevisiones += $gasto['cuota_usd'];
    }

    $totalGastosVar = 0;
    foreach ($gastosVariables as &$gasto) {
        // Concatenar nombre_cuenta + concepto
        $descripcion = $gasto['nombre_cuenta'];
        if (!empty($gasto['concepto'])) {
            $descripcion .= ' ' . $gasto['concepto'];
        }
        $gasto['concepto'] = $descripcion;

        $montoTotal = floatval($gasto['monto_total_usd']);
        $gasto['monto_bs'] = $montoTotal * $tasaDolar;
        $gasto['cuota_bs'] = $gasto['monto_bs'] * $alicuota;
        $gasto['cuota_usd'] = $montoTotal * $alicuota;
        $totalGastosVar += $gasto['cuota_usd'];
    }

    $totalGastosIndiv = 0;
    // Calcular cuando tengamos la tabla de pagos

    // Total acumulado
    $totalAcumulado = $totalGastosFijos + $totalGastosExtra + $totalGastosIndiv +
        $totalPrevisiones + $totalGastosVar;

    // 10. Obtener datos bancarios del condominio
    $queryBancoReceptor = "SELECT 
                            br.tipo_cuenta,
                            br.tipo_documento,
                            br.nro_documento,
                            br.nro_cuenta,
                            br.nro_cuenta_divisa,
                            b.nombre_banco
                          FROM banco_receptor br
                          INNER JOIN bancos b ON br.banco_id = b.banco_id
                          LIMIT 1";
    $stmtBanco = $conn->prepare($queryBancoReceptor);
    $stmtBanco->execute();
    $bancoReceptor = $stmtBanco->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'apartamento' => [
                'piso' => $apartamento['piso'],
                'nombre' => $apartamento['apartamento'],
                'alicuota' => $apartamento['alicuota']
            ],
            'propietario' => [
                'nombre' => ($apartamento['nombre'] ?? 'Sin') . ' ' . ($apartamento['apellido'] ?? 'Asignar'),
                'cedula' => $apartamento['nro_documento'] ?? 'N/A'
            ],
            'fecha' => $fecha,
            'tasa_dolar' => $tasaDolar,
            'gastos_ordinarios' => $gastosFijos,
            'gastos_extraordinarios' => $gastosExtraordinarios,
            'gastos_individuales' => $gastosIndividuales,
            'previsiones' => $previsiones,
            'gastos_variables' => $gastosVariables,
            'banco_receptor' => $bancoReceptor,
            'totales' => [
                'gastos_ordinarios' => $totalGastosFijos,
                'gastos_extraordinarios' => $totalGastosExtra,
                'gastos_individuales' => $totalGastosIndiv,
                'previsiones' => $totalPrevisiones,
                'gastos_variables' => $totalGastosVar,
                'acumulado' => $totalAcumulado
            ]
        ]
    ]);
}
?>