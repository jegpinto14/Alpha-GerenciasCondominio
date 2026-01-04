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
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'ID de usuario requerido']);
        exit;
    }
    
    // Verificar que no se elimine a sí mismo
    if ($id == $_SESSION['user_id']) {
        echo json_encode(['success' => false, 'message' => 'No puedes eliminarte a ti mismo']);
        exit;
    }
    
    // Verificar que el usuario existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE id = ?");
    $stmt->execute([$id]);
    
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    try {
        // Eliminar pagos asociados
        $stmt = $pdo->prepare("DELETE FROM pagos_mensualidades WHERE vivienda_id IN (SELECT id FROM viviendas WHERE usuario_id = ?)");
        $stmt->execute([$id]);
        
        // Eliminar vivienda
        $stmt = $pdo->prepare("DELETE FROM viviendas WHERE usuario_id = ?");
        $stmt->execute([$id]);
        
        // Eliminar usuario
        $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Usuario eliminado exitosamente'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Error en delete_user_super_admin.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
