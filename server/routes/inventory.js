import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');

    // Leer y ejecutar el script SQL de la base de datos
    const sqlPath = path.join(__dirname, '../sql/schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir el contenido en statements individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignorar errores de tablas que ya existen
        if (!error.message.includes('already exists')) {
          console.error('Error ejecutando statement:', error.message);
        }
      }
    }

    console.log('✅ Esquema de base de datos creado');

    // Crear usuarios por defecto
    await createDefaultUsers();
    
    // Crear datos de ejemplo
    await createSampleData();

    console.log('🎉 Base de datos inicializada correctamente');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
};

const createDefaultUsers = async () => {
  try {
    const defaultUsers = [
      {
        nombre: 'Administrador',
        correo: 'admin@sigfarma.com',
        contraseña: 'admin123',
        rol: 'admin'
      },
      {
        nombre: 'Cajero Principal',
        correo: 'cajero@sigfarma.com',
        contraseña: 'cajero123',
        rol: 'cajero'
      },
      {
        nombre: 'Encargado Bodega',
        correo: 'bodega@sigfarma.com',
        contraseña: 'bodega123',
        rol: 'bodega'
      }
    ];

    for (const user of defaultUsers) {
      // Verificar si el usuario ya existe
      const existingUser = await query(
        'SELECT usuario_id FROM usuarios WHERE correo = $1',
        [user.correo]
      );

      if (existingUser.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.contraseña, 12);
        
        await query(
          'INSERT INTO usuarios (nombre, correo, contraseña, rol) VALUES ($1, $2, $3, $4)',
          [user.nombre, user.correo, hashedPassword, user.rol]
        );
        
        console.log(`✅ Usuario creado: ${user.correo}`);
      }
    }
  } catch (error) {
    console.error('Error creando usuarios por defecto:', error);
  }
};

const createSampleData = async () => {
  try {
    // Crear temperaturas
    const temperaturas = [
      { descripcion: 'Ambiente', rango_temperatura: '15-25°C' },
      { descripcion: 'Refrigeración', rango_temperatura: '2-8°C' },
      { descripcion: 'Congelación', rango_temperatura: '-18°C' }
    ];

    for (const temp of temperaturas) {
      const existing = await query(
        'SELECT temperatura_id FROM temperaturas WHERE descripcion = $1',
        [temp.descripcion]
      );

      if (existing.rows.length === 0) {
        await query(
          'INSERT INTO temperaturas (descripcion, rango_temperatura) VALUES ($1, $2)',
          [temp.descripcion, temp.rango_temperatura]
        );
      }
    }

    // Crear proveedores
    const proveedores = [
      {
        nombre: 'Laboratorios Genfar S.A.',
        contacto: 'Carlos Mendoza',
        telefono: '+57 1 234-5678',
        correo: 'ventas@genfar.com',
        direccion: 'Calle 100 #15-20, Bogotá'
      },
      {
        nombre: 'Tecnoquímicas S.A.',
        contacto: 'Ana Rodríguez',
        telefono: '+57 4 567-8901',
        correo: 'comercial@tecnoquimicas.com',
        direccion: 'Carrera 50 #25-30, Medellín'
      }
    ];

    for (const proveedor of proveedores) {
      const existing = await query(
        'SELECT proveedor_id FROM proveedores WHERE nombre = $1',
        [proveedor.nombre]
      );

      if (existing.rows.length === 0) {
        await query(
          'INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion) VALUES ($1, $2, $3, $4, $5)',
          [proveedor.nombre, proveedor.contacto, proveedor.telefono, proveedor.correo, proveedor.direccion]
        );
      }
    }

    console.log('✅ Datos de ejemplo creados');

  } catch (error) {
    console.error('Error creando datos de ejemplo:', error);
  }
};

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };