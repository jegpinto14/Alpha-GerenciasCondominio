<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener ID de vivienda del usuario
    $stmt = $pdo->prepare("SELECT id FROM viviendas WHERE usuario_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $housing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$housing) {
        echo json_encode(['success' => false, 'message' => 'No se encontró vivienda registrada']);
        exit;
    }
    
    $vivienda_id = $housing['id'];
    
    // Obtener todos los pagos para esta vivienda con sus estados actualizados
    $stmt = $pdo->prepare("
        SELECT 
            id,
            meses,
            CASE 
                WHEN estado = 'pendiente' THEN 'pending'
                WHEN estado = 'aprobado' THEN 'approved'
                WHEN estado = 'rechazado' THEN 'rejected'
                ELSE estado
            END as estado,
            fecha_pago,
            fecha_actualizacion
        FROM pagos_mensualidades 
        WHERE vivienda_id = ? 
        ORDER BY fecha_pago DESC
    ");
    $stmt->execute([$vivienda_id]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $statusUpdates = [];
    
    foreach ($pagos as $pago) {
        $meses = json_decode($pago['meses'], true);
        if (is_array($meses)) {
            foreach ($meses as $mes) {
                $statusUpdates[] = [
                    'id' => $mes['id'],
                    'name' => $mes['name'],
                    'year' => 2025,
                    'status' => $pago['estado'],
                    'paymentId' => $pago['id'],
                    'paidAt' => $pago['fecha_pago']
                ];
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'statusUpdates' => $statusUpdates
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_payment_status_updates.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
