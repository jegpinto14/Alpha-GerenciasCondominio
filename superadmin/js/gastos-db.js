/**
 * Módulo de Gestión de Gastos (Cuentas por Pagar) - Conectado a Base de Datos
 * Versión: 2.0 - Integración completa con APIs
 */

const API_BASE = "../api";
const state = {
  proveedores: [],
  cuentasContables: [],
  tiposCuentaContable: [],
  categoriasBalance: [],
  obligaciones: [],
  obligacionesVencidas: [],
  pagos: [],
  metodosPago: [],
  bancos: [],
  bancosEmisores: [],
  bancosReceptores: [],
  periodos: [],
  apartamentos: [],
  mesActual: null,
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupDatePickers();
  setupModals();
  setupForms();
  setDefaultMonth();
  setupHistoryFilter();
  setupPDFExport();
  await cargarDatosIniciales();
  renderizarTodo();
});

async function cargarDatosIniciales() {
  try {
    console.log("Cargando datos iniciales...");
    await cargarPeriodos();
    await cargarProveedores();
    await cargarCategoriasBalance();
    await cargarTiposCuentaContable();
    await cargarCuentasContables();
    await cargarMetodosPago();
    await cargarBancos();
    await cargarBancosEmisores();
    await cargarApartamentos();
    await cargarObligaciones();
    await cargarPagos();
    console.log("Datos iniciales cargados.");
    mostrarNotificacionLocal("Datos cargados exitosamente", "success");
  } catch (error) {
    console.error("Error cargando datos iniciales:", error);
    mostrarNotificacionLocal("Error al cargar datos del sistema", "error");
  }
}

function setDefaultMonth() {
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  state.mesActual = mesActual;
}

async function cargarPeriodos() {
  try {
    const response = await fetch(`${API_BASE}/periodos.php`);
    const data = await response.json();

    if (data.success) {
      state.periodos = data.data;
      poblarSelectPeriodos();
    } else {
      console.error("Error cargando periodos:", data.message);
    }
  } catch (error) {
    console.error("Error cargando periodos:", error);
  }
}

function poblarSelectPeriodos() {
  const selector = document.getElementById("cxpPeriodSelector");
  if (!selector) return;

  // Limpiar opciones
  selector.innerHTML = "";

  if (!state.periodos || state.periodos.length === 0) {
    selector.innerHTML =
      '<option value="">No hay periodos disponibles</option>';
    return;
  }

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  // Agregar opciones de periodos
  state.periodos.forEach((periodo) => {
    const fecha = new Date(periodo.fecha_periodo + "T00:00:00");
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();
    const mesAnio = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    const label = `${meses[mes]} ${anio}`;

    const option = document.createElement("option");
    option.value = mesAnio;
    option.textContent = label;
    selector.appendChild(option);
  });

  // Seleccionar el periodo actual por defecto
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  // Si existe el periodo actual, seleccionarlo
  const opcionActual = Array.from(selector.options).find(
    (opt) => opt.value === mesActual
  );
  if (opcionActual) {
    selector.value = mesActual;
    state.mesActual = mesActual;
  } else if (selector.options.length > 0) {
    // Si no existe, seleccionar el primero (más reciente)
    selector.value = selector.options[0].value;
    state.mesActual = selector.options[0].value;
  }

  // Agregar evento de cambio
  selector.addEventListener("change", async (e) => {
    state.mesActual = e.target.value;
    await cargarObligaciones();
    await cargarPagos();
    renderizarTodo();
  });
}

// ============================================================================
// FUNCIONES DE CARGA DE DATOS (APIs)
// ============================================================================

async function cargarProveedores() {
  try {
    const response = await fetch(`${API_BASE}/proveedores.php`);
    const data = await response.json();

    console.log("Respuesta de proveedores:", data);

    if (data.success) {
      state.proveedores = data.data;
      console.log("Proveedores cargados en state:", state.proveedores);
      poblarSelectProveedores();
    } else {
      console.error("Error en respuesta:", data.message);
    }
  } catch (error) {
    console.error("Error cargando proveedores:", error);
  }
}

async function cargarCuentasContables() {
  try {
    // Cargar todas las cuentas (activas e inactivas) para la gestión
    const response = await fetch(
      `${API_BASE}/cuentas-contables.php?todas=true`
    );
    const data = await response.json();

    console.log("Respuesta de cuentas contables:", data);

    if (data.success) {
      state.cuentasContables = data.data;

      // Si no hay cuentas, crear una por defecto
      if (!state.cuentasContables || state.cuentasContables.length === 0) {
        console.warn("No hay cuentas contables. Usando cuenta por defecto.");
        state.cuentasContables = [
          {
            cuenta_id: 1,
            codigo_cuenta: "001",
            nombre_cuenta: "Gastos Generales",
            tipo_cuenta: "gasto_variable",
            activa: true,
          },
        ];
      }

      poblarSelectCuentas();
      poblarSelectProveedoresEnCuentas();
    } else {
      console.error("Error en respuesta de cuentas:", data.message);
    }
  } catch (error) {
    console.error("Error cargando cuentas contables:", error);
  }
}

async function cargarMetodosPago() {
  try {
    const response = await fetch(`${API_BASE}/metodos-pago.php`);
    const data = await response.json();

    console.log("Respuesta de métodos de pago:", data);

    if (data.success) {
      state.metodosPago = data.data;
      poblarSelectMetodosPago();
      console.log("Métodos de pago cargados:", state.metodosPago.length);
    } else {
      console.error("Error en respuesta de métodos:", data.message);
      // Fallback con métodos por defecto
      state.metodosPago = [
        { metodo_id: 1, nombre_metodo: "Transferencia bancaria" },
        { metodo_id: 2, nombre_metodo: "Cheque" },
        { metodo_id: 3, nombre_metodo: "Efectivo" },
      ];
      poblarSelectMetodosPago();
    }
  } catch (error) {
    console.error("Error cargando métodos de pago:", error);
    // Fallback con métodos por defecto
    state.metodosPago = [
      { metodo_id: 1, nombre_metodo: "Transferencia bancaria" },
      { metodo_id: 2, nombre_metodo: "Cheque" },
      { metodo_id: 3, nombre_metodo: "Efectivo" },
    ];
    poblarSelectMetodosPago();
  }
}

async function cargarBancos() {
  try {
    const response = await fetch(`${API_BASE}/bancos.php`);
    const data = await response.json();

    console.log("Respuesta de bancos:", data);

    if (data.success) {
      state.bancos = data.data || data.bancos || [];
      poblarSelectBancos();
      console.log("Bancos cargados:", state.bancos.length);
    } else {
      console.error("Error en respuesta de bancos:", data.message);
    }
  } catch (error) {
    console.error("Error cargando bancos:", error);
  }
}

async function cargarBancosEmisores() {
  try {
    const response = await fetch(`${API_BASE}/banco-emisor-gastos.php`);
    const data = await response.json();

    console.log("Respuesta de bancos emisores:", data);

    if (data.success) {
      state.bancosEmisores = data.data || [];
      poblarSelectBancosEmisores();
      console.log("Bancos emisores cargados:", state.bancosEmisores.length);
    } else {
      console.error("Error en respuesta de bancos emisores:", data.message);
    }
  } catch (error) {
    console.error("Error cargando bancos emisores:", error);
  }
}

async function cargarBancosReceptores(proveedorId) {
  try {
    const response = await fetch(
      `${API_BASE}/banco-receptor-gastos.php?proveedor_id=${proveedorId}`
    );
    const data = await response.json();

    console.log("Respuesta de bancos receptores:", data);

    if (data.success) {
      state.bancosReceptores = data.data || [];
      poblarSelectBancosReceptores();
      console.log("Bancos receptores cargados:", state.bancosReceptores.length);
    } else {
      console.error("Error en respuesta de bancos receptores:", data.message);
      state.bancosReceptores = [];
      poblarSelectBancosReceptores();
    }
  } catch (error) {
    console.error("Error cargando bancos receptores:", error);
    state.bancosReceptores = [];
    poblarSelectBancosReceptores();
  }
}

async function cargarObligaciones() {
  try {
    const [anio, mes] = state.mesActual.split("-");
    const response = await fetch(
      `${API_BASE}/obligaciones.php?anio=${anio}&mes=${mes}`
    );
    const data = await response.json();

    if (data.success) {
      // Eliminar posibles duplicados por obligacion_id
      const obligacionesUnicas = [];
      const idsVistos = new Set();

      data.data.forEach((obl) => {
        if (idsVistos.has(obl.obligacion_id)) return;
        idsVistos.add(obl.obligacion_id);
        obligacionesUnicas.push(obl);
      });

      state.obligaciones = obligacionesUnicas;
      actualizarKPIs(data.resumen);

      // Actualizar el label del periodo actual
      const periodLabel = document.getElementById("currentPeriodLabel");
      if (periodLabel) {
        const meses = [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ];
        const mesNombre = meses[parseInt(mes) - 1];
        periodLabel.textContent = `${mesNombre} ${anio}`;
      }
    }
  } catch (error) {
    console.error("Error cargando obligaciones:", error);
  }
}

async function cargarPagos() {
  try {
    const [anio, mes] = state.mesActual.split("-");
    console.log("Cargando pagos para:", anio, mes);
    const response = await fetch(
      `${API_BASE}/pagos-proveedores.php?anio=${anio}&mes=${mes}`
    );
    const data = await response.json();

    console.log("Respuesta de pagos:", data);

    if (data.success) {
      state.pagos = data.data;
      console.log("Pagos cargados:", state.pagos.length);
    } else {
      console.error("Error en respuesta de pagos:", data.message);
    }
  } catch (error) {
    console.error("Error cargando pagos:", error);
  }
}

// ============================================================================
// FUNCIONES DE GUARDADO (APIs)
// ============================================================================

async function guardarProveedor(datosProveedor) {
  try {
    console.log("Guardando proveedor...", datosProveedor);

    const payload = {
      nombre_razon_social: datosProveedor.nombre,
      tipo_documento: datosProveedor.tipoDocumento || "J",
      nro_documento: datosProveedor.nroDocumento,
      email: datosProveedor.email,
      telefono: datosProveedor.telefono,
      notas: datosProveedor.notas,
      banco_id: datosProveedor.bancoId,
      numero_cuenta: datosProveedor.numeroCuenta,
      titular_cuenta: datosProveedor.titularCuenta,
    };

    console.log("Payload:", payload);
    console.log("URL:", `${API_BASE}/proveedores.php`);

    const response = await fetch(`${API_BASE}/proveedores.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);

    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      mostrarNotificacionLocal("Proveedor registrado exitosamente", "success");
      await cargarProveedores();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al registrar proveedor",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error guardando proveedor:", error);
    mostrarNotificacionLocal("Error de conexión al guardar proveedor", "error");
    return false;
  }
}

async function guardarObligacion(datosObligacion) {
  try {
    console.log("Guardando obligación...", datosObligacion);

    const payload = {
      proveedor_id: datosObligacion.proveedorId,
      cuenta_id: datosObligacion.cuentaId,
      fecha_emision: datosObligacion.fechaEmision,
      fecha_vencimiento: datosObligacion.fechaVencimiento,
      monto_total_usd: datosObligacion.montoUSD,
      concepto: datosObligacion.concepto,
      aprobado_por: datosObligacion.aprobadoPor,
      fecha_aprobacion: datosObligacion.fechaAprobacion,
      frecuencia_pago: datosObligacion.frecuenciaPago || "mensual",
    };

    console.log("Payload enviado:", payload);

    const response = await fetch(`${API_BASE}/obligaciones.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      mostrarNotificacionLocal("Obligación registrada exitosamente", "success");
      await cargarObligaciones();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al registrar obligación",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error guardando obligación:", error);
    mostrarNotificacionLocal(
      "Error de conexión al guardar obligación",
      "error"
    );
    return false;
  }
}

async function guardarPago(datosPago, formData) {
  try {
    console.log("Guardando pago:", datosPago);

    // Crear FormData para enviar archivo
    const formDataToSend = new FormData();
    formDataToSend.append(
      "obligacion_periodo_id",
      datosPago.obligacionPeriodoId
    );
    formDataToSend.append("nro_documento", datosPago.nroDocumento);
    formDataToSend.append("metodo_id", datosPago.metodoPagoId);
    formDataToSend.append("banco_receptor_id", datosPago.bancoReceptorId);
    formDataToSend.append("banco_emisor_id", datosPago.bancoEmisorId);
    formDataToSend.append("tasa_cambio", datosPago.tasaCambio || "");
    formDataToSend.append("fecha_pago", datosPago.fechaPago);
    formDataToSend.append("monto_pagado_usd", datosPago.montoUSD);
    formDataToSend.append("monto_pagado_bs", datosPago.montoBs || "");
    formDataToSend.append(
      "numero_referencia",
      datosPago.numeroReferencia || ""
    );
    formDataToSend.append("estado", "registrado");
    formDataToSend.append("notas", datosPago.notas || "");
    formDataToSend.append("registrado_por", datosPago.registradoPor);

    // Agregar archivo si existe
    const fileInput = document.getElementById("paymentReceipt");
    if (fileInput && fileInput.files && fileInput.files[0]) {
      formDataToSend.append("documento_respaldo", fileInput.files[0]);
    }

    const response = await fetch(`${API_BASE}/pagos-proveedores.php`, {
      method: "POST",
      body: formDataToSend,
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal("Pago registrado exitosamente", "success");
      await cargarObligaciones();
      await cargarPagos();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al registrar pago",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error guardando pago:", error);
    mostrarNotificacionLocal("Error de conexión al guardar pago", "error");
    return false;
  }
}

async function guardarCuentaContable(datosCuenta) {
  try {
    console.log("Guardando cuenta contable...", datosCuenta);

    const payload = {
      codigo_cuenta: datosCuenta.codigo,
      nombre_cuenta: datosCuenta.nombre,
      tipo_cuenta_contable_id: datosCuenta.tipo,
      descripcion: datosCuenta.descripcion,
      activa: datosCuenta.activa,
    };

    const response = await fetch(`${API_BASE}/cuentas-contables.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Cuenta contable registrada exitosamente",
        "success"
      );
      await cargarCuentasContables();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al registrar cuenta contable",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error guardando cuenta contable:", error);
    mostrarNotificacionLocal(
      "Error de conexión al guardar cuenta contable",
      "error"
    );
    return false;
  }
}

async function actualizarCuentaContable(cuentaId, datosCuenta) {
  try {
    console.log("Actualizando cuenta contable...", cuentaId, datosCuenta);

    const response = await fetch(`${API_BASE}/cuentas-contables.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuenta_id: cuentaId,
        codigo_cuenta: datosCuenta.codigo,
        nombre_cuenta: datosCuenta.nombre,
        tipo_cuenta_contable_id: datosCuenta.tipo,
        descripcion: datosCuenta.descripcion,
        activa: datosCuenta.activa,
      }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Cuenta contable actualizada exitosamente",
        "success"
      );
      await cargarCuentasContables();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al actualizar cuenta contable",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error actualizando cuenta contable:", error);
    mostrarNotificacionLocal(
      "Error de conexión al actualizar cuenta contable",
      "error"
    );
    return false;
  }
}

