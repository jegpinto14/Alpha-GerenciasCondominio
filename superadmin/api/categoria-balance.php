<?php
/**
 * API para obtener categorías de balance
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

try {
    $conn = $pdo;

    $query = "SELECT 
                categoria_balance_id,
                nombre_categoria,
                descripcion,
                naturaleza_saldo
              FROM categoria_balance
              ORDER BY categoria_balance_id ASC";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $categorias,
        'count' => count($categorias)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>