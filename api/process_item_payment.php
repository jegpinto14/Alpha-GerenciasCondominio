<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    // Obtener datos del POST
    $carta_id = $_POST['carta_id'] ?? null;
    $item_id = $_POST['item_id'] ?? null;
    $inmueble_id = $_POST['inmueble_id'] ?? null;
    $propietario_id = $_POST['propietario_id'] ?? null;
    $metodo_pago_id = $_POST['metodo_pago_id'] ?? null;
    $fecha_pago = $_POST['fecha_pago'] ?? date('Y-m-d');
    $monto_usd = $_POST['monto_usd'] ?? 0;
    $tasa_id = $_POST['tasa_id'] ?? null;
    $es_articulo_tienda = $_POST['es_articulo_tienda'] ?? '0';

    // Datos específicos según método de pago
    $telefono = $_POST['telefono'] ?? null;
    $referencia = $_POST['referencia'] ?? null;
    $banco_id_emisor = $_POST['banco_emisor_id'] ?? null; // ID del banco desde el select

    // Validar datos requeridos
    if (empty($item_id) || empty($inmueble_id) || empty($metodo_pago_id)) {
        echo json_encode([
            'success' => false,
            'message' => 'Faltan datos requeridos'
        ]);
        exit;
    }

    // Obtener información del método de pago
    $stmt = $pdo->prepare("SELECT descripcion FROM metodos_pago WHERE metodo_id = ?");
    $stmt->execute([$metodo_pago_id]);
    $metodo_pago = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$metodo_pago) {
        echo json_encode([
            'success' => false,
            'message' => 'Método de pago no válido'
        ]);
        exit;
    }

    $metodo_descripcion = strtolower($metodo_pago['descripcion']);

    // Determinar banco_receptor_id y banco_emisor_id según método de pago
    $banco_receptor_id = null;
    $banco_emisor_id = null;

    // Efectivo divisa o Efectivo bolivares: ambos NULL
    if (strpos($metodo_descripcion, 'efectivo') !== false) {
        $banco_receptor_id = null;
        $banco_emisor_id = null;
    }
    // Punto de venta: banco_receptor_id = 1, banco_emisor_id = NULL
    elseif (strpos($metodo_descripcion, 'punto de venta') !== false) {
        $banco_receptor_id = 1;
        $banco_emisor_id = null;
    }
    // Pago móvil o Transferencia: banco_receptor_id = 1, banco_emisor_id se registra
    elseif (strpos($metodo_descripcion, 'pago movil') !== false || strpos($metodo_descripcion, 'transferencia') !== false) {
        $banco_receptor_id = 1;
        
        // Validar datos requeridos para pago móvil/transferencia
        if (empty($telefono) || empty($referencia) || empty($banco_id_emisor)) {
            echo json_encode([
                'success' => false,
                'message' => 'Faltan datos bancarios requeridos para este método de pago'
            ]);
            exit;
        }

        // Verificar si ya existe el banco emisor con estos datos
        $stmt = $pdo->prepare("
            SELECT banco_emisor_id 
            FROM banco_emisor 
            WHERE banco_id = ? 
            AND telefono = ? 
            AND nro_referencia = ? 
            AND fecha_pago = ?
        ");
        $stmt->execute([$banco_id_emisor, $telefono, $referencia, $fecha_pago]);
        $banco_emisor_existente = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($banco_emisor_existente) {
            // Ya existe, usar el ID existente
            $banco_emisor_id = $banco_emisor_existente['banco_emisor_id'];
        } else {
            // No existe, crear nuevo registro en banco_emisor
            // Obtener el próximo banco_emisor_id
            $stmt = $pdo->query("SELECT COALESCE(MAX(banco_emisor_id), 0) + 1 as next_id FROM banco_emisor");
            $next_banco_emisor_id = $stmt->fetch(PDO::FETCH_ASSOC)['next_id'];

            // Obtener nro_documento del propietario
            $stmt = $pdo->prepare("
                SELECT nro_documento 
                FROM propietarios 
                WHERE propietario_id = ?
            ");
            $stmt->execute([$propietario_id]);
            $propietario = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$propietario) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Propietario no encontrado'
                ]);
                exit;
            }
            
            // Usar 'V' como tipo_documento por defecto (personas naturales)
            $tipo_documento = 'V';

            // Insertar nuevo banco emisor
            $stmt = $pdo->prepare("
                INSERT INTO banco_emisor 
                (banco_emisor_id, banco_id, telefono, tipo_documento, nro_documento, nro_referencia, fecha_pago) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $next_banco_emisor_id,
                $banco_id_emisor,
                $telefono,
                $tipo_documento,
                $propietario['nro_documento'],
                $referencia,
                $fecha_pago
            ]);

            $banco_emisor_id = $next_banco_emisor_id;
        }
    }

    // Validar y procesar comprobante
    $comprobante_path = '';
    if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/../uploads/comprobantes/';

        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        $file_extension = pathinfo($_FILES['comprobante']['name'], PATHINFO_EXTENSION);
        $new_filename = 'comprobante_' . time() . '_' . $item_id . '.' . $file_extension;
        $comprobante_path = 'uploads/comprobantes/' . $new_filename;
        $full_path = $upload_dir . $new_filename;

        if (!move_uploaded_file($_FILES['comprobante']['tmp_name'], $full_path)) {
            echo json_encode([
                'success' => false,
                'message' => 'Error al subir el comprobante'
            ]);
            exit;
        }
    }

    // Obtener información del item
    $stmt = $pdo->prepare("SELECT categoria_id, precio, stock FROM items WHERE item_id = ?");
    $stmt->execute([$item_id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        echo json_encode([
            'success' => false,
            'message' => 'Item no encontrado'
        ]);
        exit;
    }

    $categoria_id = $item['categoria_id'];
    $precio_unitario = $item['precio'];
    $stock_actual = $item['stock'];

    // Validar stock para artículos de tienda
    if ($es_articulo_tienda === '1' && $stock_actual !== null && $stock_actual <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'No hay stock disponible para este artículo'
        ]);
        exit;
    }

    // Iniciar transacción
    $pdo->beginTransaction();

    try {
        // 1. Insertar en tabla ingresos
        $stmt = $pdo->prepare("
            INSERT INTO ingresos 
            (inmueble_id, categoria_id, metodo_id, estado, creado_el) 
            VALUES (?, ?, ?, 'Pendiente', NOW())
        ");
        $stmt->execute([$inmueble_id, $categoria_id, $metodo_pago_id]);
        $ingreso_id = $pdo->lastInsertId();

        // 2. Insertar en tabla detalle_ingresos
        $stmt = $pdo->query("SELECT COALESCE(MAX(detalle_id), 0) + 1 as next_id FROM detalle_ingresos");
        $next_detalle_id = $stmt->fetch(PDO::FETCH_ASSOC)['next_id'];

        $cantidad = 1;
        $total_linea_usd = $precio_unitario * $cantidad;

        // Para efectivo divisa, usar tasa_id = 1 (tasa fija o por defecto)
        if (strpos($metodo_descripcion, 'efectivo divisa') !== false && empty($tasa_id)) {
            $tasa_id = 1;
        }
        
        // Para otros métodos sin tasa, obtener tasa del día
        if (empty($tasa_id)) {
            $stmt = $pdo->prepare("SELECT tasa_id FROM tasa_bcv WHERE fecha = ? ORDER BY tasa_id DESC LIMIT 1");
            $stmt->execute([$fecha_pago]);
            $tasa_result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($tasa_result) {
                $tasa_id = $tasa_result['tasa_id'];
            } else {
                throw new Exception('No se encontró tasa BCV para la fecha seleccionada.');
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO detalle_ingresos 
            (detalle_id, ingreso_id, banco_receptor_id, banco_emisor_id, tasa_id, cantidad, precio_unitario_usd, total_linea_usd, comprobante_path, fecha_pago) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $next_detalle_id,
            $ingreso_id,
            $banco_receptor_id,
            $banco_emisor_id,
            $tasa_id,
            $cantidad,
            $precio_unitario,
            $total_linea_usd,
            $comprobante_path,
            $fecha_pago
        ]);

        // 3. Insertar en tabla movimientos_items
        $stmt = $pdo->prepare("
            INSERT INTO movimientos_items 
            (item_id, tipo_movimiento, cantidad, fecha_movimiento, ingreso_id) 
            VALUES (?, 'SALIDA', ?, ?, ?)
        ");
        $stmt->execute([$item_id, $cantidad, $fecha_pago, $ingreso_id]);

        // 4. Actualizar stock del item (solo si tiene stock)
        if ($stock_actual !== null) {
            $stmt = $pdo->prepare("
                UPDATE items 
                SET stock = stock - ? 
                WHERE item_id = ? AND stock IS NOT NULL AND stock > 0
            ");
            $stmt->execute([$cantidad, $item_id]);
        }

        // 5. Actualizar estado de la solicitud a 'Pagada' (solo si es servicio con carta_id)
        if (!empty($carta_id)) {
            $stmt = $pdo->prepare("
                UPDATE solicitudes_cartas 
                SET estado = 'Pagada' 
                WHERE carta_id = ?
            ");
            $stmt->execute([$carta_id]);
        }

        // Confirmar transacción
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Pago procesado exitosamente',
            'ingreso_id' => $ingreso_id,
            'detalle_id' => $next_detalle_id,
            'banco_receptor_id' => $banco_receptor_id,
            'banco_emisor_id' => $banco_emisor_id
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();

        // Eliminar comprobante si se subió
        if ($comprobante_path && file_exists(__DIR__ . '/../' . $comprobante_path)) {
            unlink(__DIR__ . '/../' . $comprobante_path);
        }

        throw $e;
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar el pago: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
