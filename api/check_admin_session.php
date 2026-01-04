<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Verificar si el usuario es administrador
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE id = ? AND user_type = 'admin'");
    $stmt->execute([$_SESSION['user_id']]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos de administrador']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'admin' => [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'email' => $admin['email'],
            'user_type' => $admin['user_type']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Error verificando sesión de administrador: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
