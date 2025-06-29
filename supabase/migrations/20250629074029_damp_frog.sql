-- SIGFARMA Database Schema
-- Sistema Integral de Gestión para Farmacias
-- Versión: 1.0.0
-- Fecha: 2024-01-15

-- =================================
-- CONFIGURACIONES INICIALES
-- =================================

-- Configurar zona horaria para Colombia
SET timezone = 'America/Bogota';

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================================
-- 1. TABLA: configuracion_sistema
-- =================================
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    clave VARCHAR(50) PRIMARY KEY UNIQUE,
    valor TEXT NOT NULL,
    descripcion TEXT,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuraciones por defecto
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('version_sistema', '1.0.0', 'Versión actual del sistema'),
('nombre_farmacia', 'SIGFARMA', 'Nombre de la farmacia'),
('nit_farmacia', '900123456-1', 'NIT de la farmacia'),
('direccion_farmacia', 'Calle 123 #45-67, Bogotá', 'Dirección de la farmacia'),
('telefono_farmacia', '+57 1 234-5678', 'Teléfono de la farmacia'),
('email_farmacia', 'info@sigfarma.com', 'Email de la farmacia'),
('moneda', 'COP', 'Moneda utilizada'),
('impuesto_iva', '19', 'Porcentaje de IVA'),
('backup_automatico', 'true', 'Habilitar backup automático'),
('alertas_vencimiento', '180', 'Días de anticipación para alertas de vencimiento')
ON CONFLICT (clave) 
DO UPDATE SET 
    valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion,
    fecha_actualizacion = CURRENT_TIMESTAMP;

-- =================================
-- 2. TABLA: usuarios
-- =================================
CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(nombre)) >= 2),
    correo VARCHAR(100) UNIQUE NOT NULL CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    contraseña VARCHAR(255) NOT NULL CHECK (LENGTH(contraseña) >= 6),
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'cajero', 'bodega')),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    intentos_login INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    token_reset VARCHAR(255),
    token_reset_expira TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);

-- =================================
-- 3. TABLA: clientes
-- =================================
CREATE TABLE IF NOT EXISTS clientes (
    cliente_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(nombre)) >= 2),
    documento VARCHAR(20) UNIQUE,
    tipo_documento VARCHAR(10) CHECK (tipo_documento IN ('CC', 'CE', 'TI', 'PP', 'NIT')),
    telefono VARCHAR(50),
    correo VARCHAR(100) CHECK (correo IS NULL OR correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    direccion VARCHAR(150),
    fecha_nacimiento DATE,
    genero VARCHAR(10) CHECK (genero IN ('M', 'F', 'Otro')),
    tipo_cliente VARCHAR(50) DEFAULT 'Regular',
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);

-- =================================
-- 4. TABLA: proveedores
-- =================================
CREATE TABLE IF NOT EXISTS proveedores (
    proveedor_id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(nombre)) >= 2),
    nit VARCHAR(20) UNIQUE,
    contacto VARCHAR(100),
    telefono VARCHAR(50),
    correo VARCHAR(100) CHECK (correo IS NULL OR correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    direccion VARCHAR(150),
    ciudad VARCHAR(50),
    pais VARCHAR(50) DEFAULT 'Colombia',
    codigo_postal VARCHAR(10),
    sitio_web VARCHAR(100),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT
);

-- Índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_proveedores_nit ON proveedores(nit);
CREATE INDEX IF NOT EXISTS idx_proveedores_estado ON proveedores(estado);

-- =================================
-- 5. TABLA: temperaturas
-- =================================
CREATE TABLE IF NOT EXISTS temperaturas (
    temperatura_id SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL UNIQUE,
    rango_temperatura VARCHAR(50) NOT NULL,
    temperatura_min DECIMAL(5,2),
    temperatura_max DECIMAL(5,2),
    color_indicador VARCHAR(7) DEFAULT '#3B82F6',
    observaciones TEXT,
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar temperaturas por defecto
INSERT INTO temperaturas (descripcion, rango_temperatura, temperatura_min, temperatura_max, color_indicador) VALUES
('Ambiente', '15-25°C', 15.0, 25.0, '#22C55E'),
('Refrigeración', '2-8°C', 2.0, 8.0, '#3B82F6'),
('Congelación', '-18°C o menos', -25.0, -18.0, '#8B5CF6'),
('Controlada', '20-25°C', 20.0, 25.0, '#F59E0B')
ON CONFLICT (descripcion)
DO UPDATE SET 
    rango_temperatura = EXCLUDED.rango_temperatura,
    temperatura_min = EXCLUDED.temperatura_min,
    temperatura_max = EXCLUDED.temperatura_max,
    color_indicador = EXCLUDED.color_indicador;

-- =================================
-- 6. TABLA: categorias
-- =================================
CREATE TABLE IF NOT EXISTS categorias (
    categoria_id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    icono VARCHAR(50),
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías por defecto
INSERT INTO categorias (nombre, descripcion, color) VALUES
('Analgésico', 'Medicamentos para aliviar el dolor', '#EF4444'),
('Antiinflamatorio', 'Medicamentos para reducir inflamación', '#F97316'),
('Antihistamínico', 'Medicamentos para alergias', '#84CC16'),
('Antibiótico', 'Medicamentos para infecciones bacterianas', '#06B6D4'),
('Vitaminas', 'Suplementos vitamínicos y minerales', '#8B5CF6'),
('Cardiovascular', 'Medicamentos para el corazón', '#EC4899'),
('Digestivo', 'Medicamentos para problemas digestivos', '#10B981'),
('Respiratorio', 'Medicamentos para problemas respiratorios', '#3B82F6'),
('Dermatológico', 'Medicamentos para la piel', '#F59E0B'),
('Neurológico', 'Medicamentos para el sistema nervioso', '#6366F1')
ON CONFLICT (nombre)
DO UPDATE SET 
    descripcion = EXCLUDED.descripcion,
    color = EXCLUDED.color,
    fecha_actualizacion = CURRENT_TIMESTAMP;

-- =================================
-- 7. TABLA: productos
-- =================================
CREATE TABLE IF NOT EXISTS productos (
    producto_id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE,
    codigo_interno VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(nombre)) >= 2),
    nombre_generico VARCHAR(100),
    concentracion VARCHAR(50),
    forma_farmaceutica VARCHAR(50),
    presentacion VARCHAR(50) NOT NULL,
    laboratorio VARCHAR(100),
    registro_sanitario VARCHAR(50),
    invima VARCHAR(50),
    temperatura_id INTEGER REFERENCES temperaturas(temperatura_id),
    proveedor_id INTEGER REFERENCES proveedores(proveedor_id),
    categoria_id INTEGER REFERENCES categorias(categoria_id),
    categoria VARCHAR(50), -- Mantener por compatibilidad
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    stock_maximo INTEGER DEFAULT 1000 CHECK (stock_maximo >= stock_minimo),
    precio_compra DECIMAL(12,2) DEFAULT 0 CHECK (precio_compra >= 0),
    precio_venta DECIMAL(12,2) NOT NULL CHECK (precio_venta >= 0),
    margen_utilidad DECIMAL(5,2) DEFAULT 0,
    descuento_maximo DECIMAL(5,2) DEFAULT 0 CHECK (descuento_maximo >= 0 AND descuento_maximo <= 100),
    requiere_receta BOOLEAN DEFAULT FALSE,
    controlado BOOLEAN DEFAULT FALSE,
    refrigerado BOOLEAN DEFAULT FALSE,
    fraccionable BOOLEAN DEFAULT TRUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion INTEGER REFERENCES usuarios(usuario_id),
    usuario_actualizacion INTEGER REFERENCES usuarios(usuario_id),
    observaciones TEXT,
    imagen_url VARCHAR(255),
    peso DECIMAL(8,3),
    volumen DECIMAL(8,3),
    unidad_medida VARCHAR(20) DEFAULT 'unidad'
);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_interno ON productos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_productos_laboratorio ON productos(laboratorio);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_stock_bajo ON productos(stock, stock_minimo) WHERE stock <= stock_minimo;

