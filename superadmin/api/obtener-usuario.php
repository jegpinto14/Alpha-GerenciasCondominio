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
    
    $userId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($userId <= 0) {
        throw new Exception('ID de usuario inválido');
    }
    
    // Consulta para obtener información del usuario
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
        WHERE u.user_id = :user_id
        AND r.rol_id IN (1, 2)  -- Solo Admin y Superadmin
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();
    
    $usuario = $stmt->fetch();
    
    if (!$usuario) {
        throw new Exception('Usuario no encontrado');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Usuario obtenido exitosamente',
        'data' => [
            'user_id' => $usuario['user_id'],
            'username' => $usuario['username'],
            'status' => $usuario['status'],
            'created_at' => $usuario['created_at'],
            'rol_id' => $usuario['rol_id'],
            'rol_nombre' => $usuario['rol_nombre']
        ]
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
