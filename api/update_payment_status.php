<?php
session_start();
require_once __DIR__ . '/../includes/database.php';

// Configurar headers para JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Función para devolver respuesta JSON
function returnJsonResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

try {
    // Verificar sesión
    if (!isset($_SESSION['user_id'])) {
        returnJsonResponse(false, 'No hay sesión activa');
    }

    // Verificar rol de administrador
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.username, r.nombre as rol_nombre 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.rol_id 
        WHERE u.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || ($user['rol_nombre'] !== 'admin' && $user['rol_nombre'] !== 'superadmin')) {
        returnJsonResponse(false, 'Acceso denegado - Solo administradores');
    }

    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        returnJsonResponse(false, 'Método no permitido');
    }
    
    // Obtener datos JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        returnJsonResponse(false, 'Datos JSON inválidos');
    }
    
    // Validar campos requeridos - ahora recibe pago_detalle_id
    if (!isset($input['paymentId']) || !isset($input['status'])) {
        returnJsonResponse(false, 'Faltan campos requeridos');
    }
    
    $pagoDetalleId = (int)$input['paymentId']; // Este es el pago_detalle_id
    $status = $input['status'];
    
    // Validar estado
    if (!in_array($status, ['approved', 'rejected'])) {
        returnJsonResponse(false, 'Estado inválido');
    }
    
    error_log("🔍 Procesando pago_detalle_id: {$pagoDetalleId}, Acción: {$status}");
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    try {
        // Mapear estados: approved -> Confirmado, rejected -> Rechazado
        $dbStatus = ($status === 'approved') ? 'Confirmado' : 'Rechazado';
        
        // PASO 1: Actualizar estado en pago_detalles según pago_detalle_id
        $stmt = $pdo->prepare("
            UPDATE pago_detalles 
            SET estado = ? 
            WHERE pago_detalle_id = ?
        ");
        $stmt->execute([$dbStatus, $pagoDetalleId]);
        
        error_log("✅ Paso 1: pago_detalles.estado actualizado a {$dbStatus}");
        
        if ($status === 'approved') {
            // PASO 2: Obtener el pago_id del detalle para verificar si se completó el pago del mes
            $stmt = $pdo->prepare("
                SELECT pago_id 
                FROM pago_detalles 
                WHERE pago_detalle_id = ?
            ");
            $stmt->execute([$pagoDetalleId]);
            $detalle = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$detalle) {
                throw new Exception('Detalle de pago no encontrado');
            }
            
            $pagoId = $detalle['pago_id'];
            error_log("📋 Paso 2: pago_id obtenido: {$pagoId}");
            
            // Sumar todos los montos confirmados para este pago_id
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(monto_usd), 0) as total_pagado
                FROM pago_detalles
                WHERE pago_id = ? AND estado = 'Confirmado'
            ");
            $stmt->execute([$pagoId]);
            $resultado = $stmt->fetch(PDO::FETCH_ASSOC);
            $totalPagado = (float)$resultado['total_pagado'];
            
            error_log("💰 Total pagado confirmado para pago_id {$pagoId}: \${$totalPagado} USD");
            
            // Obtener información del inmueble y tipo de vivienda
            $stmt = $pdo->prepare("
                SELECT 
                    p.pago_id,
                    p.inmueble_id,
                    i.tipo_vivienda_id,
                    tv.monto_mensual_usd
                FROM pagos p
                INNER JOIN inmueble i ON p.inmueble_id = i.inmueble_id
                INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
                WHERE p.pago_id = ?
            ");
            $stmt->execute([$pagoId]);
            $pagoInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$pagoInfo) {
                throw new Exception('Información del pago no encontrada');
            }
            
            $montoMensualUsd = (float)$pagoInfo['monto_mensual_usd'];
            error_log("🏠 Monto mensual requerido: \${$montoMensualUsd} USD");
            
            // PASO 3: Comprobar si se pagó el mes completo
            $nuevoEstadoPago = '';
            
            if ($totalPagado < $montoMensualUsd) {
                // 3.1: Pago parcial
                $nuevoEstadoPago = 'Pago Parcial';
                error_log("⚠️ Paso 3.1: Total pagado (\${$totalPagado}) < Monto mensual (\${$montoMensualUsd}) → Pago Parcial");
            } else if ($totalPagado >= $montoMensualUsd) {
                // 3.2: Pagado completo
                $nuevoEstadoPago = 'Pagado';
                error_log("✅ Paso 3.2: Total pagado (\${$totalPagado}) >= Monto mensual (\${$montoMensualUsd}) → Pagado");
            }
            
            // Actualizar estado en la tabla pagos
            $stmt = $pdo->prepare("
                UPDATE pagos 
                SET estado = ? 
                WHERE pago_id = ?
            ");
            $stmt->execute([$nuevoEstadoPago, $pagoId]);
            
            error_log("🎯 Estado final en pagos: {$nuevoEstadoPago}");
            
            // Confirmar transacción
            $pdo->commit();
            
            returnJsonResponse(true, "Pago aprobado exitosamente. Estado del mes: {$nuevoEstadoPago}", [
                'pago_detalle_id' => $pagoDetalleId,
                'pago_id' => $pagoId,
                'total_pagado' => $totalPagado,
                'monto_mensual' => $montoMensualUsd,
                'estado_mes' => $nuevoEstadoPago
            ]);
            
        } else {
            // RECHAZAR: Solo cambiar estado en pago_detalles
            error_log("❌ Pago rechazado - solo se actualiza pago_detalles");
            
            $pdo->commit();
            
            returnJsonResponse(true, 'Pago rechazado exitosamente', [
                'pago_detalle_id' => $pagoDetalleId,
                'new_status' => 'Rechazado'
            ]);
        }
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("❌ Error en transacción: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("❌ Error en update_payment_status.php: " . $e->getMessage());
    returnJsonResponse(false, 'Error del servidor: ' . $e->getMessage());
}
?>
