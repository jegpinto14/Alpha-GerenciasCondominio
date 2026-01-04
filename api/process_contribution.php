<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $amount = $data['amount'] ?? 0;
    $method = $data['method'] ?? 'bs';
    $description = $data['description'] ?? '';
    
    if ($amount <= 0) {
        echo json_encode(['success' => false, 'message' => 'El monto debe ser mayor a 0']);
        exit;
    }
    
    try {
        // Obtener ID de vivienda del usuario
        $stmt = $pdo->prepare("SELECT id FROM viviendas WHERE usuario_id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $housing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$housing) {
            echo json_encode(['success' => false, 'message' => 'No se encontró vivienda registrada']);
            exit;
        }
        
        $vivienda_id = $housing['id'];
        
        // Obtener tasa de dólar actual (simulada)
        $tasa_dolar = 2500; // En un sistema real, esto vendría de una API
        
        // Insertar contribución
        $stmt = $pdo->prepare("
            INSERT INTO contribuciones (vivienda_id, monto, moneda, tasa_dolar_aplicada, descripcion)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $vivienda_id, 
            $amount, 
            $method, 
            $tasa_dolar, 
            $description
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Contribución procesada exitosamente']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error procesando contribución']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}
?>
