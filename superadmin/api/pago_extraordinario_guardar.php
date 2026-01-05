<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

// Definir la categoría predeterminada para el sistema
// 1: Tienda, 2: Servicios, 3: Pagos Extraordinarios
define('CATEGORIA_EXTRAORDINARIOS', 3);

$metodo = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['action'] ?? ($_POST['action'] ?? '');

try {
    switch ($metodo) {
        case 'GET':
            if ($accion === 'listar_categorias') {
                listarCategorias($pdo);
            } else {
                listarProductos($pdo);
            }
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

function listarCategorias(PDO $pdo): void {
    $stmt = $pdo->query('SELECT categoria_id, nombre_categoria FROM categoria_items ORDER BY categoria_id ASC');
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $categorias
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function listarProductos(PDO $pdo): void {
    // Asegurar que la categoría existe (mantenemos la 3 por compatibilidad)
    asegurarCategoriaExiste($pdo);
    
    // Listar todos los productos sin importar la categoría
    $stmt = $pdo->query('SELECT i.item_id, i.nombre_item, i.precio, i.descripcion, i.activo, i.creado_el, i.imagen_url, i.categoria_id, i.stock, c.nombre_categoria 
                         FROM items i 
                         LEFT JOIN categoria_items c ON i.categoria_id = c.categoria_id 
                         ORDER BY i.creado_el DESC, i.item_id DESC');

    $productos = [];
    foreach ($stmt as $fila) {
        $foto = $fila['imagen_url'] ?? '';
        $fotoUrl = $foto !== '' ? '../' . ltrim($foto, '/') : '';

        $productos[] = [
            'id' => (int) $fila['item_id'],
            'nombre' => $fila['nombre_item'],
            'descripcion' => $fila['descripcion'] ?? '',
            'precio' => (float) $fila['precio'],
            'stock' => (int) $fila['stock'],
            'estado' => ((int) $fila['activo'] === 1) ? 'activo' : 'inactivo',
            'fecha' => $fila['creado_el'] ? date('Y-m-d', strtotime($fila['creado_el'])) : date('Y-m-d'),
            'foto' => $fotoUrl,
            'categoria_id' => (int) $fila['categoria_id'],
            'nombre_categoria' => $fila['nombre_categoria'] ?? 'Sin categoría'
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
    try {
        $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
        $nombre = isset($_POST['nombre']) ? trim($_POST['nombre']) : '';
        $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : '';
        $precio = isset($_POST['precio']) ? (float) $_POST['precio'] : 0.0;
        $stock = isset($_POST['stock']) ? (int) $_POST['stock'] : 0;
        $estado = isset($_POST['estado']) ? strtolower(trim($_POST['estado'])) : 'activo';
        $categoria_id = isset($_POST['categoria_id']) ? (int) $_POST['categoria_id'] : CATEGORIA_EXTRAORDINARIOS;
        $fecha = isset($_POST['fecha']) ? trim($_POST['fecha']) : date('Y-m-d');
        $imagenActual = isset($_POST['imagen_actual']) ? trim($_POST['imagen_actual']) : '';

        if ($nombre === '' || $descripcion === '' || $precio < 0 || $categoria_id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Datos incompletos o inválidos'
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return;
        }

        $activoDb = $estado === 'inactivo' ? 0 : 1;

        $rutaImagen = $imagenActual;
        if (!empty($_FILES['imagen']['name'])) {
            $resultado = subirImagen($_FILES['imagen']);
            if ($resultado === null) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'No se pudo procesar la imagen subida'
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                return;
            }
            $rutaImagen = $resultado;
        }

        if ($id > 0) {
            $sql = 'UPDATE items SET nombre_item = :nombre, precio = :precio, stock = :stock, descripcion = :descripcion, activo = :activo, imagen_url = :foto, categoria_id = :categoria WHERE item_id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        } else {
            $sql = 'INSERT INTO items (nombre_item, precio, stock, descripcion, activo, imagen_url, categoria_id, costo, utilidad, creado_el) VALUES (:nombre, :precio, :stock, :descripcion, :activo, :foto, :categoria, 0, 0, NOW())';
            $stmt = $pdo->prepare($sql);
        }

        $stmt->bindParam(':nombre', $nombre, PDO::PARAM_STR);
        $stmt->bindParam(':precio', $precio);
        $stmt->bindParam(':stock', $stock, PDO::PARAM_INT);
        $stmt->bindParam(':descripcion', $descripcion, PDO::PARAM_STR);
        $stmt->bindParam(':activo', $activoDb, PDO::PARAM_INT);
        $stmt->bindParam(':foto', $rutaImagen, PDO::PARAM_STR);
        $stmt->bindParam(':categoria', $categoria_id, PDO::PARAM_INT);
        
        if (!$stmt->execute()) {
            throw new PDOException('Error al ejecutar la consulta SQL');
        }

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
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error al guardar el producto en la base de datos',
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
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

    $activoNormalizado = strtolower($estado) === 'inactivo' ? 0 : 1;

    $stmt = $pdo->prepare('UPDATE items SET activo = :activo WHERE item_id = :id');
    $stmt->bindParam(':activo', $activoNormalizado, PDO::PARAM_INT);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $id,
            'estado' => $activoNormalizado === 1 ? 'activo' : 'inactivo'
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

    $stmtImagen = $pdo->prepare('SELECT imagen_url FROM items WHERE item_id = :id');
    $stmtImagen->bindParam(':id', $id, PDO::PARAM_INT);
    $stmtImagen->execute();
    $registro = $stmtImagen->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare('DELETE FROM items WHERE item_id = :id');
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

    if ($registro && !empty($registro['imagen_url'])) {
        $ruta = __DIR__ . '/../' . ltrim($registro['imagen_url'], '/');
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

function asegurarCategoriaExiste(PDO $pdo): void {
    // Verificar si la categoría existe
    $stmt = $pdo->prepare('SELECT categoria_id FROM categoria_items WHERE categoria_id = :categoria');
    $stmt->bindValue(':categoria', CATEGORIA_EXTRAORDINARIOS, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        // Crear la categoría si no existe
        $stmtInsert = $pdo->prepare('INSERT INTO categoria_items (categoria_id, nombre_categoria) VALUES (:categoria, :nombre)');
        $stmtInsert->bindValue(':categoria', CATEGORIA_EXTRAORDINARIOS, PDO::PARAM_INT);
        $stmtInsert->bindValue(':nombre', 'Pagos Extraordinarios', PDO::PARAM_STR);
        $stmtInsert->execute();
    }
}
