<?php
session_start();
header('Content-Type: application/json');
require_once '../../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Verificar que sea super admin o admin
    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || ($user['tipo'] !== 'super_admin' && $user['tipo'] !== 'admin')) {
        echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
        exit;
    }
    
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    $username = $input['username'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $tipo = $input['tipo'] ?? 'user';
    $nombre = $input['nombre'] ?? '';
    $apellido = $input['apellido'] ?? '';
    $cedula = $input['cedula'] ?? '';
    $telefono = $input['telefono'] ?? '';
    
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Faltan campos requeridos']);
        exit;
    }
    
    // Verificar si el usuario ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'El usuario o email ya existe']);
        exit;
    }
    
    // Crear usuario
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("
        INSERT INTO usuarios (username, email, password, tipo, fecha_registro) 
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$username, $email, $hashedPassword, $tipo]);
    
    $userId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => 'Usuario creado exitosamente',
        'user_id' => $userId
    ]);
    
} catch (PDOException $e) {
    error_log("Error en create_user_super_admin.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
