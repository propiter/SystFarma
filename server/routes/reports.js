import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/ventas - Reporte de ventas
router.get('/ventas', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { 
      fecha_inicio = '', 
      fecha_fin = '',
      usuario_id = '',
      metodo_pago = '',
      formato = 'json'
    } = req.query;

    let whereClause = "WHERE v.estado = 'completada'";
    let params = [];
    let paramCount = 0;

    if (fecha_inicio) {
      paramCount++;
      whereClause += ` AND DATE(v.fecha_venta) >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      whereClause += ` AND DATE(v.fecha_venta) <= $${paramCount}`;
      params.push(fecha_fin);
    }

    if (usuario_id) {
      paramCount++;
      whereClause += ` AND v.usuario_id = $${paramCount}`;
      params.push(usuario_id);
    }

    if (metodo_pago) {
      paramCount++;
      whereClause += ` AND v.metodo_pago = $${paramCount}`;
      params.push(metodo_pago);
    }

    const [resumenGeneral, ventasDetalladas, ventasPorDia, ventasPorProducto, ventasPorMetodo] = await Promise.all([
      // Resumen general
      query(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          AVG(v.total) as promedio_venta,
          SUM(v.subtotal) as subtotal_total,
          SUM(v.descuento_total) as descuento_total,
          SUM(v.impuesto_total) as impuesto_total,
          MIN(v.fecha_venta) as primera_venta,
          MAX(v.fecha_venta) as ultima_venta
        FROM ventas v
        ${whereClause}
      `, params),

      // Ventas detalladas
      query(`
        SELECT 
          v.*,
          u.nombre as cajero_nombre,
          c.nombre as cliente_nombre,
          COUNT(dv.detalle_venta_id) as total_items
        FROM ventas v
        JOIN usuarios u ON v.usuario_id = u.usuario_id
        LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
        LEFT JOIN detalle_venta dv ON v.venta_id = dv.venta_id
        ${whereClause}
        GROUP BY v.venta_id, u.nombre, c.nombre
        ORDER BY v.fecha_venta DESC
        LIMIT 1000
      `, params),

      // Ventas por día
      query(`
        SELECT 
          DATE(v.fecha_venta) as fecha,
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          AVG(v.total) as promedio_venta
        FROM ventas v
        ${whereClause}
        GROUP BY DATE(v.fecha_venta)
        ORDER BY fecha DESC
      `, params),

      // Ventas por producto
      query(`
        SELECT 
          p.nombre as producto_nombre,
          p.presentacion,
          p.laboratorio,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.total_linea) as monto_total,
          AVG(dv.precio_unitario) as precio_promedio,
          COUNT(DISTINCT v.venta_id) as ventas_count
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN ventas v ON dv.venta_id = v.venta_id
        ${whereClause}
        GROUP BY p.producto_id, p.nombre, p.presentacion, p.laboratorio
        ORDER BY cantidad_vendida DESC
        LIMIT 50
      `, params),

      // Ventas por método de pago
      query(`
        SELECT 
          v.metodo_pago,
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          AVG(v.total) as promedio_venta,
          ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as porcentaje
        FROM ventas v
        ${whereClause}
        GROUP BY v.metodo_pago
        ORDER BY monto_total DESC
      `, params)
    ]);

    const reporte = {
      resumen: resumenGeneral.rows[0],
      ventas: ventasDetalladas.rows,
      ventasPorDia: ventasPorDia.rows,
      ventasPorProducto: ventasPorProducto.rows,
      ventasPorMetodo: ventasPorMetodo.rows,
      parametros: {
        fecha_inicio,
        fecha_fin,
        usuario_id,
        metodo_pago
      },
      generado_en: new Date().toISOString()
    };

    res.json(reporte);

  } catch (error) {
    console.error('Error generando reporte de ventas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/reports/inventario - Reporte de inventario
router.get('/inventario', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { 
      categoria = '',
      estado_vencimiento = '',
      proveedor_id = '',
      formato = 'json'
    } = req.query;

    let whereClause = 'WHERE p.estado = true';
    let params = [];
    let paramCount = 0;

    if (categoria) {
      paramCount++;
      whereClause += ` AND p.categoria = $${paramCount}`;
      params.push(categoria);
    }

    if (proveedor_id) {
      paramCount++;
      whereClause += ` AND p.proveedor_id = $${paramCount}`;
      params.push(proveedor_id);
    }

    if (estado_vencimiento) {
      if (estado_vencimiento === 'rojo') {
        whereClause += ` AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months'`;
      } else if (estado_vencimiento === 'amarillo') {
        whereClause += ` AND l.fecha_vencimiento > CURRENT_DATE + INTERVAL '6 months' AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months'`;
      } else if (estado_vencimiento === 'verde') {
        whereClause += ` AND l.fecha_vencimiento > CURRENT_DATE + INTERVAL '12 months'`;
      }
    }

    const [resumenGeneral, inventarioDetallado, inventarioPorCategoria, alertasVencimiento, stockBajo] = await Promise.all([
      // Resumen general
      query(`
        SELECT 
          COUNT(DISTINCT p.producto_id) as total_productos,
          COUNT(DISTINCT l.lote_id) as total_lotes,
          SUM(l.cantidad_disponible) as total_unidades,
          SUM(l.cantidad_disponible * l.precio_compra) as valor_total_inventario,
          COUNT(CASE WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 1 END) as lotes_criticos,
          COUNT(CASE WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' AND l.fecha_vencimiento > CURRENT_DATE + INTERVAL '6 months' THEN 1 END) as lotes_advertencia,
          COUNT(CASE WHEN p.stock <= p.stock_minimo THEN 1 END) as productos_stock_bajo
        FROM productos p
        LEFT JOIN lotes l ON p.producto_id = l.producto_id AND l.cantidad_disponible > 0 AND l.estado = true
        ${whereClause}
      `, params),

      // Inventario detallado
      query(`
        SELECT 
          p.nombre as producto_nombre,
          p.presentacion,
          p.laboratorio,
          p.categoria,
          p.stock,
          p.stock_minimo,
          p.precio_venta,
          pr.nombre as proveedor_nombre,
          l.lote_codigo,
          l.fecha_vencimiento,
          l.cantidad_disponible,
          l.precio_compra,
          (l.cantidad_disponible * l.precio_compra) as valor_lote,
          CASE 
            WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 'rojo'
            WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' THEN 'amarillo'
            ELSE 'verde'
          END as estado_vencimiento,
          EXTRACT(days FROM l.fecha_vencimiento - CURRENT_DATE) as dias_vencimiento
        FROM productos p
        LEFT JOIN lotes l ON p.producto_id = l.producto_id AND l.cantidad_disponible > 0 AND l.estado = true
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
        ${whereClause}
        ORDER BY p.nombre, l.fecha_vencimiento
      `, params),

      // Inventario por categoría
      query(`
        SELECT 
          p.categoria,
          COUNT(DISTINCT p.producto_id) as total_productos,
          COUNT(DISTINCT l.lote_id) as total_lotes,
          SUM(l.cantidad_disponible) as total_unidades,
          SUM(l.cantidad_disponible * l.precio_compra) as valor_total,
          COUNT(CASE WHEN p.stock <= p.stock_minimo THEN 1 END) as productos_stock_bajo
        FROM productos p
        LEFT JOIN lotes l ON p.producto_id = l.producto_id AND l.cantidad_disponible > 0 AND l.estado = true
        WHERE p.estado = true
        GROUP BY p.categoria
        ORDER BY valor_total DESC
      `),

      // Alertas de vencimiento
      query(`
        SELECT 
          p.nombre as producto_nombre,
          p.presentacion,
          l.lote_codigo,
          l.fecha_vencimiento,
          l.cantidad_disponible,
          CASE 
            WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 'rojo'
            WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' THEN 'amarillo'
            ELSE 'verde'
          END as prioridad,
          EXTRACT(days FROM l.fecha_vencimiento - CURRENT_DATE) as dias_vencimiento
        FROM lotes l
        JOIN productos p ON l.producto_id = p.producto_id
        WHERE l.cantidad_disponible > 0
        AND p.estado = true
        AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months'
        ORDER BY l.fecha_vencimiento ASC
        LIMIT 100
      `),

      // Stock bajo
      query(`
        SELECT 
          p.nombre as producto_nombre,
          p.presentacion,
          p.laboratorio,
          p.stock,
          p.stock_minimo,
          (p.stock_minimo - p.stock) as deficit,
          pr.nombre as proveedor_nombre
        FROM productos p
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
        WHERE p.stock <= p.stock_minimo
        AND p.estado = true
        ORDER BY deficit DESC
        LIMIT 50
      `)
    ]);

    const reporte = {
      resumen: resumenGeneral.rows[0],
      inventario: inventarioDetallado.rows,
      inventarioPorCategoria: inventarioPorCategoria.rows,
      alertasVencimiento: alertasVencimiento.rows,
      stockBajo: stockBajo.rows,
      parametros: {
        categoria,
        estado_vencimiento,
        proveedor_id
      },
      generado_en: new Date().toISOString()
    };

    res.json(reporte);

  } catch (error) {
    console.error('Error generando reporte de inventario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/reports/proveedores - Reporte de proveedores
router.get('/proveedores', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { 
      fecha_inicio = '', 
      fecha_fin = '',
      proveedor_id = ''
    } = req.query;

    let whereClause = 'WHERE a.estado = $1';
    let params = ['Aprobada'];
    let paramCount = 1;

    if (fecha_inicio) {
      paramCount++;
      whereClause += ` AND a.fecha_recepcion >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      whereClause += ` AND a.fecha_recepcion <= $${paramCount}`;
      params.push(fecha_fin);
    }

    if (proveedor_id) {
      paramCount++;
      whereClause += ` AND p.proveedor_id = $${paramCount}`;
      params.push(proveedor_id);
    }

    const [resumenProveedores, comprasPorProveedor, productosProveedor, actasRecepcion] = await Promise.all([
      // Resumen de proveedores
      query(`
        SELECT 
          COUNT(DISTINCT p.proveedor_id) as total_proveedores,
          COUNT(DISTINCT pr.producto_id) as total_productos,
          COUNT(DISTINCT a.acta_id) as total_actas,
          SUM(ap.cantidad_recibida * ap.precio_compra) as monto_total_compras
        FROM proveedores p
        LEFT JOIN productos pr ON p.proveedor_id = pr.proveedor_id AND pr.estado = true
        LEFT JOIN actas a ON p.proveedor_id = a.proveedor_id
        LEFT JOIN actas_productos ap ON a.acta_id = ap.acta_id
        ${whereClause}
      `, params),

      // Compras por proveedor
      query(`
        SELECT 
          p.nombre as proveedor_nombre,
          p.contacto,
          p.telefono,
          p.correo,
          COUNT(DISTINCT a.acta_id) as total_actas,
          COUNT(DISTINCT pr.producto_id) as productos_activos,
          SUM(ap.cantidad_recibida * ap.precio_compra) as monto_total_compras,
          MAX(a.fecha_recepcion) as ultima_compra,
          AVG(ap.precio_compra) as precio_promedio
        FROM proveedores p
        LEFT JOIN actas a ON p.proveedor_id = a.proveedor_id
        LEFT JOIN actas_productos ap ON a.acta_id = ap.acta_id
        LEFT JOIN productos pr ON p.proveedor_id = pr.proveedor_id AND pr.estado = true
        ${whereClause}
        GROUP BY p.proveedor_id, p.nombre, p.contacto, p.telefono, p.correo
        ORDER BY monto_total_compras DESC NULLS LAST
      `, params),

      // Productos por proveedor
      query(`
        SELECT 
          p.nombre as proveedor_nombre,
          pr.nombre as producto_nombre,
          pr.presentacion,
          pr.laboratorio,
          COUNT(l.lote_id) as total_lotes,
          SUM(l.cantidad_disponible) as stock_actual,
          AVG(l.precio_compra) as precio_promedio_compra,
          pr.precio_venta,
          MAX(l.fecha_ingreso) as ultimo_ingreso
        FROM proveedores p
        JOIN productos pr ON p.proveedor_id = pr.proveedor_id
        LEFT JOIN lotes l ON pr.producto_id = l.producto_id AND l.estado = true
        WHERE pr.estado = true
        GROUP BY p.proveedor_id, p.nombre, pr.producto_id, pr.nombre, pr.presentacion, pr.laboratorio, pr.precio_venta
        ORDER BY p.nombre, pr.nombre
      `),

      // Actas de recepción
      query(`
        SELECT 
          a.*,
          p.nombre as proveedor_nombre,
          u.nombre as usuario_nombre,
          COUNT(ap.acta_producto_id) as total_productos,
          SUM(ap.cantidad_recibida * ap.precio_compra) as monto_total
        FROM actas a
        JOIN proveedores p ON a.proveedor_id = p.proveedor_id
        JOIN usuarios u ON a.usuario_id = u.usuario_id
        LEFT JOIN actas_productos ap ON a.acta_id = ap.acta_id
        ${whereClause}
        GROUP BY a.acta_id, p.nombre, u.nombre
        ORDER BY a.fecha_recepcion DESC
        LIMIT 100
      `, params)
    ]);

    const reporte = {
      resumen: resumenProveedores.rows[0],
      comprasPorProveedor: comprasPorProveedor.rows,
      productosProveedor: productosProveedor.rows,
      actasRecepcion: actasRecepcion.rows,
      parametros: {
        fecha_inicio,
        fecha_fin,
        proveedor_id
      },
      generado_en: new Date().toISOString()
    };

    res.json(reporte);

  } catch (error) {
    console.error('Error generando reporte de proveedores:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/reports/utilidades - Reporte de utilidades
router.get('/utilidades', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { 
      fecha_inicio = '', 
      fecha_fin = '',
      producto_id = '',
      categoria = ''
    } = req.query;

    let whereClause = "WHERE v.estado = 'completada'";
    let params = [];
    let paramCount = 0;

    if (fecha_inicio) {
      paramCount++;
      whereClause += ` AND DATE(v.fecha_venta) >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      whereClause += ` AND DATE(v.fecha_venta) <= $${paramCount}`;
      params.push(fecha_fin);
    }

    if (producto_id) {
      paramCount++;
      whereClause += ` AND p.producto_id = $${paramCount}`;
      params.push(producto_id);
    }

    if (categoria) {
      paramCount++;
      whereClause += ` AND p.categoria = $${paramCount}`;
      params.push(categoria);
    }

    const [resumenUtilidades, utilidadesPorProducto, utilidadesPorCategoria, utilidadesPorDia] = await Promise.all([
      // Resumen de utilidades
      query(`
        SELECT 
          SUM(dv.total_linea) as ingresos_totales,
          SUM(dv.cantidad * l.precio_compra) as costos_totales,
          SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) as utilidad_bruta,
          AVG(((dv.total_linea - (dv.cantidad * l.precio_compra)) / dv.total_linea) * 100) as margen_promedio,
          COUNT(DISTINCT v.venta_id) as total_ventas,
          SUM(dv.cantidad) as total_unidades_vendidas
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.venta_id
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN lotes l ON dv.lote_id = l.lote_id
        ${whereClause}
      `, params),

      // Utilidades por producto
      query(`
        SELECT 
          p.nombre as producto_nombre,
          p.presentacion,
          p.laboratorio,
          p.categoria,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.total_linea) as ingresos_totales,
          SUM(dv.cantidad * l.precio_compra) as costos_totales,
          SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) as utilidad_bruta,
          CASE 
            WHEN SUM(dv.total_linea) > 0 THEN 
              ROUND(((SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) / SUM(dv.total_linea)) * 100)::numeric, 2)
            ELSE 0 
          END as margen_porcentaje,
          COUNT(DISTINCT v.venta_id) as ventas_count
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.venta_id
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN lotes l ON dv.lote_id = l.lote_id
        ${whereClause}
        GROUP BY p.producto_id, p.nombre, p.presentacion, p.laboratorio, p.categoria
        ORDER BY utilidad_bruta DESC
        LIMIT 50
      `, params),

      // Utilidades por categoría
      query(`
        SELECT 
          p.categoria,
          COUNT(DISTINCT p.producto_id) as productos_count,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.total_linea) as ingresos_totales,
          SUM(dv.cantidad * l.precio_compra) as costos_totales,
          SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) as utilidad_bruta,
          CASE 
            WHEN SUM(dv.total_linea) > 0 THEN 
              ROUND(((SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) / SUM(dv.total_linea)) * 100)::numeric, 2)
            ELSE 0 
          END as margen_porcentaje
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.venta_id
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN lotes l ON dv.lote_id = l.lote_id
        ${whereClause}
        GROUP BY p.categoria
        ORDER BY utilidad_bruta DESC
      `, params),

      // Utilidades por día
      query(`
        SELECT 
          DATE(v.fecha_venta) as fecha,
          COUNT(DISTINCT v.venta_id) as total_ventas,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.total_linea) as ingresos_totales,
          SUM(dv.cantidad * l.precio_compra) as costos_totales,
          SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) as utilidad_bruta,
          CASE 
            WHEN SUM(dv.total_linea) > 0 THEN 
              ROUND(((SUM(dv.total_linea - (dv.cantidad * l.precio_compra)) / SUM(dv.total_linea)) * 100)::numeric, 2)
            ELSE 0 
          END as margen_porcentaje
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.venta_id
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN lotes l ON dv.lote_id = l.lote_id
        ${whereClause}
        GROUP BY DATE(v.fecha_venta)
        ORDER BY fecha DESC
        LIMIT 30
      `, params)
    ]);

    const reporte = {
      resumen: resumenUtilidades.rows[0],
      utilidadesPorProducto: utilidadesPorProducto.rows,
      utilidadesPorCategoria: utilidadesPorCategoria.rows,
      utilidadesPorDia: utilidadesPorDia.rows,
      parametros: {
        fecha_inicio,
        fecha_fin,
        producto_id,
        categoria
      },
      generado_en: new Date().toISOString()
    };

    res.json(reporte);

  } catch (error) {
    console.error('Error generando reporte de utilidades:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/reports/corte-caja - Reporte de corte de caja
router.get('/corte-caja', authenticateToken, authorize('admin', 'cajero'), async (req, res) => {
  try {
    const { 
      fecha_inicio = '', 
      fecha_fin = '',
      usuario_id = ''
    } = req.query;

    // Si no se especifican fechas, usar el día actual
    const fechaInicio = fecha_inicio || new Date().toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    let whereClause = "WHERE v.estado = 'completada' AND DATE(v.fecha_venta) >= $1 AND DATE(v.fecha_venta) <= $2";
    let params = [fechaInicio, fechaFin];
    let paramCount = 2;

    if (usuario_id) {
      paramCount++;
      whereClause += ` AND v.usuario_id = $${paramCount}`;
      params.push(usuario_id);
    }

    const [resumenGeneral, ventasPorMetodo, ventasPorUsuario, detalleVentas, devoluciones] = await Promise.all([
      // Resumen general
      query(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          SUM(v.subtotal) as subtotal_total,
          SUM(v.descuento_total) as descuento_total,
          SUM(v.impuesto_total) as impuesto_total,
          SUM(v.monto_efectivo) as total_efectivo,
          SUM(v.monto_tarjeta) as total_tarjeta,
          SUM(v.monto_transferencia) as total_transferencia,
          MIN(v.fecha_venta) as primera_venta,
          MAX(v.fecha_venta) as ultima_venta
        FROM ventas v
        ${whereClause}
      `, params),

      // Ventas por método de pago
      query(`
        SELECT 
          v.metodo_pago,
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          SUM(v.monto_efectivo) as total_efectivo,
          SUM(v.monto_tarjeta) as total_tarjeta,
          SUM(v.monto_transferencia) as total_transferencia
        FROM ventas v
        ${whereClause}
        GROUP BY v.metodo_pago
        ORDER BY monto_total DESC
      `, params),

      // Ventas por usuario
      query(`
        SELECT 
          u.nombre as cajero_nombre,
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          AVG(v.total) as promedio_venta,
          MIN(v.fecha_venta) as primera_venta,
          MAX(v.fecha_venta) as ultima_venta
        FROM ventas v
        JOIN usuarios u ON v.usuario_id = u.usuario_id
        ${whereClause}
        GROUP BY u.usuario_id, u.nombre
        ORDER BY monto_total DESC
      `, params),

      // Detalle de ventas
      query(`
        SELECT 
          v.venta_id,
          v.fecha_venta,
          v.total,
          v.metodo_pago,
          u.nombre as cajero_nombre,
          c.nombre as cliente_nombre
        FROM ventas v
        JOIN usuarios u ON v.usuario_id = u.usuario_id
        LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
        ${whereClause}
        ORDER BY v.fecha_venta DESC
      `, params),

      // Devoluciones
      query(`
        SELECT 
          d.devolucion_id,
          d.fecha,
          d.tipo,
          d.motivo,
          d.monto_total,
          d.metodo_reembolso,
          u.nombre as usuario_nombre,
          v.venta_id
        FROM devoluciones d
        JOIN usuarios u ON d.usuario_id = u.usuario_id
        JOIN ventas v ON d.venta_id = v.venta_id
        WHERE d.estado = 'completada'
        AND DATE(d.fecha) >= $1 AND DATE(d.fecha) <= $2
        ORDER BY d.fecha DESC
      `, [fechaInicio, fechaFin])
    ]);

    const reporte = {
      resumen: resumenGeneral.rows[0],
      ventasPorMetodo: ventasPorMetodo.rows,
      ventasPorUsuario: ventasPorUsuario.rows,
      detalleVentas: detalleVentas.rows,
      devoluciones: devoluciones.rows,
      parametros: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        usuario_id
      },
      generado_en: new Date().toISOString()
    };

    res.json(reporte);

  } catch (error) {
    console.error('Error generando corte de caja:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;