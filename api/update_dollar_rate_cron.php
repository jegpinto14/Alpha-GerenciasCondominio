<?php
/**
 * Script para actualizar la tasa del dólar automáticamente
 * Este archivo debe ser ejecutado por un cron job todos los días a las 6:00 AM
 * 
 * Comando para cron job:
 * 0 6 * * * /usr/bin/php /ruta/completa/a/Arcorui/api/update_dollar_rate_cron.php
 */

// Si se ejecuta desde navegador, configurar salida como texto plano
if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

// Configurar zona horaria
date_default_timezone_set('America/Caracas');

// Incluir archivo de conexión a la base de datos
// Usar ruta absoluta para que funcione desde cualquier ubicación
require_once __DIR__ . '/../includes/database.php';

// Función para obtener la tasa del dólar del BCV
function getDollarRateFromBCV()
{
    try {
        // URL de la API del BCV (puede cambiar, esta es una aproximación)
        $bcvUrl = 'https://www.bcv.org.ve/';

        // Intentar con cURL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $bcvUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $html) {
            // Buscar el patrón de la tasa del dólar en el HTML
            // Patrón 1: Buscar en div con id="dolar" y el strong
            if (preg_match('/<div id="dolar".*?<strong>\s*([0-9,\.]+)\s*<\/strong>/is', $html, $matches)) {
                $rate = str_replace(',', '.', $matches[1]);
                return (float) $rate;
            }

            // Patrón 2: Buscar después de span con USD y capturar el strong
            if (preg_match('/<span>\s*USD\s*<\/span>.*?<strong>\s*([0-9,\.]+)\s*<\/strong>/is', $html, $matches)) {
                $rate = str_replace(',', '.', $matches[1]);
                return (float) $rate;
            }

            // Patrón 3: Buscar por clase centrado con strong
            if (preg_match('/<div[^>]*class="[^"]*centrado[^"]*"[^>]*>\s*<strong>\s*([0-9,\.]+)\s*<\/strong>/is', $html, $matches)) {
                $rate = str_replace(',', '.', $matches[1]);
                return (float) $rate;
            }
        }else {
            echo "Error obteniendo tasa del BCV: " . $httpCode . " - " . $html . "\n";
            return null;
        }

    } catch (Exception $e) {
        echo "Error obteniendo tasa del BCV: " . $e->getMessage() . "\n";
        return null;
    }
}

// Función para guardar la tasa en la base de datos
function saveDollarRateToDatabase($rate)
{
    try {
        global $pdo;
        
        if (!$pdo) {
            throw new Exception("Error de conexión a la base de datos");
        }
        
        // Verificar si ya existe una tasa para hoy
        $today = date('Y-m-d');
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM tasas WHERE DATE(fecha) = ?");
        $stmt->execute([$today]);
        $exists = $stmt->fetchColumn();
        
        if ($exists > 0) {
            // Actualizar la tasa existente de hoy
            echo "✅ Tasa del dólar ya existe para hoy: {$rate} Bs/USD - " . date('Y-m-d H:i:s') . "\n";
            $result = "la tasa ya existe";
            $action = "verificada";
        } else {
            // Insertar nueva tasa
            $stmt = $pdo->prepare("INSERT INTO tasas (tasa, fecha) VALUES (?, NOW())");
            $result = $stmt->execute([$rate]);
            $action = "insertada";
        }
        
        if ($result) {
            echo "✅ Tasa del dólar {$action} exitosamente: {$rate} Bs/USD - " . date('Y-m-d H:i:s') . "\n";
            return true;
        } else {
            throw new Exception("Error al {$action} tasa en la base de datos");
        }
        
    } catch (Exception $e) {
        echo "❌ Error guardando tasa en BD: " . $e->getMessage() . "\n";
        return false;
    }
}

// Función para obtener la tasa actual de la base de datos
function getCurrentDollarRateFromDatabase()
{
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT tasa, fecha FROM tasas ORDER BY fecha DESC LIMIT 1");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            return [
                'rate' => $result['tasa'],
                'date' => $result['fecha'],
                'source' => 'Base de Datos'
            ];
        }
        
        return null;
        
    } catch (Exception $e) {
        echo "❌ Error obteniendo tasa de BD: " . $e->getMessage() . "\n";
        return null;
    }
}

// Función principal para actualización automática
function updateDollarRate()
{
    $startTime = microtime(true);
    $logPrefix = "[" . date('Y-m-d H:i:s') . "] ";
    
    echo $logPrefix . "🚀 Iniciando actualización automática de tasa del dólar...\n";
    
    // Obtener la tasa del BCV (esta es la función principal del cron) nos verificamos que no sea null
    do {
        $dollarRate = getDollarRateFromBCV();
    } while ($dollarRate === null);
    $source = 'BCV';
    $saved = false;
    
    // Guardar la tasa en la base de datos (esto es lo principal del cron)
    if ($dollarRate > 1) {
        $saved = saveDollarRateToDatabase($dollarRate);
        
        if ($saved) {
            echo $logPrefix . "✅ Tasa guardada exitosamente en BD para uso diario\n";
        } else {
            echo $logPrefix . "❌ Error al guardar tasa en BD\n";
        }
    }
    
    $endTime = microtime(true);
    $executionTime = round(($endTime - $startTime) * 1000, 2);
    
    // Log del resultado
    $status = $saved ? "✅ ÉXITO" : "❌ ERROR";
    echo $logPrefix . "{$status} - Fuente: {$source}, Tasa: {$dollarRate} Bs/USD, Guardado: " . ($saved ? 'SÍ' : 'NO') . ", Tiempo: {$executionTime}ms\n";
    
    return [
        'success' => $saved,
        'rate' => $dollarRate,
        'source' => $source,
        'execution_time' => $executionTime
    ];
}

// Ejecutar la actualización
$result = updateDollarRate();

// Si se ejecuta desde línea de comandos, mostrar resultado
echo "\n--- RESUMEN CRON ---\n";
echo "Actualización de tasa del dólar completada:\n";
echo "Estado: " . ($result['success'] ? 'ÉXITO' : 'ERROR') . "\n";
echo "Tasa: {$result['rate']} Bs/USD\n";
echo "Fuente: {$result['source']}\n";
echo "Tiempo de ejecución: {$result['execution_time']}ms\n";
echo "--------------------\n";
?>
