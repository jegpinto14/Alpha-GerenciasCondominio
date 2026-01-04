<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

try {
    // Verificar si hay sesión activa de usuario
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('No hay sesión de usuario activa');
    }

    // Leer datos JSON del request
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Datos inválidos recibidos');
    }

    // Extraer datos del cambio de usuario
    $usernameData = [
        'currentUsername' => trim($input['currentUsername'] ?? ''),
        'newUsername' => trim($input['newUsername'] ?? ''),
        'confirmUsername' => trim($input['confirmUsername'] ?? ''),
        'password' => trim($input['password'] ?? '')
    ];

    $userId = $_SESSION['user_id'];
    
    // Log de datos recibidos para debug
    error_log("👤 Datos recibidos para cambio de usuario:");
    error_log("  - currentUsername: " . ($usernameData['currentUsername'] ?: 'VACÍO'));
    error_log("  - newUsername: " . ($usernameData['newUsername'] ?: 'VACÍO'));
    error_log("  - confirmUsername: " . ($usernameData['confirmUsername'] ?: 'VACÍO'));
    error_log("  - password: " . ($usernameData['password'] ? '[PROVIDED]' : 'VACÍO'));

    // Conectar a la base de datos usando el archivo de configuración
    require_once '../includes/database.php';

    error_log("👤 Intentando cambio de usuario para usuario ID: $userId");

    // Validaciones básicas
    if (empty($usernameData['currentUsername'])) {
        throw new Exception('Debes ingresar tu usuario actual');
    }
    
    if (empty($usernameData['newUsername']) || strlen($usernameData['newUsername']) < 3) {
        throw new Exception('El nuevo usuario debe tener al menos 3 caracteres');
    }
    
    if (strlen($usernameData['newUsername']) > 8) {
        throw new Exception('El nuevo usuario no puede tener más de 8 caracteres');
    }
    
    if ($usernameData['newUsername'] !== $usernameData['confirmUsername']) {
        throw new Exception('Los nuevos usuarios no coinciden');
    }
    
    if ($usernameData['currentUsername'] === $usernameData['newUsername']) {
        throw new Exception('El nuevo usuario debe ser diferente al actual');
    }
    
    if (empty($usernameData['password'])) {
        throw new Exception('Debes ingresar tu contraseña actual para confirmar el cambio');
    }

    // 1. Obtener datos del usuario actual
    $stmt = $pdo->prepare("SELECT username, password FROM usuarios WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        error_log("❌ Usuario ID $userId no encontrado en la base de datos");
        throw new Exception('Usuario no encontrado');
    }
    
    error_log("✅ Usuario encontrado en la base de datos: {$user['username']}");
    
    // 2. Verificar que el usuario actual coincide (VALIDACIÓN CRÍTICA)
    if ($user['username'] !== $usernameData['currentUsername']) {
        error_log("❌ USUARIO ACTUAL NO COINCIDE");
        error_log("   - Usuario en BD: '{$user['username']}'");
        error_log("   - Usuario ingresado: '{$usernameData['currentUsername']}'");
        error_log("   - User ID de sesión: $userId");
        
        throw new Exception("El usuario actual no coincide. Debes ingresar: '{$user['username']}' (usuario registrado para esta sesión)");
    }
    
    error_log("✅ Usuario actual verificado correctamente: '{$user['username']}'");
    
    // 3. Verificar contraseña actual (VALIDACIÓN CRÍTICA)
    if (!password_verify($usernameData['password'], $user['password'])) {
        error_log("❌ CONTRASEÑA ACTUAL INCORRECTA para usuario ID $userId");
        error_log("   - Usuario: '{$user['username']}'");
        error_log("   - Contraseña proporcionada: '[PROVIDED]'");
        error_log("   - Hash en BD: " . substr($user['password'], 0, 20) . "...");
        throw new Exception('La contraseña actual es incorrecta. No se puede cambiar el usuario.');
    }
    
    error_log("✅ CONTRASEÑA ACTUAL VERIFICADA CORRECTAMENTE");
    
    // 4. Verificar que el nuevo usuario no existe
    $stmt = $pdo->prepare("SELECT user_id FROM usuarios WHERE username = ? AND user_id != ?");
    $stmt->execute([$usernameData['newUsername'], $userId]);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingUser) {
        error_log("❌ El nuevo usuario '{$usernameData['newUsername']}' ya existe");
        throw new Exception('El nuevo usuario ya está en uso por otro usuario');
    }
    
    error_log("✅ Nuevo usuario disponible");
    
    // 5. Actualizar usuario en tabla usuarios
    $update_stmt = $pdo->prepare("UPDATE usuarios SET username = ? WHERE user_id = ?");
    $result = $update_stmt->execute([$usernameData['newUsername'], $userId]);
    
    error_log("🔧 Resultado de UPDATE: " . ($result ? 'TRUE' : 'FALSE'));
    error_log("🔧 Filas afectadas: " . $update_stmt->rowCount());
    
    if ($result) {
        error_log("✅ Usuario actualizado exitosamente en tabla usuarios para usuario ID $userId");
        
        // Preparar respuesta de éxito
        $response = [
            'success' => true, 
            'message' => 'Usuario actualizado correctamente',
            'newUsername' => $usernameData['newUsername']
        ];
        
        error_log("🔧 Respuesta preparada: " . json_encode($response));
        
        // Enviar respuesta
        echo json_encode($response);
        
        error_log("✅ Respuesta enviada exitosamente");
        
        // Asegurar que el script termine correctamente
        exit(0);
    } else {
        error_log("❌ Error al actualizar usuario en tabla usuarios para usuario ID $userId");
        throw new Exception('Error al cambiar el usuario');
    }

} catch (Exception $e) {
    error_log('Error en update_username.php: ' . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
