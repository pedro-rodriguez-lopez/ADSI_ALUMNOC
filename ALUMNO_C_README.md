# 📚 Módulo de Alumnos (Alumno C) - Documentación Completa

## 🎯 Descripción General

**Módulo de Gestión de Estudiantes** para la plataforma académica UFV. Implementa un REST API completo en Node.js + Express para operaciones CRUD de alumnos, incluyendo gestión de inscripciones a asignaturas.

**Responsable:** Alumno C  
**Servicio:** ufvAlumnosService  
**Puerto:** 3001  
**Región AWS:** eu-south-2

---

## 🏗️ Arquitectura

### Instancias EC2 (VPC AlexUFV - 10.1.0.0/16)

```
┌─────────────────────────────────────────────────────────┐
│  VPC AlexUFV (10.1.0.0/16)                              │
│                                                          │
│  ┌─────────────────────┐      ┌─────────────────────┐   │
│  │  10.1.1.10          │      │  10.1.1.11          │   │
│  │  - Nginx (80)       │      │  - Nginx (80)       │   │
│  │  - alumno.js (3001) │◄────►│  - alumno.js (3001) │   │
│  │  - Lb + redundancia │      │  - Lb + redundancia │   │
│  └─────────────────────┘      └─────────────────────┘   │
│           ▲                              ▲               │
│           └──────────────────┬───────────┘               │
│                              │                           │
│                         Nginx LB                         │
│                      /alumnos → 3001                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼ VPC Peering
┌─────────────────────────────────────────────────────────┐
│  VPC AlexPersonal (10.0.0.0/16)                         │
│                                                          │
│  PostgreSQL academico                                   │
│  10.0.1.10:5432                                         │
│  - User: backend                                        │
│  - DB: academico                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Peticiones

```
Usuario/Cliente
    ↓
Nginx Load Balancer (10.0.1.11 - AlexPersonal)
    ↓
/alumnos → proxy_pass http://alumnos_app
    ├─ 10.1.1.10:3001 (Instancia 1)
    └─ 10.1.1.11:3001 (Instancia 2)
    ↓
alumno.js Express Server
    ↓
PostgreSQL (10.0.1.10:5432)
    ↓
Tablas: alumnos, inscripciones, asignaturas
```

---

## 📊 Base de Datos

### Esquema: `academico`

#### Tabla: `alumnos`
```sql
CREATE TABLE alumnos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | ID único del alumno |
| nombre | VARCHAR(100) | Nombre completo |
| email | VARCHAR(100) | Email único |
| fecha_registro | TIMESTAMP | Fecha de registro automática |

#### Tabla: `asignaturas`
```sql
CREATE TABLE asignaturas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT
);
```

#### Tabla: `inscripciones`
```sql
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
    asignatura_id INTEGER REFERENCES asignaturas(id),
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);
```

### Conexión PostgreSQL

```
Host:     10.0.1.10
Puerto:   5432
Usuario:  backend
Password: ContraseñaSegura123
Base:     academico
```

**Comando para conectar:**
```bash
psql -h 10.0.1.10 -U backend -d academico
```

---

## 🔌 API REST Endpoints

### Base URL
```
http://<load-balancer-ip>/alumnos
```

---

### 1️⃣ **GET /alumnos** — Listar todos los alumnos

**Descripción:** Retorna lista HTML con todos los alumnos registrados.

**Respuesta:**
```html
<html>
  <body>
    <h1>Gestión de Alumnos</h1>
    <table>
      <tr>
        <th>ID</th>
        <th>Nombre</th>
        <th>Email</th>
        <th>Fecha Registro</th>
        <th>Acciones</th>
      </tr>
      <tr>
        <td>1</td>
        <td>Juan García</td>
        <td>juan@ufv.es</td>
        <td>2024-01-15 10:30:00</td>
        <td>[Editar] [Eliminar] [Inscripciones]</td>
      </tr>
    </table>
  </body>
</html>
```

**Status Code:** 200 OK

---

### 2️⃣ **GET /alumnos/nuevo** — Formulario crear alumno

**Descripción:** Retorna formulario HTML para registrar nuevo alumno.

**Campos del formulario:**
- `nombre` (required)
- `email` (required, unique)

**Status Code:** 200 OK

---

### 3️⃣ **POST /alumnos** — Crear nuevo alumno

**Descripción:** Inserta nuevo alumno en base de datos.

**Body:**
```json
{
  "nombre": "María López",
  "email": "maria@ufv.es"
}
```

**Validaciones:**
- `nombre` no puede estar vacío
- `email` no puede estar vacío y debe ser único
- Si falta alguno, retorna error 400

**Respuesta exitosa:**
```html
<p>Alumno creado exitosamente.</p>
<a href="/alumnos">Volver a lista</a>
```

**Status Code:** 
- 200 OK (éxito)
- 400 Bad Request (validación)
- 500 Internal Server Error (error BD)

---

### 4️⃣ **GET /alumnos/editar/:id** — Formulario editar alumno

