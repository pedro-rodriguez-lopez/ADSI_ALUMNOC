# 📄 Memoria de la Práctica - Alumno C

## Módulo de Gestión de Alumnos (ufvAlumnosService)

---

## 1. Introducción

### Objetivo de la aplicación

Implementar un **REST API completo en Node.js + Express** para la gestión de estudiantes en la plataforma académica UFV. El sistema permite operaciones CRUD (Create, Read, Update, Delete) de alumnos e inscripciones a asignaturas, con persistencia en PostgreSQL y balanceo de carga mediante Nginx.

### Alcance

**Incluye:**
- API REST con 10 endpoints para gestión de alumnos
- Interfaz HTML para operaciones CRUD
- Gestión de inscripciones a asignaturas
- Base de datos PostgreSQL (esquema `academico`)
- Despliegue en dos instancias EC2 con redundancia
- Nginx como load balancer
- Ansible playbooks para automatización
- Monitorización mediante systemd y journalctl

**No incluye:**
- Autenticación y autorización (IAM)
- Panel de administración avanzado
- Integración con otros módulos (más allá de compartir BD)
- Aplicación mobile
- Analytics o reporting avanzado

### Stakeholders

| Stakeholder | Rol | Responsabilidad |
|-------------|-----|-----------------|
| Alumno C | Desarrollador Backend | Implementación de alumno.js, ansible, testing |
| Profesor ADSI | Evaluador | Validación de arquitectura y cumplimiento |
| Alumno D | Desarrollador (módulo Profesores) | Integración en BD compartida |
| Usuario Final | Admin/Gestor | Usar API para gestionar alumnos |
| DevOps Team | Operación | Despliegue y monitorización en producción |

### Definiciones y acrónimos

| Término | Definición |
|---------|-----------|
| **CRUD** | Create, Read, Update, Delete - operaciones básicas de datos |
| **REST API** | Interfaz web basada en HTTP con principios RESTful |
| **VPC** | Virtual Private Cloud - red aislada en AWS |
| **EC2** | Elastic Compute Cloud - instancias virtuales de AWS |
| **PostgreSQL** | Sistema de gestión de BD relacional |
| **Nginx** | Servidor web y proxy inverso |
| **Ansible** | Herramienta de automatización de infraestructura |
| **systemd** | Sistema de inicialización en Linux |
| **Load Balancer** | Distribuye tráfico entre múltiples servidores |
| **VPC Peering** | Conexión privada entre dos VPCs |
| **RTO/RPO** | Recovery Time/Point Objective (recuperación ante desastres) |
| **SLA/SLO** | Service Level Agreement/Objective |

---

## 2. Visión General de la Solución

### Descripción funcional

El módulo Alumno C proporciona un servicio web que:

1. **Gestiona Alumnos:** CRUD completo (crear, listar, editar, eliminar)
2. **Gestiona Inscripciones:** Vincula alumnos con asignaturas
3. **Interfaz Web:** Formularios HTML para operaciones sin cliente especializado
4. **Persistencia:** Almacena datos en PostgreSQL compartida
5. **Alta Disponibilidad:** Ejecuta en 2 instancias EC2 con balanceo de carga
6. **Automatización:** Despliegue y actualizaciones mediante Ansible

### Casos de uso principales

**CU-1: Registrar nuevo alumno**
- Actor: Admin/Gestor
- Precondición: El email no existe
- Flujo: Accede a `/alumnos/nuevo` → completa formulario → POST `/alumnos` → Se crea registro
- Postcondición: Alumno visible en lista

**CU-2: Ver lista de alumnos**
- Actor: Admin/Gestor
- Precondición: Ninguna
- Flujo: GET `/alumnos` → Renderiza tabla con todos los alumnos
- Postcondición: Lista actualizada visible

**CU-3: Editar datos de alumno**
- Actor: Admin/Gestor
- Precondición: Alumno existe
- Flujo: GET `/alumnos/editar/:id` → Modifica datos → POST `/alumnos/update`
- Postcondición: Datos actualizados en BD

**CU-4: Eliminar alumno**
- Actor: Admin/Gestor
- Precondición: Alumno existe
- Flujo: GET `/alumnos/borrar/:id` → Confirmación → Elimina registros
- Postcondición: Alumno y sus inscripciones eliminadas

