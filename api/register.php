<?php
header('Content-Type: application/json');
require_once '../includes/database.php';

// Log para debuggear duplicados
error_log("REGISTER.PHP EJECUTÁNDOSE - " . date('Y-m-d H:i:s'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $confirm_password = $data['confirm_password'] ?? '';

    // Validaciones
    if (empty($username) || empty($password) || empty($confirm_password)) {
        echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios']);
        exit;
    }

    if ($password !== $confirm_password) {
        echo json_encode(['success' => false, 'message' => 'Las contraseñas no coinciden']);
        exit;
    }

    if (strlen($password) < 7 || strlen($password) > 20) {
        echo json_encode(['success' => false, 'message' => 'La contraseña debe tener entre 7 y 20 caracteres']);
        exit;
    }

    try {
        // Verificar si el usuario ya existe
        $stmt = $pdo->prepare("SELECT user_id FROM usuarios WHERE username = ?");
        $stmt->execute([$username]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => false, 'message' => 'El usuario ya existe']);
            exit;
        }

        // Iniciar transacción
        $pdo->beginTransaction();

        // Crear nuevo usuario con rol 'user' (rol_id = 3)
        error_log("INSERTANDO USUARIO: " . $username);
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO usuarios (username, password, rol_id, status) VALUES (?, ?, 3, 'activo')");
        $stmt->execute([$username, $hashed_password]);

        $user_id = $pdo->lastInsertId();
        error_log("USUARIO INSERTADO CON ID: " . $user_id);

        // Confirmar transacción
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Usuario registrado exitosamente']);

    } catch (PDOException $e) {
        // Revertir transacción en caso de error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Error en registro: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>