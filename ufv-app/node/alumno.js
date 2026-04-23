const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || '10.0.1.10',
    user: process.env.DB_USER || 'backend',
    password: process.env.DB_PASSWORD || 'ContraseñaSegura123',
    database: process.env.DB_NAME || 'academico',
    port: process.env.DB_PORT || 5432
});

const getBaseHTML = (title, content) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${title} - UFV</title>
    <link rel="stylesheet" href="/static/css/style.css">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
        }
        table { 
            border-collapse: collapse; 
            width: 100%;
            margin: 20px 0;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        th { 
            background-color: #4CAF50; 
            color: white;
            font-weight: bold;
        }
        tr:hover { 
            background-color: #f5f5f5; 
        }
        form { 
            margin: 20px 0; 
            padding: 15px; 
            background: #f9f9f9; 
            border-radius: 5px;
            border-left: 4px solid #4CAF50;
        }
        input, textarea, button { 
            padding: 10px; 
            margin: 8px 0;
            font-size: 14px;
        }
        input, textarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        button { 
            background-color: #4CAF50; 
            color: white; 
            border: none; 
            cursor: pointer;
            border-radius: 4px;
            width: auto;
            padding: 10px 20px;
        }
        button:hover { 
            background-color: #45a049; 
        }
        a { 
            margin: 0 5px; 
            text-decoration: none; 
            color: #0066cc;
            font-weight: bold;
        }
        a:hover { 
            text-decoration: underline; 
        }
        .nav {
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            text-align: center;
        }
        .error {
            background-color: #ffebee;
            color: #c62828;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .success {
            background-color: #e8f5e9;
            color: #2e7d32;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        label {
            display: block;
            margin-top: 10px;
            font-weight: bold;
            color: #333;
        }
        .form-group {
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1> ${title}</h1>
        <div class="nav">
            <a href="/"> Inicio</a> | 
            <a href="/alumnos"> Alumnos</a> | 
            <a href="/alumnos/nuevo"> Nuevo Alumno</a> |
            <a href="/alumnos/inscripciones"> Inscripciones</a>
        </div>
        <hr>
        ${content}
        <div class="footer">
            Panel de Alumnos - Nodo: ${process.env.HOSTNAME || 'Desconocido'} | ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
`;

// ========== RUTAS ALUMNOS ==========

// GET: Listar todos los alumnos
app.get('/alumnos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM academico.alumnos ORDER BY id');
        let html = '<h2>Lista de Alumnos</h2>';
        
        if (result.rows.length === 0) {
            html += '<p><em>No hay alumnos registrados</em></p>';
        } else {
            html += '<table><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Fecha Registro</th><th>Acciones</th></tr>';
            result.rows.forEach(r => {
                html += `<tr>
                    <td>${r.id}</td>
                    <td>${r.nombre}</td>
                    <td>${r.email}</td>
                    <td>${new Date(r.fecha_registro).toLocaleDateString('es-ES')}</td>
                    <td>
                        <a href="/alumnos/editar/${r.id}"> Editar</a> | 
                        <a href="/alumnos/borrar/${r.id}" onclick="return confirm('¿Estás seguro?')"> Borrar</a> |
                        <a href="/alumnos/${r.id}/inscripciones"> Inscripciones</a>
                    </td>
                </tr>`;
            });
            html += '</table>';
        }
        
        res.send(getBaseHTML("Gestión de Alumnos", html));
    } catch (err) { 
        console.error('Error en GET /alumnos:', err);
        res.status(500).send(getBaseHTML("Error", `<div class="error"> Error: ${err.message}</div>`)); 
    }
});

// GET: Formulario nuevo alumno
app.get('/alumnos/nuevo', (req, res) => {
    const form = `
        <h2>Registrar Nuevo Alumno</h2>
        <form action="/alumnos" method="POST">
            <div class="form-group">
                <label>Nombre:</label>
                <input type="text" name="nombre" placeholder="Ej: Juan Pérez" required>
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" placeholder="Ej: juan@ufv.es" required>
            </div>
            <button type="submit"> Guardar Alumno</button>
            <a href="/alumnos">Cancelar</a>
        </form>`;
    res.send(getBaseHTML("Nuevo Alumno", form));
});

// POST: Crear nuevo alumno
app.post('/alumnos', async (req, res) => {
    const { nombre, email } = req.body;
    try {
        if (!nombre || !email) {
            return res.status(400).send(getBaseHTML("Error", "<div class='error'> Nombre y email son obligatorios</div>"));
        }
        await pool.query(
            'INSERT INTO academico.alumnos(nombre, email, fecha_registro) VALUES($1, $2, NOW())',
            [nombre, email]
        );
        res.redirect('/alumnos');
    } catch (err) { 
        console.error('Error en POST /alumnos:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Formulario editar alumno
app.get('/alumnos/editar/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM academico.alumnos WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Alumno no encontrado</div>"));
        
        const r = result.rows[0];
        const form = `
            <h2>Editar Alumno</h2>
            <form action="/alumnos/update" method="POST">
                <input type="hidden" name="id" value="${r.id}">
                <div class="form-group">
                    <label>Nombre:</label>
                    <input type="text" name="nombre" value="${r.nombre}" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value="${r.email}" required>
                </div>
                <button type="submit">Actualizar</button>
                <a href="/alumnos">Cancelar</a>
            </form>`;
        res.send(getBaseHTML("Editar Alumno", form));
    } catch (err) { 
        console.error('Error en GET /alumnos/editar/:id:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// POST: Actualizar alumno
app.post('/alumnos/update', async (req, res) => {
    const { id, nombre, email } = req.body;
    try {
        const result = await pool.query(
            'UPDATE academico.alumnos SET nombre=$1, email=$2 WHERE id=$3 RETURNING id',
            [nombre, email, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send(getBaseHTML("Error", "<div class='error'> Alumno no encontrado</div>"));
        }
        res.redirect('/alumnos');
    } catch (err) { 
        console.error('Error en POST /alumnos/update:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Borrar alumno
app.get('/alumnos/borrar/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM academico.alumnos WHERE id = $1', [req.params.id]);
        res.redirect('/alumnos');
    } catch (err) { 
        console.error('Error en GET /alumnos/borrar/:id:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// ========== RUTAS INSCRIPCIONES ==========

// GET: Ver todas las inscripciones
app.get('/alumnos/inscripciones', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT i.id, i.nota, a.nombre as alumno, as2.nombre as asignatura
             FROM academico.inscripciones i
             JOIN academico.alumnos a ON i.alumno_id = a.id
             JOIN academico.asignaturas as2 ON i.asignatura_id = as2.id
             ORDER BY a.nombre, as2.nombre`
        );
        
        let html = '<h2>Inscripciones de Alumnos</h2>';
        
        if (result.rows.length === 0) {
            html += '<p><em>No hay inscripciones registradas</em></p>';
        } else {
            html += '<table><tr><th>Alumno</th><th>Asignatura</th><th>Nota</th></tr>';
            result.rows.forEach(r => {
                html += `<tr><td>${r.alumno}</td><td>${r.asignatura}</td><td>${r.nota || 'N/A'}</td></tr>`;
            });
            html += '</table>';
        }
        
        res.send(getBaseHTML("Inscripciones", html));
    } catch (err) { 
        console.error('Error en GET /alumnos/inscripciones:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Ver inscripciones de un alumno específico
app.get('/alumnos/:id/inscripciones', async (req, res) => {
    try {
        const alumnoResult = await pool.query('SELECT nombre FROM academico.alumnos WHERE id = $1', [req.params.id]);
        if (alumnoResult.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Alumno no encontrado</div>"));
        
        const inscResult = await pool.query(
            `SELECT i.id, i.nota, a.nombre as asignatura
             FROM academico.inscripciones i
             JOIN academico.asignaturas a ON i.asignatura_id = a.id
             WHERE i.alumno_id = $1
             ORDER BY a.nombre`,
            [req.params.id]
        );
        
        let html = `<h2>Inscripciones de ${alumnoResult.rows[0].nombre}</h2>`;
        
        if (inscResult.rows.length === 0) {
            html += '<p><em>Este alumno no está inscrito en ninguna asignatura</em></p>';
        } else {
            html += '<table><tr><th>Asignatura</th><th>Nota</th></tr>';
            inscResult.rows.forEach(r => {
                html += `<tr><td>${r.asignatura}</td><td>${r.nota || 'Pendiente'}</td></tr>`;
            });
            html += '</table>';
        }
        
        html += `<br><a href="/alumnos">Volver a Alumnos</a>`;
        res.send(getBaseHTML("Inscripciones", html));
    } catch (err) { 
        console.error('Error en GET /alumnos/:id/inscripciones:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// ========== RUTAS UTILIDAD ==========

// GET: Página de inicio
app.get('/', (req, res) => {
    const content = `
        <h2>Bienvenido al Panel de Alumnos</h2>
        <p>Este módulo es responsabilidad del <strong>Alumno C</strong></p>
        <p>Selecciona una opción del menú arriba para comenzar.</p>
        <h3>Funcionalidades disponibles:</h3>
        <ul>
            <li><strong> Alumnos:</strong> Ver, crear, editar y eliminar registros de alumnos</li>
            <li><strong> Nuevo Alumno:</strong> Registrar un nuevo alumno en el sistema</li>
            <li><strong> Inscripciones:</strong> Consultar inscripciones de alumnos a asignaturas</li>
        </ul>
        <h3>Información técnica:</h3>
        <ul>
            <li><strong>Location:</strong> /alumnos</li>
            <li><strong>Puerto:</strong> 3001</li>
            <li><strong>Base de datos:</strong> academico (PostgreSQL)</li>
            <li><strong>Tablas:</strong> alumnos, inscripciones, asignaturas</li>
        </ul>`;
    res.send(getBaseHTML("Panel de Alumnos", content));
});

// GET: Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        module: 'alumnos',
        timestamp: new Date().toISOString(),
        hostname: process.env.HOSTNAME || 'unknown'
    });
});

// Error 404
app.use((req, res) => {
    res.status(404).send(getBaseHTML("404 - No Encontrado", "<div class='error'> La página que buscas no existe</div>"));
});

// ========== SERVIDOR ==========

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n Servidor Alumnos iniciado`);
    console.log(` Puerto: ${PORT}`);
    console.log(`  Base de datos: ${process.env.DB_HOST || '10.0.1.10'}`);
    console.log(` Usuario BD: ${process.env.DB_USER || 'backend'}`);
    console.log(` Base: ${process.env.DB_NAME || 'academico'}`);
    console.log(`\n Acceso: http://localhost:${PORT}/alumnos\n`);
});

// ========== MANEJO DE ERRORES ==========

// Error en conexión a la BD
pool.on('error', (err) => {
    console.error(' Error en pool de conexión a PostgreSQL:', err);
});

// Cierre limpio
process.on('SIGTERM', async () => {
    console.log('\n  Cerrando servidor...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n Cerrando servidor...');
    await pool.end();
    process.exit(0);
});