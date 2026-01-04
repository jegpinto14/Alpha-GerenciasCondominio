<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener propietario_id e inmueble_id del usuario actual
    $userId = $_SESSION['user_id'];
    $requestedInmuebleId = isset($_GET['inmueble_id']) ? (int) $_GET['inmueble_id'] : null;

    $montoMensualUsd = null;

    if ($requestedInmuebleId > 0) {
        $stmt = $pdo->prepare("
            SELECT 
                p.propietario_id,
                i.inmueble_id,
                a.alicuota
            FROM inmueble i
            INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
            INNER JOIN apartamentos a ON i.apartamento_id = a.apartamento_id
            WHERE i.inmueble_id = ? AND p.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$requestedInmuebleId, $userId]);
        $userData = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$userData) {
            echo json_encode(['success' => false, 'message' => 'El inmueble seleccionado no pertenece al usuario']);
            exit;
        }
        $propietarioId = (int) $userData['propietario_id'];
        $inmuebleId = (int) $userData['inmueble_id'];
        $alicuota = (float) $userData['alicuota'];
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                propietario_id,
                active_inmueble_id
            FROM propietarios
            WHERE user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $propietario = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$propietario) {
            echo json_encode(['success' => false, 'message' => 'No se encontró propietario registrado']);
            exit;
        }
        $propietarioId = (int) $propietario['propietario_id'];
        $activeInmuebleId = $propietario['active_inmueble_id'] ? (int) $propietario['active_inmueble_id'] : null;

        $inmuebleId = null;
        $alicuota = null;
        if ($activeInmuebleId) {
            $stmt = $pdo->prepare("
                SELECT i.inmueble_id, a.alicuota
                FROM inmueble i
                INNER JOIN apartamentos a ON i.apartamento_id = a.apartamento_id
                WHERE i.inmueble_id = ? AND i.propietario_id = ?
                LIMIT 1
            ");
            $stmt->execute([$activeInmuebleId, $propietarioId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $inmuebleId = (int) $row['inmueble_id'];
                $alicuota = (float) $row['alicuota'];
            }
        }

        if (!$inmuebleId) {
            $stmt = $pdo->prepare("
                SELECT i.inmueble_id, a.alicuota
                FROM inmueble i
                INNER JOIN apartamentos a ON i.apartamento_id = a.apartamento_id
                WHERE i.propietario_id = ?
                ORDER BY inmueble_id ASC
                LIMIT 1
            ");
            $stmt->execute([$propietarioId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                echo json_encode(['success' => false, 'message' => 'No se encontró inmueble registrado']);
                exit;
            }
            $inmuebleId = (int) $row['inmueble_id'];
            $alicuota = (float) $row['alicuota'];
        }
    }

    // Función para calcular monto del periodo según obligaciones
    function calcularMontoPeriodo($pdo, $fechaPeriodo, $alicuota)
    {
        $stmt = $pdo->prepare("
            SELECT 
                o.obligacion_id,
                o.monto_total_usd,
                o.frecuencia_pago,
                o.fecha_emision
            FROM obligaciones o
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

        $montoTotalPeriodo = 0;
        foreach ($obligaciones as $obligacion) {
            $montoTotalPeriodo += (float) $obligacion['monto_total_usd'];
        }

        // Calcular cuota según alícuota
        return round(($montoTotalPeriodo * $alicuota) / 100, 2);
    }

    // Obtener todos los pagos con sus totales y detalles confirmados / pendientes
    $stmt = $pdo->prepare("
        SELECT 
            MONTH(pr.fecha_periodo) as mes,
            YEAR(pr.fecha_periodo) as anio,
            pr.fecha_periodo,
            p.estado as estado_pago,
            p.pago_id,
            p.periodo_id,
            COALESCE(SUM(CASE WHEN pd.estado = 'Confirmado' THEN pd.monto_Bs ELSE 0 END), 0) AS monto_confirmado_bs,
            COALESCE(SUM(CASE WHEN pd.estado = 'Confirmado' THEN pd.monto_usd ELSE 0 END), 0) AS monto_confirmado_usd,
            COALESCE(SUM(CASE WHEN pd.estado = 'Pendiente' THEN pd.monto_usd ELSE 0 END), 0) AS monto_pendiente_usd,
            COALESCE(SUM(pd.monto_usd), 0) AS monto_total_detalle_usd,
            COALESCE(SUM(CASE WHEN pd.estado = 'Pendiente' THEN 1 ELSE 0 END), 0) AS detalles_pendientes
        FROM pagos p
        INNER JOIN periodos pr ON p.periodo_id = pr.periodo_id
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE p.propietario_id = ? AND p.inmueble_id = ? 
        AND p.estado IN ('Pagado', 'Pago Parcial')
        GROUP BY p.pago_id, pr.fecha_periodo
        ORDER BY pr.fecha_periodo ASC
    ");
    $stmt->execute([$propietarioId, $inmuebleId]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $paidMonths = [];

    // Nombres de meses
    $monthNames = [
        1 => 'Enero',
        2 => 'Febrero',
        3 => 'Marzo',
        4 => 'Abril',
        5 => 'Mayo',
        6 => 'Junio',
        7 => 'Julio',
        8 => 'Agosto',
        9 => 'Septiembre',
        10 => 'Octubre',
        11 => 'Noviembre',
        12 => 'Diciembre'
    ];

    foreach ($pagos as $pago) {
        // Calcular monto del periodo dinámicamente según obligaciones
        $fechaPeriodo = $pago['fecha_periodo'];
        $montoTotalUsd = calcularMontoPeriodo($pdo, $fechaPeriodo, $alicuota);

        $estadoPago = $pago['estado_pago'];
        $montoPagadoUsd = (float) $pago['monto_confirmado_usd'];
        $montoPagadoBs = (float) $pago['monto_confirmado_bs'];
        $montoPendienteUsd = (float) $pago['monto_pendiente_usd'];
        $montoRestanteUsd = max(0, $montoTotalUsd - $montoPagadoUsd);
        $status = 'paid';

        $hasPendingVerification = ((int) $pago['detalles_pendientes']) > 0;

        if ($estadoPago === 'Pagado') {
            // Si la cabecera está pagada, consideramos el mes cubierto
            if ($montoPagadoUsd < $montoTotalUsd) {
                $montoPagadoUsd = $montoTotalUsd;
                $montoPagadoBs = $montoPagadoBs > 0 ? $montoPagadoBs : round($montoTotalUsd * $exchangeRate, 2);
            }
            $montoRestanteUsd = 0.0;
            $status = 'paid';
        } elseif ($estadoPago === 'Pago Parcial') {
            $status = $hasPendingVerification ? 'verifying' : 'partial';
        }

        $estadoDetalle = $hasPendingVerification ? 'Pendiente' : 'Confirmado';

        $paidMonths[] = [
            'id' => (int) $pago['mes'],
            'name' => $monthNames[$pago['mes']],
            'year' => (int) $pago['anio'],
            'status' => $status,
            'pago_id' => $pago['pago_id'],
            'periodo_id' => $pago['periodo_id'],
            'monto_pagado_usd' => round($montoPagadoUsd, 2),
            'monto_pagado_bs' => round($montoPagadoBs, 2),
            'monto_pendiente_usd' => round($montoPendienteUsd, 2),
            'monto_restante_usd' => round($montoRestanteUsd, 2),
            'monto_total_usd' => $montoTotalUsd,
            'estado_pago' => $estadoPago,
            'estado_detalle' => $estadoDetalle,
            'has_pending_verification' => $hasPendingVerification
        ];
    }

    echo json_encode([
        'success' => true,
        'paidMonths' => $paidMonths,
        'total' => count($paidMonths)
    ]);

} catch (PDOException $e) {
    error_log("Error en get_paid_months.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo meses pagados: ' . $e->getMessage()
    ]);
}
?>