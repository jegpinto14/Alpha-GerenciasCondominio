document.getElementById('newHousingButton').addEventListener('click', () => {
    // Configurar formulario de vivienda
    newSetupHousingForm();
});

async function newSetupHousingForm() {
    console.log('📝 Configurando formulario de vivienda...');

    // Cargar tipos de vivienda desde la base de datos
    await loadTiposVivienda();

    console.log('✅ Formulario configurado - usar función newSaveHousingData()');
}

// Función para manejar el cambio del tipo de vivienda
function newToggleHousingFields() {
    const housingTypeSelect = document.getElementById('newHousingType');
    const selectedOption = housingTypeSelect.options[housingTypeSelect.selectedIndex];
    const housingType = selectedOption ? selectedOption.textContent : '';
    const dynamicFields = document.getElementById('newDynamicFields');

    console.log('🏠 Tipo de vivienda seleccionado:', housingType);

    // Ocultar todos los campos dinámicos
    const fieldsToHide = [
        'newApartamentoFields'
    ];

    fieldsToHide.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.display = 'none';
        }
    });

    // Si no hay tipo seleccionado, ocultar campos dinámicos
    if (!housingType || housingType === 'Selecciona el tipo') {
        if (dynamicFields) {
            dynamicFields.style.display = 'none';
        }
        return;
    }

    // Mostrar campos dinámicos
    if (dynamicFields) {
        dynamicFields.style.display = 'block';
    }

    // Mostrar campos específicos según el tipo
    switch (housingType) {
        case 'Apartamento':
            document.getElementById('newApartamentoFields').style.display = 'block';
            // Mostrar solo el campo de edificio inicialmente
            document.getElementById('newEdificio').parentElement.style.display = 'block';
            document.getElementById('newPiso').parentElement.style.display = 'none';
            document.getElementById('newApartamento').parentElement.style.display = 'none';
            newLoadEdificios();
            break;
        default:
            console.warn('⚠️ Solo se permite el registro de Apartamentos en este momento.');
            break;
    }
}



// Función para cargar edificios en el formulario de primera vez
async function newLoadEdificios() {
    try {
        const select = document.getElementById('newEdificio');
        if (!select) return;

        select.innerHTML = '<option value="">Cargando edificios...</option>';
        select.disabled = true;

        const response = await fetch('../../api/get_all_edificios.php');
        const data = await response.json();

        if (data.success && data.edificios) {
            select.innerHTML = '<option value="">Selecciona un edificio</option>';

            data.edificios.forEach(edificio => {
                const option = document.createElement('option');
                option.value = edificio.edificio_id;
                option.textContent = edificio.nombre_edificio;
                select.appendChild(option);
            });

            // Agregar evento para cargar pisos cuando cambie el edificio
            select.addEventListener('change', function () {
                // Mostrar campo de piso cuando se seleccione edificio
                document.getElementById('newPiso').parentElement.style.display = 'block';
                // Ocultar campo de apartamento hasta que se seleccione piso
                document.getElementById('newApartamento').parentElement.style.display = 'none';
                newLoadPisosByEdificio(this.value);
            });
        } else {
            select.innerHTML = '<option value="">Error cargando edificios</option>';
        }
    } catch (error) {
        console.error('Error cargando edificios:', error);
        const select = document.getElementById('newEdificio');
        if (select) {
            select.innerHTML = '<option value="">Error cargando edificios</option>';
        }
    } finally {
        const select = document.getElementById('newEdificio');
        if (select) {
            select.disabled = false;
        }
    }
}

// Función para cargar pisos por edificio
async function newLoadPisosByEdificio(edificioId) {
    try {
        const select = document.getElementById('newPiso');
        if (!select || !edificioId) return;

        select.innerHTML = '<option value="">Cargando pisos...</option>';
        select.disabled = true;

        const response = await fetch(`../../api/get_pisos_by_edificio.php?edificio_id=${edificioId}`);
        const data = await response.json();

        if (data.success && data.pisos) {
            select.innerHTML = '<option value="">Selecciona un piso</option>';

            data.pisos.forEach(piso => {
                const option = document.createElement('option');
                option.value = piso.piso;
                option.textContent = `Piso ${piso.piso}`;
                select.appendChild(option);
            });

            // Agregar evento para cargar apartamentos cuando cambie el piso
            select.addEventListener('change', function () {
                // Mostrar campo de apartamento cuando se seleccione piso
                document.getElementById('newApartamento').parentElement.style.display = 'block';
                newLoadApartamentosByPiso(edificioId, this.value);
            });
        } else {
            select.innerHTML = '<option value="">Error cargando pisos</option>';
        }
    } catch (error) {
        console.error('Error cargando pisos:', error);
        const select = document.getElementById('newPiso');
        if (select) {
            select.innerHTML = '<option value="">Error cargando pisos</option>';
        }
    } finally {
        const select = document.getElementById('newPiso');
        if (select) {
            select.disabled = false;
        }
    }
}

