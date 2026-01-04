<?php
// Configuración de conexión a la base de datos
require_once __DIR__ . '/../../includes/database.php';

// Asegurar compatibilidad con el código existente que espera FETCH_ASSOC
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// Función para obtener información completa de vivienda por cédula del propietario
function obtenerViviendaPorCedula($pdo, $cedula) {
    // PASO 1: Buscar el propietario por cédula en la tabla propietarios
    $sqlPropietario = "SELECT propietario_id, nro_documento, nombre, apellido, gmail, telefono, fecha_registro
        FROM propietarios
        WHERE nro_documento = :cedula_num
           OR CAST(nro_documento AS CHAR) = :cedula_text
        LIMIT 1";
    $stmtPropietario = $pdo->prepare($sqlPropietario);
    $cedulaInt = (int)preg_replace('/\D/', '', $cedula);
    $stmtPropietario->bindValue(':cedula_num', $cedulaInt, PDO::PARAM_INT);
    $stmtPropietario->bindValue(':cedula_text', trim($cedula), PDO::PARAM_STR);
    $stmtPropietario->execute();
    $propietario = $stmtPropietario->fetch();
    
    if (!$propietario) {
        return []; // No se encontró el propietario
    }
    
    // PASO 2: Buscar los inmuebles del propietario usando el propietario_id
    $sqlInmuebles = "
        SELECT 
            i.inmueble_id,
            i.fecha_adquirido,
            i.anio_antiguedad,
            i.tipo_entidad,
            i.entidad_id,
            tv.nombre_tipo as tipo_vivienda,
            COALESCE(dp.monto_deuda_usd, 0) as monto_deuda_usd,
            -- Información específica según el tipo de entidad
            CASE 
                WHEN i.tipo_entidad = 'casa' THEN c.nombre_casa
                WHEN i.tipo_entidad = 'apartamento' THEN CONCAT(e.nombre_edificio, ' - Piso ', a.piso, ' - Apt ', a.apartamento)
                WHEN i.tipo_entidad = 'centro_comercial' THEN CONCAT('CC - ', cc.nivel_id, ' - Local ', cc.local_id)
                WHEN i.tipo_entidad = 'establecimientos' THEN est.nombre_establecimiento
                ELSE 'Sin especificar'
            END as nombre_inmueble,
            -- Información adicional según el tipo
            CASE 
                WHEN i.tipo_entidad = 'casa' THEN av.nombre_avenida
                WHEN i.tipo_entidad = 'apartamento' THEN e.abreviatura
                ELSE NULL
            END as ubicacion_info
        FROM inmueble i
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        LEFT JOIN deuda_propetario dp ON i.inmueble_id = dp.inmueble_id
        LEFT JOIN casas c ON (i.tipo_entidad = 'casa' AND i.entidad_id = c.casa_id)
        LEFT JOIN apartamentos a ON (i.tipo_entidad = 'apartamento' AND i.entidad_id = a.apartamento_id)
        LEFT JOIN edificios e ON (i.tipo_entidad = 'apartamento' AND a.edificio_id = e.edificio_id)
        LEFT JOIN centro_comercial cc ON (i.tipo_entidad = 'centro_comercial' AND i.entidad_id = cc.cc_id)
        LEFT JOIN establecimientos est ON (i.tipo_entidad = 'establecimientos' AND i.entidad_id = est.establecimiento_id)
        LEFT JOIN avenidas av ON (i.tipo_entidad = 'casa' AND c.avenida_id = av.id_avenida)
        WHERE i.propietario_id = :propietario_id
    ";
    
    $stmtInmuebles = $pdo->prepare($sqlInmuebles);
    $stmtInmuebles->bindParam(':propietario_id', $propietario['propietario_id'], PDO::PARAM_INT);
    $stmtInmuebles->execute();
    $inmuebles = $stmtInmuebles->fetchAll();
    
    // PASO 3: Combinar la información del propietario con cada inmueble
    $resultado = [];
    foreach ($inmuebles as $inmueble) {
        $resultado[] = array_merge($inmueble, [
            'propietario_id' => $propietario['propietario_id'],
            'nombre' => $propietario['nombre'],
            'apellido' => $propietario['apellido'],
            'nro_documento' => $propietario['nro_documento'],
            'gmail' => $propietario['gmail'],
            'telefono' => $propietario['telefono'],
            'fecha_registro' => $propietario['fecha_registro']
        ]);
    }
    
    return $resultado;
}

