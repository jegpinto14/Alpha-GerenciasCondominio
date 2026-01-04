<?php
session_start();
header('Content-Type: application/json');
require_once '../../includes/database.php';

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
    
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = $input['id'] ?? '';
    $username = $input['username'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $tipo = $input['tipo'] ?? 'user';
    $house_number = $input['house_number'] ?? '';
    $house_type = $input['house_type'] ?? '';
    $owner_name = $input['owner_name'] ?? '';
    $owner_lastname = $input['owner_lastname'] ?? '';
    
    if (empty($id) || empty($username) || empty($email) || empty($house_number) || empty($owner_name)) {
        echo json_encode(['success' => false, 'message' => 'Faltan campos requeridos']);
        exit;
    }
    
    // Verificar si el usuario existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE id = ?");
    $stmt->execute([$id]);
    
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }
    
    // Verificar si el username o email ya existen en otro usuario
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE (username = ? OR email = ?) AND id != ?");
    $stmt->execute([$username, $email, $id]);
    
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'El usuario o email ya existe en otro usuario']);
        exit;
    }
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    try {
        // Actualizar usuario
        if (!empty($password)) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                UPDATE usuarios 
                SET username = ?, email = ?, password = ?, tipo = ?
                WHERE id = ?
            ");
            $stmt->execute([$username, $email, $hashedPassword, $tipo, $id]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE usuarios 
                SET username = ?, email = ?, tipo = ?
                WHERE id = ?
            ");
            $stmt->execute([$username, $email, $tipo, $id]);
        }
        
        // Actualizar vivienda
        $stmt = $pdo->prepare("
            UPDATE viviendas 
            SET numero = ?, tipo = ?, nombre_propietario = ?, apellido_propietario = ?
            WHERE usuario_id = ?
        ");
        $stmt->execute([$house_number, $house_type, $owner_name, $owner_lastname, $id]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Usuario actualizado exitosamente'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Error en update_user_super_admin.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
