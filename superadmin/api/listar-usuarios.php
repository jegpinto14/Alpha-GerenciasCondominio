<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'conexion.php';

try {
    // Solo permitir métodos GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Método no permitido');
    }
    
    // Consulta para obtener usuarios con información de roles
    $sql = "
        SELECT 
            u.user_id,
            u.username,
            u.status,
            u.created_at,
            r.rol_id,
            r.nombre as rol_nombre
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.rol_id
        WHERE r.rol_id IN (1, 2)  -- Solo Admin y Superadmin
        ORDER BY u.created_at DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $usuarios = $stmt->fetchAll();
    
    // Formatear los datos
    $usuariosFormateados = array_map(function($usuario) {
        return [
            'user_id' => $usuario['user_id'],
            'username' => $usuario['username'],
            'status' => $usuario['status'],
            'created_at' => $usuario['created_at'],
            'rol_id' => $usuario['rol_id'],
            'rol_nombre' => $usuario['rol_nombre']
        ];
    }, $usuarios);
    
    echo json_encode([
        'success' => true,
        'message' => 'Usuarios obtenidos exitosamente',
        'data' => $usuariosFormateados,
        'total' => count($usuariosFormateados)
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'data' => null
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage(),
        'data' => null
    ]);
}
?>
