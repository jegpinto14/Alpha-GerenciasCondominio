// Función mejorada para guardar datos de vivienda
async function saveHousingData() {
    console.log('🚀 Iniciando proceso de registro de vivienda...');

    // Obtener el botón y agregar efecto de carga
    const saveButton = document.querySelector('#housingRegistrationModal .btn-primary');
    const originalText = saveButton.innerHTML;

    // Mostrar estado de carga
    saveButton.classList.add('loading');
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    saveButton.disabled = true;

    try {
        // Recopilar y validar datos del formulario
        const formData = collectHousingFormData();
        const validationResult = validateHousingFormData(formData);

        if (!validationResult.isValid) {
            showHousingValidationErrors(validationResult.errors);
            restoreButton();
            return;
        }

        // Enviar datos al servidor
        const result = await submitHousingData(formData);

        if (result.success) {
            showHousingSuccessMessage(result.message);
            resetHousingForm();
            closeHousingRegistrationModal();
            // Recargar datos del usuario
            setTimeout(() => {
                loadHousingData();
            }, 1000);
        } else {
            showHousingErrorMessage(result.message);
        }
    } catch (error) {
        console.error('❌ Error en el proceso:', error);
        showHousingErrorMessage('Error inesperado. Por favor, inténtalo de nuevo.');
    } finally {
        restoreButton();
    }

    // Función para restaurar el botón
    function restoreButton() {
        saveButton.classList.remove('loading');
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }
}

// Función para recopilar datos del formulario
function collectHousingFormData() {
    const data = {
        // Datos básicos del propietario
        housingType: document.getElementById('firstTimeHousingType').value,
        nombrePropietario: document.getElementById('firstTimeNombrePropietario').value.trim(),
        apellidoPropietario: document.getElementById('firstTimeApellidoPropietario').value.trim(),
        cedula: document.getElementById('firstTimeCedula').value.trim(),
        telefono: document.getElementById('firstTimeTelefono').value.trim(),
        gmail: document.getElementById('firstTimeGmail').value.trim(),
        fechaAdquirido: document.getElementById('firstTimeFechaAdquirido').value
    };

    // Agregar datos específicos según el tipo de vivienda
    const housingType = data.housingType;

    if (housingType === 'Quinta') {
        data.avenidaId = document.getElementById('firstTimeAvenida').value;
        data.casaId = document.getElementById('firstTimeNombreCasa').value;
        data.nombreCasa = document.getElementById('firstTimeNombreCasa').selectedOptions[0]?.text;
    } else if (housingType === 'Apartamento') {
        data.edificioId = document.getElementById('firstTimeEdificio').value;
        data.apartamentoId = document.getElementById('firstTimeApartamento').value;
        data.piso = document.getElementById('firstTimePiso').value;
        data.nombreApartamento = document.getElementById('firstTimeApartamento').selectedOptions[0]?.text;
    } else if (housingType === 'Establecimiento') {
        data.avenidaId = document.getElementById('firstTimeAvenidaOther').value;
        data.establecimientoId = document.getElementById('firstTimeEstablecimiento').value;
        data.nombreEstablecimiento = document.getElementById('firstTimeEstablecimiento').selectedOptions[0]?.text;
    }

    console.log('📝 Datos recopilados:', data);
    return data;
}

// Función para validar datos del formulario
function validateHousingFormData(data) {
    const errors = [];

    // Validar campos básicos
    if (!data.nombrePropietario || data.nombrePropietario.length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!data.apellidoPropietario || data.apellidoPropietario.length < 2) {
        errors.push('El apellido debe tener al menos 2 caracteres');
    }

    if (!data.cedula || !data.cedula.match(/^[0-9]{6,8}$/)) {
        errors.push('La cédula debe contener entre 6-8 dígitos numéricos');
    }

    if (!data.telefono || !data.telefono.match(/^[0-9]{10,11}$/)) {
        errors.push('El teléfono debe tener entre 10-11 dígitos');
    }

    if (!data.gmail || !data.gmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Debe ser un correo electrónico válido');
    }

    if (!data.fechaAdquirido) {
        errors.push('Debe seleccionar la fecha de adquisición');
    } else {
        const fechaAdquirido = new Date(data.fechaAdquirido);
        const hoy = new Date();
        if (fechaAdquirido > hoy) {
            errors.push('La fecha de adquisición no puede ser futura');
        }
    }

    if (!data.housingType) {
        errors.push('Debe seleccionar un tipo de vivienda');
    }

    // Validar campos específicos según el tipo de vivienda
    if (data.housingType === 'Quinta') {
        if (!data.avenidaId || !data.casaId) {
            errors.push('Debe seleccionar una avenida y una quinta');
        }
    } else if (data.housingType === 'Apartamento') {
        if (!data.edificioId || !data.apartamentoId || !data.piso) {
            errors.push('Debe completar todos los campos del apartamento');
        }
    } else if (data.housingType === 'Establecimiento') {
        if (!data.avenidaId || !data.establecimientoId) {
            errors.push('Debe seleccionar una avenida y un establecimiento');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Función para enviar datos al servidor
async function submitHousingData(data) {
    try {
        const response = await fetch('../../api/save_housing.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('📤 Respuesta del servidor:', result);
        return result;
    } catch (error) {
        console.error('❌ Error en la petición:', error);
        throw error;
    }
}

// Función para mostrar errores de validación
function showHousingValidationErrors(errors) {
    const errorMessage = errors.join('\n• ');
    showHousingAlert(`❌ Errores de validación:\n• ${errorMessage}`, 'error');
}

// Función para mostrar mensaje de éxito
function showHousingSuccessMessage(message) {
    showHousingAlert(`✅ ${message}`, 'success');
}

// Función para mostrar mensaje de error
function showHousingErrorMessage(message) {
    showHousingAlert(`❌ ${message}`, 'error');
}

// Función para mostrar alertas
function showHousingAlert(message, type = 'info') {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
    `;

    // Colores según el tipo
    if (type === 'error') {
        alertDiv.style.backgroundColor = '#f8d7da';
        alertDiv.style.color = '#721c24';
        alertDiv.style.border = '1px solid #f5c6cb';
    } else if (type === 'success') {
        alertDiv.style.backgroundColor = '#d4edda';
        alertDiv.style.color = '#155724';
        alertDiv.style.border = '1px solid #c3e6cb';
    } else {
        alertDiv.style.backgroundColor = '#d1ecf1';
        alertDiv.style.color = '#0c5460';
        alertDiv.style.border = '1px solid #bee5eb';
    }

    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Agregar al DOM
    document.body.appendChild(alertDiv);

    // Remover después de 5 segundos
    setTimeout(() => {
        if (document.body.contains(alertDiv)) {
            alertDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(alertDiv)) {
                    document.body.removeChild(alertDiv);
                }
            }, 300);
        }
    }, 5000);
}

// Función para resetear formulario
function resetHousingForm() {
    const form = document.getElementById('housingForm');
    if (form) {
        form.reset();
    }

    // Ocultar campos dinámicos
    const fieldsToHide = ['houseFields', 'apartmentFields', 'otherFields'];
    fieldsToHide.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.display = 'none';
        }
    });

    // Ocultar campos dinámicos principales
    const dynamicFields = document.getElementById('dynamicFields');
    if (dynamicFields) {
        dynamicFields.style.display = 'none';
    }
}