**Descripción:** Retorna formulario HTML pre-rellenado con datos del alumno.

**Parámetro:**
- `id` (required) - ID del alumno

**Respuesta:** Formulario con campos:
- `nombre` (pre-rellenado)
- `email` (pre-rellenado)

**Status Code:** 200 OK

---

### 5️⃣ **POST /alumnos/update** — Actualizar alumno

**Descripción:** Actualiza datos de alumno existente.

**Body:**
```json
{
  "id": 1,
  "nombre": "María López García",
  "email": "maria.lopez@ufv.es"
}
```

**Validaciones:**
- `id` debe existir
- `nombre` no puede estar vacío
- `email` no puede estar vacío

**Status Code:** 
- 200 OK (éxito)
- 400 Bad Request (validación)
- 404 Not Found (alumno no existe)

---

### 6️⃣ **GET /alumnos/borrar/:id** — Eliminar alumno

**Descripción:** Elimina alumno (con confirmación visual).

**Parámetro:**
- `id` (required)

**Respuesta:** Página con confirmación y botones [Confirmar] [Cancelar]

**Status Code:** 200 OK

---

### 7️⃣ **GET /alumnos/inscripciones** — Listar todas las inscripciones

**Descripción:** Retorna tabla HTML con todas las inscripciones (JOIN: alumnos + inscripciones + asignaturas).

**Respuesta HTML:**
```html
<table>
  <tr>
    <th>ID Inscripción</th>
    <th>Alumno</th>
    <th>Asignatura</th>
    <th>Fecha Inscripción</th>
    <th>Notas</th>
  </tr>
  <tr>
    <td>5</td>
    <td>Juan García</td>
    <td>Programación I</td>
    <td>2024-02-01 14:22:00</td>
    <td>Excelente desempeño</td>
  </tr>
</table>
```

**Status Code:** 200 OK

---

### 8️⃣ **GET /alumnos/:id/inscripciones** — Inscripciones de un alumno

**Descripción:** Lista todas las asignaturas en que está inscrito un alumno.

**Parámetro:**
- `id` (required) - ID del alumno

**Respuesta HTML:**
```html
<h2>Inscripciones de: Juan García (ID: 1)</h2>
<table>
  <tr>
    <th>Asignatura</th>
    <th>Fecha Inscripción</th>
    <th>Notas</th>
  </tr>
  <tr>
    <td>Programación I</td>
    <td>2024-02-01 14:22:00</td>
    <td>Buen aprovechamiento</td>
  </tr>
</table>
```

**Status Code:** 200 OK

---

### 9️⃣ **GET /** — Página de inicio

**Descripción:** Página de bienvenida con descripción del módulo.

**Respuesta:**
```html
<h1>Módulo de Gestión de Alumnos</h1>
<p>Sistema de administración de estudiantes y sus inscripciones.</p>
<ul>
  <li><a href="/alumnos">Ver alumnos</a></li>
  <li><a href="/alumnos/nuevo">Crear alumno</a></li>
  <li><a href="/alumnos/inscripciones">Ver inscripciones</a></li>
  <li><a href="/health">Health Check</a></li>
</ul>
```

**Status Code:** 200 OK

---

### 🔟 **GET /health** — Health Check

**Descripción:** Verifica que el servicio está operativo.

**Respuesta:**
```json
{"status": "ok"}
```

**Status Code:** 200 OK

---

## 🚀 Despliegue

### Arquitectura de Despliegue

```
Ansible Control Node (Tu PC)
    ↓
SSH → 10.1.1.10 (alumno.js)
SSH → 10.1.1.11 (alumno.js)
    ↓
systemd: ufvAlumnosService
    ↓
node alumno.js (puerto 3001)
```

### Primer Despliegue (Completo)

**Comando:**
```bash
cd c:\Users\pedri\Documents\Adsi_Alumno\ADSI_ALUMNOC

ansible-playbook ansible/playbooks/deploy_app.yml `
  -i ansible/inventory/hosts `
  -v
```

**Qué hace:**
1. Copia `alumno.js` a `/var/www/app/`
2. Instala dependencias npm (express, pg)
3. Crea systemd service `ufvAlumnosService`
4. Inicia el servicio

**Tiempo estimado:** 5-10 minutos

---

### Actualización Rápida (Solo código)

**Comando:**
```bash
ansible-playbook ansible/playbooks/update_web.yml `
  -i ansible/inventory/hosts `
  -v
```

**Qué hace:**
1. Copia `alumno.js` nuevo
2. Reinicia `ufvAlumnosService`
3. Verifica health check

**Tiempo estimado:** 1-2 minutos

---

## 🔧 Verificación Post-Despliegue

### Verificar servicio en la instancia

```bash
# Conectar
ssh -i ~/.ssh/aws_ufv.pem ec2-user@10.1.1.10

# Ver estado
systemctl status ufvAlumnosService

# Ver logs
journalctl -u ufvAlumnosService -f

# Test local
curl http://localhost:3001/health
```

