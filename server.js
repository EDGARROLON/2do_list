const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const corsOptions = {
    origin: process.env.ORIGIN,
    credentials: true // Permite el envío de cookies de sesión
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Configuración de la base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'docs')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Asegura cookies en producción
}));

// Conexión a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos');
});

// Ruta para registrar usuarios
app.post('/api/registro', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserTableQuery = `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255),
            password VARCHAR(255)
        )`;

        db.query(createUserTableQuery, (err) => {
            if (err) return res.status(500).json({ message: 'Error al crear la tabla de usuarios' });

            db.query('INSERT INTO users SET ?', { username, password: hashedPassword }, (err) => {
                if (err) return res.status(500).json({ message: 'Error al registrar usuario' });
                res.json({ message: 'Usuario registrado con éxito' });
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error al registrar usuario' });
    }
});

// Ruta para iniciar sesión
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error interno del servidor' });

        if (results.length > 0) {
            const user = results[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) return res.status(500).json({ error: 'Error interno del servidor' });

                if (isMatch) {
                    req.session.userId = user.id;
                    res.status(200).json({ message: 'Login exitoso', user: user });
                } else {
                    res.status(400).json({ error: 'Contraseña incorrecta' });
                }
            });
        } else {
            res.status(400).json({ error: 'Usuario no encontrado' });
        }
    });
});

// Ruta para agregar tareas
app.post('/api/addtasks', (req, res) => {
    const task = req.body;
    const userId = req.session.userId;

    if (!userId) return res.status(401).send('Usuario no autenticado');

    const createTasksTableQuery = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_user INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            completed BOOLEAN DEFAULT false,
            FOREIGN KEY (id_user) REFERENCES users(id)
        )
    `;

    db.query(createTasksTableQuery, (err) => {
        if (err) return res.status(500).json({ message: 'Error al crear la tabla de tareas' });

        const sql = 'INSERT INTO tasks (id_user, name, completed) VALUES (?, ?, ?)';
        db.query(sql, [userId, task.name, task.completed], (err, result) => {
            if (err) return res.status(500).send('Error al guardar la tarea');
            res.send({ id: result.insertId });
        });
    });
});

// Ruta para obtener tareas del usuario autenticado
app.get('/api/tasks', (req, res) => {
    const userId = req.session.userId;

    if (!userId) return res.status(401).send('Usuario no autenticado');

    const sql = 'SELECT * FROM tasks WHERE id_user = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).send('Error al obtener tareas');
        res.send(results);
    });
});

// Ruta para editar una tarea
app.put('/api/tasks/:name', (req, res) => {
    const taskName = req.params.name;
    const { name, completed } = req.body;

    const sql = 'UPDATE tasks SET name = ?, completed = ? WHERE name = ?';
    db.query(sql, [name, completed, taskName], (err) => {
        if (err) return res.status(500).send('Error al actualizar tarea');
        res.send({ message: 'Tarea actualizada con éxito' });
    });
});

// Ruta para eliminar una tarea
app.delete('/api/tasks/:name', (req, res) => {
    const taskName = req.params.name;

    const sql = 'DELETE FROM tasks WHERE name = ?';
    db.query(sql, [taskName], (err) => {
        if (err) return res.status(500).send('Error al eliminar tarea');
        res.send({ message: 'Tarea eliminada con éxito' });
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
