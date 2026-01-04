<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    $userId = $_SESSION['user_id'];
    $periodoId = isset($_GET['periodo_id']) ? (int) $_GET['periodo_id'] : null;
    $fechaPeriodo = isset($_GET['fecha_periodo']) ? $_GET['fecha_periodo'] : null;
    $inmuebleId = isset($_GET['inmueble_id']) ? (int) $_GET['inmueble_id'] : null;

    // Obtener inmueble y alícuota
    if ($inmuebleId) {
        $stmt = $pdo->prepare("
            SELECT i.inmueble_id, a.alicuota, p.propietario_id
            FROM inmueble i
            INNER JOIN apartamentos a ON i.apartamento_id = a.apartamento_id
            INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
            WHERE i.inmueble_id = ? AND p.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$inmuebleId, $userId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT i.inmueble_id, a.alicuota, p.propietario_id
            FROM propietarios p
            INNER JOIN inmueble i ON p.active_inmueble_id = i.inmueble_id
            INNER JOIN apartamentos a ON i.apartamento_id = a.apartamento_id
            WHERE p.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$userId]);
    }

    $inmuebleData = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$inmuebleData) {
        echo json_encode(['success' => false, 'message' => 'No se encontró inmueble']);
        exit;
    }

    $alicuota = (float) $inmuebleData['alicuota'];
    $inmuebleId = (int) $inmuebleData['inmueble_id'];

    // Obtener o crear periodo
    if ($periodoId) {
        $stmt = $pdo->prepare("SELECT periodo_id, fecha_periodo FROM periodos WHERE periodo_id = ?");
        $stmt->execute([$periodoId]);
        $periodo = $stmt->fetch(PDO::FETCH_ASSOC);
    } elseif ($fechaPeriodo) {
        $stmt = $pdo->prepare("SELECT periodo_id, fecha_periodo FROM periodos WHERE fecha_periodo = ?");
        $stmt->execute([$fechaPeriodo]);
        $periodo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$periodo) {
            // Crear periodo si no existe
            $stmt = $pdo->prepare("INSERT INTO periodos (fecha_periodo) VALUES (?)");
            $stmt->execute([$fechaPeriodo]);
            $periodoId = (int) $pdo->lastInsertId();
            $periodo = ['periodo_id' => $periodoId, 'fecha_periodo' => $fechaPeriodo];
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Debe especificar periodo_id o fecha_periodo']);
        exit;
    }

    $periodoId = (int) $periodo['periodo_id'];
    $fechaPeriodo = $periodo['fecha_periodo'];

    // Calcular monto total del periodo según obligaciones
    // Suma de todas las obligaciones activas para este periodo
    $stmt = $pdo->prepare("
        SELECT 
            o.obligacion_id,
            o.monto_total_usd,
            o.concepto,
            o.frecuencia_pago,
            c.tipo_cuenta,
            c.nombre_cuenta
        FROM obligaciones o
        LEFT JOIN cuentas_contables c ON o.cuenta_id = c.cuenta_id
        WHERE o.activa = 1
        AND (
            (o.frecuencia_pago = 'mensual')
            OR (o.frecuencia_pago = 'unico' AND DATE_FORMAT(o.fecha_emision, '%Y-%m') = DATE_FORMAT(?, '%Y-%m'))
            OR (o.frecuencia_pago = 'bimensual' AND MOD(PERIOD_DIFF(DATE_FORMAT(?, '%Y%m'), DATE_FORMAT(o.fecha_emision, '%Y%m')), 2) = 0)
            OR (o.frecuencia_pago = 'trimestral' AND MOD(PERIOD_DIFF(DATE_FORMAT(?, '%Y%m'), DATE_FORMAT(o.fecha_emision, '%Y%m')), 3) = 0)
            OR (o.frecuencia_pago = 'anual' AND MONTH(?) = MONTH(o.fecha_emision))
        )
    ");
    $stmt->execute([$fechaPeriodo, $fechaPeriodo, $fechaPeriodo, $fechaPeriodo]);
    $obligaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $montoTotalPeriodoUsd = 0;
    $obligacionesDetalle = [];

    foreach ($obligaciones as $obligacion) {
        $montoObligacion = (float) $obligacion['monto_total_usd'];
        $montoTotalPeriodoUsd += $montoObligacion;

        $obligacionesDetalle[] = [
            'obligacion_id' => $obligacion['obligacion_id'],
            'concepto' => $obligacion['concepto'],
            'monto_usd' => $montoObligacion,
            'frecuencia' => $obligacion['frecuencia_pago'],
            'tipo_cuenta' => $obligacion['tipo_cuenta'],
            'nombre_cuenta' => $obligacion['nombre_cuenta']
        ];
    }

    // Calcular cuota del apartamento según alícuota
    $cuotaApartamentoUsd = round(($montoTotalPeriodoUsd * $alicuota) / 100, 2);

    echo json_encode([
        'success' => true,
        'periodo_id' => $periodoId,
        'fecha_periodo' => $fechaPeriodo,
        'inmueble_id' => $inmuebleId,
        'alicuota' => $alicuota,
        'monto_total_periodo_usd' => round($montoTotalPeriodoUsd, 2),
        'cuota_apartamento_usd' => $cuotaApartamentoUsd,
        'obligaciones_count' => count($obligaciones),
        'obligaciones' => $obligacionesDetalle
    ]);

} catch (PDOException $e) {
    error_log("Error en get_periodo_amount.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error calculando monto del periodo: ' . $e->getMessage()
    ]);
}
?>