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
    $stmt = $pdo->prepare("
        SELECT r.nombre as tipo 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.rol_id 
        WHERE u.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['tipo'] !== 'superadmin') {
        echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
        exit;
    }
    
    // Obtener todas las casas
    $stmt = $pdo->query("
        SELECT 
            c.casa_id,
            c.nombre_casa,
            a.nombre_avenida,
            'casa' as tipo_entidad,
            'Quinta' as tipo_vivienda
        FROM casas c
        JOIN avenidas a ON c.avenida_id = a.id_avenida
        ORDER BY c.casa_id ASC
    ");
    
    $casas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener todos los apartamentos
    $stmt = $pdo->query("
        SELECT 
            a.apartamento_id,
            e.nombre_edificio,
            a.apartamento,
            a.piso,
            'apartamento' as tipo_entidad,
            'Apartamento' as tipo_vivienda
        FROM apartamentos a
        JOIN edificios e ON a.edificio_id = e.edificio_id
        ORDER BY a.apartamento_id ASC
    ");
    
    $apartamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Combinar casas y apartamentos
    $houses = array_merge($casas, $apartamentos);
    
    echo json_encode([
        'success' => true,
        'houses' => $houses
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_all_houses.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
