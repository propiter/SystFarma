# 📋 SIGFARMA - Sistema Integral de Gestión para Farmacias

![SIGFARMA Logo](https://via.placeholder.com/800x200/22c55e/ffffff?text=SIGFARMA+-+Sistema+Integral+de+Gesti%C3%B3n+para+Farmacias)

**SIGFARMA** es un sistema completo de gestión farmacéutica desarrollado con tecnologías modernas, diseñado para optimizar todas las operaciones de una farmacia desde el control de inventario hasta la gestión de ventas y reportes.

---

## 🚀 **CARACTERÍSTICAS PRINCIPALES**

### **📦 Gestión Completa de Inventario**
- ✅ Control por lotes con fechas de vencimiento
- ✅ Alertas automáticas de productos próximos a vencer
- ✅ Gestión de stock mínimo y reposición
- ✅ Ajustes manuales de inventario con trazabilidad
- ✅ Movimientos completos de entrada y salida

### **💰 Punto de Venta (POS) Avanzado**
- ✅ Interfaz intuitiva y rápida para cajeros
- ✅ Múltiples métodos de pago (efectivo, tarjeta, transferencia, mixto)
- ✅ Cálculo automático de impuestos y descuentos
- ✅ Validación de stock en tiempo real
- ✅ Búsqueda rápida de productos

### **🔄 Sistema de Devoluciones**
- ✅ Devoluciones parciales y totales
- ✅ Múltiples motivos de devolución
- ✅ Restauración automática de stock
- ✅ Control de estados (pendiente, completada, rechazada)
- ✅ Diferentes métodos de reembolso

### **🚚 Gestión de Proveedores**
- ✅ Base de datos completa de proveedores
- ✅ Actas de recepción de mercancía
- ✅ Aprobación y carga automática al inventario
- ✅ Historial de compras y productos por proveedor

### **👥 Administración de Usuarios**
- ✅ Sistema de roles granular (Admin, Cajero, Bodega)
- ✅ Autenticación segura con JWT
- ✅ Gestión de permisos por módulo
- ✅ Activación/desactivación de usuarios
- ✅ Generación automática de contraseñas

### **📊 Reportes y Analytics**
- ✅ Reportes de ventas y utilidades
- ✅ Estado del inventario por categorías
- ✅ Análisis de proveedores y compras
- ✅ Corte de caja diario y por período
- ✅ Reportes de productos más vendidos

### **🔧 Ajustes de Inventario**
- ✅ Correcciones manuales con motivos
- ✅ Conteo físico y reconciliación
- ✅ Trazabilidad completa de cambios
- ✅ Múltiples motivos de ajuste

### **🏠 Dashboard Inteligente**
- ✅ Métricas en tiempo real
- ✅ Alertas visuales de vencimientos
- ✅ Accesos rápidos a funciones principales
- ✅ Navegación contextual por roles

---

## 🛠 **TECNOLOGÍAS UTILIZADAS**

### **Frontend:**
- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático para mayor robustez
- **Tailwind CSS** - Framework de estilos utilitarios
- **React Query** - Gestión de estado del servidor
- **React Router** - Navegación SPA
- **React Hook Form** - Manejo eficiente de formularios
- **Lucide React** - Iconografía moderna
- **React Hot Toast** - Notificaciones elegantes

### **Backend:**
- **Node.js** - Entorno de ejecución JavaScript
- **Express.js** - Framework web minimalista
- **PostgreSQL** - Base de datos relacional robusta
- **JWT** - Autenticación stateless
- **Joi** - Validación de esquemas
- **bcryptjs** - Encriptación de contraseñas
- **Helmet** - Seguridad HTTP
- **CORS** - Control de acceso entre dominios

### **Base de Datos:**
- **PostgreSQL 14+** - Sistema de gestión de base de datos
- **Supabase** - Plataforma de base de datos como servicio
- **Migraciones automáticas** - Control de versiones de esquema

---

## 📋 **REQUISITOS DEL SISTEMA**

### **Requisitos Mínimos:**
- **Node.js** 18.0.0 o superior
- **PostgreSQL** 14.0 o superior (o cuenta Supabase)
- **npm** 8.0.0 o superior
- **4GB RAM** mínimo
- **2GB** espacio en disco
- **Navegador moderno** (Chrome 90+, Firefox 88+, Safari 14+)

### **Requisitos Recomendados:**
- **Node.js** 20.0.0 o superior
- **PostgreSQL** 15.0 o superior
- **8GB RAM** o más
- **SSD** para mejor rendimiento
- **Conexión a internet estable**

---

## 🚀 **INSTALACIÓN Y CONFIGURACIÓN**

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/tu-usuario/sigfarma-system.git
cd sigfarma-system
```

### **2. Instalar Dependencias**
```bash
# Instalar todas las dependencias del proyecto
npm install
```

### **3. Configurar Base de Datos**

#### **Opción A: Usar Supabase (Recomendado para producción)**
1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto
3. Ir a Settings > API
4. Copiar Project URL y anon public key
5. Configurar variables de entorno (ver paso 4)

#### **Opción B: PostgreSQL Local**
```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Crear base de datos
sudo -u postgres createdb sigfarma

# Crear usuario
sudo -u postgres createuser --interactive sigfarma_user
sudo -u postgres psql -c "ALTER USER sigfarma_user PASSWORD 'tu_password_seguro';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sigfarma TO sigfarma_user;"
```

### **4. Configurar Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables de entorno
nano .env
```

**Para Supabase:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# JWT Configuration
JWT_SECRET=clave-super-secreta-de-al-menos-32-caracteres-cambiar-en-produccion

# Server Configuration
PORT=3000
NODE_ENV=production

# Client Configuration
CLIENT_URL=https://tu-dominio.com
VITE_API_URL=https://tu-dominio.com/api
```

**Para PostgreSQL Local:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sigfarma
DB_USER=sigfarma_user
DB_PASSWORD=tu_password_seguro

# JWT Configuration
JWT_SECRET=clave-super-secreta-de-al-menos-32-caracteres-cambiar-en-produccion

# Server Configuration
PORT=3000
NODE_ENV=production

# Client Configuration
CLIENT_URL=https://tu-dominio.com
VITE_API_URL=https://tu-dominio.com/api
```

### **5. Inicializar Base de Datos**
```bash
# Ejecutar migraciones y crear datos iniciales
npm run db:init
```

### **6. Construir para Producción**
```bash
# Construir aplicación frontend
npm run build

# Verificar que no hay errores de TypeScript
npm run lint
```

### **7. Iniciar en Producción**
```bash
# Iniciar servidor (sirve frontend y backend)
npm start

# O usar PM2 para gestión de procesos (recomendado)
npm install -g pm2
pm2 start server/index.js --name "sigfarma"
pm2 startup
pm2 save
```

---

## 🔐 **USUARIOS POR DEFECTO**

El sistema incluye usuarios predeterminados para pruebas iniciales:

| Rol | Email | Contraseña | Permisos |
|-----|-------|------------|----------|
| **Administrador** | admin@sigfarma.com | admin123 | Acceso completo al sistema |
| **Cajero** | cajero@sigfarma.com | cajero123 | POS, Ventas, Devoluciones |
| **Bodega** | bodega@sigfarma.com | bodega123 | Inventario, Productos, Proveedores |

**⚠️ IMPORTANTE:** Cambiar estas contraseñas inmediatamente en producción.

---

## 🌐 **ACCESO AL SISTEMA**

### **URLs de Acceso:**
- **Frontend:** https://tu-dominio.com
- **Backend API:** https://tu-dominio.com/api
- **Health Check:** https://tu-dominio.com/health

### **Estructura de Navegación:**
```
/login          - Página de inicio de sesión
/dashboard      - Panel principal con métricas
/products       - Gestión de productos y medicamentos
/inventory      - Control de inventario por lotes
/pos            - Punto de venta (POS)
/sales          - Historial de ventas
/devolutions    - Gestión de devoluciones
/suppliers      - Gestión de proveedores
/adjustments    - Ajustes de inventario (Solo Admin)
/reports        - Reportes y analytics (Solo Admin)
/users          - Gestión de usuarios (Solo Admin)
```

---

## 📁 **ESTRUCTURA DEL PROYECTO**

```
sigfarma-system/
├── 📁 src/                     # Código fuente frontend
│   ├── 📁 components/          # Componentes reutilizables
│   │   ├── Layout.tsx          # Layout principal
│   │   └── ProtectedRoute.tsx  # Rutas protegidas
│   ├── 📁 contexts/            # Contextos de React
│   │   └── AuthContext.tsx     # Contexto de autenticación
│   ├── 📁 hooks/               # Hooks personalizados
│   │   └── useAuth.ts          # Hook de autenticación
│   ├── 📁 pages/               # Páginas de la aplicación
│   │   ├── DashboardPage.tsx   # Dashboard principal
│   │   ├── ProductsPage.tsx    # Gestión de productos
│   │   ├── InventoryPage.tsx   # Control de inventario
│   │   ├── POSPage.tsx         # Punto de venta
│   │   ├── SalesPage.tsx       # Historial de ventas
│   │   ├── DevolutionsPage.tsx # Gestión de devoluciones
│   │   ├── SuppliersPage.tsx   # Gestión de proveedores
│   │   ├── AdjustmentsPage.tsx # Ajustes de inventario
│   │   ├── ReportsPage.tsx     # Reportes y analytics
│   │   ├── UsersPage.tsx       # Gestión de usuarios
│   │   └── LoginPage.tsx       # Página de login
│   ├── 📁 services/            # Servicios API
│   │   ├── apiClient.ts        # Cliente HTTP base
│   │   ├── authService.ts      # Servicios de autenticación
│   │   ├── productService.ts   # Servicios de productos
│   │   ├── inventoryService.ts # Servicios de inventario
│   │   ├── salesService.ts     # Servicios de ventas
│   │   ├── devolutionService.ts# Servicios de devoluciones
│   │   ├── supplierService.ts  # Servicios de proveedores
│   │   ├── adjustmentService.ts# Servicios de ajustes
│   │   ├── reportService.ts    # Servicios de reportes
│   │   ├── userService.ts      # Servicios de usuarios
│   │   └── dashboardService.ts # Servicios del dashboard
│   ├── 📁 types/               # Definiciones TypeScript
│   │   └── auth.ts             # Tipos de autenticación
│   └── 📄 App.tsx              # Componente principal
├── 📁 server/                  # Código fuente backend
│   ├── 📁 config/              # Configuraciones
│   │   └── database.js         # Configuración de BD
│   ├── 📁 middleware/          # Middlewares
│   │   └── auth.js             # Middleware de autenticación
│   ├── 📁 routes/              # Rutas de API
│   │   ├── auth.js             # Rutas de autenticación
│   │   ├── users.js            # Rutas de usuarios
│   │   ├── products.js         # Rutas de productos
│   │   ├── inventory.js        # Rutas de inventario
│   │   ├── sales.js            # Rutas de ventas
│   │   ├── suppliers.js        # Rutas de proveedores
│   │   ├── reports.js          # Rutas de reportes
│   │   └── dashboard.js        # Rutas del dashboard
│   ├── 📁 scripts/             # Scripts de utilidad
│   │   └── initDb.js           # Inicialización de BD
│   └── 📄 index.js             # Servidor principal
├── 📁 supabase/                # Migraciones de BD
│   └── 📁 migrations/          # Archivos de migración SQL
├── 📄 package.json             # Dependencias y scripts
├── 📄 .env.example             # Variables de entorno ejemplo
├── 📄 tailwind.config.js       # Configuración Tailwind
├── 📄 vite.config.ts           # Configuración Vite
└── 📄 README.md                # Este archivo
```

---

## 🔧 **SCRIPTS DISPONIBLES**

```bash
# Desarrollo
npm run dev          # Iniciar frontend en modo desarrollo
npm run server       # Iniciar servidor backend
npm run build        # Construir para producción
npm run preview      # Vista previa de build de producción

# Base de datos
npm run db:init      # Inicializar base de datos con esquema y datos

# Calidad de código
npm run lint         # Ejecutar ESLint para verificar código
npm run type-check   # Verificar tipos TypeScript

# Producción
npm start            # Iniciar aplicación en modo producción
```

---

## 🔒 **SEGURIDAD**

### **Medidas Implementadas:**
- ✅ **Autenticación JWT** con expiración configurable
- ✅ **Encriptación bcrypt** para contraseñas (12 rounds)
- ✅ **Validación de entrada** con esquemas Joi
- ✅ **Sanitización** automática de datos
- ✅ **Headers de seguridad** con Helmet
- ✅ **CORS** configurado para dominios específicos
- ✅ **Rate limiting** en APIs críticas
- ✅ **Roles y permisos** granulares por endpoint
- ✅ **Soft delete** para preservar integridad de datos

### **Configuraciones de Seguridad Recomendadas:**
```javascript
// Variables de entorno de seguridad
JWT_SECRET=clave-super-secreta-de-al-menos-32-caracteres-cambiar-en-produccion
JWT_EXPIRATION=24h
NODE_ENV=production

// Headers de seguridad automáticos
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

---

## 📊 **MONITOREO Y LOGS**

### **Health Check:**
```bash
# Verificar estado del sistema
curl https://tu-dominio.com/health

# Respuesta esperada:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Logs del Sistema:**
```bash
# Ver logs en tiempo real (con PM2)
pm2 logs sigfarma

# Ver logs específicos
pm2 logs sigfarma --lines 100

# Monitoreo de recursos
pm2 monit
```

### **Métricas Importantes:**
- **Tiempo de respuesta API:** < 200ms promedio
- **Uso de memoria:** < 512MB por proceso
- **Conexiones de BD:** < 10 concurrentes
- **Uptime:** > 99.9%

---

## 🚀 **DESPLIEGUE EN PRODUCCIÓN**

### **Opción 1: Servidor VPS/Dedicado**

#### **1. Preparar Servidor:**
```bash
# Actualizar sistema (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx (opcional, para proxy reverso)
sudo apt install nginx
```

#### **2. Configurar Nginx (Recomendado):**
```nginx
# /etc/nginx/sites-available/sigfarma
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### **3. SSL con Let's Encrypt:**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Opción 2: Docker (Recomendado para escalabilidad)**

#### **Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### **docker-compose.yml:**
```yaml
version: '3.8'
services:
  sigfarma:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sigfarma
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 🔧 **MANTENIMIENTO**

### **Tareas Regulares:**

#### **Diarias:**
- ✅ Verificar logs de errores
- ✅ Monitorear uso de recursos
- ✅ Backup automático de base de datos

#### **Semanales:**
- ✅ Revisar alertas de vencimiento
- ✅ Verificar integridad de datos
- ✅ Actualizar dependencias de seguridad

#### **Mensuales:**
- ✅ Análisis de rendimiento
- ✅ Limpieza de logs antiguos
- ✅ Revisión de usuarios inactivos

### **Comandos de Mantenimiento:**
```bash
# Backup de base de datos
pg_dump -h localhost -U sigfarma_user sigfarma > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -h localhost -U sigfarma_user sigfarma < backup_20240115.sql

# Limpiar logs de PM2
pm2 flush sigfarma

# Reiniciar aplicación
pm2 restart sigfarma

# Actualizar dependencias
npm audit fix
npm update
```

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Problemas Comunes:**

#### **1. Error de Conexión a Base de Datos**
```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar conexión
psql -h localhost -U sigfarma_user -d sigfarma -c "SELECT NOW();"
```

#### **2. Error de Permisos**
```bash
# Verificar permisos de archivos
ls -la

# Corregir permisos
sudo chown -R $USER:$USER .
chmod -R 755 .
```

#### **3. Puerto en Uso**
```bash
# Verificar qué proceso usa el puerto 3000
sudo lsof -i :3000

# Terminar proceso
sudo kill -9 PID
```

#### **4. Memoria Insuficiente**
```bash
# Verificar uso de memoria
free -h

# Verificar procesos que más consumen
top

# Reiniciar PM2 si es necesario
pm2 restart all
```

### **Logs de Depuración:**
```bash
# Logs detallados de la aplicación
DEBUG=* npm start

# Logs de base de datos
tail -f /var/log/postgresql/postgresql-15-main.log

# Logs de Nginx
tail -f /var/log/nginx/error.log
```

---

## 📈 **OPTIMIZACIÓN DE RENDIMIENTO**

### **Base de Datos:**
```sql
-- Índices recomendados para mejor rendimiento
CREATE INDEX CONCURRENTLY idx_productos_nombre_gin ON productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX CONCURRENTLY idx_ventas_fecha_usuario ON ventas(fecha_venta, usuario_id);
CREATE INDEX CONCURRENTLY idx_lotes_vencimiento_disponible ON lotes(fecha_vencimiento, cantidad_disponible) WHERE cantidad_disponible > 0;

-- Configuraciones PostgreSQL recomendadas
-- En postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### **Frontend:**
- ✅ Lazy loading de componentes
- ✅ Memoización con React.memo
- ✅ Optimización de imágenes
- ✅ Compresión gzip habilitada
- ✅ Cache de API con React Query

### **Backend:**
- ✅ Pool de conexiones de BD
- ✅ Compresión de respuestas
- ✅ Cache de consultas frecuentes
- ✅ Rate limiting por IP
- ✅ Optimización de consultas SQL

---

## 🔄 **ACTUALIZACIONES**

### **Proceso de Actualización:**
```bash
# 1. Backup completo
npm run backup

# 2. Descargar nueva versión
git pull origin main

# 3. Instalar dependencias
npm install

# 4. Ejecutar migraciones
npm run db:migrate

# 5. Construir nueva versión
npm run build

# 6. Reiniciar aplicación
pm2 restart sigfarma

# 7. Verificar funcionamiento
curl https://tu-dominio.com/health
```

### **Versionado:**
- **Major (X.0.0):** Cambios incompatibles
- **Minor (0.X.0):** Nuevas funcionalidades
- **Patch (0.0.X):** Correcciones de errores

---

## 📞 **SOPORTE Y CONTACTO**

### **Documentación Adicional:**
- 📖 [Manual de Usuario](docs/manual-usuario.pdf)
- 🔧 [Guía de Administrador](docs/guia-admin.pdf)
- 🎯 [API Documentation](docs/api-docs.md)

### **Soporte Técnico:**
- 📧 **Email:** soporte@sigfarma.com
- 📱 **WhatsApp:** +57 300 123 4567
- 🌐 **Web:** https://sigfarma.com/soporte
- 💬 **Chat:** Disponible en la aplicación

### **Comunidad:**
- 🐛 **Issues:** [GitHub Issues](https://github.com/tu-usuario/sigfarma/issues)
- 💡 **Sugerencias:** [GitHub Discussions](https://github.com/tu-usuario/sigfarma/discussions)
- 📚 **Wiki:** [GitHub Wiki](https://github.com/tu-usuario/sigfarma/wiki)

---

## 📄 **LICENCIA**

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

### **Términos de Uso:**
- ✅ Uso comercial permitido
- ✅ Modificación permitida
- ✅ Distribución permitida
- ✅ Uso privado permitido
- ❌ Sin garantía
- ❌ Sin responsabilidad del autor

---

## 🙏 **AGRADECIMIENTOS**

### **Desarrollado por:**
- **SENA** - Servicio Nacional de Aprendizaje
- **Equipo de Desarrollo** - Tecnólogos en Análisis y Desarrollo de Software

### **Tecnologías Utilizadas:**
- React.js y el ecosistema de React
- Node.js y Express.js
- PostgreSQL y Supabase
- Tailwind CSS
- TypeScript

### **Inspiración:**
Este proyecto fue desarrollado como parte del programa de formación del SENA, con el objetivo de crear una solución real para la gestión integral de farmacias en Colombia.

---

## 📊 **ESTADÍSTICAS DEL PROYECTO**

- **Líneas de código:** ~15,000
- **Archivos:** 50+
- **Componentes React:** 25+
- **Endpoints API:** 40+
- **Tablas de BD:** 24
- **Tiempo de desarrollo:** 6 meses
- **Desarrolladores:** 3

---

**¡Gracias por usar SIGFARMA! 🚀**

*Sistema desarrollado con ❤️ para la comunidad farmacéutica colombiana.*