**CU-5: Ver inscripciones de un alumno**
- Actor: Admin/Gestor
- Precondición: Alumno existe
- Flujo: GET `/alumnos/:id/inscripciones` → JOIN con asignaturas
- Postcondición: Lista de asignaturas del alumno

### Diagrama de alto nivel

```
┌──────────────────────────────────────────────────────────────┐
│                        USUARIOS/NAVEGADOR                     │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTP Request
                     ▼
        ┌────────────────────────────┐
        │  Nginx Load Balancer       │
        │  (10.0.1.11:80)            │
        │  Proxy /alumnos → 3001     │
        └────┬────────────┬──────────┘
             │            │
         ┌───▼──┐     ┌───▼──┐
         │ EC2-1│     │ EC2-2│
         │10.1.1│     │10.1.1│
         │ .10  │     │ .11  │
         ├──────┤     ├──────┤
         │Nginx │     │Nginx │
         │:80   │     │:80   │
         ├──────┤     ├──────┤
         │Node  │     │Node  │
         │3001  │     │3001  │
         └──┬───┘     └──┬───┘
            │            │
            └─────┬──────┘
                  │ VPC Peering
                  ▼
        ┌──────────────────────┐
        │  PostgreSQL          │
        │  10.0.1.10:5432      │
        │  DB: academico       │
        └──────────────────────┘
```

### Supuestos y restricciones

**Supuestos:**
- Las instancias EC2 están siempre en el mismo estado de despliegue
- La BD PostgreSQL es punto único de fallo (sin replicación)
- El tráfico es moderado (sin necesidad de auto-scaling)
- Los usuarios tienen conectividad HTTP/HTTPS estable
- La contraseña de BD no cambia frecuentemente

**Restricciones:**
- Puerto 3001 solo accesible internamente (vía Nginx)
- Email debe ser único en la tabla `alumnos`
- El nombre de alumno no puede estar vacío
- RTO: 30 minutos (recuperación manual)
- RPO: 1 día (backup diario)

---

## 3. Arquitectura

### 3.1 Arquitectura lógica

#### Componentes

**Frontend:**
- HTML5 con formularios POST
- CSS básico para estilos (`style.css`)
- Navegación entre vistas (listado, crear, editar, eliminar)

**Backend:**
- `alumno.js`: Express server (Node.js)
- Puerto: 3001 (interno)
- Módulos: express, pg (cliente PostgreSQL)

**APIs:**
- REST HTTP en JSON (en algunos casos HTML)
- 10 endpoints GET/POST
- Validaciones de entrada básicas

**Workers:**
- Ninguno (sin procesamiento asíncrono)

#### Flujos de datos

```
Usuario HTML Form
    ↓
Nginx Reverse Proxy (:80)
    ↓
Express Server (:3001)
    ↓
    ├─ GET /alumnos → Query "SELECT * FROM alumnos"
    │     ↓
    │  Renderiza tabla HTML
    │
    ├─ POST /alumnos → INSERT INTO alumnos
    │     ↓
    │  Valida nombre, email
    │     ↓
    │  Insert → PostgreSQL
    │
    └─ GET /alumnos/inscripciones → JOIN alumnos, inscripciones, asignaturas
          ↓
       Renderiza tabla HTML
```

#### Dependencias externas

- **PostgreSQL 10.0.1.10:5432** - BD relacional principal
- **Nginx (Nginx-LB)** - Load balancer Nginx en 10.0.1.11
- **AWS CloudFormation** - Despliegue de infraestructura
- **Ansible** - Orquestación y automatización

### 3.2 Arquitectura física / infraestructura

#### Cloud provider

**AWS (Amazon Web Services)**
- Proveedor: Amazon Web Services
- Región: `eu-south-2` (Milano)

#### Regiones y zonas

```
Región: eu-south-2 (Milano)
├─ VPC AlexUFV (10.1.0.0/16)
│  ├─ Subnet Privada: 10.1.1.0/24
│  │  ├─ EC2-1: 10.1.1.10 (alumno.js)
│  │  └─ EC2-2: 10.1.1.11 (alumno.js)
│  │
│  └─ Routing: 10.0.0.0/16 via VPC Peering
│
└─ VPC AlexPersonal (10.0.0.0/16)
   ├─ Subnet Privada: 10.0.1.0/24
   │  ├─ PostgreSQL: 10.0.1.10:5432
   │  └─ Nginx-LB: 10.0.1.11:80
```

