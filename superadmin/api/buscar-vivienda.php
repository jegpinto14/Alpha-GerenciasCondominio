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
    // Obtener el método de la solicitud
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'POST') {
        // Obtener datos del POST
        $input = json_decode(file_get_contents('php://input'), true);
        $cedula = isset($input['cedula']) ? trim($input['cedula']) : '';
    } else {
        // Obtener datos del GET
        $cedula = isset($_GET['cedula']) ? trim($_GET['cedula']) : '';
    }
    
    // Validar que se haya enviado la cédula
    if (empty($cedula)) {
        throw new Exception('Debe proporcionar un número de cédula');
    }
    
    // Validar formato de cédula (7-8 dígitos, solo números)
    if (!preg_match('/^\d{7,8}$/', $cedula)) {
        throw new Exception('La cédula debe tener entre 7 y 8 dígitos y contener solo números');
    }
    
    // Debug: Mostrar información sobre la búsqueda
    error_log("Buscando cédula: " . $cedula);
    
    // Buscar viviendas por cédula
    $viviendas = obtenerViviendaPorCedula($pdo, $cedula);
    
    error_log("Resultados encontrados: " . count($viviendas));
    
    if (empty($viviendas)) {
        // Debug adicional: verificar si existe el propietario
        $sqlDebug = "SELECT propietario_id, nro_documento, nombre, apellido FROM propietarios WHERE nro_documento = :cedula";
        $stmtDebug = $pdo->prepare($sqlDebug);
        $stmtDebug->bindParam(':cedula', $cedula, PDO::PARAM_STR);
        $stmtDebug->execute();
        $propietarioDebug = $stmtDebug->fetch();
        
        if (!$propietarioDebug) {
            // Intentar con CAST
            $sqlDebug2 = "SELECT propietario_id, nro_documento, nombre, apellido FROM propietarios WHERE CAST(nro_documento AS CHAR) = :cedula";
            $stmtDebug2 = $pdo->prepare($sqlDebug2);
            $stmtDebug2->bindParam(':cedula', $cedula, PDO::PARAM_STR);
            $stmtDebug2->execute();
            $propietarioDebug = $stmtDebug2->fetch();
        }
        
        if ($propietarioDebug) {
            // El propietario existe pero no tiene inmuebles
            echo json_encode([
                'success' => false,
                'message' => 'Se encontró el propietario "' . $propietarioDebug['nombre'] . ' ' . $propietarioDebug['apellido'] . '" pero no tiene inmuebles registrados',
                'data' => null,
                'debug' => [
                    'propietario_encontrado' => true,
                    'propietario_id' => $propietarioDebug['propietario_id'],
                    'nombre' => $propietarioDebug['nombre'] . ' ' . $propietarioDebug['apellido']
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'No se encontró ningún propietario con la cédula ' . $cedula,
                'data' => null,
                'debug' => [
                    'propietario_encontrado' => false,
                    'cedula_buscada' => $cedula
                ]
            ]);
        }
        exit;
    }
    
    // Procesar cada vivienda encontrada
    $resultado = [];
    foreach ($viviendas as $vivienda) {
        // Obtener estadísticas de pagos
        $estadisticasPagos = obtenerEstadisticasPagos($pdo, $vivienda['propietario_id'], $vivienda['inmueble_id']);
        
        // Obtener estado de morosidad
        $estadoMorosidad = obtenerEstadoMorosidad($pdo, $vivienda['propietario_id'], $vivienda['inmueble_id']);
        
        // Determinar el estado de la vivienda
        $estado = 'activa';
        $mesesMorosos = 0;
        
        if ($estadoMorosidad['periodos_morosos'] > 0) {
            $estado = 'morosa';
            $mesesMorosos = $estadoMorosidad['periodos_morosos'];
        }
        
        // Formatear fecha de adquisición
        $fechaAdquirido = $vivienda['fecha_adquirido'];
        if ($fechaAdquirido === '0000-00-00' || empty($fechaAdquirido)) {
            $fechaAdquirido = 'No registrada';
        } else {
            $fechaAdquirido = date('d/m/Y', strtotime($fechaAdquirido));
        }
        
        // Formatear fecha de registro
        $fechaRegistro = date('d/m/Y H:i', strtotime($vivienda['fecha_registro']));
        
        $resultado[] = [
            'inmueble_id' => $vivienda['inmueble_id'],
            'propietario_id' => $vivienda['propietario_id'],
            'tipo_vivienda' => $vivienda['tipo_vivienda'],
            'tipo_entidad' => $vivienda['tipo_entidad'],
            'nombre_inmueble' => $vivienda['nombre_inmueble'],
            'ubicacion_info' => $vivienda['ubicacion_info'],
            'fecha_adquirido' => $fechaAdquirido,
            'anio_antiguedad' => $vivienda['anio_antiguedad'],
            'estado' => $estado,
            'meses_morosos' => $mesesMorosos,
            'monto_deuda_usd' => $vivienda['monto_deuda_usd'] ?? 0,
            'propietario' => [
                'cedula' => $vivienda['nro_documento'],
                'nombre_completo' => $vivienda['nombre'] . ' ' . $vivienda['apellido'],
                'telefono' => $vivienda['telefono'],
                'email' => $vivienda['gmail'],
                'fecha_registro' => $fechaRegistro
            ],
            'estadisticas_pagos' => [
                'pagos_realizados' => $estadisticasPagos['pagos_realizados'] ?? 0,
                'pagos_parciales' => $estadisticasPagos['pagos_parciales'] ?? 0,
                'pagos_rechazados' => $estadisticasPagos['pagos_rechazados'] ?? 0,
                'total_periodos' => $estadisticasPagos['total_periodos'] ?? 0,
                'ultimo_pago' => $estadisticasPagos['ultimo_pago'] ? date('d/m/Y H:i', strtotime($estadisticasPagos['ultimo_pago'])) : 'Sin pagos'
            ],
            'estado_morosidad' => [
                'total_periodos' => $estadoMorosidad['total_periodos'] ?? 0,
                'periodos_pagados' => $estadoMorosidad['periodos_pagados'] ?? 0,
                'periodos_morosos' => $estadoMorosidad['periodos_morosos'] ?? 0,
                'ultimo_periodo_registrado' => $estadoMorosidad['ultimo_periodo_registrado'] ? date('m/Y', strtotime($estadoMorosidad['ultimo_periodo_registrado'])) : 'Sin períodos'
            ]
        ];
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Vivienda(s) encontrada(s) exitosamente',
        'data' => $resultado,
        'total' => count($resultado)
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
?>
