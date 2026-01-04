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
    <title>Registro de Pagos - Arcorui</title>
    <link rel="stylesheet" href="../pagos/pagos.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
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
    <!-- Header -->
    <header class="header">
        <div class="header-content">
            <div class="breadcrumb">
                <a href="../html/index.html" class="breadcrumb-link">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <span class="breadcrumb-separator">></span>
                <span class="breadcrumb-current">Registro de Pagos</span>
            </div>
            <div class="header-actions">
                <button onclick="window.location.href='../../pages/admin/admin.php'" class="btn-secondary">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <button onclick="enhancedLogout()" class="btn-secondary"
                    style="margin-left: 10px; background-color: #dc3545; color: white; border-color: #dc3545;">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <div class="container">
            <div class="page-header">
                <h1><i class="fas fa-money-bill-wave"></i> Registro de Pagos Mensuales</h1>
                <p>Registre los pagos mensuales de las viviendas de la comunidad</p>
            </div>

            <!-- Formulario de Pago -->
            <div class="payment-form">
                <form id="paymentForm" enctype="multipart/form-data">
                    <!-- Selección de Propietario/Inmueble -->
                    <div class="form-section">
                        <h3><i class="fas fa-home"></i> Seleccionar Vivienda</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="propietarioSearch">Buscar Propietario:</label>
                                <input type="text" id="propietarioSearch" placeholder="Buscar por nombre, apellido o documento..." class="search-input">
                            </div>
                            <div class="form-group">
                                <label for="propietarioSelect">Propietario:</label>
                                <select id="propietarioSelect" name="propietario_id" required>
                                    <option value="">Seleccione un propietario...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="inmuebleSelect">Inmueble:</label>
                                <select id="inmuebleSelect" name="inmueble_id" required>
                                    <option value="">Seleccione un inmueble...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="periodoSelect">Período(s) - Seleccione uno o varios:</label>
                                <select id="periodoSelect" name="periodos[]" multiple size="6" required>
                                    <option value="">Cargando períodos...</option>
                                </select>
                                <small class="help-text">💡 Mantenga Ctrl (Windows) o Cmd (Mac) presionado para
                                    seleccionar múltiples períodos</small>
                                <div id="periodosSeleccionados" class="selected-periods"></div>
                            </div>
                        </div>
                        
                        <!-- Sección de Deuda -->
                        <div class="form-row" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e9ecef;">
                            <div class="form-group" style="flex: 1;">
                                <label for="montoDeuda">
                                    <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                                    Registrar/Actualizar Deuda (USD):
                                </label>
                                <input type="number" id="montoDeuda" step="0.01" min="0" placeholder="0.00">
                                <small class="help-text">💡 Ingrese el monto de deuda acumulada para esta vivienda</small>
                            </div>
                            <div class="form-group" style="display: flex; align-items: flex-end;">
                                <button type="button" id="btnGuardarDeuda" class="btn-secondary" style="background-color: #dc3545; border-color: #dc3545;">
                                    <i class="fas fa-save"></i> Guardar Deuda
                                </button>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label>Deuda Actual:</label>
                                <div id="deudaActual" style="font-size: 1.2rem; font-weight: bold; color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px; text-align: center;">
                                    $0.00 USD
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Información del Pago -->
                    <div class="form-section">
                        <h3><i class="fas fa-credit-card"></i> Información del Pago</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="metodoPagoSelect">Método de Pago:</label>
                                <select id="metodoPagoSelect" name="metodo_id" required>
                                    <option value="">Seleccione método de pago...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="montoUSD">Monto USD:</label>
                                <input type="number" id="montoUSD" name="monto_usd" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="tasaCambio">Tasa de Cambio:</label>
                                <select id="tasaCambio" name="tasa_id" required>
                                    <option value="">Seleccione tasa...</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="montoBs">Monto Bs:</label>
                                <input type="number" id="montoBs" name="monto_bs" step="0.01" min="0" readonly>
                            </div>
                            <div class="form-group">
                                <label for="montoPagado">Monto Pagado (Bs):</label>
                                <input type="number" id="montoPagado" name="monto_pagado" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="bancoEmisor">Banco Emisor:</label>
                                <select id="bancoEmisor" name="banco_emisor_id">
                                    <option value="">Seleccione banco emisor...</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="bancoReceptor">Banco Receptor:</label>
                                <select id="bancoReceptor" name="banco_receptor_id">
                                    <option value="">Seleccione banco receptor...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="comprobante">Comprobante:</label>
                                <input type="file" id="comprobante" name="comprobante" accept="image/*,.pdf">
                            </div>
                            <div class="form-group">
                                <label for="estadoPago">Estado:</label>
                                <select id="estadoPago" name="estado" required>
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Confirmado">Confirmado</option>
                                    <option value="Rechazado">Rechazado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Botones -->
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Registrar Pago
                        </button>
                        <button type="reset" class="btn-secondary">
                            <i class="fas fa-times"></i> Limpiar
                        </button>
                    </div>
                </form>
            </div>

            <!-- Estado del Pago -->
            <div class="payment-status" id="paymentStatus" style="display: none;">
                <h3>Estado del Pago Registrado</h3>
                <div id="statusContent"></div>
            </div>
        </div>
    </main>

    <!-- Scripts -->
    <script src="../../assets/js/navigation-protection.js"></script>
    <script src="../js/main.js"></script>
    <script src="pagos.js"></script>
</body>

</html>