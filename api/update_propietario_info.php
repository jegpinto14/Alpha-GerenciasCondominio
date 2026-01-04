<?php
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

// Iniciar sesión
session_start();

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

    // Extraer datos de información personal
    $propietarioData = [
        'nombre' => $input['name'] ?? '',
        'apellido' => $input['apellido'] ?? '',
        'gmail' => $input['email'] ?? '',
        'nro_documento' => $input['cedula'] ?? '',
        'telefono' => $input['telefono'] ?? ''
    ];
    
    // Log de datos recibidos para debug
    error_log("📥 Datos recibidos del formulario:");
    error_log("  - name: " . ($propietarioData['nombre'] ?: 'VACÍO'));
    error_log("  - apellido: " . ($propietarioData['apellido'] ?: 'VACÍO'));
    error_log("  - email: " . ($propietarioData['gmail'] ?: 'VACÍO'));
    error_log("  - cedula: " . ($propietarioData['nro_documento'] ?: 'VACÍO'));
    error_log("  - telefono: " . ($propietarioData['telefono'] ?: 'VACÍO'));

    $userId = $_SESSION['user_id'];

    // Conectar a la base de datos usando el archivo de configuración
    require_once '../includes/database.php';

    // 1. Buscar el propietario vinculado al usuario (usuarios -> propietarios)
    $sqlGetPropietario = "SELECT propietario_id FROM propietarios 
                          WHERE user_id = :user_id 
                          LIMIT 1";

    $stmtGetPropietario = $pdo->prepare($sqlGetPropietario);
    $stmtGetPropietario->bindParam(':user_id', $userId);
    $stmtGetPropietario->execute();
    
    $propietarioResult = $stmtGetPropietario->fetch(PDO::FETCH_ASSOC);

    if (!$propietarioResult) {
        throw new Exception('No se encontró propietario vinculado a este usuario');
    }
    
    $propietarioId = $propietarioResult['propietario_id'];
    error_log("🏠 Propietario encontrado ID: $propietarioId para usuario ID: $userId");

    // 2. Verificar columnas disponibles en tabla propietarios
    $checkPropietarioColumns = "SHOW COLUMNS FROM propietarios";
    $stmtPropietarioColumns = $pdo->query($checkPropietarioColumns);
    $propietarioColumns = $stmtPropietarioColumns->fetchAll(PDO::FETCH_COLUMN);
    error_log("📋 Columnas disponibles en propietarios: " . implode(', ', $propietarioColumns));

    // 3. Actualizar SOLO tabla propietarios (tabla usuarios no interfiere)
    $propietarioUpdateFields = [];
    $propietarioParams = [];
    
    if (in_array('nombre', $propietarioColumns)) {
        $propietarioUpdateFields[] = "nombre = :nombre";
        $propietarioParams[':nombre'] = $propietarioData['nombre'];
    }
    
    if (in_array('apellido', $propietarioColumns)) {
        $propietarioUpdateFields[] = "apellido = :apellido";
        $propietarioParams[':apellido'] = $propietarioData['apellido'];
    }
    
    if (in_array('gmail', $propietarioColumns)) {
        $propietarioUpdateFields[] = "gmail = :gmail";
        $propietarioParams[':gmail'] = $propietarioData['gmail'];
    }
    
    if (in_array('nro_documento', $propietarioColumns)) {
        $propietarioUpdateFields[] = "nro_documento = :nro_documento";
        $propietarioParams[':nro_documento'] = $propietarioData['nro_documento'];
    }
    
    if (in_array('telefono', $propietarioColumns)) {
        $propietarioUpdateFields[] = "telefono = :telefono";
        $propietarioParams[':telefono'] = $propietarioData['telefono'];
    }
    
    $propietarioParams[':propietario_id'] = $propietarioId;
    
    if (empty($propietarioUpdateFields)) {
        throw new Exception('No hay columnas válidas para actualizar en la tabla propietarios');
    }
    
    $sqlPropietario = "UPDATE propietarios SET " . implode(', ', $propietarioUpdateFields) . " WHERE propietario_id = :propietario_id";
    error_log("📝 SQL para propietarios: " . $sqlPropietario);
    
    // Log de parámetros que se van a usar
    error_log("🔧 Parámetros a actualizar:");
    foreach ($propietarioParams as $key => $value) {
        error_log("  $key: '$value'");
    }

    $stmtPropietario = $pdo->prepare($sqlPropietario);
    foreach ($propietarioParams as $key => $value) {
        $stmtPropietario->bindValue($key, $value);
    }

    $propietarioUpdated = $stmtPropietario->execute();

    if (!$propietarioUpdated) {
        throw new Exception('Error al actualizar información personal en tabla propietarios');
    }

    error_log("✅ Información personal actualizada exitosamente en propietario ID $propietarioId");

    // 4. Respuesta enfocada solo en propietarios
    $response = [
        'success' => true,
        'message' => 'Información personal actualizada correctamente',
        'propietario' => [
            'id' => $propietarioId,
            'campos_actualizados' => count($propietarioUpdateFields),
            'campos' => array_keys(array_filter($propietarioData))
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log('Error en update_propietario_info.php: ' . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>