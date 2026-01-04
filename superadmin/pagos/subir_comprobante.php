<?php
// Archivo: subir_comprobante.php
// Maneja la subida de comprobantes de pago

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Crear directorio si no existe
    $uploadDir = '../uploads/comprobantes/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if (!isset($_FILES['comprobante'])) {
        echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo']);
        exit;
    }

    $file = $_FILES['comprobante'];

    // Verificar errores de subida
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'El archivo excede el tamaño máximo permitido por el servidor',
            UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo permitido por el formulario',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
            UPLOAD_ERR_NO_FILE => 'No se seleccionó ningún archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta el directorio temporal',
            UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo en el disco',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida del archivo'
        ];

        $message = isset($errorMessages[$file['error']]) ? $errorMessages[$file['error']] : 'Error desconocido en la subida';
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }

    // Validar tipo de archivo
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];

    if (!in_array($fileExtension, $allowedExtensions)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo se permiten JPG, PNG y PDF.']);
        exit;
    }

    // Validar tamaño (máximo 5MB)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxSize) {
        echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 5MB.']);
        exit;
    }

    // Validar tipo MIME
    $allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    $fileMimeType = mime_content_type($file['tmp_name']);

    if (!in_array($fileMimeType, $allowedMimeTypes)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de archivo inválido.']);
        exit;
    }

    // Generar nombre único para el archivo
    $timestamp = time();
    $randomId = isset($_POST['pago_id']) ? $_POST['pago_id'] : rand(1000, 9999);
    $fileName = 'comprobante_' . $timestamp . '_' . $randomId . '.' . $fileExtension;
    $filePath = $uploadDir . $fileName;

    // Mover archivo a destino final
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        // Verificar que el archivo se guardó correctamente
        if (file_exists($filePath) && filesize($filePath) > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Comprobante subido exitosamente',
                'file_path' => '../uploads/comprobantes/' . $fileName,
                'file_name' => $fileName
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al verificar el archivo subido.']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al mover el archivo al directorio destino.']);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor: ' . $e->getMessage()
    ]);
}
?>
