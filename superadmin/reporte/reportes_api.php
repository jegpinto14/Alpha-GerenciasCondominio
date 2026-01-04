<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');
session_start();
require_once '../../includes/database.php';

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Obtener todos los inmuebles con información de propietarios
    $stmt = $pdo->query("
        SELECT 
            i.inmueble_id,
            CASE 
                WHEN i.tipo_entidad = 'casa' THEN (SELECT nombre_casa FROM casas WHERE casa_id = i.entidad_id)
                WHEN i.tipo_entidad = 'apartamento' THEN CONCAT(
                    (SELECT abreviatura FROM edificios e JOIN apartamentos a ON e.edificio_id = a.edificio_id WHERE a.apartamento_id = i.entidad_id),
                    '-',
                    (SELECT CONCAT(piso, apartamento) FROM apartamentos WHERE apartamento_id = i.entidad_id)
                )
                WHEN i.tipo_entidad = 'establecimiento' THEN (SELECT nombre_establecimiento FROM establecimientos WHERE establecimiento_id = i.entidad_id)
                ELSE 'Local CC'
            END as nombre_vivienda,
            p.nombre as nombre_propietario,
            p.apellido,
            p.gmail as correo,
            a.nombre_avenida as calle
        FROM inmueble i
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        LEFT JOIN casas c ON i.tipo_entidad = 'casa' AND i.entidad_id = c.casa_id
        LEFT JOIN avenidas a ON c.avenida_id = a.id_avenida
        WHERE a.nombre_avenida IS NOT NULL
        
        UNION
        
        SELECT 
            i.inmueble_id,
            CONCAT(
                (SELECT abreviatura FROM edificios e WHERE e.edificio_id = ap.edificio_id),
                '-',
                CONCAT(ap.piso, ap.apartamento)
            ) as nombre_vivienda,
            p.nombre as nombre_propietario,
            p.apellido,
            p.gmail as correo,
            (SELECT nombre_avenida FROM avenidas WHERE id_avenida = 
                (SELECT avenida_id FROM casas WHERE casa_id = 
                    (SELECT MIN(casa_id) FROM casas)
                )
            ) as calle
        FROM inmueble i
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        INNER JOIN apartamentos ap ON i.tipo_entidad = 'apartamento' AND i.entidad_id = ap.apartamento_id
        
        UNION
        
        SELECT 
            i.inmueble_id,
            e.nombre_establecimiento as nombre_vivienda,
            p.nombre as nombre_propietario,
            p.apellido,
            p.gmail as correo,
            a.nombre_avenida as calle
        FROM inmueble i
        INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
        INNER JOIN establecimientos e ON i.tipo_entidad = 'establecimiento' AND i.entidad_id = e.establecimiento_id
        INNER JOIN avenidas a ON e.avenida_id = a.id_avenida
        
        ORDER BY nombre_vivienda
    ");
    
    $inmuebles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener cantidades por calle
    $stmt = $pdo->query("
        SELECT 
            a.nombre_avenida,
            COUNT(DISTINCT i.inmueble_id) as cantidad
        FROM avenidas a
        LEFT JOIN casas c ON a.id_avenida = c.avenida_id
        LEFT JOIN inmueble i ON i.tipo_entidad = 'casa' AND i.entidad_id = c.casa_id
        GROUP BY a.id_avenida, a.nombre_avenida
        HAVING cantidad > 0
        ORDER BY a.nombre_avenida
    ");
    
    $cantidades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'total_inmuebles' => count($inmuebles),
        'inmuebles' => $inmuebles,
        'cantidades' => $cantidades
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
