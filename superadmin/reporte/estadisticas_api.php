<?php
session_start();
require_once '../../includes/database.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener estadísticas por ubicación (calle/avenida)
    $stmt = $pdo->query("
        SELECT 
            a.nombre_avenida as ubicacion,
            'Avenida' as tipo,
            COUNT(i.inmueble_id) as total,
            SUM(CASE WHEN p.propietario_id IS NOT NULL THEN 1 ELSE 0 END) as registrados,
            COUNT(i.inmueble_id) - SUM(CASE WHEN p.propietario_id IS NOT NULL THEN 1 ELSE 0 END) as pendientes,
            ROUND((SUM(CASE WHEN p.propietario_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(i.inmueble_id)) * 100, 2) as porcentaje
        FROM avenidas a
        LEFT JOIN inmuebles i ON a.avenida_id = i.avenida_id
        LEFT JOIN propietarios p ON i.propietario_id = p.propietario_id
        GROUP BY a.avenida_id, a.nombre_avenida
        HAVING total > 0
        ORDER BY a.nombre_avenida
    ");
    
    $estadisticas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular totales generales
    $total_propiedades = 0;
    $total_registrados = 0;
    $total_pendientes = 0;
    
    foreach ($estadisticas as $stat) {
        $total_propiedades += $stat['total'];
        $total_registrados += $stat['registrados'];
        $total_pendientes += $stat['pendientes'];
    }
    
    $porcentaje_general = $total_propiedades > 0 
        ? round(($total_registrados / $total_propiedades) * 100, 2) 
        : 0;
    
    echo json_encode([
        'success' => true,
        'estadisticas' => $estadisticas,
        'resumen' => [
            'total_propiedades' => $total_propiedades,
            'total_registrados' => $total_registrados,
            'total_pendientes' => $total_pendientes,
            'porcentaje_general' => $porcentaje_general
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