// Función para cargar apartamentos por piso
async function newLoadApartamentosByPiso(edificioId, piso) {
    try {
        const select = document.getElementById('newApartamento');
        if (!select || !edificioId || !piso) return;

        select.innerHTML = '<option value="">Cargando apartamentos...</option>';
        select.disabled = true;

        const response = await fetch(`../../api/get_apartamentos_by_piso.php?edificio_id=${edificioId}&piso=${piso}`);
        const data = await response.json();

        if (data.success && data.apartamentos) {
            select.innerHTML = '<option value="">Selecciona un apartamento</option>';

            data.apartamentos.forEach(apartamento => {
                const option = document.createElement('option');
                option.value = apartamento.apartamento_id;
                option.textContent = `${apartamento.apartamento}`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">Error cargando apartamentos</option>';
        }
    } catch (error) {
        console.error('Error cargando apartamentos:', error);
        const select = document.getElementById('newApartamento');
        if (select) {
            select.innerHTML = '<option value="">Error cargando apartamentos</option>';
        }
    } finally {
        const select = document.getElementById('newApartamento');
        if (select) {
            select.disabled = false;
        }
    }
}



// Función directa para guardar datos de vivienda
async function newSaveHousingData() {
    console.log('🚀 Guardando datos de vivienda...');

    // Obtener el botón y agregar efecto de carga
    const saveButton = document.querySelector('#newSaveHousingButton');
    const originalText = saveButton.innerHTML;

    // Mostrar estado de carga
    saveButton.classList.add('loading');
    saveButton.innerHTML = '<i class="fas fa-spinner"></i> Guardando...';
    saveButton.disabled = true;

    try {
        const response = await fetch('../../api/get_current_user.php');
        const data = await response.json();
        console.log('✅ Datos del usuario actualizados:', data);
        if (data.success && data.user) {
            currentUser = data.user;

            console.log('✅ Datos del usuario actualizados:', currentUser.username);
        } else {
            console.log('⚠️ No se pudieron cargar los datos del usuario');
        }
    } catch (error) {
        console.error('❌ Error cargando datos del usuario:', error);
    }

    // Obtener datos del formulario
    const data = currentUser;
    data.housingType = document.getElementById('newHousingType').value; // tipo_entidad
    data.fechaAdquirido = document.getElementById('newFechaAdquirido').value; // fecha_adquirido

    let fechaAdquiridoDate = data.fechaAdquirido.split('/').reverse().join('-');

    // Función para restaurar el botón
    function restoreButton() {
        saveButton.classList.remove('loading');
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }

    if (!data.fechaAdquirido) {
        alert('Por favor selecciona la fecha de adquisición del inmueble');
        restoreButton();
        return;
    }

    // Validar que la fecha no sea futura
    const fechaAdquirido = new Date(data.fechaAdquirido);
    const hoy = new Date();
    if (fechaAdquirido > hoy) {
        alert('La fecha de adquisición no puede ser futura');
        restoreButton();
        return;
    }

    // Validar que la fecha no sea muy antigua (más de 100 años)
    const hace100Anios = new Date();
    hace100Anios.setFullYear(hoy.getFullYear() - 100);
    if (fechaAdquirido < hace100Anios) {
        alert('La fecha de adquisición no puede ser anterior a hace 100 años');
        restoreButton();
        return;
    }

    if (!data.housingType) {
        alert('Por favor selecciona un tipo de vivienda');
        restoreButton();
        return;
    }

    // Validar campos según el tipo de vivienda
    let tipoVivienda = data.housingType;

    if (tipoVivienda === 'Apartamento') {
        const edificio = document.getElementById('newEdificio').value;
        const piso = document.getElementById('newPiso').value;
        const apartamento = document.getElementById('newApartamento').value;

        if (!edificio || !piso || !apartamento) {
            alert('Por favor completa todos los campos requeridos para apartamento');
            restoreButton();
            return;
        }

        data.nombre_edificio = document.getElementById('newEdificio').selectedOptions[0].text;
        data.numero_apartamento = document.getElementById('newApartamento').selectedOptions[0].text;

        // Obtener IDs y datos específicos del apartamento
        const edificioSelect = document.getElementById('newEdificio');
        const apartamentoSelect = document.getElementById('newApartamento');
        const pisoSelect = document.getElementById('newPiso');

        data.edificio_id = edificioSelect.value;
        data.apartamento_id = apartamentoSelect.value;
        data.piso = pisoSelect.value; // Obtener directamente del campo piso
        data.apartamento = apartamentoSelect.selectedOptions[0]?.textContent.replace('Apartamento ', '');

        console.log('🏠 Datos del apartamento obtenidos:', {
            edificio_id: data.edificio_id,
            apartamento_id: data.apartamento_id,
            piso: data.piso,
            apartamento: data.apartamento,
            tipo_dato_apartamento: typeof data.apartamento
        });

    } else {
        alert('Tipo de vivienda no soportado para guardar.');
        restoreButton();
        return;
    }

    // Preparar datos para envío
    const housingData = {
        tipo_vivienda: tipoVivienda,
        tipo_vivienda_nombre: tipoVivienda['tipo_vivienda_nombre'] || '',
        nombre_propietario: data.nombrePropietario,
        apellido_propietario: data.apellidoPropietario,
        cedula: 0,
        telefono: '',
        gmail: '',
        fecha_adquirido: fechaAdquiridoDate
    };

    // Agregar campos específicos
    if (tipoVivienda === 'Apartamento') {
        housingData.edificio_id = data.edificio_id;
        housingData.apartamento_id = data.apartamento_id;
        housingData.piso = data.piso;
        housingData.apartamento = data.apartamento;
    }

    console.log('📤 Enviando datos:', housingData);
    console.log('🔍 Verificación de datos de apartamento:', {
        edificio_id: housingData.edificio_id,
        apartamento_id: housingData.apartamento_id,
        piso: housingData.piso,
        apartamento: housingData.apartamento
    });

    try {
        console.log('🌐 Enviando petición a save_housing.php...');

        const response = await fetch('../../api/save_housing.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(housingData)
        });

        console.log('📡 Respuesta recibida:', response.status, response.statusText);

        const result = await response.json();
        console.log('📥 Respuesta del servidor:', result);

        if (result.success) {
            console.log('✅ Éxito! Cerrando modal...');

            // Restaurar el botón antes de cerrar el modal
            saveButton.classList.remove('loading');
            saveButton.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            saveButton.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

            // Mostrar mensaje de éxito
            showAlert('🏠 ¡Vivienda registrada exitosamente!', 'success');

            // Limpiar el formulario antes de cerrar
            clearNewHousingForm();

            // Cerrar modal después de un breve delay
            setTimeout(() => {
                closehousingModal();
            }, 1000);

        } else {
            console.log('❌ Error del servidor:', result.message);
            showAlert('❌ Error al registrar la vivienda: ' + result.message, 'error');
            restoreButton();
        }
    } catch (error) {
        console.error('💥 Error en la petición:', error);

        // Si el error es de parsing JSON, mostrar el contenido raw
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            console.error('❌ Respuesta del servidor no es JSON válido');
            showAlert('❌ Error del servidor: Respuesta inválida', 'error');
        } else {
            showAlert('❌ Error al registrar la vivienda: ' + error.message, 'error');
        }
        restoreButton();
    }
}

