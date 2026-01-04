// Validaciones de campos del formulario de vivienda

// Validar campos de solo letras (nombres)
function validateLetters(input) {
    const value = input.value;
    const validationId = input.id.replace('firstTime', '').toLowerCase() + '-validation';
    const validationElement = document.getElementById(validationId);
    
    // Remover caracteres no permitidos
    const cleanValue = value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '');
    if (value !== cleanValue) {
        input.value = cleanValue;
    }
    
    // Validar longitud
    if (cleanValue.length === 0) {
        hideValidationMessage(validationElement);
        return;
    }
    
    if (cleanValue.length < 2) {
        showValidationMessage(validationElement, 'Mínimo 2 caracteres', 'error');
    } else if (cleanValue.length > 30) {
        showValidationMessage(validationElement, 'Máximo 30 caracteres', 'error');
    } else {
        showValidationMessage(validationElement, '✓ Formato válido', 'success');
    }
}

// Validar cédula
function validateCedula(input) {
    const value = input.value;
    const validationElement = document.getElementById('cedula-validation');
    
    // Remover caracteres no permitidos excepto guiones
    let cleanValue = value.replace(/[^VvEeJjGgPp0-9-]/g, '');
    
    // Formatear automáticamente
    if (cleanValue.length > 0 && !cleanValue.includes('-') && cleanValue.length > 1) {
        const letter = cleanValue[0].toUpperCase();
        const numbers = cleanValue.slice(1).replace(/[^0-9]/g, '');
        cleanValue = letter + '-' + numbers;
    }
    
    if (value !== cleanValue) {
        input.value = cleanValue;
    }
    
    // Validar formato
    if (cleanValue.length === 0) {
        hideValidationMessage(validationElement);
        return;
    }
    
    const cedulaRegex = /^[VvEeJjGgPp]-[0-9]{7,9}$/;
    
    if (!cedulaRegex.test(cleanValue)) {
        showValidationMessage(validationElement, 'Formato: V-12345678', 'error');
    } else {
        showValidationMessage(validationElement, '✓ Formato válido', 'success');
    }
}

// Validar teléfono
function validatePhone(input) {
    const value = input.value;
    const validationElement = document.getElementById('telefono-validation');
    
    // Solo permitir números
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (value !== cleanValue) {
        input.value = cleanValue;
    }
    
    // Validar longitud
    if (cleanValue.length === 0) {
        hideValidationMessage(validationElement);
        return;
    }
    
    if (cleanValue.length < 10) {
        showValidationMessage(validationElement, 'Mínimo 10 dígitos', 'error');
    } else if (cleanValue.length > 11) {
        showValidationMessage(validationElement, 'Máximo 11 dígitos', 'error');
    } else if (cleanValue.length === 10) {
        showValidationMessage(validationElement, '✓ Formato válido (10 dígitos)', 'success');
    } else if (cleanValue.length === 11) {
        showValidationMessage(validationElement, '✓ Formato válido (11 dígitos)', 'success');
    }
}

// Validar Gmail
function validateGmail(input) {
    const value = input.value;
    const validationElement = document.getElementById('gmail-validation');
    
    if (value.length === 0) {
        hideValidationMessage(validationElement);
        return;
    }
    
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    
    if (!gmailRegex.test(value)) {
        showValidationMessage(validationElement, 'Debe ser una dirección de Gmail válida', 'error');
    } else {
        showValidationMessage(validationElement, '✓ Gmail válido', 'success');
    }
}

// Mostrar mensaje de validación
function showValidationMessage(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `validation-message ${type}`;
}

// Ocultar mensaje de validación
function hideValidationMessage(element) {
    if (!element) return;
    
    element.className = 'validation-message';
}

// Validar formulario completo antes del envío
function validateHousingForm() {
    const nombre = document.getElementById('firstTimeNombrePropietario').value.trim();
    const apellido = document.getElementById('firstTimeApellidoPropietario').value.trim();
    const cedula = document.getElementById('firstTimeCedula').value.trim();
    const telefono = document.getElementById('firstTimeTelefono').value.trim();
    const gmail = document.getElementById('firstTimeGmail').value.trim();
    
    let isValid = true;
    
    // Validar nombre
    if (nombre.length < 2) {
        showValidationMessage(document.getElementById('nombre-validation'), 'El nombre debe tener al menos 2 caracteres', 'error');
        isValid = false;
    }
    
    // Validar apellido
    if (apellido.length < 2) {
        showValidationMessage(document.getElementById('apellido-validation'), 'El apellido debe tener al menos 2 caracteres', 'error');
        isValid = false;
    }
    
    // Validar cédula
    const cedulaRegex = /^[VvEeJjGgPp]-[0-9]{7,9}$/;
    if (!cedulaRegex.test(cedula)) {
        showValidationMessage(document.getElementById('cedula-validation'), 'Formato de cédula inválido', 'error');
        isValid = false;
    }
    
    // Validar teléfono
    if (telefono.length < 10 || telefono.length > 11) {
        showValidationMessage(document.getElementById('telefono-validation'), 'El teléfono debe tener entre 10 y 11 dígitos', 'error');
        isValid = false;
    }
    
    // Validar Gmail
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(gmail)) {
        showValidationMessage(document.getElementById('gmail-validation'), 'Debe ser una dirección de Gmail válida', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Agregar validación de Gmail al campo
document.addEventListener('DOMContentLoaded', function() {
    const gmailInput = document.getElementById('firstTimeGmail');
    if (gmailInput) {
        gmailInput.addEventListener('input', function() {
            validateGmail(this);
        });
    }
});
