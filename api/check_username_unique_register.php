<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['username'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username requerido']);
    exit;
}

$username = trim($input['username']);

if (empty($username)) {
    echo json_encode(['success' => false, 'message' => 'Username vacío']);
    exit;
}

// Validar longitud del username
if (strlen($username) < 3 || strlen($username) > 8) {
    echo json_encode(['success' => false, 'message' => 'El usuario debe tener entre 3 y 8 caracteres']);
    exit;
}

// Validar formato del username (solo letras, números y guiones bajos)
if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    echo json_encode(['success' => false, 'message' => 'El usuario solo puede contener letras, números y guiones bajos']);
    exit;
}

try {
    require_once '../includes/database.php';
    
    // Verificar si el username ya existe en la tabla usuarios
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM usuarios 
        WHERE username = :username
    ");
    $stmt->bindParam(':username', $username, PDO::PARAM_STR);
    $stmt->execute();
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $username_exists = $result['count'] > 0;
    
    if ($username_exists) {
        echo json_encode([
            'success' => false, 
            'message' => 'Este usuario ya está registrado',
            'username_exists' => true
        ]);
    } else {
        echo json_encode([
            'success' => true, 
            'message' => 'Usuario disponible',
            'username_exists' => false
        ]);
    }
    
} catch (Exception $e) {
    error_log('Error en check_username_unique_register.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
?>
