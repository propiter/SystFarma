import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { query } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Esquemas de validación
const userSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  correo: Joi.string().email().required(),
  rol: Joi.string().valid('admin', 'cajero', 'bodega').required(),
  contraseña: Joi.string().min(6).optional()
});

const updateUserSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  correo: Joi.string().email().required(),
  rol: Joi.string().valid('admin', 'cajero', 'bodega').required(),
  estado: Joi.boolean().optional(),
  contraseña: Joi.string().min(6).optional()
});

const changePasswordSchema = Joi.object({
  contraseña_actual: Joi.string().required(),
  contraseña_nueva: Joi.string().min(6).required(),
  confirmar_contraseña: Joi.string().valid(Joi.ref('contraseña_nueva')).required()
});

// GET /api/users - Obtener todos los usuarios
router.get('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      rol = '',
      estado = 'true'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE u.estado = $1';
    let params = [estado === 'true'];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (u.nombre ILIKE $${paramCount} OR u.correo ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (rol) {
      paramCount++;
      whereClause += ` AND u.rol = $${paramCount}`;
      params.push(rol);
    }

    const queryText = `
      SELECT 
        u.usuario_id,
        u.nombre,
        u.correo,
        u.rol,
        u.estado,
        u.fecha_creacion,
        u.ultimo_acceso,
        COUNT(DISTINCT v.venta_id) as total_ventas,
        COALESCE(SUM(v.total), 0) as monto_total_ventas
      FROM usuarios u
      LEFT JOIN ventas v ON u.usuario_id = v.usuario_id AND v.estado = 'completada'
      ${whereClause}
      GROUP BY u.usuario_id, u.nombre, u.correo, u.rol, u.estado, u.fecha_creacion, u.ultimo_acceso
      ORDER BY u.fecha_creacion DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(parseInt(limit), offset);

    const [usuarios, total] = await Promise.all([
      query(queryText, params),
      query(`SELECT COUNT(*) as total FROM usuarios u ${whereClause}`, params.slice(0, paramCount))
    ]);

    // No incluir contraseñas en la respuesta
    const usuariosSinPassword = usuarios.rows.map(user => {
      const { contraseña, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      usuarios: usuariosSinPassword,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total.rows[0].total / limit),
        totalItems: parseInt(total.rows[0].total),
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [usuario, estadisticas] = await Promise.all([
      query(`
        SELECT usuario_id, nombre, correo, rol, estado, fecha_creacion, ultimo_acceso
        FROM usuarios 
        WHERE usuario_id = $1
      `, [id]),
      
      query(`
        SELECT 
          COUNT(DISTINCT v.venta_id) as total_ventas,
          COALESCE(SUM(v.total), 0) as monto_total_ventas,
          COUNT(DISTINCT DATE(v.fecha_venta)) as dias_activos,
          MAX(v.fecha_venta) as ultima_venta
        FROM ventas v
        WHERE v.usuario_id = $1 AND v.estado = 'completada'
      `, [id])
    ]);

    if (usuario.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      usuario: usuario.rows[0],
      estadisticas: estadisticas.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/users - Crear nuevo usuario
router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, correo, rol, contraseña } = req.body;

    // Verificar si el correo ya existe
    const existingUser = await query(
      'SELECT usuario_id FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    // Generar contraseña por defecto si no se proporciona
    const passwordToUse = contraseña || `${nombre.toLowerCase().replace(/\s+/g, '')}123`;
    const hashedPassword = await bcrypt.hash(passwordToUse, 12);

    const nuevoUsuario = await query(`
      INSERT INTO usuarios (nombre, correo, contraseña, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING usuario_id, nombre, correo, rol, estado, fecha_creacion
    `, [nombre, correo, hashedPassword, rol]);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: nuevoUsuario.rows[0],
      contraseña_temporal: !contraseña ? passwordToUse : undefined
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = updateUserSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, correo, rol, estado, contraseña } = req.body;

    // Verificar si el usuario existe
    const existingUser = await query(
      'SELECT usuario_id FROM usuarios WHERE usuario_id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar correo único
    const duplicateEmail = await query(
      'SELECT usuario_id FROM usuarios WHERE correo = $1 AND usuario_id != $2',
      [correo, id]
    );

    if (duplicateEmail.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    // Preparar query de actualización
    let updateQuery = `
      UPDATE usuarios SET
        nombre = $1,
        correo = $2,
        rol = $3
    `;
    let params = [nombre, correo, rol];
    let paramCount = 3;

    if (estado !== undefined) {
      paramCount++;
      updateQuery += `, estado = $${paramCount}`;
      params.push(estado);
    }

    if (contraseña) {
      paramCount++;
      const hashedPassword = await bcrypt.hash(contraseña, 12);
      updateQuery += `, contraseña = $${paramCount}`;
      params.push(hashedPassword);
    }

    paramCount++;
    updateQuery += ` WHERE usuario_id = $${paramCount} RETURNING usuario_id, nombre, correo, rol, estado, fecha_creacion`;
    params.push(id);

    const usuarioActualizado = await query(updateQuery, params);

    res.json({
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/users/:id - Eliminar usuario (soft delete)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar el propio usuario
    if (parseInt(id) === req.user.usuario_id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    // Verificar si el usuario tiene ventas asociadas
    const ventasAsociadas = await query(
      'SELECT COUNT(*) as total FROM ventas WHERE usuario_id = $1',
      [id]
    );

    if (parseInt(ventasAsociadas.rows[0].total) > 0) {
      // Solo desactivar si tiene ventas
      const result = await query(`
        UPDATE usuarios 
        SET estado = false
        WHERE usuario_id = $1
        RETURNING usuario_id
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({ message: 'Usuario desactivado exitosamente' });
    } else {
      // Eliminar completamente si no tiene ventas
      const result = await query(`
        DELETE FROM usuarios 
        WHERE usuario_id = $1
        RETURNING usuario_id
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({ message: 'Usuario eliminado exitosamente' });
    }

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/users/:id/toggle-status - Activar/Desactivar usuario
router.put('/:id/toggle-status', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir desactivar el propio usuario
    if (parseInt(id) === req.user.usuario_id) {
      return res.status(400).json({ message: 'No puedes desactivar tu propio usuario' });
    }

    const result = await query(`
      UPDATE usuarios 
      SET estado = NOT estado
      WHERE usuario_id = $1
      RETURNING usuario_id, nombre, estado
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];
    const accion = usuario.estado ? 'activado' : 'desactivado';

    res.json({
      message: `Usuario ${accion} exitosamente`,
      usuario: usuario
    });

  } catch (error) {
    console.error('Error cambiando estado del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/users/change-password - Cambiar contraseña propia
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { contraseña_actual, contraseña_nueva } = req.body;

    // Obtener contraseña actual del usuario
    const usuario = await query(
      'SELECT contraseña FROM usuarios WHERE usuario_id = $1',
      [req.user.usuario_id]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(contraseña_actual, usuario.rows[0].contraseña);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña
    const hashedNewPassword = await bcrypt.hash(contraseña_nueva, 12);
    await query(
      'UPDATE usuarios SET contraseña = $1 WHERE usuario_id = $2',
      [hashedNewPassword, req.user.usuario_id]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/users/estadisticas/generales - Estadísticas generales de usuarios
router.get('/estadisticas/generales', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const estadisticas = await query(`
      SELECT 
        COUNT(*) as total_usuarios,
        COUNT(CASE WHEN estado = true THEN 1 END) as usuarios_activos,
        COUNT(CASE WHEN rol = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN rol = 'cajero' THEN 1 END) as total_cajeros,
        COUNT(CASE WHEN rol = 'bodega' THEN 1 END) as total_bodega,
        COUNT(CASE WHEN ultimo_acceso >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as activos_semana,
        COUNT(CASE WHEN ultimo_acceso >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as activos_mes
      FROM usuarios
    `);

    const ventasPorUsuario = await query(`
      SELECT 
        u.nombre,
        u.rol,
        COUNT(v.venta_id) as total_ventas,
        COALESCE(SUM(v.total), 0) as monto_total
      FROM usuarios u
      LEFT JOIN ventas v ON u.usuario_id = v.usuario_id AND v.estado = 'completada'
      WHERE u.estado = true
      GROUP BY u.usuario_id, u.nombre, u.rol
      ORDER BY total_ventas DESC
      LIMIT 10
    `);

    res.json({
      estadisticasGenerales: estadisticas.rows[0],
      ventasPorUsuario: ventasPorUsuario.rows
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;