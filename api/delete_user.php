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
        
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'ID de usuario requerido']);
            exit;
        }
        
        // No permitir eliminar el propio usuario
        if ($userId == $_SESSION['user_id']) {
            echo json_encode(['success' => false, 'message' => 'No puedes eliminar tu propia cuenta']);
            exit;
        }
        
        // Verificar si el usuario tiene viviendas asociadas
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM viviendas WHERE usuario_id = ?");
        $stmt->execute([$userId]);
        $hasHousing = $stmt->fetchColumn();
        
        if ($hasHousing > 0) {
            echo json_encode(['success' => false, 'message' => 'No se puede eliminar un usuario que tiene viviendas registradas']);
            exit;
        }
        
        // Eliminar usuario
        $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
        $stmt->execute([$userId]);
        
        echo json_encode(['success' => true, 'message' => 'Usuario eliminado exitosamente']);
        
    } else {
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    }
    
} catch (PDOException $e) {
    error_log("Error eliminando usuario: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
