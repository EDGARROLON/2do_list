const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

//cargar variables de entorno
require('dotenv').config();

// Configurar la conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:  process.env.DB_PORT

});

const app = express();
//usar puerto dsde .env o por defecto 3000
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'docs')));

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));



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
        // si la db no existe, la crea, sino inserta
        const query = `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username
        VARCHAR(255), password VARCHAR(255))`
        
        db.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error al crear la tabla de usuarios'
                    });
                }
                db.query('INSERT INTO users SET ?', { username, password: hashedPassword }, (err,
                    results) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Error al registrar usuario'
                            });
                        }
                        res.json({ message: 'Usuario registrado con éxito'
                        });
                    });
                });
            }
        catch{
            console.error(err);
            return res.status(500).json({ message: 'Error al registrar usuario'
            });
        }
    });                 


                

// Ruta para iniciar sesión
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    // Buscar el usuario en la base de datos
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];
            console.log(user);
            // Comparar la contraseña usando bcrypt
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('Error al comparar la contraseña:', err);
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }
                
                console.log(`Contraseña ingresada: ${user.password}`);
                console.log(`Contraseña almacenada (hash): ${user.password}`);
                console.log(`¿Las contraseñas coinciden?: ${isMatch}`);
            
                if (isMatch) {
                    req.session.userId = user.id; // Guardar el ID del usuario en la sesión
                    res.status(200).json({ message: 'Login exitoso', user:user });
                } else {
                    res.status(400).json({ error: 'Contraseña incorrecta' });
                }
            });
            
        } else {
            res.status(400).json({ error: 'Usuario no encontrado' });
        }
    });
});




// Ruta para agregar tareas (requiere autenticación)
app.post('/api/addtasks', (req, res) => {
    const task = req.body; 
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    //crea la tabla si no existe    
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_user INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT false,
        FOREIGN KEY (id_user) REFERENCES users(id)
    );
`;

// Primero, crear la tabla si no existe
db.query(createTableSQL, (err) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error al crear la tabla de tareas' });
    }
});

    const sql = 'INSERT INTO tasks (id_user, name, completed) VALUES (?, ?, ?)';
    db.query(sql, [userId, task.name, task.completed], (err, result) => {
        if (err) {
            console.error('Error al guardar la tarea:', err);
            res.status(500).send('Error al guardar la tarea');
        } else {
            res.send({ id: result.insertId });
        }
    });
});


// Ruta para obtener las tareas del usuario autenticado
app.post('/api/tasks', (req, res) => {
    console.log('adiso')
    const userId = req.body.user_id;
    console.log(userId);

    if (!userId) {
        return res.status(401).send('Usuario no autenticado');
    }

    const sql = 'SELECT * FROM tasks WHERE id_user = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener tareas:', err);
            res.status(500).send('Error al obtener tareas');
        } else {
            console.log('result', results)
            res.send(results);
        }
    });
});

// Ruta para editar una tarea
app.put('/api/tasks/:name', (req, res) => {
    const taskName = req.params.name;
    const { name, completed } = req.body;

    const sql = 'UPDATE tasks SET name = ?, completed = ? WHERE name = ?'; // Cambia 'id' por 'name'
    db.query(sql, [name, completed, taskName], (err, result) => {
        if (err) {
            console.error('Error al actualizar tarea:', err);
            res.status(500).send('Error al actualizar tarea');
        } else {
            res.send({ message: 'Tarea actualizada con éxito' });
        }
    });
});

// Ruta para eliminar una tarea
app.delete('/api/tasks/:name', (req, res) => {
    const taskName = req.params.name;

    const sql = 'DELETE FROM tasks WHERE name = ?';
    db.query(sql, [taskName], (err, result) => {
        if (err) {
            console.error('Error al eliminar tarea:', err);
            res.status(500).send('Error al eliminar tarea');
        } else {
            res.send({ message: 'Tarea eliminada con éxito' });
        }
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});