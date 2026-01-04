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

    // Datos específicos de Grupo 1 (Pago Móvil/Transferencia)
    $banco_receptor_id = $_POST['banco_receptor_id'] ?? null;
    $banco_emisor_id = $_POST['banco_emisor_id'] ?? null;
    $telefono = $_POST['telefono'] ?? '';
    $referencia = $_POST['referencia'] ?? '';
    $monto_bs = $_POST['monto_bs'] ?? 0;
    $tasa_id = $_POST['tasa_id'] ?? null;

    // Validar datos requeridos
    if (empty($carta_id) || empty($item_id) || empty($inmueble_id) || empty($metodo_pago_id)) {
        echo json_encode([
            'success' => false,
            'message' => 'Faltan datos requeridos'
        ]);
        exit;
    }

    // Validar y procesar comprobante
    $comprobante_path = null;
    if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/../uploads/comprobantes/';

        // Crear directorio si no existe
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        $file_extension = pathinfo($_FILES['comprobante']['name'], PATHINFO_EXTENSION);
        $new_filename = 'comprobante_' . time() . '_' . $carta_id . '.' . $file_extension;
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

    // Obtener categoria_id del item
    $stmt = $pdo->prepare("SELECT categoria_id, precio FROM items WHERE item_id = ?");
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

    // Iniciar transacción
    $pdo->beginTransaction();

    try {
        // 1. Insertar en tabla ingresos
        // Campos: inmueble_id, tipo_id (NO EXISTE, usar categoria_id), metodo_id, creado_el
        // Nota: La tabla ingresos tiene tipo_id, pero según tu solicitud debe ser categoria_id
        // Voy a usar tipo_id = categoria_id para mantener compatibilidad
        $stmt = $pdo->prepare("
            INSERT INTO ingresos 
            (inmueble_id, categoria_id, metodo_id, creado_el) 
            VALUES (?, ?, ?, NOW())
        ");

        $stmt->execute([
            $inmueble_id,
            $categoria_id,  // tipo_id = categoria_id
            $metodo_pago_id
        ]);

        $ingreso_id = $pdo->lastInsertId();

        // 2. Insertar en tabla detalle_ingresos
        // Campos: detalle_id (AUTO_INCREMENT?), ingreso_id, cantidad, tasa_id, precio_unitario_usd, total_linea_usd, comprobante_path, fecha_pago
        // Nota: detalle_id NO es AUTO_INCREMENT según el SQL, necesitamos generarlo

        // Obtener el próximo detalle_id
        $stmt = $pdo->query("SELECT COALESCE(MAX(detalle_id), 0) + 1 as next_id FROM detalle_ingresos");
        $next_detalle_id = $stmt->fetch(PDO::FETCH_ASSOC)['next_id'];

        $cantidad = 1; // Siempre 1 para servicios
        $total_linea_usd = $precio_unitario * $cantidad;

        // Validar que exista tasa_id
        if (empty($tasa_id)) {
            throw new Exception('No se proporcionó tasa_id. Debe seleccionar una fecha de pago válida.');
        }

        $stmt = $pdo->prepare("
            INSERT INTO detalle_ingresos 
            (detalle_id, ingreso_id, cantidad, tasa_id, precio_unitario_usd, total_linea_usd, comprobante_path, fecha_pago) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $next_detalle_id,
            $ingreso_id,
            $cantidad,
            $tasa_id,
            $precio_unitario,
            $total_linea_usd,
            $comprobante_path ?: '',
            $fecha_pago
        ]);

        // 3. Insertar en tabla movimientos_items
        // Campos: item_id, tipo_movimiento, cantidad, fecha_movimiento, ingreso_id
        // NO tiene descripcion ni referencia
        $stmt = $pdo->prepare("
            INSERT INTO movimientos_items 
            (item_id, tipo_movimiento, cantidad, fecha_movimiento, ingreso_id) 
            VALUES (?, 'SALIDA', ?, ?, ?)
        ");

        $stmt->execute([
            $item_id,
            $cantidad,
            $fecha_pago,
            $ingreso_id
        ]);

        // 4. Actualizar stock del item (si aplica)
        // Solo si el item tiene stock (no NULL)
        $stmt = $pdo->prepare("
            UPDATE items 
            SET stock = stock - ? 
            WHERE item_id = ? AND stock IS NOT NULL
        ");
        $stmt->execute([$cantidad, $item_id]);

        // 5. Actualizar estado de la solicitud a 'Pagada'
        $stmt = $pdo->prepare("
            UPDATE solicitudes_cartas 
            SET estado = 'Pagada' 
            WHERE carta_id = ?
        ");

        $stmt->execute([$carta_id]);

        // Confirmar transacción
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Pago procesado exitosamente',
            'ingreso_id' => $ingreso_id,
            'carta_id' => $carta_id,
            'monto_usd' => $monto_usd,
            'monto_bs' => $monto_bs
        ]);

    } catch (Exception $e) {
        // Revertir transacción en caso de error
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
