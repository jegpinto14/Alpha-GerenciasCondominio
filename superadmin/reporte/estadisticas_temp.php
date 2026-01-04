<!DOCTYPE html>
<html lang="es">

<head>
            <h1><i class="fas fa-chart-bar"></i> Estadísticas de Registro</h1>
            <p>Análisis del porcentaje de viviendas registradas por ubicación</p>
        </div>
        <div style="display: flex; gap: 1rem;">
            <button onclick="imprimirEstadisticas()" class="btn-primary">
                <i class="fas fa-print"></i>
                Imprimir
            </button>
            <button onclick="descargarPDF()" class="btn-primary">
                <i class="fas fa-file-pdf"></i>
                Descargar PDF
            </button>
        </div>
    </div>

    <div class="summary-cards" id="summaryCards">
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

    <div class="table-card">
        <h2>Detalle por Ubicación</h2>
        <table class="stats-table" id="statsTable">
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
    </div>
    </main>

    <script src="estadisticas.js"></script>
    <script src="../../assets/js/navigation-protection.js"></script>
    <script src="../js/main.js"></script>
    </body>

</html>
