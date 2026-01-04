<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

function obtenerEstadoOriginal(?string $estado = null): string {
    $valor = trim((string) $estado);
    return $valor !== '' ? $valor : 'Pendiente';
}

function formatearFechaIso(?string $valor): ?string {
    if (empty($valor)) {
        return null;
    }

    try {
        $zona = new DateTimeZone('America/Caracas');
        $dt = new DateTime($valor, $zona);
        return $dt->format(DATE_ATOM);
    } catch (Exception $e) {
        return $valor;
    }
}

function construirViviendaDesdeFila(array $fila): array {
    $tipoEntidad = $fila['tipo_entidad'] ?? '';
    $tipoVivienda = $fila['tipo_vivienda_nombre'] ?? null;
    $nombre = '';
    $direccion = '';
    $avenida = '';

    switch ($tipoEntidad) {
        case 'casa':
            $nombre = $fila['nombre_casa'] ?? 'Casa';
            if (!empty($fila['avenida_casa'])) {
                $avenida = 'Av. ' . $fila['avenida_casa'];
            }
            break;
        case 'apartamento':
            $edificio = $fila['nombre_edificio'] ?? 'Edificio';
            $piso = $fila['piso'] ?? '';
            $apartamento = $fila['apartamento'] ?? '';
            $nombre = trim(sprintf('%s - Piso %s - Apt %s', $edificio, $piso, $apartamento));
            if (!empty($fila['edificio_abreviatura'])) {
                $direccion = 'Edif. ' . $fila['edificio_abreviatura'];
            }
            break;
        case 'centro_comercial':
            $nombre = 'Centro Comercial';
            $partes = [];
            if (!empty($fila['nivel_nombre'])) {
                $partes[] = 'Nivel ' . $fila['nivel_nombre'];
            }
            if (!empty($fila['codigo_local'])) {
                $partes[] = 'Local ' . $fila['codigo_local'];
            }
            if (!empty($partes)) {
                $nombre .= ' - ' . implode(' ', $partes);
            }
            if (!empty($fila['avenida_cc'])) {
                $avenida = 'Av. ' . $fila['avenida_cc'];
            }
            break;
        case 'establecimientos':
            $nombre = $fila['nombre_establecimiento'] ?? 'Establecimiento';
            if (!empty($fila['avenida_est'])) {
                $avenida = 'Av. ' . $fila['avenida_est'];
            }
            break;
        default:
            $nombre = 'Inmueble asociado';
            break;
    }

    if ($tipoVivienda === null) {
        $tipoVivienda = $tipoEntidad !== '' ? ucfirst(str_replace('_', ' ', $tipoEntidad)) : 'Inmueble';
    }

    return [
        'inmueble_id' => isset($fila['inmueble_id']) ? (int) $fila['inmueble_id'] : null,
        'nombre' => $nombre,
        'tipo' => $tipoVivienda,
        'direccion' => $direccion,
        'avenida' => $avenida,
        'deuda' => isset($fila['monto_deuda_usd']) ? (float) $fila['monto_deuda_usd'] : 0.0
    ];
}

try {
    $sql = "
        SELECT
            s.carta_id,
            s.estado,
            s.fecha,
            s.descripcion,
            i.inmueble_id,
            i.tipo_entidad,
            i.entidad_id,
            tv.nombre_tipo AS tipo_vivienda_nombre,
            p.nombre,
            p.apellido,
            p.nro_documento,
            p.gmail,
            p.telefono,
            c.nombre_casa,
            av_c.nombre_avenida AS avenida_casa,
            a.piso,
            a.apartamento,
            e.nombre_edificio,
            e.abreviatura AS edificio_abreviatura,
            nl.nombre_nivel,
            nl.abreviatura AS nivel_abreviatura,
            cl.codigo AS codigo_local,
            av_cc.nombre_avenida AS avenida_cc,
            est.nombre_establecimiento,
            av_est.nombre_avenida AS avenida_est,
            dp.monto_deuda_usd
        FROM solicitudes_cartas s
        INNER JOIN inmueble i ON s.inmueble_id = i.inmueble_id
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        LEFT JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        LEFT JOIN casas c ON (i.tipo_entidad = 'casa' AND i.entidad_id = c.casa_id)
        LEFT JOIN avenidas av_c ON c.avenida_id = av_c.id_avenida
        LEFT JOIN apartamentos a ON (i.tipo_entidad = 'apartamento' AND i.entidad_id = a.apartamento_id)
        LEFT JOIN edificios e ON a.edificio_id = e.edificio_id
        LEFT JOIN centro_comercial cc ON (i.tipo_entidad = 'centro_comercial' AND i.entidad_id = cc.cc_id)
        LEFT JOIN avenidas av_cc ON cc.avenida_id = av_cc.id_avenida
        LEFT JOIN nivel_locales nl ON cc.nivel_id = nl.nivel_id
        LEFT JOIN cod_locales cl ON cc.local_id = cl.local_id
        LEFT JOIN establecimientos est ON (i.tipo_entidad = 'establecimientos' AND i.entidad_id = est.establecimiento_id)
        LEFT JOIN avenidas av_est ON est.avenida_id = av_est.id_avenida
        LEFT JOIN deuda_propetario dp ON i.inmueble_id = dp.inmueble_id
        ORDER BY s.fecha DESC, s.carta_id DESC
    ";

    $stmt = $pdo->query($sql);
    $solicitudes = [];

    foreach ($stmt as $fila) {
        $nombreSolicitante = trim(($fila['nombre'] ?? '') . ' ' . ($fila['apellido'] ?? ''));
        if ($nombreSolicitante === '') {
            $nombreSolicitante = 'Propietario';
        }

        $solicitudes[] = [
            'id' => (int) $fila['carta_id'],
            'estado' => obtenerEstadoOriginal($fila['estado'] ?? null),
            'fechaSolicitud' => formatearFechaIso($fila['fecha'] ?? null),
            'fechaRecibida' => null,
            'mensaje' => $fila['descripcion'] ?? '',
            'solicitante' => [
                'nombre' => $nombreSolicitante,
                'cedula' => (string) ($fila['nro_documento'] ?? ''),
                'telefono' => (string) ($fila['telefono'] ?? ''),
                'email' => $fila['gmail'] ?? ''
            ],
            'vivienda' => construirViviendaDesdeFila($fila)
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $solicitudes
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener las solicitudes de cartas',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