#### Red

**VPC AlexUFV:**
- CIDR: `10.1.0.0/16`
- Subnet Privada: `10.1.1.0/24` (sin Internet Gateway)
- Instancias: 2 x EC2 t3.medium

**VPC AlexPersonal:**
- CIDR: `10.0.0.0/16`
- Subnet Privada: `10.0.1.0/24`
- BD PostgreSQL + Nginx-LB

**VPC Peering:**
- Conexión: AlexUFV ↔ AlexPersonal
- Tráfico permitido: Puerto 3001 (apps) + 5432 (BD)

**Routing:**
- AlexUFV → 10.0.0.0/16 via Peering
- AlexPersonal → 10.1.0.0/16 via Peering

#### Balanceadores

**Nginx Load Balancer (10.0.1.11:80)**

```nginx
upstream alumnos_app {
    server 10.1.1.10:3001;
    server 10.1.1.11:3001;
}

server {
    listen 80;
    location /alumnos {
        proxy_pass http://alumnos_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- Algoritmo: Round-robin (por defecto)
- Health check: Opcional (puede mejorarse)

### 3.3 Diagramas

**Diagrama de Arquitectura:**
[Ver sección 3.2 - Arquitectura física]

**Diagrama de Red:**
```
Internet
  ↓ (no accesible directo)
Nginx-LB (10.0.1.11:80)
  ↓ VPC Peering
┌─────────────────┐
│ EC2-1 (10.1.1.10)
│ EC2-2 (10.1.1.11)
│ ↓ Conexión BD
│ PostgreSQL (10.0.1.10)
└─────────────────┘
```

**Diagrama de Despliegue:**
```
Ansible Control Node (Tu PC/Jenkins)
    ├─ SSH → EC2-1 (10.1.1.10)
    │   ├─ Copia alumno.js
    │   ├─ Instala dependencias (npm)
    │   └─ Crea systemd: ufvAlumnosService
    │
    └─ SSH → EC2-2 (10.1.1.11)
        ├─ Copia alumno.js
        ├─ Instala dependencias (npm)
        └─ Crea systemd: ufvAlumnosService

systemd (cada EC2)
    ↓
node /var/www/app/alumno.js
```

---

## 4. Diseño de Datos

### Modelo de datos

**Diagrama Entidad-Relación:**

```
┌─────────────────┐         ┌──────────────────┐
│    alumnos      │         │   asignaturas    │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │         │ id (PK)          │
│ nombre          │         │ nombre           │
│ email (UNIQUE)  │         │ codigo (UNIQUE)  │
│ fecha_registro  │         │ descripcion      │
└────────┬────────┘         └────────┬─────────┘
         │ 1                         │ 1
         │                           │
         │ N                         │ N
         └─────────┬──────────────────┘
                   │
                ┌──▼──────────────┐
                │  inscripciones  │
                ├─────────────────┤
                │ id (PK)         │
                │ alumno_id (FK)  │
                │ asignatura_id FK│
                │ fecha_inscrip   │
                │ notas           │
                └─────────────────┘
```

### Bases de datos

**SQL - PostgreSQL:**

```sql
-- Base de datos
CREATE DATABASE academico;

-- Tabla: alumnos
CREATE TABLE alumnos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: asignaturas
CREATE TABLE asignaturas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla: inscripciones
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
    asignatura_id INTEGER REFERENCES asignaturas(id),
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

-- Índices para optimización
CREATE INDEX idx_alumnos_email ON alumnos(email);
CREATE INDEX idx_inscripciones_alumno ON inscripciones(alumno_id);
CREATE INDEX idx_inscripciones_asignatura ON inscripciones(asignatura_id);
```

**NoSQL:** No se utiliza.

### Estrategia de almacenamiento

- **Tipo:** Relacional (PostgreSQL)
- **Ubicación:** 10.0.1.10 (VPC AlexPersonal)
- **Acceso:** username: `backend`, contraseña: `ContraseñaSegura123`
- **Base:** `academico`
- **Conexión desde app:** `psql -h 10.0.1.10 -U backend -d academico`

### Retención de datos

- **Alumnos:** Indefinida (histórico)
- **Inscripciones:** Indefinida (registro académico)
- **Logs del servicio:** 7 días (en disco del EC2)

### Backup

**Estrategia:**
- Backup diario manual mediante script de BD
- Ubicación: `/var/backups/academico_*.sql.gz`
- Frecuencia: Diaria a las 02:00 AM
- Retención: 30 días

**Procedimiento:**

```bash
# En PostgreSQL
pg_dump -h 10.0.1.10 -U backend academico | gzip > /var/backups/academico_$(date +%Y%m%d).sql.gz

