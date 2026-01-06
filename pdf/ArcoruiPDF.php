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
        $logo_path = dirname(__DIR__) . '/assets/images/logo_gerencia_condominio.png';
        
        // Verificar que la imagen existe
        if (!file_exists($logo_path)) {
            // Si no existe la imagen, dibujar texto simple como fallback
            $this->SetFillColor(26, 58, 74); // Nuevo color de fondo del sistema
            $this->SetTextColor(255, 255, 255);
            $this->SetFont('Arial', 'B', 16 * $scale);
            $text_x = $x - 25;
            $text_y = $y + 5;
            $this->SetXY($text_x, $text_y);
            // Dibujar el texto con el fondo azul
            $this->Cell(50, 8, 'Gerencia Express', 0, 0, 'C', true); // 'true' para rellenar el fondo
            return;
        }
        
        // Dimensiones del logo (en mm) - Ajustado para ser más pequeño
        $logo_width = 50 * $scale;
        $logo_height = 30 * $scale;
        
        // Calcular posiciones centradas
        $logo_x = $x - ($logo_width / 2);
        $logo_y = $y;
        
        // Insertar la imagen del logo Blanco (PNG Transparente)
        $this->Image($logo_path, $logo_x, $logo_y, $logo_width, $logo_height, 'PNG');
    }
    
    
}
