<?php
// Cargar FPDF directamente
require_once dirname(__DIR__) . '/vendor/fpdf.php';

// Clase base personalizada para PDFs de ARCORUI
class ArcoruiReceiptPDF extends FPDF
{
    private $logoPath;

    function __construct($orientation = 'P', $unit = 'mm', $size = 'A4')
    {
        parent::__construct($orientation, $unit, $size);
        $this->logoPath = $this->findLogo();
        $this->SetAutoPageBreak(true, 20);
        $this->SetMargins(15, 15, 15);
    }

    private function findLogo()
    {
        $possiblePaths = [
            __DIR__ . '/../assets/images/Logo jesús.png',
            __DIR__ . '/../assets/images/logo_gerencia_condominio_white.png',
            __DIR__ . '/../../assets/images/Logo jesús.png',
            __DIR__ . '/../../assets/images/logo_GerenciaExpress.png',
            __DIR__ . '/../../assets/img/logo.jpg',
            __DIR__ . '/../../assets/images/logo.png',
            __DIR__ . '/../../assets/images/logo.jpg',
            __DIR__ . '/../../assets/images/arcorui.png'
        ];

        foreach ($possiblePaths as $path) {
            if (file_exists($path) && $this->isValidImage($path)) {
                return $path;
            }
        }
        return null;
    }

    private function isValidImage($path)
    {
        $imageInfo = @getimagesize($path);
        return $imageInfo !== false;
    }

    private function createLogoPlaceholder($x, $y, $width, $height)
    {
        $this->SetFillColor(255, 255, 255);
        $this->Rect($x, $y, $width, $height, 'F');

        $this->SetDrawColor(0, 0, 0);
        $this->SetLineWidth(0.5);
        $this->Rect($x, $y, $width, $height, 'D');

        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', 'B', 10);

        $textY = $y + ($height / 2) - 3;
        $this->SetXY($x, $textY);
        $this->Cell($width, 5, 'GERENCIA EXPRESS', 0, 0, 'C');
    }

    function Header()
    {
        // Logo
        if ($this->logoPath && file_exists($this->logoPath)) {
            try {
                // Logo centrado
                $this->Image($this->logoPath, 62.5, 5, 85, 25, 'PNG');
            } catch (Exception $e) {
                // Si falla, continua sin imagen
            }
        } else {
            // Título principal fallback
            $this->SetTextColor(26, 58, 74);
            $this->SetFont('Arial', 'B', 16);
            $this->Cell(0, 8, 'GERENCIA EXPRESS', 0, 1, 'C');
        }

        $this->SetY(32);
        $this->SetTextColor(26, 58, 74);
        $this->SetFont('Arial', '', 10);
        $this->Cell(0, 5, 'Sistema de Gestion de Pagos', 0, 1, 'C');
        
        $this->SetFont('Arial', 'B', 12);
        $this->Cell(0, 6, 'Comprobante de Pago', 0, 1, 'C');
        
        // Línea separadora
        $this->SetDrawColor(0, 0, 0);
        $this->SetLineWidth(0.5);
        $this->Line(15, $this->GetY() + 2, $this->GetPageWidth() - 15, $this->GetY() + 2);
        
        $this->Ln(8);
    }

    function Footer()
    {
        $this->SetY(-25);
        
        // Línea separadora del footer
        $this->SetDrawColor(0, 0, 0);
        $this->SetLineWidth(0.5);
        $this->Line(15, $this->GetY(), $this->GetPageWidth() - 15, $this->GetY());
        
        $this->Ln(3);
        
        // Texto del footer
        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', '', 8);
        $this->Cell(0, 4, 'Este documento es válido como comprobante de pago oficial.', 0, 1, 'C');
        
        $this->SetFont('Arial', 'B', 9);
        $this->Cell(0, 4, 'Gerencia Express - Sistema de Gestión de Pagos', 0, 1, 'C');
        
        $this->SetFont('Arial', '', 8);
        $this->Cell(0, 4, 'Comprobante generado el: ' . date('d/m/Y H:i:s'), 0, 1, 'C');
    }

    function CreateInfoSection($title, $data)
    {
        // Título de la sección
        $this->SetFillColor(26, 58, 74);
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Arial', 'B', 10);
        $this->Cell(0, 6, $title, 1, 1, 'C', true);
        
        // Contenido de la sección
        $this->SetFillColor(255, 255, 255);
        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', '', 9);
        $this->SetDrawColor(0, 0, 0);
        
        foreach ($data as $label => $value) {
            $this->Cell(40, 5, $label . ':', 1, 0, 'L', true);
            $this->Cell(0, 5, $value, 1, 1, 'L', true);
        }
        $this->Ln(3);
    }

    function CreatePaymentTable($headers, $data)
    {
        // Crear encabezado de la tabla
        $this->SetFillColor(240, 240, 240);
        $this->SetTextColor(0, 0, 0);
        $this->SetDrawColor(0, 0, 0);
        $this->SetFont('Arial', 'B', 9);
        
        $widths = [30, 60, 25, 25, 25, 20]; // Anchos de las columnas
        
        for ($i = 0; $i < count($headers); $i++) {
            $this->SetFillColor(26, 58, 74);
            $this->SetTextColor(255, 255, 255);
            $this->Cell($widths[$i], 6, $headers[$i], 1, 0, 'C', true);
        }
        $this->Ln(6);
        
        // Crear fila de datos
        $this->SetFillColor(255, 255, 255);
        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', '', 8);
        
        for ($i = 0; $i < count($data); $i++) {
            $align = ($i == 5) ? 'R' : 'L'; // Alinear monto a la derecha
            $this->Cell($widths[$i], 6, $data[$i], 1, 0, $align, true);
        }
        $this->Ln(6);
    }

    function CreateTotalSection($total)
    {
        $this->SetFillColor(26, 58, 74);
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Arial', 'B', 10);
        $this->SetDrawColor(0, 0, 0);
        
        $this->Cell(0, 6, 'TOTAL PAGADO: ' . $total . ' (Bolívares)', 1, 1, 'C', true);
        $this->Ln(5);
    }

    // Función para manejar texto de forma segura
    private function safeText($text)
    {
        if (empty($text)) return '';
        
        // Remover caracteres problemáticos
        $text = str_replace(['á', 'é', 'í', 'ó', 'ú'], ['a', 'e', 'i', 'o', 'u'], $text);
        $text = str_replace(['Á', 'É', 'Í', 'Ó', 'Ú'], ['A', 'E', 'I', 'O', 'U'], $text);
        $text = str_replace(['ñ', 'Ñ'], ['n', 'N'], $text);

        // Limpiar caracteres especiales
        $text = preg_replace('/[^\x20-\x7E]/', '', $text);

        return $text;
    }
}
?>