# Restaurar
gunzip < /var/backups/academico_20260425.sql.gz | psql -h 10.0.1.10 -U backend academico
```

---

## 5. Seguridad

### Control de acceso

**IAM (AWS):**
- EC2 Role: `ufvAlumnosServiceRole`
  - Permisos: EC2, CloudWatch Logs, S3 (backups)
  
**OS Level:**
- Usuario `ec2-user` con sudoers (sin contraseña)
- Clave SSH: `~/.ssh/aws_ufv.pem`

**Base de datos:**
- Usuario: `backend` (solo lectura/escritura en `academico`)
- Usuario: `postgres` (superusuario local)

### Gestión de secretos

**Almacenamiento:**
- Credenciales BD: En archivos systemd (limitado)
- SSH keys: En `~/.ssh/` (0600 permisos)
- Mejora futura: AWS Secrets Manager

**Variables de entorno en systemd:**

```ini
[Service]
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="DB_HOST=10.0.1.10"
Environment="DB_USER=backend"
Environment="DB_PASSWORD=ContraseñaSegura123"
Environment="DB_NAME=academico"
```

### Cifrado

**En tránsito:**
- HTTP sin SSL (interno en VPC)
- SSL/TLS: Futuro (requiere certificado en Nginx)

**En reposo:**
- PostgreSQL: Sin encriptación a nivel BD
- Discos EC2: EBS encryption (habilitado en CloudFormation)

### Hardening

- Security Groups: Restringen acceso a puertos específicos
- No root en el servicio: node corre como `ec2-user`
- Validaciones básicas en inputs (email, nombre)
- Mejoras futuras: Rate limiting, CORS restringido

### Auditoría y logging

**Aplicación:**
- Logs en stdout (capturados por systemd journal)
- Comando: `journalctl -u ufvAlumnosService -f`

**BD:**
- Logs PostgreSQL: `/var/log/postgresql/`
- Consultas registradas: Opcional (genera overhead)

**Infraestructura:**
- CloudWatch Logs: Futuro
- Auditoría de cambios: Git + Jenkins logs

---

## 6. Networking

### Diseño de red

**Modelo:**
- 2 VPCs privadas (sin Internet Gateway)
- Conectadas vía VPC Peering
- Acceso desde exterior: A través de Nginx-LB (futuro: ALB en IP pública)

### Subnets

**Públicas:**
- Ninguna (arquitectura completamente privada)

**Privadas:**

| VPC | Subnet | CIDR | Propósito |
|-----|--------|------|-----------|
| AlexUFV | Privada | 10.1.1.0/24 | EC2 apps |
| AlexPersonal | Privada | 10.0.1.0/24 | BD + LB |

### Acceso a Internet

- **Internet Gateway:** Ninguno (red privada)
- **NAT:** No necesario (sin acceso a internet)
- **Mejora futura:** NAT Gateway para actualizaciones de paquetes

### Seguridad

**Security Groups:**

```
SG-alumnos-app:
  Inbound:
    - Puerto 3001 (TCP) desde SG-nginx-lb
    - SSH 22 (TCP) desde IP Control Node
  Outbound:
    - Todos

SG-nginx-lb:
  Inbound:
    - Puerto 80 (TCP) desde 0.0.0.0/0
    - SSH 22 (TCP) desde IP Control Node
  Outbound:
    - Puerto 3001 a SG-alumnos-app
    - Puerto 5432 a SG-postgres

SG-postgres:
  Inbound:
    - Puerto 5432 (TCP) desde SG-alumnos-app
    - Puerto 5432 (TCP) desde SG-nginx-lb
  Outbound:
    - Todos
