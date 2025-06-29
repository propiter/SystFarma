import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { query, testConnection } from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Función para verificar si la base de datos existe
const databaseExists = async () => {
  const tempPool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Conectarse a la base de datos por defecto
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    const client = await tempPool.connect();
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME || 'sigfarma']
    );
    client.release();
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verificando si la base de datos existe:', error);
    return false;
  } finally {
    await tempPool.end();
  }
};

// Función para crear la base de datos
const createDatabase = async () => {
  const tempPool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Conectarse a la base de datos por defecto
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  const dbName = process.env.DB_NAME || 'sigfarma';
  const client = await tempPool.connect();
  
  try {
    console.log(`🔍 Verificando si la base de datos '${dbName}' existe...`);
    
    // Verificar si la base de datos ya existe
    const dbExists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbExists.rows.length === 0) {
      console.log(`🔄 Creando base de datos '${dbName}'...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Base de datos '${dbName}' creada exitosamente`);
    } else {
      console.log(`ℹ️  La base de datos '${dbName}' ya existe`);
    }
  } catch (error) {
    console.error('❌ Error al crear la base de datos:', error);
    throw error;
  } finally {
    client.release();
    await tempPool.end();
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Primero, asegurarse de que la base de datos exista
    await createDatabase();
    
    // Verificar la conexión a la base de datos
    console.log('🔌 Verificando conexión a la base de datos...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('No se pudo conectar a la base de datos después de crearla');
    }
    
    // Obtener la ruta al directorio de migraciones
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    // Verificar si el directorio existe
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`No se encontró el directorio de migraciones en: ${migrationsDir}`);
    }
    
    // Leer todos los archivos SQL del directorio de migraciones
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar alfabéticamente para asegurar el orden de ejecución
    
    if (migrationFiles.length === 0) {
      console.warn('⚠️  No se encontraron archivos de migración en el directorio');
      return;
    }
    
    console.log(`📋 Ejecutando ${migrationFiles.length} migraciones...`);
    
    // Ejecutar cada archivo de migración en orden
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`🔄 Ejecutando migración: ${file}`);
      
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Dividir el contenido en statements individuales
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      // Ejecutar cada statement
      for (const statement of statements) {
        try {
          if (statement) { // Asegurarse de que el statement no esté vacío
            await query(statement);
          }
        } catch (error) {
          // Ignorar errores de objetos que ya existen
          if (!error.message.includes('already exists') && 
              !error.message.includes('ya existe') &&
              !error.message.includes('duplicate key')) {
            console.error(`⚠️  Error ejecutando migración ${file}:`, error.message);
            throw error; // Detener la ejecución en caso de error crítico
          }
        }
      }
      console.log(`✅ Migración completada: ${file}`);
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
//if (import.meta.url === `file://${process.argv[1]}`) {
//  initializeDatabase();
//}
initializeDatabase();
export { initializeDatabase };