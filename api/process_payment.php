<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

// Incluir función de distribución de pagos parciales
require_once 'distribute_partial_payment.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

function findDistributionItem(array $distribution, array $monthData, int $index): ?array
{
    $monthId = $monthData['id'] ?? null;
    $monthName = $monthData['name'] ?? null;

    foreach ($distribution as $item) {
        $itemId = $item['monthId'] ?? null;
        $itemName = $item['monthName'] ?? null;

        if ($monthId !== null && $itemId !== null && (int) $itemId === (int) $monthId) {
            return $item;
        }

        if ($monthName !== null && $itemName !== null && $itemName === $monthName) {
            return $item;
        }
    }

    return $distribution[$index] ?? null;
}

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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Verificar si es un pago con formulario (pago móvil/transferencia) o JSON (pago tradicional)
    $isFormData = !empty($_POST);

    if ($isFormData) {
        error_log("DEBUG: POST data: " . print_r($_POST, true));

        $months = json_decode($_POST['months'], true) ?? [];
        $paymentMethod = $_POST['payment_method'] ?? '';
        $totalBs = isset($_POST['total_bs']) ? (float) $_POST['total_bs'] : 0.0;
        $totalUsd = isset($_POST['total_usd']) ? (float) $_POST['total_usd'] : 0.0;
        $paymentDistribution = json_decode($_POST['payment_distribution'] ?? '[]', true);
        $exchangeRate = isset($_POST['exchange_rate']) ? (float) $_POST['exchange_rate'] : 0.0;
        $paymentDate = $_POST['payment_date'] ?? date('Y-m-d');

        $phoneNumber = $_POST['phoneNumber'] ?? '';
        $cedula = $_POST['cedula'] ?? '';
        $tipoDocumento = $_POST['tipo_documento'] ?? 'V';
        $banco = $_POST['banco'] ?? '';
        $referencia = $_POST['referencia'] ?? '';

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
                echo json_encode(['success' => false, 'message' => 'Error subiendo comprobante']);
                exit;
            }
        }
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        $months = $data['months'] ?? [];
        $paymentMethod = $data['payment_method'] ?? 'efectivo_bs';
        $totalBs = isset($data['total_bs']) ? (float) $data['total_bs'] : 0.0;
        $totalUsd = isset($data['total_usd']) ? (float) $data['total_usd'] : 0.0;
        $paymentDistribution = $data['payment_distribution'] ?? [];
        $exchangeRate = isset($data['exchange_rate']) ? (float) $data['exchange_rate'] : 0.0;
        $paymentDate = $data['payment_date'] ?? date('Y-m-d');

        $phoneNumber = '';
        $cedula = '';
        $tipoDocumento = 'V';
        $banco = '';
        $referencia = '';
        $comprobantePath = null;
    }

    if (empty($months)) {
        echo json_encode(['success' => false, 'message' => 'No se seleccionaron meses']);
        exit;
    }

    try {
        $userId = $_SESSION['user_id'];
        $inmuebleId = null;
        $propietarioId = null;

        $requestedInmuebleId = null;
        if ($isFormData && isset($_POST['inmueble_id'])) {
            $requestedInmuebleId = (int) $_POST['inmueble_id'];
        } elseif (!$isFormData && isset($data['inmueble_id'])) {
            $requestedInmuebleId = (int) $data['inmueble_id'];
        }

        if ($requestedInmuebleId > 0) {
            $stmt = $pdo->prepare("
                SELECT 
                    p.propietario_id,
                    i.inmueble_id
                FROM inmueble i
                INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
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
                echo json_encode(['success' => false, 'message' => 'No se encontró propietario o inmueble registrado']);
                exit;
            }
            $propietarioId = (int) $propietario['propietario_id'];
            $activeInmuebleId = $propietario['active_inmueble_id'] ? (int) $propietario['active_inmueble_id'] : null;

            if ($activeInmuebleId) {
                $stmt = $pdo->prepare("
                    SELECT inmueble_id
                    FROM inmueble
                    WHERE inmueble_id = ? AND propietario_id = ?
                    LIMIT 1
                ");
                $stmt->execute([$activeInmuebleId, $propietarioId]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) {
                    $inmuebleId = (int) $row['inmueble_id'];
                }
            }

            if (!$inmuebleId) {
                $stmt = $pdo->prepare("
                    SELECT inmueble_id
                    FROM inmueble
                    WHERE propietario_id = ?
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
            }
        }

        // Mapeo de métodos de pago a IDs
        $metodoPagoMap = [
            'pago_movil' => 1,      // Pago móvil
            'transferencia' => 4,    // Transferencia
            'efectivo_divisa' => 2,  // Efectivo divisa
            'efectivo_bs' => 3,      // Efectivo bolívares
            'donacion' => 5,         // Donaciones
            'debito' => 6,           // Punto de venta débito
            'credito' => 7           // Punto de venta crédito
        ];

        $metodoId = $metodoPagoMap[$paymentMethod] ?? 3; // Default: efectivo bolívares

        if ($totalUsd <= 0 || $exchangeRate <= 0) {
            throw new Exception('Los montos o la tasa de cambio son inválidos');
        }

        if ($totalBs <= 0) {
            $totalBs = round($totalUsd * $exchangeRate, 2);
        }

        $pdo->beginTransaction();

        $sumaUsd = array_reduce($months, static function ($carry, $month) {
            if (is_array($month) && isset($month['usdAmount'])) {
                return $carry + (float) $month['usdAmount'];
            }
            return $carry;
        }, 0.0);

        if ($sumaUsd > 0 && $totalUsd <= 0) {
            $totalUsd = $sumaUsd;
            $totalBs = round($totalUsd * $exchangeRate, 2);
        }

        if (empty($paymentDistribution)) {
            $paymentDistribution = distributePaymentDeterministic($months, $totalUsd, $exchangeRate);
        }

        $monthIndex = 0;
        foreach ($months as $month) {
            $monthData = is_array($month) ? $month : ['id' => $month, 'name' => 'Mes ' . $month];
            $monthName = $monthData['name'] ?? ('Mes ' . ($monthData['id'] ?? ''));
            $monthNumber = null;

            if (isset($monthData['id']) && is_numeric($monthData['id'])) {
                $monthNumber = (int) $monthData['id'];
            } elseif (isset($monthData['monthNumber'])) {
                $monthNumber = (int) $monthData['monthNumber'];
            } elseif (isset($monthData['name'])) {
                $monthNumber = monthNameToNumber($monthData['name']);
            }

            if (!$monthNumber || $monthNumber < 1 || $monthNumber > 12) {
                $monthNumber = (int) date('n');
            }

            $year = date('Y');
            $periodoCubierto = sprintf('%04d-%02d-01', $year, $monthNumber);

            $stmtPeriodo = $pdo->prepare("SELECT periodo_id FROM periodos WHERE fecha_periodo = ?");
            $stmtPeriodo->execute([$periodoCubierto]);
            $periodoData = $stmtPeriodo->fetch(PDO::FETCH_ASSOC);
            if (!$periodoData) {
                throw new Exception("No se encontró el periodo para {$periodoCubierto}");
            }
            $periodoId = (int) $periodoData['periodo_id'];

            $distributionItem = findDistributionItem($paymentDistribution, $monthData, $monthIndex);
            $amountUsd = isset($distributionItem['paidAmountUsd']) ? (float) $distributionItem['paidAmountUsd'] : (float) ($monthData['usdAmount'] ?? 0.0);
            $totalMonthUsd = isset($distributionItem['totalAmountUsd']) ? (float) $distributionItem['totalAmountUsd'] : (float) ($monthData['usdAmount'] ?? $amountUsd);
            $amountBs = isset($distributionItem['paidAmountBs']) ? (float) $distributionItem['paidAmountBs'] : round($amountUsd * $exchangeRate, 2);
            $totalMonthBs = isset($distributionItem['totalAmountBs']) ? (float) $distributionItem['totalAmountBs'] : round($totalMonthUsd * $exchangeRate, 2);
            $isFullyPaid = !empty($distributionItem['isFullyPaid']);

            $estadoPago = 'Pendiente';
            if ($amountBs > 0 && $isFullyPaid) {
                $estadoPago = 'Pagado';
            } elseif ($amountBs > 0) {
                $estadoPago = 'Pago Parcial';
            }

            $stmtPago = $pdo->prepare("
                INSERT INTO pagos (
                    propietario_id,
                    inmueble_id,
                    periodo_id,
                    estado
                ) VALUES (?, ?, ?, ?)
            ");
            $stmtPago->execute([
                $propietarioId,
                $inmuebleId,
                $periodoId,
                $estadoPago
            ]);
            $pagoId = (int) $pdo->lastInsertId();

            $bancoEmisorId = null;
            if ($comprobantePath && $referencia && $banco) {
                $stmtBanco = $pdo->prepare("
                    INSERT INTO banco_emisor (
                        banco_emisor_id,
                        banco_id,
                        telefono,
                        tipo_documento,
                        nro_documento,
                        nro_referencia,
                        comprobante_path,
                        fecha_pago
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $bancoEmisorId = $pagoId;
                $stmtBanco->execute([
                    $bancoEmisorId,
                    $banco,
                    $phoneNumber,
                    $tipoDocumento,
                    $cedula,
                    substr($referencia, -6),
                    $comprobantePath,
                    $paymentDate
                ]);
            }

            $tasaId = findOrCreateTasaId($pdo, $exchangeRate, $paymentDate);

            $stmtDetalle = $pdo->prepare("
                INSERT INTO pago_detalles (
                    pago_id,
                    metodo_id,
                    banco_receptor_id,
                    banco_emisor_id,
                    monto_usd,
                    monto_Bs,
                    tasa_id,
                    monto_pagado,
                    estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            if ($amountBs <= 0) {
                $estadoDetalle = 'Pendiente';
            } elseif ($isFullyPaid) {
                $estadoDetalle = 'Confirmado';
            } else {
                $estadoDetalle = 'Pendiente';
            }

            $stmtDetalle->execute([
                $pagoId,
                $metodoId,
                1,
                $bancoEmisorId,
                $amountUsd,
                $amountBs,
                $tasaId,
                $amountBs,
                $estadoDetalle
            ]);

            $monthIndex++;
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Pago registrado exitosamente',
            'meses_pagados' => count($months),
            'total_usd' => round($totalUsd, 2),
            'total_bs' => round($totalBs, 2),
            'exchange_rate' => $exchangeRate,
            'payment_date' => $paymentDate,
            'referencia' => $referencia,
            'distribution' => $paymentDistribution,
        ]);


    } catch (PDOException $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error en process_payment.php: " . $e->getMessage());
        error_log("Error SQL Code: " . $e->getCode());
        echo json_encode([
            'success' => false,
            'message' => 'Error procesando pago: ' . $e->getMessage(),
            'debug' => 'Error SQL: ' . $e->getCode()
        ]);
    } catch (Exception $e) {
        error_log("Error general en process_payment.php: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error general: ' . $e->getMessage()
        ]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>