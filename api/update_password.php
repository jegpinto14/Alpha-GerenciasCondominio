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

// Verificar que sea POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Obtener datos del cuerpo de la petición
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
    exit;
}

try {
    // Conectar a la base de datos usando el archivo de configuración
    require_once '../includes/database.php';
    
    $user_id = $_SESSION['user_id'];
    $current_password = trim($data['currentPassword']);
    $new_password = trim($data['newPassword']);
    $confirm_password = trim($data['confirmPassword']);
    
    error_log("🔐 Intentando cambio de contraseña para usuario ID: $user_id");
    
    // Validaciones
    if (empty($current_password)) {
        echo json_encode(['success' => false, 'message' => 'Debes ingresar tu contraseña actual']);
        exit;
    }
    
    if (empty($new_password) || strlen($new_password) < 6) {
        echo json_encode(['success' => false, 'message' => 'La nueva contraseña debe tener al menos 6 caracteres']);
        exit;
    }
    
    if (strlen($new_password) > 20) {
        echo json_encode(['success' => false, 'message' => 'La nueva contraseña no puede tener más de 20 caracteres']);
        exit;
    }
    
    if ($new_password !== $confirm_password) {
        echo json_encode(['success' => false, 'message' => 'Las contraseñas nuevas no coinciden']);
        exit;
    }
    
    if ($current_password === $new_password) {
        echo json_encode(['success' => false, 'message' => 'La nueva contraseña debe ser diferente a la actual']);
        exit;
    }
    
    // Obtener datos del usuario actual
    $stmt = $pdo->prepare("SELECT password FROM usuarios WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        error_log("❌ Usuario ID $user_id no encontrado en la base de datos");
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }
    
    error_log("✅ Usuario encontrado en la base de datos");
    
    // Verificar contraseña actual
    if (!password_verify($current_password, $user['password'])) {
        error_log("❌ Contraseña actual incorrecta para usuario ID $user_id");
        echo json_encode(['success' => false, 'message' => 'La contraseña actual es incorrecta']);
        exit;
    }
    
    error_log("✅ Contraseña actual verificada correctamente");
    
    // Hashear nueva contraseña
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    error_log("🔐 Nueva contraseña hasheada");
    
    // Actualizar contraseña en tabla usuarios
    $update_stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE user_id = ?");
    $result = $update_stmt->execute([$hashed_password, $user_id]);
    
    if ($result) {
        error_log("✅ Contraseña actualizada exitosamente en tabla usuarios para usuario ID $user_id");
        echo json_encode(['success' => true, 'message' => 'Contraseña actualizada correctamente']);
    } else {
        error_log("❌ Error al actualizar contraseña en tabla usuarios para usuario ID $user_id");
        echo json_encode(['success' => false, 'message' => 'Error al cambiar la contraseña']);
    }
    
} catch (Exception $e) {
    error_log("Error en update_password.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
?>