async function eliminarCuentaContable(cuentaId, nombreCuenta) {
  try {
    const response = await fetch(`${API_BASE}/cuentas-contables.php`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuenta_id: cuentaId }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Cuenta contable eliminada exitosamente",
        "success"
      );
      await cargarCuentasContables();
      renderizarTablaCuentasContables();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al eliminar cuenta contable",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error eliminando cuenta contable:", error);
    mostrarNotificacionLocal(
      "Error de conexión al eliminar cuenta contable",
      "error"
    );
    return false;
  }
}

// ============================================================================
// TIPOS DE CUENTA CONTABLE
// ============================================================================

async function cargarTiposCuentaContable() {
  try {
    const response = await fetch(`${API_BASE}/tipo-cuenta-contable.php`);
    const data = await response.json();
    if (data.success) {
      state.tiposCuentaContable = data.data;
      console.log("Tipos de cuenta contable cargados:", state.tiposCuentaContable.length);
      poblarSelectTiposCuenta();
    }
  } catch (error) {
    console.error("Error cargando tipos de cuenta contable:", error);
  }
}

async function cargarCategoriasBalance() {
  try {
    const response = await fetch(`${API_BASE}/categoria-balance.php`);
    const data = await response.json();
    if (data.success) {
      state.categoriasBalance = data.data;
      console.log("Categorías de balance cargadas:", state.categoriasBalance.length);
      poblarSelectCategoriasBalance();
    }
  } catch (error) {
    console.error("Error cargando categorías de balance:", error);
  }
}

async function guardarTipoCuentaContable(datosTipo) {
  try {
    const payload = {
      nombre_tipo_cuenta: datosTipo.nombre,
      categoria_balance_id: datosTipo.categoria_balance_id,
    };

    const response = await fetch(`${API_BASE}/tipo-cuenta-contable.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Tipo de cuenta contable registrado exitosamente",
        "success"
      );
      await cargarTiposCuentaContable();
      renderizarTablaTiposCuenta();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al registrar tipo de cuenta contable",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error guardando tipo de cuenta contable:", error);
    mostrarNotificacionLocal(
      "Error de conexión al guardar tipo de cuenta contable",
      "error"
    );
    return false;
  }
}

async function actualizarTipoCuentaContable(tipoId, datosTipo) {
  try {
    const response = await fetch(`${API_BASE}/tipo-cuenta-contable.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo_cuenta_contable_id: tipoId,
        nombre_tipo_cuenta: datosTipo.nombre,
        categoria_balance_id: datosTipo.categoria_balance_id,
      }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Tipo de cuenta contable actualizado exitosamente",
        "success"
      );
      await cargarTiposCuentaContable();
      renderizarTablaTiposCuenta();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al actualizar tipo de cuenta contable",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error actualizando tipo de cuenta contable:", error);
    mostrarNotificacionLocal(
      "Error de conexión al actualizar tipo de cuenta contable",
      "error"
    );
    return false;
  }
}

async function eliminarTipoCuentaContable(tipoId) {
  try {
    const response = await fetch(`${API_BASE}/tipo-cuenta-contable.php`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo_cuenta_contable_id: tipoId }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Tipo de cuenta contable eliminado exitosamente",
        "success"
      );
      await cargarTiposCuentaContable();
      renderizarTablaTiposCuenta();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al eliminar tipo de cuenta contable",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error eliminando tipo de cuenta contable:", error);
    mostrarNotificacionLocal(
      "Error de conexión al eliminar tipo de cuenta contable",
      "error"
    );
    return false;
  }
}

// ============================================================================
// RENDERIZADO
// ============================================================================

function renderizarTodo() {
  renderizarTablaObligaciones();
  renderizarTablaObligacionesVencidas();
  renderizarHistorialPagos();
  renderizarTablaProveedores();
  renderizarTablaCuentasContables();
}

function renderizarTablaObligaciones() {
  const tbody = document.getElementById("obligationsTableBody");
  if (!tbody) return;

  if (!state.obligaciones || state.obligaciones.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="cxp-table__empty">No hay obligaciones registradas para este mes.</td></tr>';
    return;
  }

  tbody.innerHTML = state.obligaciones
    .map((obl) => {
      const nroDocumento = obl.proveedor_id || "N/A";
      const estadoLabel = obl.estado
        ? obtenerEtiquetaEstado(obl.estado)
        : "Sin periodo";
      const montoPagado = obl.monto_pagado_usd || 0;
      const saldoPendiente =
        obl.saldo_pendiente_usd !== undefined
          ? obl.saldo_pendiente_usd
          : obl.monto_total_usd;
      const esRecurrente =
        obl.frecuencia_pago && obl.frecuencia_pago !== "unico";
      const estaActiva = obl.activa == 1;

      return `
        <tr style="${!estaActiva ? "opacity: 0.6; background: #f9fafb;" : ""}">
            <td>${nroDocumento}</td>
            <td>${obl.proveedor}</td>
            <td>${obl.concepto || "Sin concepto"}</td>
            <td>
                ${obl.frecuencia_pago
          ? obtenerEtiquetaFrecuencia(obl.frecuencia_pago)
          : "Único"
        }
                ${!estaActiva
          ? '<br><small style="color: #dc2626; font-weight: 600;">Culminada</small>'
          : ""
        }
            </td>
            <td>${formatearFecha(obl.fecha_vencimiento)}</td>
            <td>${formatearMoneda(obl.monto_total_usd)}</td>
            <td>${formatearMoneda(montoPagado)}</td>
            <td>${formatearMoneda(saldoPendiente)}</td>
            <td><span class="cxp-status" data-status="${obl.estado || "pendiente"
        }">${estadoLabel}</span></td>
            <td>
                <div class="actions-dropdown">
                    <button type="button" class="actions-dropdown-toggle" onclick="toggleActionsDropdown(event)">
                        <i class="fas fa-ellipsis-v"></i>
                        Acciones
                    </button>
                    <div class="actions-dropdown-menu">
                        <button type="button" class="actions-dropdown-item edit-action" onclick="editarObligacion(${obl.obligacion_id
        })">
                            <i class="fas fa-edit"></i>
                            Editar
                        </button>
                        ${obl.obligacion_periodo_id
          ? `
                            <button type="button" class="actions-dropdown-item payment-action" onclick="abrirModalPagoParaObligacionPeriodo(${obl.obligacion_periodo_id}, ${obl.obligacion_id})">
                                <i class="fas fa-dollar-sign"></i>
                                Registrar pago
                            </button>
                        `
          : ""
        }
                        ${esRecurrente && estaActiva
          ? `
                            <button type="button" class="actions-dropdown-item complete-action" onclick="culminarObligacion(${obl.obligacion_id}, '${obl.concepto}')">
                                <i class="fas fa-check-circle"></i>
                                Culminar
                            </button>
                        `
          : ""
        }
                        ${esRecurrente && !estaActiva
          ? `
                            <button type="button" class="actions-dropdown-item reactivate-action" onclick="reactivarObligacion(${obl.obligacion_id}, '${obl.concepto}')">
                                <i class="fas fa-redo"></i>
                                Reactivar
                            </button>
                        `
          : ""
        }
                        <button type="button" class="actions-dropdown-item delete-action" onclick="eliminarObligacion(${obl.obligacion_id
        }, '${nroDocumento}')">
                            <i class="fas fa-trash"></i>
                            Eliminar
                        </button>
                    </div>
                </div>
            </td>
        </tr>
        `;
    })
    .join("");
}

function renderizarTablaObligacionesVencidas() {
  const tbody = document.getElementById("overdueObligationsTableBody");
  const card = document.getElementById("overdueObligationsCard");
  const countElement = document.getElementById("overdueCount");
  const totalElement = document.getElementById("overdueTotal");

  if (!tbody || !card) return;

  // Filtrar obligaciones vencidas
  const hoy = new Date();
  const vencidas = state.obligaciones
    .map((obl) => {
      const saldoPendiente = parseFloat(
        obl.saldo_pendiente_usd ?? obl.monto_total_usd ?? 0
      );
      return {
        ...obl,
        saldo_calculado: Number.isFinite(saldoPendiente) ? saldoPendiente : 0,
      };
    })
    .filter((obl) => {
      const fechaVenc = new Date(obl.fecha_vencimiento + "T00:00:00");
      return fechaVenc < hoy && obl.saldo_calculado > 0;
    });

  if (vencidas.length === 0) {
    card.style.display = "none";
    return;
  }

  // Mostrar la tarjeta
  card.style.display = "block";

  // Calcular totales
  const totalAdeudado = vencidas.reduce(
    (sum, obl) => sum + obl.saldo_calculado,
    0
  );

  if (countElement) countElement.textContent = vencidas.length;
  if (totalElement) totalElement.textContent = formatearMoneda(totalAdeudado);

  tbody.innerHTML = vencidas
    .map((obl) => {
      const fechaVenc = new Date(obl.fecha_vencimiento + "T00:00:00");
      const diasVencidos = Math.floor(
        (hoy - fechaVenc) / (1000 * 60 * 60 * 24)
      );
      return `
            <tr>
                <td>${obl.numero_documento || 'N/A'}</td>
                <td>${obl.proveedor}</td>
                <td>${obl.concepto}</td>
                <td>${formatearFecha(obl.fecha_vencimiento)}</td>
                <td><span class="cxp-status cxp-status--danger">${diasVencidos} días</span></td>
                <td>${formatearMoneda(parseFloat(obl.monto_total_usd) || 0)}</td>
                <td>${formatearMoneda(parseFloat(obl.monto_pagado_usd) || 0)}</td>
                <td><strong>${formatearMoneda(obl.saldo_calculado)}</strong></td>
                <td><span class="cxp-status" data-status="vencida">Vencida</span></td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger" onclick="abrirModalPagoParaObligacion(${obl.obligacion_id
        })">
                        Registrar pago
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

function renderizarHistorialPagos() {
  const tbody = document.getElementById("paymentsHistoryBody");
  if (!tbody) return;

  if (!state.pagos || state.pagos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="cxp-table__empty">Aún no hay pagos registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = state.pagos
    .map(
      (pago) => `
        <tr>
            <td>${formatearFecha(pago.fecha_pago)}</td>
            <td>${pago.proveedor}</td>
            <td>${pago.numero_documento}</td>
            <td>${pago.metodo_pago || "No especificado"}</td>
            <td>${formatearMoneda(pago.monto_pagado_usd)}</td>
            <td><span class="cxp-status" data-status="${pago.estado
        }">${obtenerEtiquetaEstado(pago.estado)}</span></td>
        </tr>
    `
    )
    .join("");
}

function renderizarTablaProveedores() {
  const tbody = document.getElementById("providersTableBody");
  if (!tbody) return;

  console.log("Renderizando proveedores:", state.proveedores);

  if (!state.proveedores || state.proveedores.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="cxp-table__empty">No hay proveedores registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = state.proveedores
    .map((prov) => {
      const infoBancaria =
        prov.nombre_banco && prov.numero_cuenta
          ? `${prov.nombre_banco} - ${prov.tipo_cuenta || ""} ${prov.numero_cuenta
          }`
          : "No registrado";

      const documento =
        prov.tipo_documento && prov.nro_documento
          ? `${prov.tipo_documento}-${prov.nro_documento}`
          : prov.nro_documento || "Sin documento";

      return `
            <tr>
                <td>${prov.nombre_razon_social}</td>
                <td>${documento}</td>
                <td>
                    <div class="cxp-list__label">${prov.telefono || "Sin teléfono"
        }</div>
                    <div class="cxp-list__meta">${prov.email || "Sin correo"
        }</div>
                </td>
                <td>
                    <div class="cxp-list__label">${infoBancaria}</div>
                    ${prov.titular_cuenta
          ? `<div class="cxp-list__meta">Titular: ${prov.titular_cuenta}</div>`
          : ""
        }
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary-light" onclick="editarProveedor(${prov.proveedor_id
        })" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger-light" onclick="eliminarProveedor(${prov.proveedor_id
        }, '${prov.nombre_razon_social.replace(
          /'/g,
          "\\'"
        )}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

