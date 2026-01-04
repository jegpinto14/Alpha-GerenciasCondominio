<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');
session_start();
require_once '../../includes/database.php';

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'get_propietarios':
            $stmt = $pdo->query("
                SELECT DISTINCT p.propietario_id, p.nombre, p.apellido, p.nro_documento
                FROM propietarios p
                INNER JOIN inmueble i ON p.propietario_id = i.propietario_id
                ORDER BY p.nombre, p.apellido
            ");
            $propietarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'propietarios' => $propietarios]);
            break;

        case 'get_inmuebles':
            $propietario_id = $_GET['propietario_id'] ?? 0;
            $stmt = $pdo->prepare("
                SELECT inmueble_id, 
                       CASE 
                           WHEN tipo_entidad = 'casa' THEN (SELECT nombre_casa FROM casas WHERE casa_id = entidad_id)
                           WHEN tipo_entidad = 'apartamento' THEN CONCAT((SELECT abreviatura FROM edificios e JOIN apartamentos a ON e.edificio_id = a.edificio_id WHERE a.apartamento_id = entidad_id), '-', (SELECT CONCAT(piso, apartamento) FROM apartamentos WHERE apartamento_id = entidad_id))
                           WHEN tipo_entidad = 'establecimiento' THEN (SELECT nombre_establecimiento FROM establecimientos WHERE establecimiento_id = entidad_id)
                           ELSE 'Local CC'
                       END as nombre_inmueble
                FROM inmueble
                WHERE propietario_id = ?
                ORDER BY nombre_inmueble
            ");
            $stmt->execute([$propietario_id]);
            $inmuebles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'inmuebles' => $inmuebles]);
            break;

        case 'get_periodos':
            $inmueble_id = $_GET['inmueble_id'] ?? null;
            
            if ($inmueble_id) {
                // Obtener solo períodos NO pagados para este inmueble
                $stmt = $pdo->prepare("
                    SELECT 
                        p.periodo_id, 
                        p.fecha_periodo,
                        DATE_FORMAT(p.fecha_periodo, '%M %Y') as periodo_nombre,
                        MONTH(p.fecha_periodo) as mes,
                        YEAR(p.fecha_periodo) as anio
                    FROM periodos p
                    WHERE p.periodo_id NOT IN (
                        SELECT DISTINCT pg.periodo_id 
                        FROM pagos pg 
                        WHERE pg.inmueble_id = ?
                    )
                    ORDER BY p.fecha_periodo DESC
                    LIMIT 24
                ");
                $stmt->execute([$inmueble_id]);
            } else {
                // Obtener todos los períodos (comportamiento original)
                $stmt = $pdo->query("
                    SELECT 
                        periodo_id, 
                        fecha_periodo,
                        DATE_FORMAT(fecha_periodo, '%M %Y') as periodo_nombre,
                        MONTH(fecha_periodo) as mes,
                        YEAR(fecha_periodo) as anio
                    FROM periodos
                    ORDER BY fecha_periodo DESC
                    LIMIT 24
                ");
            }
            
            $periodos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Traducir nombres de meses al español
            $meses_es = [
                'January' => 'Enero', 'February' => 'Febrero', 'March' => 'Marzo',
                'April' => 'Abril', 'May' => 'Mayo', 'June' => 'Junio',
                'July' => 'Julio', 'August' => 'Agosto', 'September' => 'Septiembre',
                'October' => 'Octubre', 'November' => 'Noviembre', 'December' => 'Diciembre'
            ];
            
            foreach ($periodos as &$periodo) {
                foreach ($meses_es as $en => $es) {
                    $periodo['periodo_nombre'] = str_replace($en, $es, $periodo['periodo_nombre']);
                }
            }
            
            echo json_encode(['success' => true, 'periodos' => $periodos]);
            break;

        case 'get_metodos_pago':
            $stmt = $pdo->query("
                SELECT metodo_id, descripcion
                FROM metodos_pago
                ORDER BY descripcion
            ");
            $metodos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'metodos' => $metodos]);
            break;

        case 'get_tasas':
            $stmt = $pdo->query("
                SELECT tasa_id, tasa, fecha
                FROM tasas
                ORDER BY fecha DESC
            ");
            $tasas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'tasas' => $tasas]);
            break;

        case 'get_bancos':
            $stmt = $pdo->query("
                SELECT banco_id, nombre_banco
                FROM bancos
                ORDER BY nombre_banco
            ");
            $bancos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'bancos' => $bancos]);
            break;

        case 'get_deuda':
            $inmueble_id = $_GET['inmueble_id'] ?? null;
            if (!$inmueble_id) {
                echo json_encode(['success' => false, 'message' => 'ID de inmueble requerido']);
                break;
            }
            
            $stmt = $pdo->prepare("
                SELECT id_deuda, inmueble_id, monto_deuda_usd
                FROM deuda_propetario
                WHERE inmueble_id = ?
            ");
            $stmt->execute([$inmueble_id]);
            $deuda = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($deuda) {
                echo json_encode(['success' => true, 'deuda' => $deuda]);
            } else {
                echo json_encode(['success' => true, 'deuda' => ['monto_deuda_usd' => 0]]);
            }
            break;

        case 'guardar_deuda':
            $inmueble_id = $_POST['inmueble_id'] ?? null;
            $monto_deuda = $_POST['monto_deuda_usd'] ?? 0;
            
            if (!$inmueble_id) {
                echo json_encode(['success' => false, 'message' => 'ID de inmueble requerido']);
                break;
            }
            
            try {
                // Verificar si ya existe una deuda para este inmueble
                $stmt = $pdo->prepare("SELECT id_deuda FROM deuda_propetario WHERE inmueble_id = ?");
                $stmt->execute([$inmueble_id]);
                $existe = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existe) {
                    // Actualizar deuda existente
                    $stmt = $pdo->prepare("
                        UPDATE deuda_propetario 
                        SET monto_deuda_usd = ? 
                        WHERE inmueble_id = ?
                    ");
                    $stmt->execute([$monto_deuda, $inmueble_id]);
                    $mensaje = 'Deuda actualizada correctamente';
                } else {
                    // Insertar nueva deuda
                    $stmt = $pdo->prepare("
                        INSERT INTO deuda_propetario (inmueble_id, monto_deuda_usd) 
                        VALUES (?, ?)
                    ");
                    $stmt->execute([$inmueble_id, $monto_deuda]);
                    $mensaje = 'Deuda registrada correctamente';
                }
                
                echo json_encode(['success' => true, 'message' => $mensaje]);
            } catch (PDOException $e) {
                error_log("Error guardando deuda: " . $e->getMessage());
                echo json_encode(['success' => false, 'message' => 'Error al guardar deuda: ' . $e->getMessage()]);
            }
            break;

        case 'registrar_pago':
            // Obtener datos del formulario
            $propietario_id = $_POST['propietario_id'] ?? 0;
            $inmueble_id = $_POST['inmueble_id'] ?? 0;
            $periodos = $_POST['periodos'] ?? [];
            $metodo_id = $_POST['metodo_id'] ?? 0;
            
            // Validar y limpiar datos
            $monto_usd = !empty($_POST['monto_usd']) ? $_POST['monto_usd'] : 0;
            $tasa_id = $_POST['tasa_id'] ?? 0;
            $monto_bs = !empty($_POST['monto_bs']) ? $_POST['monto_bs'] : 0;
            $monto_pagado = !empty($_POST['monto_pagado']) ? $_POST['monto_pagado'] : 0;
            
            // Convertir cadenas vacías a NULL
            $banco_emisor_id = !empty($_POST['banco_emisor_id']) ? $_POST['banco_emisor_id'] : null;
            $banco_receptor_id = !empty($_POST['banco_receptor_id']) ? $_POST['banco_receptor_id'] : null;
            $comprobante_path = $_POST['comprobante_path'] ?? null;
            $estado_input = $_POST['estado'] ?? 'Confirmado';
            
            // Mapeo de estados según la tabla
            $estado_pagos = 'Pendiente';
            $estado_detalles = 'Pendiente';

            switch ($estado_input) {
                case 'Confirmado':
                case 'Pagado':
                    $estado_pagos = 'Pagado';
                    $estado_detalles = 'Confirmado';
                    break;
                case 'Rechazado':
                    $estado_pagos = 'Rechazado';
                    $estado_detalles = 'Rechazado';
                    break;
                case 'Pendiente':
                default:
                    $estado_pagos = 'Pendiente';
                    $estado_detalles = 'Pendiente';
                    break;
            }

            $pagos_registrados = 0;
            $errores = [];

            // Registrar pago para cada período seleccionado
            foreach ($periodos as $periodo_id) {
                try {
                    $pdo->beginTransaction();

                    // 1. Insertar en tabla pagos
                    $stmt = $pdo->prepare("
                        INSERT INTO pagos (propietario_id, inmueble_id, periodo_id, estado)
                        VALUES (?, ?, ?, ?)
                    ");
                    $stmt->execute([$propietario_id, $inmueble_id, $periodo_id, $estado_pagos]);
                    $pago_id = $pdo->lastInsertId();
                    
                    // 2. Insertar en tabla pago_detalles
                    $stmt = $pdo->prepare("
                        INSERT INTO pago_detalles (
                            pago_id, metodo_id, banco_receptor_id, banco_emisor_id,
                            monto_usd, monto_Bs, tasa_id, monto_pagado, 
                            comprobante_path, estado, fecha
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ");
                    
                    $stmt->execute([
                        $pago_id, $metodo_id, $banco_receptor_id, $banco_emisor_id,
                        $monto_usd, $monto_bs, $tasa_id, $monto_pagado,
                        $comprobante_path, $estado_detalles
                    ]);
                    
                    $pdo->commit();
                    $pagos_registrados++;
                } catch (PDOException $e) {
                    $pdo->rollBack();
                    $errores[] = "Período $periodo_id: " . $e->getMessage();
                    error_log("Error SQL al registrar pago: " . $e->getMessage());
                }
            }

            if ($pagos_registrados > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Pagos registrados exitosamente',
                    'pagos_registrados' => $pagos_registrados,
                    'errores' => $errores
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'No se pudo registrar ningún pago',
                    'errores' => $errores
                ]);
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
            break;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
