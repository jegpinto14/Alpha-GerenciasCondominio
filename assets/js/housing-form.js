// Manejo de formulario dinámico de vivienda
let housingData = {};

document.addEventListener('DOMContentLoaded', function() {
    loadTiposVivienda();
});

// Cargar tipos de vivienda desde la base de datos
async function loadTiposVivienda() {
    try {
        const response = await fetch('../../api/get_housing_options.php');
        const data = await response.json();
        
        if (data.success) {
            housingData = data;
            populateTiposVivienda(data.tipos_vivienda);
        }
    } catch (error) {
        console.error('Error cargando tipos de vivienda:', error);
    }
}

// Poblar select de tipos de vivienda
function populateTiposVivienda(tipos) {
    const select = document.getElementById('firstTimeHousingType');
    select.innerHTML = '<option value="">Selecciona el tipo</option>';
    
    tipos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.nombre_tipo;
        option.textContent = tipo.nombre_tipo;
        select.appendChild(option);
    });
}

// Cargar opciones según el tipo de vivienda seleccionado
function loadHousingOptions() {
    const tipoVivienda = document.getElementById('firstTimeHousingType').value;
    const dynamicFields = document.getElementById('dynamicFields');
    
    // Ocultar todos los campos dinámicos
    document.getElementById('houseFields').style.display = 'none';
    document.getElementById('apartmentFields').style.display = 'none';
    document.getElementById('otherFields').style.display = 'none';
    
    if (!tipoVivienda) {
        dynamicFields.style.display = 'none';
        return;
    }
    
    dynamicFields.style.display = 'block';
    
    switch(tipoVivienda) {
        case 'Quinta':
            showHouseFields();
            break;
        case 'Apartamento':
            showApartmentFields();
            break;
        default:
            showOtherFields();
            break;
    }
}

// Mostrar campos para casas
function showHouseFields() {
    document.getElementById('houseFields').style.display = 'block';
    loadAvenidas('firstTimeAvenida');
}

// Mostrar campos para apartamentos
function showApartmentFields() {
    console.log('🏢 Mostrando campos de apartamento');
    document.getElementById('apartmentFields').style.display = 'block';
    console.log('🔄 Cargando avenidas para apartamentos...');
    loadAvenidas('firstTimeAvenidaApartment');
    console.log('🔄 Cargando edificios...');
    loadEdificios();
}

// Mostrar campos para otros tipos
function showOtherFields() {
    document.getElementById('otherFields').style.display = 'block';
    loadAvenidas('firstTimeAvenidaOther');
}

// Cargar avenidas
async function loadAvenidas(selectId) {
    console.log('🔄 Cargando avenidas para select:', selectId);
    try {
        const response = await fetch('../../api/get_avenidas.php');
        const data = await response.json();
        
        console.log('📡 Respuesta del API:', data);
        
        if (data.success) {
            const select = document.getElementById(selectId);
            console.log('🎯 Select encontrado:', select);
            
            if (select) {
                select.innerHTML = '<option value="">Selecciona una avenida</option>';
                
                console.log('📝 Agregando avenidas:', data.avenidas.length);
                data.avenidas.forEach(avenida => {
                    const option = document.createElement('option');
                    option.value = avenida.id_avenida;
                    option.textContent = avenida.nombre_avenida;
                    select.appendChild(option);
                    console.log('✅ Avenida agregada:', avenida.nombre_avenida);
                });
            } else {
                console.error('❌ Select no encontrado:', selectId);
            }
            
            // Agregar eventos según el tipo de select
            if (selectId === 'firstTimeAvenida') {
                select.onchange = function() {
                    loadCasas(this.value);
                };
            } else if (selectId === 'firstTimeAvenidaOther') {
                select.onchange = function() {
                    loadEstablecimientos(this.value);
                };
            } else if (selectId === 'firstTimeAvenidaApartment') {
                // Para apartamentos, no necesitamos cargar nada adicional
                // Solo mostrar todas las avenidas disponibles
                select.onchange = function() {
                    console.log('Avenida seleccionada para apartamento:', this.value);
                };
            }
        }
    } catch (error) {
        console.error('Error cargando avenidas:', error);
    }
}