function renderizarTablaCuentasContables() {
  const tbody = document.getElementById("accountsTableBody");
  if (!tbody) return;

  console.log("Renderizando cuentas contables:", state.cuentasContables);

  if (!state.cuentasContables || state.cuentasContables.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="cxp-table__empty">No hay cuentas contables registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = state.cuentasContables
    .map((cuenta) => {
      const estadoBadge = cuenta.activa
        ? '<span class="cxp-status" data-status="aprobada">Activa</span>'
        : '<span class="cxp-status" data-status="anulada">Inactiva</span>';

      const tipoLabel = cuenta.nombre_tipo_cuenta || cuenta.tipo_cuenta || 'N/A';

      return `
            <tr>
                <td><strong>${cuenta.codigo_cuenta}</strong></td>
                <td>${cuenta.nombre_cuenta}</td>
                <td>${tipoLabel}</td>
                <td>${cuenta.descripcion || "Sin descripción"}</td>
                <td>${estadoBadge}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary-light" onclick="editarCuentaContable(${cuenta.cuenta_id
        })" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger-light" onclick="confirmarEliminarCuenta(${cuenta.cuenta_id
        }, '${cuenta.nombre_cuenta.replace(
          /'/g,
          "\\'"
        )}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

function cargarReportes() {
  console.log("Cargando reportes...");
  // Poblar el selector de proveedores en reportes
  const reportProviderSelect = document.getElementById("reportProviderSelect");
  if (reportProviderSelect && state.proveedores) {
    reportProviderSelect.innerHTML =
      '<option value="">Selecciona un proveedor</option>' +
      state.proveedores
        .map(
          (p) =>
            `<option value="${p.proveedor_id}">${p.nombre_razon_social}</option>`
        )
        .join("");
  }

  // Configurar el botón de generar reportes
  const btnGenerateReports = document.getElementById("btnGenerateReports");
  if (btnGenerateReports) {
    btnGenerateReports.onclick = generarReportes;
  }

  // Configurar el selector de proveedores
  if (reportProviderSelect) {
    reportProviderSelect.onchange = function () {
      if (this.value) {
        cargarHistorialProveedor(this.value);
      }
    };
  }
}

async function generarReportes() {
  const rangeStart = document.getElementById("reportRangeStart").value;
  const rangeEnd = document.getElementById("reportRangeEnd").value;

  if (!rangeStart || !rangeEnd) {
    mostrarNotificacionLocal("Selecciona un rango de fechas", "warning");
    return;
  }

  console.log("Generando reportes desde", rangeStart, "hasta", rangeEnd);

  try {
    // Cargar todas las obligaciones del rango de fechas
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);

    // Filtrar obligaciones pendientes (Por Pagar, Pago Parcial)
    const obligacionesPendientes = state.obligaciones
      .filter((o) => {
        const fechaEmision = new Date(o.fecha_emision);
        return (
          (o.estado === "Por Pagar" ||
            o.estado === "Pago Parcial") &&
          fechaEmision >= startDate &&
          fechaEmision <= endDate
        );
      })
      .sort(
        (a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento)
      );

    const reportPendingList = document.getElementById("reportPendingList");
    if (reportPendingList) {
      if (obligacionesPendientes.length === 0) {
        reportPendingList.innerHTML =
          '<li class="cxp-list__empty">No hay obligaciones pendientes en este rango de fechas.</li>';
      } else {
        reportPendingList.innerHTML = obligacionesPendientes
          .map(
            (obl) => `
                    <li>
                        <div class="cxp-list__label"><strong>${obl.proveedor
              }</strong> - ${obl.numero_documento}</div>
                        <div class="cxp-list__meta">Vence: ${formatearFecha(
                obl.fecha_vencimiento
              )} | ${formatearMoneda(
                obl.saldo_pendiente_usd || obl.monto_total_usd
              )}</div>
                    </li>
                `
          )
          .join("");
      }
    }

    // Cargar gastos por cuenta contable
    const gastosPorCuenta = {};
    state.obligaciones.forEach((obl) => {
      const fechaEmision = new Date(obl.fecha_emision);
      if (fechaEmision >= startDate && fechaEmision <= endDate) {
        const cuentaNombre = obl.nombre_cuenta || "Sin cuenta";
        if (!gastosPorCuenta[cuentaNombre]) {
          gastosPorCuenta[cuentaNombre] = 0;
        }
        gastosPorCuenta[cuentaNombre] += parseFloat(obl.monto_total_usd || 0);
      }
    });

    const reportAccountsList = document.getElementById("reportAccountsList");
    if (reportAccountsList) {
      const cuentasArray = Object.entries(gastosPorCuenta);
      if (cuentasArray.length === 0) {
        reportAccountsList.innerHTML =
          '<li class="cxp-list__empty">No hay gastos registrados en este rango de fechas.</li>';
      } else {
        reportAccountsList.innerHTML = cuentasArray
          .sort((a, b) => b[1] - a[1])
          .map(
            ([cuenta, monto]) => `
                        <li>
                            <div class="cxp-list__label"><strong>${cuenta}</strong></div>
                            <div class="cxp-list__meta">${formatearMoneda(
              monto
            )}</div>
                        </li>
                    `
          )
          .join("");
      }
    }

    mostrarNotificacionLocal("Reportes generados exitosamente", "success");
  } catch (error) {
    console.error("Error generando reportes:", error);
    mostrarNotificacionLocal("Error al generar reportes", "error");
  }
}

async function cargarHistorialProveedor(proveedorId) {
  console.log("=== Cargando historial del proveedor ===");
  console.log("Proveedor ID:", proveedorId);

  if (!proveedorId) {
    const reportProviderHistory = document.getElementById(
      "reportProviderHistory"
    );
    if (reportProviderHistory) {
      reportProviderHistory.innerHTML =
        '<tr><td colspan="6" class="cxp-table__empty">Selecciona un proveedor para ver su historial.</td></tr>';
    }
    return;
  }

  try {
    const url = `${API_BASE}/pagos-proveedores.php?proveedor_id=${proveedorId}`;
    console.log("URL de consulta:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("Respuesta completa:", data);
    console.log("Cantidad de pagos:", data.data ? data.data.length : 0);

    const reportProviderHistory = document.getElementById(
      "reportProviderHistory"
    );
    if (reportProviderHistory) {
      if (data.success && data.data && data.data.length > 0) {
        console.log("Renderizando", data.data.length, "pagos");
        reportProviderHistory.innerHTML = data.data
          .map(
            (pago) => `
                    <tr>
                        <td>${formatearFecha(pago.fecha_pago)}</td>
                        <td>${pago.numero_documento}</td>
                        <td>${pago.obligacion_concepto || pago.concepto || "—"
              }</td>
                        <td>${pago.metodo_pago || "No especificado"}</td>
                        <td>${formatearMoneda(pago.monto_pagado_usd)}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-primary-light" onclick="verDetallePagoProveedor(${pago.pago_proveedor_id
              })" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `
          )
          .join("");
      } else {
        console.warn("No hay pagos para este proveedor");
        reportProviderHistory.innerHTML =
          '<tr><td colspan="6" class="cxp-table__empty">No hay pagos registrados para este proveedor.</td></tr>';
      }
    } else {
      console.error("Elemento reportProviderHistory no encontrado");
    }
  } catch (error) {
    console.error("Error cargando historial del proveedor:", error);
    mostrarNotificacionLocal(
      "Error al cargar historial del proveedor",
      "error"
    );
  }
}

function actualizarKPIs(resumen) {
  if (!resumen) return;

  const kpiPendingAmount = document.getElementById("kpiPendingAmount");
  const kpiPendingCount = document.getElementById("kpiPendingCount");
  const kpiPaidAmount = document.getElementById("kpiPaidAmount");
  const kpiPaidCount = document.getElementById("kpiPaidCount");
  const obligationsTotal = document.getElementById("obligationsTotal");
  const obligationsDueSoon = document.getElementById("obligationsDueSoon");

  // Total pendiente por pagar (saldo restante)
  if (kpiPendingAmount)
    kpiPendingAmount.textContent = formatearMoneda(
      resumen.total_pendiente_usd || 0
    );
  if (kpiPendingCount)
    kpiPendingCount.textContent = resumen.cantidad_pendientes || 0;

  // Total pagado
  if (kpiPaidAmount)
    kpiPaidAmount.textContent = formatearMoneda(resumen.total_pagado_usd || 0);
  if (kpiPaidCount) kpiPaidCount.textContent = resumen.cantidad_pagadas || 0;

  // Total registrado en el mes
  if (obligationsTotal)
    obligationsTotal.textContent = formatearMoneda(
      resumen.total_pendiente_usd || 0
    );
  if (obligationsDueSoon)
    obligationsDueSoon.textContent = resumen.cantidad_pendientes || 0;
}

// ============================================================================
// MANEJO DE FORMULARIOS
// ============================================================================

