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
    <title>Estadísticas de Registro - Arcorui</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/reportes.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
                <button class="volver-btn" onclick="window.location.href='reportes.php'">
                    <i class="fas fa-arrow-left"></i>
                    Volver
                </button>
                <button class="volver-btn" onclick="enhancedLogout()" style="margin-left: 10px; background-color: #dc3545;">
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
                <a href="reportes.php" class="breadcrumb-link">Reportes</a>
                <i class="fas fa-chevron-right"></i>
                <span class="breadcrumb-current">Estadísticas de Registro</span>
            </nav>

            <header class="cxp-page-header">
                <div>
                    <h1>Estadísticas de Registro</h1>
                    <p>Análisis del porcentaje de viviendas registradas por ubicación</p>
                </div>
            </header>

            <div class="cxp-content">
                <div class="summary-cards" id="summaryCards">
                    <!-- Se llenará con JavaScript -->
                </div>
                
                <div class="action-buttons">
                    <button onclick="imprimirEstadisticas()" class="btn-action btn-print">
                        <i class="fas fa-print"></i>
                        Imprimir
                    </button>
                    <button onclick="descargarPDF()" class="btn-action btn-download">
                        <i class="fas fa-file-pdf"></i>
                        Descargar PDF
                    </button>
                </div>
                    <!-- Se llenará con JavaScript -->
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <h2>Porcentaje de Registro por Ubicación</h2>
                        <div class="chart-container">
                            <canvas id="barChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h2>Distribución General</h2>
                        <div class="chart-container">
                            <canvas id="pieChart"></canvas>
                        </div>
                    </div>
                </div>

                <section class="cxp-section">
                    <div class="section-header">
                        <h2>Detalle por Ubicación</h2>
                    </div>
                    <div class="table-container">
                        <table class="data-table" id="statsTable">
                            <thead>
                                <tr>
                                    <th>Ubicación</th>
                                    <th>Tipo</th>
                                    <th>Total</th>
                                    <th>Registrados</th>
                                    <th>Pendientes</th>
                                    <th>Porcentaje</th>
                                    <th>Progreso</th>
                                </tr>
                            </thead>
                            <tbody id="statsTableBody">
                                <!-- Se llenará con JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    </main>

    <script src="estadisticas.js"></script>
    <script src="../../assets/js/navigation-protection.js"></script>
    <script src="../js/main.js"></script>
</body>

</html>
