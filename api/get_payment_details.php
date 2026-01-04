<?php
session_start();
require_once '../includes/database.php';

header('Content-Type: application/json');

try {
    // Verificar si hay sesión activa
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'No hay sesión activa']);
        exit;
    }

    // Obtener información del usuario con rol
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.username, r.nombre as rol_nombre 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.rol_id 
        WHERE u.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }

    // Verificar si es administrador por rol
    if ($user['rol_nombre'] !== 'admin' && $user['rol_nombre'] !== 'superadmin') {
        echo json_encode(['success' => false, 'message' => 'Acceso denegado - Solo administradores']);
        exit;
    }

    $paymentId = $_GET['id'] ?? null;

    // Logging: registrar el ID recibido
    error_log("🔍 get_payment_details.php - ID recibido: " . $paymentId);

    if (!$paymentId) {
        error_log("❌ get_payment_details.php - No se recibió ID");
        echo json_encode(['success' => false, 'message' => 'ID de pago requerido']);
        exit;
    }

    // Obtener detalles completos del pago desde las nuevas tablas
    // Buscar por pago_detalle_id en lugar de pago_id
    $sql = "
        SELECT 
            pag.pago_id as id,
            pd.pago_detalle_id,
            pag.propietario_id,
            pag.inmueble_id,
            pag.periodo_id,
            per.fecha_periodo,
            MONTH(per.fecha_periodo) as mes,
            YEAR(per.fecha_periodo) as anio,
            pd.estado,
            prop.nombre as nombre_propietario,
            prop.apellido as apellido_propietario,
            prop.nro_documento as cedula_propietario,
            prop.telefono as telefono_propietario,
            prop.gmail as email_propietario,
            u.username,
            pd.monto_usd,
            pd.monto_Bs,
            pd.tasa_id,
            pd.monto_pagado,
            mp.descripcion as metodo_pago,
            be.telefono as telefono_emisor,
            be.tipo_documento,
            be.nro_documento as cedula_emisor,
            be.nro_referencia,
            pd.comprobante_path as comprobante,
            be.fecha_pago as fecha_pago_banco,
            pd.Fecha as fecha_registro_pago,
            b.nombre_banco as banco_emisor,
            b.nombre_banco as banco_emisor,
            b.codigo_banco,
            tv.nombre_tipo as tipo_vivienda,
            ta.fecha as fecha_tasa,
            ta.tasa as tasa_valor
        FROM pago_detalles pd
        INNER JOIN pagos pag ON pd.pago_id = pag.pago_id
        INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
        INNER JOIN usuarios u ON prop.user_id = u.user_id
        INNER JOIN periodos per ON pag.periodo_id = per.periodo_id
        INNER JOIN inmueble i ON pag.inmueble_id = i.inmueble_id
        INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
        LEFT JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
        LEFT JOIN bancos b ON be.banco_id = b.banco_id
        LEFT JOIN tasas ta ON pd.tasa_id = ta.tasa_id
        WHERE pd.pago_detalle_id = ?
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$paymentId]);
    $pago = $stmt->fetch(PDO::FETCH_ASSOC);

    // Logging: registrar los datos obtenidos de la BD
    error_log("📊 get_payment_details.php - Pago encontrado: pago_id=" . ($pago['id'] ?? 'NULL') . ", pago_detalle_id=" . ($pago['pago_detalle_id'] ?? 'NULL'));

    if (!$pago) {
        error_log("❌ get_payment_details.php - Pago no encontrado con ID: " . $paymentId);
        echo json_encode(['success' => false, 'message' => 'Pago no encontrado']);
        exit;
    }

    // Nombres de meses
    $monthNames = [
        1 => 'Enero',
        2 => 'Febrero',
        3 => 'Marzo',
        4 => 'Abril',
        5 => 'Mayo',
        6 => 'Junio',
        7 => 'Julio',
        8 => 'Agosto',
        9 => 'Septiembre',
        10 => 'Octubre',
        11 => 'Noviembre',
        12 => 'Diciembre'
    ];

    // Determinar si es un pago de deuda acumulada
    // Un pago es deuda acumulada solo si no tiene mes/año específico
    $isDeudaAcumulada = false;
    $meses = [];

    // Si tiene mes y año válidos, es un pago mensual normal
    if (!empty($pago['mes']) && !empty($pago['anio'])) {
        $meses = [
            [
                'id' => (int) $pago['mes'],
                'name' => $monthNames[$pago['mes']]
            ]
        ];
    } else {
        // Si no tiene periodo específico, es deuda acumulada
        $isDeudaAcumulada = true;
        $meses = [
            [
                'id' => 'deuda_acumulada',
                'name' => 'Deuda Acumulada'
            ]
        ];
    }

    // Formatear respuesta para el frontend
    $payment = [
        'id' => $pago['id'],
        'pago_detalle_id' => $pago['pago_detalle_id'],
        'vivienda_id' => $pago['inmueble_id'],
        'nombre_vivienda' => $pago['tipo_vivienda'],
        'nombre_propietario' => trim($pago['nombre_propietario'] . ' ' . $pago['apellido_propietario']),
        'apellido_propietario' => $pago['apellido_propietario'],
        'propietario_nombre_completo' => trim($pago['nombre_propietario'] . ' ' . $pago['apellido_propietario']),
        'propietario_cedula' => $pago['cedula_propietario'],
        'propietario_telefono' => $pago['telefono_propietario'],
        'propietario_email' => $pago['email_propietario'],
        'meses' => $meses,
        'is_deuda_acumulada' => $isDeudaAcumulada,
        'periodo_id' => $pago['periodo_id'],
        'periodo_fecha' => $pago['fecha_periodo'],
        'periodo_mes' => $pago['mes'],
        'periodo_anio' => $pago['anio'],
        'monto_bs' => $pago['monto_Bs'] ?? 0,
        'monto_dolares' => $pago['monto_usd'] ?? 0,
        'moneda_pago' => ($pago['monto_Bs'] > 0) ? 'bs' : 'usd',
        'metodo_pago' => $pago['metodo_pago'],
        'banco' => $pago['banco_emisor'],
        'codigo_banco' => $pago['codigo_banco'],
        'telefono' => $pago['telefono_emisor'],
        'cedula' => ($pago['tipo_documento'] ?? 'V') . '-' . ($pago['cedula_emisor'] ?? ''),
        'numero_referencia' => $pago['nro_referencia'],
        'comprobante' => $pago['comprobante'],
        'foto_comprobante' => $pago['comprobante'], // Para compatibilidad
        'fecha_pago' => (!empty($pago['fecha_pago_banco']) && $pago['fecha_pago_banco'] !== '0000-00-00 00:00:00')
            ? $pago['fecha_pago_banco']
            : ((!empty($pago['fecha_registro_pago']) && $pago['fecha_registro_pago'] !== '0000-00-00 00:00:00')
                ? $pago['fecha_registro_pago']
                : date('Y-m-d H:i:s')),
        'fecha_pago_tasa' => (!empty($pago['fecha_tasa']) && $pago['fecha_tasa'] !== '0000-00-00 00:00:00') ? $pago['fecha_tasa'] : null,
        'fecha_registro_pago' => (!empty($pago['fecha_registro_pago']) && $pago['fecha_registro_pago'] !== '0000-00-00 00:00:00') ? $pago['fecha_registro_pago'] : null,
        'estado' => ($pago['estado'] === 'Pendiente') ? 'pending' :
            (($pago['estado'] === 'Confirmado') ? 'approved' :
                (($pago['estado'] === 'Rechazado') ? 'rejected' : $pago['estado'])),
        'username' => $pago['username'],
        'tasa_id' => $pago['tasa_id'],
        'tasa_valor' => $pago['tasa_valor'],
        'monto_pagado' => $pago['monto_pagado'],
        'vivienda_tipo' => $pago['tipo_vivienda'],
        // Datos del banco emisor (quien paga)
        'banco_emisor' => [
            'banco' => $pago['banco_emisor'],
            'codigo_banco' => $pago['codigo_banco'],
            'telefono' => $pago['telefono_emisor'],
            'tipo_documento' => $pago['tipo_documento'],
            'nro_documento' => $pago['cedula_emisor'],
            'nro_referencia' => $pago['nro_referencia'],
            'comprobante_path' => $pago['comprobante'],
            'fecha_pago' => (!empty($pago['fecha_pago_banco']) && $pago['fecha_pago_banco'] !== '0000-00-00 00:00:00')
                ? $pago['fecha_pago_banco']
                : ((!empty($pago['fecha_registro_pago']) && $pago['fecha_registro_pago'] !== '0000-00-00 00:00:00')
                    ? $pago['fecha_registro_pago']
                    : date('Y-m-d H:i:s'))
        ]
    ];

    // Logging: registrar lo que se va a enviar al frontend
    error_log("📤 get_payment_details.php - Enviando al frontend: pago_id=" . $payment['id'] . ", pago_detalle_id=" . ($payment['pago_detalle_id'] ?? 'NULL'));

    echo json_encode([
        'success' => true,
        'payment' => $payment
    ]);

} catch (PDOException $e) {
    error_log("Error PDO en get_payment_details.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Error general en get_payment_details.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>