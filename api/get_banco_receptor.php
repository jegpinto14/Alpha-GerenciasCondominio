<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

try {
    // Obtener datos del banco receptor (banco_id = 2)
    $stmt = $pdo->prepare("
        SELECT 
            br.banco_receptor_id,
            br.banco_id,
            br.telefono,
            br.tipo_documento,
            br.nro_documento,
            br.nro_cuenta,
            b.nombre_banco,
            b.codigo_banco
        FROM banco_receptor br
        INNER JOIN bancos b ON br.banco_id = b.banco_id
        WHERE br.banco_receptor_id = 2
        LIMIT 1
    ");

    $stmt->execute();
    $bancoReceptor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$bancoReceptor) {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontró banco receptor configurado'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'banco_receptor' => [
            'id' => $bancoReceptor['banco_receptor_id'],
            'banco_id' => $bancoReceptor['banco_id'],
            'banco_nombre' => $bancoReceptor['nombre_banco'],
            'banco_codigo' => $bancoReceptor['codigo_banco'],
            'telefono' => $bancoReceptor['telefono'],
            'tipo_documento' => $bancoReceptor['tipo_documento'],
            'nro_documento' => $bancoReceptor['nro_documento'],
            'nro_cuenta' => $bancoReceptor['nro_cuenta']
        ]
    ]);

} catch (PDOException $e) {
    error_log("Error en get_banco_receptor.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error obteniendo banco receptor: ' . $e->getMessage()
    ]);
}
?>