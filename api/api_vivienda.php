<?php
// API unificada para obtener viviendas disponibles por tipo y filtro
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

// Comentamos temporalmente la autenticación para pruebas
// if (!isset($_SESSION['user_id'])) {
//     echo json_encode(['success' => false, 'message' => 'No autorizado']);
//     exit;
// }

// Obtener parámetros
$tipo_vivienda = $_GET['tipo'] ?? ''; // 'casa', 'apartamento', 'establecimiento'
$filtro_id = $_GET['filtro_id'] ?? ''; // avenida_id para casas/establecimientos, edificio_id para apartamentos

// Log para depuración
error_log("🏠 API unificada llamada - Tipo: {$tipo_vivienda}, Filtro ID: {$filtro_id}");

if (empty($tipo_vivienda)) {
    error_log("❌ API: tipo de vivienda requerido");
    echo json_encode(['success' => false, 'message' => 'Tipo de vivienda requerido']);
    exit;
}

if (empty($filtro_id)) {
    error_log("❌ API: filtro_id requerido");
    echo json_encode(['success' => false, 'message' => 'ID de filtro requerido']);
    exit;
}

try {
    $resultados = [];
    
    switch ($tipo_vivienda) {
        case 'apartamento':
            // Obtener apartamentos disponibles por edificio
            $stmt = $pdo->prepare("
                SELECT a.apartamento_id as id, CONCAT(a.apartamento, ' (Piso ', a.piso, ')') as nombre, 'apartamento' as tipo
                FROM apartamentos a 
                LEFT JOIN inmueble i ON a.apartamento_id = i.entidad_id AND i.tipo_entidad = 'apartamento'
                WHERE a.edificio_id = ? AND i.entidad_id IS NULL
                ORDER BY a.piso ASC, a.apartamento ASC
            ");
            $stmt->execute([$filtro_id]);
            $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("🏠 API: Encontrados " . count($resultados) . " apartamentos para edificio_id: " . $filtro_id);
            break;
            
        default:
            error_log("❌ API: Tipo de vivienda no válido o deshabilitado: " . $tipo_vivienda);
            echo json_encode(['success' => false, 'message' => 'Tipo de vivienda no válido o deshabilitado']);
            exit;
    }
    
    // Log de resultados
    error_log("🏠 API: Resultados: " . json_encode($resultados));
    
    echo json_encode([
        'success' => true,
        'viviendas' => $resultados,
        'debug' => [
            'tipo_vivienda' => $tipo_vivienda,
            'filtro_id' => $filtro_id,
            'total_encontradas' => count($resultados)
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Error en api_vivienda.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
