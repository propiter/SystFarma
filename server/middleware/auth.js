import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sigfarma_secret_key');
    
    // Verificar si el usuario aún existe y está activo
    const userResult = await query(
      'SELECT usuario_id, nombre, correo, rol, estado FROM usuarios WHERE usuario_id = $1 AND estado = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no válido o inactivo' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(403).json({ message: 'Token inválido' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        message: 'No tienes permisos para acceder a este recurso' 
      });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sigfarma_secret_key');
    
    const userResult = await query(
      'SELECT usuario_id, nombre, correo, rol, estado FROM usuarios WHERE usuario_id = $1 AND estado = true',
      [decoded.userId]
    );

    req.user = userResult.rows.length > 0 ? userResult.rows[0] : null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};