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
    $stmt = $pdo->prepare("SELECT user_type FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['user_type'] !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos de administrador']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $userId = $data['user_id'] ?? null;
        $status = $data['status'] ?? '';
        
        if (!$userId || !in_array($status, ['activo', 'inactivo'])) {
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
            exit;
        }
        
        // No permitir desactivar el propio usuario
        if ($userId == $_SESSION['user_id']) {
            echo json_encode(['success' => false, 'message' => 'No puedes desactivar tu propia cuenta']);
            exit;
        }
        
        // Actualizar estado
        $stmt = $pdo->prepare("UPDATE usuarios SET status = ? WHERE id = ?");
        $stmt->execute([$status, $userId]);
        
        echo json_encode(['success' => true, 'message' => 'Estado actualizado exitosamente']);
        
    } else {
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    }
    
} catch (PDOException $e) {
    error_log("Error cambiando estado de usuario: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
