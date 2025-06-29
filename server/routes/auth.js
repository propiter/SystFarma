import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Esquemas de validación
const loginSchema = Joi.object({
  correo: Joi.string().email().required(),
  contraseña: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  correo: Joi.string().email().required(),
  contraseña: Joi.string().min(6).required(),
  rol: Joi.string().valid('admin', 'cajero', 'bodega').required()
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { correo, contraseña } = req.body;

    // Buscar usuario por correo
    const userResult = await query(
      'SELECT * FROM usuarios WHERE correo = $1 AND estado = true',
      [correo]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = userResult.rows[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.usuario_id,
        rol: user.rol,
        nombre: user.nombre
      },
      process.env.JWT_SECRET || 'sigfarma_secret_key',
      { expiresIn: '24h' }
    );

    // Respuesta exitosa
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.usuario_id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/auth/register
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Solo admin puede registrar usuarios
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden registrar usuarios' });
    }

    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, correo, contraseña, rol } = req.body;

    // Verificar si el correo ya existe
    const existingUser = await query(
      'SELECT usuario_id FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 12);

    // Crear usuario
    const newUserResult = await query(
      'INSERT INTO usuarios (nombre, correo, contraseña, rol) VALUES ($1, $2, $3, $4) RETURNING usuario_id, nombre, correo, rol',
      [nombre, correo, hashedPassword, rol]
    );

    const newUser = newUserResult.rows[0];

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.usuario_id,
        nombre: newUser.nombre,
        correo: newUser.correo,
        rol: newUser.rol
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.usuario_id,
        nombre: req.user.nombre,
        correo: req.user.correo,
        rol: req.user.rol
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // En un sistema JWT stateless, el logout se maneja en el cliente
  res.json({ message: 'Logout exitoso' });
});

export default router;