<?php
session_start();
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email requerido']);
    exit;
}

$email = trim($input['email']);
$current_user_id = $_SESSION['user_id'];

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email vacío']);
    exit;
}

// Validar formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Formato de email inválido']);
    exit;
}

// Validar que termine en @gmail.com
if (!preg_match('/@gmail\.com$/', $email)) {
    echo json_encode(['success' => false, 'message' => 'El email debe ser de Gmail']);
    exit;
}

try {
    require_once '../includes/database.php';
    
    // Verificar si el email ya existe en la tabla propietarios
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM propietarios 
        WHERE gmail = :email AND user_id != :current_user_id
    ");
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $email_exists = $result['count'] > 0;
    
    if ($email_exists) {
        echo json_encode([
            'success' => false, 
            'message' => 'Este correo ya está registrado por otro usuario',
            'email_exists' => true
        ]);
    } else {
        echo json_encode([
            'success' => true, 
            'message' => 'Email disponible',
            'email_exists' => false
        ]);
    }
    
} catch (Exception $e) {
    error_log('Error en check_email_unique.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
?>
