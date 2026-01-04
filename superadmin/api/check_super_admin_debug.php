<?php
session_start();
header('Content-Type: application/json');
require_once '../../includes/database.php';

// Script de diagnóstico para verificar sesión
$debug = [];

// 1. Verificar si hay sesión
$debug['session_exists'] = isset($_SESSION['user_id']);
$debug['session_data'] = [
    'user_id' => $_SESSION['user_id'] ?? 'NO SET',
    'username' => $_SESSION['username'] ?? 'NO SET',
    'tipo' => $_SESSION['tipo'] ?? 'NO SET'
];

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false, 
        'message' => 'No hay sesión activa',
        'debug' => $debug
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT u.username, u.email, r.nombre as tipo 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.rol_id 
        WHERE u.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $debug['user_found'] = $user ? true : false;
    $debug['user_data'] = $user;
    
    if (!$user) {
        echo json_encode([
            'success' => false, 
            'message' => 'Usuario no encontrado en BD',
            'debug' => $debug
        ]);
        exit;
    }
    
    $debug['is_superadmin'] = ($user['tipo'] === 'superadmin');
    
    if ($user['tipo'] !== 'superadmin') {
        echo json_encode([
            'success' => false, 
            'message' => 'No es superadmin - Tipo: ' . $user['tipo'],
            'debug' => $debug
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'user' => $user,
        'debug' => $debug
    ]);
    
} catch (PDOException $e) {
    $debug['error'] = $e->getMessage();
    echo json_encode([
        'success' => false, 
        'message' => 'Error en BD',
        'debug' => $debug
    ]);
}
?>
