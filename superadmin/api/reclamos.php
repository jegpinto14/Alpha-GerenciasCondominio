<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

function normalizarEstado(?string $estado = null): string {
    $estadoLimpio = strtolower(trim((string) $estado));
    if ($estadoLimpio === 'recibido') {
        return 'recibido';
    }
    if ($estadoLimpio === 'pendiente') {
        return 'pendiente';
    }
    return 'pendiente';
}

function construirAsunto(string $descripcion, int $id): string {
    $texto = trim($descripcion);
    if ($texto === '') {
        return 'Reclamo #' . $id;
    }

    $texto = preg_replace('/\s+/', ' ', $texto);
    if (function_exists('mb_strimwidth')) {
        $resumen = trim(mb_strimwidth($texto, 0, 70, '…', 'UTF-8'));
    } else {
        $resumen = trim(substr($texto, 0, 70) . (strlen($texto) > 70 ? '…' : ''));
    }

    return $resumen !== '' ? $resumen : 'Reclamo #' . $id;
}

function construirVivienda(array $fila): array {
    $tipo = $fila['tipo_entidad'];
    $nombre = '';
    $direccion = '';

    switch ($tipo) {
        case 'casa':
            $nombre = $fila['nombre_casa'] ?? 'Casa sin nombre';
            $avenida = $fila['avenida_casa'] ?? '';
            if ($avenida !== '') {
                $direccion = 'Av. ' . $avenida;
            }
            break;
        case 'apartamento':
            $edificio = $fila['nombre_edificio'] ?? 'Edificio';
            $piso = $fila['piso'] ?? '';
            $apartamento = $fila['apartamento'] ?? '';
            $nombre = trim(sprintf('%s - Piso %s - Apt %s', $edificio, $piso, $apartamento));
            $abreviatura = $fila['edificio_abreviatura'] ?? '';
            if ($abreviatura !== '') {
                $direccion = 'Edif. ' . $abreviatura;
            }
            break;
        case 'centro_comercial':
            $codigoLocal = $fila['codigo_local'] ?? '';
            $nivel = $fila['nivel_nombre'] ?? '';
            $nombre = 'Centro Comercial';
            if ($codigoLocal !== '' || $nivel !== '') {
                $partes = [];
                if ($nivel !== '') {
                    $partes[] = 'Nivel ' . $nivel;
                }
                if ($codigoLocal !== '') {
                    $partes[] = 'Local ' . $codigoLocal;
                }
                $nombre .= ' - ' . implode(' ', $partes);
            }
            $avenida = $fila['avenida_cc'] ?? '';
            if ($avenida !== '') {
                $direccion = 'Av. ' . $avenida;
            }
            break;
        case 'establecimientos':
            $nombre = $fila['nombre_establecimiento'] ?? 'Establecimiento';
            $avenida = $fila['avenida_est'] ?? '';
            if ($avenida !== '') {
                $direccion = 'Av. ' . $avenida;
            }
            break;
        default:
            $nombre = 'Inmueble';
            break;
    }

    return [
        'nombre' => $nombre,
        'direccion' => $direccion,
    ];
}

try {
    $sql = "
        SELECT
            r.reclamos_id,
            r.Estado,
            r.fecha,
            r.Descripcion,
            i.tipo_entidad,
            i.entidad_id,
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
            nl.nombre_nivel AS nivel_nombre,
            nl.abreviatura AS nivel_abreviatura,
            cl.codigo AS codigo_local,
            av_cc.nombre_avenida AS avenida_cc,
            est.nombre_establecimiento,
            av_est.nombre_avenida AS avenida_est
        FROM reclamos r
        INNER JOIN inmueble i ON r.inmueble_id = i.inmueble_id
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
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
        ORDER BY r.fecha DESC, r.reclamos_id DESC
    ";

    $stmt = $pdo->query($sql);
    $datos = [];

    foreach ($stmt as $fila) {
        $id = (int) $fila['reclamos_id'];
        $descripcion = $fila['Descripcion'] ?? '';
        $estado = normalizarEstado($fila['Estado'] ?? 'pendiente');
        $fechaIso = null;
        if (!empty($fila['fecha'])) {
            try {
                $zona = new DateTimeZone('America/Caracas');
                $dt = new DateTime($fila['fecha'], $zona);
                $fechaIso = $dt->format(DATE_ATOM);
            } catch (Exception $e) {
                $fechaIso = $fila['fecha'];
            }
        }

        $vecinoNombre = trim(($fila['nombre'] ?? '') . ' ' . ($fila['apellido'] ?? ''));
        if ($vecinoNombre === '') {
            $vecinoNombre = 'Propietario';
        }

        $datos[] = [
            'id' => $id,
            'estado' => $estado,
            'fecha' => $fechaIso,
            'asunto' => construirAsunto($descripcion, $id),
            'mensaje' => $descripcion,
            'vecino' => [
                'nombre' => $vecinoNombre,
                'cedula' => (string) ($fila['nro_documento'] ?? ''),
                'telefono' => (string) ($fila['telefono'] ?? ''),
                'email' => $fila['gmail'] ?? ''
            ],
            'vivienda' => construirVivienda($fila)
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $datos
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener los reclamos',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
