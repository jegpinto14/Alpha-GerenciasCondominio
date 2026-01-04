<?php
/**
 * API para obtener cuentas bancarias del condominio (banco_emisor_gastos)
 * Operaciones: listar todas las cuentas emisoras activas
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

try {
    $conn = $pdo;

    // Listar todas las cuentas bancarias emisoras del condominio
    $query = "SELECT 
                beg.banco_emisor_gasto_id,
                beg.banco_id,
                b.nombre_banco,
                b.codigo_banco,
                beg.tipo_cuenta,
                beg.numero_cuenta,
                beg.titular_cuenta,
                beg.activa
              FROM banco_emisor_gastos beg
              INNER JOIN bancos b ON beg.banco_id = b.banco_id
              WHERE beg.activa = TRUE
              ORDER BY b.nombre_banco ASC, beg.numero_cuenta ASC";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $cuentas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Cuentas bancarias emisoras obtenidas exitosamente',
        'data' => $cuentas,
        'count' => count($cuentas)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'data' => []
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage(),
        'data' => []
    ]);
}
?>
