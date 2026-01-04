<?php
/**
 * Generador de PDF para recibos de gastos extraordinarios
 * 
 * @description Genera PDFs para recibos de gastos extraordinarios (categoría 3)
 * @author Arcorui Community System
 * @date 2025-11-03
 */

session_start();
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../vendor/tcpdf/tcpdf.php';

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

/**
 * Función para generar el HTML del recibo de gasto extraordinario
 */
function generateExtraordinaryReceiptHTML($recibo) {
    $fechaActual = date('d/m/Y');
    $horaActual = date('H:i:s');
    $fechaEmision = date('d/m/Y', strtotime($recibo['fecha_emision']));
    
    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Recibo de Gasto Extraordinario</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                color: #333;
                background: white;
                line-height: 1.4;
                padding: 20px;
            }
            
            .receipt-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border: 1px solid #ddd;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .header {
                text-align: center;
                padding: 30px 20px 20px;
                border-bottom: 2px solid #e74c3c;
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
            }
            
            .company-name {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 8px;
                color: white;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            
            .system-title {
                font-size: 16px;
                color: #ffe8e8;
                margin-bottom: 15px;
            }
            
            .document-title {
                font-size: 24px;
                font-weight: bold;
                color: white;
                background: rgba(255,255,255,0.1);
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
            }
            
            .info-section {
                margin: 25px 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .section-header {
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
                padding: 12px 20px;
                font-weight: bold;
                font-size: 16px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .info-grid {
                padding: 20px;
                background: #f8f9fa;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
                font-size: 14px;
            }
            
            .info-row:last-child {
                border-bottom: none;
            }
            
            .info-label {
                font-weight: bold;
                color: #333;
                flex: 1;
            }
            
            .info-value {
                color: #555;
                flex: 1;
                text-align: right;
            }
            
            .service-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .table-header {
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
            }
            
            .table-header th {
                padding: 15px 10px;
                text-align: center;
                font-weight: bold;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-right: 1px solid rgba(255,255,255,0.2);
            }
            
            .table-header th:last-child {
                border-right: none;
            }
            
            .table-row td {
                padding: 12px 10px;
                font-size: 13px;
                color: #333;
                border-right: 1px solid #ddd;
                border-bottom: 1px solid #ddd;
            }
            
            .table-row td:last-child {
                border-right: none;
            }
            
            .service-column {
                text-align: left;
                font-weight: bold;
                color: #e74c3c;
            }
            
            .description-column {
                text-align: left;
                color: #555;
            }
            
            .amount-column {
                text-align: right;
                font-weight: bold;
                color: #e74c3c;
                font-size: 14px;
            }
            
            .total-section {
                margin: 20px;
                border: 2px solid #e74c3c;
                border-radius: 8px;
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
                overflow: hidden;
            }
            
            .total-row {
                padding: 15px 20px;
                font-size: 18px;
                font-weight: bold;
                text-align: left;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .footer {
                text-align: center;
                padding: 25px 20px;
                background: #f8f9fa;
                border-top: 1px solid #ddd;
            }
            
            .validity-statement {
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
                font-style: italic;
            }
            
            .system-reference {
                font-size: 16px;
                font-weight: bold;
                color: #e74c3c;
                margin-bottom: 8px;
            }
            
            .generation-timestamp {
                font-size: 12px;
                color: #888;
                font-family: monospace;
            }
            
            .status-badge {
                display: inline-block;
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                color: white;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 2px 4px rgba(231, 76, 60, 0.3);
            }
        </style>
    </head>
    <body>
        <div class='receipt-container'>
            <div class='header'>
                <div class='company-name'>ARCORUI</div>
                <div class='system-title'>Sistema de Gestión de Gastos Extraordinarios</div>
                <div class='document-title'>Recibo de Gasto Extraordinario</div>
            </div>
            
            <div class='info-section'>
                <div class='section-header'>Información del Gasto</div>
                <div class='info-grid'>
                    <div class='info-row'>
                        <span class='info-label'>Fecha de Emisión:</span>
                        <span class='info-value'>{$fechaEmision}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Tipo de Gasto:</span>
                        <span class='info-value'>Gasto Extraordinario</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Concepto:</span>
                        <span class='info-value'>{$recibo['nombre_documento']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Estado:</span>
                        <span class='info-value'><span class='status-badge'>Procesado</span></span>
                    </div>
                </div>
            </div>
            
            <div class='info-section'>
                <div class='section-header'>Información del Propietario</div>
                <div class='info-grid'>
                    <div class='info-row'>
                        <span class='info-label'>Propietario:</span>
                        <span class='info-value'>{$recibo['nombre_propietario']} {$recibo['apellido_propietario']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Cédula:</span>
                        <span class='info-value'>V-{$recibo['cedula_propietario']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Teléfono:</span>
                        <span class='info-value'>{$recibo['telefono_propietario']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Inmueble:</span>
                        <span class='info-value'>ID: {$recibo['inmueble_id']}</span>
                    </div>
                </div>
            </div>
            
            <table class='service-table'>
                <thead class='table-header'>
                    <tr>
                        <th>Concepto</th>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class='table-row'>
                        <td class='service-column'>{$recibo['nombre_documento']}</td>
                        <td class='description-column'>{$recibo['descripcion_documento']}</td>
                        <td class='amount-column'>{$recibo['cantidad']}</td>
                        <td class='amount-column'>$" . number_format($recibo['precio_unitario_usd'], 2, ',', '.') . "</td>
                        <td class='amount-column'>$" . number_format($recibo['total_linea_usd'], 2, ',', '.') . "</td>
                    </tr>
                </tbody>
            </table>
            
            <div class='total-section'>
                <div class='total-row'>
                    Total Pagado: $" . number_format($recibo['total_linea_usd'], 2, ',', '.') . " (Dólares USD)
                </div>
            </div>
            
            <div class='footer'>
                <div class='validity-statement'>
                    Este documento es válido como comprobante de gasto extraordinario.
                </div>
                <div class='system-reference'>
                    ARCORUI - Sistema de Gestión de Gastos Extraordinarios
                </div>
                <div class='generation-timestamp'>
                    Recibo generado el: {$fechaActual} {$horaActual}
                </div>
            </div>
        </div>
    </body>
    </html>";
    
    return $html;
}

/**
 * Función para obtener información detallada del inmueble
 * 
 * @param int $inmuebleId ID del inmueble
 * @param string $tipoEntidad Tipo de entidad (casa, apartamento, etc.)
 * @param int $entidadId ID de la entidad específica
 * @return string Información formateada del inmueble
 */
function obtenerInfoInmueble($inmuebleId, $tipoEntidad, $entidadId)
{
    global $pdo;

    try {
        $infoInmueble = '';

        if ($tipoEntidad === 'apartamento') {
            $stmt = $pdo->prepare("
                SELECT 
                    a.apartamento as numero_apartamento,
                    a.piso,
                    e.nombre_edificio
                FROM apartamentos a
                JOIN edificios e ON a.edificio_id = e.edificio_id
                WHERE a.apartamento_id = ?
            ");
            $stmt->execute([$entidadId]);
            $apartamento = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($apartamento) {
                $infoInmueble = "Edificio {$apartamento['nombre_edificio']}, Piso {$apartamento['piso']}, Apto {$apartamento['numero_apartamento']}";
            }

        } elseif ($tipoEntidad === 'casa') {
            $stmt = $pdo->prepare("
                SELECT 
                    c.nombre_casa,
                    av.nombre_avenida
                FROM casas c
                JOIN avenidas av ON c.avenida_id = av.id_avenida
                WHERE c.casa_id = ?
            ");
            $stmt->execute([$entidadId]);
            $casa = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($casa) {
                $infoInmueble = "Casa {$casa['nombre_casa']}, Avenida {$casa['nombre_avenida']}";
            }

        } elseif ($tipoEntidad === 'establecimientos') {
            $stmt = $pdo->prepare("
                SELECT nombre_establecimiento
                FROM establecimientos
                WHERE establecimiento_id = ?
            ");
            $stmt->execute([$entidadId]);
            $establecimiento = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($establecimiento) {
                $infoInmueble = "Establecimiento: {$establecimiento['nombre_establecimiento']}";
            }

        } elseif ($tipoEntidad === 'centro_comercial') {
            $stmt = $pdo->prepare("
                SELECT nombre_centro
                FROM centros_comerciales
                WHERE centro_id = ?
            ");
            $stmt->execute([$entidadId]);
            $centro = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($centro) {
                $infoInmueble = "Centro Comercial: {$centro['nombre_centro']}";
            }
        }

        return $infoInmueble ?: 'Inmueble no especificado';

    } catch (Exception $e) {
        error_log("Error obteniendo información del inmueble: " . $e->getMessage());
        return 'Error al obtener información del inmueble';
    }
}

/**
 * Función para generar el recibo PDF de gasto extraordinario
 */
function generateExtraordinaryReceipt($detalleId) {
    global $pdo;
    
    try {
        // Obtener datos completos del recibo de gasto extraordinario
        $sql = "
            SELECT 
                di.detalle_id,
                di.ingreso_id,
                di.fecha_pago as fecha_emision,
                di.cantidad,
                di.precio_unitario_usd,
                di.total_linea_usd,
                di.tasa_id,
                t.tasa,
                it.nombre_item as nombre_documento,
                it.descripcion as descripcion_documento,
                i.inmueble_id,
                i.estado as estado_pago,
                inm.tipo_entidad,
                inm.entidad_id,
                prop.nombre as nombre_propietario,
                prop.apellido as apellido_propietario,
                prop.nro_documento as cedula_propietario,
                prop.telefono as telefono_propietario,
                mp.descripcion as metodo_pago
            FROM detalle_ingresos di
            INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
            INNER JOIN movimientos_items mi ON i.ingreso_id = mi.ingreso_id
            INNER JOIN items it ON mi.item_id = it.item_id
            INNER JOIN inmueble inm ON i.inmueble_id = inm.inmueble_id
            INNER JOIN propietarios prop ON inm.propietario_id = prop.propietario_id
            INNER JOIN metodos_pago mp ON i.metodo_id = mp.metodo_id
            LEFT JOIN tasas t ON di.tasa_id = t.tasa_id
            WHERE di.detalle_id = ?
              AND i.categoria_id = 3
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$detalleId]);
        $recibo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$recibo) {
            throw new Exception("Recibo de gasto extraordinario no encontrado");
        }

        // Obtener información detallada del inmueble
        $inmuebleInfo = '';
        if ($recibo['inmueble_id']) {
            $inmuebleInfo = obtenerInfoInmueble($recibo['inmueble_id'], $recibo['tipo_entidad'], $recibo['entidad_id']);
        }

        // Configurar TCPDF
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
        
        // Configurar información del documento
        $pdf->SetCreator('ARCORUI');
        $pdf->SetAuthor('Sistema ARCORUI');
        $pdf->SetTitle('Recibo de Gasto Extraordinario');
        $pdf->SetSubject('Recibo de Gasto Extraordinario');
        
        // Quitar header y footer por defecto
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        
        // Configurar márgenes
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        
        // Configurar fuente por defecto
        $pdf->SetFont('helvetica', '', 10);
        
        // Agregar página
        $pdf->AddPage();
        
        // Definir colores azules
        $azulOscuro = [25, 55, 109];      // #19376D
        $azulMedio = [25, 55, 109];       // #2162FF  
        $azulClaro = [227, 242, 253];     // #E3F2FD
        
        // ENCABEZADO CON LOGO Y COLORES
        $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->Rect(0, 0, 210, 45, 'F');
        
        // Logo
        $logoPath = __DIR__ . '/../assets/images/logo_2.jpg';
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 75, 7, 60, 24, 'JPG');
        } else {
            // Fallback si no hay logo
            $pdf->SetTextColor(255, 255, 255);
            $pdf->SetFont('helvetica', 'B', 18);
            $pdf->SetY(8);
            $pdf->Cell(0, 8, 'ARCORUI', 0, 1, 'C', 0, '', 0);
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(0, 4, 'Sistema de Gestion de Gastos', 0, 1, 'C', 0, '', 0);
        }
        
        // Título del comprobante
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetY(32);
        $pdf->Cell(0, 8, 'Comprobante de Gasto Extraordinario', 0, 1, 'C', 0, '', 0);
        
        $pdf->SetY(55);
        
        // Información del gasto
        $fechaEmision = $recibo['fecha_emision'] ? date('d/m/Y', strtotime($recibo['fecha_emision'])) : 'N/A';
        
        // SECCIÓN: INFORMACIÓN DEL GASTO
        $pdf->SetFillColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 8, 'INFORMACION DEL GASTO', 1, 1, 'C', 1, '', 0);
        
        $pdf->SetFillColor($azulClaro[0], $azulClaro[1], $azulClaro[2]);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 10);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Fecha de Emision:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $fechaEmision, 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Fecha del Registro del Pago:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $fechaEmision, 1, 1, 'L', 0, '', 0);
        
        $tasaDia = isset($recibo['tasa']) && $recibo['tasa'] ? number_format($recibo['tasa'], 2, ',', '.') : 'N/A';
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Tasa del dia:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, 'Bs ' . $tasaDia, 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Tipo de Gasto:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, 'Gasto Extraordinario', 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Concepto:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $recibo['nombre_documento'], 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Estado del Pago:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $recibo['estado_pago'] ?: 'N/A', 1, 1, 'L', 0, '', 0);
        
        $pdf->Ln(5);
        
        // SECCIÓN: INFORMACIÓN DEL PROPIETARIO
        $pdf->SetFillColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 8, 'INFORMACION DEL PROPIETARIO', 1, 1, 'C', 1, '', 0);
        
        $pdf->SetFillColor($azulClaro[0], $azulClaro[1], $azulClaro[2]);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 10);
        
        $propietarioCompleto = $recibo['nombre_propietario'] . ' ' . $recibo['apellido_propietario'];
        $cedulaCompleta = 'V-' . $recibo['cedula_propietario'];
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Propietario:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $propietarioCompleto, 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Cedula:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $cedulaCompleta, 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Telefono:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $recibo['telefono_propietario'] ?: 'N/A', 1, 1, 'L', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Inmueble:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $inmuebleInfo ?: 'N/A', 1, 1, 'L', 0, '', 0);
        
        $pdf->Ln(5);
        
        // TABLA DE DETALLES DEL GASTO
        $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 9);
        
        $pdf->Cell(55, 8, 'CONCEPTO', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(65, 8, 'DESCRIPCION', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(30, 8, 'CANTIDAD', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(30, 8, 'MONTO', 1, 1, 'C', 1, '', 0);
        
        $pdf->SetFillColor(255, 255, 255);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 8);
        
        $pdf->Cell(55, 8, $recibo['nombre_documento'], 1, 0, 'L', 0, '', 0);
        $pdf->Cell(65, 8, substr($recibo['descripcion_documento'], 0, 40), 1, 0, 'L', 0, '', 0);
        $pdf->Cell(30, 8, $recibo['cantidad'], 1, 0, 'C', 0, '', 0);
        $pdf->SetFont('helvetica', 'B', 8);
        $montoUsd = isset($recibo['total_linea_usd']) && is_numeric($recibo['total_linea_usd']) ? (float) $recibo['total_linea_usd'] : 0;
        $pdf->Cell(30, 8, '$' . number_format($montoUsd, 2, ',', '.'), 1, 1, 'R', 0, '', 0);
        
        $pdf->Ln(5);
        
        // TOTAL PAGADO
        $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 13);
        $totalPagado = '$' . number_format($montoUsd, 2, ',', '.');
        $pdf->Cell(0, 10, 'TOTAL PAGADO: ' . $totalPagado . ' (Dolares USD)', 1, 1, 'C', 1, '', 0);
        
        $pdf->Ln(8);
        
        // PIE DE PÁGINA
        $pdf->SetDrawColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
        $pdf->SetLineWidth(0.5);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->SetLineWidth(0.2);
        $pdf->SetDrawColor(0, 0, 0);
        $pdf->Ln(4);
        
        $pdf->SetTextColor(66, 66, 66);
        $pdf->SetFont('helvetica', 'I', 9);
        $pdf->Cell(0, 5, 'Este documento es valido como comprobante de gasto extraordinario.', 0, 1, 'C', 0, '', 0);
        
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->SetTextColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->Cell(0, 5, 'ARCORUI - Sistema de Gestion de Gastos', 0, 1, 'C', 0, '', 0);
        
        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetTextColor(66, 66, 66);
        $pdf->Cell(0, 4, 'Comprobante generado el: ' . date('d/m/Y H:i:s'), 0, 1, 'C', 0, '', 0);

        // Limpiar completamente el buffer de salida antes de enviar el PDF
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // Limpiar cualquier output previo
        if (headers_sent($file, $line)) {
            error_log("⚠️ Headers ya enviados en {$file}:{$line}");
            throw new Exception("No se puede generar PDF - Headers ya enviados en {$file}:{$line}");
        }

        // Nombre del archivo para descarga
        $fileName = 'Recibo_Extraordinario_' . $detalleId . '_' . date('Ymd_His') . '.pdf';
        
        error_log("Generando PDF de gasto extraordinario con nombre: " . $fileName);
        
        // Configurar headers manualmente antes de Output
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        
        // Output del PDF
        echo $pdf->Output($fileName, 'S');
        
        error_log("=== FIN generate_extraordinary_receipt.php (exitoso) ===");
        exit;
        
    } catch (Exception $e) {
        error_log("Error generando recibo de gasto extraordinario PDF: " . $e->getMessage());
        return false;
    }
}

// Procesar solicitud
try {
    $detalleId = $_GET['detalle_id'] ?? null;
    
    if (!$detalleId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID de detalle requerido']);
        exit;
    }
    
    // Verificar que el usuario tenga acceso a este recibo
    $stmt = $pdo->prepare("
        SELECT di.detalle_id 
        FROM detalle_ingresos di
        INNER JOIN ingresos i ON di.ingreso_id = i.ingreso_id
        INNER JOIN inmueble inm ON i.inmueble_id = inm.inmueble_id
        INNER JOIN propietarios prop ON inm.propietario_id = prop.propietario_id
        WHERE di.detalle_id = ? AND prop.user_id = ?
    ");
    $stmt->execute([$detalleId, $_SESSION['user_id']]);
    $userReceipt = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$userReceipt) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tienes acceso a este recibo']);
        exit;
    }
    
    // Generar y enviar PDF directamente
    $result = generateExtraordinaryReceipt($detalleId);
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error generando el recibo']);
        exit;
    }
    
    // Si llegamos aquí, el PDF se envió correctamente
    exit;
    
} catch (Exception $e) {
    error_log("Error en generate_extraordinary_receipt.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>