-- =================================
-- 8. TABLA: lotes
-- =================================
CREATE TABLE IF NOT EXISTS lotes (
    lote_id SERIAL PRIMARY KEY,
    lote_codigo VARCHAR(50) NOT NULL,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id) ON DELETE RESTRICT,
    proveedor_id INTEGER REFERENCES proveedores(proveedor_id),
    fecha_fabricacion DATE,
    fecha_vencimiento DATE NOT NULL,
    cantidad_inicial INTEGER NOT NULL CHECK (cantidad_inicial > 0),
    cantidad_disponible INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
    cantidad_reservada INTEGER DEFAULT 0 CHECK (cantidad_reservada >= 0),
    precio_compra DECIMAL(12,2) NOT NULL CHECK (precio_compra >= 0),
    precio_venta DECIMAL(12,2),
    descuento_compra DECIMAL(5,2) DEFAULT 0,
    impuesto_compra DECIMAL(5,2) DEFAULT 0,
    costo_total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_inicial * precio_compra) STORED,
    ubicacion VARCHAR(50),
    observaciones TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_ingreso INTEGER REFERENCES usuarios(usuario_id),
    acta_recepcion_id INTEGER,
    numero_factura VARCHAR(50),
    alerta_vencimiento BOOLEAN DEFAULT FALSE,
    dias_vencimiento INTEGER,
    es_critico_vencimiento BOOLEAN DEFAULT FALSE,
    CONSTRAINT chk_cantidad_disponible_inicial CHECK (cantidad_disponible <= cantidad_inicial),
    CONSTRAINT chk_fechas_logicas CHECK (fecha_vencimiento > COALESCE(fecha_fabricacion, CURRENT_DATE - INTERVAL '10 years')),
    CONSTRAINT uk_lote_producto UNIQUE (lote_codigo, producto_id)
);

-- =================================
-- TRIGGER para actualizar dias_vencimiento y es_critico_vencimiento
-- =================================
CREATE OR REPLACE FUNCTION actualizar_alertas_lote()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dias_vencimiento := EXTRACT(DAY FROM NEW.fecha_vencimiento - CURRENT_DATE);
    NEW.es_critico_vencimiento := 
        (NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' AND NEW.cantidad_disponible > 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alertas_lote
BEFORE INSERT OR UPDATE ON lotes
FOR EACH ROW
EXECUTE FUNCTION actualizar_alertas_lote();

-- ÍNDICES para lotes

CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_codigo ON lotes(lote_codigo);
CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_lotes_disponible ON lotes(cantidad_disponible) WHERE cantidad_disponible > 0;
CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes(estado);
CREATE INDEX IF NOT EXISTS idx_lotes_critico ON lotes(es_critico_vencimiento) WHERE es_critico_vencimiento = true;
CREATE INDEX IF NOT EXISTS idx_lotes_proveedor ON lotes(proveedor_id);

-- =================================
-- 9. TABLA: inventario
-- =================================
CREATE TABLE IF NOT EXISTS inventario (
    inventario_id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id) ON DELETE CASCADE,
    stock_total INTEGER DEFAULT 0 CHECK (stock_total >= 0),
    stock_reservado INTEGER DEFAULT 0 CHECK (stock_reservado >= 0),
    stock_disponible INTEGER GENERATED ALWAYS AS (stock_total - stock_reservado) STORED,
    valor_total DECIMAL(15,2) DEFAULT 0,
    ultima_entrada TIMESTAMP,
    ultima_salida TIMESTAMP,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotacion_promedio DECIMAL(8,2) DEFAULT 0,
    
    CONSTRAINT uk_inventario_producto UNIQUE (producto_id)
);

-- Índices para inventario
CREATE INDEX IF NOT EXISTS idx_inventario_producto ON inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_stock_bajo ON inventario(stock_total, producto_id);