```

**NACLs:**
- Por defecto (permiten todo)

---

## 7. Integraciones

### APIs externas

- **Ninguna** (sistema standalone)

### Sistemas terceros

- **Alumno D (módulo Profesores):** Comparte BD `academico` (tabla `asignaturas`)
- **Jenkins:** Orquestación de despliegues
- **Ansible:** Automatización de infraestructura

### Mensajería y eventos

- **Kafka:** No utilizado
- **SQS:** No utilizado
- **Otros:** Ninguno

---

## 8. CI/CD

### Repositorios

- **Git:** GitHub (privado)
- **Rama:** `main` (producción)
- **Ubicación local:** `c:\Users\pedri\Documents\Adsi_Alumno\ADSI_ALUMNOC\`

### Pipelines

**Build:**
1. Git checkout
2. npm install (dependencias)
3. Linting (futuro: eslint)

**Test:**
1. Unit tests (futuro: Jest)
2. Integration tests (futuro: POST /alumnos)

**Deploy:**
1. Ejecutar `deploy_app.yml` (primer despliegue)
2. O `update_web.yml` (actualización de código)

### Estrategia de despliegue

- **Blue/Green:** No implementado (solo una instancia activa por vez durante actualización)
- **Canary:** No implementado
- **Actual:** Rolling update (actualiza una instancia, luego la otra)

**Procedimiento:**

```bash
# Parar instancia 1
ansible ec2-1 -m shell -a "systemctl stop ufvAlumnosService"

# Copiar código nuevo
ansible ec2-1 -m copy -a "src=alumno.js dest=/var/www/app/"

# Reiniciar
ansible ec2-1 -m shell -a "systemctl start ufvAlumnosService"

# Repetir para instancia 2
```

### Versionado

- **Semantic Versioning:** 1.0.0 (formato MAJOR.MINOR.PATCH)
- **Git tags:** `v1.0.0`
- **Changelog:** CHANGELOG.md

---

## 9. Operaciones

### 9.1 Monitorización

#### Métricas

| Métrica | Herramienta | Umbral Alerta |
|---------|-------------|---------------|
| CPU | CloudWatch | > 80% por 5 min |
| Memoria | CloudWatch | > 85% |
| Latencia | CloudWatch | > 500ms |
| Conexiones BD | Manual check | > 5 |
| Errores HTTP | Manual check | > 1% de 5xx |

#### Herramientas

- **CloudWatch:** CloudWatch Logs (futuro: métricas personalizadas)
- **Prometheus:** No implementado
- **Grafana:** No implementado
- **Manual:** `journalctl`, `ps aux`, `df -h`

**Comandos útiles:**

```bash
# Ver estado del servicio
systemctl status ufvAlumnosService

# Ver logs en tiempo real
journalctl -u ufvAlumnosService -f

# Ver últimas 100 líneas
journalctl -u ufvAlumnosService -n 100

# Ver CPU/Memoria
ps aux | grep "node alumno.js"

