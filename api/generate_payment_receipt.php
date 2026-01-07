<?php
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

// Función para generar el HTML del comprobante con el nuevo diseño
function generateInvoiceHTML($pago, $mesNombre)
{
    $fechaActual = date('d/m/Y');
    $horaActual = date('H:i:s');
    $fechaPago = date('d/m/Y', strtotime($pago['fecha_periodo'])); // Usar fecha del periodo (mes pagado)
    $horaPago = date('H:i:s'); // Hora actual ya que no tenemos hora específica del periodo

    // Preparar logo en Base64
    $logoBase64 = '';
    $logoPath = dirname(__DIR__) . '/assets/images/logo_gerencia_condominio.png';
    if (file_exists($logoPath)) {
        $logoData = file_get_contents($logoPath);
        $logoBase64 = 'data:image/png;base64,' . base64_encode($logoData);
    }

    $html = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Comprobante de Pago</title>
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
            
            /* Header Section */
            .header {
                text-align: center;
                padding: 30px 20px 20px;
                background: white;
                color: #1A3A4A;
            }
            
            .company-name {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #1A3A4A;
            }
            
            .system-title {
                font-size: 16px;
                color: #1A3A4A;
                margin-bottom: 15px;
            }
            
            .document-title {
                margin-top: 5px;
                font-size: 24px;
                font-weight: bold;
                color: #1A3A4A;
                background: rgba(26,58,74,0.1);
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
            }
            
            .separator {
                height: 2px;
                background: #2c5aa0;
                margin: 20px 0;
            }
            
            /* Information Sections */
            .info-section {
                margin: 25px 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .section-header {
                background: linear-gradient(135deg, #1A3A4A 0%, #112631 100%);
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
                background: #fafafa;
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
            
            /* Payment Details Table */
            .payment-table {
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
                background: linear-gradient(135deg, #1A3A4A 0%, #112631 100%);
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
            
            .concept-column {
                text-align: left;
                font-weight: bold;
                color: #2c5aa0;
            }
            
            .description-column {
                text-align: left;
                color: #555;
            }
            
            .method-column {
                color: #2c5aa0;
                font-weight: 500;
                min-width: 120px;
            }
            
            .bank-column {
                color: #2c5aa0;
                font-weight: 500;
            }
            
            .reference-column {
                font-family: monospace;
                color: #666;
            }
            
            .amount-column {
                text-align: right;
                font-weight: bold;
                color: #27ae60;
                font-size: 14px;
            }
            
            /* Total Section */
            .total-section {
                margin: 20px;
                border: 2px solid #27ae60;
                border-radius: 8px;
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
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
            
            /* Footer */
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
                color: #2c5aa0;
                margin-bottom: 8px;
            }
            
            .generation-timestamp {
                font-size: 12px;
                color: #888;
                font-family: monospace;
            }
            
            /* Status Badge */
            .status-badge {
                display: inline-block;
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                color: white;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 2px 4px rgba(39, 174, 96, 0.3);
            }
        </style>
    </head>
    <body>
        <div class='receipt-container'>
            <!-- Header -->
            <div class='header'>
                " . ($logoBase64 ? "<img src='{$logoBase64}' alt='Logo' style='max-width: 250px; height: auto; margin-bottom: 20px; margin-top: 0;'>" : "<div class='company-name'>Gerencia Express</div>") . "
                <div class='system-title'>Sistema de Gestión de Pagos</div>
                <div class='document-title'>Comprobante de Pago</div>
            </div>
            
            <!-- Payment Information Section -->
            <div class='info-section'>
                <div class='section-header'>Información del Pago</div>
                <div class='info-grid'>
                    <div class='info-row'>
                        <span class='info-label'>Mes Pagado:</span>
                        <span class='info-value'>{$fechaPago}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Hora:</span>
                        <span class='info-value'>{$horaPago}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Tipo de Pago:</span>
                        <span class='info-value'>Pago de Mensualidades</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Concepto:</span>
                        <span class='info-value'>Mensualidades correspondientes a: {$mesNombre}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Estado:</span>
                        <span class='info-value'><span class='status-badge'>Aprobado</span></span>
                    </div>
                </div>
            </div>
            
            <!-- Property Information Section -->
            <div class='info-section'>
                <div class='section-header'>Información de la Propiedad</div>
                <div class='info-grid'>
                    <div class='info-row'>
                        <span class='info-label'>Propietario:</span>
                        <span class='info-value'>{$pago['nombre_propietario']} {$pago['apellido_propietario']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Cédula:</span>
                        <span class='info-value'>{$pago['tipo_documento']}-{$pago['cedula_emisor']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Teléfono:</span>
                        <span class='info-value'>{$pago['telefono_emisor']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Tipo:</span>
                        <span class='info-value'>{$pago['tipo_vivienda']}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Dirección:</span>
                        <span class='info-value'>Propiedad del propietario</span>
                    </div>
                </div>
            </div>
            
            <!-- Payment Details Table -->
            <table class='payment-table'>
                <thead class='table-header'>
                    <tr>
                        <th>Concepto</th>
                        <th>Descripción</th>
                        <th>Método</th>
                        <th>Banco</th>
                        <th>Referencia</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class='table-row'>
                        <td class='concept-column'>Pago de Mensualidades</td>
                        <td class='description-column'>Mensualidades correspondientes a: {$mesNombre}</td>
                        <td class='method-column'>{$pago['metodo_pago']}</td>
                        <td class='bank-column'>{$pago['banco_emisor']}</td>
                        <td class='reference-column'>{$pago['nro_referencia']}</td>
                        <td class='amount-column'>Bs " . number_format($pago['monto_Bs'], 2, ',', '.') . "</td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Total Section -->
            <div class='total-section'>
                <div class='total-row'>
                    Total Pagado: Bs " . number_format($pago['monto_Bs'], 2, ',', '.') . " (Bolívares)
                </div>
            </div>
            
            <!-- Footer -->
            <div class='footer'>
                <div class='validity-statement'>
                    Este documento es válido como comprobante de pago oficial.
                </div>
                <div class='system-reference'>
                    Gerencia Express - Sistema de Gestión de Pagos
                </div>
                <div class='generation-timestamp'>
                    Comprobante generado el: {$fechaActual} {$horaActual}
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
 * Función para generar el recibo PDF dinámicamente
 * 
 * @param int|null $paymentId ID del pago (legacy - para compatibilidad)
 * @param int|null $paymentDetailId ID del detalle de pago (nuevo - recibo individual)
 * @return bool Éxito de la generación
 */
function generateReceipt($paymentId = null, $paymentDetailId = null)
{
    global $pdo;

    try {
        // Determinar qué consulta usar según el parámetro recibido
        if ($paymentDetailId) {
            // NUEVA LÓGICA: Recibo individual por transacción/detalle
            $sql = "
                SELECT 
                    pd.pago_detalle_id,
                    pag.pago_id,
                    pag.propietario_id,
                    pag.inmueble_id,
                    pr.fecha_periodo,
                    MONTH(pr.fecha_periodo) as mes,
                    YEAR(pr.fecha_periodo) as anio,
                    pag.estado as estado_pago,
                    pd.estado as estado_detalle,
                    prop.nombre as nombre_propietario,
                    prop.apellido as apellido_propietario,
                    prop.nro_documento as cedula_propietario,
                    prop.telefono as telefono_propietario,
                    prop.gmail as email_propietario,
                    pd.monto_usd,
                    pd.monto_Bs,
                    t.tasa,
                    pd.monto_pagado,
                    pd.fecha as fecha_transaccion,
                    mp.descripcion as metodo_pago,
                    be.telefono as telefono_emisor,
                    be.tipo_documento,
                    be.nro_documento as cedula_emisor,
                    be.nro_referencia,
                    pd.comprobante_path as comprobante,
                    be.fecha_pago,
                    b.nombre_banco as banco_emisor,
                    b.codigo_banco,
                    tv.nombre_tipo as tipo_vivienda,
                    i.tipo_entidad,
                    i.entidad_id
                FROM pago_detalles pd
                INNER JOIN pagos pag ON pd.pago_id = pag.pago_id
                INNER JOIN periodos pr ON pag.periodo_id = pr.periodo_id
                INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
                INNER JOIN inmueble i ON pag.inmueble_id = i.inmueble_id
                INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
                INNER JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
                LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
                LEFT JOIN bancos b ON be.banco_id = b.banco_id
                LEFT JOIN tasas t ON pd.tasa_id = t.tasa_id
                WHERE pd.pago_detalle_id = ?
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$paymentDetailId]);
            $pago = $stmt->fetch(PDO::FETCH_ASSOC);

        } else if ($paymentId) {
            // LÓGICA LEGACY: Recibo por pago_id (para compatibilidad con código antiguo)
            $sql = "
                SELECT 
                    pag.pago_id,
                    pag.propietario_id,
                    pag.inmueble_id,
                    pr.fecha_periodo,
                    MONTH(pr.fecha_periodo) as mes,
                    YEAR(pr.fecha_periodo) as anio,
                    pag.estado as estado_pago,
                    prop.nombre as nombre_propietario,
                    prop.apellido as apellido_propietario,
                    prop.nro_documento as cedula_propietario,
                    prop.telefono as telefono_propietario,
                    prop.gmail as email_propietario,
                    pd.monto_usd,
                    pd.monto_Bs,
                    t.tasa,
                    pd.monto_pagado,
                    pd.fecha as fecha_transaccion,
                    mp.descripcion as metodo_pago,
                    be.telefono as telefono_emisor,
                    be.tipo_documento,
                    be.nro_documento as cedula_emisor,
                    be.nro_referencia,
                    pd.comprobante_path as comprobante,
                    be.fecha_pago,
                    b.nombre_banco as banco_emisor,
                    b.codigo_banco,
                    tv.nombre_tipo as tipo_vivienda,
                    i.tipo_entidad,
                    i.entidad_id
                FROM pagos pag
                INNER JOIN periodos pr ON pag.periodo_id = pr.periodo_id
                INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
                INNER JOIN inmueble i ON pag.inmueble_id = i.inmueble_id
                INNER JOIN tipo_vivienda tv ON i.tipo_vivienda_id = tv.tipo_id
                LEFT JOIN pago_detalles pd ON pag.pago_id = pd.pago_id
                LEFT JOIN metodos_pago mp ON pd.metodo_id = mp.metodo_id
                LEFT JOIN banco_emisor be ON pd.banco_emisor_id = be.banco_emisor_id
                LEFT JOIN bancos b ON be.banco_id = b.banco_id
                LEFT JOIN tasas t ON pd.tasa_id = t.tasa_id
                WHERE pag.pago_id = ?
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$paymentId]);
            $pago = $stmt->fetch(PDO::FETCH_ASSOC);

        } else {
            throw new Exception("Se requiere payment_id o payment_detail_id");
        }

        if (!$pago) {
            throw new Exception("Pago no encontrado");
        }

        // Obtener información detallada del inmueble
        $inmuebleInfo = '';
        if ($pago['inmueble_id']) {
            $inmuebleInfo = obtenerInfoInmueble($pago['inmueble_id'], $pago['tipo_entidad'], $pago['entidad_id']);
        }

        // Nombres de meses
        $monthNames = [
            1 => 'Enero',
            2 => 'Febrero',
            3 => 'Marzo',
            4 => 'Abril',
            5 => 'Mayo',
            6 => 'Junio',
            7 => 'Julio',
            8 => 'Agosto',
            9 => 'Septiembre',
            10 => 'Octubre',
            11 => 'Noviembre',
            12 => 'Diciembre'
        ];

        // Verificar si es un pago de deuda (mes = 0)
        if ($pago['mes'] == 0) {
            $mesNombre = 'Pago Deuda';
        } else {
            $mesNombre = $monthNames[$pago['mes']] ?? 'Desconocido';
        }

        // Configurar TCPDF
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);

        // Configurar información del documento
        $pdf->SetCreator('Gerencia Express');
        $pdf->SetAuthor('Sistema Gerencia Express');
        $pdf->SetTitle('Comprobante de Pago');
        $pdf->SetSubject('Recibo de Pago Mensual');

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

        // Definir colores azules del sistema
        $azulOscuro = [26, 58, 74];       // #1A3A4A
        $azulMedio = [26, 58, 74];        // #1A3A4A  
        $azulClaro = [240, 244, 248];     // Gris azulado claro para contraste

        // ENCABEZADO CON LOGO Y COLORES
        // Logo - Priorizar logo_gerencia_condominio.png
        $logoPath = dirname(__DIR__) . '/assets/images/logo_gerencia_condominio.png';
        
        if (file_exists($logoPath)) {
            // Usar Image con alto 0 para mantener proporción - Tamaño reducido a 80 y movido a Y=2
            $pdf->Image($logoPath, 0, 2, 80, 0, 'PNG', '', '', true, 300, 'C');
        } else {
            // Fallback si no hay logo - Texto Azul para que sea visible sobre el fondo blanco
            $pdf->SetTextColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
            $pdf->SetFont('helvetica', 'B', 18);
            $pdf->SetY(12);
            $pdf->Cell(0, 8, 'Gerencia Express', 0, 1, 'C', 0, '', 0);
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(0, 4, 'Sistema de Gestion de Pagos', 0, 1, 'C', 0, '', 0);
        }

        // Título del comprobante - Reajustado para evitar solapamiento (Y=65)
        $pdf->SetTextColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetY(65);
        $pdf->Cell(0, 8, 'Comprobante de Pago Mensual', 0, 1, 'C', 0, '', 0);
 
        $pdf->SetY(78);

        // Información del pago
        // Usar fecha_pago si existe (pago móvil/transferencia), sino usar fecha_transaccion (efectivo divisa)
        $fechaPago = 'N/A';
        if (isset($pago['fecha_pago']) && $pago['fecha_pago']) {
            $fechaPago = date('d/m/Y', strtotime($pago['fecha_pago']));
        } elseif (isset($pago['fecha_transaccion']) && $pago['fecha_transaccion']) {
            $fechaPago = date('d/m/Y', strtotime($pago['fecha_transaccion']));
        }
        $horaPago = isset($pago['fecha_pago']) && $pago['fecha_pago'] ? date('H:i:s', strtotime($pago['fecha_pago'])) : 'N/A';

        // SECCIÓN: INFORMACIÓN DEL PAGO
        $pdf->SetFillColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 8, 'INFORMACION DEL PAGO', 1, 1, 'C', 1, '', 0);

        $pdf->SetFillColor($azulClaro[0], $azulClaro[1], $azulClaro[2]);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 10);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Fecha de Pago:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $fechaPago, 1, 1, 'L', 0, '', 0);

        $fechaRegistro = isset($pago['fecha_transaccion']) && $pago['fecha_transaccion'] ? date('d/m/Y', strtotime($pago['fecha_transaccion'])) : 'N/A';
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Fecha del Registro del Pago:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $fechaRegistro, 1, 1, 'L', 0, '', 0);

        $tasaDia = isset($pago['tasa']) && $pago['tasa'] ? number_format($pago['tasa'], 2, ',', '.') : 'N/A';
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Tasa del dia:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, 'Bs ' . $tasaDia, 1, 1, 'L', 0, '', 0);

        // Determinar tipo de pago y si mostrar mes
        $esPagoDeuda = ($pago['mes'] == 0);
        $tipoPago = $esPagoDeuda ? 'Pago Deuda' : 'Pago de Mensualidades';

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Tipo de Pago:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $tipoPago, 1, 1, 'L', 0, '', 0);

        // Solo mostrar fila de Mes si NO es Pago Deuda
        if (!$esPagoDeuda) {
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->Cell(50, 7, 'Mes:', 1, 0, 'L', 1, '', 0);
            $pdf->SetFont('helvetica', '', 10);
            $pdf->Cell(0, 7, $mesNombre . ' ' . $pago['anio'], 1, 1, 'L', 0, '', 0);
        }

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Estado del Pago:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $pago['estado_detalle'] ?: 'N/A', 1, 1, 'L', 0, '', 0);

        $pdf->Ln(5);

        // SECCIÓN: INFORMACIÓN DEL PROPIETARIO
        $pdf->SetFillColor($azulMedio[0], $azulMedio[1], $azulMedio[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 8, 'INFORMACION DEL PROPIETARIO', 1, 1, 'C', 1, '', 0);

        $pdf->SetFillColor($azulClaro[0], $azulClaro[1], $azulClaro[2]);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 10);

        $propietarioCompleto = $pago['nombre_propietario'] . ' ' . $pago['apellido_propietario'];
        $cedulaCompleta = 'V-' . $pago['cedula_propietario'];

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Propietario:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $propietarioCompleto, 1, 1, 'L', 0, '', 0);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Cedula:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $cedulaCompleta, 1, 1, 'L', 0, '', 0);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Inmueble:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $inmuebleInfo ?: 'N/A', 1, 1, 'L', 0, '', 0);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(50, 7, 'Telefono:', 1, 0, 'L', 1, '', 0);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 7, $pago['telefono_propietario'] ?: 'N/A', 1, 1, 'L', 0, '', 0);

        $pdf->Ln(5);

        // TABLA DE DETALLES DEL PAGO
        $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 9);

        $pdf->Cell(35, 8, 'CONCEPTO', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(45, 8, 'METODO', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(40, 8, 'BANCO', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(30, 8, 'REFERENCIA', 1, 0, 'C', 1, '', 0);
        $pdf->Cell(30, 8, 'MONTO', 1, 1, 'C', 1, '', 0);

        $pdf->SetFillColor(255, 255, 255);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 8);

        // Concepto según tipo de pago
        $conceptoPago = $esPagoDeuda ? 'Pago Deuda' : 'Pago de Mensualidades';
        $pdf->Cell(35, 8, $conceptoPago, 1, 0, 'L', 0, '', 0);
        $pdf->Cell(45, 8, $pago['metodo_pago'] ?: 'N/A', 1, 0, 'C', 0, '', 0);
        $pdf->Cell(40, 8, $pago['banco_emisor'] ?: 'N/A', 1, 0, 'C', 0, '', 0);
        $pdf->Cell(30, 8, $pago['nro_referencia'] ?: 'N/A', 1, 0, 'C', 0, '', 0);
        $pdf->SetFont('helvetica', 'B', 8);

        // Determinar si es efectivo divisa para mostrar en USD
        $esEfectivoDivisa = stripos($pago['metodo_pago'], 'efectivo divisa') !== false;

        if ($esEfectivoDivisa) {
            $montoUsd = isset($pago['monto_usd']) && is_numeric($pago['monto_usd']) ? (float) $pago['monto_usd'] : 0;
            $pdf->Cell(30, 8, '$' . number_format($montoUsd, 2, ',', '.'), 1, 1, 'R', 0, '', 0);
        } else {
            $montoBs = isset($pago['monto_Bs']) && is_numeric($pago['monto_Bs']) ? (float) $pago['monto_Bs'] : 0;
            $pdf->Cell(30, 8, 'Bs ' . number_format($montoBs, 2, ',', '.'), 1, 1, 'R', 0, '', 0);
        }

        $pdf->Ln(5);

        // TOTAL PAGADO
        $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 13);

        // Determinar moneda para el total
        if ($esEfectivoDivisa) {
            $totalPagado = '$' . number_format($montoUsd, 2, ',', '.');
            $pdf->Cell(0, 10, 'TOTAL PAGADO: ' . $totalPagado . ' (Dolares)', 1, 1, 'C', 1, '', 0);
        } else {
            $totalPagado = 'Bs ' . number_format($montoBs, 2, ',', '.');
            $pdf->Cell(0, 10, 'TOTAL PAGADO: ' . $totalPagado . ' (Bolivares)', 1, 1, 'C', 1, '', 0);
        }

        // ADJUNTAR COMPROBANTE - Si existe
        if (!empty($pago['comprobante'])) {
            $comprobanteFull = dirname(__DIR__) . '/' . str_replace('../', '', $pago['comprobante']);
            
            if (file_exists($comprobanteFull)) {
                $pdf->AddPage();
                
                $pdf->SetFillColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
                $pdf->SetTextColor(255, 255, 255);
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 10, 'COMPROBANTE ADJUNTO (ORIGINAL)', 1, 1, 'C', 1, '', 0);
                
                $pdf->Ln(5);
                
                // Intentar insertar la imagen del comprobante
                try {
                    // Obtener dimensiones para ajustar la imagen
                    $imgData = getimagesize($comprobanteFull);
                    if ($imgData) {
                        $w = $imgData[0];
                        $h = $imgData[1];
                        $ratio = $w / $h;
                        
                        // Ajustar a un ancho máximo de 180mm o alto máximo de 240mm
                        if ($ratio > (180/240)) {
                            $imgW = 180;
                            $imgH = 0; // Auto proporcional
                        } else {
                            $imgW = 0; // Auto proporcional
                            $imgH = 240;
                        }
                        
                        $pdf->Image($comprobanteFull, 15, $pdf->GetY(), $imgW, $imgH, '', '', '', true, 300, 'C');
                    }
                } catch (Exception $imgEx) {
                    error_log("Error al insertar imagen en PDF: " . $imgEx->getMessage());
                    $pdf->SetTextColor(255, 0, 0);
                    $pdf->Cell(0, 10, 'Error al cargar la imagen del comprobante', 0, 1, 'C');
                }
            }
        }

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
        $pdf->Cell(0, 5, 'Este documento es valido como comprobante de pago oficial.', 0, 1, 'C', 0, '', 0);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->SetTextColor($azulOscuro[0], $azulOscuro[1], $azulOscuro[2]);
        $pdf->Cell(0, 5, 'Gerencia Express - Sistema de Gestion de Pagos', 0, 1, 'C', 0, '', 0);

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
        $fileIdentifier = $paymentDetailId ? 'Recibo_' . $paymentDetailId : 'Comprobante_Pago_' . $paymentId;
        $fileName = $fileIdentifier . '_' . $mesNombre . '_' . $pago['anio'] . '.pdf';

        error_log("Generando PDF de pago con nombre: " . $fileName);

        // Configurar headers manualmente antes de Output
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');

        // Output del PDF
        echo $pdf->Output($fileName, 'S');

        error_log("=== FIN generate_payment_receipt.php (exitoso) ===");
        exit;

    } catch (Exception $e) {
        error_log("Error generando recibo PDF: " . $e->getMessage());
        return false;
    }
}

