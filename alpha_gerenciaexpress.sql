-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 05, 2026 at 06:43 PM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alpha_gerenciaexpress`
--

DELIMITER $$
--
-- Functions
--
DROP FUNCTION IF EXISTS `calcular_antiguedad`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `calcular_antiguedad` (`fecha_adquirido` DATE) RETURNS INT DETERMINISTIC READS SQL DATA BEGIN
    DECLARE antiguedad INT DEFAULT 0;
    
    IF fecha_adquirido IS NOT NULL THEN
        SET antiguedad = YEAR(CURDATE()) - YEAR(fecha_adquirido);
        
        -- Ajustar si aún no ha llegado el aniversario este año
        IF MONTH(CURDATE()) < MONTH(fecha_adquirido) OR 
           (MONTH(CURDATE()) = MONTH(fecha_adquirido) AND DAY(CURDATE()) < DAY(fecha_adquirido)) THEN
            SET antiguedad = antiguedad - 1;
        END IF;
    END IF;
    
    RETURN antiguedad;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `apartamentos`
--

DROP TABLE IF EXISTS `apartamentos`;
CREATE TABLE IF NOT EXISTS `apartamentos` (
  `apartamento_id` int NOT NULL AUTO_INCREMENT,
  `edificio_id` int NOT NULL,
  `piso` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `apartamento` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `alicuota` decimal(10,2) NOT NULL,
  PRIMARY KEY (`apartamento_id`),
  KEY `tipo_vivienda_id` (`edificio_id`),
  KEY `edificio_id` (`edificio_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `apartamentos`
--

INSERT INTO `apartamentos` (`apartamento_id`, `edificio_id`, `piso`, `apartamento`, `alicuota`) VALUES
(1, 1, 'N-1', 'Sur', 19.56),
(2, 1, 'N-1', 'Norte', 20.08),
(3, 1, 'N-2', '', 22.91),
(4, 1, 'N-3', 'Sur', 18.84),
(5, 1, 'N-3', 'Norte', 18.61);

-- --------------------------------------------------------

--
-- Table structure for table `bancos`
--

