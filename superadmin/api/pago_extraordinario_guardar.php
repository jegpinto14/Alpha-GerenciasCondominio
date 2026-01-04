<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['action'] ?? ($_POST['action'] ?? '');

try {
    switch ($metodo) {
        case 'GET':
            listarProductos($pdo);
            break;
        case 'POST':
            manejarPost($pdo, $accion);
            break;
        case 'DELETE':
            parse_str(file_get_contents('php://input'), $datosDelete);
            $accionDelete = $datosDelete['action'] ?? 'eliminar';
            if ($accionDelete !== 'eliminar') {
                throw new RuntimeException('Acción no soportada para DELETE');
            }
            eliminarProducto($pdo, (int) ($datosDelete['id'] ?? 0));
            break;
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Método no permitido'
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servicio de pagos extraordinarios',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function listarProductos(PDO $pdo): void {
    $stmt = $pdo->query('SELECT extraordinario_id, Nombre, Precio, descripcion, estado, fecha, foto FROM pago_extraordinario ORDER BY fecha DESC, extraordinario_id DESC');

    $productos = [];
    foreach ($stmt as $fila) {
        $foto = $fila['foto'] ?? '';
        $fotoUrl = $foto !== '' ? '../' . ltrim($foto, '/') : '';

        $productos[] = [
            'id' => (int) $fila['extraordinario_id'],
            'nombre' => $fila['Nombre'],
            'descripcion' => $fila['descripcion'],
            'precio' => (float) $fila['Precio'],
            'estado' => strtolower($fila['estado']),
            'fecha' => $fila['fecha'],
            'foto' => $fotoUrl,
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $productos
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function manejarPost(PDO $pdo, string $accion): void {
    switch ($accion) {
        case 'eliminar':
            eliminarProducto($pdo, (int) ($_POST['id'] ?? 0));
            break;
        case 'estado':
            actualizarEstado($pdo, (int) ($_POST['id'] ?? 0), (string) ($_POST['estado'] ?? 'activo'));
            break;
        case 'guardar':
        case '':
            guardarProducto($pdo);
            break;
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Acción no soportada'
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;
    }
}

function guardarProducto(PDO $pdo): void {
    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
    $nombre = isset($_POST['nombre']) ? trim($_POST['nombre']) : '';
    $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : '';
    $precio = isset($_POST['precio']) ? (float) $_POST['precio'] : 0.0;
    $estado = isset($_POST['estado']) ? strtolower(trim($_POST['estado'])) : 'activo';
    $fecha = isset($_POST['fecha']) ? trim($_POST['fecha']) : date('Y-m-d');
    $imagenActual = isset($_POST['imagen_actual']) ? trim($_POST['imagen_actual']) : '';

    if ($nombre === '' || $descripcion === '' || $precio < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Datos incompletos o inválidos'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    $estadoDb = $estado === 'inactivo' ? 'inactivo' : 'activo';

    $rutaImagen = $imagenActual;
    if (!empty($_FILES['imagen']['name'])) {
        $rutaImagen = subirImagen($_FILES['imagen']);
    }

    if ($rutaImagen === null) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No se pudo procesar la imagen subida'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    if ($id > 0) {
        $sql = 'UPDATE pago_extraordinario SET Nombre = :nombre, Precio = :precio, descripcion = :descripcion, estado = :estado, fecha = :fecha, foto = :foto WHERE extraordinario_id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    } else {
        $sql = 'INSERT INTO pago_extraordinario (Nombre, Precio, descripcion, estado, fecha, foto) VALUES (:nombre, :precio, :descripcion, :estado, :fecha, :foto)';
        $stmt = $pdo->prepare($sql);
    }

    $stmt->bindParam(':nombre', $nombre, PDO::PARAM_STR);
    $stmt->bindParam(':precio', $precio);
    $stmt->bindParam(':descripcion', $descripcion, PDO::PARAM_STR);
    $stmt->bindParam(':estado', $estadoDb, PDO::PARAM_STR);
    $stmt->bindParam(':fecha', $fecha, PDO::PARAM_STR);
    $stmt->bindParam(':foto', $rutaImagen, PDO::PARAM_STR);
    $stmt->execute();

    if ($id === 0) {
        $id = (int) $pdo->lastInsertId();
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $id,
            'foto' => $rutaImagen !== '' ? '../' . ltrim($rutaImagen, '/') : ''
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function actualizarEstado(PDO $pdo, int $id, string $estado): void {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID inválido'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    $estadoNormalizado = strtolower($estado) === 'inactivo' ? 'inactivo' : 'activo';

    $stmt = $pdo->prepare('UPDATE pago_extraordinario SET estado = :estado WHERE extraordinario_id = :id');
    $stmt->bindParam(':estado', $estadoNormalizado, PDO::PARAM_STR);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $id,
            'estado' => $estadoNormalizado
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function eliminarProducto(PDO $pdo, int $id): void {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID inválido'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    $stmtImagen = $pdo->prepare('SELECT foto FROM pago_extraordinario WHERE extraordinario_id = :id');
    $stmtImagen->bindParam(':id', $id, PDO::PARAM_INT);
    $stmtImagen->execute();
    $registro = $stmtImagen->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare('DELETE FROM pago_extraordinario WHERE extraordinario_id = :id');
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Producto no encontrado'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    if ($registro && !empty($registro['foto'])) {
        $ruta = __DIR__ . '/../' . ltrim($registro['foto'], '/');
        if (is_file($ruta)) {
            @unlink($ruta);
        }
    }

    echo json_encode([
        'success' => true
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function subirImagen(array $archivo): ?string {
    if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return '';
    }

    if (($archivo['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        return null;
    }

    $tipo = $archivo['type'] ?? '';
    if (strpos($tipo, 'image/') !== 0) {
        return null;
    }

    $limite = 2 * 1024 * 1024; // 2MB
    if (($archivo['size'] ?? 0) > $limite) {
        return null;
    }

    $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    if ($ext === '') {
        $ext = 'jpg';
    }

    $directorio = __DIR__ . '/../uploads/pagos_extraordinarios/';
    if (!is_dir($directorio) && !mkdir($directorio, 0775, true) && !is_dir($directorio)) {
        return null;
    }

    $nombreArchivo = 'extra_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $rutaDestino = $directorio . $nombreArchivo;

    if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
        return null;
    }

    return 'uploads/pagos_extraordinarios/' . $nombreArchivo;
}
