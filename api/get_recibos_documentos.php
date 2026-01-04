<?php
/**
 * API para obtener recibos de documentos/servicios administrativos
 * 
 * @description Obtiene recibos de servicios como cartas residenciales y otros documentos
 * @author Arcorui Community System
 * @date 2025-10-31
 */

header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    $inmuebleId = isset($_GET['inmueble_id']) ? (int) $_GET['inmueble_id'] : null;

    // Debug logging
    error_log("=== DEBUG RECIBOS DOCUMENTOS ===");
    error_log("Inmueble ID recibido: " . $inmuebleId);

    if (empty($inmuebleId)) {
        error_log("ERROR: ID de inmueble vacío");
        echo json_encode(['success' => false, 'message' => 'ID de inmueble requerido']);
        exit;
    }

    /**
     * CONSULTA CORREGIDA PARA RECIBOS DE DOCUMENTOS:
     * - Tabla principal: detalle_ingresos (cada registro = un servicio/documento pagado)
     * - Filtros: categoria_id = 2 (Servicios), inmueble_id específico
     * - JOINs: ingresos -> detalle_ingresos -> movimientos_items -> items -> metodos_pago -> tasas
     */
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
            di.comprobante_path,
            i.estado
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
    $recibosDocumentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Debug logging
    error_log("Registros encontrados en consulta: " . count($recibosDocumentos));
    if (count($recibosDocumentos) > 0) {
        error_log("Primer registro: " . json_encode($recibosDocumentos[0]));
    }

    $recibos = [];
    
    /**
     * Procesamiento de recibos de documentos:
     * Cada registro representa un servicio/documento pagado
     */
    foreach ($recibosDocumentos as $recibo) {
        // Formatear fecha de emisión
        $fechaEmision = date('Y-m-d', strtotime($recibo['fecha_emision']));
        
        // Generar URL de descarga para el recibo del documento
        $downloadUrl = 'api/generate_document_receipt.php?detalle_id=' . $recibo['detalle_id'];

        $recibos[] = [
            'detalle_id' => $recibo['detalle_id'],
            'ingreso_id' => $recibo['ingreso_id'],
            'inmueble_id' => $recibo['inmueble_id'],
            'fecha_emision' => $fechaEmision,
            'nombre_documento' => $recibo['nombre_documento'],
            'descripcion_documento' => $recibo['descripcion_documento'],
            'cantidad' => (int) $recibo['cantidad'],
            'precio_unitario_usd' => number_format($recibo['precio_unitario_usd'], 2, '.', ','),
            'total_linea_usd' => number_format($recibo['total_linea_usd'], 2, '.', ','),
            'tasa_id' => $recibo['tasa_id'],
            'tasa' => $recibo['tasa'] ? number_format($recibo['tasa'], 2, '.', ',') : null,
            'metodo_pago' => $recibo['metodo_pago'],
            'fecha_registro' => $recibo['fecha_registro'],
            'comprobante_path' => $recibo['comprobante_path'],
            'estado' => $recibo['estado'],
            'filename' => 'Recibo_Documento_' . $recibo['detalle_id'] . '_' . date('Y_m_d', strtotime($recibo['fecha_emision'])) . '.pdf',
            'download_url' => $downloadUrl
        ];
    }

    echo json_encode([
        'success' => true,
        'recibos' => $recibos,
        'total' => count($recibos),
        'message' => count($recibos) . ' recibo(s) de documento(s) encontrado(s)'
    ]);

} catch (Exception $e) {
    error_log("Error en get_recibos_documentos.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo recibos de documentos: ' . $e->getMessage()
    ]);
}
?>
