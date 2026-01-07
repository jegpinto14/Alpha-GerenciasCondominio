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
            CONCAT(e.nombre_edificio, ' - Piso ', a.piso, ' Apto ', a.apartamento) as nombre_vivienda,
            'Sector Corozo' as avenida
        FROM inmueble i
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        INNER JOIN apartamentos a ON i.entidad_id = a.apartamento_id
        INNER JOIN edificios e ON a.edificio_id = e.edificio_id
        WHERE i.tipo_entidad = 'apartamento'
        ORDER BY p.apellido, p.nombre, i.inmueble_id
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $viviendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    error_log("Viviendas query returned " . count($viviendas) . " rows");
    if (count($viviendas) > 0) {
        error_log("First row: " . json_encode($viviendas[0]));
    }

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
    error_log("PDO Error in get_viviendas_vinculadas.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener las viviendas vinculadas',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
