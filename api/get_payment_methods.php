<?php
/**
 * API para obtener los métodos de pago disponibles
 * Devuelve los métodos de pago que están configurados en el sistema
 */

session_start();
header('Content-Type: application/json');

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    require_once '../includes/database.php';
    
    // Consultar métodos de pago desde la base de datos
    $paymentMethods = [];
    
    // Primero intentar obtener de tabla metodo_pago si existe
    try {
        $stmt = $pdo->query("SELECT DISTINCT metodo_id, descripcion FROM metodo_pago WHERE descripcion IS NOT NULL ORDER BY descripcion");
        $dbMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($dbMethods)) {
            foreach ($dbMethods as $method) {
                $paymentMethods[] = [
                    'id' => $method['metodo_id'],
                    'name' => $method['descripcion'],
                    'description' => $method['descripcion'],
                    'icon' => 'fas fa-credit-card',
                    'enabled' => true,
                    'requires_form' => true
                ];
            }
        }
    } catch (Exception $e) {
        // Si no existe la tabla metodo_pago, continuar con otros métodos
    }
    
    // Si no se encontraron métodos en la tabla metodo_pago, buscar en otras tablas
    if (empty($paymentMethods)) {
        // Buscar métodos únicos en tabla pagos
        try {
            $stmt = $pdo->query("SELECT DISTINCT metodo_pago FROM pagos WHERE metodo_pago IS NOT NULL AND metodo_pago != '' ORDER BY metodo_pago");
            $dbMethods = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($dbMethods as $methodName) {
                $paymentMethods[] = [
                    'id' => strtolower(str_replace(' ', '_', $methodName)),
                    'name' => $methodName,
                    'description' => $methodName,
                    'icon' => 'fas fa-credit-card',
                    'enabled' => true,
                    'requires_form' => true
                ];
            }
        } catch (Exception $e) {
            // Continuar con métodos por defecto si hay error
        }
    }
    
    // Si aún no hay métodos, usar métodos básicos por defecto
    if (empty($paymentMethods)) {
        $paymentMethods = [
            [
                'id' => 'pago_movil',
                'name' => 'Pago Móvil',
                'description' => 'Pago a través de banca móvil',
                'icon' => 'fas fa-mobile-alt',
                'enabled' => true,
                'requires_form' => true
            ],
            [
                'id' => 'transferencia',
                'name' => 'Transferencia',
                'description' => 'Transferencia bancaria',
                'icon' => 'fas fa-university',
                'enabled' => true,
                'requires_form' => true
            ],
            [
                'id' => 'efectivo_bs',
                'name' => 'Efectivo Bs',
                'description' => 'Pago en efectivo bolívares',
                'icon' => 'fas fa-money-bill-wave',
                'enabled' => true,
                'requires_form' => false
            ],
            [
                'id' => 'efectivo_usd',
                'name' => 'Efectivo USD',
                'description' => 'Pago en efectivo dólares',
                'icon' => 'fas fa-dollar-sign',
                'enabled' => true,
                'requires_form' => false
            ],
            [
                'id' => 'donaciones',
                'name' => 'Donaciones',
                'description' => 'Pago por donaciones',
                'icon' => 'fas fa-heart',
                'enabled' => true,
                'requires_form' => true
            ],
            [
                'id' => 'punto_venta_debito',
                'name' => 'Punto de Venta Débito',
                'description' => 'Pago con tarjeta de débito',
                'icon' => 'fas fa-credit-card',
                'enabled' => true,
                'requires_form' => true
            ],
            [
                'id' => 'punto_venta_credito',
                'name' => 'Punto de Venta Crédito',
                'description' => 'Pago con tarjeta de crédito',
                'icon' => 'fas fa-credit-card',
                'enabled' => true,
                'requires_form' => true
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'payment_methods' => $paymentMethods
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener métodos de pago'
    ]);
}
?>
