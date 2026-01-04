<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener tipos de vivienda
    $stmt = $pdo->query("SELECT tipo_id, nombre_tipo FROM tipo_vivienda ORDER BY tipo_id");
    $tipos_vivienda = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener casas disponibles
    $stmt = $pdo->query("
        SELECT c.casa_id, c.nombre_casa, a.nombre_avenida
        FROM casas c
        JOIN avenidas a ON c.avenida_id = a.id_avenida
        ORDER BY c.nombre_casa
    ");
    $casas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener edificios
    $stmt = $pdo->query("SELECT edificio_id, nombre_edificio FROM edificios ORDER BY nombre_edificio");
    $edificios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener apartamentos por edificio
    $stmt = $pdo->query("
        SELECT a.apartamento_id, a.apartamento, a.piso, e.nombre_edificio
        FROM apartamentos a
        JOIN edificios e ON a.edificio_id = e.edificio_id
        ORDER BY e.nombre_edificio, a.piso, a.apartamento
    ");
    $apartamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'tipos_vivienda' => $tipos_vivienda,
        'casas' => $casas,
        'edificios' => $edificios,
        'apartamentos' => $apartamentos
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_housing_options.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>