// Cargar casas por avenida
async function loadCasas(avenidaId) {
    if (!avenidaId) return;
    
    try {
        const response = await fetch(`../../api/get_casas_by_avenida.php?avenida_id=${avenidaId}`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('firstTimeNombreCasa');
            select.innerHTML = '<option value="">Selecciona una casa</option>';
            
            if (data.casas.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay casas disponibles en esta avenida';
                option.disabled = true;
                select.appendChild(option);
            } else {
                data.casas.forEach(casa => {
                    const option = document.createElement('option');
                    option.value = casa.casa_id;
                    option.textContent = casa.nombre_casa;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando casas:', error);
    }
}

// Cargar edificios
async function loadEdificios() {
    try {
        const response = await fetch('../../api/get_edificios.php');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('firstTimeEdificio');
            select.innerHTML = '<option value="">Selecciona un edificio</option>';
            
            if (data.edificios.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay edificios con apartamentos disponibles';
                option.disabled = true;
                select.appendChild(option);
            } else {
                console.log('🏢 Edificios disponibles:', data.edificios);
                data.edificios.forEach(edificio => {
                    const option = document.createElement('option');
                    option.value = edificio.edificio_id;
                    option.textContent = edificio.nombre_edificio;
                    select.appendChild(option);
                    console.log('✅ Edificio agregado:', edificio.nombre_edificio, 'ID:', edificio.edificio_id);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando edificios:', error);
    }
}

// Cargar pisos por edificio
async function loadPisos() {
    const edificioId = document.getElementById('firstTimeEdificio').value;
    console.log('🏢 Cargando pisos para edificio ID:', edificioId);
    if (!edificioId) return;
    
    try {
        const response = await fetch(`../../api/get_pisos_by_edificio.php?edificio_id=${edificioId}`);
        const data = await response.json();
        
        console.log('📡 Respuesta pisos:', data);
        
        if (data.success) {
            const select = document.getElementById('firstTimePiso');
            select.innerHTML = '<option value="">Selecciona un piso</option>';
            
            if (data.pisos.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay pisos con apartamentos disponibles';
                option.disabled = true;
                select.appendChild(option);
            } else {
                console.log('🏢 Pisos disponibles:', data.pisos);
                data.pisos.forEach(piso => {
                    const option = document.createElement('option');
                    option.value = piso.piso;
                    option.textContent = piso.piso;
                    select.appendChild(option);
                    console.log('✅ Piso agregado:', piso.piso);
                });
            }
            
            // Limpiar apartamentos
            document.getElementById('firstTimeApartamento').innerHTML = '<option value="">Selecciona un apartamento</option>';
        }
    } catch (error) {
        console.error('Error cargando pisos:', error);
    }
}

// Cargar apartamentos por piso
async function loadApartamentos() {
    const edificioId = document.getElementById('firstTimeEdificio').value;
    const piso = document.getElementById('firstTimePiso').value;
    
    console.log('🏢 Cargando apartamentos para edificio ID:', edificioId, 'piso:', piso);
    if (!edificioId || !piso) return;
    
    try {
        const response = await fetch(`../../api/get_apartamentos_by_piso.php?edificio_id=${edificioId}&piso=${piso}`);
        const data = await response.json();
        
        console.log('📡 Respuesta apartamentos:', data);
        
        if (data.success) {
            const select = document.getElementById('firstTimeApartamento');
            select.innerHTML = '<option value="">Selecciona un apartamento</option>';
            
            if (data.apartamentos.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay apartamentos disponibles en este piso';
                option.disabled = true;
                select.appendChild(option);
            } else {
                console.log('🏢 Apartamentos disponibles:', data.apartamentos);
                data.apartamentos.forEach(apartamento => {
                    const option = document.createElement('option');
                    option.value = apartamento.apartamento_id;
                    option.textContent = apartamento.apartamento;
                    select.appendChild(option);
                    console.log('✅ Apartamento agregado:', apartamento.apartamento, 'ID:', apartamento.apartamento_id);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando apartamentos:', error);
    }
}

// Cargar establecimientos por avenida
async function loadEstablecimientos(avenidaId) {
    if (!avenidaId) return;
    
    try {
        const response = await fetch(`../../api/get_establecimientos_by_avenida.php?avenida_id=${avenidaId}`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('firstTimeEstablecimiento');
            select.innerHTML = '<option value="">Selecciona un establecimiento</option>';
            
            if (data.establecimientos.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay establecimientos disponibles en esta avenida';
                option.disabled = true;
                select.appendChild(option);
            } else {
                data.establecimientos.forEach(establecimiento => {
                    const option = document.createElement('option');
                    option.value = establecimiento.establecimiento_id;
                    option.textContent = establecimiento.nombre_establecimiento;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando establecimientos:', error);
    }
}
