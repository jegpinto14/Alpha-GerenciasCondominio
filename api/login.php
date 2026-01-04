<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son obligatorios']);
        exit;
    }

    try {
        // Buscar usuario con JOIN a roles para obtener el nombre del rol
        $stmt = $pdo->prepare("
            SELECT u.user_id, u.username, u.password, u.status, r.nombre as rol_nombre 
            FROM usuarios u 
            JOIN roles r ON u.rol_id = r.rol_id 
            WHERE u.username = ? AND u.status = 'activo'
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);


        if ($user && password_verify($password, $user['password'])) {
            // Verificar si existe un propietario para este usuario
            $stmt = $pdo->prepare("SELECT propietario_id, gmail FROM propietarios WHERE user_id = ?");
            $stmt->execute([$user['user_id']]);
            $propietario = $stmt->fetch(PDO::FETCH_ASSOC);

            $email = '';
            $propietario_id = null;

            if ($propietario) {
                // El propietario ya existe
                $email = $propietario['gmail'] ?? '';
                $propietario_id = $propietario['propietario_id'];
            } else {
                // Crear un registro básico en propietarios para este usuario
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO propietarios (user_id, nombre, apellido, nro_documento, telefono) 
                        VALUES (?, 'Usuario', 'Sin Registrar', 0, '0000000000')
                    ");
                    $stmt->execute([$user['user_id']]);
                    $propietario_id = $pdo->lastInsertId();
                } catch (PDOException $e) {
                    error_log("Error creando propietario en login: " . $e->getMessage());
                }
            }

            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $email;
            $_SESSION['tipo'] = $user['rol_nombre']; // Usar el nombre del rol
            $_SESSION['last_activity'] = time(); // Timestamp de última actividad

            // Verificar si el usuario tiene inmueble registrado
            $has_housing = false;
            if ($propietario_id) {
                $stmt = $pdo->prepare("SELECT inmueble_id FROM inmueble WHERE propietario_id = ?");
                $stmt->execute([$propietario_id]);
                $inmueble = $stmt->fetch(PDO::FETCH_ASSOC);
                $has_housing = $inmueble ? true : false;
            }

            // Determinar la página de redirección según el tipo de usuario
            // Rutas relativas desde pages/auth/ (donde se ejecuta el JavaScript)
            $redirect_url = '';
            if ($user['rol_nombre'] === 'superadmin') {
                $redirect_url = '../../superadmin/html/index.html';
            } elseif ($user['rol_nombre'] === 'admin') {
                $redirect_url = '../admin/admin.php';
            } else {
                // Todos los usuarios normales van al dashboard
                $redirect_url = '../dashboard/dashboard.html';
            }

            echo json_encode([
                'success' => true,
                'message' => 'Login exitoso',
                'user' => [
                    'id' => $user['user_id'],
                    'username' => $user['username'],
                    'email' => $email,
                    'tipo' => $user['rol_nombre']
                ],
                'has_housing' => $has_housing,
                'redirect_url' => $redirect_url
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
        }

    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>