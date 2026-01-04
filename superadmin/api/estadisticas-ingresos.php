<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function normalizarCadena($texto) {
    $texto = strtolower(trim($texto));
    $buscar = ['á', 'é', 'í', 'ó', 'ú', 'ü'];
    $reemplazar = ['a', 'e', 'i', 'o', 'u', 'u'];
    return str_replace($buscar, $reemplazar, $texto);
}

function obtenerBalancesActuales($pdo) {
    $sql = "
        SELECT 
            mp.descripcion AS descripcion,
            COALESCE(SUM(pd.monto_usd), 0) AS total_usd,
            COALESCE(SUM(pd.monto_bs), 0) AS total_bs
        FROM pago_detalles pd
        INNER JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        WHERE pd.estado = 'Confirmado'
        GROUP BY mp.metodo_id, mp.descripcion
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $metodos = $stmt->fetchAll();

    $totales = [
        'efectivo_usd' => 0,
        'efectivo_bs' => 0,
        'banco_bs' => 0
    ];

    foreach ($metodos as $metodo) {
        $descripcion = normalizarCadena($metodo['descripcion']);
        $totalUsd = (float)$metodo['total_usd'];
        $totalBs = (float)$metodo['total_bs'];

        if (strpos($descripcion, 'efectivo') !== false) {
            if (strpos($descripcion, 'bs') !== false || strpos($descripcion, 'bolivar') !== false) {
                $totales['efectivo_bs'] += $totalBs;
            } else {
                $totales['efectivo_usd'] += $totalUsd > 0 ? $totalUsd : $totalBs;
            }
            continue;
        }

        if (
            strpos($descripcion, 'transferencia') !== false ||
            strpos($descripcion, 'punto de venta') !== false ||
            strpos($descripcion, 'pago movil') !== false
        ) {
            $totales['banco_bs'] += $totalBs;
            continue;
        }
    }

    return [
        'efectivo_usd' => round($totales['efectivo_usd'], 2),
        'efectivo_bs' => round($totales['efectivo_bs'], 2),
        'banco_bs' => round($totales['banco_bs'], 2)
    ];
}

require_once 'conexion.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $fecha_inicio = isset($input['fecha_inicio']) ? $input['fecha_inicio'] : '';
    $fecha_fin = isset($input['fecha_fin']) ? $input['fecha_fin'] : '';
    $tipo_reporte = isset($input['tipo_reporte']) ? $input['tipo_reporte'] : 'mensual';
    $metodo_pago = isset($input['metodo_pago']) ? $input['metodo_pago'] : '';
    } else {
        $fecha_inicio = isset($_GET['fecha_inicio']) ? $_GET['fecha_inicio'] : '';
        $fecha_fin = isset($_GET['fecha_fin']) ? $_GET['fecha_fin'] : '';
        $tipo_reporte = isset($_GET['tipo_reporte']) ? $_GET['tipo_reporte'] : 'mensual';
    }
    
    $solicitarSoloBalances = empty($fecha_inicio) || empty($fecha_fin);

    if ($solicitarSoloBalances) {
        $balances = obtenerBalancesActuales($pdo);
        echo json_encode([
            'success' => true,
            'message' => 'Balances obtenidos exitosamente',
            'data' => [
                'balances' => $balances
            ]
        ]);
        exit;
    }

    // Validar fechas
    $fechaInicio = new DateTime($fecha_inicio);
    $fechaFin = new DateTime($fecha_fin);
    
    if ($fechaInicio > $fechaFin) {
        throw new Exception('La fecha de inicio no puede ser posterior a la fecha fin');
    }
    
    // Obtener estadísticas
    $estadisticas = obtenerEstadisticasIngresos($pdo, $fecha_inicio, $fecha_fin, $tipo_reporte, $metodo_pago);
    
    echo json_encode([
        'success' => true,
        'message' => 'Estadísticas obtenidas exitosamente',
        'data' => $estadisticas
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'data' => null
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage(),
        'data' => null
    ]);
}

// Función para obtener estadísticas de ingresos
function obtenerEstadisticasIngresos($pdo, $fecha_inicio, $fecha_fin, $tipo_reporte, $metodo_pago = '') {
    // 1. Resumen general
    $resumen = obtenerResumenGeneral($pdo, $fecha_inicio, $fecha_fin, $metodo_pago);
    
    // 2. Estadísticas por método de pago
    $metodosPago = obtenerEstadisticasMetodosPago($pdo, $fecha_inicio, $fecha_fin, $metodo_pago);
    $balances = obtenerBalancesActuales($pdo);
    
    // 3. Estadísticas por mes
    $pagosPorMes = obtenerEstadisticasPagosPorMes($pdo, $fecha_inicio, $fecha_fin, $metodo_pago);
    
    return [
        'resumen' => $resumen,
        'balances' => $balances,
        'metodos_pago' => $metodosPago,
        'pagos_por_mes' => $pagosPorMes,
        'periodo' => [
            'fecha_inicio' => $fecha_inicio,
            'fecha_fin' => $fecha_fin,
            'tipo_reporte' => $tipo_reporte,
            'metodo_pago' => $metodo_pago
        ]
    ];
}

