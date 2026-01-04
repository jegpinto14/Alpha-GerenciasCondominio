<?php
/**
 * Debug para recibos de documentos
 */

header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    $inmuebleId = 25; // Hardcoded para testing

    echo "=== DEBUG RECIBOS DOCUMENTOS ===\n";
    echo "Inmueble ID: $inmuebleId\n\n";

    // 1. Verificar datos en tabla ingresos
    echo "1. DATOS EN TABLA INGRESOS:\n";
    $stmt = $pdo->prepare("SELECT * FROM ingresos WHERE inmueble_id = ? AND categoria_id = 2");
    $stmt->execute([$inmuebleId]);
    $ingresos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Registros encontrados: " . count($ingresos) . "\n";
    foreach ($ingresos as $ingreso) {
        echo "- Ingreso ID: {$ingreso['ingreso_id']}, Categoria: {$ingreso['categoria_id']}, Método: {$ingreso['metodo_id']}, Fecha: {$ingreso['creado_el']}\n";
    }
    echo "\n";

    // 2. Verificar datos en detalle_ingresos
    echo "2. DATOS EN TABLA DETALLE_INGRESOS:\n";
    $stmt = $pdo->prepare("
        SELECT di.*, i.inmueble_id, i.categoria_id 
        FROM detalle_ingresos di 
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id 
        WHERE i.inmueble_id = ? AND i.categoria_id = 2
    ");
    $stmt->execute([$inmuebleId]);
    $detalles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Registros encontrados: " . count($detalles) . "\n";
    foreach ($detalles as $detalle) {
        echo "- Detalle ID: {$detalle['detalle_id']}, Ingreso ID: {$detalle['ingreso_id']}, Cantidad: {$detalle['cantidad']}, Precio: {$detalle['precio_unitario_usd']}\n";
    }
    echo "\n";

    // 3. Verificar datos en movimientos_items
    echo "3. DATOS EN TABLA MOVIMIENTOS_ITEMS:\n";
    $stmt = $pdo->prepare("
        SELECT mi.*, i.inmueble_id 
        FROM movimientos_items mi 
        INNER JOIN ingresos i ON mi.ingreso_id = i.ingreso_id 
        WHERE i.inmueble_id = ? AND i.categoria_id = 2
    ");
    $stmt->execute([$inmuebleId]);
    $movimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Registros encontrados: " . count($movimientos) . "\n";
    foreach ($movimientos as $mov) {
        echo "- Movimiento ID: {$mov['movimiento_id']}, Item ID: {$mov['item_id']}, Ingreso ID: {$mov['ingreso_id']}\n";
    }
    echo "\n";

    // 4. Verificar datos en items
    echo "4. DATOS EN TABLA ITEMS:\n";
    $stmt = $pdo->prepare("SELECT * FROM items WHERE item_id IN (SELECT item_id FROM movimientos_items WHERE ingreso_id IN (SELECT ingreso_id FROM ingresos WHERE inmueble_id = ? AND categoria_id = 2))");
    $stmt->execute([$inmuebleId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Registros encontrados: " . count($items) . "\n";
    foreach ($items as $item) {
        echo "- Item ID: {$item['item_id']}, Nombre: {$item['nombre_item']}, Categoria: {$item['categoria_id']}\n";
    }
    echo "\n";

    // 5. Probar consulta completa paso a paso
    echo "5. CONSULTA COMPLETA PASO A PASO:\n";
    
    // Paso 1: detalle_ingresos + ingresos
    $stmt = $pdo->prepare("
        SELECT di.detalle_id, di.ingreso_id, i.inmueble_id, i.categoria_id
        FROM detalle_ingresos di
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
        WHERE i.inmueble_id = ? AND i.categoria_id = 2
    ");
    $stmt->execute([$inmuebleId]);
    $paso1 = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Paso 1 (detalle_ingresos + ingresos): " . count($paso1) . " registros\n";

    // Paso 2: + movimientos_items
    $stmt = $pdo->prepare("
        SELECT di.detalle_id, di.ingreso_id, mi.item_id
        FROM detalle_ingresos di
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
        INNER JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
        WHERE i.inmueble_id = ? AND i.categoria_id = 2
    ");
    $stmt->execute([$inmuebleId]);
    $paso2 = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Paso 2 (+ movimientos_items): " . count($paso2) . " registros\n";

    // Paso 3: + items
    $stmt = $pdo->prepare("
        SELECT di.detalle_id, di.ingreso_id, it.nombre_item, it.categoria_id as item_categoria
        FROM detalle_ingresos di
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
        INNER JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
        INNER JOIN items it ON mi.item_id = it.item_id
        WHERE i.inmueble_id = ? AND i.categoria_id = 2
    ");
    $stmt->execute([$inmuebleId]);
    $paso3 = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Paso 3 (+ items): " . count($paso3) . " registros\n";
    foreach ($paso3 as $p3) {
        echo "  - Detalle: {$p3['detalle_id']}, Item: {$p3['nombre_item']}, Item Categoria: {$p3['item_categoria']}\n";
    }

    // 6. Consulta final completa
    echo "\n6. CONSULTA FINAL COMPLETA:\n";
    $stmt = $pdo->prepare("
        SELECT 
            di.detalle_id,
            di.ingreso_id,
            i.inmueble_id,
            di.fecha_pago as fecha_emision,
            it.nombre_item as nombre_documento,
            it.descripcion as descripcion_documento,
            di.cantidad,
            di.precio_unitario_usd,
            di.total_linea_usd,
            di.tasa_id,
            t.tasa,
            mp.descripcion as metodo_pago,
            i.creado_el as fecha_registro,
            di.comprobante_path
        FROM detalle_ingresos di
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
        INNER JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
        INNER JOIN items it ON mi.item_id = it.item_id
        INNER JOIN metodos_pago mp ON i.metodo_id = mp.metodo_id
        LEFT JOIN tasas t ON di.tasa_id = t.tasa_id
        WHERE i.inmueble_id = ?
          AND i.categoria_id = 2
        ORDER BY di.fecha_pago DESC
    ");
    $stmt->execute([$inmuebleId]);
    $final = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Consulta final: " . count($final) . " registros\n";
    
    if (count($final) > 0) {
        echo "DATOS ENCONTRADOS:\n";
        foreach ($final as $f) {
            echo "- Detalle ID: {$f['detalle_id']}, Documento: {$f['nombre_documento']}, Fecha: {$f['fecha_emision']}, Precio: {$f['precio_unitario_usd']}\n";
        }
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
