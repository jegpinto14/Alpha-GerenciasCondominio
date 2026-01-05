<?php
// Verificar si FPDF está disponible
$fpdfPaths = [
    __DIR__ . '/../../vendor/fpdf.php',
];

$fpdfLoaded = false;
foreach ($fpdfPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $fpdfLoaded = true;
        break;
    }
}

if (!$fpdfLoaded) {
    throw new Exception("FPDF no encontrado. Instale FPDF en una de estas rutas: " . implode(', ', $fpdfPaths));
}

// Clase base personalizada para PDFs de Gerencia Express
class MotoManiaPDF extends FPDF
{
    private $logoPath;
    private $title;
    private $subtitle;

    function __construct($orientation = 'P', $unit = 'mm', $size = 'A4')
    {
        parent::__construct($orientation, $unit, $size);
        $this->logoPath = $this->findLogo();
        $this->SetAutoPageBreak(true, 20);
        $this->SetMargins(10, 10, 10);
    }

    private function findLogo()
    {
        $possiblePaths = [
            __DIR__ . '/../assets/images/logo_gerencia_condominio.png',
            __DIR__ . '/../assets/images/Logo jesús.png',
            __DIR__ . '/../assets/images/logo_gerencia_condominio_white.png',
            __DIR__ . '/../assets/images/logo_GerenciaExpress.png',
            __DIR__ . '/../assets/img/logo.png',
            __DIR__ . '/../assets/img/logo.jpg',
            __DIR__ . '/../assets/images/logo.png'
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

        $this->SetDrawColor(26, 58, 74);
        $this->SetLineWidth(0.5);
        $this->Rect($x, $y, $width, $height, 'D');

        $this->SetTextColor(26, 58, 74);
        $this->SetFont('Arial', 'B', 8);

        $textY = $y + ($height / 2) - 2;
        $this->SetXY($x, $textY);
        $this->Cell($width, 4, 'GERENCIA', 0, 0, 'C');

        $this->SetXY($x, $textY + 3);
        $this->Cell($width, 4, 'EXPRESS', 0, 0, 'C');
    }

    function SetDocumentTitle($title, $subtitle = '')
    {
        $this->title = $title;
        $this->subtitle = $subtitle;
    }

    function Header()
    {
        $this->SetFillColor(26, 58, 74);
        $this->Rect(0, 0, $this->GetPageWidth(), 20, 'F');

        if ($this->logoPath && file_exists($this->logoPath)) {
            try {
                // Logo Blanco (PNG Transparente)
                $this->Image($this->logoPath, 62.5, 5, 85, 25, 'PNG');
            } catch (Exception $e) {
                $this->createLogoPlaceholder(62.5, 5, 85, 25);
            }
        } else {
            $this->createLogoPlaceholder(62.5, 5, 85, 25);
        }

        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Arial', 'B', 14);
        $this->SetXY(25, 4);
        $this->Cell(0, 5, $this->safeText($this->title), 0, 1);

        if ($this->subtitle) {
            $this->SetFont('Arial', '', 9);
            $this->SetXY(25, 10);
            $this->Cell(0, 4, $this->safeText($this->subtitle), 0, 1);
        }

        $this->SetFont('Arial', '', 7);
        $this->SetXY(25, 15);
        $this->Cell(0, 3, 'Gerencia Express - Sistema de Gestion', 0, 1);

        $this->SetXY(-50, 4);
        $this->Cell(40, 3, 'Fecha: ' . date('d/m/Y'), 0, 1, 'R');
        $this->SetXY(-50, 8);
        $this->Cell(40, 3, 'Hora: ' . date('H:i:s'), 0, 1, 'R');

        $this->SetDrawColor(26, 58, 74);
        $this->SetLineWidth(0.2);
        $this->Line(8, 22, $this->GetPageWidth() - 8, 22);

        $this->Ln(10);
    }

    function Footer()
    {
        $this->SetY(-12);
        $this->SetDrawColor(26, 58, 74);
        $this->SetLineWidth(0.2);
        $this->Line(10, $this->GetY(), $this->GetPageWidth() - 10, $this->GetY());

        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', '', 7);
        $this->Cell(0, 8, 'Gerencia Express - Pagina ' . $this->PageNo() . ' de {nb}', 0, 0, 'C');
    }

    function CreateTableHeader($headers, $widths)
    {
        $this->SetFillColor(26, 58, 74);
        $this->SetTextColor(255, 255, 255);
        $this->SetDrawColor(26, 58, 74);
        $this->SetLineWidth(0.3);
        $this->SetFont('Arial', 'B', 8);

        $headerHeight = 7;

        for ($i = 0; $i < count($headers); $i++) {
            $text = $this->safeText($headers[$i]);
            if ($this->GetStringWidth($text) > ($widths[$i] - 1)) {
                while ($this->GetStringWidth($text) > ($widths[$i] - 1) && strlen($text) > 0) {
                    $text = substr($text, 0, -1);
                }
            }
            $this->Cell($widths[$i], $headerHeight, $text, 1, 0, 'C', true);
        }
        $this->Ln($headerHeight);
    }

    function CreateTableRow($data, $widths, $isEven = false)
    {
        $rowHeight = 5;

        if ($isEven) {
            $this->SetFillColor(240, 244, 248);
        } else {
            $this->SetFillColor(255, 255, 255);
        }

        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', '', 7);
        $this->SetDrawColor(200, 200, 200);

        for ($i = 0; $i < count($data) && $i < count($widths); $i++) {
            $text = isset($data[$i]) ? $this->safeText($data[$i]) : '';

            if ($this->GetStringWidth($text) > ($widths[$i] - 1)) {
                while ($this->GetStringWidth($text . '...') > ($widths[$i] - 1) && strlen($text) > 0) {
                    $text = substr($text, 0, -1);
                }
                if (strlen($text) > 0) {
                    $text .= '...';
                }
            }

            $align = 'L';
            if ($i == 2 || $i == 3 || $i == 4 || $i == 5) {
                $align = 'R';
            }

            $this->Cell($widths[$i], $rowHeight, $text, 1, 0, $align, true);
        }

        $this->Ln($rowHeight);
    }

    function CreateInfoSection($title, $data)
    {
        $this->SetFillColor(240, 244, 248);
        $this->SetTextColor(26, 58, 74);
        $this->SetFont('Arial', 'B', 8);
        $this->Cell(0, 5, $this->safeText($title), 1, 1, 'L', true);

        $this->SetFillColor(255, 255, 255);
        $this->SetTextColor(0, 0, 0);
        $this->SetFont('Arial', '', 7);
        $this->SetDrawColor(200, 200, 200);

        foreach ($data as $label => $value) {
            $this->Cell(30, 4, $this->safeText($label . ':'), 1, 0, 'L', true);
            $this->Cell(0, 4, $this->safeText($value), 1, 1, 'L', true);
        }
        $this->Ln(4);
    }

    function CreateTotalsSection($totals)
    {
        $this->SetFont('Arial', 'B', 9);

        foreach ($totals as $label => $value) {
            $isTotal = (strpos(strtolower($label), 'total') !== false);

            if ($isTotal) {
                $this->SetFillColor(26, 58, 74);
                $this->SetTextColor(255, 255, 255);
                $this->SetFont('Arial', 'B', 10);
            } else {
                $this->SetFillColor(240, 244, 248);
                $this->SetTextColor(0, 0, 0);
                $this->SetFont('Arial', '', 9);
            }
            $this->SetDrawColor(26, 58, 74);

            $this->Cell(130, 6, '', 0, 0);
            $this->Cell(30, 6, $this->safeText($label . ':'), 1, 0, 'R', true);
            $this->Cell(25, 6, $value, 1, 1, 'R', true);
        }
    }

    // Función para manejar texto de forma segura
    private function safeText($text)
    {
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