DROP TABLE IF EXISTS `bancos`;
CREATE TABLE IF NOT EXISTS `bancos` (
  `banco_id` int NOT NULL AUTO_INCREMENT,
  `codigo_banco` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nombre_banco` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`banco_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `bancos`
--

INSERT INTO `bancos` (`banco_id`, `codigo_banco`, `nombre_banco`) VALUES
(1, '0007', 'BANCO DIGITAL DE LOS TRABAJADORES'),
(2, '0102', 'BANCO DE VENEZUELA'),
(3, '0104', 'BANCO VENEZOLANO DE CRÉDITO'),
(4, '0105', 'BANCO MERCANTIL'),
(5, '0108', 'BBVA PROVINCIAL'),
(6, '0114', 'BANCO DEL CARIBE'),
(7, '0115', 'BANCO EXTERIOR'),
(8, '0116', 'BANCO OCCIDENTAL DE DESCUENTO'),
(9, '0128', 'BANCO CARONÍ'),
(10, '0134', 'BANESCO BANCO UNIVERSAL'),
(11, '0137', 'BANCO SOFITASA'),
(12, '0138', 'BANCO PLAZA'),
(13, '0146', 'BANCO DE LA GENTE EMPRENDEDORA C.A.'),
(14, '0151', 'BFC BANCO FONDO COMÚN'),
(15, '0156', '100% BANCO'),
(16, '0157', 'DELSUR BANCO UNIVERSAL'),
(17, '0163', 'BANCO DEL TESORO'),
(18, '0166', 'BANCO AGRÍCOLA DE VENEZUELA'),
(19, '0168', 'BANCRECER'),
(20, '0169', 'MI BANCO'),
(21, '0171', 'BANCO ACTIVO'),
(22, '0172', 'BANCAMIGA'),
(23, '0174', 'BANPLUS'),
(24, '0175', 'BANCO BICENTENARIO DEL PUEBLO'),
(25, '0177', 'BANFANB'),
(26, '0178', 'BANCO DIGITAL N58'),
(27, '0191', 'BANCO NACIONAL DE CRÉDITO BNC');

-- --------------------------------------------------------

--
-- Table structure for table `banco_emisor`
--

DROP TABLE IF EXISTS `banco_emisor`;
CREATE TABLE IF NOT EXISTS `banco_emisor` (
  `banco_emisor_id` int NOT NULL,
  `banco_id` int NOT NULL,
  `telefono` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tipo_documento` enum('V','J','E') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nro_documento` int NOT NULL,
  `nro_referencia` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Los ultimos 6',
  `fecha_pago` date NOT NULL,
  PRIMARY KEY (`banco_emisor_id`),
  KEY `banco_id` (`banco_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `banco_emisor_gastos`
--

DROP TABLE IF EXISTS `banco_emisor_gastos`;
CREATE TABLE IF NOT EXISTS `banco_emisor_gastos` (
  `banco_emisor_gasto_id` int NOT NULL AUTO_INCREMENT,
  `banco_id` int NOT NULL COMMENT 'FK a tabla bancos existente',
  `nombre_cuenta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nombre identificador de la cuenta del condominio',
  `tipo_cuenta` enum('corriente','ahorro','nomina') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'corriente',
  `numero_cuenta` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Número de cuenta del condominio',
  `titular_cuenta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Condominio Arcorui',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`banco_emisor_gasto_id`),
  KEY `idx_banco` (`banco_id`),
  KEY `idx_activa` (`activa`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Cuentas bancarias del condominio para realizar pagos (3FN)';

--
-- Dumping data for table `banco_emisor_gastos`
--

INSERT INTO `banco_emisor_gastos` (`banco_emisor_gasto_id`, `banco_id`, `nombre_cuenta`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `activa`, `creado_en`, `actualizado_en`) VALUES
(1, 22, 'Gerencias Express', 'corriente', '01720110791105461212', 'Gerencias Express', 1, '2025-12-21 20:02:43', '2025-12-21 20:02:43');

-- --------------------------------------------------------

--
-- Table structure for table `banco_receptor`
--

DROP TABLE IF EXISTS `banco_receptor`;
CREATE TABLE IF NOT EXISTS `banco_receptor` (
  `banco_receptor_id` int NOT NULL AUTO_INCREMENT,
  `banco_id` int NOT NULL,
  `tipo_cuenta` enum('Corriente','Ahorro') NOT NULL,
  `telefono` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tipo_documento` enum('V','J','E') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nro_documento` int NOT NULL,
  `nro_cuenta` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nro_cuenta_divisa` varchar(20) NOT NULL,
  PRIMARY KEY (`banco_receptor_id`),
  KEY `banco_id` (`banco_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `banco_receptor`
--

INSERT INTO `banco_receptor` (`banco_receptor_id`, `banco_id`, `tipo_cuenta`, `telefono`, `tipo_documento`, `nro_documento`, `nro_cuenta`, `nro_cuenta_divisa`) VALUES
(1, 22, 'Corriente', '', 'J', 400235731, '01720110791105461212', '01720110721105456220');

-- --------------------------------------------------------

--
-- Table structure for table `banco_receptor_gastos`
--

DROP TABLE IF EXISTS `banco_receptor_gastos`;
CREATE TABLE IF NOT EXISTS `banco_receptor_gastos` (
  `banco_receptor_gasto_id` int NOT NULL AUTO_INCREMENT,
  `banco_id` int NOT NULL COMMENT 'FK a tabla bancos existente',
  `proveedor_id` int NOT NULL COMMENT 'Proveedor dueño de esta cuenta',
  `tipo_cuenta` enum('corriente','ahorro') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'corriente',
  `numero_cuenta` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Número de cuenta del proveedor',
  `titular_cuenta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`banco_receptor_gasto_id`),
  KEY `idx_proveedor` (`proveedor_id`),
  KEY `idx_banco` (`banco_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Cuentas bancarias de proveedores para recibir pagos (3FN)';

--
-- Dumping data for table `banco_receptor_gastos`
--

INSERT INTO `banco_receptor_gastos` (`banco_receptor_gasto_id`, `banco_id`, `proveedor_id`, `tipo_cuenta`, `numero_cuenta`, `titular_cuenta`, `activa`, `creado_en`) VALUES
(1, 3, 3, 'corriente', '0104001805018012', 'Yosmal Esparragoza', 1, '2025-12-15 16:01:42'),
(2, 20, 4, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(3, 20, 6, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(4, 20, 7, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(5, 20, 8, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(6, 20, 9, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(7, 20, 10, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(8, 20, 11, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(9, 20, 12, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(10, 20, 13, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(11, 20, 14, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(12, 20, 15, 'corriente', '00000000000000000000', 'desconocido', 1, '2025-12-21 02:42:52'),
(13, 22, 16, 'corriente', '01111111111111111111', 'Melvin Pagnini', 1, '2025-12-22 04:06:51');

-- --------------------------------------------------------

--
-- Table structure for table `categoria_balance`
--

DROP TABLE IF EXISTS `categoria_balance`;
CREATE TABLE IF NOT EXISTS `categoria_balance` (
  `categoria_balance_id` int NOT NULL AUTO_INCREMENT,
  `nombre_categoria` varchar(20) NOT NULL,
  `descripcion` varchar(128) NOT NULL,
  `naturaleza_saldo` varchar(20) NOT NULL,
  PRIMARY KEY (`categoria_balance_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `categoria_balance`
--

INSERT INTO `categoria_balance` (`categoria_balance_id`, `nombre_categoria`, `descripcion`, `naturaleza_saldo`) VALUES
(1, 'Activo', 'Bienes, derechos y recursos de la empresa.', 'Deudora'),
(2, 'Pasivo', 'Deudas y obligaciones con terceros.', 'Acreedora'),
(3, 'Patrimonio', 'Capital propio y utilidades retenidas.', 'Acreedora'),
(4, 'Ingreso', 'Entradas por ventas o servicios.', 'Acreedora'),
(5, 'Egreso (Gasto)', 'Gastos operativos y administrativos.', 'Deudora'),
(6, 'Costo', 'Inversión directa en producción o compra de mercancía.', 'Deudora');

-- --------------------------------------------------------

--
-- Table structure for table `categoria_items`
--

DROP TABLE IF EXISTS `categoria_items`;
CREATE TABLE IF NOT EXISTS `categoria_items` (
  `categoria_id` int NOT NULL AUTO_INCREMENT,
  `nombre_categoria` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`categoria_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `cuentas_contables`
--

DROP TABLE IF EXISTS `cuentas_contables`;
CREATE TABLE IF NOT EXISTS `cuentas_contables` (
  `cuenta_id` int NOT NULL AUTO_INCREMENT,
  `codigo_cuenta` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Código único de la cuenta',
  `nombre_cuenta` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nombre de la cuenta contable',
  `tipo_cuenta_contable_id` int NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cuenta_id`),
  UNIQUE KEY `codigo_cuenta` (`codigo_cuenta`),
  KEY `idx_activa` (`activa`),
  KEY `tipo_cuenta_contable_id` (`tipo_cuenta_contable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Catálogo de cuentas contables para clasificar gastos (3FN)';

--
-- Dumping data for table `cuentas_contables`
--

INSERT INTO `cuentas_contables` (`cuenta_id`, `codigo_cuenta`, `nombre_cuenta`, `tipo_cuenta_contable_id`, `descripcion`, `activa`, `creado_en`) VALUES
(1, '008', 'Mantenimiento Sistema Hidroneumatico', 1, '', 1, '2025-12-20 17:32:33'),
(2, '002', 'Electricidad Contrato 10000 1863 909 6', 1, '', 1, '2025-12-21 02:43:59'),
(3, '003', 'Asistente de Mantenimiento', 1, '', 1, '2025-12-21 02:58:06'),
(4, '004', 'Bono de Alimentacion', 1, '', 1, '2025-12-21 02:58:16'),
(5, '005', 'Hidrocapital (NIC 1122439)', 1, '', 1, '2025-12-21 02:59:02'),
(6, '006', 'Mantenimiento Puertas de Estacionamiento', 1, '', 1, '2025-12-21 02:59:40'),
(7, '009', 'Mantenimiento Ascensores', 1, '', 1, '2025-12-21 03:00:50'),
(8, '010', 'Servicio de Vigilancia', 1, '', 1, '2025-12-21 03:01:36'),
(9, '011', 'Telefono de la Garita', 1, '', 1, '2025-12-21 03:01:47'),
(10, '012', 'Liquidacion Prestaciones Renuncia', 3, '', 1, '2025-12-21 03:02:28'),
(11, '013', 'Vacaciones', 3, '', 1, '2025-12-21 03:02:48');

-- --------------------------------------------------------

--
-- Table structure for table `detalle_ingresos`
--

DROP TABLE IF EXISTS `detalle_ingresos`;
CREATE TABLE IF NOT EXISTS `detalle_ingresos` (
  `detalle_id` int NOT NULL,
  `ingreso_id` int NOT NULL,
  `banco_receptor_id` int DEFAULT NULL,
  `banco_emisor_id` int DEFAULT NULL,
  `tasa_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario_usd` decimal(10,2) NOT NULL,
  `total_linea_usd` decimal(10,2) NOT NULL,
  `comprobante_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `fecha_pago` datetime NOT NULL,
  PRIMARY KEY (`detalle_id`) USING BTREE,
  KEY `ingreso_id` (`ingreso_id`),
  KEY `tasa_id` (`tasa_id`),
  KEY `banco_receptor_id` (`banco_receptor_id`),
  KEY `banco_emisor_id` (`banco_emisor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `deuda_propetario`
--

DROP TABLE IF EXISTS `deuda_propetario`;
CREATE TABLE IF NOT EXISTS `deuda_propetario` (
  `id_deuda` int NOT NULL AUTO_INCREMENT,
  `inmueble_id` int NOT NULL,
  `monto_deuda_usd` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_deuda`),
  KEY `inmueble_id` (`inmueble_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `edificios`
--

DROP TABLE IF EXISTS `edificios`;
CREATE TABLE IF NOT EXISTS `edificios` (
  `edificio_id` int NOT NULL AUTO_INCREMENT,
  `nombre_edificio` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `abreviatura` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`edificio_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `edificios`
--

INSERT INTO `edificios` (`edificio_id`, `nombre_edificio`, `abreviatura`) VALUES
(1, 'RESIDENCIAS ALTAMIRA 0608', 'RA-0608');

-- --------------------------------------------------------

--
-- Table structure for table `ingresos`
--

DROP TABLE IF EXISTS `ingresos`;
CREATE TABLE IF NOT EXISTS `ingresos` (
  `ingreso_id` int NOT NULL AUTO_INCREMENT,
  `inmueble_id` int DEFAULT NULL,
  `categoria_id` int NOT NULL,
  `metodo_id` int NOT NULL,
  `creado_el` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('Pendiente','Confirmado','Rechazado') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`ingreso_id`),
  KEY `metodo_id` (`metodo_id`),
  KEY `inmueble_id` (`inmueble_id`),
  KEY `categoria_id` (`categoria_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `inmueble`
--

DROP TABLE IF EXISTS `inmueble`;
CREATE TABLE IF NOT EXISTS `inmueble` (
  `inmueble_id` int NOT NULL AUTO_INCREMENT,
  `propietario_id` int NOT NULL,
  `tipo_vivienda_id` int NOT NULL,
  `tipo_entidad` enum('casa','apartamento','centro_comercial','establecimientos') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `entidad_id` int NOT NULL COMMENT 'ID de la entidad específica (casa_id, apartamento_id, etc.)',
  `fecha_adquirido` date NOT NULL,
  `anio_antiguedad` int NOT NULL,
  PRIMARY KEY (`inmueble_id`),
  UNIQUE KEY `unique_active_assignment` (`tipo_vivienda_id`,`entidad_id`,`tipo_entidad`),
  KEY `idx_tipo_vivienda` (`tipo_vivienda_id`),
  KEY `idx_tipo_entidad` (`tipo_entidad`),
  KEY `idx_entidad_id` (`entidad_id`),
  KEY `idx_user_tipo_activo` (`tipo_vivienda_id`),
  KEY `idx_entidad_tipo` (`tipo_entidad`,`entidad_id`),
  KEY `propietario_id` (`propietario_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COMMENT='Tabla de relación entre usuarios e inmuebles cumpliendo 3FN';

--
-- Dumping data for table `inmueble`
--

INSERT INTO `inmueble` (`inmueble_id`, `propietario_id`, `tipo_vivienda_id`, `tipo_entidad`, `entidad_id`, `fecha_adquirido`, `anio_antiguedad`) VALUES
(2, 1, 1, 'apartamento', 2, '2025-12-01', 0);

--
-- Triggers `inmueble`
--
DROP TRIGGER IF EXISTS `actualizar_antiguedad_insert`;
DELIMITER $$
CREATE TRIGGER `actualizar_antiguedad_insert` BEFORE INSERT ON `inmueble` FOR EACH ROW BEGIN
    IF NEW.fecha_adquirido IS NOT NULL THEN
        SET NEW.anio_antiguedad = calcular_antiguedad(NEW.fecha_adquirido);
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `actualizar_antiguedad_update`;
DELIMITER $$
CREATE TRIGGER `actualizar_antiguedad_update` BEFORE UPDATE ON `inmueble` FOR EACH ROW BEGIN
    IF NEW.fecha_adquirido IS NOT NULL THEN
        SET NEW.anio_antiguedad = calcular_antiguedad(NEW.fecha_adquirido);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
CREATE TABLE IF NOT EXISTS `items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `nombre_item` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `categoria_id` int NOT NULL,
  `costo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `precio` decimal(10,2) NOT NULL DEFAULT '0.00',
  `utilidad` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` int DEFAULT '0',
  `imagen_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `activo` tinyint DEFAULT '1',
  `creado_el` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `categoria_id` (`categoria_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `metodos_pago`
--

DROP TABLE IF EXISTS `metodos_pago`;
CREATE TABLE IF NOT EXISTS `metodos_pago` (
  `metodo_id` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `estado` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`metodo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `metodos_pago`
--

INSERT INTO `metodos_pago` (`metodo_id`, `descripcion`, `estado`) VALUES
(1, 'Pago movil', 1),
(2, 'Efectivo divisa', 1),
(3, 'Efectivo bolivares', 1),
(4, 'Transferencia', 1),
(5, 'Donaciones', 0),
(6, 'Punto de venta debito', 0),
(7, 'Punto de venta credito', 0),
(8, 'Pago Anterior', 1);

-- --------------------------------------------------------

--
-- Table structure for table `movimientos_items`
--

DROP TABLE IF EXISTS `movimientos_items`;
CREATE TABLE IF NOT EXISTS `movimientos_items` (
  `movimiento_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `tipo_movimiento` enum('ENTRADA','SALIDA','AJUSTE','DEVOLUCION') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cantidad` int NOT NULL,
  `fecha_movimiento` datetime DEFAULT CURRENT_TIMESTAMP,
  `ingreso_id` int DEFAULT NULL,
  PRIMARY KEY (`movimiento_id`),
  KEY `producto_id` (`item_id`),
  KEY `ingreso_id` (`ingreso_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `obligaciones`
--

DROP TABLE IF EXISTS `obligaciones`;
CREATE TABLE IF NOT EXISTS `obligaciones` (
  `obligacion_id` int NOT NULL AUTO_INCREMENT,
  `proveedor_id` int NOT NULL,
  `cuenta_id` int DEFAULT NULL COMMENT 'Clasificación contable del gasto',
  `fecha_emision` date NOT NULL COMMENT 'Fecha de emisión del documento',
  `fecha_vencimiento` date NOT NULL COMMENT 'Fecha límite de pago',
  `monto_total_usd` decimal(12,2) NOT NULL COMMENT 'Monto total de la obligación en USD',
  `concepto` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Descripción del gasto',
  `aprobado_por` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Persona que aprobó el gasto',
  `fecha_aprobacion` date DEFAULT NULL,
  `frecuencia_pago` enum('unico','mensual','bimensual','trimestral','anual') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'mensual',
  `activa` tinyint(1) DEFAULT '1' COMMENT 'Indica si la obligación sigue activa para generar periodos futuros',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`obligacion_id`),
  KEY `idx_proveedor` (`proveedor_id`),
  KEY `idx_fecha_vencimiento` (`fecha_vencimiento`),
  KEY `idx_fecha_emision` (`fecha_emision`),
  KEY `idx_obligaciones_proveedor_fecha` (`proveedor_id`,`fecha_emision`),
  KEY `idx_obligaciones_cuenta_fecha` (`cuenta_id`,`fecha_emision`),
  KEY `idx_activa` (`activa`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Obligaciones y facturas pendientes de pago (3FN)';

--
-- Dumping data for table `obligaciones`
--

INSERT INTO `obligaciones` (`obligacion_id`, `proveedor_id`, `cuenta_id`, `fecha_emision`, `fecha_vencimiento`, `monto_total_usd`, `concepto`, `aprobado_por`, `fecha_aprobacion`, `frecuencia_pago`, `activa`, `creado_en`, `actualizado_en`) VALUES
(1, 3, 1, '2025-12-01', '2025-12-31', 150.00, '', 'Alphatec Engineering', '2025-12-20', 'mensual', 1, '2025-12-20 17:43:45', '2025-12-20 17:43:45'),
(3, 9, 6, '2025-12-01', '2025-12-31', 45.02, '', 'Alphatec Engineering', '2025-12-31', 'unico', 1, '2025-12-21 03:23:58', '2025-12-21 03:24:09'),
(4, 8, 8, '2025-12-01', '2025-12-31', 263.65, '', 'Alphatec Engineering', '2025-12-31', 'mensual', 1, '2025-12-21 03:26:37', '2025-12-21 03:26:37'),
(5, 7, 7, '2025-12-01', '2025-12-31', 348.00, '', 'Alphatec Engineering', '2025-12-31', 'mensual', 1, '2025-12-21 04:39:09', '2025-12-21 04:39:09'),
(6, 6, 5, '2025-12-01', '2025-12-31', 16.70, '', 'Alphatec Engineering', '2025-12-31', 'mensual', 1, '2025-12-21 04:40:37', '2025-12-21 04:40:37'),
(8, 4, 2, '2025-12-01', '2025-12-31', 124.00, '', 'Alphatec Engineering', '2025-12-31', 'mensual', 1, '2025-12-21 04:41:32', '2025-12-21 04:41:32'),
(9, 11, 3, '2025-12-21', '2025-12-31', 70.32, '', 'Alphatec Engineering', '2025-12-31', 'mensual', 1, '2025-12-21 04:42:47', '2025-12-21 18:23:34'),
(11, 13, 9, '2025-12-01', '2025-12-31', 13.20, '', 'Alphatec Engineering', '2025-12-21', 'mensual', 1, '2025-12-21 04:44:46', '2025-12-21 04:44:46'),
(12, 14, 10, '2025-12-21', '2026-01-31', 149.21, '', 'Alphatec Engineering', '2025-12-21', 'unico', 1, '2025-12-21 19:50:28', '2025-12-21 20:31:51'),
(23, 14, 11, '2025-12-21', '2025-12-20', 700.00, 'Orangel Ayala', 'melvin', '2025-12-25', 'unico', 1, '2025-12-22 02:15:28', '2025-12-22 04:54:26');

-- --------------------------------------------------------

--
-- Table structure for table `obligacion_periodo`
--

DROP TABLE IF EXISTS `obligacion_periodo`;
CREATE TABLE IF NOT EXISTS `obligacion_periodo` (
  `obligacion_periodo_id` int NOT NULL AUTO_INCREMENT,
  `obligacion_id` int NOT NULL,
  `periodo_id` int NOT NULL,
  `estado` enum('Pagado','Pago Parcial','Por Pagar') NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  PRIMARY KEY (`obligacion_periodo_id`),
  KEY `periodo_id` (`periodo_id`),
  KEY `obligacion_id` (`obligacion_id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `obligacion_periodo`
--

INSERT INTO `obligacion_periodo` (`obligacion_periodo_id`, `obligacion_id`, `periodo_id`, `estado`, `fecha_vencimiento`) VALUES
(1, 9, 12, 'Pagado', '2025-12-31'),
(2, 12, 12, 'Pagado', '2025-12-31'),
(3, 1, 12, 'Por Pagar', '2025-12-31'),
(5, 3, 12, 'Por Pagar', '2025-12-31'),
(6, 4, 12, 'Por Pagar', '2025-12-31'),
(7, 5, 12, 'Por Pagar', '2025-12-31'),
(8, 6, 12, 'Por Pagar', '2025-12-31'),
(9, 8, 12, 'Por Pagar', '2025-12-31'),
(11, 11, 12, 'Por Pagar', '2025-12-31'),
(12, 23, 12, 'Pago Parcial', '2025-12-20'),
(13, 9, 13, 'Por Pagar', '2026-01-31'),
(14, 12, 13, 'Por Pagar', '2026-01-31'),
(15, 23, 13, 'Por Pagar', '2026-01-20'),
(16, 1, 13, 'Por Pagar', '2026-01-31'),
(17, 3, 13, 'Por Pagar', '2026-01-31'),
(18, 4, 13, 'Por Pagar', '2026-01-31'),
(19, 5, 13, 'Por Pagar', '2026-01-31'),
(20, 6, 13, 'Por Pagar', '2026-01-31'),
(21, 8, 13, 'Por Pagar', '2026-01-31'),
(22, 11, 13, 'Por Pagar', '2026-01-31'),
(23, 9, 14, 'Por Pagar', '2026-02-28'),
(24, 12, 14, 'Por Pagar', '2026-02-28'),
(25, 23, 14, 'Por Pagar', '2026-02-20'),
(26, 1, 14, 'Por Pagar', '2026-02-28'),
(27, 3, 14, 'Por Pagar', '2026-02-28'),
(28, 4, 14, 'Por Pagar', '2026-02-28'),
(29, 5, 14, 'Por Pagar', '2026-02-28'),
(30, 6, 14, 'Por Pagar', '2026-02-28'),
(31, 8, 14, 'Por Pagar', '2026-02-28'),
(32, 11, 14, 'Por Pagar', '2026-02-28'),
(33, 9, 11, 'Por Pagar', '2025-11-30'),
(34, 12, 11, 'Por Pagar', '2025-11-30'),
(35, 23, 11, 'Por Pagar', '2025-11-20'),
(36, 1, 11, 'Por Pagar', '2025-11-30'),
(37, 3, 11, 'Por Pagar', '2025-11-30'),
(38, 4, 11, 'Por Pagar', '2025-11-30'),
(39, 5, 11, 'Por Pagar', '2025-11-30'),
(40, 6, 11, 'Por Pagar', '2025-11-30'),
(41, 8, 11, 'Por Pagar', '2025-11-30'),
(42, 11, 11, 'Por Pagar', '2025-11-30'),
(43, 9, 15, 'Por Pagar', '2026-03-31'),
(44, 1, 15, 'Por Pagar', '2026-03-31'),
(45, 4, 15, 'Por Pagar', '2026-03-31'),
(46, 5, 15, 'Por Pagar', '2026-03-31'),
(47, 6, 15, 'Por Pagar', '2026-03-31'),
(48, 8, 15, 'Por Pagar', '2026-03-31'),
(49, 11, 15, 'Por Pagar', '2026-03-31');

-- --------------------------------------------------------

--
-- Table structure for table `pagos`
--

DROP TABLE IF EXISTS `pagos`;
CREATE TABLE IF NOT EXISTS `pagos` (
  `pago_id` int NOT NULL AUTO_INCREMENT,
  `propietario_id` int NOT NULL,
  `inmueble_id` int NOT NULL,
  `periodo_id` int NOT NULL,
  `estado` enum('Pagado','Pago Parcial','Rechazado','Pendiente') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`pago_id`),
  KEY `propietario_id` (`propietario_id`),
  KEY `inmueble_id` (`inmueble_id`),
  KEY `periodo_cubierto` (`periodo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `pagos_proveedores`
--

DROP TABLE IF EXISTS `pagos_proveedores`;
CREATE TABLE IF NOT EXISTS `pagos_proveedores` (
  `pago_proveedor_id` int NOT NULL AUTO_INCREMENT,
  `obligacion_periodo_id` int NOT NULL,
  `metodo_id` int NOT NULL COMMENT 'FK a tabla metodos_pago existente',
  `nro_documento` int NOT NULL,
  `banco_receptor_gasto_id` int DEFAULT NULL COMMENT 'Cuenta bancaria del proveedor',
  `banco_emisor_gasto_id` int DEFAULT NULL COMMENT 'Cuenta bancaria del condominio',
  `tasa_cambio_aplicada` decimal(10,2) DEFAULT NULL COMMENT 'Tasa de cambio aplicada al momento del pago',
  `fecha_pago` date NOT NULL,
  `monto_pagado_usd` decimal(12,2) NOT NULL COMMENT 'Monto pagado en USD',
  `monto_pagado_bs` decimal(15,2) DEFAULT NULL COMMENT 'Monto pagado en Bs (valor histórico)',
  `numero_referencia` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Número de referencia bancaria',
  `documento_respaldo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Ruta del comprobante escaneado',
  `estado` enum('registrado','confirmado','anulado') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'registrado',
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `registrado_por` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Usuario que registró el pago',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pago_proveedor_id`),
  UNIQUE KEY `obligacion_periodo_id` (`obligacion_periodo_id`),
  KEY `metodo_id` (`metodo_id`),
  KEY `banco_receptor_gasto_id` (`banco_receptor_gasto_id`),
  KEY `banco_emisor_gasto_id` (`banco_emisor_gasto_id`),
  KEY `idx_fecha_pago` (`fecha_pago`),
  KEY `idx_estado` (`estado`),
  KEY `idx_pagos_proveedor_fecha` (`fecha_pago`),
  KEY `idx_pagos_obligacion_estado` (`estado`),
  KEY `nro_documento` (`nro_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Historial de pagos realizados a proveedores (3FN)';

--
-- Dumping data for table `pagos_proveedores`
--

INSERT INTO `pagos_proveedores` (`pago_proveedor_id`, `obligacion_periodo_id`, `metodo_id`, `nro_documento`, `banco_receptor_gasto_id`, `banco_emisor_gasto_id`, `tasa_cambio_aplicada`, `fecha_pago`, `monto_pagado_usd`, `monto_pagado_bs`, `numero_referencia`, `documento_respaldo_url`, `estado`, `notas`, `registrado_por`, `creado_en`, `actualizado_en`) VALUES
(1, 1, 3, 11, 8, 1, 50.00, '2025-12-21', 70.32, 3516.00, '1234', '../uploads/comprobantes_proveedores/comprobante_1766370256_6948abd0dc6bc.png', 'registrado', NULL, 'melvin', '2025-12-22 02:24:16', '2025-12-22 02:24:16'),
(2, 2, 2, 14, 11, 1, 233.00, '2025-12-21', 149.21, 34765.93, '1234', '../uploads/comprobantes_proveedores/comprobante_1766375283_6948bf73e7956.png', 'registrado', NULL, '2323', '2025-12-22 03:48:03', '2025-12-22 03:48:03'),
(3, 12, 2, 14, 11, 1, 400.00, '2025-12-22', 350.00, 140000.00, '1234', '../uploads/comprobantes_proveedores/comprobante_1766376317_6948c37d49eb2.png', 'registrado', NULL, 'huhu', '2025-12-22 04:05:17', '2025-12-22 04:05:17');

-- --------------------------------------------------------

--
-- Table structure for table `pago_detalles`
--

DROP TABLE IF EXISTS `pago_detalles`;
CREATE TABLE IF NOT EXISTS `pago_detalles` (
  `pago_detalle_id` int NOT NULL AUTO_INCREMENT,
  `pago_id` int NOT NULL,
  `metodo_id` int NOT NULL,
  `banco_receptor_id` int DEFAULT NULL,
  `banco_emisor_id` int DEFAULT NULL,
  `monto_usd` decimal(10,2) NOT NULL DEFAULT '0.00',
  `monto_Bs` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tasa_id` int NOT NULL,
  `monto_pagado` decimal(10,2) NOT NULL DEFAULT '0.00',
  `comprobante_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `estado` enum('Pendiente','Rechazado','Confirmado') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pago_detalle_id`),
  KEY `pago_id` (`pago_id`),
  KEY `metodo_id` (`metodo_id`),
  KEY `banco_receptor_id` (`banco_receptor_id`),
  KEY `banco_emisor_id` (`banco_emisor_id`),
  KEY `tasa_id` (`tasa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `periodos`
--

DROP TABLE IF EXISTS `periodos`;
CREATE TABLE IF NOT EXISTS `periodos` (
  `periodo_id` int NOT NULL AUTO_INCREMENT,
  `fecha_periodo` date NOT NULL,
  PRIMARY KEY (`periodo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `periodos`
--

INSERT INTO `periodos` (`periodo_id`, `fecha_periodo`) VALUES
(1, '2025-01-01'),
(2, '2025-02-01'),
(3, '2025-03-01'),
(4, '2025-04-01'),
(5, '2025-05-01'),
(6, '2025-06-01'),
(7, '2025-07-01'),
(8, '2025-08-01'),
(9, '2025-09-01'),
(10, '2025-10-01'),
(11, '2025-11-01'),
(12, '2025-12-01'),
(13, '2026-01-01'),
(14, '2026-02-01'),
(15, '2026-03-01'),
(16, '2026-04-01'),
(17, '2026-05-01'),
(18, '2026-06-01'),
(19, '2026-07-01'),
(20, '2026-08-01'),
(21, '2026-09-01'),
(22, '2026-10-01'),
(23, '2026-11-01'),
(24, '2026-12-01'),
(25, '2027-01-01'),
(26, '2027-02-01'),
(27, '2027-03-01'),
(28, '2027-04-01'),
(29, '2027-05-01'),
(30, '2027-06-01'),
(31, '2027-07-01'),
(32, '2027-08-01'),
(33, '2027-09-01'),
(34, '2027-10-01'),
(35, '2027-11-01'),
(36, '2027-12-01'),
(37, '2028-01-01'),
(38, '2028-02-01'),
(39, '2028-03-01'),
(40, '2028-04-01'),
(41, '2028-05-01'),
(42, '2028-06-01'),
(43, '2028-07-01'),
(44, '2028-08-01'),
(45, '2028-09-01'),
(46, '2028-10-01'),
(47, '2028-11-01'),
(48, '2028-12-01'),
(49, '2029-01-01'),
(50, '2029-02-01'),
(51, '2029-03-01'),
(52, '2029-04-01'),
(53, '2029-05-01'),
(54, '2029-06-01'),
(55, '2029-07-01'),
(56, '2029-08-01'),
(57, '2029-09-01'),
(58, '2029-10-01'),
(59, '2029-11-01'),
(60, '2029-12-01'),
(61, '2030-01-01'),
(62, '2030-02-01'),
(63, '2030-03-01'),
(64, '2030-04-01'),
(65, '2030-05-01'),
(66, '2030-06-01'),
(67, '2030-07-01'),
(68, '2030-08-01'),
(69, '2030-09-01'),
(70, '2030-10-01'),
(71, '2030-11-01'),
(72, '2030-12-01');

-- --------------------------------------------------------

--
-- Table structure for table `propietarios`
--

DROP TABLE IF EXISTS `propietarios`;
CREATE TABLE IF NOT EXISTS `propietarios` (
  `propietario_id` int NOT NULL AUTO_INCREMENT,
  `active_inmueble_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `nombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `apellido` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nro_documento` int NOT NULL,
  `gmail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `telefono` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`propietario_id`),
  UNIQUE KEY `cedula` (`nro_documento`),
  KEY `idx_cedula` (`nro_documento`),
  KEY `idx_gmail` (`gmail`),
  KEY `user_id` (`user_id`),
  KEY `fk_propietarios_active_inmueble` (`active_inmueble_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `propietarios`
--

INSERT INTO `propietarios` (`propietario_id`, `active_inmueble_id`, `user_id`, `nombre`, `apellido`, `nro_documento`, `gmail`, `telefono`, `fecha_registro`) VALUES
(1, NULL, 3, 'Melvin', 'Pagnini', 30526656, 'panilesmelvin@gmail.com', '04241692238', '2025-12-14 05:04:04'),
(4, NULL, 1, 'Usuario', 'Sin Registrar', 0, '', '0000000000', '2025-12-20 14:52:18');

-- --------------------------------------------------------

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
CREATE TABLE IF NOT EXISTS `proveedores` (
  `proveedor_id` int NOT NULL AUTO_INCREMENT,
  `nombre_razon_social` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nombre o razón social del proveedor',
  `tipo_documento` enum('V','J','E') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nro_documento` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'nro documento del proveedor',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `telefono` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Observaciones adicionales',
  `estado` enum('activo','inactivo') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'activo' COMMENT 'Estado del proveedor',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`proveedor_id`),
  UNIQUE KEY `rif` (`nro_documento`),
  KEY `idx_rif` (`nro_documento`),
  KEY `idx_estado` (`estado`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Proveedores externos del condominio (3FN)';

--
-- Dumping data for table `proveedores`
--

INSERT INTO `proveedores` (`proveedor_id`, `nombre_razon_social`, `tipo_documento`, `nro_documento`, `email`, `telefono`, `notas`, `estado`, `creado_en`, `actualizado_en`) VALUES
(3, 'ADMINISTRACION', 'J', '65481932', 'gerenciaexpress2014@gmail.com', '04140264706', 'Otro numero de telefono: 0212-5765482\n\nNumero de emergencia: 0424-1434605\n', 'activo', '2025-12-15 16:01:42', '2025-12-22 00:41:07'),
(4, 'Electricidad Contrato 10000 1863 909 6', 'J', '0000000000', 'electricidad@gmail.com', '00000000000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(6, 'Hidrocapital (NIC 1122439)', 'J', '1000000000', 'Hidrocapital@gmail.com', '10000000000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(7, 'Mantenimiento Ascensores', 'J', '1100000000', 'Mantenimiento_ascensores@gmail.com', '11000000000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(8, 'Servicio de Vigilancia', 'J', '1110000000', 'Servicio_de_Vigilancia@gmail.com', '11100000000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(9, 'Mantenimiento Puertas de Estacionamiento', 'J', '1111000000', 'correo@gmail.com', '11110000000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(10, 'Mantenimiento Sistema Hidroneumatico', 'J', '1111100000', 'correo@gmail.com', '11111000000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(11, 'Asistente de Mantenimiento', 'J', '1111110000', 'correo@gmail.com', '11111100000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(12, 'Bono de Alimentacion', 'J', '1111111000', 'correo@gmail.com', '11111110000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(13, 'Telefono de la Garita', 'J', '1111111100', 'correo@gmail.com', '11111111000', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(14, 'Orangel Ayala', 'J', '1111111110', 'correo@gmail.com', '11111111100', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(15, 'Vacaciones', 'J', '1111111111', 'correo@gmail.com', '11111111110', 'Se debe modificar y colocar los datos reales de este proveedor de gasto', 'activo', '2025-12-21 02:42:52', '2025-12-22 00:41:07'),
(16, 'Melvin Pagnini ', 'V', '30526656', 'panilesmelvin@gmail.com', '04241692238', '', 'activo', '2025-12-22 04:06:51', '2025-12-22 04:06:51');

-- --------------------------------------------------------

--
-- Table structure for table `reclamos`
--

DROP TABLE IF EXISTS `reclamos`;
CREATE TABLE IF NOT EXISTS `reclamos` (
  `reclamos_id` int NOT NULL AUTO_INCREMENT,
  `inmueble_id` int NOT NULL,
  `Descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `Estado` enum('Recibido','Pendiente') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `fecha` datetime NOT NULL,
  PRIMARY KEY (`reclamos_id`),
  KEY `inmueble_id` (`inmueble_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `rol_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`rol_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`rol_id`, `nombre`) VALUES
(1, 'superadmin'),
(2, 'admin'),
(3, 'user');

-- --------------------------------------------------------

--
-- Table structure for table `solicitudes_cartas`
--

DROP TABLE IF EXISTS `solicitudes_cartas`;
CREATE TABLE IF NOT EXISTS `solicitudes_cartas` (
  `carta_id` int NOT NULL AUTO_INCREMENT,
  `inmueble_id` int NOT NULL,
  `item_id` int NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `estado` enum('Pendiente','Aprobada','Rechazada','Pagada') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `fecha` datetime NOT NULL,
  PRIMARY KEY (`carta_id`),
  KEY `inmueble_id` (`inmueble_id`),
  KEY `item_id` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `tasas`
--

DROP TABLE IF EXISTS `tasas`;
CREATE TABLE IF NOT EXISTS `tasas` (
  `tasa_id` int NOT NULL AUTO_INCREMENT,
  `tasa` decimal(10,2) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tasa_id`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `tasas`
--

INSERT INTO `tasas` (`tasa_id`, `tasa`, `fecha`) VALUES
(1, 0.00, '2025-10-11 05:29:29'),
(2, 195.25, '2025-10-11 07:11:57'),
(3, 195.25, '2025-10-12 19:02:03'),
(4, 195.25, '2025-10-13 13:18:05'),
(5, 197.25, '2025-10-14 06:00:24'),
(6, 199.11, '2025-10-15 06:00:06'),
(7, 201.47, '2025-10-16 06:00:42'),
(8, 203.74, '2025-10-17 06:00:06'),
(9, 205.68, '2025-10-18 06:00:07'),
(10, 205.68, '2025-10-19 06:00:05'),
(11, 205.68, '2025-10-20 06:00:20'),
(12, 207.89, '2025-10-21 06:00:07'),
(13, 210.28, '2025-10-22 06:00:05'),
(14, 195.25, '2025-10-12 19:02:03'),
(15, 195.25, '2025-10-13 13:18:05'),
(16, 197.25, '2025-10-14 06:00:24'),
(17, 199.11, '2025-10-15 06:00:06'),
(18, 201.47, '2025-10-16 06:00:42'),
(19, 203.74, '2025-10-17 06:00:06'),
(20, 205.68, '2025-10-18 06:00:07'),
(21, 205.68, '2025-10-19 06:00:05'),
(22, 205.68, '2025-10-20 06:00:20'),
(23, 207.89, '2025-10-21 06:00:07'),
(24, 210.28, '2025-10-22 06:00:05'),
(25, 212.48, '2025-10-23 06:00:04'),
(26, 214.42, '2025-10-24 06:00:08'),
(27, 216.37, '2025-10-25 06:00:06'),
(28, 216.37, '2025-10-26 06:00:07'),
(29, 216.37, '2025-10-27 06:00:06'),
(30, 218.17, '2025-10-28 06:00:18'),
(31, 219.87, '2025-10-29 06:00:06'),
(32, 221.74, '2025-10-30 06:00:31'),
(33, 223.65, '2025-10-31 06:00:06'),
(34, 223.96, '2025-11-01 06:00:07'),
(35, 223.96, '2025-11-02 06:00:07'),
(36, 223.96, '2025-11-03 06:00:07'),
(37, 224.38, '2025-11-04 06:00:08'),
(38, 226.13, '2025-11-05 06:00:08'),
(39, 227.55, '2025-11-06 04:00:00'),
(40, 228.48, '2025-11-07 04:00:03'),
(41, 231.05, '2025-11-08 04:00:04'),
(42, 231.05, '2025-11-09 04:00:04'),
(43, 231.05, '2025-11-10 04:00:04'),
(44, 231.09, '2025-11-11 04:00:03'),
(45, 233.05, '2025-11-12 04:00:04'),
(46, 233.56, '2025-11-13 04:00:04'),
(47, 234.87, '2025-11-14 04:00:04'),
(48, 236.46, '2025-11-15 04:00:04'),
(49, 236.46, '2025-11-16 04:00:04'),
(50, 236.46, '2025-11-17 04:00:04'),
(51, 236.84, '2025-11-18 04:00:04'),
(52, 243.11, '2025-11-22 04:00:04'),
(53, 243.11, '2025-11-23 04:00:04'),
(54, 243.11, '2025-11-24 04:00:04'),
(55, 243.11, '2025-11-25 04:00:04'),
(56, 243.57, '2025-11-26 04:00:04'),
(57, 244.65, '2025-11-27 04:00:04'),
(58, 245.67, '2025-11-28 04:00:04'),
(59, 247.30, '2025-11-29 04:00:03'),
(60, 247.30, '2025-11-30 04:00:03'),
(61, 247.30, '2025-12-01 04:00:04'),
(62, 247.41, '2025-12-02 04:00:04'),
(63, 249.20, '2025-12-03 00:00:00'),
(65, 251.89, '2025-12-04 00:00:00'),
(66, 254.87, '2025-12-05 04:00:04'),
(67, 257.93, '2025-12-06 04:00:04'),
(68, 257.93, '2025-12-07 04:00:03'),
(69, 257.93, '2025-12-08 04:00:04'),
(70, 257.93, '2025-12-09 04:00:04'),
(71, 262.10, '2025-12-10 04:00:04');

-- --------------------------------------------------------

--
-- Table structure for table `tipo_cuenta_contable`
--

DROP TABLE IF EXISTS `tipo_cuenta_contable`;
CREATE TABLE IF NOT EXISTS `tipo_cuenta_contable` (
  `tipo_cuenta_contable_id` int NOT NULL AUTO_INCREMENT,
  `nombre_tipo_cuenta` varchar(20) NOT NULL,
  `categoria_balance_id` int NOT NULL,
  PRIMARY KEY (`tipo_cuenta_contable_id`),
  KEY `categoria_balance_id` (`categoria_balance_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `tipo_cuenta_contable`
--

INSERT INTO `tipo_cuenta_contable` (`tipo_cuenta_contable_id`, `nombre_tipo_cuenta`, `categoria_balance_id`) VALUES
(1, 'Gasto Fijo', 5),
(2, 'Gasto Variable', 5),
(3, 'Gasto Extraordinario', 5),
(4, 'Inversion', 1),
(5, 'Previsiones', 2);

-- --------------------------------------------------------

--
-- Table structure for table `tipo_vivienda`
--

DROP TABLE IF EXISTS `tipo_vivienda`;
CREATE TABLE IF NOT EXISTS `tipo_vivienda` (
  `tipo_id` int NOT NULL AUTO_INCREMENT,
  `nombre_tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `monto_mensual_usd` decimal(10,2) NOT NULL DEFAULT '15.00' COMMENT 'Monto mensual en dólares para este tipo de vivienda',
  PRIMARY KEY (`tipo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `tipo_vivienda`
--

INSERT INTO `tipo_vivienda` (`tipo_id`, `nombre_tipo`, `monto_mensual_usd`) VALUES
(1, 'Apartamento', 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `rol_id` int NOT NULL,
  `status` enum('activo','inactivo') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `rol_id` (`rol_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `usuarios`
--

INSERT INTO `usuarios` (`user_id`, `username`, `password`, `rol_id`, `status`, `created_at`) VALUES
(1, 'superadmin', '$2y$10$DpMQXpYT96Vjrl12h3VWh.GB1mHrWldgTLEVm25dJW5U6o4xL1sVK', 1, 'activo', '2025-12-14 05:03:06'),
(2, 'admin', '$2y$10$DpMQXpYT96Vjrl12h3VWh.GB1mHrWldgTLEVm25dJW5U6o4xL1sVK', 2, 'activo', '2025-12-14 05:03:06'),
(3, 'user', '$2y$10$DpMQXpYT96Vjrl12h3VWh.GB1mHrWldgTLEVm25dJW5U6o4xL1sVK', 3, 'activo', '2025-12-14 05:03:06');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `apartamentos`
--
ALTER TABLE `apartamentos`
  ADD CONSTRAINT `apartamentos_ibfk_2` FOREIGN KEY (`edificio_id`) REFERENCES `edificios` (`edificio_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `banco_emisor`
--
ALTER TABLE `banco_emisor`
  ADD CONSTRAINT `banco_emisor_ibfk_1` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`banco_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `banco_emisor_gastos`
--
ALTER TABLE `banco_emisor_gastos`
  ADD CONSTRAINT `banco_emisor_gastos_ibfk_1` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`banco_id`) ON UPDATE CASCADE;

--
-- Constraints for table `banco_receptor`
--
ALTER TABLE `banco_receptor`
  ADD CONSTRAINT `banco_receptor_ibfk_1` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`banco_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `banco_receptor_gastos`
--
ALTER TABLE `banco_receptor_gastos`
  ADD CONSTRAINT `banco_receptor_gastos_ibfk_1` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`banco_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `banco_receptor_gastos_ibfk_2` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`proveedor_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `cuentas_contables`
--
ALTER TABLE `cuentas_contables`
  ADD CONSTRAINT `cuentas_contables_ibfk_1` FOREIGN KEY (`tipo_cuenta_contable_id`) REFERENCES `tipo_cuenta_contable` (`tipo_cuenta_contable_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `detalle_ingresos`
--
ALTER TABLE `detalle_ingresos`
  ADD CONSTRAINT `detalle_ingresos_ibfk_1` FOREIGN KEY (`ingreso_id`) REFERENCES `ingresos` (`ingreso_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `detalle_ingresos_ibfk_2` FOREIGN KEY (`tasa_id`) REFERENCES `tasas` (`tasa_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `detalle_ingresos_ibfk_3` FOREIGN KEY (`banco_receptor_id`) REFERENCES `banco_receptor` (`banco_receptor_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `detalle_ingresos_ibfk_4` FOREIGN KEY (`banco_emisor_id`) REFERENCES `banco_emisor` (`banco_emisor_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deuda_propetario`
--
ALTER TABLE `deuda_propetario`
  ADD CONSTRAINT `deuda_propetario_ibfk_1` FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble` (`inmueble_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ingresos`
--
ALTER TABLE `ingresos`
  ADD CONSTRAINT `ingresos_ibfk_2` FOREIGN KEY (`metodo_id`) REFERENCES `metodos_pago` (`metodo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ingresos_ibfk_3` FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble` (`inmueble_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ingresos_ibfk_4` FOREIGN KEY (`categoria_id`) REFERENCES `categoria_items` (`categoria_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `inmueble`
--
ALTER TABLE `inmueble`
  ADD CONSTRAINT `inmueble_ibfk_1` FOREIGN KEY (`propietario_id`) REFERENCES `propietarios` (`propietario_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inmueble_ibfk_2` FOREIGN KEY (`tipo_vivienda_id`) REFERENCES `tipo_vivienda` (`tipo_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `items_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categoria_items` (`categoria_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `movimientos_items`
--
ALTER TABLE `movimientos_items`
  ADD CONSTRAINT `movimientos_items_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_items_ibfk_2` FOREIGN KEY (`ingreso_id`) REFERENCES `ingresos` (`ingreso_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `obligaciones`
--
ALTER TABLE `obligaciones`
  ADD CONSTRAINT `obligaciones_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`proveedor_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `obligaciones_ibfk_2` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_contables` (`cuenta_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `obligacion_periodo`
--
ALTER TABLE `obligacion_periodo`
  ADD CONSTRAINT `obligacion_periodo_ibfk_1` FOREIGN KEY (`obligacion_id`) REFERENCES `obligaciones` (`obligacion_id`),
  ADD CONSTRAINT `obligacion_periodo_ibfk_2` FOREIGN KEY (`periodo_id`) REFERENCES `periodos` (`periodo_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`propietario_id`) REFERENCES `propietarios` (`propietario_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble` (`inmueble_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_ibfk_3` FOREIGN KEY (`periodo_id`) REFERENCES `periodos` (`periodo_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pagos_proveedores`
--
ALTER TABLE `pagos_proveedores`
  ADD CONSTRAINT `pagos_proveedores_ibfk_3` FOREIGN KEY (`metodo_id`) REFERENCES `metodos_pago` (`metodo_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_proveedores_ibfk_4` FOREIGN KEY (`banco_receptor_gasto_id`) REFERENCES `banco_receptor_gastos` (`banco_receptor_gasto_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_proveedores_ibfk_5` FOREIGN KEY (`banco_emisor_gasto_id`) REFERENCES `banco_emisor_gastos` (`banco_emisor_gasto_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_proveedores_ibfk_6` FOREIGN KEY (`obligacion_periodo_id`) REFERENCES `obligacion_periodo` (`obligacion_periodo_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pago_detalles`
--
ALTER TABLE `pago_detalles`
  ADD CONSTRAINT `pago_detalles_ibfk_1` FOREIGN KEY (`banco_emisor_id`) REFERENCES `banco_emisor` (`banco_emisor_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pago_detalles_ibfk_2` FOREIGN KEY (`banco_receptor_id`) REFERENCES `banco_receptor` (`banco_receptor_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pago_detalles_ibfk_3` FOREIGN KEY (`metodo_id`) REFERENCES `metodos_pago` (`metodo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pago_detalles_ibfk_5` FOREIGN KEY (`tasa_id`) REFERENCES `tasas` (`tasa_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pago_detalles_ibfk_6` FOREIGN KEY (`pago_id`) REFERENCES `pagos` (`pago_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `propietarios`
--
ALTER TABLE `propietarios`
  ADD CONSTRAINT `fk_propietarios_active_inmueble` FOREIGN KEY (`active_inmueble_id`) REFERENCES `inmueble` (`inmueble_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `propietarios_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reclamos`
--
ALTER TABLE `reclamos`
  ADD CONSTRAINT `reclamos_ibfk_1` FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble` (`inmueble_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `solicitudes_cartas`
--
ALTER TABLE `solicitudes_cartas`
  ADD CONSTRAINT `solicitudes_cartas_ibfk_1` FOREIGN KEY (`inmueble_id`) REFERENCES `inmueble` (`inmueble_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `solicitudes_cartas_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tipo_cuenta_contable`
--
ALTER TABLE `tipo_cuenta_contable`
  ADD CONSTRAINT `tipo_cuenta_contable_ibfk_1` FOREIGN KEY (`categoria_balance_id`) REFERENCES `categoria_balance` (`categoria_balance_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`rol_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
