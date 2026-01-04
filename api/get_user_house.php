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
    
    $userId = $_GET['user_id'] ?? '';
    
    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => 'ID de usuario requerido']);
        exit;
    }
    
    // Obtener información del inmueble del usuario
    $stmt = $pdo->prepare("
        SELECT 
            i.inmueble_id,
            i.tipo_entidad,
            i.entidad_id,
            tv.nombre_tipo,
            u.username,
            u.email
        FROM inmueble i
        JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        JOIN usuarios u ON i.user_id = u.user_id
        WHERE i.user_id = ?
    ");
    $stmt->execute([$userId]);
    $inmueble = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$inmueble) {
        echo json_encode([
            'success' => true,
            'house' => null
        ]);
        exit;
    }
    
    // Obtener detalles específicos según el tipo de entidad
    $detalles = null;
    
    if ($inmueble['tipo_entidad'] === 'casa') {
        $stmt = $pdo->prepare("
            SELECT c.nombre_casa, a.nombre_avenida
            FROM casas c
            JOIN avenidas a ON c.avenida_id = a.id_avenida
            WHERE c.casa_id = ?
        ");
        $stmt->execute([$inmueble['entidad_id']]);
        $detalles = $stmt->fetch(PDO::FETCH_ASSOC);
    } elseif ($inmueble['tipo_entidad'] === 'apartamento') {
        $stmt = $pdo->prepare("
            SELECT e.nombre_edificio, a.apartamento, a.piso
            FROM apartamentos a
            JOIN edificios e ON a.edificio_id = e.edificio_id
            WHERE a.apartamento_id = ?
        ");
        $stmt->execute([$inmueble['entidad_id']]);
        $detalles = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    echo json_encode([
        'success' => true,
        'house' => [
            'inmueble_id' => $inmueble['inmueble_id'],
            'tipo' => $inmueble['nombre_tipo'],
            'tipo_entidad' => $inmueble['tipo_entidad'],
            'username' => $inmueble['username'],
            'email' => $inmueble['email'],
            'detalles' => $detalles
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error obteniendo casa del usuario: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
}
?>
