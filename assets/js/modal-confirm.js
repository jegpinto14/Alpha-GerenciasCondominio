/**
 * Sistema de Modales de Confirmación Profesional
 * Reemplazo de alerts y confirms nativos
 */

class ModalConfirm {
    constructor() {
        this.overlay = null;
        this.init();
    }

    init() {
        // Crear overlay si no existe
        if (!document.getElementById('modalConfirmOverlay')) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'modalConfirmOverlay';
            this.overlay.className = 'modal-overlay';
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.getElementById('modalConfirmOverlay');
        }
    }

    /**
     * Mostrar modal de confirmación
     * @param {Object} options - Opciones del modal
     * @returns {Promise<boolean>} - true si confirma, false si cancela
     */
    confirm(options = {}) {
        const {
            title = '¿Confirmar acción?',
            message = '¿Está seguro de que desea continuar?',
            details = null,
            icon = 'info',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            confirmIcon = 'fa-check',
            cancelIcon = 'fa-times'
        } = options;

        return new Promise((resolve) => {
            const iconClass = this.getIconClass(icon);
            
            let detailsHTML = '';
            if (details && Array.isArray(details)) {
                detailsHTML = `
                    <div class="modal-details">
                        ${details.map(detail => `
                            <div class="modal-detail-item">
                                <span class="modal-detail-label">${detail.label}:</span>
                                <span class="modal-detail-value">${detail.value}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            this.overlay.innerHTML = `
                <div class="modal-container">
                    <div class="modal-header">
                        <div class="modal-icon ${icon}">
                            <i class="${iconClass}"></i>
                        </div>
                        <h2 class="modal-title">${title}</h2>
                    </div>
                    <div class="modal-body">
                        <p class="modal-message">${message}</p>
                        ${detailsHTML}
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" data-action="cancel">
                            <i class="fas ${cancelIcon}"></i>
                            ${cancelText}
                        </button>
                        <button class="modal-btn modal-btn-confirm" data-action="confirm">
                            <i class="fas ${confirmIcon}"></i>
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            this.overlay.classList.add('active');

            // Event listeners
            const handleClick = (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (action) {
                    this.overlay.classList.remove('active');
                    this.overlay.removeEventListener('click', handleClick);
                    resolve(action === 'confirm');
                }
            };

            this.overlay.addEventListener('click', handleClick);

            // Cerrar con ESC
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    this.overlay.classList.remove('active');
                    document.removeEventListener('keydown', handleEsc);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    /**
     * Mostrar modal de alerta (solo OK)
     * @param {Object} options - Opciones del modal
     * @returns {Promise<void>}
     */
    alert(options = {}) {
        const {
            title = 'Información',
            message = '',
            icon = 'info',
            okText = 'Entendido',
            okIcon = 'fa-check'
        } = options;

        return new Promise((resolve) => {
            const iconClass = this.getIconClass(icon);
            const btnClass = icon === 'error' ? 'modal-btn-error' : 'modal-btn-ok';

            this.overlay.innerHTML = `
                <div class="modal-container">
                    <div class="modal-header">
                        <div class="modal-icon ${icon}">
                            <i class="${iconClass}"></i>
                        </div>
                        <h2 class="modal-title">${title}</h2>
                    </div>
                    <div class="modal-body">
                        <p class="modal-message">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn ${btnClass}" data-action="ok">
                            <i class="fas ${okIcon}"></i>
                            ${okText}
                        </button>
                    </div>
                </div>
            `;

            this.overlay.classList.add('active');

            // Event listeners
            const handleClick = (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                if (action === 'ok') {
                    this.overlay.classList.remove('active');
                    this.overlay.removeEventListener('click', handleClick);
                    resolve();
                }
            };

            this.overlay.addEventListener('click', handleClick);

            // Cerrar con ESC o Enter
            const handleKey = (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    this.overlay.classList.remove('active');
                    document.removeEventListener('keydown', handleKey);
                    resolve();
                }
            };
            document.addEventListener('keydown', handleKey);
        });
    }

    /**
     * Obtener clase de icono según el tipo
     */
    getIconClass(type) {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            question: 'fas fa-question-circle'
        };
        return icons[type] || icons.info;
    }
}

// Crear instancia global
const modalConfirm = new ModalConfirm();

// Exportar para uso global
window.modalConfirm = modalConfirm;