// Función para obtener estadísticas de pagos de un propietario
function obtenerEstadisticasPagos($pdo, $propietario_id, $inmueble_id) {
    // Calcular los períodos que ya han pasado hasta el mes actual
    $mesActual = (int)date('m'); // 1-12
    
    // Obtener los pagos registrados para este inmueble (solo los períodos que ya han pasado)
    $sql = "
        SELECT 
            COUNT(CASE WHEN p.estado = 'Pagado' THEN 1 END) as pagos_realizados,
            COUNT(CASE WHEN p.estado = 'Pago Parcial' THEN 1 END) as pagos_parciales,
            COUNT(CASE WHEN p.estado = 'Rechazado' THEN 1 END) as pagos_rechazados,
            MAX(pd.Fecha) as ultimo_pago
        FROM pagos p
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        WHERE p.propietario_id = :propietario_id AND p.inmueble_id = :inmueble_id
        AND per.periodo_id <= :mes_actual
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':propietario_id', $propietario_id, PDO::PARAM_INT);
    $stmt->bindParam(':inmueble_id', $inmueble_id, PDO::PARAM_INT);
    $stmt->bindParam(':mes_actual', $mesActual, PDO::PARAM_INT);
    $stmt->execute();
    
    $resultado = $stmt->fetch();
    $resultado['total_periodos'] = $mesActual; // Total de períodos hasta el mes actual
    
    return $resultado;
}

// Función para obtener el estado de morosidad
function obtenerEstadoMorosidad($pdo, $propietario_id, $inmueble_id) {
    // Calcular los períodos que ya han pasado hasta el mes actual
    $mesActual = (int)date('m'); // 1-12
    $añoActual = (int)date('Y');
    
    // Contar períodos hasta el mes actual (por ejemplo, si estamos en octubre = 10 períodos)
    $totalPeriodosHastaHoy = $mesActual;
    
    // Obtener los pagos registrados para este inmueble (solo los períodos que ya han pasado)
    $sql = "
        SELECT 
            COUNT(CASE WHEN p.estado = 'Pagado' THEN 1 END) as periodos_pagados,
            COUNT(CASE WHEN p.estado = 'Pago Parcial' THEN 1 END) as periodos_parciales,
            COUNT(CASE WHEN p.estado = 'Rechazado' THEN 1 END) as periodos_rechazados,
            MAX(per.fecha_periodo) as ultimo_periodo_registrado
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        WHERE p.propietario_id = :propietario_id AND p.inmueble_id = :inmueble_id
        AND per.periodo_id <= :mes_actual
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':propietario_id', $propietario_id, PDO::PARAM_INT);
    $stmt->bindParam(':inmueble_id', $inmueble_id, PDO::PARAM_INT);
    $stmt->bindParam(':mes_actual', $mesActual, PDO::PARAM_INT);
    $stmt->execute();
    
    $resultado = $stmt->fetch();
    
    // Calcular períodos morosos: períodos que han pasado menos los pagados completamente
    $periodosMorosos = $totalPeriodosHastaHoy - $resultado['periodos_pagados'];
    
    return [
        'total_periodos' => $totalPeriodosHastaHoy,
        'periodos_pagados' => $resultado['periodos_pagados'],
        'periodos_parciales' => $resultado['periodos_parciales'],
        'periodos_rechazados' => $resultado['periodos_rechazados'],
        'periodos_morosos' => max(0, $periodosMorosos), // No permitir valores negativos
        'ultimo_periodo_registrado' => $resultado['ultimo_periodo_registrado']
    ];
}
?>
