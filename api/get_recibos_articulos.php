<?php
/**
 * API para obtener recibos de artículos comprados en la comunidad
 * 
 * @description Obtiene recibos de compras realizadas en la tienda de artículos
 * @author Arcorui Community System
 * @date 2025-10-31
 */

header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    $inmuebleId = isset($_GET['inmueble_id']) ? (int) $_GET['inmueble_id'] : null;

    // Debug logging
    error_log("=== DEBUG RECIBOS ARTICULOS ===");
    error_log("Inmueble ID recibido: " . $inmuebleId);

    if (empty($inmuebleId)) {
        error_log("ERROR: ID de inmueble vacío");
        echo json_encode(['success' => false, 'message' => 'ID de inmueble requerido']);
        exit;
    }

    /**
     * CONSULTA PARA RECIBOS DE ARTÍCULOS:
     * - Tabla principal: detalle_ingresos (cada registro = un artículo pagado)
     * - Filtros: categoria_id = 1 (Artículos), inmueble_id específico
     * - JOINs: ingresos -> detalle_ingresos -> movimientos_items -> items -> metodos_pago -> tasas
     */
    $stmt = $pdo->prepare("
        SELECT 
            di.detalle_id,
            di.ingreso_id,
            i.inmueble_id,
            di.fecha_pago as fecha_emision,
            it.nombre_item as nombre_articulo,
            it.descripcion as descripcion_articulo,
            di.cantidad,
            di.precio_unitario_usd,
            di.total_linea_usd,
            di.tasa_id,
            t.tasa,
            mp.descripcion as metodo_pago,
            i.creado_el as fecha_registro,
            di.comprobante_path,
            i.estado
        FROM detalle_ingresos di
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
        INNER JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
        INNER JOIN items it ON mi.item_id = it.item_id
        INNER JOIN metodos_pago mp ON i.metodo_id = mp.metodo_id
        LEFT JOIN tasas t ON di.tasa_id = t.tasa_id
        WHERE i.inmueble_id = ?
          AND i.categoria_id = 1
        ORDER BY di.fecha_pago DESC
    ");
    
    $stmt->execute([$inmuebleId]);
    $recibosArticulos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Debug logging
    error_log("Registros encontrados en consulta: " . count($recibosArticulos));
    if (count($recibosArticulos) > 0) {
        error_log("Primer registro: " . json_encode($recibosArticulos[0]));
    }

    $recibos = [];
    
    /**
     * Procesamiento de recibos de artículos:
     * Cada registro representa un artículo comprado
     */
    foreach ($recibosArticulos as $recibo) {
        // Formatear fecha de emisión
        $fechaEmision = date('Y-m-d', strtotime($recibo['fecha_emision']));
        
        // Generar URL de descarga para el recibo del artículo
        $downloadUrl = 'api/generate_article_receipt.php?detalle_id=' . $recibo['detalle_id'];

        $recibos[] = [
            'detalle_id' => $recibo['detalle_id'],
            'ingreso_id' => $recibo['ingreso_id'],
            'inmueble_id' => $recibo['inmueble_id'],
            'fecha_emision' => $fechaEmision,
            'nombre_articulo' => $recibo['nombre_articulo'],
            'descripcion_articulo' => $recibo['descripcion_articulo'],
            'cantidad' => (int) $recibo['cantidad'],
            'precio_unitario_usd' => number_format($recibo['precio_unitario_usd'], 2, '.', ','),
            'total_linea_usd' => number_format($recibo['total_linea_usd'], 2, '.', ','),
            'tasa_id' => $recibo['tasa_id'],
            'tasa' => $recibo['tasa'] ? number_format($recibo['tasa'], 2, '.', ',') : null,
            'metodo_pago' => $recibo['metodo_pago'],
            'fecha_registro' => $recibo['fecha_registro'],
            'comprobante_path' => $recibo['comprobante_path'],
            'estado' => $recibo['estado'],
            'filename' => 'Recibo_Articulo_' . $recibo['detalle_id'] . '_' . date('Y_m_d', strtotime($recibo['fecha_emision'])) . '.pdf',
            'download_url' => $downloadUrl
        ];
    }

    echo json_encode([
        'success' => true,
        'recibos' => $recibos,
        'total' => count($recibos),
        'message' => count($recibos) . ' recibo(s) de artículo(s) encontrado(s)'
    ]);

} catch (Exception $e) {
    error_log("Error en get_recibos_articulos.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo recibos de artículos: ' . $e->getMessage()
    ]);
}
?>
