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
    <title>Administración de Pagos - Gerencias De Condominio</title>
    <link rel="stylesheet" href="../../assets/css/style.css">
    <link rel="stylesheet" href="../../assets/css/admin.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">
    <script>
        // Verificar sesión de admin antes de cargar la página
        (async function () {
            try {
                const response = await fetch("../../api/check_admin_auth.php");
                const data = await response.json();

                if (!data.success || !data.isAdmin) {
                    // No hay sesión válida, redirigir al login
                    localStorage.setItem('logout_flag', 'true');
                    window.location.replace('../../pages/auth/index.html');
                }
            } catch (error) {
                console.error("Error verificando sesión:", error);
                localStorage.setItem('logout_flag', 'true');
                window.location.replace('../../pages/auth/index.html');
            }
        })();
    </script>
</head>

<body>
    <div class="dashboard-container">
        <!-- Navbar -->
        <nav class="navbar">
            <div class="navbar-content">
                <h1><i class="fas fa-building"></i> Gerencias De Condominio</h1>
                <div class="user-info">
                    <span id="adminName">Administrador</span>
                    <button class="logout-btn" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Welcome Section -->
            <div class="welcome-section">
                <h2>Administración de Pagos e Ingresos</h2>
                <p>Gestiona y aprueba los pagos mensuales e ingresos por categoría de los residentes.</p>
            </div>

            <!-- Accesos Rápidos -->
            <div class="quick-actions-section" style="margin-bottom: 20px; display: flex; gap: 15px;">
                <a href="../../superadmin/reporte/reportes.php" class="btn-dashboard"
                    style="text-decoration: none; display: inline-flex; align-items: center; gap: 10px; background-color: #4a90e2; color: white; padding: 12px 20px; border-radius: 8px; transition: background 0.3s;">
                    <i class="fas fa-chart-line"></i> Reportes de Inmuebles
                </a>
                <a href="../../superadmin/pagos/pagos.php" class="btn-dashboard"
                    style="text-decoration: none; display: inline-flex; align-items: center; gap: 10px; background-color: #2ecc71; color: white; padding: 12px 20px; border-radius: 8px; transition: background 0.3s;">
                    <i class="fas fa-money-bill-wave"></i> Registro de Pagos
                </a>
            </div>

            <!-- Filtros de Tipo de Pago -->
            <div class="type-filters-section">
                <button class="type-filter-btn active" data-type="mensuales" onclick="switchPaymentType('mensuales')">
                    <i class="fas fa-calendar"></i> Pagos Mensuales
                </button>
                <button class="type-filter-btn" data-type="articulos" onclick="switchPaymentType('articulos')">
                    <i class="fas fa-shopping-cart"></i> Artículos (Cat. 5)
                </button>
                <button class="type-filter-btn" data-type="documentos" onclick="switchPaymentType('documentos')">
                    <i class="fas fa-file-alt"></i> Documentos (Cat. 4)
                </button>
                <button class="type-filter-btn" data-type="extraordinarios"
                    onclick="switchPaymentType('extraordinarios')">
                    <i class="fas fa-exclamation-triangle"></i> Extraordinarios (Cat. 3)
                </button>
            </div>

            <!-- Filtros -->
            <div class="filters-section">
                <div class="filter-group">
                    <label for="searchCedula">Buscar por Cédula:</label>
                    <input type="text" id="searchCedula" placeholder="Ej: 12345678" oninput="filterPayments()">
                </div>
                <div class="filter-group">
                    <label for="statusFilter">Filtrar por Estado:</label>
                    <select id="statusFilter" onchange="filterPayments()">
                        <option value="all">Todos</option>
                        <option value="Pendiente">Pendientes</option>
                        <option value="Confirmado">Confirmados</option>
                        <option value="Rechazado">Rechazados</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="dateFilter">Filtrar por Fecha:</label>
                    <input type="date" id="dateFilter" onchange="filterPayments()">
                </div>
                <button onclick="refreshPayments()" class="btn-primary">
                    <i class="fas fa-sync-alt"></i> Actualizar
                </button>
            </div>

            <!-- Lista de Pagos -->
            <div class="payments-container">
                <div id="paymentsList" class="payments-list">
                    <!-- Los pagos se cargarán dinámicamente -->
                </div>

                <!-- Paginación -->
                <div class="pagination-container" id="paginationContainer" style="display: none;">
                    <div class="pagination-info">
                        <span id="paginationInfo">Mostrando 0 de 0 registros</span>
                    </div>
                    <div class="pagination-controls">
                        <button class="pagination-btn" id="prevPageBtn" onclick="changePage(-1)">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <span class="pagination-pages" id="paginationPages"></span>
                        <button class="pagination-btn" id="nextPageBtn" onclick="changePage(1)">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Detalles de Pago -->
    <div id="paymentDetailsModal" class="modal" style="display: none;">
        <div class="modal-content large">
            <div class="modal-header">
                <h3><i class="fas fa-receipt"></i> Detalles del Pago</h3>
                <button class="close-btn" onclick="closePaymentDetails()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="paymentDetailsContent">
                    <!-- Los detalles se cargarán dinámicamente -->
                </div>
                <!-- Los botones se generarán dinámicamente según el estado del pago -->
            </div>
        </div>
    </div>

    <!-- Modal de Confirmación -->
    <div id="confirmModal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="confirmTitle">Confirmar Acción</h3>
                <button class="close-btn" onclick="closeConfirmModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p id="confirmMessage">¿Estás seguro de que deseas realizar esta acción?</p>
            </div>
            <div class="modal-actions">
                <button onclick="closeConfirmModal()" class="btn-secondary">Cancelar</button>
                <button onclick="executeAction()" class="btn-primary" id="confirmButton">Confirmar</button>
            </div>
        </div>
    </div>

    <!-- Modal para ver imagen del comprobante -->
    <div id="imageModal" class="modal" style="display: none;">
        <div class="modal-content image-modal">
            <div class="modal-header">
                <h3><i class="fas fa-image"></i> Comprobante de Pago</h3>
                <button class="close-btn" onclick="closeImageModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="image-container">
                    <img id="modalImage" src="" alt="Comprobante"
                        style="max-width: 100%; max-height: 80vh; border-radius: 8px;">
                </div>
            </div>
        </div>
    </div>

    <script src="../../assets/js/navigation-protection.js"></script>
    <script src="../../assets/js/admin.js"></script>
</body>

</html>