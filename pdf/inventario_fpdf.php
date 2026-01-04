<?php
// Configuración estricta para PDF
ini_set('display_errors', 0);
error_reporting(0);

// Limpiar completamente cualquier output
if (ob_get_level()) {
    ob_end_clean();
}

// Función para limpiar output
function limpiarOutput()
{
    while (ob_get_level()) {
        ob_end_clean();
    }
}

try {
    // Incluir archivos necesarios
    require_once __DIR__ . '/pdf_base.php';
    require_once __DIR__ . '/../../config/database.php';

    // Obtener parámetros
    $categoria = $_GET['categoria'] ?? '';
    $proveedor = $_GET['proveedor'] ?? '';
    $buscar = $_GET['buscar'] ?? '';
    $stock_bajo = $_GET['stock_bajo'] ?? '';
    $precio_min = $_GET['precio_min'] ?? '';
    $precio_max = $_GET['precio_max'] ?? '';

    // Construir consulta
    $sql = "SELECT p.*, 
                   COALESCE(c.nombre, 'Sin categoría') as categoria_nombre, 
                   COALESCE(pr.nombre, 'Sin proveedor') as proveedor_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id 
            WHERE p.activo = 1";

    $params = [];

    if ($categoria) {
        $sql .= " AND p.categoria_id = ?";
        $params[] = $categoria;
    }

    if ($proveedor) {
        $sql .= " AND p.proveedor_id = ?";
        $params[] = $proveedor;
    }

    if ($buscar) {
        $sql .= " AND (p.codigo LIKE ? OR p.producto LIKE ?)";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
    }

    if ($stock_bajo) {
        $sql .= " AND p.cantidad <= 5";
    }

    if ($precio_min) {
        $sql .= " AND p.precio >= ?";
        $params[] = floatval($precio_min);
    }

    if ($precio_max) {
        $sql .= " AND p.precio <= ?";
        $params[] = floatval($precio_max);
    }

    $sql .= " ORDER BY p.codigo";
    $productos = fetchAll($sql, $params);

    // Limpiar output antes de crear PDF
    limpiarOutput();

    // Crear PDF
    $pdf = new MotoManiaPDF('P', 'mm', 'A4');
    $pdf->AliasNbPages();
    $pdf->SetDocumentTitle('REPORTE DE INVENTARIO', 'Total: ' . count($productos) . ' productos');
    $pdf->AddPage();

    // Información del reporte
    $filtrosTexto = [];
    if ($categoria) {
        $catNombre = fetchOne("SELECT nombre FROM categorias WHERE id = ?", [$categoria]);
        $filtrosTexto[] = "Categoría: " . ($catNombre['nombre'] ?? $categoria);
    }
    if ($proveedor) {
        $provNombre = fetchOne("SELECT nombre FROM proveedores WHERE id = ?", [$proveedor]);
        $filtrosTexto[] = "Proveedor: " . ($provNombre['nombre'] ?? $proveedor);
    }
    if ($buscar)
        $filtrosTexto[] = "Búsqueda: $buscar";
    if ($stock_bajo)
        $filtrosTexto[] = "Solo stock bajo";
    if ($precio_min)
        $filtrosTexto[] = "Precio mín: $" . number_format($precio_min, 2);
    if ($precio_max)
        $filtrosTexto[] = "Precio máx: $" . number_format($precio_max, 2);

    $infoData = [
        'Total Productos' => number_format(count($productos)),
        'Filtros' => empty($filtrosTexto) ? 'Ninguno' : implode(', ', $filtrosTexto),
        'Generado por' => 'Sistema MotoManía'
    ];
    $pdf->CreateInfoSection('INFORMACIÓN DEL REPORTE', $infoData);

    // Estadísticas
    $totalValorStock = 0;
    $totalCantidad = 0;
    $productosConStock = 0;
    $productosSinStock = 0;

    foreach ($productos as $producto) {
        $totalValorStock += $producto['cantidad'] * $producto['costo'];
        $totalCantidad += $producto['cantidad'];
        if ($producto['cantidad'] > 0) {
            $productosConStock++;
        } else {
            $productosSinStock++;
        }
    }

    $estadisticas = [
        'Con Stock' => number_format($productosConStock),
        'Sin Stock' => number_format($productosSinStock),
        'Cant. Total' => number_format($totalCantidad),
        'Valor Total' => '$' . number_format($totalValorStock, 2)
    ];
    $pdf->CreateInfoSection('ESTADÍSTICAS', $estadisticas);

    $pdf->Ln(3);

    // Tabla de productos
    $headers = ['Código', 'Producto', 'Cant.', 'Costo', 'Precio', 'Valor Stock', 'Proveedor'];
    $widths = [22, 85, 10, 13, 13, 22, 25];

    $pdf->CreateTableHeader($headers, $widths);

    $rowCount = 0;
    foreach ($productos as $producto) {
        $valorStock = $producto['cantidad'] * $producto['costo'];

        $stockIndicator = '';
        if ($producto['cantidad'] == 0) {
            $stockIndicator = ' (SIN STOCK)';
        } elseif ($producto['cantidad'] <= 5) {
            $stockIndicator = ' (BAJO)';
        }

        $data = [
            $producto['codigo'],
            $producto['producto'] . $stockIndicator,
            number_format($producto['cantidad'], 0),
            '$' . number_format($producto['costo'], 2),
            '$' . number_format($producto['precio'], 2),
            '$' . number_format($valorStock, 2),
            $producto['proveedor_nombre']
        ];

        $pdf->CreateTableRow($data, $widths, $rowCount % 2 == 0);
        $rowCount++;
    }

    $pdf->Ln(3);

    // Nombre del archivo
    $filename = 'Inventario_' . date('Ymd_His');
    if ($categoria || $proveedor || $buscar || $stock_bajo || $precio_min || $precio_max) {
        $filename .= '_Filtrado';
    }
    $filename .= '.pdf';

    // Limpiar una vez más antes de output
    limpiarOutput();

    // Configurar headers para PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    // Generar PDF
    $pdf->Output('I', $filename, true);
    exit;

} catch (Exception $e) {
    // Limpiar en caso de error
    limpiarOutput();

    // Headers para error
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(500);

    echo '<!DOCTYPE html>
    <html>
    <head>
        <title>Error PDF</title>
        <meta charset="utf-8">
    </head>
    <body>
        <h2>Error al generar PDF</h2>
        <p><strong>Error:</strong> ' . htmlspecialchars($e->getMessage()) . '</p>
        <p><strong>Archivo:</strong> ' . htmlspecialchars($e->getFile()) . '</p>
        <p><strong>Línea:</strong> ' . $e->getLine() . '</p>
        <br>
        <button onclick="window.close()">Cerrar</button>
        <button onclick="window.history.back()">Volver</button>
    </body>
    </html>';

    // Log del error
    error_log("Error PDF Inventario: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    exit;
}
?>