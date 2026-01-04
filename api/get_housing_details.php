<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Deshabilitar errores de PHP para evitar HTML en JSON
error_reporting(0);
ini_set('display_errors', 0);

// Verificar que la sesión esté activa
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
    exit;
}

// Verificar que se proporcione el ID del inmueble
if (!isset($_GET['inmueble_id']) || empty($_GET['inmueble_id'])) {
    echo json_encode(['success' => false, 'message' => 'ID de inmueble requerido']);
    exit;
}

$inmueble_id = intval($_GET['inmueble_id']);

// Log de depuración
error_log("🔍 get_housing_details.php - inmueble_id: $inmueble_id, user_id: " . $_SESSION['user_id']);

try {
    require_once '../includes/database.php';

    // Obtener información detallada del inmueble específico
    $stmt = $pdo->prepare("
        SELECT 
            i.inmueble_id,
            i.tipo_entidad,
            i.entidad_id,
            i.propietario_id,
            i.fecha_adquirido,
            i.anio_antiguedad,
            tv.nombre_tipo,
            u.username,
            p.nombre,
            p.apellido,
            p.nro_documento,
            p.gmail,
            p.telefono
        FROM inmueble i
        JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        JOIN propietarios p ON i.propietario_id = p.propietario_id
        JOIN usuarios u ON p.user_id = u.user_id
        WHERE i.inmueble_id = ? AND p.user_id = ?
    ");
    $stmt->execute([$inmueble_id, $_SESSION['user_id']]);
    $inmueble = $stmt->fetch(PDO::FETCH_ASSOC);

    // Log de depuración
    error_log("🔍 get_housing_details.php - inmueble encontrado: " . ($inmueble ? 'SÍ' : 'NO'));

    if (!$inmueble) {
        echo json_encode(['success' => false, 'message' => 'Inmueble no encontrado o no tienes permisos']);
        exit;
    }

    // Preparar datos básicos
    $housing = [
        'inmueble_id' => $inmueble['inmueble_id'],
        'tipo' => $inmueble['nombre_tipo'],
        'tipo_entidad' => $inmueble['tipo_entidad'],
        'entidad_id' => $inmueble['entidad_id'],
        'propietario_id' => $inmueble['propietario_id'],
        'username' => $inmueble['username'],
        'nombre_propietario' => $inmueble['nombre'] ?? '',
        'apellido_propietario' => $inmueble['apellido'] ?? '',
        'cedula' => $inmueble['nro_documento'] ?? '',
        'gmail' => $inmueble['gmail'] ?? '',
        'telefono' => $inmueble['telefono'] ?? '',
        'fecha_adquirido' => $inmueble['fecha_adquirido'] ?? '',
        'antiguedad' => $inmueble['anio_antiguedad'] ?? 0
    ];

    // Obtener detalles específicos según el tipo de entidad
    if ($inmueble['tipo_entidad'] === 'apartamento') {
        $stmt = $pdo->prepare("
            SELECT 
                a.apartamento as numero_apartamento,
                a.piso,
                e.nombre_edificio
            FROM apartamentos a
            JOIN edificios e ON a.edificio_id = e.edificio_id
            WHERE a.apartamento_id = ?
        ");
        $stmt->execute([$inmueble['entidad_id']]);
        $apartamento = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($apartamento) {
            $housing['numero_apartamento'] = $apartamento['numero_apartamento'];
            $housing['piso'] = $apartamento['piso'];
            $housing['nombre_edificio'] = $apartamento['nombre_edificio'];
            $housing['nombre_avenida'] = 'Corozo'; // Los apartamentos siempre están en Corozo
        }

    } elseif ($inmueble['tipo_entidad'] === 'casa') {
        $stmt = $pdo->prepare("
            SELECT 
                c.nombre_casa,
                av.nombre_avenida
            FROM casas c
            JOIN avenidas av ON c.avenida_id = av.id_avenida
            WHERE c.casa_id = ?
        ");
        $stmt->execute([$inmueble['entidad_id']]);
        $casa = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($casa) {
            $housing['nombre_casa'] = $casa['nombre_casa'];
            $housing['nombre_avenida'] = $casa['nombre_avenida'];
        }

    } elseif ($inmueble['tipo_entidad'] === 'establecimientos') {
        $stmt = $pdo->prepare("
            SELECT nombre_establecimiento
            FROM establecimientos
            WHERE establecimiento_id = ?
        ");
        $stmt->execute([$inmueble['entidad_id']]);
        $establecimiento = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($establecimiento) {
            $housing['nombre_establecimiento'] = $establecimiento['nombre_establecimiento'];
        }

    } elseif ($inmueble['tipo_entidad'] === 'centro_comercial') {
        $stmt = $pdo->prepare("
            SELECT nombre_centro
            FROM centros_comerciales
            WHERE centro_id = ?
        ");
        $stmt->execute([$inmueble['entidad_id']]);
        $centro = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($centro) {
            $housing['nombre_centro'] = $centro['nombre_centro'];
        }
    }

    echo json_encode(['success' => true, 'housing' => $housing]);

} catch (PDOException $e) {
    error_log("Error en get_housing_details.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en la base de datos']);
} catch (Exception $e) {
    error_log("Error general en get_housing_details.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}
?>