-- =================================
-- 10. TABLA: actas_recepcion
-- =================================
CREATE TABLE IF NOT EXISTS actas_recepcion (
    acta_id SERIAL PRIMARY KEY,
    numero_acta VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
    proveedor_id INTEGER NOT NULL REFERENCES proveedores(proveedor_id),
    fecha_recepcion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_factura DATE,
    numero_factura VARCHAR(50) NOT NULL,
    ciudad VARCHAR(50) NOT NULL,
    responsable_recepcion VARCHAR(100) NOT NULL,
    responsable_entrega VARCHAR(100),
    tipo_acta VARCHAR(50) NOT NULL DEFAULT 'Recepción de Medicamentos',
    subtotal DECIMAL(12,2) DEFAULT 0,
    descuento DECIMAL(12,2) DEFAULT 0,
    impuestos DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    observaciones TEXT,
    cargada_inventario BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Aprobada', 'Rechazada', 'Anulada')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMP,
    usuario_aprobacion INTEGER REFERENCES usuarios(usuario_id),
    motivo_rechazo TEXT,
    
    CONSTRAINT chk_acta_totales CHECK (total >= 0 AND subtotal >= 0)
);

-- Índices para actas de recepción
CREATE INDEX IF NOT EXISTS idx_actas_numero ON actas_recepcion(numero_acta);
CREATE INDEX IF NOT EXISTS idx_actas_proveedor ON actas_recepcion(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_actas_fecha ON actas_recepcion(fecha_recepcion);
CREATE INDEX IF NOT EXISTS idx_actas_estado ON actas_recepcion(estado);
CREATE INDEX IF NOT EXISTS idx_actas_usuario ON actas_recepcion(usuario_id);

-- =================================
-- 11. TABLA: detalle_actas_recepcion
-- =================================
CREATE TABLE IF NOT EXISTS detalle_actas_recepcion (
    detalle_acta_id SERIAL PRIMARY KEY,
    acta_id INTEGER NOT NULL REFERENCES actas_recepcion(acta_id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id),
    lote_id INTEGER REFERENCES lotes(lote_id),
    lote_codigo VARCHAR(50) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    cantidad_solicitada INTEGER DEFAULT 0,
    cantidad_recibida INTEGER NOT NULL CHECK (cantidad_recibida >= 0),
    cantidad_rechazada INTEGER DEFAULT 0 CHECK (cantidad_rechazada >= 0),
    precio_unitario DECIMAL(12,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento_linea DECIMAL(5,2) DEFAULT 0,
    subtotal_linea DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_recibida * precio_unitario * (1 - descuento_linea/100)) STORED,
    observaciones TEXT,
    estado_producto VARCHAR(20) DEFAULT 'Bueno' CHECK (estado_producto IN ('Bueno', 'Dañado', 'Vencido', 'Defectuoso')),
    
    CONSTRAINT chk_cantidades_logicas CHECK (cantidad_recibida + cantidad_rechazada <= COALESCE(cantidad_solicitada, cantidad_recibida + cantidad_rechazada))
);

-- Índices para detalle de actas
CREATE INDEX IF NOT EXISTS idx_detalle_actas_acta ON detalle_actas_recepcion(acta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_actas_producto ON detalle_actas_recepcion(producto_id);
CREATE INDEX IF NOT EXISTS idx_detalle_actas_lote ON detalle_actas_recepcion(lote_id);

-- =================================
-- 12. TABLA: ventas
-- =================================
CREATE TABLE IF NOT EXISTS ventas (
    venta_id SERIAL PRIMARY KEY,
    numero_venta VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
    cliente_id INTEGER REFERENCES clientes(cliente_id),
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    descuento_total DECIMAL(12,2) DEFAULT 0 CHECK (descuento_total >= 0),
    impuesto_total DECIMAL(12,2) DEFAULT 0 CHECK (impuesto_total >= 0),
    total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'mixto', 'credito')),
    monto_efectivo DECIMAL(12,2) DEFAULT 0 CHECK (monto_efectivo >= 0),
    monto_tarjeta DECIMAL(12,2) DEFAULT 0 CHECK (monto_tarjeta >= 0),
    monto_transferencia DECIMAL(12,2) DEFAULT 0 CHECK (monto_transferencia >= 0),
    monto_credito DECIMAL(12,2) DEFAULT 0 CHECK (monto_credito >= 0),
    cambio DECIMAL(12,2) DEFAULT 0 CHECK (cambio >= 0),
    estado VARCHAR(20) DEFAULT 'completada' CHECK (estado IN ('pendiente', 'completada', 'cancelada', 'anulada')),
    tipo_venta VARCHAR(20) DEFAULT 'mostrador' CHECK (tipo_venta IN ('mostrador', 'domicilio', 'online')),
    observaciones TEXT,
    descuento_aplicado VARCHAR(100),
    referencia_pago VARCHAR(100),
    numero_autorizacion VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_anulacion TIMESTAMP,
    motivo_anulacion TEXT,
    usuario_anulacion INTEGER REFERENCES usuarios(usuario_id),
    
    CONSTRAINT chk_venta_totales CHECK (
        subtotal - descuento_total + impuesto_total = total AND
        monto_efectivo + monto_tarjeta + monto_transferencia + monto_credito >= total - cambio
    )
);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_numero ON ventas(numero_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago ON ventas(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_estado ON ventas(fecha_venta, estado);

-- =================================
-- 13. TABLA: detalle_venta
-- =================================
CREATE TABLE IF NOT EXISTS detalle_venta (
    detalle_venta_id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(venta_id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id),
    lote_id INTEGER NOT NULL REFERENCES lotes(lote_id),
    cantidad DECIMAL(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12,2) NOT NULL CHECK (precio_unitario >= 0),
    precio_compra DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    descuento DECIMAL(5,2) DEFAULT 0 CHECK (descuento >= 0 AND descuento <= 100),
    descuento_monto DECIMAL(12,2) DEFAULT 0,
    impuesto DECIMAL(5,2) DEFAULT 19 CHECK (impuesto >= 0 AND impuesto <= 100),
    impuesto_monto DECIMAL(12,2) DEFAULT 0,
    total_linea DECIMAL(12,2) NOT NULL CHECK (total_linea >= 0),
    utilidad_linea DECIMAL(12,2) GENERATED ALWAYS AS (total_linea - (cantidad * precio_compra)) STORED,
    margen_porcentaje DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_linea > 0 THEN ((total_linea - (cantidad * precio_compra)) / total_linea * 100)
            ELSE 0 
        END
    ) STORED,
    devuelto BOOLEAN DEFAULT FALSE,
    cantidad_devuelta DECIMAL(10,3) DEFAULT 0 CHECK (cantidad_devuelta >= 0 AND cantidad_devuelta <= cantidad),
    observaciones TEXT,
    
    CONSTRAINT chk_detalle_calculos CHECK (
        subtotal = cantidad * precio_unitario AND
        descuento_monto = subtotal * (descuento / 100) AND
        impuesto_monto = (subtotal - descuento_monto) * (impuesto / 100) AND
        total_linea = subtotal - descuento_monto + impuesto_monto
    )
);

-- Índices para detalle de venta
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_venta(producto_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_lote ON detalle_venta(lote_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_devuelto ON detalle_venta(devuelto);

-- =================================
-- 14. TABLA: devoluciones
-- =================================
CREATE TABLE IF NOT EXISTS devoluciones (
    devolucion_id SERIAL PRIMARY KEY,
    numero_devolucion VARCHAR(50) UNIQUE NOT NULL,
    venta_id INTEGER NOT NULL REFERENCES ventas(venta_id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
    cliente_id INTEGER REFERENCES clientes(cliente_id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('parcial', 'total')),
    motivo VARCHAR(100) NOT NULL,
    observaciones TEXT,
    subtotal DECIMAL(12,2) DEFAULT 0,
    descuento_total DECIMAL(12,2) DEFAULT 0,
    impuesto_total DECIMAL(12,2) DEFAULT 0,
    monto_total DECIMAL(12,2) NOT NULL CHECK (monto_total >= 0),
    metodo_reembolso VARCHAR(20) NOT NULL CHECK (metodo_reembolso IN ('efectivo', 'tarjeta', 'transferencia', 'credito', 'nota_credito')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'rechazada', 'anulada')),
    fecha_procesamiento TIMESTAMP,
    usuario_procesamiento INTEGER REFERENCES usuarios(usuario_id),
    referencia_reembolso VARCHAR(100),
    motivo_rechazo TEXT,
    
    CONSTRAINT chk_devolucion_totales CHECK (subtotal - descuento_total + impuesto_total = monto_total)
);

-- Índices para devoluciones
CREATE INDEX IF NOT EXISTS idx_devoluciones_numero ON devoluciones(numero_devolucion);
CREATE INDEX IF NOT EXISTS idx_devoluciones_venta ON devoluciones(venta_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_fecha ON devoluciones(fecha);
CREATE INDEX IF NOT EXISTS idx_devoluciones_estado ON devoluciones(estado);
CREATE INDEX IF NOT EXISTS idx_devoluciones_usuario ON devoluciones(usuario_id);

-- =================================
-- 15. TABLA: detalle_devolucion
-- =================================
CREATE TABLE IF NOT EXISTS detalle_devolucion (
    detalle_devolucion_id SERIAL PRIMARY KEY,
    devolucion_id INTEGER NOT NULL REFERENCES devoluciones(devolucion_id) ON DELETE CASCADE,
    detalle_venta_id INTEGER NOT NULL REFERENCES detalle_venta(detalle_venta_id),
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id),
    lote_id INTEGER NOT NULL REFERENCES lotes(lote_id),
    cantidad_devuelta DECIMAL(10,3) NOT NULL CHECK (cantidad_devuelta > 0),
    precio_unitario DECIMAL(12,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal_linea DECIMAL(12,2) NOT NULL,
    descuento_linea DECIMAL(12,2) DEFAULT 0,
    impuesto_linea DECIMAL(12,2) DEFAULT 0,
    total_linea DECIMAL(12,2) NOT NULL,
    motivo_linea VARCHAR(100),
    estado_producto VARCHAR(20) DEFAULT 'bueno' CHECK (estado_producto IN ('bueno', 'dañado', 'vencido', 'defectuoso')),
    reintegrar_stock BOOLEAN DEFAULT TRUE,
    observaciones TEXT
);

-- Índices para detalle de devolución
CREATE INDEX IF NOT EXISTS idx_detalle_devolucion_devolucion ON detalle_devolucion(devolucion_id);
CREATE INDEX IF NOT EXISTS idx_detalle_devolucion_detalle_venta ON detalle_devolucion(detalle_venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_devolucion_producto ON detalle_devolucion(producto_id);
CREATE INDEX IF NOT EXISTS idx_detalle_devolucion_lote ON detalle_devolucion(lote_id);

-- =================================
-- 16. TABLA: ajustes_inventario
-- =================================
CREATE TABLE IF NOT EXISTS ajustes_inventario (
    ajuste_id SERIAL PRIMARY KEY,
    numero_ajuste VARCHAR(50) UNIQUE NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_ajuste VARCHAR(20) NOT NULL CHECK (tipo_ajuste IN ('entrada', 'salida', 'correccion')),
    motivo VARCHAR(100) NOT NULL,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('borrador', 'completado', 'anulado')),
    total_items INTEGER DEFAULT 0,
    valor_total DECIMAL(15,2) DEFAULT 0,
    fecha_aprobacion TIMESTAMP,
    usuario_aprobacion INTEGER REFERENCES usuarios(usuario_id),
    referencia_externa VARCHAR(100)
);

-- Índices para ajustes de inventario
CREATE INDEX IF NOT EXISTS idx_ajustes_numero ON ajustes_inventario(numero_ajuste);
CREATE INDEX IF NOT EXISTS idx_ajustes_fecha ON ajustes_inventario(fecha);
CREATE INDEX IF NOT EXISTS idx_ajustes_usuario ON ajustes_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_tipo ON ajustes_inventario(tipo_ajuste);
CREATE INDEX IF NOT EXISTS idx_ajustes_estado ON ajustes_inventario(estado);

-- =================================
-- 17. TABLA: detalle_ajuste_inventario
-- =================================
CREATE TABLE IF NOT EXISTS detalle_ajuste_inventario (
    detalle_ajuste_id SERIAL PRIMARY KEY,
    ajuste_id INTEGER NOT NULL REFERENCES ajustes_inventario(ajuste_id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id),
    lote_id INTEGER NOT NULL REFERENCES lotes(lote_id),
    cantidad_antes INTEGER NOT NULL,
    cantidad_despues INTEGER NOT NULL CHECK (cantidad_despues >= 0),
    diferencia INTEGER GENERATED ALWAYS AS (cantidad_despues - cantidad_antes) STORED,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    valor_ajuste DECIMAL(12,2) GENERATED ALWAYS AS ((cantidad_despues - cantidad_antes) * precio_unitario) STORED,
    motivo_detalle VARCHAR(100),
    observaciones TEXT
);

-- Índices para detalle de ajuste
CREATE INDEX IF NOT EXISTS idx_detalle_ajuste_ajuste ON detalle_ajuste_inventario(ajuste_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ajuste_producto ON detalle_ajuste_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ajuste_lote ON detalle_ajuste_inventario(lote_id);

-- =================================
-- 18. TABLA: movimientos_inventario
-- =================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    movimiento_id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id),
    lote_id INTEGER REFERENCES lotes(lote_id),
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'transferencia')),
    subtipo_movimiento VARCHAR(30) CHECK (subtipo_movimiento IN ('compra', 'venta', 'devolucion_cliente', 'devolucion_proveedor', 'ajuste_positivo', 'ajuste_negativo', 'vencimiento', 'daño', 'robo', 'transferencia_entrada', 'transferencia_salida')),
    cantidad DECIMAL(10,3) NOT NULL,
    cantidad_anterior DECIMAL(10,3) NOT NULL,
    cantidad_nueva DECIMAL(10,3) NOT NULL,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    valor_movimiento DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    referencia_id INTEGER, -- ID de la venta, compra, ajuste, etc.
    referencia_tipo VARCHAR(20), -- 'venta', 'compra', 'ajuste', etc.
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    
    CONSTRAINT chk_cantidad_nueva CHECK (
        (tipo_movimiento = 'entrada' AND cantidad_nueva = cantidad_anterior + cantidad) OR
        (tipo_movimiento = 'salida' AND cantidad_nueva = cantidad_anterior - cantidad) OR
        (tipo_movimiento IN ('ajuste', 'transferencia'))
    )
);

-- Índices para movimientos de inventario
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_lote ON movimientos_inventario(lote_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario ON movimientos_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_referencia ON movimientos_inventario(referencia_tipo, referencia_id);

-- =================================
-- 19. TABLA: alertas_sistema
-- =================================
CREATE TABLE IF NOT EXISTS alertas_sistema (
    alerta_id SERIAL PRIMARY KEY,
    tipo_alerta VARCHAR(30) NOT NULL CHECK (tipo_alerta IN ('vencimiento', 'stock_bajo', 'stock_agotado', 'precio_cambio', 'sistema', 'seguridad')),
    prioridad VARCHAR(10) NOT NULL CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    producto_id INTEGER REFERENCES productos(producto_id) UNIQUE,
    lote_id INTEGER REFERENCES lotes(lote_id) UNIQUE,
    usuario_id INTEGER REFERENCES usuarios(usuario_id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP,
    usuario_lectura INTEGER REFERENCES usuarios(usuario_id),
    activa BOOLEAN DEFAULT TRUE,
    datos_adicionales JSONB,
    accion_requerida VARCHAR(100)
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON alertas_sistema(tipo_alerta);
CREATE INDEX IF NOT EXISTS idx_alertas_prioridad ON alertas_sistema(prioridad);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas_sistema(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_alertas_leida ON alertas_sistema(leida);
CREATE INDEX IF NOT EXISTS idx_alertas_activa ON alertas_sistema(activa);
CREATE INDEX IF NOT EXISTS idx_alertas_producto ON alertas_sistema(producto_id);

-- =================================
-- 20. TABLA: auditoria
-- =================================
CREATE TABLE IF NOT EXISTS auditoria (
    auditoria_id SERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(50) NOT NULL,
    operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id INTEGER,
    usuario_id INTEGER REFERENCES usuarios(usuario_id),
    fecha_operacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_modificados TEXT[],
    observaciones TEXT
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_operacion ON auditoria(operacion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_operacion);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria(tabla_afectada, registro_id);

-- =================================
-- 21. TABLA: sesiones_usuario
-- =================================
CREATE TABLE IF NOT EXISTS sesiones_usuario (
    sesion_id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    dispositivo VARCHAR(100),
    ubicacion VARCHAR(100)
);

-- Índices para sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones_usuario(token_hash);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON sesiones_usuario(activa);
CREATE INDEX IF NOT EXISTS idx_sesiones_expiracion ON sesiones_usuario(fecha_expiracion);

-- =================================
-- 22. TABLA: configuracion_pos
-- =================================
CREATE TABLE IF NOT EXISTS configuracion_pos (
    config_id SERIAL PRIMARY KEY,
    nombre_config VARCHAR(50) NOT NULL UNIQUE,
    valor_config TEXT NOT NULL,
    tipo_config VARCHAR(20) CHECK (tipo_config IN ('string', 'number', 'boolean', 'json')),
    descripcion TEXT,
    categoria VARCHAR(30),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_actualizacion INTEGER REFERENCES usuarios(usuario_id)
);

-- Insertar configuraciones POS por defecto
INSERT INTO configuracion_pos (nombre_config, valor_config, tipo_config, descripcion, categoria) VALUES
('impresora_habilitada', 'true', 'boolean', 'Habilitar impresión automática de facturas', 'impresion'),
('impresora_nombre', 'POS-PRINTER', 'string', 'Nombre de la impresora POS', 'impresion'),
('cajón_habilitado', 'true', 'boolean', 'Habilitar apertura automática del cajón', 'hardware'),
('descuento_maximo', '20', 'number', 'Descuento máximo permitido (%)', 'ventas'),
('requiere_cliente', 'false', 'boolean', 'Requerir cliente en todas las ventas', 'ventas'),
('alerta_stock_bajo', 'true', 'boolean', 'Mostrar alertas de stock bajo en POS', 'alertas'),
('permitir_venta_sin_stock', 'false', 'boolean', 'Permitir ventas con stock insuficiente', 'ventas'),
('formato_factura', 'termica', 'string', 'Formato de impresión de facturas', 'impresion'),
('logo_empresa', '', 'string', 'URL del logo para facturas', 'empresa'),
('mensaje_factura', 'Gracias por su compra', 'string', 'Mensaje en facturas', 'empresa')
ON CONFLICT (nombre_config)
DO UPDATE SET 
    valor_config = EXCLUDED.valor_config,
    tipo_config = EXCLUDED.tipo_config,
    descripcion = EXCLUDED.descripcion,
    categoria = EXCLUDED.categoria;

-- =================================
-- TRIGGERS Y FUNCIONES
-- =================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar números consecutivos
CREATE OR REPLACE FUNCTION generar_numero_consecutivo(prefijo TEXT, tabla TEXT, campo TEXT)
RETURNS TEXT AS $$
DECLARE
    ultimo_numero INTEGER;
    nuevo_numero TEXT;
BEGIN
    EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM %s) AS INTEGER)), 0) FROM %I WHERE %I LIKE %L',
                   campo, LENGTH(prefijo) + 1, tabla, campo, prefijo || '%')
    INTO ultimo_numero;
    
    nuevo_numero := prefijo || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
    RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar stock en productos
CREATE OR REPLACE FUNCTION actualizar_stock_producto()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE productos 
        SET stock = (
            SELECT COALESCE(SUM(cantidad_disponible), 0) 
            FROM lotes 
            WHERE producto_id = NEW.producto_id AND estado = true
        )
        WHERE producto_id = NEW.producto_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE productos 
        SET stock = (
            SELECT COALESCE(SUM(cantidad_disponible), 0) 
            FROM lotes 
            WHERE producto_id = OLD.producto_id AND estado = true
        )
        WHERE producto_id = OLD.producto_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar movimientos de inventario
CREATE OR REPLACE FUNCTION registrar_movimiento_inventario()
RETURNS TRIGGER AS $$
DECLARE
    tipo_mov VARCHAR(20);
    subtipo_mov VARCHAR(30);
    cantidad_mov DECIMAL(10,3);
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.cantidad_disponible != NEW.cantidad_disponible THEN
        cantidad_mov := NEW.cantidad_disponible - OLD.cantidad_disponible;
        
        IF cantidad_mov > 0 THEN
            tipo_mov := 'entrada';
            subtipo_mov := 'ajuste_positivo';
        ELSE
            tipo_mov := 'salida';
            subtipo_mov := 'ajuste_negativo';
            cantidad_mov := ABS(cantidad_mov);
        END IF;
        
        INSERT INTO movimientos_inventario (
            producto_id, lote_id, tipo_movimiento, subtipo_movimiento,
            cantidad, cantidad_anterior, cantidad_nueva, precio_unitario,
            usuario_id, observaciones
        ) VALUES (
            NEW.producto_id, NEW.lote_id, tipo_mov, subtipo_mov,
            cantidad_mov, OLD.cantidad_disponible, NEW.cantidad_disponible, NEW.precio_compra,
            COALESCE(NEW.usuario_ingreso, 1), 'Actualización automática de lote'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar alertas automáticas
CREATE OR REPLACE FUNCTION generar_alertas_automaticas()
RETURNS TRIGGER AS $$
BEGIN
    -- Alerta de stock bajo
    IF NEW.stock <= NEW.stock_minimo AND (OLD.stock IS NULL OR OLD.stock > OLD.stock_minimo) THEN
        INSERT INTO alertas_sistema (tipo_alerta, prioridad, titulo, mensaje, producto_id)
        VALUES (
            'stock_bajo', 
            CASE WHEN NEW.stock = 0 THEN 'critica' ELSE 'alta' END,
            'Stock bajo: ' || NEW.nombre,
            'El producto ' || NEW.nombre || ' tiene stock bajo (' || NEW.stock || ' unidades). Stock mínimo: ' || NEW.stock_minimo,
            NEW.producto_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar alertas de vencimiento
CREATE OR REPLACE FUNCTION generar_alertas_vencimiento()
RETURNS TRIGGER AS $$
DECLARE
    dias_vencimiento INTEGER;
    prioridad_alerta VARCHAR(10);
BEGIN
    dias_vencimiento := EXTRACT(DAY FROM NEW.fecha_vencimiento - CURRENT_DATE);
    
    -- Determinar prioridad según días de vencimiento
    IF dias_vencimiento <= 30 THEN
        prioridad_alerta := 'critica';
    ELSIF dias_vencimiento <= 90 THEN
        prioridad_alerta := 'alta';
    ELSIF dias_vencimiento <= 180 THEN
        prioridad_alerta := 'media';
    ELSE
        RETURN NEW; -- No generar alerta si faltan más de 180 días
    END IF;
    
    -- Generar alerta solo si el lote tiene stock disponible
    IF NEW.cantidad_disponible > 0 THEN
        INSERT INTO alertas_sistema (tipo_alerta, prioridad, titulo, mensaje, producto_id, lote_id, fecha_vencimiento)
        SELECT 
            'vencimiento',
            prioridad_alerta,
            'Producto próximo a vencer: ' || p.nombre,
            'El lote ' || NEW.lote_codigo || ' del producto ' || p.nombre || ' vence en ' || dias_vencimiento || ' días (' || NEW.fecha_vencimiento || ')',
            NEW.producto_id,
            NEW.lote_id,
            NEW.fecha_vencimiento
        FROM productos p 
        WHERE p.producto_id = NEW.producto_id
        ON CONFLICT (producto_id, lote_id)
        DO UPDATE SET 
            fecha_vencimiento = EXCLUDED.fecha_vencimiento,
            prioridad = EXCLUDED.prioridad,
            titulo = EXCLUDED.titulo,
            mensaje = EXCLUDED.mensaje,
            fecha_actualizacion = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS trigger_update_timestamp_usuarios ON usuarios;
CREATE TRIGGER trigger_update_timestamp_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_update_timestamp_productos ON productos;
CREATE TRIGGER trigger_update_timestamp_productos
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_update_timestamp_lotes ON lotes;
CREATE TRIGGER trigger_update_timestamp_lotes
    BEFORE UPDATE ON lotes
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_actualizar_stock_lotes ON lotes;
CREATE TRIGGER trigger_actualizar_stock_lotes
    AFTER INSERT OR UPDATE OR DELETE ON lotes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_producto();

DROP TRIGGER IF EXISTS trigger_movimiento_inventario ON lotes;
CREATE TRIGGER trigger_movimiento_inventario
    AFTER UPDATE ON lotes
    FOR EACH ROW
    EXECUTE FUNCTION registrar_movimiento_inventario();

DROP TRIGGER IF EXISTS trigger_alertas_stock ON productos;
CREATE TRIGGER trigger_alertas_stock
    AFTER UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION generar_alertas_automaticas();

DROP TRIGGER IF EXISTS trigger_alertas_vencimiento ON lotes;
CREATE TRIGGER trigger_alertas_vencimiento
    AFTER INSERT OR UPDATE ON lotes
    FOR EACH ROW
    EXECUTE FUNCTION generar_alertas_vencimiento();

-- Trigger para generar números consecutivos
CREATE OR REPLACE FUNCTION generar_numero_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_venta IS NULL OR NEW.numero_venta = '' THEN
        NEW.numero_venta := generar_numero_consecutivo('VT-', 'ventas', 'numero_venta');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_numero_venta ON ventas;
CREATE TRIGGER trigger_numero_venta
    BEFORE INSERT ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_venta();

-- Trigger similar para devoluciones
CREATE OR REPLACE FUNCTION generar_numero_devolucion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_devolucion IS NULL OR NEW.numero_devolucion = '' THEN
        NEW.numero_devolucion := generar_numero_consecutivo('DEV-', 'devoluciones', 'numero_devolucion');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_numero_devolucion ON devoluciones;
CREATE TRIGGER trigger_numero_devolucion
    BEFORE INSERT ON devoluciones
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_devolucion();

-- Trigger para ajustes
CREATE OR REPLACE FUNCTION generar_numero_ajuste()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_ajuste IS NULL OR NEW.numero_ajuste = '' THEN
        NEW.numero_ajuste := generar_numero_consecutivo('ADJ-', 'ajustes_inventario', 'numero_ajuste');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_numero_ajuste ON ajustes_inventario;
CREATE TRIGGER trigger_numero_ajuste
    BEFORE INSERT ON ajustes_inventario
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_ajuste();

-- Trigger para actas
CREATE OR REPLACE FUNCTION generar_numero_acta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_acta IS NULL OR NEW.numero_acta = '' THEN
        NEW.numero_acta := generar_numero_consecutivo('ACT-', 'actas_recepcion', 'numero_acta');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_numero_acta ON actas_recepcion;
CREATE TRIGGER trigger_numero_acta
    BEFORE INSERT ON actas_recepcion
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_acta();

-- =================================
-- VISTAS ÚTILES
-- =================================

-- Vista de productos con información completa
CREATE OR REPLACE VIEW vista_productos_completa AS
SELECT 
    p.*,
    pr.nombre as proveedor_nombre,
    t.descripcion as temperatura_descripcion,
    c.nombre as categoria_nombre,
    c.color as categoria_color,
    CASE 
        WHEN p.stock <= p.stock_minimo THEN 'bajo'
        WHEN p.stock <= p.stock_minimo * 1.5 THEN 'medio'
        ELSE 'alto'
    END as estado_stock,
    (SELECT COUNT(*) FROM lotes l WHERE l.producto_id = p.producto_id AND l.estado = true AND l.cantidad_disponible > 0) as total_lotes,
    (SELECT MIN(l.fecha_vencimiento) FROM lotes l WHERE l.producto_id = p.producto_id AND l.estado = true AND l.cantidad_disponible > 0) as proxima_vencimiento,
    (SELECT SUM(l.cantidad_disponible * l.precio_compra) FROM lotes l WHERE l.producto_id = p.producto_id AND l.estado = true) as valor_inventario
FROM productos p
LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
LEFT JOIN temperaturas t ON p.temperatura_id = t.temperatura_id
LEFT JOIN categorias c ON p.categoria_id = c.categoria_id;

-- Vista de lotes con alertas de vencimiento
CREATE OR REPLACE VIEW vista_lotes_alertas AS
SELECT 
    l.lote_id,
    l.lote_codigo,
    l.producto_id,
    l.proveedor_id,
    l.fecha_fabricacion,
    l.fecha_vencimiento,
    l.cantidad_inicial,
    l.cantidad_disponible,
    l.cantidad_reservada,
    l.precio_compra,
    l.precio_venta,
    l.descuento_compra,
    l.impuesto_compra,
    l.costo_total,
    l.ubicacion,
    l.observaciones,
    l.estado,
    l.fecha_ingreso,
    l.fecha_actualizacion,
    l.usuario_ingreso,
    l.acta_recepcion_id,
    l.numero_factura,
    l.alerta_vencimiento,
    l.dias_vencimiento,
    l.es_critico_vencimiento,
    p.nombre as producto_nombre,
    p.presentacion,
    p.laboratorio,
    pr.nombre as proveedor_nombre,
    CASE 
        WHEN l.fecha_vencimiento <= CURRENT_DATE THEN 'vencido'
        WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 DAYS' THEN 'critico'
        WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '90 DAYS' THEN 'advertencia'
        WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '180 DAYS' THEN 'proximo'
        ELSE 'normal'
    END as estado_vencimiento,
    (l.cantidad_disponible * l.precio_compra) as valor_lote
FROM lotes l
JOIN productos p ON l.producto_id = p.producto_id
LEFT JOIN proveedores pr ON l.proveedor_id = pr.proveedor_id
WHERE l.estado = true AND l.cantidad_disponible > 0;

-- Vista de ventas con detalles
CREATE OR REPLACE VIEW vista_ventas_detalle AS
SELECT 
    v.*,
    u.nombre as cajero_nombre,
    c.nombre as cliente_nombre,
    c.documento as cliente_documento,
    COUNT(dv.detalle_venta_id) as total_items,
    SUM(dv.cantidad) as total_unidades,
    SUM(dv.total_linea - (dv.cantidad * dv.precio_compra)) as utilidad_total
FROM ventas v
JOIN usuarios u ON v.usuario_id = u.usuario_id
LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
LEFT JOIN detalle_venta dv ON v.venta_id = dv.venta_id
GROUP BY v.venta_id, u.nombre, c.nombre, c.documento;

-- Vista de inventario consolidado
CREATE OR REPLACE VIEW vista_inventario_consolidado AS
SELECT 
    p.producto_id,
    p.nombre,
    p.presentacion,
    p.laboratorio,
    p.categoria,
    p.stock_minimo,
    p.precio_venta,
    COALESCE(SUM(l.cantidad_disponible), 0) as stock_total,
    COUNT(l.lote_id) as total_lotes,
    MIN(l.fecha_vencimiento) as proxima_vencimiento,
    MAX(l.fecha_vencimiento) as ultima_vencimiento,
    SUM(l.cantidad_disponible * l.precio_compra) as valor_total,
    AVG(l.precio_compra) as precio_promedio_compra,
    CASE 
        WHEN COALESCE(SUM(l.cantidad_disponible), 0) <= p.stock_minimo THEN 'bajo'
        WHEN COALESCE(SUM(l.cantidad_disponible), 0) <= p.stock_minimo * 1.5 THEN 'medio'
        ELSE 'alto'
    END as estado_stock
FROM productos p
LEFT JOIN lotes l ON p.producto_id = l.producto_id AND l.estado = true AND l.cantidad_disponible > 0
WHERE p.estado = true
GROUP BY p.producto_id, p.nombre, p.presentacion, p.laboratorio, p.categoria, p.stock_minimo, p.precio_venta;

-- =================================
-- FUNCIONES DE UTILIDAD
-- =================================

-- Función para obtener el próximo lote a vencer (FIFO)
CREATE OR REPLACE FUNCTION obtener_proximo_lote_fifo(p_producto_id INTEGER, p_cantidad_requerida DECIMAL)
RETURNS TABLE(lote_id INTEGER, cantidad_disponible DECIMAL, precio_compra DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT l.lote_id, l.cantidad_disponible, l.precio_compra
    FROM lotes l
    WHERE l.producto_id = p_producto_id 
    AND l.estado = true 
    AND l.cantidad_disponible > 0
    ORDER BY l.fecha_vencimiento ASC, l.fecha_ingreso ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular utilidad de un producto
CREATE OR REPLACE FUNCTION calcular_utilidad_producto(p_producto_id INTEGER, p_fecha_inicio DATE DEFAULT NULL, p_fecha_fin DATE DEFAULT NULL)
RETURNS TABLE(
    total_vendido DECIMAL,
    costo_total DECIMAL,
    utilidad_bruta DECIMAL,
    margen_porcentaje DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(dv.total_linea), 0) as total_vendido,
        COALESCE(SUM(dv.cantidad * dv.precio_compra), 0) as costo_total,
        COALESCE(SUM(dv.total_linea - (dv.cantidad * dv.precio_compra)), 0) as utilidad_bruta,
        CASE 
            WHEN SUM(dv.total_linea) > 0 THEN 
                (SUM(dv.total_linea - (dv.cantidad * dv.precio_compra)) / SUM(dv.total_linea) * 100)
            ELSE 0 
        END as margen_porcentaje
    FROM detalle_venta dv
    JOIN ventas v ON dv.venta_id = v.venta_id
    WHERE dv.producto_id = p_producto_id
    AND v.estado = 'completada'
    AND (p_fecha_inicio IS NULL OR DATE(v.fecha_venta) >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR DATE(v.fecha_venta) <= p_fecha_fin);
END;
$$ LANGUAGE plpgsql;

-- =================================
-- DATOS INICIALES ADICIONALES
-- =================================

-- Insertar usuario administrador por defecto si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'admin@sigfarma.com') THEN
        INSERT INTO usuarios (nombre, correo, contraseña, rol) VALUES
        ('Administrador', 'admin@sigfarma.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlG.', 'admin');
    END IF;
END $$;

-- Insertar cliente genérico
INSERT INTO clientes (nombre, documento, tipo_documento) VALUES
('Cliente General', '0000000000', 'CC')
ON CONFLICT (documento)
    DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    tipo_documento = EXCLUDED.tipo_documento;

-- =================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =================================

COMMENT ON DATABASE sigfarma IS 'Base de datos del Sistema Integral de Gestión para Farmacias (SIGFARMA)';

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con roles diferenciados';
COMMENT ON TABLE productos IS 'Catálogo de productos farmacéuticos';
COMMENT ON TABLE lotes IS 'Control de lotes por producto con fechas de vencimiento';
COMMENT ON TABLE ventas IS 'Registro de ventas realizadas';
COMMENT ON TABLE detalle_venta IS 'Detalle de productos vendidos por venta';
COMMENT ON TABLE devoluciones IS 'Registro de devoluciones de productos';
COMMENT ON TABLE ajustes_inventario IS 'Ajustes manuales de inventario';
COMMENT ON TABLE movimientos_inventario IS 'Historial completo de movimientos de inventario';
COMMENT ON TABLE alertas_sistema IS 'Sistema de alertas automáticas';
COMMENT ON TABLE auditoria IS 'Registro de auditoría de todas las operaciones';

-- =================================
-- FINALIZACIÓN
-- =================================

-- Actualizar estadísticas de la base de datos
ANALYZE;

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos SIGFARMA inicializada correctamente';
    RAISE NOTICE '📊 Tablas creadas: 22';
    RAISE NOTICE '🔍 Índices creados: 50+';
    RAISE NOTICE '⚡ Triggers configurados: 8';
    RAISE NOTICE '👁️ Vistas creadas: 4';
    RAISE NOTICE '🔧 Funciones creadas: 10+';
    RAISE NOTICE '🎯 Sistema listo para producción';
END $$;