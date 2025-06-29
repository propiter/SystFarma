import express from 'express';
import Joi from 'joi';
import { query, transaction } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Esquemas de validación
const ventaSchema = Joi.object({
  cliente_id: Joi.number().integer().allow(null).optional(),
  items: Joi.array().items(
    Joi.object({
      producto_id: Joi.number().integer().required(),
      lote_id: Joi.number().integer().required(),
      cantidad: Joi.number().min(0.001).required(),
      precio_unitario: Joi.number().min(0).required(),
      descuento: Joi.number().min(0).max(100).default(0),
      impuesto: Joi.number().min(0).max(100).default(19)
    })
  ).min(1).required(),
  metodo_pago: Joi.string().valid('efectivo', 'tarjeta', 'transferencia', 'mixto').required(),
  monto_efectivo: Joi.number().min(0).default(0),
  monto_tarjeta: Joi.number().min(0).default(0),
  monto_transferencia: Joi.number().min(0).default(0),
  cambio: Joi.number().min(0).default(0)
});

const devolucionSchema = Joi.object({
  venta_id: Joi.number().integer().required(),
  tipo: Joi.string().valid('parcial', 'total').required(),
  motivo: Joi.string().required(),
  observaciones: Joi.string().allow('').optional(),
  items: Joi.array().items(
    Joi.object({
      detalle_venta_id: Joi.number().integer().required(),
      cantidad_devuelta: Joi.number().min(0.001).required(),
      motivo: Joi.string().allow('').optional()
    })
  ).min(1).required(),
  metodo_reembolso: Joi.string().valid('efectivo', 'tarjeta', 'transferencia', 'credito').required()
});