function setupForms() {
  // Formulario de cuentas contables
  const accountForm = document.getElementById("accountForm");
  if (accountForm) {
    accountForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Formulario de cuenta contable enviado");

      const formData = new FormData(accountForm);

      const datos = {
        codigo: formData.get("accountCode"),
        nombre: formData.get("accountName"),
        tipo: formData.get("accountType"),
        descripcion: formData.get("accountDescription"),
        activa: formData.get("accountActive") === "1",
      };

      console.log("Datos de cuenta contable:", datos);

      // Verificar si es una edición o creación nueva
      const editingId = accountForm.dataset.editingId;
      let exito;

      if (editingId) {
        // Es una edición
        exito = await actualizarCuentaContable(editingId, datos);
      } else {
        // Es una creación nueva
        exito = await guardarCuentaContable(datos);
      }

      if (exito) {
        accountForm.reset();
        delete accountForm.dataset.editingId;
        document.getElementById("accountModalTitle").textContent =
          "Registrar cuenta contable";
        cerrarModal("accountModal");
        renderizarTablaCuentasContables();
        poblarSelectCuentas(); // Actualizar select de obligaciones
      }
    });
  }

  // Formulario de tipos de cuenta contable
  const accountTypeForm = document.getElementById("accountTypeForm");
  if (accountTypeForm) {
    accountTypeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Formulario de tipo de cuenta enviado");

      const formData = new FormData(accountTypeForm);

      const datos = {
        nombre: formData.get("accountTypeName"),
        categoria_balance_id: formData.get("accountTypeCategory"),
      };

      console.log("Datos de tipo de cuenta:", datos);

      const editingId = accountTypeForm.dataset.editingId;
      let exito;

      if (editingId) {
        exito = await actualizarTipoCuentaContable(editingId, datos);
      } else {
        exito = await guardarTipoCuentaContable(datos);
      }

      if (exito) {
        accountTypeForm.reset();
        delete accountTypeForm.dataset.editingId;
        poblarSelectTiposCuenta();
      }
    });
  }

  // Botón cancelar en formulario de tipos de cuenta
  const btnCancelAccountType = document.getElementById("btnCancelAccountType");
  if (btnCancelAccountType) {
    btnCancelAccountType.addEventListener("click", () => {
      const accountTypeForm = document.getElementById("accountTypeForm");
      if (accountTypeForm) {
        accountTypeForm.reset();
        delete accountTypeForm.dataset.editingId;
      }
    });
  }

  const providerForm = document.getElementById("providerForm");
  if (providerForm) {
    providerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Formulario de proveedor enviado");

      const formData = new FormData(providerForm);

      const datos = {
        nombre: formData.get("providerName"),
        tipoDocumento: formData.get("providerDocType") || "J",
        nroDocumento: formData.get("providerTaxId"),
        email: formData.get("providerEmail"),
        telefono: formData.get("providerPhone"),
        bancoId: formData.get("providerBank"),
        numeroCuenta: formData.get("providerAccountNumber"),
        titularCuenta: formData.get("providerAccountHolder"),
        notas: formData.get("providerNotes") || "",
      };

      console.log("Datos del proveedor:", datos);

      // Verificar si es una edición o creación nueva
      const editingId = providerForm.dataset.editingId;
      let exito;

      if (editingId) {
        // Es una edición
        exito = await actualizarProveedor(editingId, datos);
      } else {
        // Es una creación nueva
        exito = await guardarProveedor(datos);
      }

      if (exito) {
        providerForm.reset();
        delete providerForm.dataset.editingId;
        document.getElementById("providerModalTitle").textContent =
          "Registrar proveedor";
        cerrarModal("providerModal");
        renderizarTablaProveedores();
      }
    });
  }

  const obligationForm = document.getElementById("obligationForm");
  if (obligationForm) {
    // El campo de frecuencia siempre está visible ahora

    obligationForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Formulario de obligación enviado");

      const formData = new FormData(obligationForm);

      const cuentaId = formData.get("obligationAccount");

      if (!cuentaId) {
        mostrarNotificacionLocal(
          "Debes seleccionar una cuenta contable",
          "error"
        );
        return;
      }

      const datos = {
        proveedorId: formData.get("obligationProvider"),
        cuentaId: cuentaId,
        fechaEmision: formData.get("obligationIssueDate"),
        fechaVencimiento: formData.get("obligationDueDate"),
        montoUSD: formData.get("obligationAmount"),
        concepto: formData.get("obligationConcept"),
        aprobadoPor: formData.get("obligationApprovedBy"),
        fechaAprobacion: formData.get("obligationApprovedDate"),
        frecuenciaPago: formData.get("obligationFrequency") || "mensual",
      };

      console.log("Datos de obligación:", datos);

      // Verificar si es una edición o creación nueva
      const editingId = obligationForm.dataset.editingId;
      let exito;

      if (editingId) {
        // Es una edición
        exito = await actualizarObligacion(editingId, datos);
      } else {
        // Es una creación nueva
        exito = await guardarObligacion(datos);
      }

      if (exito) {
        obligationForm.reset();
        delete obligationForm.dataset.editingId;
        document.getElementById("obligationModalTitle").textContent =
          "Registrar obligación";
        const editIndicator = document.getElementById(
          "obligationEditIndicator"
        );
        if (editIndicator) {
          editIndicator.style.display = "none";
        }
        cerrarModal("obligationModal");
        await cargarObligaciones();
        renderizarTablaObligaciones();
        renderizarTablaObligacionesVencidas();
      }
    });
  }

  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    // Configurar autocompletar documento al seleccionar proveedor
    const paymentProviderSelect = document.getElementById("paymentProvider");
    const paymentDocumentInput = document.getElementById("paymentDocument");

    if (paymentProviderSelect && paymentDocumentInput) {
      paymentProviderSelect.addEventListener("change", async function () {
        const proveedorId = this.value;
        console.log("=== EVENTO CHANGE PROVEEDOR ===");
        console.log("Proveedor seleccionado:", proveedorId);
        console.log("Total obligaciones en state:", state.obligaciones.length);

        // Limpiar el select de obligaciones
        paymentDocumentInput.innerHTML =
          '<option value="">Selecciona una obligación</option>';
        const paymentObligacionIdField = document.getElementById(
          "paymentObligacionId"
        );
        if (paymentObligacionIdField) {
          paymentObligacionIdField.value = "";
        }

        if (proveedorId) {
          // Cargar cuentas bancarias del proveedor seleccionado
          await cargarBancosReceptores(proveedorId);
          // Primero, ver todas las obligaciones de este proveedor
          const todasDelProveedor = state.obligaciones.filter(
            (o) => o.proveedor_id == proveedorId
          );
          console.log(
            "Todas las obligaciones del proveedor:",
            todasDelProveedor
          );

          // Buscar obligaciones pendientes de este proveedor
          const obligacionesProveedor = state.obligaciones.filter((o) => {
            const esDelProveedor = o.proveedor_id == proveedorId;

            // Calcular saldo pendiente de forma más robusta
            const montoPagado = parseFloat(o.monto_pagado_usd) || 0;
            const montoTotal = parseFloat(o.monto_total_usd) || 0;
            const saldoPendiente = parseFloat(o.saldo_pendiente_usd);
            const saldoCalculado = !isNaN(saldoPendiente)
              ? saldoPendiente
              : montoTotal - montoPagado;
            const tieneSaldo = saldoCalculado > 0.01; // Tolerancia para decimales

            // Estados que permiten pago (coinciden con los de la BD)
            const estadosValidos = [
              "Por Pagar",
              "Pago Parcial",
            ];
            const estadoValido = estadosValidos.includes(o.estado);

            console.log(`Obligación ${o.obligacion_id}:`, {
              esDelProveedor,
              tieneSaldo,
              estadoValido,
              estado: o.estado,
              frecuencia: o.frecuencia_pago,
              saldo_pendiente: saldoCalculado,
              monto_pagado: montoPagado,
              monto_total: montoTotal,
            });

            return esDelProveedor && tieneSaldo && estadoValido;
          });

          console.log("Obligaciones filtradas:", obligacionesProveedor);

          if (obligacionesProveedor.length === 0) {
            console.warn("No se encontraron obligaciones pendientes");
            mostrarNotificacionLocal(
              "Este proveedor no tiene obligaciones pendientes de pago",
              "warning"
            );
            return;
          }

          // Poblar select con las obligaciones (información detallada)
          obligacionesProveedor.forEach((o) => {
            const saldoRaw =
              o.saldo_pendiente_usd ||
              o.monto_total_usd - (o.monto_pagado_usd || 0);
            const saldo = parseFloat(saldoRaw) || 0;
            const fechaVenc = formatearFecha(o.fecha_vencimiento);
            const option = document.createElement("option");
            option.value = o.obligacion_id;
            option.textContent = `${o.concepto || 'Sin concepto'
              } | Vence: ${fechaVenc} | Saldo: USD ${saldo.toFixed(2)}`;
            option.dataset.obligacionPeriodoId = o.obligacion_periodo_id || '';
            option.dataset.saldo = saldo;
            option.dataset.concepto = o.concepto || '';
            paymentDocumentInput.appendChild(option);
            console.log("Opción agregada:", option.textContent);
          });

          // Si solo hay una obligación, autoseleccionar
          if (obligacionesProveedor.length === 1) {
            paymentDocumentInput.value = obligacionesProveedor[0].obligacion_id;
            if (paymentObligacionIdField) {
              paymentObligacionIdField.value =
                obligacionesProveedor[0].obligacion_id;
            }
            const amountField = document.getElementById("paymentAmount");
            const documentNumberField = document.getElementById(
              "paymentDocumentNumber"
            );
            if (amountField) {
              const saldoRaw =
                obligacionesProveedor[0].saldo_pendiente_usd ||
                obligacionesProveedor[0].monto_total_usd -
                (obligacionesProveedor[0].monto_pagado_usd || 0);
              const saldo = parseFloat(saldoRaw) || 0;
              amountField.value = saldo.toFixed(2);
            }
            if (documentNumberField) {
              documentNumberField.value =
                obligacionesProveedor[0].proveedor_id || '';
            }
            console.log(
              "Obligación autoseleccionada:",
              obligacionesProveedor[0].obligacion_id
            );
          }
        }
        console.log("=== FIN EVENTO CHANGE ===");
      });

      // Listener para cuando se selecciona una obligación
      paymentDocumentInput.addEventListener("change", function () {
        const obligacionId = this.value;
        const paymentObligacionIdField = document.getElementById(
          "paymentObligacionId"
        );
        const paymentDocumentNumberField = document.getElementById(
          "paymentDocumentNumber"
        );

        if (paymentObligacionIdField) {
          paymentObligacionIdField.value = obligacionId;
        }

        // Autocompletar el monto con el saldo pendiente y mostrar el documento
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.dataset.saldo) {
          const amountField = document.getElementById("paymentAmount");
          if (amountField) {
            amountField.value = parseFloat(
              selectedOption.dataset.saldo
            ).toFixed(2);
          }

          // Mostrar el ID de la obligación periodo
          if (
            paymentDocumentNumberField &&
            selectedOption.dataset.obligacionPeriodoId
          ) {
            paymentDocumentNumberField.value =
              selectedOption.dataset.obligacionPeriodoId;
          }
        }
      });
    }

    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(paymentForm);

      // Obtener el obligacion_periodo_id del dataset del formulario
      const obligacionPeriodoId = paymentForm.dataset.obligacionPeriodoId;
      const obligacionId = paymentForm.dataset.obligacionId;
      const nroDocumento = formData.get("paymentDocumentNumber");

      console.log(
        "Procesando pago - Periodo ID:",
        obligacionPeriodoId,
        "Obligación ID:",
        obligacionId
      );

      if (!obligacionPeriodoId) {
        mostrarNotificacionLocal(
          "No se ha seleccionado un periodo de obligación válido",
          "error"
        );
        return;
      }

      if (!nroDocumento) {
        mostrarNotificacionLocal(
          "Debes ingresar el número de documento",
          "error"
        );
        return;
      }

      // Buscar obligación por ID
      const obligacion = state.obligaciones.find(
        (o) => o.obligacion_id == obligacionId
      );

      if (!obligacion) {
        console.error("Obligación no encontrada con ID:", obligacionId);
        mostrarNotificacionLocal(
          "No se encontró la obligación seleccionada.",
          "error"
        );
        return;
      }

      console.log("Obligación encontrada:", obligacion);

      const montoPago = parseFloat(formData.get("paymentAmount"));
      const saldoPendiente =
        obligacion.saldo_pendiente_usd || obligacion.monto_total_usd;

      // Validar que el monto no exceda el saldo pendiente
      if (montoPago > saldoPendiente) {
        mostrarNotificacionLocal(
          `El monto a pagar (USD ${montoPago}) no puede ser mayor al saldo pendiente (USD ${saldoPendiente})`,
          "error"
        );
        return;
      }

      // Obtener tasa de cambio
      const tasaCambio = parseFloat(formData.get("paymentRate")) || 0;
      const montoBs = tasaCambio > 0 ? montoPago * tasaCambio : 0;

      const metodoPagoId = formData.get("paymentMethod");
      const bancoReceptorId = formData.get("paymentBankReceiver");
      const bancoEmisorId = formData.get("paymentBankIssuer");
      const registradoPor = formData.get("paymentRegisteredBy");
      const notas = formData.get("paymentNotes");

      if (!metodoPagoId) {
        mostrarNotificacionLocal(
          "Debes seleccionar un método de pago",
          "error"
        );
        return;
      }

      if (!bancoReceptorId) {
        mostrarNotificacionLocal(
          "Debes seleccionar el banco receptor (proveedor)",
          "error"
        );
        return;
      }

      if (!bancoEmisorId) {
        mostrarNotificacionLocal(
          "Debes seleccionar el banco emisor (condominio)",
          "error"
        );
        return;
      }

      if (!registradoPor) {
        mostrarNotificacionLocal(
          "Debes indicar quién registra el pago",
          "error"
        );
        return;
      }

      const datos = {
        obligacionPeriodoId: obligacionPeriodoId,
        nroDocumento: nroDocumento,
        metodoPagoId: metodoPagoId,
        bancoReceptorId: bancoReceptorId,
        bancoEmisorId: bancoEmisorId,
        fechaPago: formData.get("paymentDate"),
        montoUSD: montoPago,
        montoBs: montoBs,
        tasaCambio: tasaCambio,
        numeroReferencia: formData.get("paymentReference") || null,
        registradoPor: registradoPor,
        notas: notas || "",
        comprobante: formData.get("paymentReceipt"),
      };

      const exito = await guardarPago(datos, formData);
      if (exito) {
        paymentForm.reset();
        cerrarModal("paymentModal");
        await cargarObligaciones();
        await cargarPagos();
        renderizarTodo();
      }
    });
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getNombreMes(mes) {
  const meses = {
    "01": "Enero",
    "02": "Febrero",
    "03": "Marzo",
    "04": "Abril",
    "05": "Mayo",
    "06": "Junio",
    "07": "Julio",
    "08": "Agosto",
    "09": "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
  };
  return meses[mes] || mes;
}

function poblarSelectProveedores() {
  const selects = ["obligationProvider", "paymentProvider"];
  selects.forEach((id) => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML =
        '<option value="" disabled selected>Selecciona un proveedor</option>' +
        state.proveedores
          .map(
            (p) =>
              `<option value="${p.proveedor_id}">${p.nombre_razon_social}</option>`
          )
          .join("");
    }
  });
}

function poblarSelectCuentas() {
  const select = document.getElementById("obligationAccount");
  if (select && state.cuentasContables && state.cuentasContables.length > 0) {
    // Filtrar solo cuentas activas para el select de obligaciones
    const cuentasActivas = state.cuentasContables.filter((c) => c.activa);
    select.innerHTML =
      '<option value="" disabled selected>Selecciona una cuenta</option>' +
      cuentasActivas
        .map(
          (c) =>
            `<option value="${c.cuenta_id}" data-tipo="${c.nombre_tipo_cuenta || c.tipo_cuenta}">${c.codigo_cuenta} - ${c.nombre_cuenta
            } (${c.nombre_tipo_cuenta || c.tipo_cuenta || 'N/A'})</option>`
        )
        .join("");
    console.log("Cuentas contables cargadas en select:", cuentasActivas.length);

    // Agregar evento para filtrar frecuencias de pago según tipo de cuenta
    select.removeEventListener("change", filtrarFrecuenciasPago);
    select.addEventListener("change", filtrarFrecuenciasPago);
  } else {
    console.warn("No hay cuentas contables disponibles");
  }
}

function filtrarFrecuenciasPago(event) {
  const selectCuenta = event.target;
  const selectedOption = selectCuenta.options[selectCuenta.selectedIndex];
  const tipoCuenta = selectedOption.getAttribute("data-tipo");
  const selectFrecuencia = document.getElementById("obligationFrequency");

  if (!selectFrecuencia) return;

  // Obtener el valor actual antes de modificar las opciones
  const valorActual = selectFrecuencia.value;

  if (tipoCuenta === "gasto_extraordinario") {
    // Solo mostrar "Pago único" para gastos extraordinarios
    selectFrecuencia.innerHTML = '<option value="unico">Pago único</option>';
    selectFrecuencia.value = "unico";
  } else if (tipoCuenta === "gasto_fijo") {
    // Ocultar "Pago único" y mostrar las demás frecuencias para gastos fijos
    selectFrecuencia.innerHTML = `
      <option value="mensual">Mensual</option>
      <option value="bimensual">Bimensual</option>
      <option value="trimestral">Trimestral</option>
      <option value="anual">Anual</option>
    `;
    // Establecer mensual por defecto si el valor actual era "unico"
    selectFrecuencia.value = (valorActual === "unico") ? "mensual" : valorActual;
  } else {
    // Para otros tipos de cuenta (gasto_variable, previsiones), mostrar todas las opciones
    selectFrecuencia.innerHTML = `
      <option value="unico">Pago único</option>
      <option value="mensual">Mensual</option>
      <option value="bimensual">Bimensual</option>
      <option value="trimestral">Trimestral</option>
      <option value="anual">Anual</option>
    `;
    // Intentar mantener el valor actual si existe en las opciones
    if (valorActual) {
      selectFrecuencia.value = valorActual;
    }
  }
}

function poblarSelectProveedoresEnCuentas() {
  const select = document.getElementById("accountName");
  if (select && state.proveedores && state.proveedores.length > 0) {
    select.innerHTML =
      '<option value="" disabled selected>Selecciona un proveedor</option>' +
      state.proveedores
        .map(
          (p) =>
            `<option value="${p.nombre_razon_social}">${p.nombre_razon_social}</option>`
        )
        .join("");
    console.log(
      "Proveedores cargados en select de cuentas:",
      state.proveedores.length
    );
  } else {
    console.warn("No hay proveedores disponibles para cuentas");
  }
}

