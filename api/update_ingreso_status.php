<?php
session_start();
require_once '../includes/database.php';

header('Content-Type: application/json');

try {
    // Verificar sesión
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
        exit;
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
        echo json_encode(['success' => false, 'message' => 'Acceso denegado - Solo administradores']);
        exit;
    }

    // Obtener datos JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['ingresoId']) || !isset($input['action'])) {
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit;
    }
    
    $ingresoId = (int)$input['ingresoId'];
    $action = $input['action']; // 'approve' o 'reject'
    
    // Validar acción
    if (!in_array($action, ['approve', 'reject'])) {
        echo json_encode(['success' => false, 'message' => 'Acción inválida']);
        exit;
    }
    
    error_log("🔍 Procesando ingreso ID: {$ingresoId}, Acción: {$action}");
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    try {
        // Obtener información del ingreso y el movimiento de items
        $stmt = $pdo->prepare("
            SELECT 
                i.ingreso_id,
                i.estado as estado_actual,
                mi.movimiento_id,
                mi.item_id,
                mi.cantidad,
                mi.tipo_movimiento
            FROM ingresos i
            LEFT JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
            WHERE i.ingreso_id = ?
        ");
        $stmt->execute([$ingresoId]);
        $ingreso = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$ingreso) {
            throw new Exception('Ingreso no encontrado');
        }
        
        error_log("📊 Ingreso encontrado - Estado actual: {$ingreso['estado_actual']}, Item ID: " . ($ingreso['item_id'] ?? 'NULL'));
        
        if ($action === 'approve') {
            // APROBAR: Cambiar estado a Confirmado
            $stmt = $pdo->prepare("
                UPDATE ingresos 
                SET estado = 'Confirmado' 
                WHERE ingreso_id = ?
            ");
            $stmt->execute([$ingresoId]);
            
            error_log("✅ Ingreso {$ingresoId} APROBADO - Estado cambiado a Confirmado");
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Ingreso aprobado exitosamente',
                'new_status' => 'Confirmado'
            ]);
            
        } else if ($action === 'reject') {
            // RECHAZAR: Cambiar estado a Rechazado
            $stmt = $pdo->prepare("
                UPDATE ingresos 
                SET estado = 'Rechazado' 
                WHERE ingreso_id = ?
            ");
            $stmt->execute([$ingresoId]);
            
            error_log("❌ Ingreso {$ingresoId} RECHAZADO - Estado cambiado a Rechazado");
            
            // Si hay un item asociado y tiene cantidad, crear movimiento de DEVOLUCIÓN
            if ($ingreso['item_id'] && $ingreso['cantidad']) {
                $itemId = $ingreso['item_id'];
                $cantidad = $ingreso['cantidad'];
                
                error_log("📦 Procesando devolución - Item ID: {$itemId}, Cantidad: {$cantidad}");
                
                // Verificar si el item existe y tiene stock
                $stmt = $pdo->prepare("SELECT stock FROM items WHERE item_id = ?");
                $stmt->execute([$itemId]);
                $item = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($item && $item['stock'] !== null) {
                    // Crear movimiento de DEVOLUCIÓN
                    $stmt = $pdo->prepare("
                        INSERT INTO movimientos_items 
                        (item_id, tipo_movimiento, cantidad, ingreso_id, fecha_movimiento) 
                        VALUES (?, 'DEVOLUCION', ?, ?, NOW())
                    ");
                    $stmt->execute([$itemId, $cantidad, $ingresoId]);
                    
                    $movimientoId = $pdo->lastInsertId();
                    error_log("📝 Movimiento de DEVOLUCIÓN creado - ID: {$movimientoId}");
                    
                    // Devolver la cantidad al stock
                    $stmt = $pdo->prepare("
                        UPDATE items 
                        SET stock = stock + ? 
                        WHERE item_id = ?
                    ");
                    $stmt->execute([$cantidad, $itemId]);
                    
                    error_log("📈 Stock actualizado - Item {$itemId}: +{$cantidad} unidades");
                } else {
                    error_log("⚠️ Item {$itemId} no tiene stock o no existe, no se actualiza inventario");
                }
            } else {
                error_log("ℹ️ No hay item asociado o cantidad es 0, no se requiere devolución");
            }
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Ingreso rechazado exitosamente' . ($ingreso['item_id'] ? ' y stock devuelto' : ''),
                'new_status' => 'Rechazado'
            ]);
        }
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("❌ Error en transacción: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("❌ Error en update_ingreso_status.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>