// GET /api/sales - Obtener ventas con filtros
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      fecha_inicio = '',
      fecha_fin = '',
      estado = 'completada',
      metodo_pago = '',
      usuario_id = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE v.estado = $1';
    let params = [estado];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (c.nombre ILIKE $${paramCount} OR u.nombre ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

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

    if (metodo_pago) {
      paramCount++;
      whereClause += ` AND v.metodo_pago = $${paramCount}`;
      params.push(metodo_pago);
    }

    if (usuario_id) {
      paramCount++;
      whereClause += ` AND v.usuario_id = $${paramCount}`;
      params.push(usuario_id);
    }

    const queryText = `
      SELECT 
        v.*,
        u.nombre as cajero_nombre,
        c.nombre as cliente_nombre,
        c.documento as cliente_documento,
        COUNT(dv.detalle_venta_id) as total_items
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.usuario_id
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      LEFT JOIN detalle_venta dv ON v.venta_id = dv.venta_id
      ${whereClause}
      GROUP BY v.venta_id, u.nombre, c.nombre, c.documento
      ORDER BY v.fecha_venta DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [ventas, total] = await Promise.all([
      query(queryText, params),
      query(`
        SELECT COUNT(*) as total 
        FROM ventas v
        JOIN usuarios u ON v.usuario_id = u.usuario_id
        LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
        ${whereClause}
      `, params.slice(0, paramCount))
    ]);

    res.json({
      ventas: ventas.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/sales/:id - Obtener detalle de venta
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [venta, detalles] = await Promise.all([
      query(`
        SELECT 
          v.*,
          u.nombre as cajero_nombre,
          c.nombre as cliente_nombre,
          c.documento as cliente_documento,
          c.telefono as cliente_telefono,
          c.correo as cliente_correo
        FROM ventas v
        JOIN usuarios u ON v.usuario_id = u.usuario_id
        LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
        WHERE v.venta_id = $1
      `, [id]),
      
      query(`
        SELECT 
          dv.*,
          p.nombre as producto_nombre,
          p.presentacion,
          p.laboratorio,
          l.lote_codigo,
          l.fecha_vencimiento
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN lotes l ON dv.lote_id = l.lote_id
        WHERE dv.venta_id = $1
        ORDER BY dv.detalle_venta_id
      `, [id])
    ]);

    if (venta.rows.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    res.json({
      venta: venta.rows[0],
      detalles: detalles.rows
    });

  } catch (error) {
    console.error('Error obteniendo detalle de venta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/sales - Crear nueva venta
router.post('/', authenticateToken, authorize('admin', 'cajero'), async (req, res) => {
  try {
    const { error } = ventaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      cliente_id,
      items,
      metodo_pago,
      monto_efectivo,
      monto_tarjeta,
      monto_transferencia,
      cambio
    } = req.body;

    // Validar stock disponible para todos los items
    for (const item of items) {
      const stockDisponible = await query(
        'SELECT cantidad_disponible FROM lotes WHERE lote_id = $1 AND estado = true',
        [item.lote_id]
      );

      if (stockDisponible.rows.length === 0) {
        return res.status(400).json({ 
          message: `Lote ${item.lote_id} no encontrado o inactivo` 
        });
      }

      if (stockDisponible.rows[0].cantidad_disponible < item.cantidad) {
        return res.status(400).json({ 
          message: `Stock insuficiente para el lote ${item.lote_id}. Disponible: ${stockDisponible.rows[0].cantidad_disponible}` 
        });
      }
    }

    const result = await transaction(async (client) => {
      // Calcular totales
      let subtotal = 0;
      let descuento_total = 0;
      let impuesto_total = 0;

      const itemsCalculados = items.map(item => {
        const subtotal_item = item.cantidad * item.precio_unitario;
        const descuento_item = subtotal_item * (item.descuento / 100);
        const base_impuesto = subtotal_item - descuento_item;
        const impuesto_item = base_impuesto * (item.impuesto / 100);
        const total_item = base_impuesto + impuesto_item;

        subtotal += subtotal_item;
        descuento_total += descuento_item;
        impuesto_total += impuesto_item;

        return {
          ...item,
          subtotal: subtotal_item,
          total_linea: total_item
        };
      });

      const total = subtotal - descuento_total + impuesto_total;

      // Crear venta
      const nuevaVenta = await client.query(`
        INSERT INTO ventas (
          usuario_id, cliente_id, subtotal, descuento_total, 
          impuesto_total, total, metodo_pago, monto_efectivo,
          monto_tarjeta, monto_transferencia, cambio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        req.user.usuario_id, cliente_id, subtotal, descuento_total,
        impuesto_total, total, metodo_pago, monto_efectivo,
        monto_tarjeta, monto_transferencia, cambio
      ]);

      const venta_id = nuevaVenta.rows[0].venta_id;

      // Crear detalles de venta y actualizar stock
      for (const item of itemsCalculados) {
        // Insertar detalle de venta
        await client.query(`
          INSERT INTO detalle_venta (
            venta_id, producto_id, lote_id, cantidad, precio_unitario,
            subtotal, descuento, impuesto, total_linea
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          venta_id, item.producto_id, item.lote_id, item.cantidad,
          item.precio_unitario, item.subtotal, item.descuento,
          item.impuesto, item.total_linea
        ]);

        // Actualizar stock del lote
        await client.query(`
          UPDATE lotes 
          SET cantidad_disponible = cantidad_disponible - $1,
              fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE lote_id = $2
        `, [item.cantidad, item.lote_id]);

        // Actualizar stock del producto
        await client.query(`
          UPDATE productos 
          SET stock = stock - $1, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [item.cantidad, item.producto_id]);

        // Actualizar inventario
        await client.query(`
          UPDATE inventario 
          SET stock_total = stock_total - $1, ultima_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [item.cantidad, item.producto_id]);
      }

      return nuevaVenta.rows[0];
    });

    res.status(201).json({
      message: 'Venta creada exitosamente',
      venta: result
    });

  } catch (error) {
    console.error('Error creando venta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/sales/devoluciones - Obtener devoluciones
router.get('/devoluciones', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      fecha_inicio = '',
      fecha_fin = '',
      estado = '',
      tipo = '',
      usuario_id = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (u.nombre ILIKE $${paramCount} OR d.motivo ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (fecha_inicio) {
      paramCount++;
      whereClause += ` AND DATE(d.fecha) >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      whereClause += ` AND DATE(d.fecha) <= $${paramCount}`;
      params.push(fecha_fin);
    }

    if (estado) {
      paramCount++;
      whereClause += ` AND d.estado = $${paramCount}`;
      params.push(estado);
    }

    if (tipo) {
      paramCount++;
      whereClause += ` AND d.tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (usuario_id) {
      paramCount++;
      whereClause += ` AND d.usuario_id = $${paramCount}`;
      params.push(usuario_id);
    }

    const queryText = `
      SELECT 
        d.*,
        u.nombre as usuario_nombre,
        'VT-' || LPAD(d.venta_id::text, 6, '0') as venta_numero
      FROM devoluciones d
      JOIN usuarios u ON d.usuario_id = u.usuario_id
      ${whereClause}
      ORDER BY d.fecha DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [devoluciones, total] = await Promise.all([
      query(queryText, params),
      query(`
        SELECT COUNT(*) as total 
        FROM devoluciones d
        JOIN usuarios u ON d.usuario_id = u.usuario_id
        ${whereClause}
      `, params.slice(0, paramCount))
    ]);

    res.json({
      devoluciones: devoluciones.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo devoluciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/sales/devoluciones - Crear devolución
router.post('/devoluciones', authenticateToken, authorize('admin', 'cajero'), async (req, res) => {
  try {
    const { error } = devolucionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      venta_id,
      tipo,
      motivo,
      observaciones,
      items,
      metodo_reembolso
    } = req.body;

    // Verificar que la venta existe
    const venta = await query(
      'SELECT * FROM ventas WHERE venta_id = $1 AND estado = $2',
      [venta_id, 'completada']
    );

    if (venta.rows.length === 0) {
      return res.status(404).json({ message: 'Venta no encontrada o no completada' });
    }

    const result = await transaction(async (client) => {
      let monto_total = 0;

      // Validar items y calcular monto total
      for (const item of items) {
        const detalleVenta = await client.query(
          'SELECT * FROM detalle_venta WHERE detalle_venta_id = $1 AND venta_id = $2',
          [item.detalle_venta_id, venta_id]
        );

        if (detalleVenta.rows.length === 0) {
          throw new Error(`Detalle de venta ${item.detalle_venta_id} no encontrado`);
        }

        const detalle = detalleVenta.rows[0];
        const cantidadDisponible = detalle.cantidad - detalle.cantidad_devuelta;

        if (item.cantidad_devuelta > cantidadDisponible) {
          throw new Error(`Cantidad a devolver excede la disponible para el item ${item.detalle_venta_id}`);
        }

        monto_total += item.cantidad_devuelta * detalle.precio_unitario;
      }

      // Crear devolución
      const nuevaDevolucion = await client.query(`
        INSERT INTO devoluciones (
          venta_id, usuario_id, tipo, motivo, observaciones,
          monto_total, metodo_reembolso
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [venta_id, req.user.usuario_id, tipo, motivo, observaciones, monto_total, metodo_reembolso]);

      const devolucion_id = nuevaDevolucion.rows[0].devolucion_id;

      // Procesar cada item de devolución
      for (const item of items) {
        const detalleVenta = await client.query(
          'SELECT * FROM detalle_venta WHERE detalle_venta_id = $1',
          [item.detalle_venta_id]
        );

        const detalle = detalleVenta.rows[0];

        // Crear detalle de devolución
        await client.query(`
          INSERT INTO detalle_devolucion (
            devolucion_id, detalle_venta_id, cantidad_devuelta,
            precio_unitario, motivo, lote_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          devolucion_id, item.detalle_venta_id, item.cantidad_devuelta,
          detalle.precio_unitario, item.motivo, detalle.lote_id
        ]);

        // Actualizar detalle de venta
        await client.query(`
          UPDATE detalle_venta 
          SET cantidad_devuelta = cantidad_devuelta + $1,
              devuelto = CASE WHEN cantidad_devuelta + $1 >= cantidad THEN true ELSE false END
          WHERE detalle_venta_id = $2
        `, [item.cantidad_devuelta, item.detalle_venta_id]);

        // Restaurar stock del lote
        await client.query(`
          UPDATE lotes 
          SET cantidad_disponible = cantidad_disponible + $1,
              fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE lote_id = $2
        `, [item.cantidad_devuelta, detalle.lote_id]);

        // Restaurar stock del producto
        await client.query(`
          UPDATE productos 
          SET stock = stock + $1, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [item.cantidad_devuelta, detalle.producto_id]);

        // Actualizar inventario
        await client.query(`
          UPDATE inventario 
          SET stock_total = stock_total + $1, ultima_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [item.cantidad_devuelta, detalle.producto_id]);
      }

      return nuevaDevolucion.rows[0];
    });

    res.status(201).json({
      message: 'Devolución creada exitosamente',
      devolucion: result
    });

  } catch (error) {
    console.error('Error creando devolución:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/sales/devoluciones/:id/status - Actualizar estado de devolución
router.put('/devoluciones/:id/status', authenticateToken, authorize('admin', 'cajero'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['completada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const result = await query(`
      UPDATE devoluciones 
      SET estado = $1
      WHERE devolucion_id = $2 AND estado = 'pendiente'
      RETURNING *
    `, [estado, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Devolución no encontrada o ya procesada' });
    }

    res.json({
      message: `Devolución ${estado} exitosamente`
    });

  } catch (error) {
    console.error('Error actualizando estado de devolución:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/sales/estadisticas - Obtener estadísticas de ventas
router.get('/estadisticas', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio = '', fecha_fin = '' } = req.query;
    
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

    const [estadisticasGenerales, ventasPorDia, productosMasVendidos, ventasPorMetodoPago] = await Promise.all([
      // Estadísticas generales
      query(`
        SELECT 
          COUNT(*) as total_ventas,
          SUM(total) as monto_total,
          AVG(total) as promedio_venta,
          SUM(total_items.items) as total_items_vendidos
        FROM ventas v
        LEFT JOIN (
          SELECT venta_id, SUM(cantidad) as items
          FROM detalle_venta
          GROUP BY venta_id
        ) total_items ON v.venta_id = total_items.venta_id
        ${whereClause}
      `, params),

      // Ventas por día
      query(`
        SELECT 
          DATE(fecha_venta) as fecha,
          COUNT(*) as total_ventas,
          SUM(total) as monto_total
        FROM ventas v
        ${whereClause}
        GROUP BY DATE(fecha_venta)
        ORDER BY fecha DESC
        LIMIT 30
      `, params),

      // Productos más vendidos
      query(`
        SELECT 
          p.nombre,
          p.presentacion,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.total_linea) as monto_total
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN ventas v ON dv.venta_id = v.venta_id
        ${whereClause}
        GROUP BY p.producto_id, p.nombre, p.presentacion
        ORDER BY cantidad_vendida DESC
        LIMIT 10
      `, params),

      // Ventas por método de pago
      query(`
        SELECT 
          metodo_pago,
          COUNT(*) as total_ventas,
          SUM(total) as monto_total
        FROM ventas v
        ${whereClause}
        GROUP BY metodo_pago
        ORDER BY monto_total DESC
      `, params)
    ]);

    res.json({
      estadisticasGenerales: estadisticasGenerales.rows[0],
      ventasPorDia: ventasPorDia.rows,
      productosMasVendidos: productosMasVendidos.rows,
      ventasPorMetodoPago: ventasPorMetodoPago.rows
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;