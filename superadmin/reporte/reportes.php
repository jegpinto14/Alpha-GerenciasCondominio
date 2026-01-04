<?php
session_start();
require_once '../../includes/database.php';

// Verificar que hay sesión activa
if (!isset($_SESSION['user_id']) || !isset($_SESSION['tipo'])) {
    header('Location: ../../pages/auth/index.html');
    exit;
}

// Verificar que el usuario es admin
$stmt = $pdo->prepare("
    SELECT u.user_id, u.username, r.nombre as tipo 
    FROM usuarios u 
    JOIN roles r ON u.rol_id = r.rol_id 
    WHERE u.user_id = ?
");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || $user['tipo'] !== 'admin') {
    header('Location: ../../pages/auth/index.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reportes de Inmuebles - Arcorui</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/reportes.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
    <script>
        // Verificar sesión de admin
        fetch('../../api/check_admin_auth.php')
            .then(response => response.json())
            .then(data => {
                if (!data.success || !data.isAdmin) {
                    window.location.href = '../../index.html';
                }
            })
            .catch(error => {
                console.error('Error verificando sesión:', error);
                window.location.href = '../../index.html';
            });
    </script>
</head>

<body>
    <header class="header">
        <div class="header-content">
            <div class="logo">
                <i class="fas fa-home"></i>
                <span>Arcorui</span>
            </div>
            <div class="user-section">
                <span class="user-name"></span>
                <button class="volver-btn" onclick="window.location.href='../../pages/admin/admin.php'">
                    <i class="fas fa-arrow-left"></i>
                    Volver
                </button>
                <button class="volver-btn" onclick="enhancedLogout()"
                    style="margin-left: 10px; background-color: #dc3545;">
                    <i class="fas fa-sign-out-alt"></i>
                    Salir
                </button>
            </div>
        </div>
    </header>

    <main class="cxp-main">
        <div class="cxp-container">
            <nav class="breadcrumb">
                <a href="../html/index.html" class="breadcrumb-link" onclick="volverDashboard()">
                    <i class="fas fa-home"></i>
                    Dashboard
                </a>
                <i class="fas fa-chevron-right"></i>
                <span class="breadcrumb-current">Reportes de Inmuebles</span>
            </nav>

            <header class="cxp-page-header">
                <div>
                    <h1>Reportes de Inmuebles</h1>
                    <p>Reportes detallados de inmuebles registrados con información de propietarios.</p>
                </div>
            </header>

            <div class="cxp-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-home"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Total Inmuebles</h3>
                            <p id="total" class="stat-value">0</p>
                        </div>
                    </div>
                    <div class="stat-card"
                        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: pointer;"
                        onclick="window.location.href='estadisticas.php'">
                        <div class="stat-icon" style="color: white;">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div class="stat-content">
                            <h3 style="color: rgba(255,255,255,0.9);">Estadísticas</h3>
                            <p class="stat-value" style="color: white; font-size: 1.2rem;">Ver Análisis</p>
                        </div>
                    </div>
                </div>

                <section class="cxp-section">
                    <div class="section-header">
                        <h2>Inmuebles Registrados</h2>
                        <div class="section-actions">
                            <div id="columnSelection" class="column-selection">
                                <label><input type="checkbox" checked value="nombre_vivienda"> Nombre de
                                    Vivienda</label>
                                <label><input type="checkbox" checked value="nombre_propietario"> Nombre
                                    Propietario</label>
                                <label><input type="checkbox" checked value="apellido"> Apellido</label>
                                <label><input type="checkbox" checked value="correo"> Correo</label>
                                <label><input type="checkbox" checked value="calle"> Calle</label>
                            </div>
                            <button id="downloadPdf" class="btn-primary">
                                <i class="fas fa-download"></i>
                                Descargar PDF
                            </button>
                        </div>
                    </div>
                    <div class="table-container">
                        <table id="inmueblesTable" class="data-table">
                            <thead>
                                <tr>
                                    <th>Nombre de Vivienda</th>
                                    <th>Nombre Propietario</th>
                                    <th>Apellido</th>
                                    <th>Correo</th>
                                    <th>Calle</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </section>

                <section class="cxp-section">
                    <div class="section-header">
                        <h2>Cantidades por Calle</h2>
                    </div>
                    <div class="table-container">
                        <table id="cantidadesTable" class="data-table">
                            <thead>
                                <tr>
                                    <th>Calle</th>
                                    <th>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    </main>

    <script src="reportes.js"></script>
    <script src="../../assets/js/navigation-protection.js"></script>
    <script src="../js/main.js"></script>
</body>

</html>