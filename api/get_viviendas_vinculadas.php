<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../includes/database.php';

try {
    // Query para obtener todas las viviendas vinculadas a propietarios
    $query = "
        SELECT 
            i.inmueble_id,
            i.tipo_entidad,
            i.fecha_adquirido,
            i.anio_antiguedad,
            p.propietario_id,
            p.nombre,
            p.apellido,
            p.nro_documento,
            p.gmail,
            p.telefono,
            tv.nombre_tipo as tipo_vivienda,
            tv.monto_mensual_usd,
            CASE 
                WHEN i.tipo_entidad = 'casa' THEN c.nombre_casa
                WHEN i.tipo_entidad = 'apartamento' THEN CONCAT(e.nombre_edificio, ' - Piso ', a.piso, ' Apto ', a.apartamento)
                WHEN i.tipo_entidad = 'establecimientos' THEN est.nombre_establecimiento
                WHEN i.tipo_entidad = 'centro_comercial' THEN 'Centro Comercial'
                ELSE 'N/A'
            END as nombre_vivienda,
            CASE 
                WHEN i.tipo_entidad = 'casa' THEN av.nombre_avenida
                WHEN i.tipo_entidad = 'apartamento' THEN NULL
                WHEN i.tipo_entidad = 'establecimientos' THEN av2.nombre_avenida
                WHEN i.tipo_entidad = 'centro_comercial' THEN av3.nombre_avenida
                ELSE NULL
            END as avenida
        FROM inmueble i
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        LEFT JOIN casas c ON i.tipo_entidad = 'casa' AND i.entidad_id = c.casa_id
        LEFT JOIN avenidas av ON c.avenida_id = av.id_avenida
        LEFT JOIN apartamentos a ON i.tipo_entidad = 'apartamento' AND i.entidad_id = a.apartamento_id
        LEFT JOIN edificios e ON a.edificio_id = e.edificio_id
        LEFT JOIN establecimientos est ON i.tipo_entidad = 'establecimientos' AND i.entidad_id = est.establecimiento_id
        LEFT JOIN avenidas av2 ON est.avenida_id = av2.id_avenida
        LEFT JOIN centro_comercial cc ON i.tipo_entidad = 'centro_comercial' AND i.entidad_id = cc.cc_id
        LEFT JOIN avenidas av3 ON cc.avenida_id = av3.id_avenida
        ORDER BY p.apellido, p.nombre, i.inmueble_id
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $viviendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Agrupar por propietario
    $propietarios = [];
    foreach ($viviendas as $vivienda) {
        $propietario_id = $vivienda['propietario_id'];
        
        if (!isset($propietarios[$propietario_id])) {
            $propietarios[$propietario_id] = [
                'propietario_id' => $propietario_id,
                'nombre_completo' => $vivienda['nombre'] . ' ' . $vivienda['apellido'],
                'nro_documento' => $vivienda['nro_documento'],
                'gmail' => $vivienda['gmail'],
                'telefono' => $vivienda['telefono'],
                'viviendas' => []
            ];
        }
        
        $propietarios[$propietario_id]['viviendas'][] = [
            'inmueble_id' => $vivienda['inmueble_id'],
            'tipo_entidad' => $vivienda['tipo_entidad'],
            'tipo_vivienda' => $vivienda['tipo_vivienda'],
            'nombre_vivienda' => $vivienda['nombre_vivienda'],
            'avenida' => $vivienda['avenida'],
            'monto_mensual_usd' => $vivienda['monto_mensual_usd'],
            'fecha_adquirido' => $vivienda['fecha_adquirido'],
            'anio_antiguedad' => $vivienda['anio_antiguedad']
        ];
    }

    // Convertir a array indexado
    $propietarios = array_values($propietarios);

    // Estadísticas
    $stats = [
        'total_propietarios' => count($propietarios),
        'total_viviendas' => count($viviendas),
        'promedio_viviendas_por_propietario' => count($viviendas) > 0 ? round(count($viviendas) / count($propietarios), 2) : 0
    ];

    echo json_encode([
        'success' => true,
        'propietarios' => $propietarios,
        'stats' => $stats
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener las viviendas vinculadas',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