function poblarSelectMetodosPago() {
  const select = document.getElementById("paymentMethod");
  if (select && state.metodosPago && state.metodosPago.length > 0) {
    select.innerHTML =
      '<option value="" disabled selected>Selecciona método</option>' +
      state.metodosPago
        .map(
          (m) => `<option value="${m.metodo_id}">${m.nombre_metodo}</option>`
        )
        .join("");
    console.log(
      "Métodos de pago cargados en select:",
      state.metodosPago.length
    );
  } else {
    console.warn("No hay métodos de pago disponibles");
  }
}

function poblarSelectBancos() {
  const select = document.getElementById("providerBank");
  if (select && state.bancos && state.bancos.length > 0) {
    select.innerHTML =
      '<option value="" disabled selected>Selecciona un banco</option>' +
      state.bancos
        .map((b) => `<option value="${b.banco_id}">${b.nombre_banco}</option>`)
        .join("");
    console.log("Bancos cargados en select:", state.bancos.length);
  } else {
    console.warn("No hay bancos disponibles");
  }
}

function poblarSelectBancosEmisores() {
  const select = document.getElementById("paymentBankIssuer");
  if (select && state.bancosEmisores && state.bancosEmisores.length > 0) {
    select.innerHTML =
      '<option value="" disabled selected>Selecciona banco emisor</option>' +
      state.bancosEmisores
        .map(
          (be) =>
            `<option value="${be.banco_emisor_gasto_id}">${be.nombre_banco} - ${be.titular_cuenta} (${be.tipo_cuenta} ${be.numero_cuenta})</option>`
        )
        .join("");
    console.log(
      "Bancos emisores cargados en select:",
      state.bancosEmisores.length
    );
  } else {
    if (select) {
      select.innerHTML =
        '<option value="">No hay cuentas emisoras registradas</option>';
    }
    console.warn("No hay bancos emisores disponibles");
  }
}

function poblarSelectBancosReceptores() {
  const select = document.getElementById("paymentBankReceiver");
  if (select && state.bancosReceptores && state.bancosReceptores.length > 0) {
    select.innerHTML =
      '<option value="" disabled selected>Selecciona cuenta del proveedor</option>' +
      state.bancosReceptores
        .map(
          (br) =>
            `<option value="${br.banco_receptor_gasto_id}">${br.nombre_banco} - ${br.tipo_cuenta} ${br.numero_cuenta}</option>`
        )
        .join("");
    console.log(
      "Bancos receptores cargados en select:",
      state.bancosReceptores.length
    );
  } else {
    if (select) {
      select.innerHTML =
        '<option value="">Selecciona primero un proveedor</option>';
    }
    console.warn("No hay bancos receptores disponibles para este proveedor");
  }
}

function poblarSelectTiposCuenta() {
  const select = document.getElementById("accountType");
  if (select && state.tiposCuentaContable && state.tiposCuentaContable.length > 0) {
    select.innerHTML =
      '<option value="">Selecciona tipo</option>' +
      state.tiposCuentaContable
        .map(
          (t) =>
            `<option value="${t.tipo_cuenta_contable_id}">${t.nombre_tipo_cuenta} (${t.nombre_categoria})</option>`
        )
        .join("");
    console.log("Tipos de cuenta cargados en select:", state.tiposCuentaContable.length);
  }
}

function poblarSelectCategoriasBalance() {
  const select = document.getElementById("accountTypeCategory");
  if (select && state.categoriasBalance && state.categoriasBalance.length > 0) {
    select.innerHTML =
      '<option value="">Selecciona categoría</option>' +
      state.categoriasBalance
        .map(
          (c) =>
            `<option value="${c.categoria_balance_id}">${c.nombre_categoria} - ${c.naturaleza_saldo}</option>`
        )
        .join("");
    console.log("Categorías de balance cargadas en select:", state.categoriasBalance.length);
  }
}

function renderizarTablaTiposCuenta() {
  const tbody = document.getElementById("accountTypeTableBody");
  if (!tbody) return;

  if (!state.tiposCuentaContable || state.tiposCuentaContable.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="cxp-table__empty">No hay tipos de cuenta registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = state.tiposCuentaContable
    .map((tipo) => {
      return `
        <tr>
          <td><strong>${tipo.nombre_tipo_cuenta}</strong></td>
          <td>${tipo.nombre_categoria}</td>
          <td>${tipo.naturaleza_saldo}</td>
          <td>
            <button type="button" class="btn btn-sm btn-primary-light" onclick="editarTipoCuenta(${tipo.tipo_cuenta_contable_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger-light" onclick="confirmarEliminarTipoCuenta(${tipo.tipo_cuenta_contable_id}, '${tipo.nombre_tipo_cuenta}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function formatearMoneda(monto) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(monto || 0);
}

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const date = new Date(fecha + "T00:00:00");
  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function obtenerEtiquetaEstado(estado) {
  const etiquetas = {
    "Por Pagar": "Por pagar",
    "Pago Parcial": "Pago parcial",
    "Pagado": "Pagado",
    pendiente_revision: "Pendiente revisión",
    aprobada: "Aprobada",
    programada: "Programada",
    pagada: "Pagada",
    pagado: "Pagado",
    anulada: "Anulada",
    por_pagar: "Por pagar",
    pago_parcial: "Pago parcial",
    vencida: "Vencida",
    registrado: "Registrado",
    confirmado: "Confirmado",
  };
  return etiquetas[estado] || estado;
}

function obtenerEtiquetaFrecuencia(frecuencia) {
  const etiquetas = {
    unico: "Pago único",
    mensual: "Mensual",
    bimensual: "Bimensual",
    trimestral: "Trimestral",
    anual: "Anual",
  };
  return etiquetas[frecuencia] || "Único";
}

function obtenerEtiquetaTipoCuenta(tipo) {
  const etiquetas = {
    gasto_fijo: "Gasto Fijo",
    gasto_variable: "Gasto Variable",
    gasto_extraordinario: "Gasto Extraordinario",
    inversion: "Inversión",
  };
  return etiquetas[tipo] || tipo;
}

function setupModals() {
  const modalButtons = [
    { btnId: "btnOpenProvider", modalId: "providerModal" },
    { btnId: "btnOpenAccount", modalId: "accountModal" },
    { btnId: "btnOpenAccountType", modalId: "accountTypeModal" },
    { btnId: "btnOpenObligation", modalId: "obligationModal" },
    { btnId: "btnOpenPayment", modalId: "paymentModal" },
  ];

  modalButtons.forEach(({ btnId, modalId }) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      console.log(`Configurando botón: ${btnId} para modal: ${modalId}`);
      btn.addEventListener("click", () => {
        console.log(`Abriendo modal: ${modalId}`);
        abrirModal(modalId);

        // Renderizar tabla de tipos de cuenta cuando se abre el modal
        if (modalId === "accountTypeModal") {
          renderizarTablaTiposCuenta();
        }
      });
    } else {
      console.error(`Botón no encontrado: ${btnId}`);
    }
  });

  document.querySelectorAll(".cxp-modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close-modal]")) {
        cerrarModal(modal.id);
      }
    });
  });

  // Configurar pestañas
  setupTabs();
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".cxp-tab");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPanelId = button.getAttribute("data-tab");

      // Remover clase active de todos los botones y paneles
      document
        .querySelectorAll(".cxp-tab")
        .forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".cxp-tab-panel")
        .forEach((panel) => panel.classList.remove("active"));

      // Agregar clase active al botón y panel seleccionados
      button.classList.add("active");
      const targetPanel = document.getElementById(targetPanelId);
      if (targetPanel) {
        targetPanel.classList.add("active");

        // Cargar datos específicos según la pestaña
        if (targetPanelId === "cxpProvidersPanel") {
          renderizarTablaProveedores();
        } else if (targetPanelId === "cxpAccountsPanel") {
          renderizarTablaCuentasContables();
        } else if (targetPanelId === "cxpHistoryPanel") {
          renderizarHistorialPagos();
        } else if (targetPanelId === "cxpReportsPanel") {
          cargarReportes();
        }
      }
    });
  });
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
  }
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");

    // Si es el modal de proveedor, limpiar el dataset de edición
    if (id === "providerModal") {
      const form = document.getElementById("providerForm");
      if (form) {
        delete form.dataset.editingId;
        form.reset();
        document.getElementById("providerModalTitle").textContent =
          "Registrar proveedor";
      }
    }

    // Si es el modal de obligación, limpiar el dataset de edición
    if (id === "obligationModal") {
      const form = document.getElementById("obligationForm");
      if (form) {
        delete form.dataset.editingId;
        form.reset();
        document.getElementById("obligationModalTitle").textContent =
          "Registrar obligación";

        // Ocultar indicador de edición
        const editIndicator = document.getElementById(
          "obligationEditIndicator"
        );
        if (editIndicator) {
          editIndicator.style.display = "none";
        }
      }
    }

    // Si es el modal de pago, limpiar todos los datos
    if (id === "paymentModal") {
      const form = document.getElementById("paymentForm");
      if (form) {
        // Limpiar datasets
        delete form.dataset.obligacionPeriodoId;
        delete form.dataset.obligacionId;
        delete form.dataset.proveedorId;
        delete form.dataset.proveedorNombre;

        // Resetear formulario
        form.reset();

        // Restaurar visibilidad de campos
        const paymentProviderInfoContainer = document.getElementById(
          "paymentProviderInfoContainer"
        );
        const paymentProviderInfo = document.getElementById(
          "paymentProviderInfo"
        );
        const paymentProviderField = document.getElementById(
          "paymentProviderField"
        );
        const paymentDocumentField = document.getElementById(
          "paymentDocumentField"
        );

        if (paymentProviderInfoContainer) {
          paymentProviderInfoContainer.style.display = "none";
        }

        if (paymentProviderInfo) {
          paymentProviderInfo.textContent = "";
        }

        if (paymentProviderField) {
          paymentProviderField.style.display = "block";
        }

        if (paymentDocumentField) {
          paymentDocumentField.style.display = "flex";
        }
      }
    }
  }
}

function setupDatePickers() {
  if (typeof flatpickr === "undefined") return;

  if (flatpickr.l10ns && flatpickr.l10ns.es) {
    flatpickr.localize(flatpickr.l10ns.es);
  }

  document.querySelectorAll("[data-date-picker]").forEach((input) => {
    flatpickr(input, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      allowInput: true,
      locale: "es",
    });
  });
}

function mostrarNotificacionLocal(mensaje, tipo = "info") {
  // Usar la función global de main.js si existe
  if (typeof window.mostrarNotificacion === "function") {
    window.mostrarNotificacion(mensaje, tipo);
  } else {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    alert(mensaje);
  }
}

function volverDashboard() {
  window.location.href = "index.html";
}

// ============================================================================
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN DE PROVEEDORES
// ============================================================================

async function editarProveedor(proveedorId) {
  console.log("Editando proveedor ID:", proveedorId);
  console.log("Proveedores disponibles:", state.proveedores);

  const proveedor = state.proveedores.find(
    (p) => p.proveedor_id == proveedorId
  );

  if (!proveedor) {
    console.error("Proveedor no encontrado. ID buscado:", proveedorId);
    console.error(
      "IDs disponibles:",
      state.proveedores.map((p) => p.proveedor_id)
    );
    mostrarNotificacionLocal(
      "Proveedor no encontrado. Recargando datos...",
      "error"
    );
    await cargarProveedores();
    return;
  }

  console.log("Proveedor encontrado:", proveedor);

  // Llenar el formulario con los datos del proveedor
  document.getElementById("providerName").value = proveedor.nombre_razon_social;
  const docTypeSelect = document.getElementById("providerDocType");
  if (docTypeSelect) {
    docTypeSelect.value = proveedor.tipo_documento || "J";
  }
  document.getElementById("providerTaxId").value = proveedor.nro_documento;
  document.getElementById("providerEmail").value = proveedor.email || "";
  document.getElementById("providerPhone").value = proveedor.telefono || "";
  document.getElementById("providerBank").value = proveedor.banco_id || "";
  document.getElementById("providerAccountNumber").value =
    proveedor.numero_cuenta || "";
  document.getElementById("providerAccountHolder").value =
    proveedor.titular_cuenta || "";
  document.getElementById("providerNotes").value = proveedor.notas || "";

  // Guardar el ID en el formulario para saber que es una edición
  const form = document.getElementById("providerForm");
  form.dataset.editingId = proveedorId;

  // Cambiar el título del modal
  document.getElementById("providerModalTitle").textContent =
    "Editar proveedor";

  // Abrir el modal
  abrirModal("providerModal");
}

async function eliminarProveedor(proveedorId, nombreProveedor) {
  console.log(
    "Eliminando proveedor ID:",
    proveedorId,
    "Nombre:",
    nombreProveedor
  );

  if (
    !confirm(
      `¿Estás seguro de que deseas eliminar el proveedor "${nombreProveedor}"?\n\nEsta acción no se puede deshacer.`
    )
  ) {
    return;
  }

  try {
    console.log("Enviando solicitud DELETE...");
    const response = await fetch(`${API_BASE}/proveedores.php`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proveedor_id: proveedorId }),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      mostrarNotificacionLocal("Proveedor eliminado exitosamente", "success");
      await cargarProveedores();
      renderizarTablaProveedores();
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al eliminar proveedor",
        "error"
      );
    }
  } catch (error) {
    console.error("Error eliminando proveedor:", error);
    mostrarNotificacionLocal(
      "Error de conexión al eliminar proveedor",
      "error"
    );
  }
}

async function editarObligacion(obligacionId) {
  console.log("Editando obligación ID:", obligacionId);
  console.log("Obligaciones disponibles:", state.obligaciones);

  const obligacion = state.obligaciones.find(
    (o) => o.obligacion_id == obligacionId
  );

  if (!obligacion) {
    console.error("Obligación no encontrada. ID buscado:", obligacionId);
    mostrarNotificacionLocal(
      "Obligación no encontrada. Recargando datos...",
      "error"
    );
    await cargarObligaciones();
    return;
  }

  console.log("Obligación encontrada:", obligacion);

  // Llenar el formulario con los datos de la obligación
  document.getElementById("obligationProvider").value = obligacion.proveedor_id;
  if (obligacion.cuenta_id) {
    document.getElementById("obligationAccount").value = obligacion.cuenta_id;
  }
  document.getElementById("obligationIssueDate").value =
    obligacion.fecha_emision;
  document.getElementById("obligationDueDate").value =
    obligacion.fecha_vencimiento;
  document.getElementById("obligationAmount").value =
    obligacion.monto_total_usd;
  document.getElementById("obligationConcept").value =
    obligacion.concepto || "";
  document.getElementById("obligationApprovedBy").value =
    obligacion.aprobado_por || "";
  document.getElementById("obligationApprovedDate").value =
    obligacion.fecha_aprobacion || "";
  document.getElementById("obligationFrequency").value =
    obligacion.frecuencia_pago || "mensual";

  // Guardar el ID en el formulario para saber que es una edición
  const form = document.getElementById("obligationForm");
  form.dataset.editingId = obligacionId;

  // Cambiar el título del modal y mostrar indicador de edición
  document.getElementById("obligationModalTitle").textContent =
    "Editar obligación";
  const editIndicator = document.getElementById("obligationEditIndicator");
  if (editIndicator) {
    editIndicator.style.display = "block";
  }

  // Abrir el modal
  abrirModal("obligationModal");
}

async function culminarObligacion(obligacionId, concepto) {
  console.log("Culminando obligación ID:", obligacionId);

  if (
    !confirm(
      `¿Deseas culminar la obligación "${concepto}"?\n\nEsto evitará que se generen nuevos periodos para esta obligación en meses futuros.`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/obligaciones.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obligacion_id: obligacionId,
        activa: 0,
      }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal("Obligación culminada exitosamente", "success");
      await cargarObligaciones();
      renderizarTablaObligaciones();
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al culminar obligación",
        "error"
      );
    }
  } catch (error) {
    console.error("Error culminando obligación:", error);
    mostrarNotificacionLocal(
      "Error de conexión al culminar obligación",
      "error"
    );
  }
}

async function reactivarObligacion(obligacionId, concepto) {
  console.log("Reactivando obligación ID:", obligacionId);

  if (
    !confirm(
      `¿Deseas reactivar la obligación "${concepto}"?\n\nEsto permitirá que se generen nuevos periodos para esta obligación en meses futuros.`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/obligaciones.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obligacion_id: obligacionId,
        activa: 1,
      }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal("Obligación reactivada exitosamente", "success");
      await cargarObligaciones();
      renderizarTablaObligaciones();
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al reactivar obligación",
        "error"
      );
    }
  } catch (error) {
    console.error("Error reactivando obligación:", error);
    mostrarNotificacionLocal(
      "Error de conexión al reactivar obligación",
      "error"
    );
  }
}

async function eliminarObligacion(obligacionId, numeroDocumento) {
  console.log(
    "Eliminando obligación ID:",
    obligacionId,
    "Documento:",
    numeroDocumento
  );

  if (
    !confirm(
      `¿Estás seguro de que deseas eliminar la obligación "${numeroDocumento}"?\n\nEsta acción no se puede deshacer.`
    )
  ) {
    return;
  }

  try {
    console.log("Enviando solicitud DELETE...");
    const response = await fetch(`${API_BASE}/obligaciones.php`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obligacion_id: obligacionId }),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      mostrarNotificacionLocal("Obligación eliminada exitosamente", "success");
      await cargarObligaciones();
      renderizarTablaObligaciones();
      renderizarTablaObligacionesVencidas();
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al eliminar obligación",
        "error"
      );
    }
  } catch (error) {
    console.error("Error eliminando obligación:", error);
    mostrarNotificacionLocal(
      "Error de conexión al eliminar obligación",
      "error"
    );
  }
}

async function actualizarObligacion(obligacionId, datosObligacion) {
  try {
    console.log("Actualizando obligación...", obligacionId, datosObligacion);

    const response = await fetch(`${API_BASE}/obligaciones.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obligacion_id: obligacionId,
        proveedor_id: datosObligacion.proveedorId,
        cuenta_id: datosObligacion.cuentaId,
        numero_documento: datosObligacion.numeroDocumento,
        fecha_emision: datosObligacion.fechaEmision,
        fecha_vencimiento: datosObligacion.fechaVencimiento,
        monto_total_usd: datosObligacion.montoUSD,
        concepto: datosObligacion.concepto,
        aprobado_por: datosObligacion.aprobadoPor,
        fecha_aprobacion: datosObligacion.fechaAprobacion,
        es_recurrente: datosObligacion.esRecurrente,
        frecuencia_pago: datosObligacion.frecuenciaPago,
        estado: datosObligacion.estado,
        notas: datosObligacion.notas,
      }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal(
        "Obligación actualizada exitosamente",
        "success"
      );
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al actualizar obligación",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error actualizando obligación:", error);
    mostrarNotificacionLocal(
      "Error de conexión al actualizar obligación",
      "error"
    );
    return false;
  }
}

