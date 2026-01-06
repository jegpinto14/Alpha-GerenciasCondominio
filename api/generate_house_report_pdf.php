<?php
session_start();
require_once '../includes/database.php';
require_once '../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

// Verificar que el usuario sea super admin
if (!isset($_SESSION['user_id']) || $_SESSION['tipo'] !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $year = $input['year'] ?? date('Y');
    $house_id = $input['house_id'] ?? null;

    try {
        $query = "
            SELECT 
                pm.id,
                pm.meses,
                pm.monto_bs,
                pm.monto_dolares,
                pm.moneda_pago,
                pm.metodo_pago,
                pm.tasa_bs,
                pm.fecha_pago,
                pm.estado,
                v.numero as vivienda_numero,
                v.tipo as vivienda_tipo,
                v.nombre_propietario,
                v.apellido_propietario
            FROM pagos_mensualidades pm
            JOIN viviendas v ON pm.vivienda_id = v.id
            WHERE pm.estado = 'aprobado'
            AND YEAR(pm.fecha_pago) = ?
        ";
        $params = [$year];

        if ($house_id) {
            $query .= " AND pm.vivienda_id = ?";
            $params[] = $house_id;
        }

        $query .= " ORDER BY pm.fecha_pago ASC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $pagos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $paid_months = [];
        $meses_unicos = [];
        $total_bs = 0;
        $total_usd = 0;

        foreach ($pagos as $pago) {
            $meses = json_decode($pago['meses'], true);
            if (is_array($meses)) {
                $cantidad_meses = count($meses);
                $monto_por_mes_bs = $pago['monto_bs'] / $cantidad_meses;
                $monto_por_mes_usd = $pago['monto_dolares'] / $cantidad_meses;

                foreach ($meses as $mes) {
                    $mes_key = $pago['vivienda_numero'] . '_' . $mes['id'] . '_' . $year;

                    if (!isset($meses_unicos[$mes_key])) {
                        $meses_unicos[$mes_key] = true;

                        $paid_months[] = [
                            'vivienda_numero' => $pago['vivienda_numero'],
                            'vivienda_tipo' => $pago['vivienda_tipo'],
                            'propietario' => $pago['nombre_propietario'] . ' ' . $pago['apellido_propietario'],
                            'mes' => $mes['id'],
                            'año' => $year,
                            'mes_nombre' => $mes['name'],
                            'monto_bs' => $monto_por_mes_bs,
                            'monto_dolares' => $monto_por_mes_usd,
                            'moneda_pago' => $pago['moneda_pago'],
                            'metodo_pago' => $pago['metodo_pago'],
                            'tasa_bs' => $pago['tasa_bs'],
                            'fecha_pago' => $pago['fecha_pago'],
                            'estado' => $pago['estado']
                        ];

                        if ($pago['moneda_pago'] === 'bs') {
                            $total_bs += $monto_por_mes_bs;
                        } else {
                            $total_usd += $monto_por_mes_usd;
                        }
                    }
                }
            }
        }

        // Generar todos los meses del año para cada casa
        $all_months_report = [];
        $month_names = [
            1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
            5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
            9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
        ];

        $houses_to_report = [];
        if ($house_id) {
            $stmt = $pdo->prepare("SELECT id, numero, tipo, nombre_propietario, apellido_propietario FROM viviendas WHERE id = ?");
            $stmt->execute([$house_id]);
            $houses_to_report = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $stmt = $pdo->query("SELECT id, numero, tipo, nombre_propietario, apellido_propietario FROM viviendas ORDER BY numero ASC");
            $houses_to_report = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($houses_to_report as $h) {
            for ($i = 1; $i <= 12; $i++) {
                $is_paid = false;
                $paid_data = null;
                foreach ($paid_months as $pm) {
                    if ($pm['vivienda_numero'] == $h['numero'] && $pm['mes'] == $i && $pm['año'] == $year) {
                        $is_paid = true;
                        $paid_data = $pm;
                        break;
                    }
                }

                $all_months_report[] = [
                    'vivienda_numero' => $h['numero'],
                    'vivienda_tipo' => $h['tipo'],
                    'propietario' => $h['nombre_propietario'] . ' ' . $h['apellido_propietario'],
                    'mes' => $i,
                    'año' => $year,
                    'mes_nombre' => $month_names[$i],
                    'estado' => $is_paid ? 'Pagado' : 'No Pagado',
                    'monto_bs' => $is_paid ? $paid_data['monto_bs'] : 0,
                    'monto_dolares' => $is_paid ? $paid_data['monto_dolares'] : 0,
                    'moneda_pago' => $is_paid ? $paid_data['moneda_pago'] : 'N/A',
                    'metodo_pago' => $is_paid ? $paid_data['metodo_pago'] : 'N/A',
                    'tasa_bs' => $is_paid ? $paid_data['tasa_bs'] : 0,
                    'fecha_pago' => $is_paid ? $paid_data['fecha_pago'] : null
                ];
            }
        }

        // Generar HTML para PDF
        $html = generatePDFHTML($all_months_report, $total_bs, $total_usd, $year, $house_id);

        // Configurar DomPDF
        $options = new Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true);
        
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        // Enviar PDF
        $filename = 'reporte_casa_' . $year . '.pdf';
        if ($house_id) {
            $stmt = $pdo->prepare("SELECT numero FROM viviendas WHERE id = ?");
            $stmt->execute([$house_id]);
            $house_number = $stmt->fetchColumn();
            $filename = 'reporte_casa_' . $house_number . '_' . $year . '.pdf';
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        echo $dompdf->output();

    } catch (PDOException $e) {
        error_log("Error generando PDF de reporte de casa: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}

function generatePDFHTML($months, $total_bs, $total_usd, $year, $house_id = null) {
    $paid_count = count(array_filter($months, function($m) { return $m['estado'] === 'Pagado'; }));
    $unpaid_count = count(array_filter($months, function($m) { return $m['estado'] === 'No Pagado'; }));
    
    $house_title = $house_id ? "Casa Específica" : "Todas las Casas";
    
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Reporte de Pagos - ' . $house_title . ' - Año ' . $year . '</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1A3A4A; padding-bottom: 20px; }
            .header h1 { color: #1A3A4A; margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 5px 0 0 0; }
            .summary { margin-bottom: 30px; }
            .summary-grid { display: table; width: 100%; margin-bottom: 20px; }
            .summary-item { display: table-cell; width: 25%; text-align: center; padding: 15px; background: #f8f9fa; border: 1px solid #ddd; }
            .summary-item h3 { margin: 0; color: #1A3A4A; font-size: 18px; }
            .summary-item p { margin: 5px 0 0 0; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #1A3A4A; color: white; font-weight: bold; }
            .status-paid { color: #28a745; font-weight: bold; }
            .status-unpaid { color: #dc3545; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="../assets/images/logo_gerencia_condominio.png" style="max-width: 150px; height: auto; margin-bottom: 10px;">
            <h1>Reporte de Pagos por Casa</h1>
            <p>' . $house_title . ' - Año ' . $year . '</p>
            <p>Generado el ' . date('d/m/Y H:i') . '</p>
        </div>
        
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <h3>' . number_format($total_bs, 2) . ' Bs</h3>
                    <p>Total Pagado (Bs)</p>
                </div>
                <div class="summary-item">
                    <h3>$' . number_format($total_usd, 2) . '</h3>
                    <p>Total Pagado (USD)</p>
                </div>
                <div class="summary-item">
                    <h3>' . $paid_count . '</h3>
                    <p>Meses Pagados</p>
                </div>
                <div class="summary-item">
                    <h3>' . $unpaid_count . '</h3>
                    <p>Meses Sin Pagar</p>
                </div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Vivienda</th>
                    <th>Propietario</th>
                    <th>Mes</th>
                    <th>Año</th>
                    <th>Estado</th>
                    <th>Monto</th>
                    <th>Moneda</th>
                    <th>Método</th>
                    <th>Fecha Pago</th>
                </tr>
            </thead>
            <tbody>';
    
    foreach ($months as $month) {
        $monto_display = '-';
        $moneda_display = '-';
        $metodo_display = '-';
        $fecha_display = '-';
        
        if ($month['estado'] === 'Pagado') {
            $monto_display = number_format($month['monto_bs'] ?: $month['monto_dolares'], 2);
            $moneda_display = strtoupper($month['moneda_pago']);
            $metodo_display = $month['metodo_pago'];
            $fecha_display = date('d/m/Y', strtotime($month['fecha_pago']));
        }
        
        $html .= '
                <tr>
                    <td>' . htmlspecialchars($month['vivienda_tipo'] . ' #' . $month['vivienda_numero']) . '</td>
                    <td>' . htmlspecialchars($month['propietario']) . '</td>
                    <td>' . htmlspecialchars($month['mes_nombre']) . '</td>
                    <td>' . htmlspecialchars($month['año']) . '</td>
                    <td class="' . ($month['estado'] === 'Pagado' ? 'status-paid' : 'status-unpaid') . '">' . htmlspecialchars($month['estado']) . '</td>
                    <td>' . $monto_display . '</td>
                    <td>' . $moneda_display . '</td>
                    <td>' . htmlspecialchars($metodo_display) . '</td>
                    <td>' . $fecha_display . '</td>
                </tr>';
    }
    
    $html .= '
            </tbody>
        </table>
        
        <div class="footer">
            <p>Reporte generado automáticamente por el Sistema Gerencia Express</p>
        </div>
    </body>
    </html>';
    
    return $html;
}
