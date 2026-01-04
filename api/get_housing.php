<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener información de todos los inmuebles del usuario
    $stmt = $pdo->prepare("
        SELECT 
            i.inmueble_id,
            i.tipo_entidad,
            i.entidad_id,
            i.propietario_id,
            i.fecha_adquirido,
            i.anio_antiguedad,
            tv.nombre_tipo,
            tv.monto_mensual_usd,
            u.username,
            p.nombre,
            p.apellido,
            p.nro_documento,
            p.gmail,
            p.telefono,
            p.active_inmueble_id
        FROM inmueble i
        JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        JOIN propietarios p ON i.propietario_id = p.propietario_id
        JOIN usuarios u ON p.user_id = u.user_id
        WHERE p.user_id = ?
        ORDER BY i.fecha_adquirido DESC
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $inmuebles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($inmuebles)) {
        echo json_encode(['success' => false, 'message' => 'No se encontraron viviendas registradas']);
        exit;
    }

    // Procesar cada inmueble
    $housing_list = [];
    $activeInmuebleId = $inmuebles[0]['active_inmueble_id'] ?? null;

    foreach ($inmuebles as $inmueble) {
        $housing = [
            'inmueble_id' => $inmueble['inmueble_id'],
            'tipo' => $inmueble['nombre_tipo'],
            'tipo_entidad' => $inmueble['tipo_entidad'],
            'entidad_id' => $inmueble['entidad_id'],
            'propietario_id' => $inmueble['propietario_id'],
            'username' => $inmueble['username'],
            'is_active' => $inmueble['active_inmueble_id'] ? intval($inmueble['active_inmueble_id']) === intval($inmueble['inmueble_id']) : false,
            'nombre_propietario' => $inmueble['nombre'] ?? '',
            'apellido_propietario' => $inmueble['apellido'] ?? '',
            'cedula' => $inmueble['nro_documento'] ?? '',
            'gmail' => $inmueble['gmail'] ?? '',
            'telefono' => $inmueble['telefono'] ?? '',
            'fecha_adquirido' => $inmueble['fecha_adquirido'] ?? '',
            'antiguedad' => $inmueble['anio_antiguedad'] ?? 0,
            'montoMensualUsd' => (float) ($inmueble['monto_mensual_usd'] ?? 15.00)
        ];

        // Agregar información específica según el tipo de entidad
        if ($inmueble['tipo_entidad'] === 'apartamento') {
            // Obtener información del apartamento
            $stmt = $pdo->prepare("
                SELECT 
                    a.apartamento_id,
                    a.apartamento,
                    a.piso,
                    e.nombre_edificio
                FROM apartamentos a
                JOIN edificios e ON a.edificio_id = e.edificio_id
                WHERE a.apartamento_id = ?
            ");
            $stmt->execute([$inmueble['entidad_id']]);
            $apartamento = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($apartamento) {
                $housing['numero_apartamento'] = $apartamento['apartamento'];
                $housing['piso'] = $apartamento['piso'];
                $housing['nombre_edificio'] = $apartamento['nombre_edificio'];
                $housing['nombre_avenida'] = 'No especificada';
            }

        }

        $housing_list[] = $housing;
    }

    echo json_encode([
        'success' => true,
        'housing' => $housing_list,
        'active_inmueble_id' => $activeInmuebleId ? intval($activeInmuebleId) : null
    ]);

} catch (PDOException $e) {
    error_log("Error en get_housing.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>