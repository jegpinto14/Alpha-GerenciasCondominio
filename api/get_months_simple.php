<?php
session_start();
header('Content-Type: application/json');
require_once '../includes/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$year = $_GET['year'] ?? date('Y');
$userId = $_SESSION['user_id'];
$requestedInmuebleId = isset($_GET['inmueble_id']) ? (int)$_GET['inmueble_id'] : null;

// Obtener monto mensual USD del tipo de vivienda del usuario
$montoMensualUsd = 15.00; // Default
try {
    if ($requestedInmuebleId > 0) {
        $stmt = $pdo->prepare("
            SELECT tv.monto_mensual_usd
            FROM inmueble i
            INNER JOIN propietarios p ON i.propietario_id = p.propietario_id
            INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
            WHERE i.inmueble_id = ? AND p.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$requestedInmuebleId, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $montoMensualUsd = (float)$row['monto_mensual_usd'];
        }
    } else {
        $stmt = $pdo->prepare("
            SELECT tv.monto_mensual_usd
            FROM propietarios p
            INNER JOIN inmueble i ON p.propietario_id = i.propietario_id
            INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
            WHERE p.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $montoMensualUsd = (float)$row['monto_mensual_usd'];
        }
    }
} catch (PDOException $e) {
    error_log("Error obteniendo monto mensual: " . $e->getMessage());
}

// Generar los 12 meses dinámicamente
$months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

$currentMonth = (int)date('n');
$currentYear = (int)date('Y');
$isCurrentYear = $currentYear == $year;

$monthsData = [];
foreach ($months as $index => $monthName) {
    $monthNumber = $index + 1;
    
    // Simular algunos meses pagados para 2025
    $isPaid = false;
    if ($year == 2025 && $monthNumber <= 3) { // Simular que enero, febrero y marzo están pagados
        $isPaid = true;
    }
    
    // Determinar el estado visual
    $visualStatus = 'unpaid'; // Por defecto debe pagar
    if ($isPaid) {
        $visualStatus = 'paid';
    } elseif ($isCurrentYear && $monthNumber > $currentMonth) {
        $visualStatus = 'pending'; // Meses futuros
    }

    $monthsData[] = [
        'id' => $monthNumber,
        'nombre' => $monthName,
        'año' => $year,
        'usdAmount' => $montoMensualUsd,
        'visual_status' => $visualStatus,
        'paid' => $isPaid
    ];
}

echo json_encode([
    'success' => true,
    'months' => $monthsData,
    'year' => $year
]);
?>
