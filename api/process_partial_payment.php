<?php
// Configurar manejo de errores para evitar output HTML
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores en pantalla
ini_set('log_errors', 1); // Registrar errores en log

session_start();
header('Content-Type: application/json');

if (!function_exists('returnJsonError')) {
    function returnJsonError($message)
    {
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }
}

if (!function_exists('returnJsonSuccess')) {
    function returnJsonSuccess($message, $data = [])
    {
        echo json_encode(['success' => true, 'message' => $message] + $data);
        exit;
    }
}

try {
    require_once '../includes/database.php';
} catch (Exception $e) {
    error_log("Error cargando database.php: " . $e->getMessage());
    returnJsonError('Error de configuración del servidor');
}

if (!isset($_SESSION['user_id'])) {
    returnJsonError('No autorizado');
}

if (!function_exists('monthNameToNumber')) {
    function monthNameToNumber(string $name): int
    {
        static $map = [
        'enero' => 1,
        'febrero' => 2,
        'marzo' => 3,
        'abril' => 4,
        'mayo' => 5,
        'junio' => 6,
        'julio' => 7,
        'agosto' => 8,
        'septiembre' => 9,
        'setiembre' => 9,
        'octubre' => 10,
        'noviembre' => 11,
        'diciembre' => 12,
        ];

        $normalized = strtolower(trim($name));
        return $map[$normalized] ?? (int) date('n');
    }
}

if (!function_exists('findOrCreateTasaId')) {
    function findOrCreateTasaId(PDO $pdo, float $rate, string $paymentDate): int
    {
        $date = new DateTime($paymentDate);
        $startOfDay = $date->format('Y-m-d 00:00:00');
        $endOfDay = $date->format('Y-m-d 23:59:59');

        $stmt = $pdo->prepare("SELECT tasa_id FROM tasas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC LIMIT 1");
        $stmt->execute([$startOfDay, $endOfDay]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return (int) $row['tasa_id'];
        }

        $stmt = $pdo->prepare("INSERT INTO tasas (tasa, fecha) VALUES (?, ?)");
        $stmt->execute([$rate, $date->format('Y-m-d H:i:s')]);
        return (int) $pdo->lastInsertId();
    }
}