# Ver conexiones BD
lsof -p $(pgrep -f "node alumno.js") | grep -i tcp
```

### 9.2 Logging

**Centralización:**
- Logs locales en `/var/log/` (systemd journal)
- Futuro: ELK Stack o CloudWatch Logs

**Retención:**
- 7 días en memoria (systemd journal)
- Opcional: Rotación manual con logrotate

### 9.3 Alerting

**Umbrales:**
- HTTP 5xx consecutivos: > 3 → Alertar
- Servicio no responde: > 1 min → Reiniciar manual
- Conexión BD perdida: Inmediato

**On-call / Escalado:**
- Responsable primario: Alumno C
- Escalación: Profesor ADSI
- Herramienta: Email + Teams (futuro: PagerDuty)

### 9.4 Mantenimiento

**Parches:**
- Sistema OS: Mensual (yum update)
- Node.js: Anualmente (cambio de versión)
- Dependencias npm: Semestral (npm update)

**Actualizaciones:**
- Código app: Rolling updates (sin downtime)
- BD schema: Con backup previo
- Nginx config: Con `nginx -t` previo

---

## 10. Alta Disponibilidad (HA)

**Multi-AZ:**
- ❌ No implementado (ambas EC2 en misma AZ)
- Mejora: Desplegar en AZ diferentes

**Failover automático:**
- ❌ No implementado
- Mejora: Nginx con health checks automáticos

**Balanceo de carga:**
- ✅ Nginx load balancer (round-robin)
- ✅ 2 instancias EC2 con código idéntico
- ❌ Auto-scaling: No implementado

**RTO/RPO:**
- RTO: 30 minutos (recuperación manual)
- RPO: 1 día (backup diario)

---

## 11. DRP (Disaster Recovery Plan)

### 11.1 Definiciones

- **RTO (Recovery Time Objective):** 30 minutos
- **RPO (Recovery Point Objective):** 1 día de datos

### 11.2 Estrategia DR

- **Backup & Restore:** BD diaria + snapshots AMI
- **Warm Standby:** No implementado
- **Multi-site:** No implementado

### 11.3 Implementación

**Replicación de datos:**
- PostgreSQL backup diario: `pg_dump` → compresión → S3 (futuro)

**Cross-region:**
- No implementado (todo en eu-south-2)

**Infraestructura como código:**
- CloudFormation: `stack-ufv.yaml`
- Ansible: playbooks reutilizables
- Versionado en Git

### 11.4 Procedimiento de recuperación

#### Pasos detallados

**Escenario: Pérdida de EC2-1**

1. **Detectar:** Nginx no responde desde 10.1.1.10
2. **Notificar:** Alertar a on-call
3. **Crear nueva EC2:** 
   ```bash
   aws ec2 run-instances --image-id ami-xxxx --instance-type t3.medium \
     --security-group-ids sg-xxxx --subnet-id subnet-xxxx
   ```
4. **Configurar nueva instancia:** Ejecutar deploy_app.yml
5. **Verificar:** `curl http://10.1.1.10:3001/health`
6. **Actualizar Nginx:** Si es necesario cambiar IP

**Escenario: Pérdida de BD PostgreSQL**

1. **Detectar:** Aplicación retorna "cannot connect to database"
2. **Buscar backup:** `/var/backups/academico_YYYYMMDD.sql.gz`
3. **Restaurar:** `gunzip | psql -h <nueva-ip> -U backend academico`
4. **Validar:** SELECT COUNT(*) en tablas críticas
5. **Notificar:** Estado a Alumno D (comparte BD)

#### Roles y responsabilidades

| Rol | Responsabilidad | On-Call |
|-----|-----------------|---------|
| Alumno C | Ejecutar pasos 1-5 | Sí |
| DevOps | Infraestructura AWS | No |
| Profesor | Validación y escalado | Sí |
| Alumno D | Coordinar si BD | Sí |

#### Validación post-recuperación

```bash
# Checklist post-DR
☐ Servicio responde: curl http://<ip>/health
☐ BD conecta: psql -h 10.0.1.10 -U backend -d academico -c "SELECT COUNT(*) FROM alumnos"
☐ Alumnos visibles: curl http://<lb-ip>/alumnos
☐ Nginx redirige: curl -I http://10.0.1.11/alumnos → 200
☐ Logs limpios: journalctl -u ufvAlumnosService -n 50 (sin errores)
☐ Test manual: Crear alumno, visualizar, editar, eliminar
☐ Comunicar: Restauración completada a stakeholders
```

---

## 12. Costes

### Estimación de costes

**Componentes (mensual):**

| Componente | Config | Coste |
|------------|--------|-------|
| EC2 (2x) | t3.medium (on-demand) | €0.05/h × 730h × 2 = €73 |
| PostgreSQL | RDS Multi-AZ | €150 (estimado) |
| Nginx server | t3.small | €0.03/h × 730h = €22 |
| Transferencia datos | 100 GB outbound | €5 |
| Storage (EBS) | 30 GB | €3 |
| **Total mensual** | | **~€253** |

**Optimizaciones:**
- Reserved instances: -30% (€177/mes)
- Spot instances: -70% (€76/mes, pero sin garantía)

### Cost monitoring

**Herramientas:**
- AWS Cost Explorer
- Tags: `Owner:AlumnoC`, `Project:ADSI`, `Environment:Production`

**Seguimiento:**
- Revisar costes semanalmente
- Alertas si > €300/mes

---

## 13. Rendimiento

### SLA / SLO / SLI

