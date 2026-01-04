<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

try {
    // Verificar que sea super admin
    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['tipo'] !== 'super_admin') {
        echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
        exit;
    }
    
    // Obtener año del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $year = $input['year'] ?? date('Y');
    
    // Obtener todas las casas
    $stmt = $pdo->query("
        SELECT 
            v.id,
            v.numero,
            v.tipo,
            v.nombre_propietario,
            v.apellido_propietario,
            u.username,
            u.email
        FROM viviendas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        ORDER BY v.numero ASC
    ");
    
    $houses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $morosityData = [];
    $totalDebtBs = 0;
    $totalDebtUsd = 0;
    $housesInDebt = 0;
    
    // Definir meses del año
    $monthNames = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    foreach ($houses as $house) {
        // Obtener pagos aprobados para esta casa en el año especificado
        $stmt = $pdo->prepare("
            SELECT meses, monto_bs, monto_dolares, moneda_pago
            FROM pagos_mensualidades 
            WHERE vivienda_id = ? 
            AND estado = 'aprobado'
            AND YEAR(fecha_pago) = ?
        ");
        $stmt->execute([$house['id'], $year]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Procesar meses pagados
        $paidMonths = [];
        foreach ($payments as $payment) {
            $meses = json_decode($payment['meses'], true);
            if (is_array($meses)) {
                foreach ($meses as $mes) {
                    $paidMonths[] = $mes['id'];
                }
            }
        }
        
        // Calcular meses que debe
        $allMonths = array_keys($monthNames);
        $unpaidMonths = array_diff($allMonths, $paidMonths);
        
        // Calcular deuda
        $debtBs = 0;
        $debtUsd = 0;
        $monthsInDebt = count($unpaidMonths);
        
        // Asumiendo que cada mes cuesta 50 Bs o $15 USD
        // Esto debería venir de una tabla de configuración en el futuro
        $debtBs = $monthsInDebt * 50;
        $debtUsd = $monthsInDebt * 15;
        
        $totalDebtBs += $debtBs;
        $totalDebtUsd += $debtUsd;
        
        if ($debtBs > 0 || $debtUsd > 0) {
            $housesInDebt++;
        }
        
        $morosityData[] = [
            'id' => $house['id'],
            'numero' => $house['numero'],
            'tipo' => $house['tipo'],
            'nombre_propietario' => $house['nombre_propietario'],
            'apellido_propietario' => $house['apellido_propietario'],
            'username' => $house['username'],
            'email' => $house['email'],
            'monthsInDebt' => $monthsInDebt,
            'debtBs' => $debtBs,
            'debtUsd' => $debtUsd,
            'unpaidMonths' => array_values($unpaidMonths)
        ];
    }
    
    echo json_encode([
        'success' => true,
        'summary' => [
            'totalDebtBs' => $totalDebtBs,
            'totalDebtUsd' => $totalDebtUsd,
            'housesInDebt' => $housesInDebt
        ],
        'houses' => $morosityData
    ]);
    
} catch (PDOException $e) {
    error_log("Error en get_morosity_data.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error en el servidor']);
}
?>
