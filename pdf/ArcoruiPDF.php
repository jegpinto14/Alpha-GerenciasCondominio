<?php
require_once dirname(__DIR__) . '/vendor/fpdf.php';

class ArcoruiPDF extends FPDF {
    
    /**
     * Dibuja el logo de ARCORUI usando la imagen
     * @param float $x Posición X central
     * @param float $y Posición Y superior
     * @param float $scale Escala del logo (1.0 = tamaño normal)
     */
    public function drawArcoruiLogo($x, $y, $scale = 1.0) {
        // Ruta de la imagen del logo
        $logo_path = dirname(__DIR__) . '/assets/images/logo_arcorui.png';
        
        // Verificar que la imagen existe
        if (!file_exists($logo_path)) {
            // Si no existe la imagen, dibujar texto simple como fallback
            $this->SetTextColor(255, 255, 255);
            $this->SetFont('Arial', 'B', 16 * $scale);
            $text_x = $x - 25;
            $text_y = $y + 5;
            $this->SetXY($text_x, $text_y);
            $this->Cell(50, 8, 'ARCORUI', 0, 0, 'C');
            return;
        }
        
        // Dimensiones del logo (en mm) - MUCHO MÁS GRANDE
        $logo_width = 60 * $scale;
        $logo_height = 40 * $scale;
        
        // Calcular posiciones centradas
        $logo_x = $x - ($logo_width / 2);
        $logo_y = $y;
        
        // Insertar la imagen del logo
        $this->Image($logo_path, $logo_x, $logo_y, $logo_width, $logo_height);
    }
    
    
}
?>