if (!function_exists('distributePaymentDeterministic')) {
    function distributePaymentDeterministic(array $months, float $totalUsd, float $exchangeRate): array
    {
        if ($exchangeRate <= 0) {
            throw new InvalidArgumentException('La tasa de cambio debe ser mayor a 0');
        }

        $monthsPrepared = [];
        foreach ($months as $month) {
            $id = null;
            $name = null;
            $usdAmount = 0.0;
            $monthNumber = null;

            if (is_array($month)) {
                $id = $month['id'] ?? null;
                $name = $month['name'] ?? ('Mes ' . ($id ?? ''));
                $usdAmount = isset($month['usdAmount']) ? (float) $month['usdAmount'] : 0.0;
                $monthNumber = $month['monthNumber'] ?? null;
            } else {
                $id = $month;
                $name = 'Mes ' . $month;
            }

            if ($usdAmount <= 0) {
                $usdAmount = 0.0;
            }

            if (!$monthNumber && $name) {
                $monthNumber = monthNameToNumber($name);
            }

            $monthsPrepared[] = [
                'monthId' => $id,
                'monthName' => $name,
                'monthNumber' => $monthNumber ?? monthNameToNumber($name ?? ''),
                'usdAmount' => $usdAmount,
            ];
        }

        usort($monthsPrepared, static function ($a, $b) {
            return ($a['monthNumber'] ?? 13) <=> ($b['monthNumber'] ?? 13);
        });

        $remainingUsd = $totalUsd;
        $distribution = [];

        foreach ($monthsPrepared as $month) {
            $desiredUsd = $month['usdAmount'] > 0 ? $month['usdAmount'] : ($remainingUsd > 0 ? $remainingUsd : 0);
            if ($desiredUsd <= 0) {
                $desiredUsd = 0.0;
            }

            $paidUsd = min($desiredUsd, $remainingUsd);
            $paidBs = round($paidUsd * $exchangeRate, 2);
            $totalBs = round($desiredUsd * $exchangeRate, 2);
            $remainingUsd -= $paidUsd;

            $distribution[] = [
                'monthId' => $month['monthId'],
                'monthName' => $month['monthName'],
                'totalAmountUsd' => round($desiredUsd, 2),
                'totalAmountBs' => $totalBs,
                'paidAmountUsd' => round($paidUsd, 2),
                'paidAmountBs' => $paidBs,
                'remainingAmountUsd' => round(max($desiredUsd - $paidUsd, 0), 2),
                'remainingAmountBs' => round(max($totalBs - $paidBs, 0), 2),
                'isFullyPaid' => $paidUsd >= $desiredUsd && $desiredUsd > 0,
            ];

            if ($remainingUsd <= 0) {
                break;
            }
        }

        $missing = count($monthsPrepared) - count($distribution);
        while ($missing > 0) {
            $month = $monthsPrepared[count($distribution)];
            $distribution[] = [
                'monthId' => $month['monthId'],
                'monthName' => $month['monthName'],
                'totalAmountUsd' => round($month['usdAmount'], 2),
                'totalAmountBs' => round($month['usdAmount'] * $exchangeRate, 2),
                'paidAmountUsd' => 0.0,
                'paidAmountBs' => 0.0,
                'remainingAmountUsd' => round($month['usdAmount'], 2),
                'remainingAmountBs' => round($month['usdAmount'] * $exchangeRate, 2),
                'isFullyPaid' => false,
            ];
            $missing--;
        }

        return $distribution;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $months = json_decode($_POST['months'] ?? '[]', true) ?? [];
        $paymentMethod = $_POST['payment_method'] ?? '';
        $totalBs = isset($_POST['total_bs']) ? (float) $_POST['total_bs'] : 0.0;
        $totalUsd = isset($_POST['total_usd']) ? (float) $_POST['total_usd'] : 0.0;
        $paymentDistribution = json_decode($_POST['payment_distribution'] ?? '[]', true);
        $exchangeRate = isset($_POST['exchange_rate']) ? (float) $_POST['exchange_rate'] : 0.0;
        $paymentDate = $_POST['payment_date'] ?? date('Y-m-d');

        // Datos del formulario
        $phoneNumber = $_POST['phoneNumber'] ?? '';
        $cedula = $_POST['cedula'] ?? '';
        $tipoDocumento = $_POST['tipo_documento'] ?? 'V';
        $banco = $_POST['banco'] ?? '';
        $referencia = $_POST['referencia'] ?? '';

        error_log("📋 Datos recibidos del formulario (partial):" . print_r($_POST, true));

        $comprobantePath = null;
        if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../uploads/comprobantes/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $fileExtension = pathinfo($_FILES['comprobante']['name'], PATHINFO_EXTENSION);
            $fileName = 'comprobante_' . time() . '_' . $_SESSION['user_id'] . '.' . $fileExtension;
            $comprobantePath = $uploadDir . $fileName;

            if (!move_uploaded_file($_FILES['comprobante']['tmp_name'], $comprobantePath)) {
                returnJsonError('Error subiendo comprobante');
            }
        }

        if (empty($months)) {
            returnJsonError('No se seleccionaron meses');
        }

        if ($exchangeRate <= 0) {
            returnJsonError('La tasa de cambio es inválida');
        }

        if ($totalUsd <= 0 && !empty($paymentDistribution)) {
            $totalUsd = array_reduce($paymentDistribution, static function ($carry, $item) {
                return $carry + (float) ($item['paidAmountUsd'] ?? 0);
            }, 0.0);
            $totalBs = round($totalUsd * $exchangeRate, 2);
        }

        if ($totalUsd <= 0) {
            returnJsonError('El monto total USD es inválido');
        }

        if ($totalBs <= 0) {
            $totalBs = round($totalUsd * $exchangeRate, 2);
        }

        // Obtener propietarioId e inmuebleId del usuario actual usando active_inmueble_id
        $stmt = $pdo->prepare("SELECT 
            p.propietario_id,
            p.active_inmueble_id
            FROM propietarios p
            WHERE p.user_id = ?
            LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $userData = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$userData) {
            returnJsonError('No se encontró propietario registrado');
        }

        $propietarioId = (int) $userData['propietario_id'];
        $activeInmuebleId = $userData['active_inmueble_id'] ? (int) $userData['active_inmueble_id'] : null;

        // Si no hay inmueble activo, buscar el primero disponible
        if (!$activeInmuebleId) {
            $stmtInmueble = $pdo->prepare("SELECT inmueble_id FROM inmueble WHERE propietario_id = ? LIMIT 1");
            $stmtInmueble->execute([$propietarioId]);
            $inmuebleData = $stmtInmueble->fetch(PDO::FETCH_ASSOC);

            if (!$inmuebleData) {
                returnJsonError('No se encontró inmueble registrado para este propietario');
            }

            $inmuebleId = (int) $inmuebleData['inmueble_id'];
        } else {
            $inmuebleId = $activeInmuebleId;
        }

        $metodoPagoMap = [
            'pago_movil' => 1,
            'transferencia' => 4,
            'efectivo_divisa' => 2,
            'efectivo_bs' => 3,
            'donacion' => 5,
            'debito' => 6,
            'credito' => 7
        ];

        $metodoId = $metodoPagoMap[$paymentMethod] ?? 3;

        $pdo->beginTransaction();

        if (empty($paymentDistribution)) {
            $paymentDistribution = distributePaymentDeterministic($months, $totalUsd, $exchangeRate);
        }

        $tasaId = findOrCreateTasaId($pdo, $exchangeRate, $paymentDate);

        $isDeudaAcumulada = isset($_GET['type']) && $_GET['type'] === 'deuda_acumulada';

        if ($isDeudaAcumulada) {
            processDeudaAcumulada(
                $pdo,
                $propietarioId,
                $inmuebleId,
                $metodoId,
                $tasaId,
                $totalUsd,
                $totalBs,
                $exchangeRate,
                $phoneNumber,
                $cedula,
                $tipoDocumento,
                $banco,
                $referencia,
                $comprobantePath,
                $paymentDate
            );
        } else {
            foreach ($paymentDistribution as $distribution) {
                $monthId = $distribution['monthId'] ?? null;
                $monthName = $distribution['monthName'] ?? '';
                $paidUsd = isset($distribution['paidAmountUsd']) ? (float) $distribution['paidAmountUsd'] : 0.0;
                $paidBs = isset($distribution['paidAmountBs']) ? (float) $distribution['paidAmountBs'] : round($paidUsd * $exchangeRate, 2);
                $totalMonthUsd = isset($distribution['totalAmountUsd']) ? (float) $distribution['totalAmountUsd'] : $paidUsd;
                $isFullyPaid = !empty($distribution['isFullyPaid']);

                if ($paidUsd <= 0 && $paidBs <= 0) {
                    continue;
                }

                $monthNumber = $monthId !== null ? (int) $monthId : monthNameToNumber($monthName);
                $year = date('Y');
                $fechaPeriodo = sprintf('%04d-%02d-01', $year, $monthNumber);

                $stmt = $pdo->prepare("SELECT periodo_id FROM periodos WHERE fecha_periodo = ?");
                $stmt->execute([$fechaPeriodo]);
                $periodo = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($periodo) {
                    $periodoId = (int) $periodo['periodo_id'];
                } else {
                    $stmtInsertPeriodo = $pdo->prepare("INSERT INTO periodos (fecha_periodo) VALUES (?)");
                    $stmtInsertPeriodo->execute([$fechaPeriodo]);
                    $periodoId = (int) $pdo->lastInsertId();
                }

                $estadoPago = 'Pendiente';

                $stmtPago = $pdo->prepare("SELECT pago_id, estado FROM pagos WHERE propietario_id = ? AND inmueble_id = ? AND periodo_id = ? LIMIT 1 FOR UPDATE");
                $stmtPago->execute([$propietarioId, $inmuebleId, $periodoId]);
                $existingPago = $stmtPago->fetch(PDO::FETCH_ASSOC);

                if ($existingPago) {
                    $pagoId = (int) $existingPago['pago_id'];
                } else {
                    $stmtInsertPago = $pdo->prepare("INSERT INTO pagos (propietario_id, inmueble_id, periodo_id, estado) VALUES (?, ?, ?, ?)");
                    $stmtInsertPago->execute([
                        $propietarioId,
                        $inmuebleId,
                        $periodoId,
                        $estadoPago
                    ]);
                    $pagoId = (int) $pdo->lastInsertId();
                }

                $bancoEmisorId = null;
                if ($referencia && $banco) {
                    $stmtBanco = $pdo->query("SELECT COALESCE(MAX(banco_emisor_id), 0) + 1 AS next_id FROM banco_emisor");
                    $nextRow = $stmtBanco ? $stmtBanco->fetch(PDO::FETCH_ASSOC) : null;
                    $nextId = (int) ($nextRow['next_id'] ?? 1);

                    $stmtInsertBanco = $pdo->prepare("INSERT INTO banco_emisor (
                        banco_emisor_id,
                        banco_id,
                        telefono,
                        tipo_documento,
                        nro_documento,
                        nro_referencia,
                        fecha_pago
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)");

                    $stmtInsertBanco->execute([
                        $nextId,
                        $banco,
                        $phoneNumber,
                        $tipoDocumento,
                        $cedula,
                        substr($referencia, -6),
                        $paymentDate
                    ]);

                    $bancoEmisorId = $nextId;
                }

                $stmtDetalle = $pdo->prepare("INSERT INTO pago_detalles (
                    pago_id,
                    metodo_id,
                    banco_receptor_id,
                    banco_emisor_id,
                    monto_usd,
                    monto_Bs,
                    tasa_id,
                    monto_pagado,
                    comprobante_path,
                    estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                // Siempre iniciar como 'Pendiente' hasta que el admin confirme
                $estadoDetalle = 'Pendiente';

                $stmtDetalle->execute([
                    $pagoId,
                    $metodoId,
                    2,
                    $bancoEmisorId,
                    $paidUsd,
                    $paidBs,
                    $tasaId,
                    $paidBs,
                    $comprobantePath,
                    $estadoDetalle
                ]);
            }
        }

        $pdo->commit();

        returnJsonSuccess('Pago procesado exitosamente', [
            'payment_distribution' => $paymentDistribution,
            'total_usd' => round($totalUsd, 2),
            'total_bs' => round($totalBs, 2),
            'exchange_rate' => $exchangeRate,
            'payment_date' => $paymentDate
        ]);

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error procesando pago parcial: " . $e->getMessage());
        returnJsonError('Error procesando el pago: ' . $e->getMessage());
    }
} else {
    returnJsonError('Método no permitido');
}

