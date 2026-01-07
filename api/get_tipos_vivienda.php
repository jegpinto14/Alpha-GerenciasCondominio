<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../includes/database.php';

try {
    // Consultar solo el tipo de vivienda 'Apartamento'
    $query = "SELECT tipo_id, nombre_tipo, monto_mensual_usd FROM tipo_vivienda WHERE nombre_tipo = 'Apartamento' LIMIT 1";
    $stmt = $pdo->prepare($query);
    $stmt->execute();

    $tipos = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $tipos[] = [
            'id' => $row['tipo_id'],
            'nombre' => $row['nombre_tipo'],
            'monto_mensual' => floatval($row['monto_mensual_usd'])
        ];
    }

    echo json_encode([
        'success' => true,
        'tipos' => $tipos
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener tipos de vivienda: ' . $e->getMessage()
    ]);
}
?>