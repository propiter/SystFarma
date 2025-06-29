# 🔒 Guía de Seguridad - SIGFARMA

## Configuración de Seguridad en Producción

### 1. Variables de Entorno Críticas

#### JWT Secret
```bash
# Generar clave segura de 32+ caracteres
openssl rand -base64 32

# Configurar en .env
JWT_SECRET=clave-super-secreta-generada-aleatoriamente
JWT_EXPIRATION=24h
```

#### Contraseñas de Base de Datos
```bash
# Generar contraseña segura
openssl rand -base64 24

# Configurar usuario con permisos mínimos
CREATE USER sigfarma_user WITH PASSWORD 'password_super_seguro';
GRANT CONNECT ON DATABASE sigfarma TO sigfarma_user;
GRANT USAGE ON SCHEMA public TO sigfarma_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sigfarma_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sigfarma_user;
```

### 2. Configuración de Headers de Seguridad

#### Helmet.js (Ya configurado)
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.tu-dominio.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
```

#### CORS Configuración
```javascript
app.use(cors({
  origin: [
    'https://tu-dominio.com',
    'https://www.tu-dominio.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Rate Limiting

#### Configuración por Endpoint
```javascript
const rateLimit = require('express-rate-limit');

// Rate limiting general
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por ventana
  message: 'Demasiadas solicitudes, intenta más tarde'
});

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos de login por IP
  skipSuccessfulRequests: true,
  message: 'Demasiados intentos de login, intenta en 15 minutos'
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', loginLimiter);
```

### 4. Validación de Datos

#### Esquemas Joi Estrictos
```javascript
const userSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required(),
  correo: Joi.string().email().max(100).required(),
  contraseña: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  rol: Joi.string().valid('admin', 'cajero', 'bodega').required()
});
```

#### Sanitización de Entrada
```javascript
const validator = require('validator');

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};
```

### 5. Autenticación y Autorización

#### Configuración JWT Segura
```javascript
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.usuario_id,
      rol: user.rol,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '24h',
      issuer: 'sigfarma',
      audience: 'sigfarma-users'
    }
  );
};
```

#### Middleware de Autorización Granular
```javascript
const authorize = (requiredPermissions) => {
  return (req, res, next) => {
    const userRole = req.user.rol;
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage'],
      cajero: ['read', 'write:sales', 'write:devolutions'],
      bodega: ['read', 'write:inventory', 'write:products']
    };

    const userPermissions = permissions[userRole] || [];
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Permisos insuficientes' });
    }

    next();
  };
};
```

### 6. Encriptación de Contraseñas

#### bcrypt Configuración Segura
```javascript
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const saltRounds = 12; // Incrementar en hardware más potente
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

### 7. Configuración de Base de Datos

#### PostgreSQL Seguro
```sql
-- Configuraciones en postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/ca.crt'

-- Configuraciones en pg_hba.conf
hostssl all all 0.0.0.0/0 md5

-- Configurar conexiones encriptadas
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.2';
```

#### Conexión Segura desde la Aplicación
```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 8. Logs de Seguridad

#### Configuración de Winston
```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sigfarma-security' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Logging de eventos de seguridad
const logSecurityEvent = (event, details, req) => {
  securityLogger.info({
    event,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};
```

### 9. Configuración de Firewall

#### UFW (Ubuntu)
```bash
# Configuración básica
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir servicios necesarios
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir PostgreSQL solo desde localhost
sudo ufw allow from 127.0.0.1 to any port 5432

# Denegar acceso directo a Node.js desde exterior
sudo ufw deny 3000/tcp
```

#### iptables (Avanzado)
```bash
# Script de configuración iptables
#!/bin/bash

# Limpiar reglas existentes
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# Políticas por defecto
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permitir loopback
iptables -A INPUT -i lo -j ACCEPT

# Permitir conexiones establecidas
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Permitir SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Permitir HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Rate limiting para SSH
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Guardar reglas
iptables-save > /etc/iptables/rules.v4
```

### 10. Monitoreo de Seguridad

#### Fail2Ban
```bash
# Instalar Fail2Ban
sudo apt install fail2ban

# Configurar para SSH
sudo nano /etc/fail2ban/jail.local

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

# Configurar para Nginx
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

# Reiniciar servicio
sudo systemctl restart fail2ban
```

#### Monitoreo de Logs
```bash
# Script de monitoreo de logs sospechosos
#!/bin/bash

LOG_FILE="/var/log/sigfarma/security.log"
ALERT_EMAIL="admin@tu-dominio.com"

# Buscar patrones sospechosos
grep -i "failed login" $LOG_FILE | tail -10
grep -i "unauthorized" $LOG_FILE | tail -10
grep -i "sql injection" $LOG_FILE | tail -10

# Alertar si hay más de 10 intentos fallidos en la última hora
FAILED_ATTEMPTS=$(grep -i "failed login" $LOG_FILE | grep "$(date '+%Y-%m-%d %H')" | wc -l)

if [ $FAILED_ATTEMPTS -gt 10 ]; then
    echo "ALERTA: $FAILED_ATTEMPTS intentos de login fallidos en la última hora" | mail -s "Alerta de Seguridad SIGFARMA" $ALERT_EMAIL
fi
```

### 11. Backup Seguro

#### Encriptación de Backups
```bash
#!/bin/bash

# Script de backup encriptado
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/sigfarma"
DB_NAME="sigfarma"
ENCRYPTION_KEY="/etc/sigfarma/backup.key"

# Crear backup de BD
pg_dump -h localhost -U sigfarma_user $DB_NAME | gzip > $BACKUP_DIR/temp_backup_$DATE.sql.gz

# Encriptar backup
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric --output $BACKUP_DIR/backup_$DATE.sql.gz.gpg $BACKUP_DIR/temp_backup_$DATE.sql.gz

# Eliminar backup temporal
rm $BACKUP_DIR/temp_backup_$DATE.sql.gz

# Subir a almacenamiento seguro (AWS S3 con encriptación)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz.gpg s3://tu-bucket-backups/sigfarma/ --sse AES256

echo "Backup encriptado completado: $DATE"
```

### 12. Configuración HTTPS

#### Certificado SSL con Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Configurar renovación automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Verificar configuración SSL
sudo nginx -t
sudo systemctl reload nginx
```

#### Configuración Nginx Segura
```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Configuración del proxy
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
    }
}

# Redirección HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}
```

### 13. Checklist de Seguridad

#### Pre-Producción
- [ ] Cambiar todas las contraseñas por defecto
- [ ] Configurar JWT_SECRET único y seguro
- [ ] Habilitar HTTPS con certificado válido
- [ ] Configurar firewall (UFW/iptables)
- [ ] Instalar y configurar Fail2Ban
- [ ] Configurar backups encriptados
- [ ] Revisar permisos de archivos y directorios
- [ ] Configurar logs de seguridad
- [ ] Probar rate limiting
- [ ] Verificar headers de seguridad

#### Post-Producción
- [ ] Monitorear logs de seguridad diariamente
- [ ] Revisar intentos de login fallidos
- [ ] Verificar certificados SSL mensualmente
- [ ] Actualizar dependencias regularmente
- [ ] Realizar auditorías de seguridad trimestrales
- [ ] Probar procedimientos de backup y restauración
- [ ] Revisar usuarios y permisos mensualmente
- [ ] Monitorear uso de recursos y patrones anómalos

### 14. Contacto de Seguridad

Para reportar vulnerabilidades de seguridad:
- 📧 Email: security@sigfarma.com
- 🔒 PGP Key: [Clave pública disponible]
- ⏱️ Tiempo de respuesta: 24-48 horas
- 🏆 Programa de recompensas por vulnerabilidades

**Política de Divulgación Responsable:**
1. Reportar la vulnerabilidad de forma privada
2. Dar tiempo razonable para la corrección (90 días)
3. No explotar la vulnerabilidad en sistemas de producción
4. Recibir reconocimiento público tras la corrección