/**
 * Módulo personalizado para el Modal de Recibos con pestañas
 * 
 * @description Extiende el modal de recibos existente con navegación por pestañas
 * @author Arcorui Community System
 * @date 2025-10-31
 */

class RecibosModalManager {
    constructor() {
        this.currentTab = 'pagos'; // pestaña activa por defecto
        this.currentHousing = null; // se obtiene del contexto global
        this.allRecibosPagos = []; // almacenar todos los recibos de pago
        this.currentFilter = 'todos'; // filtro activo
        this.init();
    }

    /**
     * Inicializar el manager del modal
     */
    init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupModal());
        } else {
            this.setupModal();
        }

        // Sincronizar currentHousing con la variable global de dashboard.js
        this.syncCurrentHousing();
    }

    /**
     * Sincronizar currentHousing con la variable global
     */
    syncCurrentHousing() {
        // Crear un getter/setter para mantener sincronizado
        Object.defineProperty(this, 'currentHousing', {
            get: function () {
                // Siempre obtener el valor más reciente de window.currentHousing
                return window.currentHousing || this._currentHousing || null;
            },
            set: function (value) {
                this._currentHousing = value;
            },
            configurable: true
        });

        // Observar cambios en window.currentHousing si es posible
        if (window.currentHousing) {
            console.log('✅ currentHousing detectado en window:', window.currentHousing);
        }

        // Polling cada segundo para detectar cambios (fallback)
        setInterval(() => {
            if (window.currentHousing && window.currentHousing !== this._lastKnownHousing) {
                this._lastKnownHousing = window.currentHousing;
                console.log('🔄 currentHousing actualizado:', window.currentHousing);
            }
        }, 1000);
    }

    /**
     * Configurar el modal con las nuevas pestañas
     */
    setupModal() {
        // Interceptar la apertura del modal original
        const originalOpenRecibosModal = window.openRecibosModal;

        window.openRecibosModal = () => {
            // Sincronizar con window.currentHousing en cada apertura
            console.log('🏠 DEBUG - Sincronizando currentHousing al abrir modal');
            console.log('  - window.currentHousing:', window.currentHousing);
            console.log('  - this.currentHousing (getter):', this.currentHousing);

            this.injectTabsInterface();

            // Llamar función original si existe
            if (originalOpenRecibosModal) {
                originalOpenRecibosModal();
            } else {
                // Abrir modal manualmente si no existe la función
                const modal = document.getElementById('recibosModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    document.body.classList.add('modal-open');
                }
            }

            // Cargar contenido de la pestaña activa
            this.loadTabContent(this.currentTab);
        };
    }

    /**
     * Inyectar interfaz de pestañas en el modal existente
     */
    injectTabsInterface() {
        const modalBody = document.querySelector('#recibosModal .modal-body');

        if (!modalBody) {
            console.error('❌ No se encontró el modal body de recibos');
            return;
        }

        // Crear estructura de pestañas
        const tabsHTML = `
            <div class="tab-container">
                <!-- Navegación de pestañas -->
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="pagos">
                        <i class="fas fa-credit-card"></i> Recibos de Pago
                    </button>
                    <button class="tab-button" data-tab="documentos">
                        <i class="fas fa-file-alt"></i> Recibos de Documentos
                    </button>
                    <button class="tab-button" data-tab="articulos">
                        <i class="fas fa-shopping-cart"></i> Recibos de Artículos
                    </button>
                </div>

                <!-- Contenido de pestañas -->
                <div class="recibos-tabs-content">
                    <!-- Pestaña de Pagos (contenido original) -->
                    <div class="recibos-tab-pane active" id="tab-pagos">
                        <div class="recibos-container">
                            <div class="recibos-header">
                                <p>Aquí puedes ver y descargar todos tus recibos de pago aprobados.</p>
                            </div>
                            
                            <!-- Filtros de tipo de pago -->
                            <div class="recibos-filters" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                                <button class="filter-btn active" data-filter="todos" onclick="window.recibosManager.filterRecibosPagos('todos')">
                                    <i class="fas fa-list"></i> Todos
                                </button>
                                <button class="filter-btn" data-filter="mensualidades" onclick="window.recibosManager.filterRecibosPagos('mensualidades')">
                                    <i class="fas fa-calendar"></i> Mensualidades
                                </button>
                                <button class="filter-btn" data-filter="extraordinarios" onclick="window.recibosManager.filterRecibosPagos('extraordinarios')">
                                    <i class="fas fa-exclamation-triangle"></i> Gastos Extraordinarios
                                </button>
                            </div>
                            
                            <div id="recibosList" class="recibos-list">
                                <div class="loading-message">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Cargando recibos...</p>
                                </div>
                            </div>
                            <div id="noRecibosMessage" class="no-recibos-message" style="display: none;">
                                <i class="fas fa-file-invoice"></i>
                                <h4>No tienes recibos aún</h4>
                                <p>Los recibos aparecerán aquí una vez que tus pagos sean aprobados.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Pestaña de Documentos -->
                    <div class="recibos-tab-pane" id="tab-documentos">
                        <div class="recibos-container">
                            <div class="recibos-header">
                                <p>Recibos de servicios administrativos como cartas residenciales y otros documentos.</p>
                            </div>
                            <div id="recibosDocumentosList" class="recibos-list">
                                <div class="loading-message">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Cargando recibos de documentos...</p>
                                </div>
                            </div>
                            <div id="noRecibosDocumentosMessage" class="no-recibos-message" style="display: none;">
                                <i class="fas fa-file-alt"></i>
                                <h4>No tienes recibos de documentos</h4>
                                <p>Los recibos de servicios administrativos aparecerán aquí.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Pestaña de Artículos -->
                    <div class="recibos-tab-pane" id="tab-articulos">
                        <div class="recibos-container">
                            <div class="recibos-header">
                                <p>Recibos de compra de artículos y productos vendidos en la comunidad.</p>
                            </div>
                            <div id="recibosArticulosList" class="recibos-list">
                                <div class="loading-message">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Cargando recibos de artículos...</p>
                                </div>
                            </div>
                            <div id="noRecibosArticulosMessage" class="no-recibos-message" style="display: none;">
                                <i class="fas fa-shopping-cart"></i>
                                <h4>No tienes recibos de artículos</h4>
                                <p>Los recibos de compra de artículos aparecerán aquí.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Reemplazar contenido del modal
        modalBody.innerHTML = tabsHTML;

        // Agregar event listeners para las pestañas
        this.setupTabNavigation();

        // Agregar estilos CSS específicos de recibos
        this.injectRecibosStyles();
    }

    /**
     * Configurar navegación entre pestañas
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    /**
     * Cambiar pestaña activa
     */
    switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.recibos-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Actualizar pestaña actual
        this.currentTab = tabName;

        // Cargar contenido específico
        this.loadTabContent(tabName);
    }

    /**
     * Cargar contenido específico de cada pestaña
     */
    loadTabContent(tabName) {
        switch (tabName) {
            case 'pagos':
                this.loadRecibosPagos();
                break;
            case 'documentos':
                this.loadRecibosDocumentos();
                break;
            case 'articulos':
                this.loadRecibosArticulos();
                break;
        }
    }

    /**
     * Cargar recibos de pagos con capacidad de filtrado
     * Incluye mensualidades y gastos extraordinarios
     */
    async loadRecibosPagos() {
        const recibosList = document.getElementById('recibosList');
        const noRecibosMessage = document.getElementById('noRecibosMessage');

        if (!recibosList) return;

        const housing = window.currentHousing || this.currentHousing;

        if (!housing || !housing.inmueble_id || !housing.propietario_id) {
            console.warn('⚠️ No hay información de vivienda o propietario para filtrar recibos.');
            this.showNoRecibosPagos();
            return;
        }

        try {
            // Mostrar loading
            recibosList.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando recibos...</p>
                </div>
            `;

            // Cargar mensualidades (tabla pagos)
            const paramsMensualidades = new URLSearchParams({
                inmueble_id: housing.inmueble_id,
                propietario_id: housing.propietario_id
            });

            const responseMensualidades = await fetch(`../../api/get_recibos.php?${paramsMensualidades.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const dataMensualidades = await responseMensualidades.json();

            // Cargar gastos extraordinarios (tabla ingresos con categoria_id = 3)
            const paramsExtraordinarios = new URLSearchParams({
                inmueble_id: housing.inmueble_id
            });

            const responseExtraordinarios = await fetch(`../../api/get_recibos_extraordinarios.php?${paramsExtraordinarios.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const dataExtraordinarios = await responseExtraordinarios.json();

            // Combinar ambos tipos de recibos
            let allRecibos = [];

            // Agregar mensualidades
            if (dataMensualidades.success && dataMensualidades.recibos.length > 0) {
                allRecibos = allRecibos.concat(dataMensualidades.recibos.map(r => ({
                    ...r,
                    tipo: 'mensualidad'
                })));
            }

            // Agregar gastos extraordinarios
            if (dataExtraordinarios.success && dataExtraordinarios.recibos.length > 0) {
                allRecibos = allRecibos.concat(dataExtraordinarios.recibos.map(r => ({
                    id: r.detalle_id,
                    pago_detalle_id: r.detalle_id,
                    mes: r.nombre_gasto,
                    concepto: r.nombre_gasto,
                    monto_bs: null,
                    monto_dolares: r.total_linea_usd,
                    metodo_pago: r.metodo_pago,
                    fecha_aprobacion: r.fecha_emision,
                    estado: r.estado,
                    download_url: r.download_url,
                    tipo: 'extraordinario',
                    es_gasto_extraordinario: true
                })));
            }

            if (allRecibos.length > 0) {
                // Guardar todos los recibos
                this.allRecibosPagos = allRecibos;
                // Aplicar filtro actual
                this.applyFilter();
                noRecibosMessage.style.display = 'none';
            } else {
                this.allRecibosPagos = [];
                this.showNoRecibosPagos();
            }

        } catch (error) {
            console.error('Error cargando recibos:', error);
            this.showNoRecibosPagos();
        }
    }

    /**
     * Filtrar recibos de pagos por tipo
     */
    filterRecibosPagos(filterType) {
        this.currentFilter = filterType;

        // Actualizar botones activos
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');

        // Aplicar filtro
        this.applyFilter();
    }

    /**
     * Aplicar filtro a los recibos
     */
    applyFilter() {
        let filteredRecibos = this.allRecibosPagos;

        if (this.currentFilter === 'mensualidades') {
            // Filtrar solo mensualidades (recibos que tienen mes/año)
            filteredRecibos = this.allRecibosPagos.filter(recibo =>
                recibo.mes && !recibo.es_gasto_extraordinario
            );
        } else if (this.currentFilter === 'extraordinarios') {
            // Filtrar solo gastos extraordinarios
            filteredRecibos = this.allRecibosPagos.filter(recibo =>
                recibo.es_gasto_extraordinario || (!recibo.mes && recibo.concepto)
            );
        }

        // Mostrar recibos filtrados
        if (filteredRecibos.length > 0) {
            this.displayRecibosPagos(filteredRecibos);
        } else {
            this.showNoRecibosPagos(`No hay recibos de ${this.currentFilter === 'mensualidades' ? 'mensualidades' : 'gastos extraordinarios'}`);
        }
    }

    /**
     * Mostrar recibos de pagos
     */
    displayRecibosPagos(recibos) {
        const recibosList = document.getElementById('recibosList');

        recibosList.innerHTML = recibos.map(recibo => {
            const tipoIcon = recibo.tipo === 'extraordinario' ? 'fa-exclamation-triangle' : 'fa-file-invoice';
            const tipoClass = recibo.tipo === 'extraordinario' ? 'extraordinario-item' : '';

            return `
                <div class="recibo-item ${tipoClass}">
                    <div class="recibo-info">
                        <div class="recibo-header">
                            <h4><i class="fas ${tipoIcon}"></i> Recibo #${recibo.id}</h4>
                            <span class="recibo-fecha">${this.formatDate(recibo.fecha_aprobacion)}</span>
                        </div>
                        <div class="recibo-details">
                            <p><strong>${recibo.tipo === 'extraordinario' ? 'Concepto' : 'Período'}:</strong> ${recibo.mes || recibo.concepto || 'N/A'}</p>
                            <p><strong>Monto:</strong> ${recibo.monto_bs ? recibo.monto_bs + ' Bs' : ''} ${recibo.monto_dolares ? '/ $' + recibo.monto_dolares : ''}</p>
                            <p><strong>Método:</strong> ${recibo.metodo_pago}</p>
                            <p><strong>Estado:</strong> <span class="status-badge status-${recibo.estado_detalle ? recibo.estado_detalle.toLowerCase() : (recibo.estado ? recibo.estado.toLowerCase() : 'confirmado')}">${recibo.estado_detalle || recibo.estado || 'Confirmado'}</span></p>
                        </div>
                    </div>
                    <div class="recibo-actions">
                        <button class="btn-download" onclick="window.recibosManager.downloadReciboPago('${recibo.download_url}')">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Descargar recibo de pago (mensualidad o extraordinario)
     */
    downloadReciboPago(downloadUrl) {
        console.log('🔽 Descargando recibo:', downloadUrl);

        // Crear enlace temporal
        const link = document.createElement('a');
        link.href = `../../${downloadUrl}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Mostrar mensaje de no recibos de pagos
     */
    showNoRecibosPagos(message = 'No tienes recibos aún') {
        const recibosList = document.getElementById('recibosList');
        const noRecibosMessage = document.getElementById('noRecibosMessage');

        recibosList.innerHTML = '';
        noRecibosMessage.innerHTML = `
            <i class="fas fa-file-invoice"></i>
            <h4>No tienes recibos</h4>
            <p>${message}</p>
        `;
        noRecibosMessage.style.display = 'block';
    }

    /**
     * Cargar recibos de documentos (nueva lógica)
     */
    async loadRecibosDocumentos() {
        const container = document.getElementById('recibosDocumentosList');
        const noRecibosMsg = document.getElementById('noRecibosDocumentosMessage');

        // Obtener inmueble_id directamente desde window.currentHousing (siempre actualizado)
        const housing = window.currentHousing || this.currentHousing;

        console.log('🔍 DEBUG - Cargando recibos de documentos');
        console.log('  - window.currentHousing:', window.currentHousing);
        console.log('  - this.currentHousing:', this.currentHousing);
        console.log('  - housing (final):', housing);

        if (!housing || !housing.inmueble_id) {
            console.error('❌ No hay información de vivienda disponible');
            this.showNoRecibosDocumentos('No se ha seleccionado una vivienda válida');
            return;
        }

        const inmuebleId = housing.inmueble_id;
        console.log('✅ Usando inmueble_id:', inmuebleId);

        try {
            // Mostrar loading
            container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando recibos de documentos...</p>
                </div>
            `;

            const url = `../../api/get_recibos_documentos.php?inmueble_id=${inmuebleId}`;
            console.log('🔗 URL de petición:', url);

            // Hacer petición al endpoint
            const response = await fetch(url);
            const data = await response.json();

            console.log('📥 Respuesta del servidor:', data);

            if (data.success && data.recibos.length > 0) {
                this.displayRecibosDocumentos(data.recibos);
                noRecibosMsg.style.display = 'none';
            } else {
                this.showNoRecibosDocumentos(data.message || 'No se encontraron recibos de documentos');
            }

        } catch (error) {
            console.error('❌ Error cargando recibos de documentos:', error);
            this.showNoRecibosDocumentos('Error al cargar los recibos');
        }
    }

    /**
     * Mostrar recibos de documentos
     */
    displayRecibosDocumentos(recibos) {
        const container = document.getElementById('recibosDocumentosList');

        const recibosHTML = recibos.map(recibo => `
            <div class="recibo-item documento-item">
                <div class="recibo-info">
                    <div class="recibo-header">
                        <h4><i class="fas fa-file-alt"></i> ${recibo.nombre_documento}</h4>
                        <span class="recibo-fecha">${this.formatDate(recibo.fecha_emision)}</span>
                    </div>
                    <div class="recibo-details">
                        <p><strong>Estado:</strong> <span class="estado-${recibo.estado ? recibo.estado.toLowerCase() : 'pendiente'}">${recibo.estado || 'Pendiente'}</span></p>
                        <p><strong>Cantidad:</strong> ${recibo.cantidad}</p>
                        <p><strong>Monto:</strong> $${recibo.precio_unitario_usd}</p>
                        <p><strong>Total:</strong> $${recibo.total_linea_usd}</p>
                    </div>
                </div>
                <div class="recibo-actions">
                    <button class="btn-download" onclick="window.recibosManager.downloadReciboDocumento(${recibo.detalle_id})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = recibosHTML;
    }

    /**
     * Mostrar mensaje de no recibos para documentos
     */
    showNoRecibosDocumentos(message) {
        const container = document.getElementById('recibosDocumentosList');
        const noRecibosMsg = document.getElementById('noRecibosDocumentosMessage');

        container.innerHTML = '';
        noRecibosMsg.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <h4>No tienes recibos de documentos</h4>
            <p>${message}</p>
        `;
        noRecibosMsg.style.display = 'block';
    }

    /**
     * Cargar recibos de artículos
     */
    async loadRecibosArticulos() {
        const container = document.getElementById('recibosArticulosList');
        const noRecibosMsg = document.getElementById('noRecibosArticulosMessage');

        // Obtener inmueble_id directamente desde window.currentHousing
        const housing = window.currentHousing || this.currentHousing;

        console.log('🔍 DEBUG - Cargando recibos de artículos');
        console.log('  - window.currentHousing:', window.currentHousing);
        console.log('  - this.currentHousing:', this.currentHousing);
        console.log('  - housing (final):', housing);

        if (!housing || !housing.inmueble_id) {
            console.error('❌ No hay información de vivienda disponible');
            this.showNoRecibosArticulos('No se ha seleccionado una vivienda válida');
            return;
        }

        const inmuebleId = housing.inmueble_id;
        console.log('✅ Usando inmueble_id:', inmuebleId);

        try {
            // Mostrar loading
            container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando recibos de artículos...</p>
                </div>
            `;

            const url = `../../api/get_recibos_articulos.php?inmueble_id=${inmuebleId}`;
            console.log('🔗 URL de petición:', url);

            // Hacer petición al endpoint
            const response = await fetch(url);
            const data = await response.json();

            console.log('📥 Respuesta del servidor:', data);

            if (data.success && data.recibos.length > 0) {
                this.displayRecibosArticulos(data.recibos);
                noRecibosMsg.style.display = 'none';
            } else {
                this.showNoRecibosArticulos(data.message || 'No se encontraron recibos de artículos');
            }

        } catch (error) {
            console.error('❌ Error cargando recibos de artículos:', error);
            this.showNoRecibosArticulos('Error al cargar los recibos');
        }
    }

    /**
     * Mostrar recibos de artículos
     */
    displayRecibosArticulos(recibos) {
        const container = document.getElementById('recibosArticulosList');

        const recibosHTML = recibos.map(recibo => `
            <div class="recibo-item articulo-item">
                <div class="recibo-info">
                    <div class="recibo-header">
                        <h4><i class="fas fa-shopping-cart"></i> ${recibo.nombre_articulo}</h4>
                        <span class="recibo-fecha">${this.formatDate(recibo.fecha_emision)}</span>
                    </div>
                    <div class="recibo-details">
                        <p><strong>Estado:</strong> <span class="estado-${recibo.estado ? recibo.estado.toLowerCase() : 'pendiente'}">${recibo.estado || 'Pendiente'}</span></p>
                        <p><strong>Cantidad:</strong> ${recibo.cantidad}</p>
                        <p><strong>Precio unitario:</strong> $${recibo.precio_unitario_usd}</p>
                        <p><strong>Total:</strong> $${recibo.total_linea_usd}</p>
                    </div>
                </div>
                <div class="recibo-actions">
                    <button class="btn-download" onclick="window.recibosManager.downloadReciboArticulo(${recibo.detalle_id})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = recibosHTML;
    }

    /**
     * Mostrar mensaje de no recibos para artículos
     */
    showNoRecibosArticulos(message) {
        const container = document.getElementById('recibosArticulosList');
        const noRecibosMsg = document.getElementById('noRecibosArticulosMessage');

        container.innerHTML = '';
        noRecibosMsg.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            <h4>No tienes recibos de artículos</h4>
            <p>${message}</p>
        `;
        noRecibosMsg.style.display = 'block';
    }

    /**
     * Descargar recibo de documento
     */
    downloadReciboDocumento(detalleId) {
        const downloadUrl = `../../api/generate_document_receipt.php?detalle_id=${detalleId}`;

        console.log('🔽 Descargando recibo de documento:', detalleId);

        // Crear enlace temporal
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);

        try {
            link.click();
            console.log('✅ Descarga de documento iniciada');
        } catch (error) {
            window.open(downloadUrl, '_blank');
        }

        document.body.removeChild(link);
    }

    /**
     * Descargar recibo de artículo
     */
    downloadReciboArticulo(detalleId) {
        const downloadUrl = `../../api/generate_article_receipt.php?detalle_id=${detalleId}`;

        console.log('🔽 Descargando recibo de artículo:', detalleId);

        // Crear enlace temporal
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);

        try {
            link.click();
            console.log('✅ Descarga de artículo iniciada');
        } catch (error) {
            window.open(downloadUrl, '_blank');
        }

        document.body.removeChild(link);
    }

    /**
     * Formatear fecha
     */
    formatDate(dateString) {
        if (window.formatDate) {
            return window.formatDate(dateString);
        }

        // Fallback simple
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Inyectar estilos CSS específicos de recibos
     */
    injectRecibosStyles() {
        if (document.getElementById('recibos-custom-styles')) {
            return; // Ya están inyectados
        }

        const styles = `
            <style id="recibos-custom-styles">
                .recibos-tabs-content {
                    min-height: 400px;
                }

                .recibos-tab-pane {
                    display: none;
                }

                .recibos-tab-pane.active {
                    display: block;
                }

                .documento-item {
                    border-left: 4px solid #28a745;
                }

                .documento-item .recibo-header h4 {
                    color: #28a745;
                }

                .articulo-item {
                    border-left: 4px solid #007bff;
                }

                .articulo-item .recibo-header h4 {
                    color: #007bff;
                }

                .filter-btn {
                    padding: 8px 16px;
                    border: 2px solid #e0e0e0;
                    background: white;
                    color: #666;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .filter-btn:hover {
                    border-color: #2a5298;
                    color: #2a5298;
                    background: #f8f9fa;
                }

                .filter-btn.active {
                    background: #2a5298;
                    color: white;
                    border-color: #2a5298;
                }

                .filter-btn i {
                    font-size: 14px;
                }

                .extraordinario-item {
                    border-left: 4px solid #ff9800;
                }

                .extraordinario-item .recibo-header h4 {
                    color: #ff9800;
                }

                .estado-confirmado, .estado-aprobado {
                    color: #28a745;
                    font-weight: 600;
                }

                .estado-pendiente {
                    color: #ffc107;
                    font-weight: 600;
                }

                .estado-rechazado {
                    color: #dc3545;
                    font-weight: 600;
                }

                .coming-soon-message {
                    text-align: center;
                    padding: 60px 20px;
                    color: #6c757d;
                }

                .coming-soon-message i {
                    font-size: 48px;
                    margin-bottom: 16px;
                    color: #ffc107;
                }

                .coming-soon-message h4 {
                    margin-bottom: 8px;
                    color: #495057;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Inicializar el manager cuando se carga el script
window.recibosManager = new RecibosModalManager();

console.log('✅ RecibosModal Custom Manager cargado correctamente');
console.log('🔗 Sincronizado con window.currentHousing de dashboard.js');
