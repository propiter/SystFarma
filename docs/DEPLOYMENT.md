# 🚀 Guía de Despliegue - SIGFARMA

## Despliegue en Producción

### Opción 1: Servidor Ubuntu/Debian

#### 1. Preparación del Servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar PM2 para gestión de procesos
sudo npm install -g pm2

# Instalar PostgreSQL (si no usas Supabase)
sudo apt install postgresql postgresql-contrib

# Instalar Nginx para proxy reverso
sudo apt install nginx
```

#### 2. Configuración de Base de Datos Local
```bash
# Crear usuario y base de datos
sudo -u postgres createuser --interactive sigfarma_user
sudo -u postgres createdb sigfarma
sudo -u postgres psql -c "ALTER USER sigfarma_user PASSWORD 'password_seguro';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sigfarma TO sigfarma_user;"
```

#### 3. Configuración de la Aplicación
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/sigfarma-system.git
cd sigfarma-system

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
nano .env

# Inicializar base de datos
npm run db:init

# Construir aplicación
npm run build
```

#### 4. Configuración de PM2
```bash
# Crear archivo de configuración PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sigfarma',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Crear directorio de logs
mkdir logs

# Iniciar aplicación
pm2 start ecosystem.config.js

# Configurar inicio automático
pm2 startup
pm2 save
```

#### 5. Configuración de Nginx
```bash
# Crear configuración de sitio
sudo nano /etc/nginx/sites-available/sigfarma

# Contenido del archivo:
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Configuración para archivos estáticos
    location /static/ {
        alias /path/to/sigfarma-system/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/sigfarma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL con Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run

# Configurar renovación automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Opción 2: Docker

#### 1. Dockerfile
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

# Instalar dumb-init para manejo de señales
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sigfarma -u 1001

# Copiar archivos necesarios
COPY --from=builder --chown=sigfarma:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sigfarma:nodejs /app/dist ./dist
COPY --from=builder --chown=sigfarma:nodejs /app/server ./server
COPY --from=builder --chown=sigfarma:nodejs /app/package*.json ./

USER sigfarma

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
```

#### 2. docker-compose.yml
```yaml
version: '3.8'

services:
  sigfarma:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - sigfarma
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Comandos Docker
```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f sigfarma

# Actualizar aplicación
docker-compose pull
docker-compose up -d --build

# Backup de base de datos
docker-compose exec postgres pg_dump -U sigfarma_user sigfarma > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U sigfarma_user sigfarma < backup.sql
```

### Opción 3: Supabase + Vercel/Netlify

#### 1. Configuración Supabase
```bash
# Crear proyecto en Supabase
# Ejecutar migraciones desde el dashboard de Supabase
# O usar Supabase CLI (si está disponible)

# Configurar variables de entorno
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

#### 2. Despliegue en Vercel
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod
```

## Monitoreo y Mantenimiento

### 1. Configuración de Logs
```bash
# Configurar logrotate
sudo nano /etc/logrotate.d/sigfarma

# Contenido:
/path/to/sigfarma-system/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 sigfarma sigfarma
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Backup Automático
```bash
# Script de backup
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/sigfarma"
DB_NAME="sigfarma"
DB_USER="sigfarma_user"

mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup de archivos de aplicación
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /path/to/sigfarma-system --exclude=node_modules --exclude=logs

# Limpiar backups antiguos (mantener 30 días)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completado: $DATE"
EOF

chmod +x backup.sh

# Configurar cron para backup diario
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### 3. Monitoreo con PM2
```bash
# Instalar PM2 Plus para monitoreo avanzado
pm2 install pm2-server-monit

# Configurar alertas
pm2 set pm2-server-monit:conf '{"actions":[{"type":"email","to":"admin@tudominio.com"}]}'

# Ver métricas
pm2 monit
```

### 4. Configuración de Firewall
```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5432  # Solo si PostgreSQL es accesible externamente
```

## Solución de Problemas

### Problemas Comunes

#### 1. Error de conexión a base de datos
```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Verificar conexión
psql -h localhost -U sigfarma_user -d sigfarma -c "SELECT version();"

# Revisar logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 2. Aplicación no responde
```bash
# Verificar estado de PM2
pm2 status

# Reiniciar aplicación
pm2 restart sigfarma

# Ver logs de errores
pm2 logs sigfarma --err
```

#### 3. Problemas de memoria
```bash
# Verificar uso de memoria
free -h
pm2 monit

# Configurar límites de memoria en PM2
pm2 start ecosystem.config.js --max-memory-restart 500M
```

#### 4. SSL no funciona
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew

# Verificar configuración Nginx
sudo nginx -t
```

### Comandos de Diagnóstico
```bash
# Estado general del sistema
systemctl status nginx postgresql
pm2 status

# Uso de recursos
htop
df -h
netstat -tulpn

# Logs importantes
tail -f /var/log/nginx/error.log
tail -f /var/log/postgresql/postgresql-15-main.log
pm2 logs sigfarma
```

## Actualizaciones

### Proceso de Actualización
```bash
# 1. Backup completo
./backup.sh

# 2. Detener aplicación
pm2 stop sigfarma

# 3. Actualizar código
git pull origin main

# 4. Instalar dependencias
npm install

# 5. Ejecutar migraciones (si las hay)
npm run db:migrate

# 6. Construir nueva versión
npm run build

# 7. Iniciar aplicación
pm2 start sigfarma

# 8. Verificar funcionamiento
curl -f http://localhost:3000/health || echo "Error: Aplicación no responde"
```

### Rollback en caso de problemas
```bash
# Volver a versión anterior
git checkout HEAD~1

# Restaurar backup de BD si es necesario
gunzip -c /backups/sigfarma/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U sigfarma_user sigfarma

# Reconstruir y reiniciar
npm run build
pm2 restart sigfarma
```

Esta guía cubre los aspectos principales del despliegue en producción. Ajusta las configuraciones según tus necesidades específicas y el entorno de tu servidor.