<?php
/**
 * API para obtener cuentas bancarias de proveedores (banco_receptor_gastos)
 * Operaciones: listar cuentas por proveedor
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

try {
    $conn = $pdo;
    
    // Obtener proveedor_id del query string
    $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
    
    if (!$proveedorId) {
        throw new Exception('Se requiere el ID del proveedor');
    }

    // Listar cuentas bancarias del proveedor
    $query = "SELECT 
                brg.banco_receptor_gasto_id,
                brg.banco_id,
                b.nombre_banco,
                b.codigo_banco,
                brg.tipo_cuenta,
                brg.numero_cuenta,
                brg.titular_cuenta,
                brg.activa
              FROM banco_receptor_gastos brg
              INNER JOIN bancos b ON brg.banco_id = b.banco_id
              WHERE brg.proveedor_id = :proveedor_id AND brg.activa = TRUE
              ORDER BY b.nombre_banco ASC";

    $stmt = $conn->prepare($query);
    $stmt->bindParam(':proveedor_id', $proveedorId, PDO::PARAM_INT);
    $stmt->execute();
    $cuentas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Cuentas bancarias del proveedor obtenidas exitosamente',
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
