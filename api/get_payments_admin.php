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

    // Obtener todos los pagos que tienen detalles registrados (solo registros en pago_detalles)
    $sql = "
        SELECT 
            pag.pago_id as id,
            pd.pago_detalle_id,
            pag.propietario_id,
            pag.inmueble_id,
            pag.periodo_id,
            MONTH(per.fecha_periodo) as mes,
            YEAR(per.fecha_periodo) as anio,
            pd.estado,
            prop.nombre as nombre_propietario,
            prop.apellido as apellido_propietario,
            prop.nro_documento as cedula_propietario,
            prop.telefono as telefono_propietario,
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
            b.nombre_banco as banco_emisor
        FROM pago_detalles pd
        INNER JOIN pagos pag ON pd.pago_id = pag.pago_id
        INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
        INNER JOIN usuarios u ON prop.user_id = u.user_id
        INNER JOIN periodos per ON pag.periodo_id = per.periodo_id
        LEFT JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
        LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
        LEFT JOIN bancos b ON be.banco_id = b.banco_id
        ORDER BY pd.pago_detalle_id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatear datos para el frontend
    $payments = [];
    $monthNames = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];

    foreach ($pagos as $pago) {
        // Determinar si es un pago de deuda acumulada
        // Un pago es deuda acumulada solo si no tiene mes/año específico
        $isDeudaAcumulada = false;
        
        // Si tiene mes y año válidos, es un pago mensual normal
        if (!empty($pago['mes']) && !empty($pago['anio'])) {
            $meses = [[
                'id' => (int)$pago['mes'],
                'name' => $monthNames[$pago['mes']]
            ]];
        } else {
            // Si no tiene periodo específico, es deuda acumulada
            $isDeudaAcumulada = true;
            $meses = [[
                'id' => 'deuda_acumulada',
                'name' => 'Deuda Acumulada'
            ]];
        }

        $payments[] = [
            'id' => $pago['id'],
            'pago_detalle_id' => $pago['pago_detalle_id'],
            'vivienda_id' => $pago['inmueble_id'],
            'nombre_vivienda' => 'Inmueble #' . $pago['inmueble_id'],
            'nombre_propietario' => $pago['nombre_propietario'],
            'apellido_propietario' => $pago['apellido_propietario'],
            'nro_documento' => $pago['cedula_propietario'],
            'meses' => $meses,
            'is_deuda_acumulada' => $isDeudaAcumulada,
            'monto_bs' => $pago['monto_Bs'] ?? 0,
            'monto_dolares' => $pago['monto_usd'] ?? 0,
            'moneda_pago' => ($pago['monto_Bs'] > 0) ? 'bs' : 'usd',
            'metodo_pago' => $pago['metodo_pago'],
            'banco' => $pago['banco_emisor'],
            'telefono' => $pago['telefono_emisor'],
            'cedula' => ($pago['tipo_documento'] ?? 'V') . '-' . ($pago['cedula_emisor'] ?? ''),
            'numero_referencia' => $pago['nro_referencia'],
            'comprobante' => $pago['comprobante'],
            'fecha_pago' => (!empty($pago['fecha_pago_banco']) && $pago['fecha_pago_banco'] !== '0000-00-00 00:00:00') 
                           ? $pago['fecha_pago_banco'] 
                           : ((!empty($pago['fecha_registro_pago']) && $pago['fecha_registro_pago'] !== '0000-00-00 00:00:00') 
                              ? $pago['fecha_registro_pago'] 
                              : date('Y-m-d H:i:s')),
            'estado' => ($pago['estado'] === 'Pendiente') ? 'pending' : 
                       (($pago['estado'] === 'Confirmado') ? 'approved' : 
                       (($pago['estado'] === 'Rechazado') ? 'rejected' : 'pending')),
            'usuario_id' => $pago['propietario_id'],
            'username' => $pago['username']
        ];
    }

    echo json_encode([
        'success' => true,
        'payments' => $payments,
        'total' => count($payments)
    ]);

} catch (Exception $e) {
    error_log("Error en get_payments_admin.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>
