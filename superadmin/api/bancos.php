<?php
/**
 * API para gestión de bancos
 * Operaciones: listar bancos disponibles
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

try {
    $conn = $pdo;

    // Listar todos los bancos disponibles
    $query = "SELECT
                banco_id,
                nombre_banco,
                codigo_banco
              FROM bancos
              ORDER BY nombre_banco ASC";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $bancos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Bancos obtenidos exitosamente',
        'data' => $bancos,
        'count' => count($bancos)
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