// Procesar solicitud
try {
    // Soportar ambos parámetros: payment_id (legacy) y payment_detail_id (nuevo)
    $paymentId = $_GET['payment_id'] ?? null;
    $paymentDetailId = $_GET['payment_detail_id'] ?? null;

    if (!$paymentId && !$paymentDetailId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Se requiere payment_id o payment_detail_id']);
        exit;
    }

    // Verificar que el usuario tenga acceso a este pago
    if ($paymentDetailId) {
        // Verificación para recibo individual (nuevo)
        $stmt = $pdo->prepare("
            SELECT pd.pago_detalle_id 
            FROM pago_detalles pd
            INNER JOIN pagos pag ON pd.pago_id = pag.pago_id
            INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
            INNER JOIN usuarios u ON u.user_id = ?
            LEFT JOIN roles r ON u.rol_id = r.rol_id
            WHERE pd.pago_detalle_id = ? 
            AND (prop.user_id = u.user_id OR r.nombre = 'superadmin')
        ");
        $stmt->execute([$_SESSION['user_id'], $paymentDetailId]);
        $userPayment = $stmt->fetch(PDO::FETCH_ASSOC);

    } else {
        // Verificación para recibo por período (legacy)
        $stmt = $pdo->prepare("
            SELECT pag.pago_id 
            FROM pagos pag
            INNER JOIN propietarios prop ON pag.propietario_id = prop.propietario_id
            INNER JOIN usuarios u ON u.user_id = ?
            LEFT JOIN roles r ON u.rol_id = r.rol_id
            WHERE pag.pago_id = ? 
            AND (prop.user_id = u.user_id OR r.nombre = 'superadmin')
        ");
        $stmt->execute([$_SESSION['user_id'], $paymentId]);
        $userPayment = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$userPayment) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'No tienes acceso a este pago']);
        exit;
    }

    // Generar y enviar PDF directamente
    $result = generateReceipt($paymentId, $paymentDetailId);

    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error generando el comprobante']);
        exit;
    }

    // Si llegamos aquí, el PDF se envió correctamente
    exit;

} catch (Exception $e) {
    error_log("Error en generate_payment_receipt.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
?>