<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../includes/database.php';

try {
    // Obtener datos del POST
    $inmueble_id = $_POST['inmueble_id'] ?? null;
    $titulo = $_POST['titulo'] ?? '';
    $categoria = $_POST['categoria'] ?? '';
    $descripcion = $_POST['descripcion'] ?? '';
    $prioridad = $_POST['prioridad'] ?? '';
    
    // Validar datos requeridos
    if (empty($inmueble_id) || empty($titulo) || empty($categoria) || empty($descripcion) || empty($prioridad)) {
        echo json_encode([
            'success' => false,
            'message' => 'Faltan datos requeridos'
        ]);
        exit;
    }
    
    // Construir la descripción completa combinando todos los campos
    $descripcion_completa = "TÍTULO: " . $titulo . "\n\n";
    $descripcion_completa .= "CATEGORÍA: " . ucfirst($categoria) . "\n\n";
    $descripcion_completa .= "PRIORIDAD: " . ucfirst($prioridad) . "\n\n";
    $descripcion_completa .= "DESCRIPCIÓN:\n" . $descripcion;
    
    // Insertar en la tabla reclamos
    $stmt = $pdo->prepare("
        INSERT INTO reclamos 
        (inmueble_id, descripcion, estado, fecha) 
        VALUES (?, ?, 'Pendiente', NOW())
    ");
    
    $stmt->execute([
        $inmueble_id,
        $descripcion_completa
    ]);
    
    $reclamo_id = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => 'Reclamo o sugerencia enviado exitosamente',
        'reclamo_id' => $reclamo_id
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar el reclamo: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
