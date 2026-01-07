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
    
    // Obtener todos los apartamentos
    $stmt = $pdo->query("
        SELECT 
            a.apartamento_id as id,
            e.nombre_edificio,
            a.apartamento as numero,
            a.piso,
            'apartamento' as tipo_entidad,
            'Apartamento' as tipo
        FROM apartamentos a
        JOIN edificios e ON a.edificio_id = e.edificio_id
        ORDER BY e.nombre_edificio ASC, a.piso ASC, a.apartamento ASC
    ");
    
    $houses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'houses' => $houses
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_all_houses.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