| Métrica | Objetivo | Indicador |
|---------|----------|-----------|
| **Disponibilidad (SLO)** | 99.5% | Tiempo activo/Tiempo total |
| **Latencia (SLI)** | < 200ms | Tiempo respuesta p95 |
| **Error Rate (SLI)** | < 0.1% | Errores 5xx / Total reqs |

**SLA (Service Level Agreement):**
- 99.5% disponibilidad mensual = máximo 3.6 horas de downtime
- Crédito: 5% de facturación si no se cumple

### Pruebas de carga

**Herramienta:** Apache JMeter o wrk

```bash
# Test básico
wrk -t4 -c100 -d30s http://<lb-ip>/alumnos

# Resultados esperados
Requests/sec: > 100
Latency p95: < 500ms
Error rate: < 1%
```

**Volumen esperado:**
- Usuarios simultáneos: 10-20
- Picos: 50 usuarios (durante inscripciones)
- Tráfico diario: ~1000 requests

### Escalabilidad

**Horizontal:**
- ✅ Agregar más EC2 + registrar en Nginx
- Limitación: PostgreSQL es punto único

**Vertical:**
- ✅ Cambiar a t3.large (más CPU/RAM)
- Coste: +50% por instancia

**BD:**
- ❌ No hay read replicas
- Mejora: PostgreSQL replicación

---

## 14. Gestión de Configuración

### Variables de entorno

**systemd (/etc/systemd/system/ufvAlumnosService.service):**

```ini
[Service]
Type=simple
User=ec2-user
ExecStart=/usr/bin/node /var/www/app/alumno.js
Restart=on-failure
RestartSec=5s

# Variables de entorno
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="DB_HOST=10.0.1.10"
Environment="DB_PORT=5432"
Environment="DB_USER=backend"
Environment="DB_PASSWORD=ContraseñaSegura123"
Environment="DB_NAME=academico"
```

### Feature flags

- No implementado (usar ramas Git o variables)
- Mejora futura: LaunchDarkly o custom JSON

---

## 15. Riesgos y Mitigaciones

### Identificación de riesgos

| Riesgo | Impacto | Probabilidad | Severidad |
|--------|---------|--------------|-----------|
| EC2 falla | Downtime 50% | Media (2%) | Alta |
| BD se corrompe | Pérdida datos | Baja (0.1%) | Crítica |
| Email duplicado | Error inserción | Media (5%) | Media |
| Nginx cae | Downtime total | Baja (1%) | Alta |
| Código contiene bug | Errores funcionales | Alta (20%) | Media |
| Contraseña BD comprometida | Acceso no autorizado | Baja (0.5%) | Crítica |

### Planes de mitigación

| Riesgo | Mitigación |
|--------|-----------|
| EC2 falla | Deploy en Multi-AZ, Auto-scaling |
| BD se corrompe | Backup diario + replicación |
| Email duplicado | Validación UNIQUE en BD + app |
| Nginx cae | Health checks automáticos |
| Código bug | Testing + code review |
| Contraseña comprometida | AWS Secrets Manager + rotación |

---

## 16. Roadmap

### Evolución futura

**Q3 2026:**
- ✅ v1.0: MVP (10 endpoints básicos)
- JWT Authentication
- Rate limiting

**Q4 2026:**
- API versioning (/v2/alumnos)
- GraphQL endpoint
- Caché Redis

**Q1 2027:**
- Multi-tenancy (múltiples universidades)
- Mobile app (React Native)
- Analytics dashboard

### Mejoras previstas

| Mejora | Beneficio | Esfuerzo |
|--------|-----------|----------|
| HTTPS/TLS | Seguridad | 2h |
| Auto-scaling | HA | 8h |
| CloudWatch | Observabilidad | 4h |
| PostgreSQL replicación | Redundancia | 16h |
| Unit tests | Confiabilidad | 12h |
| Docker | Portabilidad | 6h |
| Kubernetes | Escalabilidad | 32h |

---

## 17. Anexos

### 17.1 Estructura de archivos