async function actualizarProveedor(proveedorId, datosProveedor) {
  try {
    console.log("Actualizando proveedor...", proveedorId, datosProveedor);

    const response = await fetch(`${API_BASE}/proveedores.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proveedor_id: proveedorId,
        nombre_razon_social: datosProveedor.nombre,
        tipo_documento: datosProveedor.tipoDocumento || "J",
        nro_documento: datosProveedor.nroDocumento,
        email: datosProveedor.email,
        telefono: datosProveedor.telefono,
        notas: datosProveedor.notas,
        estado: "activo",
      }),
    });

    const data = await response.json();

    if (data.success) {
      mostrarNotificacionLocal("Proveedor actualizado exitosamente", "success");
      await cargarProveedores();
      return true;
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al actualizar proveedor",
        "error"
      );
      return false;
    }
  } catch (error) {
    console.error("Error actualizando proveedor:", error);
    mostrarNotificacionLocal(
      "Error de conexión al actualizar proveedor",
      "error"
    );
    return false;
  }
}

// Exponer funciones globales necesarias
window.abrirModalPagoParaObligacionPeriodo = function (
  obligacionPeriodoId,
  obligacionId
) {
  console.log(
    "Abriendo modal de pago para periodo:",
    obligacionPeriodoId,
    "obligación:",
    obligacionId
  );

  const obligacion = state.obligaciones.find(
    (o) => o.obligacion_id == obligacionId
  );

  if (!obligacion) {
    console.error("Obligación no encontrada");
    mostrarNotificacionLocal("Obligación no encontrada", "error");
    return;
  }

  console.log("Obligación encontrada:", obligacion);

  // Guardar el obligacion_periodo_id y datos del proveedor en el formulario
  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    paymentForm.dataset.obligacionPeriodoId = obligacionPeriodoId;
    paymentForm.dataset.obligacionId = obligacionId;
    paymentForm.dataset.proveedorId = obligacion.proveedor_id;
    paymentForm.dataset.proveedorNombre = obligacion.proveedor;
  }

  // Mostrar información del proveedor y ocultar campos de selección
  const paymentProviderInfoContainer = document.getElementById(
    "paymentProviderInfoContainer"
  );
  const paymentProviderInfo = document.getElementById("paymentProviderInfo");
  const paymentProviderField = document.getElementById("paymentProviderField");
  const paymentDocumentField = document.getElementById("paymentDocumentField");

  if (paymentProviderInfoContainer) {
    paymentProviderInfoContainer.style.display = "block";
  }

  if (paymentProviderInfo) {
    paymentProviderInfo.textContent = `Proveedor: ${obligacion.proveedor
      } | Concepto: ${obligacion.concepto || "Sin concepto"}`;
  }

  // Ocultar campos de selección de proveedor y obligación
  if (paymentProviderField) {
    paymentProviderField.style.display = "none";
  }

  if (paymentDocumentField) {
    paymentDocumentField.style.display = "none";
  }

  // Prellenar campos del formulario
  const paymentDocumentNumber = document.getElementById(
    "paymentDocumentNumber"
  );
  if (paymentDocumentNumber) {
    paymentDocumentNumber.value = obligacion.proveedor_id || "";
  }

  const paymentAmount = document.getElementById("paymentAmount");
  if (paymentAmount) {
    const saldo = obligacion.saldo_pendiente_usd || obligacion.monto_total_usd;
    paymentAmount.value = parseFloat(saldo).toFixed(2);
  }

  // Cargar bancos receptores del proveedor
  if (obligacion.proveedor_id) {
    cargarBancosReceptores(obligacion.proveedor_id);
  }

  abrirModal("paymentModal");
};

window.abrirModalPagoParaObligacion = function (obligacionId) {
  console.log("Abriendo modal de pago para obligación:", obligacionId);
  console.log("Obligaciones disponibles:", state.obligaciones);

  const obligacion = state.obligaciones.find(
    (o) => o.obligacion_id == obligacionId
  );

  if (!obligacion) {
    console.error("Obligación no encontrada. ID buscado:", obligacionId);
    console.error(
      "IDs disponibles:",
      state.obligaciones.map((o) => o.obligacion_id)
    );
    mostrarNotificacionLocal(
      "Obligación no encontrada. Recargando datos...",
      "error"
    );
    cargarObligaciones().then(() => {
      console.log("Obligaciones recargadas");
    });
    return;
  }

  console.log("Obligación encontrada:", obligacion);

  const paymentProvider = document.getElementById("paymentProvider");
  const paymentDocument = document.getElementById("paymentDocument");
  const paymentObligacionId = document.getElementById("paymentObligacionId");
  const paymentAmount = document.getElementById("paymentAmount");
  const paymentDocumentNumber = document.getElementById(
    "paymentDocumentNumber"
  );

  if (paymentProvider) {
    paymentProvider.value = obligacion.proveedor_id;
    console.log("Proveedor preseleccionado:", obligacion.proveedor_id);

    // Disparar el evento change para que se carguen las opciones
    const event = new Event("change", { bubbles: true });
    paymentProvider.dispatchEvent(event);
  }

  // Esperar a que se carguen las opciones y luego seleccionar la obligación
  setTimeout(() => {
    if (paymentDocument) {
      paymentDocument.value = obligacion.obligacion_id;
      console.log("Obligación preseleccionada:", obligacion.obligacion_id);
    }

    if (paymentObligacionId) {
      paymentObligacionId.value = obligacion.obligacion_id;
    }

    if (paymentDocumentNumber) {
      paymentDocumentNumber.value = obligacion.obligacion_periodo_id || '';
      console.log("Obligación periodo ID:", obligacion.obligacion_periodo_id);
    }

    if (paymentAmount) {
      const saldoRaw =
        obligacion.saldo_pendiente_usd || obligacion.monto_total_usd;
      const saldo = parseFloat(saldoRaw) || 0;
      paymentAmount.value = saldo.toFixed(2);
      console.log("Monto autocompletado:", saldo);
    }
  }, 150);

  abrirModal("paymentModal");
};

// ============================================================================
// FILTRO DE HISTORIAL Y EXPORTACIÓN PDF
// ============================================================================

function setupHistoryFilter() {
  const yearFilter = document.getElementById("historyYearFilter");
  const monthFilter = document.getElementById("historyMonthFilter");
  const btnBuscar = document.getElementById("btnBuscarHistorial");

  if (!yearFilter || !monthFilter || !btnBuscar) return;

  // Poblar select de años solo con 2026 y 2025
  const availableYears = ["2026", "2025"];
  const currentYear = String(new Date().getFullYear());
  yearFilter.innerHTML = '<option value="">Selecciona</option>';
  let defaultYear = availableYears.includes(currentYear)
    ? currentYear
    : availableYears[0];

  availableYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    if (year === defaultYear) {
      option.selected = true;
    }
    yearFilter.appendChild(option);
  });

  // Seleccionar mes actual por defecto
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  monthFilter.value = currentMonth;

  // Evento del botón buscar
  btnBuscar.addEventListener("click", async function () {
    const anio = yearFilter.value;
    const mes = monthFilter.value;

    console.log("Buscando historial por:", anio, mes);

    if (!anio || !mes) {
      mostrarNotificacionLocal("Selecciona año y mes", "warning");
      return;
    }

    // Cargar pagos del mes seleccionado
    try {
      const response = await fetch(
        `${API_BASE}/pagos-proveedores.php?anio=${anio}&mes=${mes}`
      );
      const data = await response.json();

      if (data.success) {
        state.pagos = data.data;
        state.mesActual = `${anio}-${mes}`;
        renderizarHistorialPagos();
        console.log(
          `Historial actualizado: ${data.data.length} pagos encontrados`
        );

        if (data.data.length === 0) {
          mostrarNotificacionLocal(
            `No hay pagos registrados en ${getNombreMes(mes)} ${anio}`,
            "info"
          );
        } else {
          mostrarNotificacionLocal(
            `Se encontraron ${data.data.length} pagos`,
            "success"
          );
        }
      } else {
        console.error("Error del API:", data);
        const mensajeError = data.message || "Error al cargar pagos";
        mostrarNotificacionLocal(mensajeError, "error");
      }
    } catch (error) {
      console.error("Error completo:", error);
      mostrarNotificacionLocal(`Error de conexión: ${error.message}`, "error");
    }
  });
}

function setupPDFExport() {
  const btnExport = document.getElementById("btnExportPDF");
  if (!btnExport) return;

  btnExport.addEventListener("click", async function () {
    console.log("Generando PDF...");

    if (!state.pagos || state.pagos.length === 0) {
      mostrarNotificacionLocal("No hay pagos para exportar", "warning");
      return;
    }

    // Obtener mes y año de los selectores
    const yearFilter = document.getElementById("historyYearFilter");
    const monthFilter = document.getElementById("historyMonthFilter");
    const anio = yearFilter.value;
    const mes = monthFilter.value;

    if (!anio || !mes) {
      mostrarNotificacionLocal("Selecciona año y mes para exportar", "warning");
      return;
    }

    // Generar PDF
    await generarPDFHistorial(anio, mes, state.pagos);
  });
}

async function generarPDFHistorial(anio, mes, pagos) {
  try {
    // Verificar que jsPDF esté disponible
    if (typeof jspdf === "undefined" && typeof window.jspdf === "undefined") {
      mostrarNotificacionLocal("Cargando generador de PDF...", "info");
      await cargarJsPDF();
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 10;

    // Logo (centrado y más grande)
    const logo = new Image();
    logo.src = "../assets/img/logo_arcorui.png";
    await new Promise((resolve) => {
      logo.onload = resolve;
      logo.onerror = () => {
        console.warn("No se pudo cargar el logo");
        resolve();
      };
    });

    const logoWidth = 80;
    const logoHeight = 32;
    const logoX = (pageWidth - logoWidth) / 2;
    if (logo.complete) {
      doc.addImage(logo, "PNG", logoX, yPos, logoWidth, logoHeight);
    }

    yPos += logoHeight + 12;

    // Título
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIAL DE PAGOS A PROVEEDORES", pageWidth / 2, yPos + 10, {
      align: "center",
    });

    yPos += 30;

    // Información del reporte
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const meses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const nombreMes = meses[parseInt(mes) - 1];

    const fechaGeneracion = new Date();
    const fechaFormateada = `${fechaGeneracion.getDate()}/${fechaGeneracion.getMonth() + 1
      }/${fechaGeneracion.getFullYear()}`;
    const horaFormateada = `${fechaGeneracion.getHours()}:${String(
      fechaGeneracion.getMinutes()
    ).padStart(2, "0")}`;

    doc.text(`Período: ${nombreMes} ${anio}`, margin, yPos);
    doc.text(
      `Fecha de generación: ${fechaFormateada} ${horaFormateada}`,
      margin,
      yPos + 5
    );
    doc.text(`Total de transacciones: ${pagos.length}`, margin, yPos + 10);

    yPos += 20;

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 10;

    // Tabla de pagos
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    // Encabezados
    const colWidths = [25, 50, 30, 30, 25];
    const headers = ["Fecha", "Proveedor", "Documento", "Método", "Monto USD"];
    let xPos = margin;

    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += colWidths[i];
    });

    yPos += 7;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Datos
    doc.setFont("helvetica", "normal");
    let totalUSD = 0;

    pagos.forEach((pago, index) => {
      // Verificar si necesitamos una nueva página
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;

        // Repetir encabezados
        doc.setFont("helvetica", "bold");
        xPos = margin;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos);
          xPos += colWidths[i];
        });
        yPos += 7;
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
      }

      xPos = margin;
      const fecha = formatearFecha(pago.fecha_pago);
      const proveedor = (pago.proveedor || "").substring(0, 25);
      const documento = pago.numero_documento || "";
      const metodo = (pago.metodo_pago || "N/A").substring(0, 15);
      const monto = parseFloat(pago.monto_pagado_usd) || 0;

      doc.text(fecha, xPos, yPos);
      xPos += colWidths[0];
      doc.text(proveedor, xPos, yPos);
      xPos += colWidths[1];
      doc.text(documento, xPos, yPos);
      xPos += colWidths[2];
      doc.text(metodo, xPos, yPos);
      xPos += colWidths[3];
      doc.text(monto.toFixed(2), xPos, yPos);

      totalUSD += monto;
      yPos += 6;
    });

    // Total
    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", pageWidth - margin - 60, yPos);
    doc.text(`USD ${totalUSD.toFixed(2)}`, pageWidth - margin - 25, yPos, {
      align: "right",
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Documento generado automáticamente por el Sistema de Gestión de Cuentas por Pagar",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Guardar PDF
    const nombreArchivo = `Historial_Pagos_${nombreMes}_${anio}.pdf`;
    doc.save(nombreArchivo);

    mostrarNotificacionLocal("PDF generado exitosamente", "success");
  } catch (error) {
    console.error("Error generando PDF:", error);
    mostrarNotificacionLocal("Error al generar el PDF", "error");
  }
}

async function cargarJsPDF() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function editarCuentaContable(cuentaId) {
  console.log("Editando cuenta contable ID:", cuentaId);

  const cuenta = state.cuentasContables.find((c) => c.cuenta_id == cuentaId);

  if (!cuenta) {
    console.error("Cuenta contable no encontrada. ID buscado:", cuentaId);
    mostrarNotificacionLocal(
      "Cuenta contable no encontrada. Recargando datos...",
      "error"
    );
    await cargarCuentasContables();
    return;
  }

  console.log("Cuenta contable encontrada:", cuenta);

  // Llenar el formulario con los datos de la cuenta
  document.getElementById("accountCode").value = cuenta.codigo_cuenta;
  document.getElementById("accountName").value = cuenta.nombre_cuenta;
  document.getElementById("accountType").value = cuenta.tipo_cuenta_contable_id;
  document.getElementById("accountDescription").value =
    cuenta.descripcion || "";
  document.getElementById("accountActive").value = cuenta.activa ? "1" : "0";

  // Guardar el ID en el formulario para saber que es una edición
  const form = document.getElementById("accountForm");
  form.dataset.editingId = cuentaId;

  // Cambiar el título del modal
  document.getElementById("accountModalTitle").textContent =
    "Editar cuenta contable";

  // Abrir el modal
  abrirModal("accountModal");
}

// Función para manejar el dropdown de acciones
function toggleActionsDropdown(event) {
  event.stopPropagation();
  const dropdown = event.currentTarget.closest(".actions-dropdown");
  const isActive = dropdown.classList.contains("active");

  // Cerrar todos los dropdowns abiertos
  document.querySelectorAll(".actions-dropdown.active").forEach((d) => {
    d.classList.remove("active");
  });

  // Toggle el dropdown actual
  if (!isActive) {
    dropdown.classList.add("active");
  }
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener("click", (event) => {
  if (!event.target.closest(".actions-dropdown")) {
    document
      .querySelectorAll(".actions-dropdown.active")
      .forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
  }
});

// Hacer la función global
window.toggleActionsDropdown = toggleActionsDropdown;

async function confirmarEliminarCuenta(cuentaId, nombreCuenta) {
  console.log(
    "Eliminando cuenta contable ID:",
    cuentaId,
    "Nombre:",
    nombreCuenta
  );

  if (
    !confirm(
      `¿Estás seguro de que deseas eliminar la cuenta "${nombreCuenta}"?\n\nEsta acción no se puede deshacer.`
    )
  ) {
    return;
  }

  await eliminarCuentaContable(cuentaId, nombreCuenta);
}

// Función auxiliar para mostrar detalles en el modal
function mostrarDetallePagoEnModal(pago) {
  const setText = (id, texto) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto || "—";
  };

  setText("paymentDetailProvider", pago.proveedor);
  setText("paymentDetailDocument", pago.numero_documento);
  setText("paymentDetailConcept", pago.obligacion_concepto || "—");
  setText("paymentDetailDate", formatearFecha(pago.fecha_pago));
  setText("paymentDetailMethod", pago.metodo_pago || "No especificado");
  setText("paymentDetailStatus", obtenerEtiquetaEstado(pago.estado));
  setText("paymentDetailAmountUsd", formatearMoneda(pago.monto_pagado_usd));
  setText(
    "paymentDetailAmountBs",
    pago.monto_pagado_bs ? formatearMoneda(pago.monto_pagado_bs) : "—"
  );
  setText(
    "paymentDetailRate",
    pago.tasa_cambio_aplicada ? `${pago.tasa_cambio_aplicada} Bs/USD` : "—"
  );

  const bancoEmisor = [pago.banco_condominio, pago.cuenta_condominio]
    .filter(Boolean)
    .join(" - ");
  const bancoReceptor = [pago.banco_proveedor, pago.cuenta_proveedor]
    .filter(Boolean)
    .join(" - ");

  setText("paymentDetailBankIssuer", bancoEmisor || "—");
  setText("paymentDetailBankReceiver", bancoReceptor || "—");
  setText("paymentDetailReference", pago.numero_referencia || "—");
  setText("paymentDetailRegisteredBy", pago.registrado_por || "—");
  setText("paymentDetailNotes", pago.notas || "—");

  const enlaceComprobante = document.getElementById("paymentDetailReceiptLink");
  const placeholderComprobante = document.getElementById(
    "paymentDetailReceiptPlaceholder"
  );

  if (enlaceComprobante && placeholderComprobante) {
    if (pago.documento_respaldo_url) {
      enlaceComprobante.href = pago.documento_respaldo_url;
      enlaceComprobante.style.display = "inline";
      placeholderComprobante.style.display = "none";
    } else {
      enlaceComprobante.style.display = "none";
      placeholderComprobante.style.display = "inline";
    }
  }

  abrirModal("paymentDetailModal");
}

// Función para ver detalles de un pago desde el historial
function verDetallePago(pagoId) {
  const pago = state.pagos.find((p) => p.pago_proveedor_id == pagoId);

  if (!pago) {
    mostrarNotificacionLocal(
      "No se encontraron los datos del pago. Intenta recargar el historial.",
      "error"
    );
    return;
  }

  mostrarDetallePagoEnModal(pago);
}

// Función para ver detalles desde el reporte de proveedor
async function verDetallePagoProveedor(pagoId) {
  try {
    let pago = state.pagos.find((p) => p.pago_proveedor_id == pagoId);

    if (!pago) {
      const response = await fetch(`${API_BASE}/pagos-proveedores.php`);
      const data = await response.json();

      if (data.success && data.data) {
        pago = data.data.find((p) => p.pago_proveedor_id == pagoId);
      }
    }

    if (!pago) {
      mostrarNotificacionLocal(
        "No se encontraron los datos del pago.",
        "error"
      );
      return;
    }

    mostrarDetallePagoEnModal(pago);
  } catch (error) {
    console.error("Error cargando detalles del pago:", error);
    mostrarNotificacionLocal("Error al cargar los detalles del pago", "error");
  }
}

window.editarProveedor = editarProveedor;
window.eliminarProveedor = eliminarProveedor;
window.editarObligacion = editarObligacion;
window.eliminarObligacion = eliminarObligacion;
window.editarCuentaContable = editarCuentaContable;
window.confirmarEliminarCuenta = confirmarEliminarCuenta;
window.volverDashboard = volverDashboard;
window.verDetallePago = verDetallePago;
window.verDetallePagoProveedor = verDetallePagoProveedor;

// ============================================================================
// GENERACIÓN DE RECIBOS DE CONDOMINIO
// ============================================================================

async function cargarApartamentos() {
  try {
    const response = await fetch(`${API_BASE}/apartamentos.php`);
    const data = await response.json();

    if (data.success) {
      state.apartamentos = data.data;
      poblarSelectApartamentos();
    } else {
      console.error("Error cargando apartamentos:", data.message);
    }
  } catch (error) {
    console.error("Error cargando apartamentos:", error);
  }
}

function poblarSelectApartamentos() {
  const select = document.getElementById("reciboApartamento");
  if (!select) return;

  select.innerHTML = '<option value="">Selecciona un apartamento</option>';

  state.apartamentos.forEach((apto) => {
    const nombrePropietario =
      apto.nombre && apto.apellido
        ? `${apto.nombre} ${apto.apellido}`
        : "Sin asignar";
    const label = `${apto.piso} ${apto.apartamento || ""
      } - ${nombrePropietario} (${apto.alicuota}%)`;

    const option = document.createElement("option");
    option.value = apto.apartamento_id;
    option.textContent = label;
    select.appendChild(option);
  });
}

// Configurar botón y modal de recibo
document.addEventListener("DOMContentLoaded", () => {
  const btnGenerarRecibo = document.getElementById("btnGenerarRecibo");
  if (btnGenerarRecibo) {
    btnGenerarRecibo.addEventListener("click", () => {
      abrirModal("reciboModal");
      // Establecer fecha por defecto (hoy)
      const fechaInput = document.getElementById("reciboFecha");
      if (fechaInput && !fechaInput.value) {
        fechaInput.value = new Date().toISOString().split("T")[0];
      }
    });
  }

  const reciboForm = document.getElementById("reciboForm");
  if (reciboForm) {
    reciboForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await generarReciboCondominio();
    });
  }
});

async function generarReciboCondominio() {
  const apartamentoId = document.getElementById("reciboApartamento").value;
  const fecha = document.getElementById("reciboFecha").value;

  if (!apartamentoId || !fecha) {
    mostrarNotificacionLocal("Por favor completa todos los campos", "error");
    return;
  }

  try {
    mostrarNotificacionLocal("Generando recibo...", "info");

    const response = await fetch(
      `${API_BASE}/recibos-condominio.php?apartamento_id=${apartamentoId}&fecha=${fecha}`
    );
    const data = await response.json();

    if (data.success) {
      // Generar PDF con los datos obtenidos
      generarPDFRecibo(data.data);
      cerrarModal("reciboModal");
      mostrarNotificacionLocal("Recibo generado exitosamente", "success");
    } else {
      mostrarNotificacionLocal(
        data.message || "Error al generar recibo",
        "error"
      );
    }
  } catch (error) {
    console.error("Error generando recibo:", error);
    mostrarNotificacionLocal("Error de conexión al generar recibo", "error");
  }
}

function generarPDFRecibo(datos) {
  // Crear ventana para imprimir
  const ventanaImpresion = window.open("", "_blank");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Recibo de Condominio</title>
        <style>
            @page { size: letter; margin: 0.5cm 2cm 0.5cm 0.5cm; } /* Margenes */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 10px; max-width: 8.5in; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #ff0000ff; padding-bottom: 5px; }
            .header h1 { font-size: 15px; margin-bottom: 3px ; font-weight: bold; }
            .header p { font-size: 10px; margin: 1px 0; }
            .header h2 { font-size: 13px; margin-top: 5px; font-weight: bold; }
            .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; font-size: 10px; }
            .info-item { padding: 2px 0; }
            .info-item strong { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #000; padding: 3px 5px; font-size: 10px; }
            th { background-color: #fff; font-weight: bold; text-align: left; }
            .text-right { text-align: right; }
            .section-title { font-weight: bold; background-color: #fff; padding: 5px !important; }
            .total-row { font-weight: bold; background-color: #f5f5f5; }
            .final-total { font-weight: bold; background-color: #e0e0e0; }
            .deuda-table { margin-top: 10px; }
            .deuda-table th { text-align: center; }
            .observaciones { margin-top: 10px; font-size: 10px; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
            @media print {
                body { padding: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Residencias Altamira 0608 ( Gerencia Express, C.A. -)</h1>
            <p>3ra Av. Bis con 8va Transversal. Urb. Altamira. Chacao. Edo. Miranda</p>
            <p>Teléfonos: 0414 026 47 06 / 0414 127 35 32 / Residenciasaltamira0608@gmail.com</p>
            <h2>RECIBO DE CONDOMINIO</h2>
        </div>

        <div class="info-section">
            <div class="info-item"><strong>Apartamento:</strong> ${datos.apartamento.piso
    } ${datos.apartamento.nombre}</div>
            <div class="info-item" style="text-align: end;"><strong>C.I./R.I.F.:</strong> ${datos.propietario.cedula
    }</div>
            <div class="info-item"><strong>Propietario:</strong> ${datos.propietario.nombre
    }</div>
            <div class="info-item" style="text-align: end;"><strong>Recibo Nro.:</strong> 001-${new Date(
      datos.fecha
    )
      .toLocaleDateString("es-VE", { month: "short", year: "2-digit" })
      .toUpperCase()}-25</div>
            <div class="info-item"><strong>Dirección:</strong> 3ra Av. Bis con 8va Transversal. Altamira</div>
            <div class="info-item" style="text-align: end;"><strong>Mes Relacionado:</strong> ${new Date(
        datos.fecha
      )
      .toLocaleDateString("es-VE", { month: "long", year: "numeric" })
      .toUpperCase()}</div>
            <div class="info-item"><strong>Alícuota:</strong> ${parseFloat(
        datos.apartamento.alicuota
      ).toFixed(8)}%</div>
            <div class="info-item" style="text-align: end;"><strong>Fecha Vencimiento:</strong> ${new Date(
        new Date(datos.fecha).getFullYear(),
        new Date(datos.fecha).getMonth() + 1,
        30
      ).toLocaleDateString("es-VE")}</div>
            <div></div>
            <div class="info-item" style="text-align: end;"><strong>Valor del Dólar:</strong> ${datos.tasa_dolar.toFixed(
        2
      )}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th class="text-right">Monto Bs</th>
                    <th class="text-right">Cuota Bs</th>
                    <th class="text-right">Cuota $</th>
                </tr>
            </thead>
            <tbody>
                ${datos.gastos_ordinarios.length > 0
      ? `
                <tr><td colspan="4" class="section-title">Gastos Ordinarios:</td></tr>
                ${datos.gastos_ordinarios
        .map(
          (g) => `
                <tr>
                    <td>${g.concepto}</td>
                    <td class="text-right">${g.monto_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_usd.toFixed(2)}</td>
                </tr>
                `
        )
        .join("")}
                <tr class="total-row">
                    <td>Total Gastos Ordinarios =></td>
                    <td class="text-right">${datos.gastos_ordinarios
        .reduce((sum, g) => sum + g.monto_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.gastos_ordinarios
        .reduce((sum, g) => sum + g.cuota_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.totales.gastos_ordinarios.toFixed(
          2
        )}</td>
                </tr>
                `
      : ""
    }

                ${datos.gastos_extraordinarios.length > 0
      ? `
                <tr><td colspan="4" class="section-title">Gastos Extraordinarios:</td></tr>
                ${datos.gastos_extraordinarios
        .map(
          (g) => `
                <tr>
                    <td>${g.concepto}</td>
                    <td class="text-right">${g.monto_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_usd.toFixed(2)}</td>
                </tr>
                `
        )
        .join("")}
                <tr class="total-row">
                    <td>Total Gastos Extraordinarios =></td>
                    <td class="text-right">${datos.gastos_extraordinarios
        .reduce((sum, g) => sum + g.monto_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.gastos_extraordinarios
        .reduce((sum, g) => sum + g.cuota_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.totales.gastos_extraordinarios.toFixed(
          2
        )}</td>
                </tr>
                `
      : ""
    }

                ${datos.gastos_individuales.length > 0
      ? `
                <tr><td colspan="4" class="section-title">Gastos Individuales:</td></tr>
                ${datos.gastos_individuales
        .map(
          (g) => `
                <tr>
                    <td>${g.concepto}</td>
                    <td class="text-right">${g.monto_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_usd.toFixed(2)}</td>
                </tr>
                `
        )
        .join("")}
                <tr class="total-row">
                    <td>Total Gastos Individuales =></td>
                    <td class="text-right">${datos.gastos_individuales
        .reduce((sum, g) => sum + g.monto_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.gastos_individuales
        .reduce((sum, g) => sum + g.cuota_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.totales.gastos_individuales.toFixed(
          2
        )}</td>
                </tr>
                `
      : ""
    }

                ${datos.previsiones.length > 0
      ? `
                <tr><td colspan="4" class="section-title">Previsiones:</td></tr>
                ${datos.previsiones
        .map(
          (g) => `
                <tr>
                    <td>${g.concepto}</td>
                    <td class="text-right">${g.monto_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_usd.toFixed(2)}</td>
                </tr>
                `
        )
        .join("")}
                <tr class="total-row">
                    <td>Total Previsiones =></td>
                    <td class="text-right">${datos.previsiones
        .reduce((sum, g) => sum + g.monto_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.previsiones
        .reduce((sum, g) => sum + g.cuota_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.totales.previsiones.toFixed(
          2
        )}</td>
                </tr>
                `
      : ""
    }

                ${datos.gastos_variables.length > 0
      ? `
                <tr><td colspan="4" class="section-title">Gastos Variables:</td></tr>
                ${datos.gastos_variables
        .map(
          (g) => `
                <tr>
                    <td>${g.concepto}</td>
                    <td class="text-right">${g.monto_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_bs.toFixed(2)}</td>
                    <td class="text-right">${g.cuota_usd.toFixed(2)}</td>
                </tr>
                `
        )
        .join("")}
                <tr class="total-row">
                    <td>Total Gastos Variables =></td>
                    <td class="text-right">${datos.gastos_variables
        .reduce((sum, g) => sum + g.monto_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.gastos_variables
        .reduce((sum, g) => sum + g.cuota_bs, 0)
        .toFixed(2)}</td>
                    <td class="text-right">${datos.totales.gastos_variables.toFixed(
          2
        )}</td>
                </tr>
                `
      : ""
    }

                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>Cuota Cond.:</strong></td>
                    <td class="text-right"><strong>${(
      (datos.gastos_ordinarios || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_extraordinarios || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_individuales || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.previsiones || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_variables || []).reduce((sum, g) => sum + g.cuota_bs, 0)
    ).toFixed(2)}</strong></td>
                    <td class="text-right"><strong>${(
      datos.totales.gastos_ordinarios +
      datos.totales.gastos_extraordinarios +
      datos.totales.gastos_individuales +
      datos.totales.previsiones +
      datos.totales.gastos_variables
    ).toFixed(2)}</strong></td>
                </tr>
                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>Cuota Extras:</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                </tr>
                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>% Mora:</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                </tr>
                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>Gtos/Cobranza:</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                </tr>
                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>Cuota del Mes:</strong></td>
                    <td class="text-right"><strong>${(
      (datos.gastos_ordinarios || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_extraordinarios || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_individuales || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.previsiones || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_variables || []).reduce((sum, g) => sum + g.cuota_bs, 0)
    ).toFixed(2)}</strong></td>
                    <td class="text-right"><strong>${(
      datos.totales.gastos_ordinarios +
      datos.totales.gastos_extraordinarios +
      datos.totales.gastos_individuales +
      datos.totales.previsiones +
      datos.totales.gastos_variables
    ).toFixed(2)}</strong></td>
                </tr>
                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>Sdo.Ant.Ctas Ord.:</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                </tr>
                <tr class="final-total">
                    <td colspan="2" class="text-right"><strong>Sdo.Ant.CtasExtras:</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                    <td class="text-right"><strong>0.00</strong></td>
                </tr>
                <tr class="final-total" style="background-color: #d0d0d0;">
                    <td colspan="2" class="text-right"><strong>Acumulado:</strong></td>
                    <td class="text-right"><strong>${(
      (datos.gastos_ordinarios || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_extraordinarios || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_individuales || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.previsiones || []).reduce((sum, g) => sum + g.cuota_bs, 0) +
      (datos.gastos_variables || []).reduce((sum, g) => sum + g.cuota_bs, 0)
    ).toFixed(2)}</strong></td>
                    <td class="text-right"><strong>${(
      datos.totales.gastos_ordinarios +
      datos.totales.gastos_extraordinarios +
      datos.totales.gastos_individuales +
      datos.totales.previsiones +
      datos.totales.gastos_variables
    ).toFixed(2)}</strong></td>
                </tr>
            </tbody>
        </table>

        <table class="deuda-table">
            <thead>
                <tr>
                    <th>Saldo Anterior</th>
                    <th>Cuota del Mes</th>
                    <th>Cargos/Abonos</th>
                    <th>Saldo Actual</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-right">0.00</td>
                    <td class="text-right">${(
      datos.totales.gastos_ordinarios +
      datos.totales.gastos_extraordinarios +
      datos.totales.gastos_individuales +
      datos.totales.previsiones +
      datos.totales.gastos_variables
    ).toFixed(2)}</td>
                    <td class="text-right">0.00</td>
                    <td class="text-right">${(
      datos.totales.gastos_ordinarios +
      datos.totales.gastos_extraordinarios +
      datos.totales.gastos_individuales +
      datos.totales.previsiones +
      datos.totales.gastos_variables
    ).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <p style="margin-top: 10px; font-size: 8px; font-weight: bold;">Detalle Deuda Pendiente:</p>

        <div class="observaciones">
            <p><strong>Le recordamos que el recibo de condominio se emite los primero 5 días de cada mes.</strong></p>
            ${datos.banco_receptor ? `
            <p style="margin-top: 8px;"><strong>CUENTA ${datos.banco_receptor.tipo_cuenta.toUpperCase()} ${datos.banco_receptor.nombre_banco.toUpperCase()}</strong></p>
            <p><strong>JUNTA DE CONDOMINIO ALTAMIRA 0608    ${datos.banco_receptor.tipo_documento}-${datos.banco_receptor.nro_documento}</strong></p>
            <p><strong>CUENTA ${datos.banco_receptor.tipo_cuenta.toUpperCase()} EN BOLÍVARES ${datos.banco_receptor.nro_cuenta.replace(/(\d{4})(?=\d)/g, '$1 ')}</strong></p>
            <p><strong>CUENTA EN DIVISAS CASH ${datos.banco_receptor.nro_cuenta_divisa.replace(/(\d{4})(?=\d)/g, '$1 ')}</strong></p>
            ` : ''}
        </div>

        <script>
            window.onload = function() {
                window.print();
            }
        </script>
    </body>
    </html>
    `;

  ventanaImpresion.document.write(html);
  ventanaImpresion.document.close();
}

async function editarTipoCuenta(tipoId) {
  console.log("Editando tipo de cuenta ID:", tipoId);

  const tipo = state.tiposCuentaContable.find((t) => t.tipo_cuenta_contable_id == tipoId);

  if (!tipo) {
    console.error("Tipo de cuenta no encontrado. ID buscado:", tipoId);
    mostrarNotificacionLocal(
      "Tipo de cuenta no encontrado. Recargando datos...",
      "error"
    );
    await cargarTiposCuentaContable();
    return;
  }

  console.log("Tipo de cuenta encontrado:", tipo);

  document.getElementById("accountTypeName").value = tipo.nombre_tipo_cuenta;
  document.getElementById("accountTypeCategory").value = tipo.categoria_balance_id;

  const form = document.getElementById("accountTypeForm");
  form.dataset.editingId = tipoId;
}

async function confirmarEliminarTipoCuenta(tipoId, nombreTipo) {
  console.log(
    "Eliminando tipo de cuenta ID:",
    tipoId,
    "Nombre:",
    nombreTipo
  );

  if (
    !confirm(
      `¿Estás seguro de que deseas eliminar el tipo de cuenta "${nombreTipo}"?\n\nEsta acción no se puede deshacer.`
    )
  ) {
    return;
  }

  await eliminarTipoCuentaContable(tipoId);
}
