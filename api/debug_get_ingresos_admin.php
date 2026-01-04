<?php
/**
 * Script de depuración para get_ingresos_admin.php
 * Permite ejecutar la API con distintos parámetros y visualizar la respuesta.
 *
 * Uso: debug_get_ingresos_admin.php?categoria_id=1
 * Parámetros opcionales:
 *   - categoria_id (int)  => Categoría a consultar (1: artículos, 2: documentos, 3: extraordinarios)
 *   - raw=1               => Muestra la respuesta JSON sin procesar
 */

$startTime = microtime(true);

// Capturar parámetros del request original
$categoriaId = isset($_GET['categoria_id']) ? (int) $_GET['categoria_id'] : null;
$showRaw      = isset($_GET['raw']) && (int) $_GET['raw'] === 1;

if (empty($categoriaId)) {
    $categoriaId = 1; // Valor por defecto
    $categoriaSource = 'default';
} else {
    $categoriaSource = 'query';
}

// Guardar copia de los parámetros originales
$originalGet = $_GET;

// Preparar entorno para ejecutar la API original
$_GET['categoria_id'] = $categoriaId;

// Ejecutar la API con buffer de salida para capturar la respuesta JSON
ob_start();
include __DIR__ . '/get_ingresos_admin.php';
$responseBody = ob_get_clean();

// Restaurar parámetros originales por si el script continúa
$_GET = $originalGet;

// Tiempo total
define('DEBUG_EXECUTION_TIME', round((microtime(true) - $startTime) * 1000, 2));

// Intentar decodificar la respuesta JSON
$decoded = json_decode($responseBody, true);
$isJson  = json_last_error() === JSON_ERROR_NONE;

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Debug get_ingresos_admin.php</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Fira Code', monospace;
            margin: 0;
            padding: 30px;
            background: #0f172a;
            color: #e2e8f0;
        }
        h1 {
            margin-top: 0;
            color: #38bdf8;
        }
        .card {
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: 0 12px 40px rgba(15, 23, 42, 0.45);
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }
        .badge-success { background: rgba(34,197,94,0.2); color: #4ade80; }
        .badge-danger { background: rgba(248,113,113,0.2); color: #fca5a5; }
        .badge-info { background: rgba(56,189,248,0.2); color: #38bdf8; }
        pre {
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 10px;
            padding: 16px;
            overflow-x: auto;
            font-size: 14px;
            line-height: 1.5;
            color: #e2e8f0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 14px;
        }
        th, td {
            border: 1px solid rgba(148, 163, 184, 0.2);
            padding: 10px;
            text-align: left;
        }
        th {
            background: rgba(30, 41, 59, 0.8);
            color: #38bdf8;
        }
        tr:nth-child(even) {
            background: rgba(30, 41, 59, 0.4);
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
        }
        .summary-item {
            background: rgba(30, 41, 59, 0.6);
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .summary-item span {
            display: block;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #94a3b8;
            margin-bottom: 6px;
        }
        a {
            color: #38bdf8;
        }
    </style>
</head>
<body>
    <h1>Debug &mdash; get_ingresos_admin.php</h1>

    <div class="card">
        <h2>Resumen de ejecución</h2>
        <div class="summary">
            <div class="summary-item">
                <span>Categoría consultada</span>
                <?= htmlspecialchars($categoriaId) ?>
                <small style="display:block;color:#94a3b8;margin-top:4px;">Fuente: <?= htmlspecialchars($categoriaSource) ?></small>
            </div>
            <div class="summary-item">
                <span>Duración</span>
                <?= DEBUG_EXECUTION_TIME ?> ms
            </div>
            <div class="summary-item">
                <span>Respuesta JSON válida</span>
                <?php if ($isJson): ?>
                    <span class="badge badge-success">Sí</span>
                <?php else: ?>
                    <span class="badge badge-danger">No</span>
                <?php endif; ?>
            </div>
            <?php if ($isJson && isset($decoded['success'])): ?>
            <div class="summary-item">
                <span>Estado del API</span>
                <?php if ($decoded['success']): ?>
                    <span class="badge badge-success">success</span>
                <?php else: ?>
                    <span class="badge badge-danger">error</span>
                <?php endif; ?>
            </div>
            <?php endif; ?>
            <?php if ($isJson && isset($decoded['total'])): ?>
            <div class="summary-item">
                <span>Total de registros</span>
                <?= (int) $decoded['total'] ?>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <?php if ($showRaw): ?>
        <div class="card">
            <h2>Respuesta JSON cruda</h2>
            <pre><?= htmlspecialchars($responseBody) ?></pre>
        </div>
    <?php endif; ?>

    <?php if ($isJson): ?>
        <div class="card">
            <h2>Respuesta decodificada</h2>
            <pre><?= htmlspecialchars(json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?></pre>
        </div>

        <?php if (!empty($decoded['ingresos']) && is_array($decoded['ingresos'])): ?>
            <div class="card">
                <h2>Primer ingreso (vista rápida)</h2>
                <?php $first = $decoded['ingresos'][0]; ?>
                <table>
                    <tbody>
                    <?php foreach ($first as $key => $value): ?>
                        <tr>
                            <th><?= htmlspecialchars($key) ?></th>
                            <td><?= htmlspecialchars(is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    <?php else: ?>
        <div class="card">
            <h2>Respuesta (no es JSON válido)</h2>
            <pre><?= htmlspecialchars($responseBody) ?></pre>
        </div>
    <?php endif; ?>

    <div class="card">
        <h2>Cómo usar este debugger</h2>
        <ul>
            <li><code>?categoria_id=1</code> &mdash; Cargar ingresos de la categoría 1.</li>
            <li><code>?categoria_id=3&amp;raw=1</code> &mdash; Mostrar respuesta cruda de la categoría 3.</li>
            <li>Si no se pasa <code>categoria_id</code>, se usará el valor <strong>1</strong> por defecto.</li>
        </ul>
        <p>Este script ejecuta internamente <code>get_ingresos_admin.php</code> y captura la respuesta para facilitar la depuración.</p>
        <p>Para pruebas más profundas, modifica el archivo original y vuelve a cargar este debugger para ver los cambios.</p>
    </div>
</body>
</html>