```
ADSI_ALUMNOC/
├── ufv-app/
│   ├── node/
│   │   ├── alumno.js              ⭐ Backend API
│   │   ├── package.json           Dependencias
│   │   └── node_modules/          (git ignored)
│   ├── nginx/
│   │   ├── AlexUFV_nginx.conf     Config Nginx (proxy)
│   │   └── AlexPersonal_nginx.conf
│   └── public/
│       ├── index.html
│       └── css/style.css
│
├── ansible/
│   ├── ansible.cfg
│   ├── playbooks/
│   │   ├── deploy_app.yml         ⭐ Despliegue inicial
│   │   ├── update_web.yml         ⭐ Actualización
│   │   ├── configure_dns_clients.yml
│   │   └── (otros)
│   ├── inventory/
│   │   ├── hosts                  ⭐ Inventario
│   │   └── aws_inventory.sh
│   └── roles/
│       ├── ad_setup/
│       └── python_venv/
│
├── cloudformation/
│   ├── stack-ufv.yaml             Stack VPC AlexUFV
│   └── stack-personal.yaml        Stack VPC AlexPersonal
│
├── jenkins/
│   ├── Jenkinsfile-provision      Pipeline principal
│   ├── Jenkinsfile-webdeploy      Pipeline despliegue
│   └── README*
│
├── scripts/
│   ├── setup-jenkins-job.sh
│   └── check-prerequisites.sh
│
├── ALUMNO_C_README.md             Documentación técnica
├── MEMORIA_ALUMNO_C.md            ⭐ Esta memoria
└── README.md                      Docs generales
```

### 17.2 API Endpoints Completos

```bash
# 1. Página inicio
GET /
Response: HTML <h1>Módulo de Gestión de Alumnos</h1>

# 2. Health check
GET /health
Response: {"status": "ok"}

# 3. Listar alumnos
GET /alumnos
Response: HTML table

# 4. Formulario crear
GET /alumnos/nuevo
Response: HTML form

# 5. Crear alumno
POST /alumnos
Body: {nombre, email}
Response: HTML success/error

# 6. Formulario editar
GET /alumnos/editar/:id
Response: HTML form prefilled

# 7. Actualizar alumno
POST /alumnos/update
Body: {id, nombre, email}
Response: HTML success/error

# 8. Confirmar eliminar
GET /alumnos/borrar/:id
Response: HTML confirmation

# 9. Listar inscripciones
GET /alumnos/inscripciones
Response: HTML table with JOIN

# 10. Inscripciones por alumno
GET /alumnos/:id/inscripciones
Response: HTML table
```

### 17.3 Comandos Útiles

```bash
# DESPLIEGUE
ansible-playbook ansible/playbooks/deploy_app.yml -i ansible/inventory/hosts -v
ansible-playbook ansible/playbooks/update_web.yml -i ansible/inventory/hosts -v

# VERIFICACIÓN
ssh -i ~/.ssh/aws_ufv.pem ec2-user@10.1.1.10
systemctl status ufvAlumnosService
journalctl -u ufvAlumnosService -f

# TESTING
curl http://10.1.1.10:3001/health
curl http://10.0.1.11/alumnos

# BD
psql -h 10.0.1.10 -U backend -d academico
SELECT * FROM alumnos;
```

### 17.4 Referencias

- **Documentación ADSI:** ALUMNO_C_README.md
- **Plantilla memoria:** readme.md (este proyecto)
- **Tecnologías:**
  - Express.js: https://expressjs.com/
  - PostgreSQL: https://www.postgresql.org/
  - Nginx: https://nginx.org/
  - Ansible: https://www.ansible.com/
  - AWS: https://aws.amazon.com/

---

## 📋 Checklist Final de Implementación

- [ ] Backend `alumno.js` implementado (10 endpoints)
- [ ] `package.json` con dependencias (express, pg)
- [ ] BD PostgreSQL configurada (3 tablas)
- [ ] Ansible `deploy_app.yml` funcional
- [ ] Ansible `update_web.yml` funcional
- [ ] Nginx proxy configurado para /alumnos → 3001
- [ ] 2 x EC2 con código desplegado
- [ ] Health check: `curl /health` → 200 OK
- [ ] Conexión BD OK: test query exitosa
- [ ] Nginx LB: redirecciones funcionan
- [ ] CRUD completo: C-R-U-D testado manualmente
- [ ] Logs limpios: sin errores en journalctl
- [ ] Documentación completada (esta memoria)

---

**Documentación:** Memoria de Práctica - Alumno C  
**Versión:** 1.0  
**Fecha:** 25 de abril de 2026  
**Estado:** ✅ En Desarrollo  
**Autor:** Alumno C
