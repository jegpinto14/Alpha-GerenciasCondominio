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
            a.piso,
            a.apartamento,
            e.nombre_edificio,
            e.abreviatura AS edificio_abreviatura
        FROM reclamos r
        INNER JOIN inmueble i ON r.inmueble_id = i.inmueble_id
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        LEFT JOIN apartamentos a ON (i.tipo_entidad = 'apartamento' AND i.entidad_id = a.apartamento_id)
        LEFT JOIN edificios e ON a.edificio_id = e.edificio_id
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
