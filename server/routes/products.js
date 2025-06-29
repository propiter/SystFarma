import express from 'express';
import Joi from 'joi';
import { query, transaction } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Esquemas de validación
const productSchema = Joi.object({
  codigo_barras: Joi.string().allow('').optional(),
  nombre: Joi.string().min(2).max(100).required(),
  concentracion: Joi.string().allow('').optional(),
  forma_farmaceutica: Joi.string().allow('').optional(),
  presentacion: Joi.string().required(),
  laboratorio: Joi.string().allow('').optional(),
  registro_sanitario: Joi.string().allow('').optional(),
  temperatura_id: Joi.number().integer().allow(null).optional(),
  proveedor_id: Joi.number().integer().allow(null).optional(),
  categoria: Joi.string().allow('').optional(),
  stock_minimo: Joi.number().integer().min(0).required(),
  precio_venta: Joi.number().min(0).required()
});

// GET /api/products - Obtener todos los productos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      categoria = '', 
      estado = 'true',
      ordenar = 'nombre',
      direccion = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.estado = $1';
    let params = [estado === 'true'];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (p.nombre ILIKE $${paramCount} OR p.codigo_barras ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (categoria) {
      paramCount++;
      whereClause += ` AND p.categoria = $${paramCount}`;
      params.push(categoria);
    }

    const orderBy = `ORDER BY p.${ordenar} ${direccion}`;
    
    const queryText = `
      SELECT 
        p.*,
        pr.nombre as proveedor_nombre,
        t.descripcion as temperatura_descripcion,
        CASE 
          WHEN p.stock <= p.stock_minimo THEN 'bajo'
          WHEN p.stock <= p.stock_minimo * 1.5 THEN 'medio'
          ELSE 'alto'
        END as estado_stock
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
      LEFT JOIN temperaturas t ON p.temperatura_id = t.temperatura_id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [productos, total] = await Promise.all([
      query(queryText, params),
      query(`SELECT COUNT(*) as total FROM productos p ${whereClause}`, params.slice(0, paramCount))
    ]);

    res.json({
      productos: productos.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/products/:id - Obtener producto por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await query(`
      SELECT 
        p.*,
        pr.nombre as proveedor_nombre,
        t.descripcion as temperatura_descripcion,
        t.rango_temperatura
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
      LEFT JOIN temperaturas t ON p.temperatura_id = t.temperatura_id
      WHERE p.producto_id = $1
    `, [id]);

    if (producto.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Obtener lotes del producto
    const lotes = await query(`
      SELECT 
        l.*,
        CASE 
          WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '6 months' THEN 'rojo'
          WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '12 months' THEN 'amarillo'
          ELSE 'verde'
        END as estado_vencimiento,
        EXTRACT(days FROM l.fecha_vencimiento - CURRENT_DATE) as dias_vencimiento
      FROM lotes l
      WHERE l.producto_id = $1
      AND l.cantidad_disponible > 0
      ORDER BY l.fecha_vencimiento ASC
    `, [id]);

    res.json({
      producto: producto.rows[0],
      lotes: lotes.rows
    });

  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/products - Crear nuevo producto
router.post('/', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      codigo_barras,
      nombre,
      concentracion,
      forma_farmaceutica,
      presentacion,
      laboratorio,
      registro_sanitario,
      temperatura_id,
      proveedor_id,
      categoria,
      stock_minimo,
      precio_venta
    } = req.body;

    // Verificar si el código de barras ya existe
    if (codigo_barras) {
      const existingProduct = await query(
        'SELECT producto_id FROM productos WHERE codigo_barras = $1',
        [codigo_barras]
      );

      if (existingProduct.rows.length > 0) {
        return res.status(400).json({ message: 'El código de barras ya existe' });
      }
    }

    const result = await transaction(async (client) => {
      // Crear producto
      const newProduct = await client.query(`
        INSERT INTO productos (
          codigo_barras, nombre, concentracion, forma_farmaceutica,
          presentacion, laboratorio, registro_sanitario, temperatura_id,
          proveedor_id, categoria, stock_minimo, precio_venta
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        codigo_barras || null,
        nombre,
        concentracion || null,
        forma_farmaceutica || null,
        presentacion,
        laboratorio || null,
        registro_sanitario || null,
        temperatura_id || null,
        proveedor_id || null,
        categoria || null,
        stock_minimo,
        precio_venta
      ]);

      // Crear entrada en inventario
      await client.query(`
        INSERT INTO inventario (producto_id, stock_total)
        VALUES ($1, 0)
      `, [newProduct.rows[0].producto_id]);

      return newProduct.rows[0];
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: result
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', authenticateToken, authorize('admin', 'bodega'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = productSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      codigo_barras,
      nombre,
      concentracion,
      forma_farmaceutica,
      presentacion,
      laboratorio,
      registro_sanitario,
      temperatura_id,
      proveedor_id,
      categoria,
      stock_minimo,
      precio_venta
    } = req.body;

    // Verificar si el producto existe
    const existingProduct = await query(
      'SELECT producto_id FROM productos WHERE producto_id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Verificar código de barras único
    if (codigo_barras) {
      const duplicateBarcode = await query(
        'SELECT producto_id FROM productos WHERE codigo_barras = $1 AND producto_id != $2',
        [codigo_barras, id]
      );

      if (duplicateBarcode.rows.length > 0) {
        return res.status(400).json({ message: 'El código de barras ya existe' });
      }
    }

    const updatedProduct = await query(`
      UPDATE productos SET
        codigo_barras = $1,
        nombre = $2,
        concentracion = $3,
        forma_farmaceutica = $4,
        presentacion = $5,
        laboratorio = $6,
        registro_sanitario = $7,
        temperatura_id = $8,
        proveedor_id = $9,
        categoria = $10,
        stock_minimo = $11,
        precio_venta = $12,
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE producto_id = $13
      RETURNING *
    `, [
      codigo_barras || null,
      nombre,
      concentracion || null,
      forma_farmaceutica || null,
      presentacion,
      laboratorio || null,
      registro_sanitario || null,
      temperatura_id || null,
      proveedor_id || null,
      categoria || null,
      stock_minimo,
      precio_venta,
      id
    ]);

    res.json({
      message: 'Producto actualizado exitosamente',
      producto: updatedProduct.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/products/:id - Eliminar producto (soft delete)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE productos 
      SET estado = false, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE producto_id = $1
      RETURNING producto_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;