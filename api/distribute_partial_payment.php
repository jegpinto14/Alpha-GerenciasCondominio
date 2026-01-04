<?php
/**
 * Distribuye un pago parcial entre múltiples meses priorizando los meses más cercanos a enero
 * 
 * @param float $montoPagado Monto pagado por el usuario
 * @param array $mesesSeleccionados Array de meses seleccionados
 * @param float $costoPorMes Costo por mes en bolívares
 * @return array Distribución del pago por mes
 */
function distributePartialPayment($montoPagado, $mesesSeleccionados, $costoPorMes) {
    // Ordenar meses por prioridad (más cercanos a enero primero)
    $mesesOrdenados = sortMonthsByPriority($mesesSeleccionados);
    
    $distribucion = [];
    $montoRestante = $montoPagado;
    $totalMeses = count($mesesOrdenados);
    $montoTotalNecesario = $totalMeses * $costoPorMes;
    
    // Log de inicio
    error_log("🔄 Distribuyendo pago parcial: {$montoPagado} Bs entre " . count($mesesOrdenados) . " meses");
    error_log("💰 Costo por mes: {$costoPorMes} Bs");
    error_log("📅 Meses ordenados por prioridad: " . implode(', ', array_map(function($m) { return $m['name']; }, $mesesOrdenados)));
    
    foreach ($mesesOrdenados as $mes) {
        $mesNombre = $mes['name'];
        $mesNumero = $mes['number'];
        
        if ($montoRestante <= 0) {
            // No hay más dinero para distribuir
            $distribucion[] = [
                'mes' => $mesNombre,
                'mes_number' => $mesNumero,
                'monto_asignado' => 0,
                'monto_restante' => $costoPorMes,
                'estado' => 'sin_pago',
                'porcentaje_pagado' => 0
            ];
            continue;
        }
        
        if ($montoRestante >= $costoPorMes) {
            // Se puede pagar el mes completo
            $montoAsignado = $costoPorMes;
            $montoRestante -= $costoPorMes;
            $estado = 'pagado_completo';
            $porcentajePagado = 100;
            
            error_log("✅ {$mesNombre}: Pagado completo ({$montoAsignado} Bs)");
        } else {
            // Pago parcial del mes
            $montoAsignado = $montoRestante;
            $montoRestante = 0;
            $estado = 'pago_parcial';
            $porcentajePagado = ($montoAsignado / $costoPorMes) * 100;
            
            error_log("🟠 {$mesNombre}: Pago parcial ({$montoAsignado} Bs de {$costoPorMes} Bs - " . round($porcentajePagado, 1) . "%)");
        }
        
        $distribucion[] = [
            'mes' => $mesNombre,
            'mes_number' => $mesNumero,
            'monto_asignado' => $montoAsignado,
            'monto_restante' => $costoPorMes - $montoAsignado,
            'estado' => $estado,
            'porcentaje_pagado' => $porcentajePagado
        ];
    }
    
    // Resumen de distribución
    $totalAsignado = array_sum(array_column($distribucion, 'monto_asignado'));
    $totalRestante = array_sum(array_column($distribucion, 'monto_restante'));
    
    error_log("📊 Resumen distribución:");
    error_log("   - Monto pagado: {$montoPagado} Bs");
    error_log("   - Monto asignado: {$totalAsignado} Bs");
    error_log("   - Monto restante: {$totalRestante} Bs");
    error_log("   - Meses pagados completamente: " . count(array_filter($distribucion, function($d) { return $d['estado'] === 'pagado_completo'; })));
    error_log("   - Meses con pago parcial: " . count(array_filter($distribucion, function($d) { return $d['estado'] === 'pago_parcial'; })));
    error_log("   - Meses sin pago: " . count(array_filter($distribucion, function($d) { return $d['estado'] === 'sin_pago'; })));
    
    return [
        'distribucion' => $distribucion,
        'total_pagado' => $totalAsignado,
        'total_restante' => $totalRestante,
        'monto_original' => $montoPagado,
        'meses_pagados_completos' => count(array_filter($distribucion, function($d) { return $d['estado'] === 'pagado_completo'; })),
        'meses_pago_parcial' => count(array_filter($distribucion, function($d) { return $d['estado'] === 'pago_parcial'; })),
        'meses_sin_pago' => count(array_filter($distribucion, function($d) { return $d['estado'] === 'sin_pago'; }))
    ];
}

/**
 * Ordena los meses por prioridad (más cercanos a enero primero)
 * 
 * @param array $meses Array de meses seleccionados
 * @return array Meses ordenados por prioridad
 */
function sortMonthsByPriority($meses) {
    // Mapeo de nombres de meses a números para ordenamiento
    $mesToNumber = [
        'Enero' => 1, 'Febrero' => 2, 'Marzo' => 3, 'Abril' => 4,
        'Mayo' => 5, 'Junio' => 6, 'Julio' => 7, 'Agosto' => 8,
        'Septiembre' => 9, 'Octubre' => 10, 'Noviembre' => 11, 'Diciembre' => 12
    ];
    
    // Crear array con números de mes para ordenamiento
    $mesesConNumeros = [];
    foreach ($meses as $mes) {
        $mesesConNumeros[] = [
            'name' => $mes,
            'number' => $mesToNumber[$mes] ?? 0
        ];
    }
    
    // Ordenar por número de mes (enero = 1, febrero = 2, etc.)
    usort($mesesConNumeros, function($a, $b) {
        return $a['number'] - $b['number'];
    });
    
    error_log("📅 Meses ordenados por prioridad: " . implode(' -> ', array_map(function($m) { return $m['name'] . '(' . $m['number'] . ')'; }, $mesesConNumeros)));
    
    return $mesesConNumeros;
}

/**
 * Ejemplo de uso y prueba de la función
 */
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    // Datos de ejemplo
    $montoPagado = 50; // 50 Bs pagados
    $mesesSeleccionados = ['Marzo', 'Enero', 'Mayo']; // 3 meses seleccionados
    $costoPorMes = 30; // 30 Bs por mes
    
    echo "=== PRUEBA DE DISTRIBUCIÓN DE PAGO PARCIAL ===\n\n";
    echo "Monto pagado: {$montoPagado} Bs\n";
    echo "Meses seleccionados: " . implode(', ', $mesesSeleccionados) . "\n";
    echo "Costo por mes: {$costoPorMes} Bs\n";
    echo "Total necesario: " . (count($mesesSeleccionados) * $costoPorMes) . " Bs\n\n";
    
    $resultado = distributePartialPayment($montoPagado, $mesesSeleccionados, $costoPorMes);
    
    echo "=== RESULTADO DE LA DISTRIBUCIÓN ===\n";
    foreach ($resultado['distribucion'] as $mes) {
        echo "{$mes['mes']}: {$mes['monto_asignado']} Bs asignados, {$mes['monto_restante']} Bs restantes ({$mes['estado']})\n";
    }
    
    echo "\n=== RESUMEN ===\n";
    echo "Total pagado: {$resultado['total_pagado']} Bs\n";
    echo "Total restante: {$resultado['total_restante']} Bs\n";
    echo "Meses pagados completamente: {$resultado['meses_pagados_completos']}\n";
    echo "Meses con pago parcial: {$resultado['meses_pago_parcial']}\n";
    echo "Meses sin pago: {$resultado['meses_sin_pago']}\n";
}
?>

