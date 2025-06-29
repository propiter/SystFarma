import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    // Métricas principales
    const [
      totalProductos,
      ventasHoy,
      productosVencimiento,
      stockBajo,
      ventasSemanales
    ] = await Promise.all([
      // Total de productos activos
      query('SELECT COUNT(*) as total FROM productos WHERE estado = true'),
      
      // Ventas de hoy
      query(`
        SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total_monto
        FROM ventas 
        WHERE DATE(fecha_venta) = CURRENT_DATE 
        AND estado = 'completada'
      `),
      
      // Productos próximos a vencer (6 meses)
      query(`
        SELECT COUNT(DISTINCT l.producto_id) as total
        FROM lotes l
        JOIN productos p ON l.producto_id = p.producto_id
        WHERE l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months'
        AND l.cantidad_disponible > 0
        AND p.estado = true
      `),
      
      // Productos con stock bajo
      query(`
        SELECT COUNT(*) as total
        FROM productos p
        WHERE p.stock <= p.stock_minimo
        AND p.estado = true
      `),
      
      // Ventas de los últimos 7 días
      query(`
        SELECT 
          DATE(fecha_venta) as fecha,
          COUNT(*) as total_ventas,
          SUM(total) as total_monto
        FROM ventas 
        WHERE fecha_venta >= CURRENT_DATE - INTERVAL '7 days'
        AND estado = 'completada'
        GROUP BY DATE(fecha_venta)
        ORDER BY fecha DESC
      `)
    ]);

    // Productos más vendidos hoy
    const productosVendidos = await query(`
      SELECT 
        p.nombre,
        p.presentacion,
        SUM(dv.cantidad) as cantidad_vendida,
        SUM(dv.total_linea) as total_vendido
      FROM detalle_venta dv
      JOIN productos p ON dv.producto_id = p.producto_id
      JOIN ventas v ON dv.venta_id = v.venta_id
      WHERE DATE(v.fecha_venta) = CURRENT_DATE
      AND v.estado = 'completada'
      GROUP BY p.producto_id, p.nombre, p.presentacion
      ORDER BY cantidad_vendida DESC
      LIMIT 5
    `);

    // Alertas de vencimiento por categoría
    const alertasVencimiento = await query(`
      SELECT 
        CASE 
          WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 'rojo'
          WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' THEN 'amarillo'
          ELSE 'verde'
        END as categoria,
        COUNT(DISTINCT l.producto_id) as total
      FROM lotes l
      JOIN productos p ON l.producto_id = p.producto_id
      WHERE l.cantidad_disponible > 0
      AND p.estado = true
      GROUP BY categoria
    `);

    res.json({
      metricas: {
        totalProductos: parseInt(totalProductos.rows[0].total),
        ventasHoy: {
          cantidad: parseInt(ventasHoy.rows[0].total_ventas),
          monto: parseFloat(ventasHoy.rows[0].total_monto)
        },
        productosVencimiento: parseInt(productosVencimiento.rows[0].total),
        stockBajo: parseInt(stockBajo.rows[0].total)
      },
      ventasSemanales: ventasSemanales.rows,
      productosVendidos: productosVendidos.rows,
      alertasVencimiento: alertasVencimiento.rows
    });

  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    // Alertas críticas
    const alertasCriticas = await query(`
      SELECT 
        p.nombre,
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
      LIMIT 10
    `);

    // Productos con stock bajo
    const stockBajo = await query(`
      SELECT 
        p.nombre,
        p.presentacion,
        p.stock,
        p.stock_minimo,
        (p.stock_minimo - p.stock) as deficit
      FROM productos p
      WHERE p.stock <= p.stock_minimo
      AND p.estado = true
      ORDER BY deficit DESC
      LIMIT 5
    `);

    res.json({
      alertasVencimiento: alertasCriticas.rows,
      stockBajo: stockBajo.rows
    });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;