### Verificar desde load balancer

```bash
# URL pública (desde tu navegador)
http://<load-balancer-ip>/alumnos

# O con curl
curl http://<load-balancer-ip>/alumnos
```

### Verificar conectividad BD

```bash
# Desde instancia UFV
psql -h 10.0.1.10 -U backend -d academico -c "SELECT COUNT(*) FROM alumnos;"
```

---

## 📁 Estructura de Archivos

```
ADSI_ALUMNOC/
├── ufv-app/
│   ├── node/
│   │   ├── alumno.js              ⭐ Backend Alumno C (Express)
│   │   ├── package.json           Dependencias
│   │   └── profesores.js          Backend Alumno D
│   ├── nginx/
│   │   ├── AlexUFV_nginx.conf     Config nginx (proxy /alumnos a 3001)
│   │   └── AlexPersonal_nginx.conf
│   └── public/
│       ├── index.html
│       ├── css/style.css
│       └── img/
│
├── ansible/
│   ├── playbooks/
│   │   ├── deploy_app.yml         ⭐ Despliegue inicial
│   │   └── update_web.yml         ⭐ Actualización rápida
│   └── inventory/
│       └── hosts                  ⭐ Inventario Ansible (creado PASO 6)
│
├── ALUMNO_C_README.md             ⭐ Esta documentación
└── README.md                      Docs generales proyecto
```

---

## 🐛 Troubleshooting

### Error: "Connection refused" (Puerto 3001)

**Causa:** El servicio no está corriendo.

**Solución:**
```bash
ssh ec2-user@10.1.1.10
sudo systemctl restart ufvAlumnosService
sudo systemctl status ufvAlumnosService
```

---

### Error: "could not connect to database"

**Causa:** No hay conectividad a PostgreSQL (10.0.1.10:5432).

**Solución:**
```bash
# Verificar routing VPC Peering
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-xxxxxxx" --output table

# Test telnet
telnet 10.0.1.10 5432

# Verificar credenciales en alumno.js
grep "host:" ufv-app/node/alumno.js
```

---

### Error: "email already exists"

**Causa:** El email ya está registrado.

**Solución:** Usar otro email o eliminar el registro anterior desde UI.

---

### Nginx no redirige /alumnos a 3001

**Causa:** Configuración nginx incorrecta.

**Solución:**
```bash
# Validar nginx
sudo nginx -t

# Recargar
sudo systemctl reload nginx

# Ver logs
sudo tail -50 /var/log/nginx/error.log
```

---

### El load balancer devuelve 502 Bad Gateway

**Causa:** Las instancias UFV no están respondiendo.

**Solución:**
1. Verificar que instancias están running: `aws ec2 describe-instances`
2. Verificar segurity groups: puertos 3001 abiertos entre VPCs
3. Verificar servicio: `systemctl status ufvAlumnosService`
4. Verificar logs: `journalctl -u ufvAlumnosService`

---

## 📊 Variables de Entorno

Se inyectan automáticamente vía systemd:

```ini
NODE_ENV=production
PORT=3001
DB_HOST=10.0.1.10
DB_USER=backend
DB_PASSWORD=ContraseñaSegura123
DB_NAME=academico
```

---

## 🔐 Seguridad

### Credenciales

- **DB User:** `backend` (solo lectura/escritura en `academico`)
- **SSH Keys:** en `~/.ssh/aws_ufv.pem`
- **Ansible User:** `ec2-user` (sudo sin contraseña)

### Security Groups

Configurado automáticamente por CloudFormation:
- ✅ VPC Peering: 10.1.0.0/16 → 10.0.0.0/16
- ✅ Nginx → backends 3001, 3002
- ✅ Control Node → todos los hosts

---

## 📞 Contacto y Soporte

**Responsable:** Alumno C  
**Módulo:** Gestión de Alumnos  
**Servicio:** ufvAlumnosService  
**Puerto:** 3001  
**Base de Datos:** academico (PostgreSQL)

**Pasos para debugging:**
1. `ansible all -i ansible/inventory/hosts -m ping`
2. `systemctl status ufvAlumnosService`
3. `journalctl -u ufvAlumnosService -n 100`
4. `curl http://localhost:3001/health`

---

## ✅ Checklist Despliegue

- [ ] SSH keys en `~/.ssh/aws*.pem`
- [ ] Inventario en `ansible/inventory/hosts`
- [ ] alumno.js actualizado
- [ ] package.json con scripts
- [ ] nginx.conf con proxy /alumnos → 3001
- [ ] deploy_app.yml lanzado
- [ ] ufvAlumnosService running
- [ ] Health check: `curl /health` → 200 OK
- [ ] Base de datos: conexión OK
- [ ] Nginx load balancer: redirecciones OK

---

**Documentación actualizada:** 23/04/2026  
**Versión:** 1.0  
**Estado:** ✅ PRODUCCIÓN