// Función para obtener resumen general
function obtenerResumenGeneral($pdo, $fecha_inicio, $fecha_fin, $metodo_pago = '') {
    // Total de viviendas registradas
    $sql1 = "SELECT COUNT(*) as total FROM inmueble";
    $stmt1 = $pdo->prepare($sql1);
    $stmt1->execute();
    $totalViviendas = $stmt1->fetch()['total'];
    
    // Construir filtro de método de pago
    $filtroMetodo = '';
    if (!empty($metodo_pago)) {
        $filtroMetodo = 'AND pd.metodo_id = :metodo_pago';
    }
    
    // Viviendas que pagaron en el período (basado en pago_detalles confirmados con fechas de periodos)
    $sql2 = "
        SELECT COUNT(DISTINCT p.inmueble_id) as viviendas_pagaron
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        INNER JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE per.fecha_periodo BETWEEN :fecha_inicio AND :fecha_fin
        AND pd.estado = 'Confirmado'
        $filtroMetodo
    ";
    $stmt2 = $pdo->prepare($sql2);
    $stmt2->bindParam(':fecha_inicio', $fecha_inicio);
    $stmt2->bindParam(':fecha_fin', $fecha_fin);
    if (!empty($metodo_pago)) {
        $stmt2->bindParam(':metodo_pago', $metodo_pago);
    }
    $stmt2->execute();
    $viviendasPagaron = $stmt2->fetch()['viviendas_pagaron'];
    
    // Total de personas que pagaron (basado en pago_detalles confirmados con fechas de periodos)
    $sql3 = "
        SELECT COUNT(DISTINCT p.propietario_id) as total_personas
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        INNER JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE per.fecha_periodo BETWEEN :fecha_inicio AND :fecha_fin
        AND pd.estado = 'Confirmado'
        $filtroMetodo
    ";
    $stmt3 = $pdo->prepare($sql3);
    $stmt3->bindParam(':fecha_inicio', $fecha_inicio);
    $stmt3->bindParam(':fecha_fin', $fecha_fin);
    if (!empty($metodo_pago)) {
        $stmt3->bindParam(':metodo_pago', $metodo_pago);
    }
    $stmt3->execute();
    $totalPersonas = $stmt3->fetch()['total_personas'];
    
    // Total acumulado (solo pagos confirmados con fechas de periodos)
    $sql4 = "
        SELECT 
            COALESCE(SUM(pd.monto_usd), 0) as total_usd,
            COALESCE(SUM(pd.monto_Bs), 0) as total_bs
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        INNER JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE per.fecha_periodo BETWEEN :fecha_inicio AND :fecha_fin
        AND pd.estado = 'Confirmado'
        $filtroMetodo
    ";
    $stmt4 = $pdo->prepare($sql4);
    $stmt4->bindParam(':fecha_inicio', $fecha_inicio);
    $stmt4->bindParam(':fecha_fin', $fecha_fin);
    if (!empty($metodo_pago)) {
        $stmt4->bindParam(':metodo_pago', $metodo_pago);
    }
    $stmt4->execute();
    $totales = $stmt4->fetch();
    
    // Convertir bolívares a USD (tasa aproximada 195.25)
    $tasaCambio = 195.25;
    $totalAcumulado = $totales['total_usd'] + ($totales['total_bs'] / $tasaCambio);
    
    return [
        'total_viviendas' => (int)$totalViviendas,
        'viviendas_pagaron' => (int)$viviendasPagaron,
        'total_personas' => (int)$totalPersonas,
        'total_acumulado' => round($totalAcumulado, 2),
        'total_usd' => round($totales['total_usd'], 2),
        'total_bs' => round($totales['total_bs'], 2)
    ];
}

