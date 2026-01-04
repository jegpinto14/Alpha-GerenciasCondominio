<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'conexion.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $cedula = isset($input['cedula']) ? trim($input['cedula']) : '';
        $año = isset($input['anio']) ? (int)$input['anio'] : (isset($input['año']) ? (int)$input['año'] : 2025);
    } else {
        $cedula = isset($_GET['cedula']) ? trim($_GET['cedula']) : '';
        $año = isset($_GET['anio']) ? (int)$_GET['anio'] : (isset($_GET['año']) ? (int)$_GET['año'] : 2025);
    }
    
    if (empty($cedula)) {
        throw new Exception('Debe proporcionar un número de cédula');
    }
    
    // Validar formato de cédula (7-8 dígitos, solo números)
    if (!preg_match('/^\d{7,8}$/', $cedula)) {
        throw new Exception('La cédula debe tener entre 7 y 8 dígitos y contener solo números');
    }
    
    // Validar año
    if (!in_array($año, [2025, 2026])) {
        throw new Exception('El año debe ser 2025 o 2026');
    }
    
    // Buscar información de la vivienda y propietario
    $viviendas = obtenerViviendaPorCedula($pdo, $cedula);
    
    if (empty($viviendas)) {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontraron viviendas asociadas a esta cédula',
            'data' => null
        ]);
        exit;
    }
    
    $propietarioBase = $viviendas[0];
    $viviendasPreparadas = [];
    $ultimoPagoGlobal = null;
    
    foreach ($viviendas as $viviendaData) {
        $pagos = obtenerPagosPorPropietario($pdo, $viviendaData['propietario_id'], $viviendaData['inmueble_id'], $año);
        $estadisticasPagos = obtenerEstadisticasPagos($pdo, $viviendaData['propietario_id'], $viviendaData['inmueble_id']);
        $estadoMorosidad = obtenerEstadoMorosidad($pdo, $viviendaData['propietario_id'], $viviendaData['inmueble_id']);

        $fechaAdquirido = $viviendaData['fecha_adquirido'];
        if ($fechaAdquirido === '0000-00-00' || empty($fechaAdquirido)) {
            $fechaAdquirido = 'No registrada';
        } else {
            $fechaAdquirido = date('d/m/Y', strtotime($fechaAdquirido));
        }

        $ultimoPagoPropiedad = $estadisticasPagos['ultimo_pago'] ?? null;
        if ($ultimoPagoPropiedad && ($ultimoPagoGlobal === null || strtotime($ultimoPagoPropiedad) > strtotime($ultimoPagoGlobal))) {
            $ultimoPagoGlobal = $ultimoPagoPropiedad;
        }

        $viviendasPreparadas[] = [
            'inmueble_id' => $viviendaData['inmueble_id'],
            'propietario_id' => $viviendaData['propietario_id'],
            'tipo_vivienda' => $viviendaData['tipo_vivienda'],
            'tipo_entidad' => $viviendaData['tipo_entidad'],
            'nombre_inmueble' => $viviendaData['nombre_inmueble'],
            'ubicacion_info' => $viviendaData['ubicacion_info'],
            'fecha_adquirido' => $fechaAdquirido,
            'anio_antiguedad' => $viviendaData['anio_antiguedad'],
            'monto_deuda_usd' => $viviendaData['monto_deuda_usd'] ?? 0,
            'pagos' => $pagos,
            'estadisticas_pagos' => [
                'pagos_realizados' => $estadisticasPagos['pagos_realizados'] ?? 0,
                'pagos_parciales' => $estadisticasPagos['pagos_parciales'] ?? 0,
                'pagos_rechazados' => $estadisticasPagos['pagos_rechazados'] ?? 0,
                'total_periodos' => $estadisticasPagos['total_periodos'] ?? 0,
                'ultimo_pago' => $ultimoPagoPropiedad ? date('d/m/Y H:i', strtotime($ultimoPagoPropiedad)) : 'Sin pagos'
            ],
            'estado_morosidad' => [
                'total_periodos' => $estadoMorosidad['total_periodos'] ?? 0,
                'periodos_pagados' => $estadoMorosidad['periodos_pagados'] ?? 0,
                'periodos_morosos' => $estadoMorosidad['periodos_morosos'] ?? 0,
                'ultimo_periodo_registrado' => $estadoMorosidad['ultimo_periodo_registrado'] ? date('m/Y', strtotime($estadoMorosidad['ultimo_periodo_registrado'])) : 'Sin períodos'
            ]
        ];
    }

    $ultimoPagoGeneral = $ultimoPagoGlobal ? date('d/m/Y H:i', strtotime($ultimoPagoGlobal)) : 'Sin pagos';

    $resultado = [
        'propietario' => [
            'propietario_id' => $propietarioBase['propietario_id'],
            'cedula' => $propietarioBase['nro_documento'],
            'nombre_completo' => $propietarioBase['nombre'] . ' ' . $propietarioBase['apellido'],
            'telefono' => $propietarioBase['telefono'],
            'email' => $propietarioBase['gmail'],
            'fecha_registro' => date('d/m/Y H:i', strtotime($propietarioBase['fecha_registro']))
        ],
        'viviendas' => $viviendasPreparadas,
        'vivienda_actual' => $viviendasPreparadas[0],
        'estadisticas' => [
            'general' => [
                'total_viviendas' => count($viviendasPreparadas),
                'ultimo_pago' => $ultimoPagoGeneral
            ]
        ]
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Información de pagos obtenida exitosamente',
        'data' => $resultado
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

// Función para obtener pagos por propietario
function obtenerPagosPorPropietario($pdo, $propietario_id, $inmueble_id, $año) {
    $sql = "
        SELECT 
            p.pago_id,
            per.periodo_id,
            MONTH(per.fecha_periodo) as mes,
            YEAR(per.fecha_periodo) as año,
            p.estado,
            pd.monto_usd,
            pd.monto_Bs,
            pd.Fecha as fecha_pago,
            pd.estado as detalle_estado
        FROM pagos p
        INNER JOIN periodos per ON p.periodo_id = per.periodo_id
        LEFT JOIN pago_detalles pd ON p.pago_id = pd.pago_id
        WHERE p.propietario_id = :propietario_id 
        AND p.inmueble_id = :inmueble_id
        AND YEAR(per.fecha_periodo) = :anio_consulta
        ORDER BY per.fecha_periodo ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':propietario_id', $propietario_id, PDO::PARAM_INT);
    $stmt->bindParam(':inmueble_id', $inmueble_id, PDO::PARAM_INT);
    $stmt->bindParam(':anio_consulta', $año, PDO::PARAM_INT);
    $stmt->execute();
    
    $pagos = $stmt->fetchAll();
    
    // Formatear los pagos
    $pagosFormateados = [];
    foreach ($pagos as $pago) {
        $estadoPago = strtoupper(trim($pago['estado'] ?? ''));
        $estadoDetalle = strtoupper(trim($pago['detalle_estado'] ?? ''));
        $estadoNormalizado = 'No Pagado';
        
        if (in_array($estadoPago, ['PAGADO', 'CONFIRMADO']) || in_array($estadoDetalle, ['PAGADO', 'CONFIRMADO'])) {
            $estadoNormalizado = 'Pagado';
        } elseif (in_array($estadoPago, ['PAGO PARCIAL', 'PARCIAL']) || in_array($estadoDetalle, ['PAGO PARCIAL'])) {
            $estadoNormalizado = 'Pago Parcial';
        } elseif ($estadoPago !== '') {
            $estadoNormalizado = ucwords(strtolower($pago['estado']));
        }

        $metodo_pago = 'N/A';
        $monto = 0;
        $moneda = 'USD';

        if ($pago['monto_usd'] && $pago['monto_usd'] > 0) {
            $monto = (float)$pago['monto_usd'];
            $moneda = 'USD';
            $metodo_pago = 'Efectivo divisa';
        } elseif ($pago['monto_Bs'] && $pago['monto_Bs'] > 0) {
            $monto = (float)$pago['monto_Bs'];
            $moneda = 'Bs';
            $metodo_pago = 'Transferencia Bs';
        }

        if ($estadoNormalizado === 'No Pagado') {
            $metodo_pago = 'N/A';
            $monto = 0;
        }

        $fechaPago = $pago['fecha_pago'];
        if (!$fechaPago || $fechaPago === '0000-00-00 00:00:00') {
            $fechaPago = null;
        }
        
        $pagosFormateados[] = [
            'pago_id' => $pago['pago_id'],
            'periodo_id' => $pago['periodo_id'],
            'mes' => (int)$pago['mes'],
            'año' => (int)$pago['año'],
            'estado' => $estadoNormalizado,
            'metodo_pago' => $metodo_pago,
            'monto' => $monto,
            'moneda' => $moneda,
            'tasa_bs' => $pago['monto_Bs'] > 0 ? '195.25' : '0',
            'fecha_pago' => $fechaPago,
            'created_at' => null
        ];
    }
    
    return $pagosFormateados;
}
?>
