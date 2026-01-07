<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Verificar que sea super admin
    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['tipo'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
        exit;
    }
    
    $houseId = $_GET['house_id'] ?? '';
    
    if (empty($houseId)) {
        echo json_encode(['success' => false, 'message' => 'ID de casa requerido']);
        exit;
    }
    
    // Obtener información del apartamento
    $stmt = $pdo->prepare("
        SELECT 
            i.inmueble_id as id,
            a.apartamento as numero,
            e.nombre_edificio,
            a.piso,
            p.nombre as nombre_propietario,
            p.apellido as apellido_propietario,
            u.username,
            u.email
        FROM inmueble i
        JOIN apartamentos a ON i.entidad_id = a.apartamento_id
        JOIN edificios e ON a.edificio_id = e.edificio_id
        JOIN propietarios p ON i.propietario_id = p.propietario_id
        LEFT JOIN usuarios u ON p.user_id = u.user_id
        WHERE i.inmueble_id = ? AND i.tipo_entidad = 'apartamento'
    ");
    $stmt->execute([$houseId]);
    $house = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$house) {
        echo json_encode(['success' => false, 'message' => 'Apartamento no encontrado']);
        exit;
    }
    
    // Obtener historial de pagos
    $stmt = $pdo->prepare("
        SELECT 
            per.fecha_periodo,
            pd.monto_Bs,
            pd.monto_usd,
            pd.monto_pagado,
            pd.fecha as fecha_pago,
            pd.estado
        FROM pago_detalles pd
        JOIN pagos p ON pd.pago_id = p.pago_id
        JOIN periodos per ON p.periodo_id = per.periodo_id
        WHERE p.inmueble_id = ?
        ORDER BY per.fecha_periodo DESC
    ");
    $stmt->execute([$houseId]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $payments = [];
    foreach ($pagos as $pago) {
        $payments[] = [
            'mes_nombre' => date('F Y', strtotime($pago['fecha_periodo'])),
            'monto_bs' => $pago['monto_Bs'],
            'monto_dolares' => $pago['monto_usd'],
            'fecha_pago' => $pago['fecha_pago'],
            'estado' => $pago['estado']
        ];
    }
    
    // Ordenar por mes
    usort($payments, function($a, $b) {
        return $a['mes'] - $b['mes'];
    });
    
    echo json_encode([
        'success' => true,
        'house' => $house,
        'payments' => $payments
    ]);
    
} catch (Exception $e) {
    error_log("Error obteniendo detalles de casa: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
}
?>
