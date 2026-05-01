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
        input, textarea, button, select { 
            padding: 10px; 
            margin: 8px 0;
            font-size: 14px;
        }
        input, textarea, select {
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
        <h1>📚 ${title}</h1>
        <div class="nav">
            <a href="/"> Inicio</a> | 
            <a href="/practicas"> Prácticas</a> | 
            <a href="/practicas/nueva"> Nueva Práctica</a> |
            <a href="/practicas/entregas"> Entregas</a>
        </div>
        <hr>
        ${content}
        <div class="footer">
            Panel de Prácticas - Nodo: ${process.env.HOSTNAME || 'Desconocido'} | ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
`;

// ========== RUTAS PRÁCTICAS ==========

// GET: Listar todas las prácticas
app.get('/practicas', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.id, p.titulo, a.nombre as asignatura, p.fecha_limite, p.descripcion
             FROM academico.practicas p
             JOIN academico.asignaturas a ON p.asignatura_id = a.id
             ORDER BY p.fecha_limite DESC`
        );
        let html = '<h2>Gestión de Prácticas</h2>';
        
        if (result.rows.length === 0) {
            html += '<p><em>No hay prácticas registradas</em></p>';
        } else {
            html += '<table><tr><th>ID</th><th>Título</th><th>Asignatura</th><th>Fecha Límite</th><th>Acciones</th></tr>';
            result.rows.forEach(r => {
                html += `<tr>
                    <td>${r.id}</td>
                    <td>${r.titulo}</td>
                    <td>${r.asignatura}</td>
                    <td>${new Date(r.fecha_limite).toLocaleDateString('es-ES')}</td>
                    <td>
                        <a href="/practicas/editar/${r.id}"> Editar</a> | 
                        <a href="/practicas/borrar/${r.id}" onclick="return confirm('¿Estás seguro?')"> Borrar</a> |
                        <a href="/practicas/${r.id}/entregas"> Entregas</a>
                    </td>
                </tr>`;
            });
            html += '</table>';
        }
        
        res.send(getBaseHTML("Gestión de Prácticas", html));
    } catch (err) { 
        console.error('Error en GET /practicas:', err);
        res.status(500).send(getBaseHTML("Error", `<div class="error"> Error: ${err.message}</div>`)); 
    }
});

