<?php
/**
 * API para obtener recibos individuales por transacción confirmada
 * 
 * Lógica refactorizada: Se centra en pago_detalles para generar un recibo
 * por cada abono/pago confirmado, incluso si varios abonos corresponden al mismo período.
 * 
 * @author Refactorizado para Arcorui Community
 * @date 2025-10-30
 */

header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    $inmuebleId = isset($_GET['inmueble_id']) ? (int) $_GET['inmueble_id'] : null;
    $propietarioId = isset($_GET['propietario_id']) ? (int) $_GET['propietario_id'] : null;

    if (empty($inmuebleId) || empty($propietarioId)) {
        echo json_encode(['success' => false, 'message' => 'Parámetros inválidos']);
        exit;
    }

    /**
     * CONSULTA REFACTORIZADA:
     * - Tabla principal: pago_detalles (cada registro = una transacción/abono)
     * - Devuelve todos los estados: Pendiente, Rechazado, Confirmado
     * - Resultado: Un recibo por cada abono registrado
     */
    $stmt = $pdo->prepare("
        SELECT 
            pd.pago_detalle_id,
            pd.pago_id,
            pd.fecha as fecha_pago,
            pr.fecha_periodo,
            MONTH(pr.fecha_periodo) as mes,
            YEAR(pr.fecha_periodo) as anio,
            pd.monto_usd,
            pd.monto_Bs,
            pd.metodo_id,
            mp.descripcion as metodo_pago,
            pd.estado as estado_detalle,
            pag.estado as estado_pago,
            t.tasa
        FROM pago_detalles pd
        INNER JOIN pagos pag ON pd.pago_id = pag.pago_id
        INNER JOIN periodos pr ON pag.periodo_id = pr.periodo_id
        INNER JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        LEFT JOIN tasas t ON pd.tasa_id = t.tasa_id
        WHERE pag.propietario_id = ?
          AND pag.inmueble_id = ?
        ORDER BY pd.fecha DESC, pr.fecha_periodo DESC
    ");
    $stmt->execute([$propietarioId, $inmuebleId]);
    $detallesPagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Nombres de meses en español
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

    $recibos = [];

    /**
     * Procesamiento de recibos:
     * Cada registro de pago_detalles genera un recibo individual
     * Incluye todos los estados: Pendiente, Rechazado, Confirmado
     */
    foreach ($detallesPagos as $detalle) {
        // Verificar si es un pago de deuda (mes = 0)
        if ($detalle['mes'] == 0) {
            $mesNombre = 'Pago Deuda';
            $periodoDisplay = 'Pago Deuda';
        } else {
            $mesNombre = $monthNames[$detalle['mes']] ?? 'Desconocido';
            $periodoDisplay = $mesNombre . ' ' . $detalle['anio'];
        }

        // Formatear fecha de pago (fecha de la transacción)
        $fechaPagoFormateada = date('Y-m-d', strtotime($detalle['fecha_pago']));

        // Generar URL dinámica para descargar el recibo individual
        // Nota: Se usa pago_detalle_id para identificar el recibo específico
        $downloadUrl = 'api/generate_payment_receipt.php?payment_detail_id=' . $detalle['pago_detalle_id'];

        $recibos[] = [
            'id' => $detalle['pago_detalle_id'], // ID único del recibo (detalle)
            'pago_id' => $detalle['pago_id'], // ID del pago padre (período)
            'pago_detalle_id' => $detalle['pago_detalle_id'], // ID del detalle/transacción
            'mes' => $periodoDisplay, // Mes correspondiente al período o "Pago Deuda"
            'anio' => $detalle['anio'],
            'monto_bs' => number_format($detalle['monto_Bs'], 2, '.', ','),
            'monto_dolares' => number_format($detalle['monto_usd'], 2, '.', ','),
            'metodo_pago' => $detalle['metodo_pago'],
            'fecha_pago' => $fechaPagoFormateada, // Fecha real de la transacción
            'fecha_aprobacion' => $fechaPagoFormateada, // Fecha de aprobación/confirmación
            'estado_detalle' => $detalle['estado_detalle'],
            'estado_pago' => $detalle['estado_pago'],
            'tasa' => $detalle['tasa'],
            'filename' => 'Recibo_' . $detalle['pago_detalle_id'] . '_' . str_replace(' ', '_', $mesNombre) . '_' . $detalle['anio'] . '.pdf',
            'download_url' => $downloadUrl
        ];
    }

    echo json_encode([
        'success' => true,
        'recibos' => $recibos,
        'total' => count($recibos),
        'message' => count($recibos) . ' recibo(s) encontrado(s)'
    ]);

} catch (Exception $e) {
    error_log("Error en get_recibos.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo recibos: ' . $e->getMessage()
    ]);
}
?>