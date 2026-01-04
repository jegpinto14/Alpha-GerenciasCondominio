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
    $requestedInmuebleId = isset($_GET['inmueble_id']) ? (int)$_GET['inmueble_id'] : null;

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
        $propietarioId = (int)$userData['propietario_id'];
        $inmuebleId = (int)$userData['inmueble_id'];
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
        $propietarioId = (int)$propietario['propietario_id'];
        $activeInmuebleId = $propietario['active_inmueble_id'] ? (int)$propietario['active_inmueble_id'] : null;

        $inmuebleId = null;
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
                $inmuebleId = (int)$row['inmueble_id'];
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
            $inmuebleId = (int)$row['inmueble_id'];
        }
    }
    
    // Obtener todos los pagos rechazados SOLO para este propietario e inmueble
    // CASO 3: Rechazado + Rechazado = rejected (rojo)
    $stmt = $pdo->prepare("
        SELECT 
            MONTH(pr.fecha_periodo) as mes,
            YEAR(pr.fecha_periodo) as anio,
            p.estado as estado_pago,
            pd.estado as estado_detalle,
            p.pago_id,
            p.periodo_id
        FROM pagos p
        INNER JOIN periodos pr ON p.periodo_id = pr.periodo_id
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE p.propietario_id = ? AND p.inmueble_id = ? 
        AND pd.estado = 'Rechazado'
        ORDER BY pr.fecha_periodo ASC
    ");
    $stmt->execute([$propietarioId, $inmuebleId]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $rejectedMonths = [];
    
    // Nombres de meses
    $monthNames = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    foreach ($pagos as $pago) {
        $rejectedMonths[] = [
            'id' => (int)$pago['mes'],
            'name' => $monthNames[$pago['mes']],
            'year' => (int)$pago['anio'],
            'status' => 'rejected', // CASO 3: Estado rechazado (rojo)
            'pago_id' => $pago['pago_id'],
            'periodo_id' => $pago['periodo_id'],
            'estado_pago' => $pago['estado_pago'],
            'estado_detalle' => $pago['estado_detalle']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'rejectedMonths' => $rejectedMonths,
        'total' => count($rejectedMonths)
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_rejected_months.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Error obteniendo meses rechazados: ' . $e->getMessage()
    ]);
}
?>
