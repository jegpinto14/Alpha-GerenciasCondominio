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
    
    // Obtener información de la casa
    $stmt = $pdo->prepare("
        SELECT 
            v.id,
            v.numero,
            v.tipo,
            v.nombre_propietario,
            v.apellido_propietario,
            u.username,
            u.email,
            u.tipo as usuario_tipo
        FROM viviendas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE v.id = ?
    ");
    $stmt->execute([$houseId]);
    $house = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$house) {
        echo json_encode(['success' => false, 'message' => 'Casa no encontrada']);
        exit;
    }
    
    // Obtener historial de pagos para 2025
    $stmt = $pdo->prepare("
        SELECT 
            p.meses,
            p.monto_bs,
            p.monto_dolares,
            p.moneda_pago,
            p.metodo_pago,
            p.tasa_bs,
            p.fecha_pago,
            p.estado
        FROM pagos_mensualidades p
        WHERE p.vivienda_id = ? 
        AND YEAR(p.fecha_pago) = 2025
        ORDER BY p.fecha_pago ASC
    ");
    $stmt->execute([$houseId]);
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar pagos para extraer meses individuales
    $payments = [];
    $meses_unicos = [];
    
    foreach ($pagos as $pago) {
        $meses = json_decode($pago['meses'], true);
        if (is_array($meses)) {
            $cantidad_meses = count($meses);
            $monto_por_mes_bs = $pago['monto_bs'] / $cantidad_meses;
            $monto_por_mes_usd = $pago['monto_dolares'] / $cantidad_meses;
            
            foreach ($meses as $mes) {
                $mes_key = $mes['id'] . '_' . $mes['name'];
                
                if (!isset($meses_unicos[$mes_key])) {
                    $meses_unicos[$mes_key] = true;
                    
                    $payments[] = [
                        'mes' => $mes['id'],
                        'mes_nombre' => $mes['name'],
                        'monto_bs' => $monto_por_mes_bs,
                        'monto_dolares' => $monto_por_mes_usd,
                        'moneda_pago' => $pago['moneda_pago'],
                        'metodo_pago' => $pago['metodo_pago'],
                        'tasa_bs' => $pago['tasa_bs'],
                        'fecha_pago' => $pago['fecha_pago'],
                        'estado' => $pago['estado'] === 'aprobado' ? 'Pagado' : ucfirst($pago['estado'])
                    ];
                }
            }
        }
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
