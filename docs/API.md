# 📚 Documentación de API - SIGFARMA

## Información General

- **Base URL:** `https://tu-dominio.com/api`
- **Versión:** v1.0.0
- **Autenticación:** JWT Bearer Token
- **Formato:** JSON
- **Charset:** UTF-8

## Autenticación

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "correo": "admin@sigfarma.com",
  "contraseña": "admin123"
}
```

**Respuesta:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nombre": "Administrador",
    "correo": "admin@sigfarma.com",
    "rol": "admin"
  }
}
```

### Headers de Autenticación
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints

### 👥 Usuarios

#### Obtener usuarios
```http
GET /users?page=1&limit=20&search=&rol=
Authorization: Bearer {token}
```

#### Crear usuario
```http
POST /users
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "correo": "juan@sigfarma.com",
  "rol": "cajero",
  "contraseña": "password123"
}
```

### 📦 Productos

#### Obtener productos
```http
GET /products?page=1&limit=20&search=&categoria=
Authorization: Bearer {token}
```

#### Crear producto
```http
POST /products
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Acetaminofén",
  "presentacion": "500mg x 20 tabletas",
  "laboratorio": "Genfar",
  "categoria": "Analgésico",
  "stock_minimo": 50,
  "precio_venta": 5000
}
```

### 📋 Inventario

#### Obtener inventario
```http
GET /inventory?page=1&limit=50&search=&estado_vencimiento=
Authorization: Bearer {token}
```

#### Crear lote
```http
POST /inventory/lotes
Authorization: Bearer {token}
Content-Type: application/json

{
  "lote_codigo": "LOT-2024-001",
  "producto_id": 1,
  "fecha_vencimiento": "2025-12-31",
  "cantidad_disponible": 100,
  "precio_compra": 3000
}
```

### 💰 Ventas

#### Obtener ventas
```http
GET /sales?page=1&limit=50&fecha_inicio=2024-01-01&fecha_fin=2024-12-31
Authorization: Bearer {token}
```

#### Crear venta
```http
POST /sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "producto_id": 1,
      "lote_id": 1,
      "cantidad": 2,
      "precio_unitario": 5000,
      "descuento": 0,
      "impuesto": 19
    }
  ],
  "metodo_pago": "efectivo",
  "monto_efectivo": 10000,
  "cambio": 0
}
```

### 🔄 Devoluciones

#### Obtener devoluciones
```http
GET /sales/devoluciones?page=1&limit=20&estado=pendiente
Authorization: Bearer {token}
```

#### Crear devolución
```http
POST /sales/devoluciones
Authorization: Bearer {token}
Content-Type: application/json

{
  "venta_id": 1,
  "tipo": "parcial",
  "motivo": "Producto defectuoso",
  "items": [
    {
      "detalle_venta_id": 1,
      "cantidad_devuelta": 1
    }
  ],
  "metodo_reembolso": "efectivo"
}
```

### 🚚 Proveedores

#### Obtener proveedores
```http
GET /suppliers?page=1&limit=20&search=
Authorization: Bearer {token}
```

#### Crear proveedor
```http
POST /suppliers
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Laboratorios ABC",
  "contacto": "María García",
  "telefono": "+57 1 234-5678",
  "correo": "ventas@abc.com",
  "direccion": "Calle 123 #45-67, Bogotá"
}
```

### 📊 Reportes

#### Reporte de ventas
```http
GET /reports/ventas?fecha_inicio=2024-01-01&fecha_fin=2024-12-31
Authorization: Bearer {token}
```

#### Reporte de inventario
```http
GET /reports/inventario?categoria=&proveedor_id=
Authorization: Bearer {token}
```

### 🏠 Dashboard

#### Métricas del dashboard
```http
GET /dashboard/metrics
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "metricas": {
    "totalProductos": 150,
    "ventasHoy": {
      "cantidad": 25,
      "monto": 450000
    },
    "productosVencimiento": 8,
    "stockBajo": 12
  },
  "ventasSemanales": [...],
  "productosVendidos": [...],
  "alertasVencimiento": [...]
}
```

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Error en los datos enviados |
| 401 | Unauthorized - Token inválido o faltante |
| 403 | Forbidden - Sin permisos para el recurso |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

## Estructura de Respuestas

### Respuesta Exitosa
```json
{
  "message": "Operación exitosa",
  "data": {...}
}
```

### Respuesta con Paginación
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200,
    "itemsPerPage": 20
  }
}
```

### Respuesta de Error
```json
{
  "message": "Descripción del error",
  "error": "Detalles técnicos (solo en desarrollo)"
}
```

## Filtros y Parámetros

### Parámetros de Paginación
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20, max: 100)

### Parámetros de Búsqueda
- `search`: Término de búsqueda
- `ordenar`: Campo para ordenar
- `direccion`: ASC o DESC

### Filtros por Fecha
- `fecha_inicio`: Fecha inicial (YYYY-MM-DD)
- `fecha_fin`: Fecha final (YYYY-MM-DD)

## Rate Limiting

- **Límite general:** 1000 requests/hora por IP
- **Login:** 5 intentos/minuto por IP
- **Creación de recursos:** 100 requests/hora por usuario

## Ejemplos de Uso

### JavaScript/Fetch
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    correo: 'admin@sigfarma.com',
    contraseña: 'admin123'
  })
});

const { token } = await response.json();

// Usar token en requests posteriores
const products = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### cURL
```bash
# Login
curl -X POST https://tu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@sigfarma.com","contraseña":"admin123"}'

# Obtener productos
curl -X GET https://tu-dominio.com/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Webhooks (Futuro)

### Eventos Disponibles
- `sale.created` - Nueva venta creada
- `product.low_stock` - Producto con stock bajo
- `product.expiring` - Producto próximo a vencer

### Formato de Webhook
```json
{
  "event": "sale.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "venta_id": 123,
    "total": 15000,
    "usuario_id": 1
  }
}
```

## Versionado

La API utiliza versionado semántico:
- **v1.0.0** - Versión inicial
- **v1.1.0** - Nuevas funcionalidades
- **v2.0.0** - Cambios incompatibles

## Soporte

Para soporte técnico de la API:
- 📧 Email: api-support@sigfarma.com
- 📚 Documentación: https://docs.sigfarma.com
- 🐛 Issues: https://github.com/sigfarma/issues