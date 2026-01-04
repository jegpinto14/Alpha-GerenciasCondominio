<?php
header('Content-Type: application/json');
session_start();
require_once '../includes/database.php';

// Usuario administrador autorizado
$ADMIN_USER = "admin@arcorui.com";

try {
    // Verificar si hay sesión activa
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'No hay sesión activa',
            'isAdmin' => false
        ]);
        exit;
    }

    // Obtener información del usuario con rol
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.username, r.nombre as tipo 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.rol_id 
        WHERE u.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'Usuario no encontrado',
            'isAdmin' => false
        ]);
        exit;
    }

    // Verificar si es administrador por rol
    $isAdmin = ($user['tipo'] === 'admin');
    
    echo json_encode([
        'success' => true,
        'isAdmin' => $isAdmin,
        'adminName' => $isAdmin ? $user['username'] : null,
        'message' => $isAdmin ? 'Acceso autorizado' : 'Acceso denegado'
    ]);

} catch (Exception $e) {
    error_log("Error en check_admin_auth.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor',
        'isAdmin' => false
    ]);
}
?>
