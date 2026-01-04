<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener propietario_id del usuario actual
    $stmt = $pdo->prepare("
        SELECT propietario_id 
        FROM propietarios 
        WHERE user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$userData) {
        echo json_encode(['success' => false, 'message' => 'No se encontró propietario registrado']);
        exit;
    }
    
    $propietarioId = $userData['propietario_id'];
    
    // Obtener pagos aprobados del usuario usando la estructura correcta de la base de datos
    $stmt = $pdo->prepare("
        SELECT 
            pag.pago_id,
            pr.fecha_periodo as periodo_cubierto,
            MONTH(pr.fecha_periodo) as mes,
            YEAR(pr.fecha_periodo) as anio,
            pd.monto_Bs,
            pd.monto_usd,
            pd.tasa_id,
            mp.descripcion as metodo_pago,
            be.fecha_pago
        FROM pagos pag
        INNER JOIN periodos pr ON pag.periodo_id = pr.periodo_id
        LEFT JOIN pago_detalles pd ON pag.pago_id = pd.pago_id
        LEFT JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
        WHERE pag.propietario_id = ? 
        AND pag.estado = 'Pagado'
        ORDER BY pr.fecha_periodo DESC
    ");
    $stmt->execute([$propietarioId]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Nombres de meses
    $monthNames = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    $receipts = [];
    foreach ($pagos as $pago) {
        $mesNombre = $monthNames[$pago['mes']] ?? 'Desconocido';
        $receiptFileName = 'recibo_pago_' . $pago['pago_id'] . '_*.pdf';
        
        // Buscar archivos de recibo que coincidan con el patrón
        $receiptsDir = '../uploads/recibos/';
        $receiptFiles = glob($receiptsDir . $receiptFileName);
        
        if (!empty($receiptFiles)) {
            $receiptPath = $receiptFiles[0]; // Tomar el primer archivo encontrado
            $receipts[] = [
                'pago_id' => $pago['pago_id'],
                'mes' => $mesNombre,
                'anio' => $pago['anio'],
                'monto_bs' => $pago['monto_Bs'],
                'monto_usd' => $pago['monto_usd'],
                'metodo_pago' => $pago['metodo_pago'],
                'fecha_pago' => $pago['fecha_pago'],
                'receipt_path' => str_replace('../uploads/', '../../uploads/', $receiptPath),
                'receipt_filename' => basename($receiptPath)
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'receipts' => $receipts,
        'total' => count($receipts)
    ]);
    
} catch (Exception $e) {
    error_log("Error en get_user_receipts.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Error obteniendo recibos: ' . $e->getMessage()
    ]);
}
?>
