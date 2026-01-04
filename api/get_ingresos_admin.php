<?php
/**
 * API para obtener ingresos por categoría para administración
 * 
 * @description Obtiene todos los ingresos filtrados por categoria_id
 * @author Arcorui Community System
 * @date 2025-11-02
 */

header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    // Obtener categoria_id del parámetro GET
    $categoriaId = isset($_GET['categoria_id']) ? (int) $_GET['categoria_id'] : null;

    if (empty($categoriaId)) {
        echo json_encode(['success' => false, 'message' => 'Categoría ID requerida']);
        exit;
    }

    // Consultar ingresos por categoría con la estructura correcta de la BD
    $stmt = $pdo->prepare("
        SELECT 
            i.ingreso_id,
            i.inmueble_id,
            i.categoria_id,
            i.metodo_id,
            i.creado_el,
            i.estado,
            inm.propietario_id,
            inm.tipo_entidad,
            inm.entidad_id,
            p.nombre as nombre_propietario,
            p.apellido as apellido_propietario,
            p.nro_documento,
            p.gmail,
            mp.descripcion as metodo_pago,
            di.detalle_id,
            di.cantidad,
            di.precio_unitario_usd,
            di.total_linea_usd,
            di.tasa_id,
            di.fecha_pago,
            di.comprobante_path,
            t.tasa as tasa_bcv,
            t.fecha as tasa_fecha,
            mi.item_id,
            it.nombre_item,
            it.descripcion as descripcion_item,
            ci.nombre_categoria as categoria_item
        FROM ingresos i
        INNER JOIN inmueble inm ON i.inmueble_id = inm.inmueble_id
        INNER JOIN propietarios p ON inm.propietario_id = p.propietario_id
        INNER JOIN metodos_pago mp ON i.metodo_id = mp.metodo_id
        LEFT JOIN detalle_ingresos di ON i.ingreso_id = di.ingreso_id
        LEFT JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
        LEFT JOIN items it ON mi.item_id = it.item_id
        LEFT JOIN categoria_items ci ON it.categoria_id = ci.categoria_id
        LEFT JOIN tasas t ON di.tasa_id = t.tasa_id
        WHERE i.categoria_id = ?
        ORDER BY i.creado_el DESC
    ");
    
    $stmt->execute([$categoriaId]);
    $ingresosDb = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $ingresos = [];
    
    foreach ($ingresosDb as $ingreso) {
        // Obtener información de la entidad (casa, apartamento, etc.)
        $ubicacion = 'Inmueble #' . $ingreso['inmueble_id'];
        $tipoEntidad = $ingreso['tipo_entidad'];
        $entidadId = $ingreso['entidad_id'];
        
        // Consultar detalles de la entidad según su tipo
        if ($tipoEntidad && $entidadId) {
            try {
                switch($tipoEntidad) {
                    case 'casa':
                        $stmtCasa = $pdo->prepare("SELECT nombre_casa FROM casas WHERE casa_id = ?");
                        $stmtCasa->execute([$entidadId]);
                        $casa = $stmtCasa->fetch(PDO::FETCH_ASSOC);
                        if ($casa) {
                            $ubicacion = "Casa: " . $casa['nombre_casa'];
                        }
                        break;
                    case 'apartamento':
                        $stmtApto = $pdo->prepare("
                            SELECT a.numero_apartamento, e.nombre_edificio, n.nombre_nivel 
                            FROM apartamentos a
                            LEFT JOIN edificios e ON a.edificio_id = e.edificio_id
                            LEFT JOIN nivel_apartamentos n ON a.nivel_id = n.nivel_id
                            WHERE a.apartamento_id = ?
                        ");
                        $stmtApto->execute([$entidadId]);
                        $apto = $stmtApto->fetch(PDO::FETCH_ASSOC);
                        if ($apto) {
                            $ubicacion = "Edificio: {$apto['nombre_edificio']}, Nivel: {$apto['nombre_nivel']}, Apto: {$apto['numero_apartamento']}";
                        }
                        break;
                }
            } catch (Exception $e) {
                error_log("Error obteniendo detalles de entidad: " . $e->getMessage());
            }
        }

        $ingresos[] = [
            'ingreso_id' => (int) $ingreso['ingreso_id'],
            'detalle_id' => $ingreso['detalle_id'] ? (int) $ingreso['detalle_id'] : null,
            'inmueble_id' => (int) $ingreso['inmueble_id'],
            'propietario_id' => (int) $ingreso['propietario_id'],
            'categoria_id' => (int) $ingreso['categoria_id'],
            'nombre_propietario' => trim($ingreso['nombre_propietario'] . ' ' . $ingreso['apellido_propietario']),
            'nro_documento' => $ingreso['nro_documento'],
            'gmail' => $ingreso['gmail'],
            'ubicacion' => $ubicacion,
            'tipo_inmueble' => $tipoEntidad,
            'nombre_item' => $ingreso['nombre_item'],
            'descripcion_item' => $ingreso['descripcion_item'],
            'categoria_item' => $ingreso['categoria_item'],
            'cantidad' => $ingreso['cantidad'] ? (int) $ingreso['cantidad'] : 1,
            'precio_unitario_usd' => $ingreso['precio_unitario_usd'] ? number_format($ingreso['precio_unitario_usd'], 2, '.', '') : '0.00',
            'total_linea_usd' => $ingreso['total_linea_usd'] ? number_format($ingreso['total_linea_usd'], 2, '.', '') : '0.00',
            'metodo_pago' => $ingreso['metodo_pago'],
            'fecha_ingreso' => $ingreso['creado_el'],
            'fecha_pago' => $ingreso['fecha_pago'],
            'estado' => $ingreso['estado'],
            'comprobante_path' => $ingreso['comprobante_path'],
            'tasa_bcv' => $ingreso['tasa_bcv'] ? number_format($ingreso['tasa_bcv'], 2, '.', '') : null,
            'tasa_id' => $ingreso['tasa_id'] ? (int) $ingreso['tasa_id'] : null,
            'fecha_pago_tasa' => $ingreso['tasa_fecha'],
            'creado_el' => $ingreso['creado_el']
        ];
    }

    echo json_encode([
        'success' => true,
        'ingresos' => $ingresos,
        'total' => count($ingresos),
        'message' => count($ingresos) . ' ingreso(s) encontrado(s)'
    ]);

} catch (Exception $e) {
    error_log("Error en get_ingresos_admin.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo ingresos: ' . $e->getMessage()
    ]);
}
?>
