<?php
// Deshabilitar errores de PHP para evitar HTML en la respuesta JSON
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $tipo_vivienda = $data['tipo_vivienda'] ?? '';
    $nombre_propietario = $data['nombre_propietario'] ?? '';
    $apellido_propietario = $data['apellido_propietario'] ?? '';
    $cedula = intval($data['cedula'] ?? 0);
    $telefono = $data['telefono'] ?? '';
    $gmail = $data['gmail'] ?? '';
    $fecha_adquirido = $data['fecha_adquirido'] ?? '';

    // Detectar si es una nueva vivienda (sin campos del propietario) o registro inicial
    $is_new_housing = empty($nombre_propietario) && empty($apellido_propietario) && $cedula <= 0 && empty($telefono) && empty($gmail);

    if (empty($tipo_vivienda) || empty($fecha_adquirido)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de vivienda y fecha de adquisición son obligatorios']);
        exit;
    }

    // Si no es nueva vivienda, validar campos del propietario
    if (!$is_new_housing) {
        if (empty($nombre_propietario) || empty($apellido_propietario) || $cedula <= 0 || empty($telefono) || empty($gmail)) {
            echo json_encode(['success' => false, 'message' => 'Todos los campos del propietario son obligatorios']);
            exit;
        }

        // Validar formato de email
        if (!filter_var($gmail, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'El formato del correo electrónico no es válido']);
            exit;
        }
    }

    try {
        // Verificar si la cédula ya existe en otro propietario (solo si no es nueva vivienda)
        if (!$is_new_housing) {
            $stmt = $pdo->prepare("SELECT propietario_id FROM propietarios WHERE nro_documento = ? AND user_id != ?");
            $stmt->execute([$cedula, $_SESSION['user_id']]);
            $cedula_exists = $stmt->fetch();

            if ($cedula_exists) {
                echo json_encode(['success' => false, 'message' => 'La cédula ya está registrada por otro usuario']);
                exit;
            }
        }

        // Verificar si el email ya existe en otro propietario (solo si no es nueva vivienda)
        if (!$is_new_housing) {
            $stmt = $pdo->prepare("SELECT propietario_id FROM propietarios WHERE gmail = ? AND user_id != ?");
            $stmt->execute([$gmail, $_SESSION['user_id']]);
            $email_exists = $stmt->fetch();

            if ($email_exists) {
                echo json_encode(['success' => false, 'message' => 'El correo electrónico ya está registrado por otro usuario']);
                exit;
            }
        }

        // Obtener el tipo_vivienda_id
        $stmt = $pdo->prepare("SELECT tipo_id FROM tipo_vivienda WHERE nombre_tipo = ?");
        if ($tipo_vivienda == "Establecimiento") {
            $stmt->execute([$data['tipo_vivienda_nombre']]);
        } else {
            $stmt->execute([$tipo_vivienda]);
        }
        $tipo_vivienda_result = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$tipo_vivienda_result) {
            echo json_encode(['success' => false, 'message' => 'Tipo de vivienda no válido']);
            exit;
        }

        $tipo_vivienda_id = $tipo_vivienda_result['tipo_id'];

        // Determinar la entidad específica según el tipo
        $entidad_id = null;
        $tipo_entidad = '';

        if ($tipo_vivienda === 'Apartamento') {
            $edificio_id = $data['edificio_id'] ?? '';
            $apartamento_id = $data['apartamento_id'] ?? '';
            $piso = $data['piso'] ?? '';
            $apartamento = $data['apartamento'] ?? '';

            // Log de depuración
            error_log("🏠 Datos recibidos para apartamento: edificio_id=$edificio_id, apartamento_id=$apartamento_id, piso=$piso, apartamento=$apartamento");

            if (!empty($edificio_id) && !empty($apartamento_id) && !empty($piso) && !empty($apartamento)) {
                // Verificar que el apartamento existe y coincide con el edificio, piso y número
                $stmt = $pdo->prepare("
                    SELECT apartamento_id 
                    FROM apartamentos 
                    WHERE apartamento_id = ? AND edificio_id = ? AND piso = ? AND apartamento = ?
                ");
                $stmt->execute([$apartamento_id, $edificio_id, $piso, $apartamento]);
                $apartamento = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($apartamento) {
                    $entidad_id = $apartamento['apartamento_id'];
                    $tipo_entidad = 'apartamento';
                } else {
                    echo json_encode(['success' => false, 'message' => 'El apartamento seleccionado no existe o no coincide con los datos']);
                    exit;
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Faltan datos del apartamento (edificio_id, apartamento_id, piso, apartamento)']);
                exit;
            }
        }

        if (!$entidad_id) {
            echo json_encode(['success' => false, 'message' => 'No se encontró la vivienda especificada en el sistema']);
            exit;
        }

        // Debug: Log de los valores que se van a insertar
        error_log("DEBUG - Valores a insertar:");
        error_log("propietario_id: " . $propietario_id);
        error_log("tipo_vivienda_id: " . $tipo_vivienda_id);
        error_log("tipo_entidad: " . $tipo_entidad);
        error_log("entidad_id: " . $entidad_id);
        error_log("fecha_adquirido: " . $fecha_adquirido);

        // Iniciar transacción
        $pdo->beginTransaction();

        try {
            // Obtener o crear el propietario_id del usuario actual
            $stmt = $pdo->prepare("SELECT propietario_id FROM propietarios WHERE user_id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $propietario_result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$propietario_result) {
                if ($is_new_housing) {
                    echo json_encode(['success' => false, 'message' => 'No se encontró información del propietario. Debe registrar sus datos primero.']);
                    exit;
                }

                // Si no existe propietario, crear uno básico
                $stmt = $pdo->prepare("
                    INSERT INTO propietarios (user_id, nombre, apellido, nro_documento, telefono, gmail) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $_SESSION['user_id'],
                    $nombre_propietario,
                    $apellido_propietario,
                    $cedula,
                    $telefono,
                    $gmail
                ]);
                $propietario_id = $pdo->lastInsertId();
            } else {
                $propietario_id = $propietario_result['propietario_id'];

                if (!$is_new_housing) {
                    // Actualizar los datos del propietario existente solo si no es nueva vivienda
                    $stmt = $pdo->prepare("
                        UPDATE propietarios 
                        SET nombre = ?, apellido = ?, nro_documento = ?, telefono = ?, gmail = ? 
                        WHERE propietario_id = ?
                    ");
                    $stmt->execute([
                        $nombre_propietario,
                        $apellido_propietario,
                        $cedula,
                        $telefono,
                        $gmail,
                        $propietario_id
                    ]);
                }
            }

            // Crear el inmueble
            $stmt = $pdo->prepare("
                INSERT INTO inmueble (propietario_id, tipo_vivienda_id, tipo_entidad, entidad_id, fecha_adquirido) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $propietario_id,
                $tipo_vivienda_id,
                $tipo_entidad,
                $entidad_id,
                $fecha_adquirido
            ]);

            // Confirmar transacción
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Vivienda registrada exitosamente']);

        } catch (Exception $e) {
            // Revertir transacción en caso de error
            $pdo->rollback();
            throw $e;
        }

    } catch (PDOException $e) {
        error_log("Error en save_housing.php: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
    } catch (Exception $e) {
        error_log("Error general en save_housing.php: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>