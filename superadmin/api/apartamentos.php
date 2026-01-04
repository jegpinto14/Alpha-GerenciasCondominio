<?php
/**
 * API para gestión de apartamentos
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = $pdo;

    switch ($method) {
        case 'GET':
            // Listar todos los apartamentos con información del propietario
            $query = "SELECT 
                        a.apartamento_id,
                        a.edificio_id,
                        a.piso,
                        a.apartamento,
                        a.alicuota,
                        i.inmueble_id,
                        p.propietario_id,
                        p.nombre,
                        p.apellido,
                        p.nro_documento
                      FROM apartamentos a
                      LEFT JOIN inmueble i ON i.entidad_id = a.apartamento_id AND i.tipo_entidad = 'apartamento'
                      LEFT JOIN propietarios p ON p.propietario_id = i.propietario_id
                      ORDER BY a.piso, a.apartamento";

            $stmt = $conn->prepare($query);
            $stmt->execute();
            $apartamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $apartamentos
            ]);
            break;

        default:
            throw new Exception('Método no permitido');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>