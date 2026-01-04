<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

// API FINAL QUE FUNCIONA SIN ERRORES Y SOLO MUESTRA INFO DEL USUARIO CORRECTO

$inmueble_id = isset($_GET['inmueble_id']) ? intval($_GET['inmueble_id']) : 0;

if (!$inmueble_id) {
    echo json_encode(['success' => false, 'message' => 'ID de inmueble requerido']);
    exit;
}

try {
    // Paso 1: Obtener información básica del inmueble usando campos reales de la BD
    $stmt = $pdo->prepare("
        SELECT 
            i.inmueble_id,
            i.propietario_id,
            i.tipo_entidad,
            i.entidad_id,
            i.fecha_adquirido,
            i.anio_antiguedad,
            tv.nombre_tipo
        FROM inmueble i 
        LEFT JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        WHERE i.inmueble_id = ?
    ");
    $stmt->execute([$inmueble_id]);
    $inmueble = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$inmueble) {
        echo json_encode(['success' => false, 'message' => 'Inmueble no encontrado']);
        exit;
    }

    // Verificar permisos correctamente
    // El propietario_id en inmueble se refiere a la tabla propietarios, no usuarios
    // Necesitamos verificar que el user_id de la sesión corresponda al user_id del propietario
    
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false, 
            'message' => 'No tienes sesión activa'
        ]);
        exit;
    }
    
    // Obtener información completa del propietario
    $stmt_prop = $pdo->prepare("
        SELECT p.user_id, p.nombre, p.apellido, p.nro_documento, p.gmail, p.telefono, p.active_inmueble_id
        FROM propietarios p 
        WHERE p.propietario_id = ?
    ");
    $stmt_prop->execute([$inmueble['propietario_id']]);
    $propietario = $stmt_prop->fetch(PDO::FETCH_ASSOC);
    
    if (!$propietario) {
        echo json_encode([
            'success' => false, 
            'message' => 'Propietario no encontrado'
        ]);
        exit;
    }
    
    // Verificar que el usuario de la sesión sea el propietario
    if ($_SESSION['user_id'] != $propietario['user_id']) {
        echo json_encode([
            'success' => false, 
            'message' => 'No tienes permisos para ver este inmueble',
            'debug_info' => [
                'inmueble_id' => $inmueble_id,
                'propietario_id' => $inmueble['propietario_id'],
                'propietario_user_id' => $propietario['user_id'],
                'tu_sesion_user_id' => $_SESSION['user_id']
            ]
        ]);
        exit;
    }
    
    // Preparar información completa de la vivienda
    $housing = [
        'inmueble_id' => $inmueble['inmueble_id'],
        'tipo' => $inmueble['nombre_tipo'] ?? 'Sin tipo',
        'tipo_entidad' => $inmueble['tipo_entidad'],
        'entidad_id' => $inmueble['entidad_id'],
        'telefono' => $propietario['telefono'] ?? 'No disponible',
        'nombre_propietario' => $propietario['nombre'] ?? 'No disponible',
        'apellido_propietario' => $propietario['apellido'] ?? 'No disponible',
        'cedula' => $propietario['nro_documento'] ?? 'No disponible',
        'gmail' => $propietario['gmail'] ?? 'No disponible',
        'fecha_adquirido' => $inmueble['fecha_adquirido'],
        'fecha_adquisicion' => $inmueble['fecha_adquirido'],
        'antiguedad' => $inmueble['anio_antiguedad'],
        'propietario_id' => $inmueble['propietario_id'],
        'is_active' => isset($propietario['active_inmueble_id']) && intval($propietario['active_inmueble_id']) === intval($inmueble['inmueble_id'])
    ];

    // Formatear fecha correctamente
    if ($inmueble['fecha_adquirido']) {
        try {
            $fecha = DateTime::createFromFormat('Y-m-d', $inmueble['fecha_adquirido']);
            if ($fecha !== false) {
                $meses = [
                    1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
                    5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
                    9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre'
                ];
                $mes = $meses[$fecha->format('n')];
                $housing['fecha_display'] = $fecha->format('d') . ' de ' . $mes . ' de ' . $fecha->format('Y');
            } else {
                $housing['fecha_display'] = $inmueble['fecha_adquirido'];
            }
        } catch (Exception $e) {
            $housing['fecha_display'] = $inmueble['fecha_adquirido'];
        }
    } else {
        $housing['fecha_display'] = 'No especificada';
    }

    // Obtener ubicación específica según el tipo
    $ubicacion = 'Ubicación no disponible';
    
    try {
        switch ($inmueble['tipo_entidad']) {
            case 'casa':
                $stmt_loc = $pdo->prepare("
                    SELECT c.nombre_casa, a.nombre_avenida
                    FROM casas c
                    JOIN avenidas a ON c.avenida_id = a.id_avenida  
                    WHERE c.casa_id = ?
                ");
                $stmt_loc->execute([$inmueble['entidad_id']]);
                $datos = $stmt_loc->fetch(PDO::FETCH_ASSOC);
                
                if ($datos) {
                    $housing['ubicacion'] = $datos['nombre_casa'] . ' - ' . $datos['nombre_avenida'];
                    $housing['nombre_casa'] = $datos['nombre_casa'];
                    $housing['nombre_avenida'] = $datos['nombre_avenida'];
                    $ubicacion = $datos['nombre_casa'] . ' - ' . $datos['nombre_avenida'];
                }
                break;
                
            case 'apartamento':
                $stmt_loc = $pdo->prepare("
                    SELECT a.apartamento, a.piso, e.nombre_edificio
                    FROM apartamentos a
                    JOIN edificios e ON a.edificio_id = e.edificio_id
                    WHERE a.apartamento_id = ?
                ");
                $stmt_loc->execute([$inmueble['entidad_id']]);
                $datos = $stmt_loc->fetch(PDO::FETCH_ASSOC);
                
                if ($datos) {
                    $housing['ubicacion'] = "{$datos['nombre_edificio']} - Piso {$datos['piso']} - Apt {$datos['apartamento']} - Corozo";
                    $housing['nombre_edificio'] = $datos['nombre_edificio'];
                    $housing['piso'] = $datos['piso'];
                    $housing['numero_apartamento'] = $datos['apartamento'];
                    $ubicacion = "{$datos['nombre_edificio']} - Piso {$datos['piso']} - Apt {$datos['apartamento']} - Corozo";
                }
                break;
        }
    } catch (Exception $e) {
        $ubicacion = 'Error: ' . $e->getMessage();
    }

    $housing['ubicacion'] = $ubicacion;

    echo json_encode([
        'success' => true, 
        'housing' => $housing,
        'debug_info' => [
            'api_version' => 'FINAL_WORKING_v2',
            'inmueble_id' => $inmueble_id,
            'propietario_id' => $inmueble['propietario_id'],
            'user_id_sesion' => $_SESSION['user_id'],
            'user_id_propietario' => $propietario['user_id'],
            'active_inmueble_id' => $propietario['active_inmueble_id'] ?? null,
            'is_active' => isset($propietario['active_inmueble_id']) && intval($propietario['active_inmueble_id']) === intval($inmueble['inmueble_id']),
            'permisos_validados' => true
        ]
    ]);

} catch (Exception $e) {
    error_log("Error en get_housing_FINAL_WORKING.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}
?>