/**
 * Procesa un pago de deuda acumulada
 */
function processDeudaAcumulada(
    PDO $pdo,
    int $propietarioId,
    int $inmuebleId,
    int $metodoId,
    int $tasaId,
    float $totalUsd,
    float $totalBs,
    float $exchangeRate,
    string $phoneNumber,
    string $cedula,
    string $tipoDocumento,
    string $banco,
    string $referencia,
    ?string $comprobantePath,
    string $paymentDate
) {
    error_log("🏦 Iniciando procesamiento de deuda acumulada");

    // Crear un período especial para deuda acumulada (usar el mes actual)
    $year = date('Y');
    $month = date('n');
    $fechaPeriodo = sprintf('%04d-%02d-01', $year, $month);

    // Buscar si el periodo ya existe
    $stmt = $pdo->prepare("SELECT periodo_id FROM periodos WHERE fecha_periodo = ?");
    $stmt->execute([$fechaPeriodo]);
    $periodo = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($periodo) {
        $periodoId = $periodo['periodo_id'];
    } else {
        // Crear nuevo periodo si no existe
        $stmt = $pdo->prepare("INSERT INTO periodos (fecha_periodo) VALUES (?)");
        $stmt->execute([$fechaPeriodo]);
        $periodoId = $pdo->lastInsertId();
    }

    error_log("📅 Período para deuda acumulada: {$periodoId} ({$fechaPeriodo})");

    // Insertar pago en la tabla pagos
    $stmt = $pdo->prepare("
        INSERT INTO pagos (propietario_id, inmueble_id, periodo_id, estado) 
        VALUES (?, ?, ?, 'Pendiente')
    ");
    $stmt->execute([$propietarioId, $inmuebleId, $periodoId]);
    $pagoId = $pdo->lastInsertId();

    error_log("💳 Pago de deuda acumulada creado con ID: {$pagoId}");

    // Crear banco emisor si es necesario
    $bancoEmisorId = null;
    if ($banco && $referencia) {
        $stmt = $pdo->prepare("
            INSERT INTO banco_emisor (banco_id, telefono, tipo_documento, nro_documento, nro_referencia, fecha_pago) 
            VALUES (?, ?, ?, ?, ?, CURDATE())
        ");
        $stmt->execute([$banco, $phoneNumber, $tipoDocumento, $cedula, $referencia]);
        $bancoEmisorId = $pdo->lastInsertId();
        error_log("🏦 Banco emisor creado con ID: {$bancoEmisorId}");
    }

    // Insertar detalles del pago
    $stmt = $pdo->prepare("
        INSERT INTO pago_detalles (
            pago_id, metodo_id, banco_receptor_id, banco_emisor_id, 
            monto_usd, monto_Bs, tasa_id, monto_pagado, comprobante_path, estado, Fecha
        ) VALUES (?, ?, 2, ?, ?, ?, ?, ?, ?, 'Pendiente', NOW())
    ");
    $stmt->execute([
        $pagoId,
        $metodoId,
        $bancoEmisorId,
        $totalUsd,
        $totalBs,
        $tasaId,
        $totalBs,
        $comprobantePath,
        'Pendiente'
    ]);

    error_log(" Pago de deuda acumulada procesado exitosamente");
    error_log(" Monto: {$totalBs} Bs ({$totalUsd} USD)");

    returnJsonSuccess('Pago de deuda acumulada procesado exitosamente', [
        'pago_id' => $pagoId,
        'tipo' => 'deuda_acumulada',
        'monto_bs' => round($totalBs, 2),
        'monto_usd' => round($totalUsd, 2),
        'exchange_rate' => $exchangeRate,
        'payment_date' => $paymentDate
    ]);
}
?>