// GET: Formulario nueva práctica
app.get('/practicas/nueva', async (req, res) => {
    try {
        const asignaturasResult = await pool.query('SELECT id, nombre FROM academico.asignaturas ORDER BY nombre');
        
        let options = '<option value="">-- Selecciona una asignatura --</option>';
        asignaturasResult.rows.forEach(row => {
            options += `<option value="${row.id}">${row.nombre}</option>`;
        });

        const form = `
            <h2>Crear Nueva Práctica</h2>
            <form action="/practicas" method="POST">
                <div class="form-group">
                    <label>Asignatura:</label>
                    <select name="asignatura_id" required>
                        ${options}
                    </select>
                </div>
                <div class="form-group">
                    <label>Título:</label>
                    <input type="text" name="titulo" placeholder="Ej: Práctica 1 - Bucles" required>
                </div>
                <div class="form-group">
                    <label>Descripción:</label>
                    <textarea name="descripcion" placeholder="Descripción de la práctica" rows="5"></textarea>
                </div>
                <div class="form-group">
                    <label>Fecha Límite:</label>
                    <input type="datetime-local" name="fecha_limite" required>
                </div>
                <button type="submit"> Guardar Práctica</button>
                <a href="/practicas">Cancelar</a>
            </form>`;
        res.send(getBaseHTML("Nueva Práctica", form));
    } catch (err) { 
        console.error('Error en GET /practicas/nueva:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// POST: Crear nueva práctica
app.post('/practicas', async (req, res) => {
    const { asignatura_id, titulo, descripcion, fecha_limite } = req.body;
    try {
        if (!asignatura_id || !titulo || !fecha_limite) {
            return res.status(400).send(getBaseHTML("Error", "<div class='error'> Asignatura, título y fecha son obligatorios</div>"));
        }
        await pool.query(
            'INSERT INTO academico.practicas(asignatura_id, titulo, descripcion, fecha_limite) VALUES($1, $2, $3, $4)',
            [asignatura_id, titulo, descripcion || null, fecha_limite]
        );
        res.redirect('/practicas');
    } catch (err) { 
        console.error('Error en POST /practicas:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Formulario editar práctica
app.get('/practicas/editar/:id', async (req, res) => {
    try {
        const practicaResult = await pool.query('SELECT * FROM academico.practicas WHERE id = $1', [req.params.id]);
        if (practicaResult.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Práctica no encontrada</div>"));
        
        const asignaturasResult = await pool.query('SELECT id, nombre FROM academico.asignaturas ORDER BY nombre');
        const p = practicaResult.rows[0];
        
        let options = '';
        asignaturasResult.rows.forEach(row => {
            const selected = row.id === p.asignatura_id ? 'selected' : '';
            options += `<option value="${row.id}" ${selected}>${row.nombre}</option>`;
        });

        const fechaStr = new Date(p.fecha_limite).toISOString().slice(0, 16);
        const form = `
            <h2>Editar Práctica</h2>
            <form action="/practicas/update" method="POST">
                <input type="hidden" name="id" value="${p.id}">
                <div class="form-group">
                    <label>Asignatura:</label>
                    <select name="asignatura_id" required>
                        ${options}
                    </select>
                </div>
                <div class="form-group">
                    <label>Título:</label>
                    <input type="text" name="titulo" value="${p.titulo}" required>
                </div>
                <div class="form-group">
                    <label>Descripción:</label>
                    <textarea name="descripcion" rows="5">${p.descripcion || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Fecha Límite:</label>
                    <input type="datetime-local" name="fecha_limite" value="${fechaStr}" required>
                </div>
                <button type="submit">Actualizar</button>
                <a href="/practicas">Cancelar</a>
            </form>`;
        res.send(getBaseHTML("Editar Práctica", form));
    } catch (err) { 
        console.error('Error en GET /practicas/editar/:id:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// POST: Actualizar práctica
app.post('/practicas/update', async (req, res) => {
    const { id, asignatura_id, titulo, descripcion, fecha_limite } = req.body;
    try {
        const result = await pool.query(
            'UPDATE academico.practicas SET asignatura_id=$1, titulo=$2, descripcion=$3, fecha_limite=$4 WHERE id=$5 RETURNING id',
            [asignatura_id, titulo, descripcion || null, fecha_limite, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send(getBaseHTML("Error", "<div class='error'> Práctica no encontrada</div>"));
        }
        res.redirect('/practicas');
    } catch (err) { 
        console.error('Error en POST /practicas/update:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Borrar práctica
app.get('/practicas/borrar/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM academico.practicas WHERE id = $1', [req.params.id]);
        res.redirect('/practicas');
    } catch (err) { 
        console.error('Error en GET /practicas/borrar/:id:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// ========== RUTAS ENTREGAS ==========

// GET: Listar todas las entregas
app.get('/practicas/entregas', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.id, e.calificacion, p.titulo as practica, a.nombre as alumno
             FROM academico.entregas e
             JOIN academico.practicas p ON e.practica_id = p.id
             JOIN academico.alumnos a ON e.alumno_id = a.id
             ORDER BY e.id DESC`
        );
        
        let html = '<h2>Entregas de Prácticas</h2>';
        
        if (result.rows.length === 0) {
            html += '<p><em>No hay entregas registradas</em></p>';
        } else {
            html += '<table><tr><th>ID</th><th>Alumno</th><th>Práctica</th><th>Calificación</th><th>Acciones</th></tr>';
            result.rows.forEach(r => {
                html += `<tr>
                    <td>${r.id}</td>
                    <td>${r.alumno}</td>
                    <td>${r.practica}</td>
                    <td>${r.calificacion || 'Pendiente'}</td>
                    <td>
                        <a href="/practicas/entregas/editar/${r.id}"> Editar</a> | 
                        <a href="/practicas/entregas/borrar/${r.id}" onclick="return confirm('¿Estás seguro?')"> Borrar</a>
                    </td>
                </tr>`;
            });
            html += '</table>';
        }
        
        res.send(getBaseHTML("Entregas", html));
    } catch (err) { 
        console.error('Error en GET /practicas/entregas:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Ver entregas de una práctica
app.get('/practicas/:id/entregas', async (req, res) => {
    try {
        const practicaResult = await pool.query('SELECT titulo FROM academico.practicas WHERE id = $1', [req.params.id]);
        if (practicaResult.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Práctica no encontrada</div>"));
        
        const entregasResult = await pool.query(
            `SELECT e.id, e.calificacion, e.comentario, a.nombre as alumno
             FROM academico.entregas e
             JOIN academico.alumnos a ON e.alumno_id = a.id
             WHERE e.practica_id = $1
             ORDER BY a.nombre`,
            [req.params.id]
        );
        
        let html = `<h2>Entregas de: ${practicaResult.rows[0].titulo}</h2>`;
        
        if (entregasResult.rows.length === 0) {
            html += '<p><em>No hay entregas para esta práctica</em></p>';
        } else {
            html += '<table><tr><th>Alumno</th><th>Calificación</th><th>Comentario</th><th>Acciones</th></tr>';
            entregasResult.rows.forEach(r => {
                html += `<tr>
                    <td>${r.alumno}</td>
                    <td>${r.calificacion || 'Pendiente'}</td>
                    <td>${r.comentario || '-'}</td>
                    <td>
                        <a href="/practicas/entregas/editar/${r.id}"> Editar</a>
                    </td>
                </tr>`;
            });
            html += '</table>';
        }
        
        html += `<br><a href="/practicas/${req.params.id}/entregas/nueva" class="btn"> Añadir Entrega</a>`;
        html += `<br><a href="/practicas">Volver a Prácticas</a>`;
        res.send(getBaseHTML("Entregas", html));
    } catch (err) { 
        console.error('Error en GET /practicas/:id/entregas:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Formulario nueva entrega
app.get('/practicas/:practica_id/entregas/nueva', async (req, res) => {
    try {
        const practicaResult = await pool.query('SELECT titulo FROM academico.practicas WHERE id = $1', [req.params.practica_id]);
        if (practicaResult.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Práctica no encontrada</div>"));
        
        const alumnosResult = await pool.query('SELECT id, nombre FROM academico.alumnos ORDER BY nombre');
        
        let options = '<option value="">-- Selecciona un alumno --</option>';
        alumnosResult.rows.forEach(row => {
            options += `<option value="${row.id}">${row.nombre}</option>`;
        });
        
        const form = `
            <h2>Registrar Entrega: ${practicaResult.rows[0].titulo}</h2>
            <form action="/practicas/entregas" method="POST">
                <input type="hidden" name="practica_id" value="${req.params.practica_id}">
                <div class="form-group">
                    <label>Alumno:</label>
                    <select name="alumno_id" required>
                        ${options}
                    </select>
                </div>
                <div class="form-group">
                    <label>Calificación (0-10):</label>
                    <input type="number" step="0.1" min="0" max="10" name="calificacion" placeholder="Ej: 8.5">
                </div>
                <div class="form-group">
                    <label>Comentario:</label>
                    <textarea name="comentario" rows="5" placeholder="Observaciones sobre la entrega"></textarea>
                </div>
                <button type="submit"> Registrar Entrega</button>
                <a href="/practicas/${req.params.practica_id}/entregas">Cancelar</a>
            </form>`;
        res.send(getBaseHTML("Nueva Entrega", form));
    } catch (err) { 
        console.error('Error en GET /practicas/:practica_id/entregas/nueva:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// POST: Crear entrega
app.post('/practicas/entregas', async (req, res) => {
    const { practica_id, alumno_id, calificacion, comentario } = req.body;
    try {
        if (!practica_id || !alumno_id) {
            return res.status(400).send(getBaseHTML("Error", "<div class='error'> Práctica y alumno son obligatorios</div>"));
        }
        
        // Verificar que no existe duplicada
        const checkResult = await pool.query(
            'SELECT id FROM academico.entregas WHERE practica_id = $1 AND alumno_id = $2',
            [practica_id, alumno_id]
        );
        if (checkResult.rows.length > 0) {
            return res.status(400).send(getBaseHTML("Error", "<div class='error'> Este alumno ya tiene una entrega registrada para esta práctica</div>"));
        }
        
        await pool.query(
            'INSERT INTO academico.entregas(practica_id, alumno_id, calificacion, comentario) VALUES($1, $2, $3, $4)',
            [practica_id, alumno_id, calificacion || null, comentario || null]
        );
        res.redirect(`/practicas/${practica_id}/entregas`);
    } catch (err) { 
        console.error('Error en POST /practicas/entregas:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Formulario editar entrega
app.get('/practicas/entregas/editar/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.id, e.calificacion, e.comentario, e.practica_id, e.alumno_id, 
                    p.titulo as practica, a.nombre as alumno
             FROM academico.entregas e
             JOIN academico.practicas p ON e.practica_id = p.id
             JOIN academico.alumnos a ON e.alumno_id = a.id
             WHERE e.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Entrega no encontrada</div>"));
        
        const r = result.rows[0];
        const form = `
            <h2>Editar Entrega</h2>
            <p><strong>Práctica:</strong> ${r.practica}</p>
            <p><strong>Alumno:</strong> ${r.alumno}</p>
            <form action="/practicas/entregas/update" method="POST">
                <input type="hidden" name="id" value="${r.id}">
                <input type="hidden" name="practica_id" value="${r.practica_id}">
                <div class="form-group">
                    <label>Calificación (0-10):</label>
                    <input type="number" step="0.1" min="0" max="10" name="calificacion" value="${r.calificacion || ''}" placeholder="Ej: 8.5">
                </div>
                <div class="form-group">
                    <label>Comentario:</label>
                    <textarea name="comentario" rows="5">${r.comentario || ''}</textarea>
                </div>
                <button type="submit">Actualizar Entrega</button>
                <a href="/practicas/entregas">Cancelar</a>
            </form>`;
        res.send(getBaseHTML("Editar Entrega", form));
    } catch (err) { 
        console.error('Error en GET /practicas/entregas/editar/:id:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// POST: Actualizar entrega
app.post('/practicas/entregas/update', async (req, res) => {
    const { id, calificacion, comentario, practica_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE academico.entregas SET calificacion=$1, comentario=$2 WHERE id=$3 RETURNING id',
            [calificacion || null, comentario || null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send(getBaseHTML("Error", "<div class='error'> Entrega no encontrada</div>"));
        }
        res.redirect(`/practicas/${practica_id}/entregas`);
    } catch (err) { 
        console.error('Error en POST /practicas/entregas/update:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// GET: Borrar entrega
app.get('/practicas/entregas/borrar/:id', async (req, res) => {
    try {
        const entregaResult = await pool.query('SELECT practica_id FROM academico.entregas WHERE id = $1', [req.params.id]);
        if (entregaResult.rows.length === 0) return res.status(404).send(getBaseHTML("Error", "<div class='error'> Entrega no encontrada</div>"));
        
        const practica_id = entregaResult.rows[0].practica_id;
        await pool.query('DELETE FROM academico.entregas WHERE id = $1', [req.params.id]);
        res.redirect(`/practicas/${practica_id}/entregas`);
    } catch (err) { 
        console.error('Error en GET /practicas/entregas/borrar/:id:', err);
        res.status(500).send(getBaseHTML("Error", `<div class='error'> Error: ${err.message}</div>`)); 
    }
});

// ========== RUTAS UTILIDAD ==========

// GET: Página de inicio
app.get('/', (req, res) => {
    const content = `
        <h2>Bienvenido al Panel de Prácticas</h2>
        <p>Este módulo es responsabilidad del <strong>Alumno C</strong></p>
        <p>Selecciona una opción del menú arriba para comenzar.</p>
        <h3>Funcionalidades disponibles:</h3>
        <ul>
            <li><strong> Prácticas:</strong> Ver, crear, editar y eliminar prácticas</li>
            <li><strong> Nueva Práctica:</strong> Registrar una nueva práctica</li>
            <li><strong> Entregas:</strong> Ver y gestionar entregas de alumnos</li>
        </ul>
        <h3>Información técnica:</h3>
        <ul>
            <li><strong>Módulo:</strong> Gestión de Prácticas - Alumno C</li>
            <li><strong>Location:</strong> /practicas</li>
            <li><strong>Puerto:</strong> 3001</li>
            <li><strong>Base de datos:</strong> academico (PostgreSQL)</li>
            <li><strong>Tablas:</strong> practicas, entregas, asignaturas, alumnos</li>
        </ul>`;
    res.send(getBaseHTML("Panel de Prácticas", content));
});

// GET: Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        module: 'practicas',
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
    console.log(`\n 📚 Servidor de Prácticas iniciado`);
    console.log(` Puerto: ${PORT}`);
    console.log(`  Base de datos: ${process.env.DB_HOST || '10.0.1.10'}`);
    console.log(` Usuario BD: ${process.env.DB_USER || 'backend'}`);
    console.log(` Base: ${process.env.DB_NAME || 'academico'}`);
    console.log(`\n Acceso: http://localhost:${PORT}/practicas\n`);
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