// Función para obtener estadísticas por método de pago
function obtenerEstadisticasMetodosPago($pdo, $fecha_inicio, $fecha_fin, $metodo_pago = '') {
    // Construir filtro de método de pago
    $filtroMetodo = '';
    if (!empty($metodo_pago)) {
        $filtroMetodo = 'AND pd.metodo_id = :metodo_pago';
    }
    
    $sql = "
        SELECT 
            mp.descripcion as metodo_pago,
            COUNT(pd.pago_detalle_id) as cantidad,
            COALESCE(SUM(pd.monto_usd), 0) as total_usd,
            COALESCE(SUM(pd.monto_Bs), 0) as total_bs
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        INNER JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        INNER JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        WHERE per.fecha_periodo BETWEEN :fecha_inicio AND :fecha_fin
        AND pd.estado = 'Confirmado'
        $filtroMetodo
        GROUP BY mp.metodo_id, mp.descripcion
        ORDER BY cantidad DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':fecha_inicio', $fecha_inicio);
    $stmt->bindParam(':fecha_fin', $fecha_fin);
    if (!empty($metodo_pago)) {
        $stmt->bindParam(':metodo_pago', $metodo_pago);
    }
    $stmt->execute();
    
    $resultados = $stmt->fetchAll();
    
    // Calcular totales para porcentajes
    $totalPagos = array_sum(array_column($resultados, 'cantidad'));
    
    // Agregar porcentajes
    foreach ($resultados as &$resultado) {
        $resultado['porcentaje'] = $totalPagos > 0 ? round(($resultado['cantidad'] / $totalPagos) * 100, 1) : 0;
        $resultado['cantidad'] = (int)$resultado['cantidad'];
        $resultado['total_usd'] = round($resultado['total_usd'], 2);
        $resultado['total_bs'] = round($resultado['total_bs'], 2);
    }
    
    return $resultados;
}

// Función para obtener estadísticas por mes
function obtenerEstadisticasPagosPorMes($pdo, $fecha_inicio, $fecha_fin, $metodo_pago = '') {
    // Construir filtro de método de pago
    $filtroMetodo = '';
    if (!empty($metodo_pago)) {
        $filtroMetodo = 'AND pd.metodo_id = :metodo_pago';
    }
    
    $sql = "
        SELECT 
            DATE_FORMAT(per.fecha_periodo, '%Y-%m') as mes,
            COUNT(DISTINCT p.inmueble_id) as viviendas_pagaron,
            COUNT(pd.pago_detalle_id) as total_pagos,
            COALESCE(SUM(pd.monto_usd), 0) as total_usd,
            COALESCE(SUM(pd.monto_Bs), 0) as total_bs
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        INNER JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE per.fecha_periodo BETWEEN :fecha_inicio AND :fecha_fin
        AND pd.estado = 'Confirmado'
        $filtroMetodo
        GROUP BY DATE_FORMAT(per.fecha_periodo, '%Y-%m')
        ORDER BY mes ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':fecha_inicio', $fecha_inicio);
    $stmt->bindParam(':fecha_fin', $fecha_fin);
    if (!empty($metodo_pago)) {
        $stmt->bindParam(':metodo_pago', $metodo_pago);
    }
    $stmt->execute();
    
    $resultados = $stmt->fetchAll();
    
    // Formatear meses y calcular promedios
    $meses = [
        '01' => 'Enero', '02' => 'Febrero', '03' => 'Marzo', '04' => 'Abril',
        '05' => 'Mayo', '06' => 'Junio', '07' => 'Julio', '08' => 'Agosto',
        '09' => 'Septiembre', '10' => 'Octubre', '11' => 'Noviembre', '12' => 'Diciembre'
    ];
    
    foreach ($resultados as &$resultado) {
        $fecha = explode('-', $resultado['mes']);
        $año = $fecha[0];
        $mes = $fecha[1];
        $resultado['mes'] = $meses[$mes] . ' ' . $año;
        
        $resultado['viviendas_pagaron'] = (int)$resultado['viviendas_pagaron'];
        $resultado['total_pagos'] = (int)$resultado['total_pagos'];
        $resultado['total_usd'] = round($resultado['total_usd'], 2);
        $resultado['total_bs'] = round($resultado['total_bs'], 2);
        
        // Calcular promedios por vivienda en USD y Bs
        if ($resultado['viviendas_pagaron'] > 0) {
            $resultado['promedio_usd'] = round($resultado['total_usd'] / $resultado['viviendas_pagaron'], 2);
            $resultado['promedio_bs'] = round($resultado['total_bs'] / $resultado['viviendas_pagaron'], 2);
        } else {
            $resultado['promedio_usd'] = 0;
            $resultado['promedio_bs'] = 0;
        }

        // Mantener compatibilidad con el campo anterior
        $resultado['promedio_por_vivienda'] = $resultado['promedio_usd'];
    }
    
    return $resultados;
}
?>
