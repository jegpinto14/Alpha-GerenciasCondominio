<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Verificar que la sesión esté activa y tenga los datos necesarios
if (isset($_SESSION['user_id']) && isset($_SESSION['username']) && isset($_SESSION['email'])) {
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

    // Verificar si el usuario tiene inmueble registrado
    try {
        require_once '../includes/database.php';

        $stmt = $pdo->prepare("
            SELECT 
                COUNT(i.inmueble_id) AS total_inmuebles,
                MAX(CASE WHEN p.active_inmueble_id = i.inmueble_id THEN i.inmueble_id END) AS active_inmueble_id
            FROM inmueble i 
            JOIN propietarios p ON i.propietario_id = p.propietario_id 
            WHERE p.user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $has_housing = ($result['total_inmuebles'] > 0);
        $total_inmuebles = $result['total_inmuebles'];
        $active_inmueble_id = $result['active_inmueble_id'] ?? null;

        // Log para debugging
        error_log("Usuario ID: " . $_SESSION['user_id'] . ", Username: " . $_SESSION['username'] . ", Total inmuebles: " . $total_inmuebles);

    } catch (Exception $e) {
        error_log("Error verificando inmueble: " . $e->getMessage());
        $has_housing = false;
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'email' => $_SESSION['email'],
            'user_type' => $_SESSION['user_type'] ?? 'residente',
            'tipo' => $_SESSION['tipo'] ?? 'user'
        ],
        'has_housing' => $has_housing,
        'total_inmuebles' => $total_inmuebles ?? 0,
        'active_inmueble_id' => $active_inmueble_id ? intval($active_inmueble_id) : null
    ]);
} else {
    // No hay sesión válida
    echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
}
?>