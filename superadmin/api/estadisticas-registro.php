<?php
// Desactivar errores HTML
error_reporting(0);
ini_set('display_errors', 0);

// Headers primero
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Configuración de base de datos
require_once __DIR__ . '/../../includes/database.php';

try {
    // Mapear $pdo (de database.php) a $conn para compatibilidad
    $conn = $pdo;
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // Estadísticas por edificio (apartamentos)
    $queryApartamentos = "
        SELECT 
            e.edificio_id as id_avenida,
            e.nombre_edificio as nombre_avenida,
            'apartamento' as tipo,
            COUNT(DISTINCT ap.apartamento_id) as total,
            COUNT(DISTINCT CASE WHEN i.inmueble_id IS NOT NULL THEN ap.apartamento_id END) as registrados,
            ROUND((COUNT(DISTINCT CASE WHEN i.inmueble_id IS NOT NULL THEN ap.apartamento_id END) / 
                   NULLIF(COUNT(DISTINCT ap.apartamento_id), 0)) * 100, 2) as porcentaje
        FROM edificios e
        LEFT JOIN apartamentos ap ON e.edificio_id = ap.edificio_id
        LEFT JOIN inmueble i ON ap.apartamento_id = i.entidad_id AND i.tipo_entidad = 'apartamento'
        GROUP BY e.edificio_id, e.nombre_edificio
        HAVING COUNT(DISTINCT ap.apartamento_id) > 0
    ";
    
    // Consulta final simplificada
    $queryFinal = "
        $queryApartamentos
        ORDER BY nombre_avenida
    ";
    
    $stmt = $conn->prepare($queryFinal);
    $stmt->execute();
    $estadisticas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular totales generales
    $totalGeneral = 0;
    $registradosGeneral = 0;
    
    foreach ($estadisticas as $stat) {
        $totalGeneral += intval($stat['total']);
        $registradosGeneral += intval($stat['registrados']);
    }
    
    $porcentajeGeneral = $totalGeneral > 0 ? round(($registradosGeneral / $totalGeneral) * 100, 2) : 0;
    
    // Enviar respuesta JSON
    echo json_encode([
        'success' => true,
        'data' => $estadisticas,
        'resumen' => [
            'total_viviendas' => $totalGeneral,
            'viviendas_registradas' => $registradosGeneral,
            'viviendas_pendientes' => $totalGeneral - $registradosGeneral,
            'porcentaje_general' => $porcentajeGeneral
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
