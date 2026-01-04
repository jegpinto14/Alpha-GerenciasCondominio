# 📊 Módulo de Registro de Pagos - Arcorui

## 📋 Descripción
Sistema completo para registrar pagos mensuales de las viviendas de la comunidad Arcorui. Permite ingresar pagos en las tablas `pagos` y `pago_detalles` de la base de datos.

## 🗂️ Estructura de Archivos

```
pagos/
├── pagos.html      # Interfaz principal
├── pagos.js        # Lógica JavaScript
├── pagos.php       # API backend
└── subir_comprobante.php # Manejo de archivos
```

## 🚀 Funcionalidades

### ✅ Registro de Pagos
- **Selección de Propietario**: Lista desplegable con todos los propietarios registrados
- **Selección de Inmueble**: Automática según propietario seleccionado
- **Selección de Período**: Meses disponibles para pago
- **Método de Pago**: Transferencia, efectivo, pago móvil, etc.
- **Cálculo Automático**: Monto en Bs según tasa de cambio
- **Subida de Comprobantes**: Soporte para imágenes y PDFs
- **Estados de Pago**: Pendiente, Confirmado, Rechazado

### ✅ Validaciones
- Verificación de pagos duplicados (mismo inmueble + período)
- Validación de montos
- Control de tipos de archivo para comprobantes
- Verificación de propietario/inmueble existente

## 📊 Base de Datos

### Tablas Utilizadas
- `propietarios` - Información de propietarios
- `inmueble` - Datos de las viviendas
- `pagos` - Registro principal de pagos
- `pago_detalles` - Detalles específicos del pago
- `periodos` - Meses disponibles para pago
- `metodos_pago` - Formas de pago disponibles
- `tasas` - Tasas de cambio USD/Bs
- `bancos` - Información bancaria

### Estructura de `pagos`
```sql
CREATE TABLE pagos (
    pago_id INT PRIMARY KEY AUTO_INCREMENT,
    propietario_id INT NOT NULL,
    inmueble_id INT NOT NULL,
    periodo_id INT NOT NULL,
    estado ENUM('Pagado','Pago Parcial','Rechazado','Pendiente') NOT NULL
);
```

### Estructura de `pago_detalles`
```sql
CREATE TABLE pago_detalles (
    pago_detalle_id INT PRIMARY KEY AUTO_INCREMENT,
    pago_id INT NOT NULL,
    metodo_id INT NOT NULL,
    banco_receptor_id INT,
    banco_emisor_id INT,
    monto_usd DECIMAL(10,2) NOT NULL,
    monto_Bs DECIMAL(10,2) NOT NULL,
    tasa_id INT NOT NULL,
    monto_pagado DECIMAL(10,2) NOT NULL,
    comprobante_path VARCHAR(255),
    estado ENUM('Pendiente','Rechazado','Confirmado') NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ Instalación y Configuración

### 1. Estructura de Directorios
Asegúrate de que existan los siguientes directorios:
```
superadmin/
├── pagos/           # Archivos del módulo
├── uploads/
│   └── comprobantes/ # Almacenamiento de comprobantes
└── css/
    └── pagos.css    # Estilos
```

### 2. Permisos
Asegúrate de que el directorio `uploads/comprobantes/` tenga permisos de escritura:
```bash
chmod 755 uploads/comprobantes/
```

### 3. Base de Datos
Verifica que las tablas estén creadas y pobladas:
- `propietarios` con datos
- `inmueble` con referencias válidas
- `periodos` con meses
- `metodos_pago` configurados
- `tasas` con valores actuales
- `bancos` si se usan transferencias

## 🎯 Uso del Sistema

### 1. Acceso
Accede a: `http://localhost/superadmin/pagos/pagos.html`

### 2. Registrar un Pago
1. **Seleccionar Propietario**: Elige de la lista desplegable
2. **Seleccionar Inmueble**: Se carga automáticamente
3. **Elegir Período**: Selecciona el mes a pagar
4. **Método de Pago**: Elige la forma de pago
5. **Ingresar Montos**:
   - Monto en USD (según tipo de vivienda)
   - Se calcula automáticamente el monto en Bs
   - Ingresar monto efectivamente pagado
6. **Bancos** (opcional): Si es transferencia
7. **Comprobante**: Subir imagen o PDF
8. **Estado**: Pendiente/Confirmado/Rechazado
9. **Registrar**: Guardar el pago

### 3. Estados del Pago
- **Pendiente**: Pago registrado, esperando confirmación
- **Confirmado**: Pago verificado y aceptado
- **Rechazado**: Pago no válido o rechazado

## 🔧 APIs Disponibles

### GET /pagos/pagos.php?action=get_propietarios
Retorna lista de propietarios.

### GET /pagos/pagos.php?action=get_inmuebles&propietario_id=X
Retorna inmuebles de un propietario.

### GET /pagos/pagos.php?action=get_periodos
Retorna períodos disponibles.

### GET /pagos/pagos.php?action=get_metodos_pago
Retorna métodos de pago.

### GET /pagos/pagos.php?action=get_tasas
Retorna tasas de cambio.

### GET /pagos/pagos.php?action=get_bancos
Retorna lista de bancos.

### POST /pagos/pagos.php?action=registrar_pago
Registra un nuevo pago con sus detalles.

## 📁 Almacenamiento de Comprobantes

Los comprobantes se almacenan en:
```
uploads/comprobantes/comprobante_[timestamp]_[pago_id].[ext]
```

**Formatos soportados**: JPG, JPEG, PNG, PDF
**Tamaño máximo**: 5MB

## 🚨 Consideraciones de Seguridad

- Validación de tipos de archivo
- Límites de tamaño de archivo
- Nombres de archivo únicos con timestamp
- Verificación de existencia de registros relacionados
- Transacciones de base de datos para integridad

## 🔄 Estados y Flujos

```
Registro → Pendiente → Confirmado/Rechazado
       ↓
   Comprobante subido
```

## 📞 Soporte

Para soporte técnico contactar al administrador del sistema.
