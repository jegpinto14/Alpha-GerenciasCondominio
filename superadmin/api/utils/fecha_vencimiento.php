<?php
/**
 * Utilidad para calcular fechas de vencimiento ajustadas por periodo
 */

/**
 * Calcula la fecha de vencimiento ajustada para un periodo específico
 * 
 * @param string $fechaVencimientoOriginal Fecha de vencimiento original de la obligación (formato Y-m-d)
 * @param string $fechaPeriodo Fecha del periodo (formato Y-m-d, primer día del mes)
 * @return string Fecha de vencimiento ajustada (formato Y-m-d)
 */
function calcularFechaVencimientoAjustada($fechaVencimientoOriginal, $fechaPeriodo) {
    $fechaVencOriginal = new DateTime($fechaVencimientoOriginal);
    $periodo = new DateTime($fechaPeriodo);
    
    // Obtener el día de vencimiento original
    $diaVencimiento = (int)$fechaVencOriginal->format('d');
    
    // Obtener año y mes del periodo
    $anioPeriodo = (int)$periodo->format('Y');
    $mesPeriodo = (int)$periodo->format('m');
    
    // Calcular el último día del mes del periodo
    $ultimoDiaMes = (int)date('t', mktime(0, 0, 0, $mesPeriodo, 1, $anioPeriodo));
    
    // Si el día de vencimiento es mayor que los días disponibles en el mes,
    // usar el último día del mes
    $diaAjustado = min($diaVencimiento, $ultimoDiaMes);
    
    // Crear la fecha ajustada
    $fechaAjustada = sprintf('%04d-%02d-%02d', $anioPeriodo, $mesPeriodo, $diaAjustado);
    
    return $fechaAjustada;
}

/**
 * Ejemplo de uso:
 * 
 * Obligación creada con vencimiento el 31 de enero (2025-01-31)
 * 
 * - Periodo febrero 2025: calcularFechaVencimientoAjustada('2025-01-31', '2025-02-01') 
 *   Resultado: 2025-02-28 (o 2025-02-29 si es bisiesto)
 * 
 * - Periodo marzo 2025: calcularFechaVencimientoAjustada('2025-01-31', '2025-03-01')
 *   Resultado: 2025-03-31
 * 
 * - Periodo abril 2025: calcularFechaVencimientoAjustada('2025-01-31', '2025-04-01')
 *   Resultado: 2025-04-30
 */
