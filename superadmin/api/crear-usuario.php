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
    // Solo permitir métodos POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }
    
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    $username = isset($input['username']) ? trim($input['username']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';
    $rol_id = isset($input['rol_id']) ? (int)$input['rol_id'] : 0;
    
    // Validaciones
    if (empty($username)) {
        throw new Exception('El nombre de usuario es obligatorio');
    }
    
    if (empty($password)) {
        throw new Exception('La contraseña es obligatoria');
    }
    
    if ($rol_id < 1 || $rol_id > 2) {
        throw new Exception('El rol debe ser Admin (2) o Superadmin (1)');
    }
    
    if (strlen($username) < 3) {
        throw new Exception('El nombre de usuario debe tener al menos 3 caracteres');
    }
    
    if (strlen($password) < 6) {
        throw new Exception('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Validar que el nombre de usuario solo contenga caracteres válidos
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        throw new Exception('El nombre de usuario solo puede contener letras, números y guiones bajos');
    }
    
    // Verificar que el rol existe
    $sqlRol = "SELECT rol_id, nombre FROM roles WHERE rol_id = :rol_id";
    $stmtRol = $pdo->prepare($sqlRol);
    $stmtRol->bindParam(':rol_id', $rol_id, PDO::PARAM_INT);
    $stmtRol->execute();
    $rol = $stmtRol->fetch();
    
    if (!$rol) {
        throw new Exception('El rol seleccionado no existe');
    }
    
    // Verificar que el nombre de usuario no existe
    $sqlCheck = "SELECT user_id FROM usuarios WHERE username = :username";
    $stmtCheck = $pdo->prepare($sqlCheck);
    $stmtCheck->bindParam(':username', $username, PDO::PARAM_STR);
    $stmtCheck->execute();
    $existingUser = $stmtCheck->fetch();
    
    if ($existingUser) {
        throw new Exception('El nombre de usuario ya existe');
    }
    
    // Encriptar la contraseña
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Crear el usuario
    $sql = "INSERT INTO usuarios (username, password, rol_id, status, created_at) 
            VALUES (:username, :password, :rol_id, 'activo', NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':username', $username, PDO::PARAM_STR);
    $stmt->bindParam(':password', $hashedPassword, PDO::PARAM_STR);
    $stmt->bindParam(':rol_id', $rol_id, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        $userId = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Usuario creado exitosamente',
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'rol' => $rol['nombre']
            ]
        ]);
    } else {
        throw new Exception('Error al crear el usuario en la base de datos');
    }
    
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
