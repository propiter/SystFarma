import express from 'express';
import Joi from 'joi';
import { query, transaction } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Esquemas de validación
const loteSchema = Joi.object({
  lote_codigo: Joi.string().required(),
  producto_id: Joi.number().integer().required(),
  fecha_vencimiento: Joi.date().required(),
  cantidad_disponible: Joi.number().integer().min(0).required(),
  precio_compra: Joi.number().min(0).required(),
  observaciones: Joi.string().allow('').optional()
});

const ajusteInventarioSchema = Joi.object({
  motivo: Joi.string().required(),
  observaciones: Joi.string().allow('').optional(),
  ajustes: Joi.array().items(
    Joi.object({
      lote_id: Joi.number().integer().required(),
      cantidad_nueva: Joi.number().integer().min(0).required()
    })
  ).min(1).required()
});

// GET /api/inventory - Obtener inventario completo con alertas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      categoria = '', 
      estado_vencimiento = '',
      ordenar = 'fecha_vencimiento',
      direccion = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.estado = true AND l.cantidad_disponible > 0';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (p.nombre ILIKE $${paramCount} OR p.codigo_barras ILIKE $${paramCount} OR l.lote_codigo ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (categoria) {
      paramCount++;
      whereClause += ` AND p.categoria = $${paramCount}`;
      params.push(categoria);
    }

    if (estado_vencimiento) {
      paramCount++;
      if (estado_vencimiento === 'rojo') {
        whereClause += ` AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months'`;
      } else if (estado_vencimiento === 'amarillo') {
        whereClause += ` AND l.fecha_vencimiento > CURRENT_DATE + INTERVAL '6 months' AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months'`;
      } else if (estado_vencimiento === 'verde') {
        whereClause += ` AND l.fecha_vencimiento > CURRENT_DATE + INTERVAL '12 months'`;
      }
    }

    const orderBy = `ORDER BY l.${ordenar} ${direccion}`;
    
    const queryText = `
      SELECT 
        l.*,
        p.nombre as producto_nombre,
        p.presentacion,
        p.laboratorio,
        p.categoria,
        p.stock_minimo,
        pr.nombre as proveedor_nombre,
        t.descripcion as temperatura_descripcion,
        CASE 
          WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 'rojo'
          WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' THEN 'amarillo'
          ELSE 'verde'
        END as estado_vencimiento,
        EXTRACT(days FROM l.fecha_vencimiento - CURRENT_DATE) as dias_vencimiento,
        (l.cantidad_disponible * l.precio_compra) as valor_total
      FROM lotes l
      JOIN productos p ON l.producto_id = p.producto_id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
      LEFT JOIN temperaturas t ON p.temperatura_id = t.temperatura_id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [inventario, total] = await Promise.all([
      query(queryText, params),
      query(`
        SELECT COUNT(*) as total 
        FROM lotes l
        JOIN productos p ON l.producto_id = p.producto_id
        ${whereClause}
      `, params.slice(0, paramCount))
    ]);

    // Calcular estadísticas
    const estadisticas = await query(`
      SELECT 
        COUNT(DISTINCT l.lote_id) as total_lotes,
        SUM(l.cantidad_disponible * l.precio_compra) as valor_total_inventario,
        COUNT(CASE WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 1 END) as lotes_criticos,
        COUNT(CASE WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' AND l.fecha_vencimiento > CURRENT_DATE + INTERVAL '6 months' THEN 1 END) as lotes_advertencia,
        COUNT(CASE WHEN l.fecha_vencimiento > CURRENT_DATE + INTERVAL '12 months' THEN 1 END) as lotes_normales
      FROM lotes l
      JOIN productos p ON l.producto_id = p.producto_id
      WHERE p.estado = true AND l.cantidad_disponible > 0
    `);

    res.json({
      inventario: inventario.rows,
      estadisticas: estadisticas.rows[0],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo inventario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/inventory/alerts - Obtener alertas de vencimiento y stock bajo
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const [alertasVencimiento, stockBajo] = await Promise.all([
      // Alertas de vencimiento
      query(`
        SELECT 
          l.*,
          p.nombre as producto_nombre,
          p.presentacion,
          p.laboratorio,
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
        LIMIT 20
      `),
      
      // Stock bajo
      query(`
        SELECT 
          p.*,
          pr.nombre as proveedor_nombre,
          (p.stock_minimo - p.stock) as deficit
        FROM productos p
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
        WHERE p.stock <= p.stock_minimo
        AND p.estado = true
        ORDER BY deficit DESC
        LIMIT 10
      `)
    ]);

    res.json({
      alertasVencimiento: alertasVencimiento.rows,
      stockBajo: stockBajo.rows
    });

  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/inventory/lotes - Crear nuevo lote
router.post('/lotes', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { error } = loteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      lote_codigo,
      producto_id,
      fecha_vencimiento,
      cantidad_disponible,
      precio_compra,
      observaciones
    } = req.body;

    // Verificar que el producto existe
    const producto = await query(
      'SELECT producto_id, nombre FROM productos WHERE producto_id = $1 AND estado = true',
      [producto_id]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const result = await transaction(async (client) => {
      // Crear lote
      const nuevoLote = await client.query(`
        INSERT INTO lotes (
          lote_codigo, producto_id, fecha_vencimiento, 
          cantidad_disponible, precio_compra, observaciones, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *
      `, [lote_codigo, producto_id, fecha_vencimiento, cantidad_disponible, precio_compra, observaciones]);

      // Actualizar stock del producto
      await client.query(`
        UPDATE productos 
        SET stock = stock + $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE producto_id = $2
      `, [cantidad_disponible, producto_id]);

      // Actualizar inventario
      await client.query(`
        INSERT INTO inventario (producto_id, stock_total)
        VALUES ($1, $2)
        ON CONFLICT (producto_id) 
        DO UPDATE SET 
          stock_total = inventario.stock_total + $2,
          ultima_actualizacion = CURRENT_TIMESTAMP
      `, [producto_id, cantidad_disponible]);

      return nuevoLote.rows[0];
    });

    res.status(201).json({
      message: 'Lote creado exitosamente',
      lote: result
    });

  } catch (error) {
    console.error('Error creando lote:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/inventory/lotes/:id - Actualizar lote
router.put('/lotes/:id', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = loteSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      lote_codigo,
      fecha_vencimiento,
      cantidad_disponible,
      precio_compra,
      observaciones
    } = req.body;

    // Obtener cantidad anterior
    const loteAnterior = await query(
      'SELECT cantidad_disponible, producto_id FROM lotes WHERE lote_id = $1',
      [id]
    );

    if (loteAnterior.rows.length === 0) {
      return res.status(404).json({ message: 'Lote no encontrado' });
    }

    const cantidadAnterior = loteAnterior.rows[0].cantidad_disponible;
    const producto_id = loteAnterior.rows[0].producto_id;
    const diferencia = cantidad_disponible - cantidadAnterior;

    const result = await transaction(async (client) => {
      // Actualizar lote
      const loteActualizado = await client.query(`
        UPDATE lotes SET
          lote_codigo = $1,
          fecha_vencimiento = $2,
          cantidad_disponible = $3,
          precio_compra = $4,
          observaciones = $5,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE lote_id = $6
        RETURNING *
      `, [lote_codigo, fecha_vencimiento, cantidad_disponible, precio_compra, observaciones, id]);

      // Actualizar stock del producto
      await client.query(`
        UPDATE productos 
        SET stock = stock + $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE producto_id = $2
      `, [diferencia, producto_id]);

      // Actualizar inventario
      await client.query(`
        UPDATE inventario 
        SET stock_total = stock_total + $1, ultima_actualizacion = CURRENT_TIMESTAMP
        WHERE producto_id = $2
      `, [diferencia, producto_id]);

      return loteActualizado.rows[0];
    });

    res.json({
      message: 'Lote actualizado exitosamente',
      lote: result
    });

  } catch (error) {
    console.error('Error actualizando lote:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/inventory/ajustes - Realizar ajuste de inventario
router.post('/ajustes', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { error } = ajusteInventarioSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { motivo, observaciones, ajustes } = req.body;

    const result = await transaction(async (client) => {
      // Crear ajuste de inventario
      const nuevoAjuste = await client.query(`
        INSERT INTO ajustes_inventario (usuario_id, motivo, observaciones)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [req.user.usuario_id, motivo, observaciones]);

      const ajuste_id = nuevoAjuste.rows[0].ajuste_id;

      // Procesar cada ajuste
      for (const ajuste of ajustes) {
        // Obtener cantidad anterior
        const loteAnterior = await client.query(
          'SELECT cantidad_disponible, producto_id FROM lotes WHERE lote_id = $1',
          [ajuste.lote_id]
        );

        if (loteAnterior.rows.length === 0) {
          throw new Error(`Lote ${ajuste.lote_id} no encontrado`);
        }

        const cantidadAnterior = loteAnterior.rows[0].cantidad_disponible;
        const producto_id = loteAnterior.rows[0].producto_id;
        const diferencia = ajuste.cantidad_nueva - cantidadAnterior;

        // Registrar detalle del ajuste
        await client.query(`
          INSERT INTO detalle_ajuste_inventario (ajuste_id, lote_id, cantidad_antes, cantidad_despues)
          VALUES ($1, $2, $3, $4)
        `, [ajuste_id, ajuste.lote_id, cantidadAnterior, ajuste.cantidad_nueva]);

        // Actualizar lote
        await client.query(`
          UPDATE lotes 
          SET cantidad_disponible = $1, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE lote_id = $2
        `, [ajuste.cantidad_nueva, ajuste.lote_id]);

        // Actualizar stock del producto
        await client.query(`
          UPDATE productos 
          SET stock = stock + $1, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [diferencia, producto_id]);

        // Actualizar inventario
        await client.query(`
          UPDATE inventario 
          SET stock_total = stock_total + $1, ultima_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [diferencia, producto_id]);
      }

      return nuevoAjuste.rows[0];
    });

    res.status(201).json({
      message: 'Ajuste de inventario realizado exitosamente',
      ajuste: result
    });

  } catch (error) {
    console.error('Error realizando ajuste:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/inventory/movimientos - Obtener historial de movimientos
router.get('/movimientos', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      fecha_inicio = '', 
      fecha_fin = '',
      tipo = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (fecha_inicio) {
      paramCount++;
      whereClause += ` AND DATE(fecha) >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      whereClause += ` AND DATE(fecha) <= $${paramCount}`;
      params.push(fecha_fin);
    }

    // Unión de diferentes tipos de movimientos
    const movimientos = await query(`
      (
        SELECT 
          'venta' as tipo,
          v.fecha_venta as fecha,
          u.nombre as usuario,
          p.nombre as producto,
          l.lote_codigo,
          -dv.cantidad as cantidad,
          'Venta #' || v.venta_id as referencia
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.venta_id
        JOIN usuarios u ON v.usuario_id = u.usuario_id
        JOIN productos p ON dv.producto_id = p.producto_id
        JOIN lotes l ON dv.lote_id = l.lote_id
        WHERE v.estado = 'completada'
      )
      UNION ALL
      (
        SELECT 
          'ajuste' as tipo,
          ai.fecha,
          u.nombre as usuario,
          p.nombre as producto,
          l.lote_codigo,
          (dai.cantidad_despues - dai.cantidad_antes) as cantidad,
          'Ajuste #' || ai.ajuste_id as referencia
        FROM detalle_ajuste_inventario dai
        JOIN ajustes_inventario ai ON dai.ajuste_id = ai.ajuste_id
        JOIN usuarios u ON ai.usuario_id = u.usuario_id
        JOIN lotes l ON dai.lote_id = l.lote_id
        JOIN productos p ON l.producto_id = p.producto_id
      )
      UNION ALL
      (
        SELECT 
          'ingreso' as tipo,
          l.fecha_ingreso as fecha,
          'Sistema' as usuario,
          p.nombre as producto,
          l.lote_codigo,
          l.cantidad_disponible as cantidad,
          'Lote #' || l.lote_id as referencia
        FROM lotes l
        JOIN productos p ON l.producto_id = p.producto_id
        WHERE l.estado = true
      )
      ${whereClause}
      ORDER BY fecha DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, parseInt(limit), offset]);

    res.json({
      movimientos: movimientos.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(movimientos.rows.length / limit),
        totalItems: movimientos.rows.length,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;