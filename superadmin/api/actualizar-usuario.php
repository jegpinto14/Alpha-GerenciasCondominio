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
    
    $userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $username = isset($input['username']) ? trim($input['username']) : '';
    $rolId = isset($input['rol_id']) ? (int)$input['rol_id'] : 0;
    $password = isset($input['password']) ? trim($input['password']) : null;
    
    // Validaciones
    if ($userId <= 0) {
        throw new Exception('ID de usuario inválido');
    }
    
    if (empty($username)) {
        throw new Exception('El nombre de usuario es obligatorio');
    }
    
    if ($rolId < 1 || $rolId > 2) {
        throw new Exception('El rol debe ser Admin (2) o Superadmin (1)');
    }
    
    if (strlen($username) > 10) {
        throw new Exception('El nombre de usuario no puede tener más de 10 caracteres');
    }
    
    if (strlen($username) < 3) {
        throw new Exception('El nombre de usuario debe tener al menos 3 caracteres');
    }
    
    // Validar que el nombre de usuario solo contenga caracteres válidos
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        throw new Exception('El nombre de usuario solo puede contener letras, números y guiones bajos');
    }
    
    // Si se proporciona una nueva contraseña, validarla
    if ($password !== null && $password !== '') {
        if (strlen($password) < 7 || strlen($password) > 12) {
            throw new Exception('La contraseña debe tener entre 7 y 12 caracteres');
        }
    }
    
    // Verificar que el rol existe
    $sqlRol = "SELECT rol_id, nombre FROM roles WHERE rol_id = :rol_id";
    $stmtRol = $pdo->prepare($sqlRol);
    $stmtRol->bindParam(':rol_id', $rolId, PDO::PARAM_INT);
    $stmtRol->execute();
    $rol = $stmtRol->fetch();
    
    if (!$rol) {
        throw new Exception('El rol seleccionado no existe');
    }
    
    // Verificar que el usuario existe
    $sqlCheckUser = "SELECT user_id FROM usuarios WHERE user_id = :user_id";
    $stmtCheckUser = $pdo->prepare($sqlCheckUser);
    $stmtCheckUser->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmtCheckUser->execute();
    $existingUser = $stmtCheckUser->fetch();
    
    if (!$existingUser) {
        throw new Exception('El usuario no existe');
    }
    
    // Verificar que el nombre de usuario no existe en otro usuario
    $sqlCheckUsername = "SELECT user_id FROM usuarios WHERE username = :username AND user_id != :user_id";
    $stmtCheckUsername = $pdo->prepare($sqlCheckUsername);
    $stmtCheckUsername->bindParam(':username', $username, PDO::PARAM_STR);
    $stmtCheckUsername->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmtCheckUsername->execute();
    $existingUsername = $stmtCheckUsername->fetch();
    
    if ($existingUsername) {
        throw new Exception('El nombre de usuario ya existe en otro usuario');
    }
    
    // Preparar la consulta de actualización
    if ($password !== null && $password !== '') {
        // Actualizar con nueva contraseña
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $sql = "UPDATE usuarios SET username = :username, rol_id = :rol_id, password = :password WHERE user_id = :user_id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':password', $hashedPassword, PDO::PARAM_STR);
    } else {
        // Actualizar sin cambiar contraseña
        $sql = "UPDATE usuarios SET username = :username, rol_id = :rol_id WHERE user_id = :user_id";
        $stmt = $pdo->prepare($sql);
    }
    
    $stmt->bindParam(':username', $username, PDO::PARAM_STR);
    $stmt->bindParam(':rol_id', $rolId, PDO::PARAM_INT);
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Usuario actualizado exitosamente',
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'rol' => $rol['nombre']
            ]
        ]);
    } else {
        throw new Exception('Error al actualizar el usuario en la base de datos');
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