// Cerrar modal de registro de vivienda
function closehousingModal() {
    console.log('closehousingModal llamada');
    const modal = document.getElementById('housingModal');

    // Ocultar modal
    modal.style.display = 'none';
    modal.classList.remove('show');

    // Restaurar scroll del body
    const scrollY = document.body.style.top;
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.top = 'auto';
    document.body.style.width = 'auto';
    document.body.style.height = 'auto';
    document.body.classList.remove('modal-open');

    // Restaurar scroll en el html
    document.documentElement.style.overflow = 'auto';

    // Restaurar la posición del scroll
    if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    // Restaurar el botón al estado original
    const saveButton = document.querySelector('#newSaveHousingButton');
    if (saveButton) {
        saveButton.classList.remove('loading');
        saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar';
        saveButton.style.background = '';
        saveButton.disabled = false;
    }

    console.log('Modal cerrado, scroll restaurado, botón restaurado');
}

// Limpiar formulario de registro de vivienda
function clearNewHousingForm() {
    console.log('Limpiando formulario de vivienda...');

    // Resetear select de tipo de vivienda
    const housingTypeSelect = document.getElementById('newHousingType');
    if (housingTypeSelect) {
        housingTypeSelect.value = '';
    }

    // Resetear input de fecha
    const fechaInput = document.getElementById('newFechaAdquirido') || document.getElementById('fechaAdquirido');
    if (fechaInput) {
        fechaInput.value = '';
    }

    // Resetear selects dinámicos
    const selectsToReset = [
        'newEdificio',
        'newPiso',
        'newApartamento',
        'newApartamento',
    ];

    selectsToReset.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.value = '';
            select.innerHTML = '<option value="">Selecciona una opción</option>';
            select.disabled = true;
        }
    });

    // Ocultar campos dinámicos
    const fieldsToHide = [
        'newDynamicFields',
        'newApartamentoFields'
    ];

    fieldsToHide.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.display = 'none';
        }
    });

    console.log('Formulario limpiado');
}