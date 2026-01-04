<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

error_reporting(0);
ini_set('display_errors', 0);

// Verificar sesión activa
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
    exit;
}

try {
    require_once '../includes/database.php';

    $user_id = $_SESSION['user_id'];

    // Obtener datos del usuario actual desde usuarios y propietarios
    $stmt = $pdo->prepare("
        SELECT 
            u.user_id,
            u.username,
            u.rol_id,
            p.propietario_id,
            p.nombre,
            p.apellido,
            p.nro_documento AS cedula,
            p.gmail AS email,
            p.telefono
        FROM usuarios u
        LEFT JOIN propietarios p ON u.user_id = p.user_id
        WHERE u.user_id = ?
    ");

    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo json_encode([
            'success' => true,
            'user' => $user
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
    }

} catch (Exception $e) {
    error_log("Error en get_current_user.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
?>