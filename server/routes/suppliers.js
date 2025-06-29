import express from 'express';
import Joi from 'joi';
import { query, transaction } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Esquemas de validación
const proveedorSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  contacto: Joi.string().max(100).allow('').optional(),
  telefono: Joi.string().max(50).allow('').optional(),
  correo: Joi.string().email().allow('').optional(),
  direccion: Joi.string().max(150).allow('').optional()
});

const actaRecepcionSchema = Joi.object({
  fecha_recepcion: Joi.date().required(),
  ciudad: Joi.string().max(50).required(),
  responsable: Joi.string().max(50).required(),
  numero_factura: Joi.string().max(50).required(),
  proveedor_id: Joi.number().integer().required(),
  tipo_acta: Joi.string().max(50).required(),
  observaciones: Joi.string().allow('').optional(),
  productos: Joi.array().items(
    Joi.object({
      producto_id: Joi.number().integer().required(),
      lote_codigo: Joi.string().required(),
      fecha_vencimiento: Joi.date().required(),
      cantidad_recibida: Joi.number().integer().min(1).required(),
      precio_compra: Joi.number().min(0).required(),
      observaciones: Joi.string().allow('').optional()
    })
  ).min(1).required()
});

// GET /api/suppliers - Obtener todos los proveedores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      estado = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.estado = $1';
    let params = [estado === 'true'];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (p.nombre ILIKE $${paramCount} OR p.contacto ILIKE $${paramCount} OR p.correo ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const queryText = `
      SELECT 
        p.*,
        COUNT(DISTINCT pr.producto_id) as productos_activos,
        MAX(a.fecha_recepcion) as ultima_compra,
        COUNT(DISTINCT a.acta_id) as total_actas
      FROM proveedores p
      LEFT JOIN productos pr ON p.proveedor_id = pr.proveedor_id AND pr.estado = true
      LEFT JOIN actas a ON p.proveedor_id = a.proveedor_id AND a.estado = 'Aprobada'
      ${whereClause}
      GROUP BY p.proveedor_id
      ORDER BY p.nombre ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [proveedores, total] = await Promise.all([
      query(queryText, params),
      query(`SELECT COUNT(*) as total FROM proveedores p ${whereClause}`, params.slice(0, paramCount))
    ]);

    res.json({
      proveedores: proveedores.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/suppliers/:id - Obtener proveedor por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [proveedor, productos, actas] = await Promise.all([
      query('SELECT * FROM proveedores WHERE proveedor_id = $1', [id]),
      
      query(`
        SELECT p.*, COUNT(l.lote_id) as total_lotes
        FROM productos p
        LEFT JOIN lotes l ON p.producto_id = l.producto_id AND l.estado = true
        WHERE p.proveedor_id = $1 AND p.estado = true
        GROUP BY p.producto_id
        ORDER BY p.nombre
      `, [id]),
      
      query(`
        SELECT a.*, u.nombre as usuario_nombre
        FROM actas a
        JOIN usuarios u ON a.usuario_id = u.usuario_id
        WHERE a.proveedor_id = $1
        ORDER BY a.fecha_recepcion DESC
        LIMIT 10
      `, [id])
    ]);

    if (proveedor.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    res.json({
      proveedor: proveedor.rows[0],
      productos: productos.rows,
      actas: actas.rows
    });

  } catch (error) {
    console.error('Error obteniendo proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/suppliers - Crear nuevo proveedor
router.post('/', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { error } = proveedorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, contacto, telefono, correo, direccion } = req.body;

    // Verificar si el nombre ya existe
    const existingProvider = await query(
      'SELECT proveedor_id FROM proveedores WHERE nombre = $1',
      [nombre]
    );

    if (existingProvider.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un proveedor con ese nombre' });
    }

    const nuevoProveedor = await query(`
      INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nombre, contacto || null, telefono || null, correo || null, direccion || null]);

    res.status(201).json({
      message: 'Proveedor creado exitosamente',
      proveedor: nuevoProveedor.rows[0]
    });

  } catch (error) {
    console.error('Error creando proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/suppliers/:id - Actualizar proveedor
router.put('/:id', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = proveedorSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, contacto, telefono, correo, direccion } = req.body;

    // Verificar si el proveedor existe
    const existingProvider = await query(
      'SELECT proveedor_id FROM proveedores WHERE proveedor_id = $1',
      [id]
    );

    if (existingProvider.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    // Verificar nombre único
    const duplicateName = await query(
      'SELECT proveedor_id FROM proveedores WHERE nombre = $1 AND proveedor_id != $2',
      [nombre, id]
    );

    if (duplicateName.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un proveedor con ese nombre' });
    }

    const proveedorActualizado = await query(`
      UPDATE proveedores SET
        nombre = $1,
        contacto = $2,
        telefono = $3,
        correo = $4,
        direccion = $5
      WHERE proveedor_id = $6
      RETURNING *
    `, [nombre, contacto || null, telefono || null, correo || null, direccion || null, id]);

    res.json({
      message: 'Proveedor actualizado exitosamente',
      proveedor: proveedorActualizado.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/suppliers/:id - Eliminar proveedor (soft delete)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene productos asociados
    const productosAsociados = await query(
      'SELECT COUNT(*) as total FROM productos WHERE proveedor_id = $1 AND estado = true',
      [id]
    );

    if (parseInt(productosAsociados.rows[0].total) > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el proveedor porque tiene productos asociados' 
      });
    }

    const result = await query(`
      UPDATE proveedores 
      SET estado = false
      WHERE proveedor_id = $1
      RETURNING proveedor_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    res.json({ message: 'Proveedor eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando proveedor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/suppliers/actas - Crear acta de recepción
router.post('/actas', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { error } = actaRecepcionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      fecha_recepcion,
      ciudad,
      responsable,
      numero_factura,
      proveedor_id,
      tipo_acta,
      observaciones,
      productos
    } = req.body;

    // Verificar que el proveedor existe
    const proveedor = await query(
      'SELECT proveedor_id FROM proveedores WHERE proveedor_id = $1 AND estado = true',
      [proveedor_id]
    );

    if (proveedor.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    // Verificar que todos los productos existen
    for (const producto of productos) {
      const productoExiste = await query(
        'SELECT producto_id FROM productos WHERE producto_id = $1 AND estado = true',
        [producto.producto_id]
      );

      if (productoExiste.rows.length === 0) {
        return res.status(400).json({ 
          message: `Producto ${producto.producto_id} no encontrado` 
        });
      }
    }

    const result = await transaction(async (client) => {
      // Crear acta de recepción
      const nuevaActa = await client.query(`
        INSERT INTO actas (
          usuario_id, fecha_recepcion, ciudad, responsable,
          numero_factura, proveedor_id, tipo_acta, observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        req.user.usuario_id, fecha_recepcion, ciudad, responsable,
        numero_factura, proveedor_id, tipo_acta, observaciones
      ]);

      const acta_id = nuevaActa.rows[0].acta_id;

      // Crear lotes y detalles del acta
      for (const producto of productos) {
        // Crear lote
        const nuevoLote = await client.query(`
          INSERT INTO lotes (
            lote_codigo, producto_id, fecha_vencimiento,
            cantidad_disponible, precio_compra, observaciones, estado
          ) VALUES ($1, $2, $3, $4, $5, $6, false)
          RETURNING *
        `, [
          producto.lote_codigo, producto.producto_id, producto.fecha_vencimiento,
          producto.cantidad_recibida, producto.precio_compra, producto.observaciones
        ]);

        const lote_id = nuevoLote.rows[0].lote_id;

        // Crear detalle del acta
        await client.query(`
          INSERT INTO actas_productos (
            acta_id, producto_id, lote_id, cantidad_recibida, precio_compra
          ) VALUES ($1, $2, $3, $4, $5)
        `, [acta_id, producto.producto_id, lote_id, producto.cantidad_recibida, producto.precio_compra]);
      }

      return nuevaActa.rows[0];
    });

    res.status(201).json({
      message: 'Acta de recepción creada exitosamente',
      acta: result
    });

  } catch (error) {
    console.error('Error creando acta de recepción:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/suppliers/actas/:id/aprobar - Aprobar acta y cargar al inventario
router.put('/actas/:id/aprobar', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el acta existe y está en borrador
    const acta = await query(
      'SELECT * FROM actas WHERE acta_id = $1 AND estado = $2',
      [id, 'Borrador']
    );

    if (acta.rows.length === 0) {
      return res.status(404).json({ message: 'Acta no encontrada o ya aprobada' });
    }

    const result = await transaction(async (client) => {
      // Obtener productos del acta
      const productosActa = await client.query(`
        SELECT ap.*, l.lote_id
        FROM actas_productos ap
        JOIN lotes l ON ap.lote_id = l.lote_id
        WHERE ap.acta_id = $1
      `, [id]);

      // Activar lotes y actualizar inventario
      for (const producto of productosActa.rows) {
        // Activar lote
        await client.query(`
          UPDATE lotes 
          SET estado = true, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE lote_id = $1
        `, [producto.lote_id]);

        // Actualizar stock del producto
        await client.query(`
          UPDATE productos 
          SET stock = stock + $1, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE producto_id = $2
        `, [producto.cantidad_recibida, producto.producto_id]);

        // Actualizar inventario
        await client.query(`
          INSERT INTO inventario (producto_id, stock_total)
          VALUES ($1, $2)
          ON CONFLICT (producto_id) 
          DO UPDATE SET 
            stock_total = inventario.stock_total + $2,
            ultima_actualizacion = CURRENT_TIMESTAMP
        `, [producto.producto_id, producto.cantidad_recibida]);
      }

      // Aprobar acta
      const actaAprobada = await client.query(`
        UPDATE actas 
        SET estado = 'Aprobada', cargada_inventario = true
        WHERE acta_id = $1
        RETURNING *
      `, [id]);

      return actaAprobada.rows[0];
    });

    res.json({
      message: 'Acta aprobada y cargada al inventario exitosamente',
      acta: result
    });

  } catch (error) {
    console.error('Error aprobando acta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/suppliers/actas - Obtener actas de recepción
router.get('/actas', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      estado = '', 
      proveedor_id = '',
      fecha_inicio = '',
      fecha_fin = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (estado) {
      paramCount++;
      whereClause += ` AND a.estado = $${paramCount}`;
      params.push(estado);
    }

    if (proveedor_id) {
      paramCount++;
      whereClause += ` AND a.proveedor_id = $${paramCount}`;
      params.push(proveedor_id);
    }

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

    const queryText = `
      SELECT 
        a.*,
        p.nombre as proveedor_nombre,
        u.nombre as usuario_nombre,
        COUNT(ap.acta_producto_id) as total_productos
      FROM actas a
      JOIN proveedores p ON a.proveedor_id = p.proveedor_id
      JOIN usuarios u ON a.usuario_id = u.usuario_id
      LEFT JOIN actas_productos ap ON a.acta_id = ap.acta_id
      ${whereClause}
      GROUP BY a.acta_id, p.nombre, u.nombre
      ORDER BY a.fecha_recepcion DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [actas, total] = await Promise.all([
      query(queryText, params),
      query(`
        SELECT COUNT(*) as total 
        FROM actas a
        ${whereClause}
      `, params.slice(0, paramCount))
    ]);

    res.json({
      actas: actas.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo actas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;