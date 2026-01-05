# Sistema de Gestión de Pagos - Arcorui

Sistema web para la gestión de pagos de mensualidades y contribuciones en comunidades residenciales.

## 📁 Estructura del Proyecto

```
Arcorui/
├── index.html                 # Página principal (redirige al login)
├── assets/                    # Recursos estáticos
│   ├── css/                  # Hojas de estilo
│   │   ├── style.css         # Estilos principales
│   │   ├── admin.css         # Estilos para administración
│   │   ├── pagos.css         # Estilos para pagos
│   │   ├── reportes.css      # Estilos para reportes
│   │   └── ...               # Otros estilos específicos
│   ├── js/                   # Scripts JavaScript
│   │   ├── auth.js          # Autenticación
│   │   ├── dashboard.js     # Panel principal
│   │   ├── admin.js         # Administración
│   │   ├── superadmin/super_admin.js   # Super administración
│   │   └── ...              # Otros scripts
│   └── images/              # Imágenes (vacía por ahora)
├── pages/                    # Páginas HTML organizadas por funcionalidad
│   ├── auth/                # Autenticación
│   │   ├── index.html       # Login
│   │   └── register.html    # Registro
│   ├── dashboard/           # Panel principal
│   │   └── dashboard.html
│   ├── admin/               # Administración
│   │   ├── admin.html       # Panel de administración
│   │   └── admin_usuarios.html # Gestión de usuarios
│   ├── superadmin/          # Super Administración
│   │   ├── html/
│   │   │   └── super_admin.html # Panel de super administración
│   │   ├── api/             # APIs específicas de superadmin
│   │   ├── js/              # JavaScript específico de superadmin
│   │   └── css/             # Estilos específicos de superadmin
│   ├── payments/            # Pagos
│   │   └── pagos.html
│   ├── reports/             # Reportes
│   │   ├── reportes.html
│   │   ├── reportes_casa.html
│   │   └── acumulado_mensual.html
│   ├── housing/             # Gestión de viviendas
│   │   ├── informacion_casas.html
│   │   └── gestion_usuarios.html
│   └── calendar/            # Calendario
│       └── calendario.html
├── api/                     # Endpoints de la API (PHP)
│   ├── login.php
│   ├── register.php
│   ├── check_session.php
│   ├── process_payment.php
│   └── ...                  # Otros endpoints
├── superadmin/              # Módulo completo de Super Administración
│   ├── html/
│   │   └── super_admin.html # Panel de super administración
│   ├── api/                 # APIs específicas de superadmin
│   │   ├── super_admin_dashboard.php
│   │   ├── check_super_admin.php
│   │   ├── create_user_super_admin.php
│   │   ├── update_user_super_admin.php
│   │   ├── delete_user_super_admin.php
│   │   └── generate_house_report_super_admin.php
│   ├── js/                  # JavaScript específico de superadmin
│   │   └── super_admin.js
│   └── css/                 # Estilos específicos de superadmin
│       └── super_admin.css
├── includes/                # Archivos PHP de configuración
│   └── database.php         # Configuración de base de datos
├── uploads/                 # Archivos subidos
│   └── comprobantes/        # Comprobantes de pago
├── database/                # Scripts de base de datos
│   ├── database.sql
│   ├── update_database.sql
│   └── update_database_structure.sql
└── vendor/                  # Dependencias de Composer
    └── dompdf/              # Librería para generar PDFs
```

## 🚀 Características

- **Autenticación**: Sistema de login y registro
- **Gestión de Usuarios**: Diferentes niveles de acceso (usuario, admin, super admin)
- **Gestión de Viviendas**: Registro y administración de casas y apartamentos
- **Sistema de Pagos**: Procesamiento de mensualidades y contribuciones
- **Reportes**: Generación de reportes detallados y PDFs
- **Calendario**: Visualización de pagos por mes
- **Administración**: Panel completo para administradores

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: PHP 7.4+
- **Base de Datos**: MySQL
- **Librerías**: 
  - Font Awesome (iconos)
  - DOMPDF (generación de PDFs)
  - Composer (gestión de dependencias)

## 📋 Requisitos del Sistema

- PHP 7.4 o superior
- MySQL 5.7 o superior
- Servidor web (Apache/Nginx)
- Extensiones PHP: PDO, PDO_MySQL, GD

## 🔧 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone [URL del repositorio]
   cd Arcorui
   ```

2. **Instalar dependencias**
   ```bash
   composer install
   ```

3. **Configurar la base de datos**
   - Crear una base de datos MySQL llamada `arcorui_community`
   - Importar el archivo `database/database.sql`
   - Configurar las credenciales en `includes/database.php`

4. **Configurar el servidor web**
   - Apuntar el document root a la carpeta del proyecto
   - Asegurar que PHP esté habilitado

5. **Configurar permisos**
   ```bash
   chmod 755 uploads/
   chmod 755 uploads/comprobantes/
   ```

## 🎯 Uso

1. **Acceso**: Navegar a `http://localhost/Arcorui`
2. **Login**: Usar las credenciales de administrador o crear una cuenta
3. **Dashboard**: Acceder al panel principal según el tipo de usuario
4. **Gestión**: Administrar usuarios, viviendas y pagos desde los paneles correspondientes

## 👥 Tipos de Usuario

- **Usuario Normal**: Puede gestionar su vivienda y realizar pagos
- **Administrador**: Puede aprobar pagos y gestionar usuarios
- **Super Administrador**: Acceso completo al sistema

## 📊 Funcionalidades por Usuario

### Usuario Normal
- Registro de vivienda
- Realización de pagos
- Consulta de reportes personales
- Visualización de calendario de pagos

### Administrador
- Aprobación de pagos
- Gestión de usuarios
- Generación de reportes
- Consulta de morosidad

### Super Administrador
- Gestión completa de usuarios
- Administración de viviendas
- Reportes globales
- Configuración del sistema

## 🔒 Seguridad

- Autenticación por sesiones
- Validación de datos en frontend y backend
- Sanitización de entradas
- Verificación de permisos por página

## 📝 Notas de Desarrollo

- Las rutas están configuradas para funcionar desde la raíz del proyecto
- Los archivos de configuración están en `includes/`
- Los assets están organizados en `assets/`
- Las páginas están organizadas por funcionalidad en `pages/`

## 🐛 Solución de Problemas

- **Error de conexión a BD**: Verificar credenciales en `includes/database.php`
- **Archivos no encontrados**: Verificar que las rutas estén correctas
- **Permisos de archivos**: Asegurar permisos de escritura en `uploads/`

## 📞 Soporte

Para soporte técnico o reportar bugs, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Septiembre 2025