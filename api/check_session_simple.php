<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Verificar que la sesión esté activa y tenga los datos necesarios
if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
    // Verificar que la sesión no haya expirado (opcional: agregar timeout)
    $session_timeout = 3600; // 1 hora en segundos
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $session_timeout)) {
        // Sesión expirada
        session_destroy();
        echo json_encode(['success' => false, 'message' => 'Sesión expirada']);
        exit;
    }

    // Actualizar última actividad
    $_SESSION['last_activity'] = time();

    try {
        require_once '../includes/database.php';

        // Solo obtener datos básicos del usuario
        $stmt = $pdo->prepare("SELECT user_id, username, email, nombre, apellido, cedula, telefono FROM usuarios WHERE user_id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode([
                'success' => true, 
                'message' => 'Sesión activa',
                'user' => $user
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        }

    } catch (Exception $e) {
        error_log("Error en check_session_simple.php: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error del servidor']);
    }

} else {
    echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
}
?>
