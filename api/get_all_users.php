<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../includes/database.php';

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
    
    // Obtener todos los usuarios
    $stmt = $pdo->query("
        SELECT 
            u.id,
            u.username,
            u.email,
            u.tipo,
            u.fecha_registro,
            u.status,
            v.tipo as vivienda_tipo,
            v.numero_apartamento,
            v.nombre_casa,
            CONCAT(v.nombre_propietario, ' ', v.apellido_propietario) as nombre_completo
        FROM usuarios u
        LEFT JOIN viviendas v ON u.id = v.usuario_id
        ORDER BY u.fecha_registro DESC
    ");
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Log para depuración
    error_log("Usuarios encontrados: " . count($users));
    
    echo json_encode([
        'success' => true,
        'users' => $users,
        'count' => count($users)
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_all_users.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Error en el servidor: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} catch (Exception $e) {
    error_log("Error general en get_all_users.php: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'message' => 'Error general: ' . $e->getMessage()
    ]);
}
?>
