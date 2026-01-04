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
    $requestedInmuebleId = isset($_GET['inmueble_id']) ? (int) $_GET['inmueble_id'] : null;

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
                ORDER BY i.inmueble_id ASC
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

    // Obtener periodos con pagos en verificación (al menos un detalle pendiente)
    $stmt = $pdo->prepare("
        SELECT 
            MONTH(pr.fecha_periodo) as mes,
            YEAR(pr.fecha_periodo) as anio,
            pr.fecha_periodo,
            p.estado as estado_pago,
            p.pago_id,
            p.periodo_id,
            COALESCE(SUM(CASE WHEN pd.estado = 'Pendiente' THEN 1 ELSE 0 END), 0) AS detalles_pendientes,
            COALESCE(SUM(CASE WHEN pd.estado = 'Confirmado' THEN pd.monto_usd ELSE 0 END), 0) AS monto_confirmado_usd,
            COALESCE(SUM(CASE WHEN pd.estado = 'Confirmado' THEN pd.monto_Bs ELSE 0 END), 0) AS monto_confirmado_bs,
            COALESCE(SUM(CASE WHEN pd.estado = 'Pendiente' THEN pd.monto_usd ELSE 0 END), 0) AS monto_pendiente_usd,
            COALESCE(SUM(pd.monto_usd), 0) AS monto_total_usd
        FROM pagos p
        INNER JOIN periodos pr ON p.periodo_id = pr.periodo_id
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE p.propietario_id = ? AND p.inmueble_id = ?
        GROUP BY p.pago_id, pr.fecha_periodo
        HAVING detalles_pendientes > 0
        ORDER BY pr.fecha_periodo ASC
    ");
    $stmt->execute([$propietarioId, $inmuebleId]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $pendingMonths = [];

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

        $montoConfirmadoUsd = (float) $pago['monto_confirmado_usd'];
        $montoPendienteUsd = (float) $pago['monto_pendiente_usd'];
        $montoRestanteUsd = max(0, $montoTotalUsd - $montoConfirmadoUsd);

        $pendingMonths[] = [
            'id' => (int) $pago['mes'],
            'name' => $monthNames[$pago['mes']],
            'year' => (int) $pago['anio'],
            'status' => 'verifying',
            'pago_id' => $pago['pago_id'],
            'periodo_id' => $pago['periodo_id'],
            'estado_pago' => $pago['estado_pago'],
            'detalles_pendientes' => (int) $pago['detalles_pendientes'],
            'monto_confirmado_usd' => round($montoConfirmadoUsd, 2),
            'monto_pendiente_usd' => round($montoPendienteUsd, 2),
            'monto_restante_usd' => round($montoRestanteUsd, 2),
            'monto_total_usd' => round($montoTotalUsd, 2)
        ];
    }

    echo json_encode([
        'success' => true,
        'pendingMonths' => $pendingMonths,
        'total' => count($pendingMonths)
    ]);

} catch (PDOException $e) {
    error_log("Error en get_pending_months.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo meses pendientes: ' . $e->getMessage()
    ]);
}
?>