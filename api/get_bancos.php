<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    // Obtener todos los bancos ordenados por nombre
    $stmt = $pdo->prepare("
        SELECT 
            banco_id,
            codigo_banco,
            nombre_banco
        FROM bancos
        ORDER BY nombre_banco ASC
    ");
    
    $stmt->execute();
    $bancos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'bancos' => $bancos
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_bancos.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo bancos: ' . $e->getMessage()
    ]);
}
?>

