const InputTarea = document.getElementById('taskName'); // Coincide con el id del input en el HTML
const btnadd = document.getElementById('taskForm'); // El form captura el submit
const ListaTareas = document.getElementById('ListaTareas');
const vacio = document.getElementById('vacio');

document.addEventListener("DOMContentLoaded", loadTasks);

document.getElementById('btn-back').addEventListener('click', async (e) => {
    e.preventDefault();
    window.location.href = 'index.html';
});


// Escuchar el submit del formulario
btnadd.addEventListener("submit", async (e) => {
    e.preventDefault();

    const Tarea = InputTarea.value;
    if (Tarea === '') {
        alert('Por favor ingrese una tarea, no puede estar vacío el campo');
        return;
    }

    const userId = localStorage.getItem('userId');

    const li = createTaskElement(Tarea);
    ListaTareas.appendChild(li);

    InputTarea.value = '';

    vacio.style.display = "none";

    // Guarda la tarea en el localStorage y en la base de datos
    await saveTaskToDatabase(Tarea, false); 
    saveTasksToLocalStorage();
});

function createTaskElement(taskText) {
    const li = document.createElement('li');
    li.textContent = taskText;

    li.appendChild(AddEditBtn(li));
    li.appendChild(AddDeleteBtn(li));  
    li.appendChild(AddCompleteBtn(li));

    return li;
}

async function loadTasks() {
    const userId =  localStorage.getItem('userId');    
    localStorage.removeItem('tasks');    
    const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId})
});
    console.log(response)
    const tasks = await response.json();
    console.log(tasks)    
    tasks.forEach(tarea => {
        localStorage.setItem(`tarea_${tarea.id}`, JSON.stringify(tarea));
    });

    ListaTareas.innerHTML = ''; // Limpiamos la lista

    tasks.forEach(task => {
        const li = createTaskElement(task.name);
        if (task.completed) {
            li.classList.add('completed');
        }
        ListaTareas.appendChild(li);
        
    });
}

async function saveTaskToDatabase(taskName, completed) {
    const response = await fetch('/api/addtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: taskName, completed: completed })
    });

    if (!response.ok) {
        console.error('Error al guardar la tarea en la base de datos');
    }
}

function AddDeleteBtn(li) {
    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Eliminar';
    btnDelete.className = "btn btn-outline-danger";

    btnDelete.addEventListener('click', async () => {
        const taskName = li.childNodes[0].nodeValue;
        await deleteTaskFromDatabase(taskName); // Eliminar de la base de datos
        ListaTareas.removeChild(li);

        if (ListaTareas.children.length === 0) {
            vacio.style.display = "block";
        }        
    });
    return btnDelete;
}

async function deleteTaskFromDatabase(taskName) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskName)}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        // Eliminar del localStorage
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const updatedTasks = tasks.filter(task => task.text !== taskName);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));

        console.log(`Tarea "${taskName}" eliminada exitosamente`);
    } else {
        console.error('Error al eliminar la tarea en la base de datos');
    }
}


function AddEditBtn(li) {
    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Editar';
    btnEdit.className = "btn btn-outline-secondary";

    btnEdit.addEventListener('click', () => {
        const tareaTexto = li.childNodes[0].nodeValue;

        const inputEdit = document.createElement('input');
        inputEdit.type = 'text';
        inputEdit.value = tareaTexto;

        li.textContent = '';
        li.appendChild(inputEdit);

        const btnGuardar = document.createElement('button');
        btnGuardar.textContent = 'Guardar';
        btnGuardar.className = "btn btn-outline-warning";

        btnGuardar.addEventListener('click', async () => {
            const nuevoTexto = inputEdit.value;
            if (nuevoTexto === '') {
                alert('La tarea no puede estar vacía');
                return;
            }
            li.textContent = nuevoTexto;
            li.appendChild(AddEditBtn(li));
            li.appendChild(AddDeleteBtn(li));  // Pasamos 'li' para poder eliminarla
            li.appendChild(AddCompleteBtn(li));

            await updateTaskInDatabase(tareaTexto, nuevoTexto, li.classList.contains('completed'));
            saveTasksToLocalStorage();
        });

        li.appendChild(btnGuardar);
    });

    return btnEdit;
}

async function updateTaskInDatabase(oldTaskName, newTaskName, completed) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(oldTaskName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTaskName, completed: completed, user_id:userId })
    });

    if (!response.ok) {
        console.error('Error al actualizar la tarea en la base de datos');
    }
}

function AddCompleteBtn(li) {
    const btnComplete = document.createElement('button');
    btnComplete.textContent = 'Completada';
    btnComplete.className = "btn btn-outline-success";
    
    btnComplete.addEventListener('click', async () => {
        li.classList.toggle('completed');

        const taskName = li.childNodes[0].nodeValue;

        // Actualiza el estado de completado en la base de datos
        await updateTaskInDatabase(taskName, taskName, li.classList.contains('completed'));

        // Actualiza el estado de completado en el localStorage
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(task => {
            if (task.text === taskName) {
                task.completed = li.classList.contains('completed');
            }
        });

        localStorage.setItem('tasks', JSON.stringify(tasks));
    });

    return btnComplete;
}



function saveTasksToLocalStorage() {
    const tasks = [];
    const taskElements = ListaTareas.getElementsByTagName('li');

    for (let task of taskElements) {
        tasks.push({
            text: task.childNodes[0].nodeValue,
            completed: task.classList.contains('completed')
        });
    }

    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasksFromLocalStorage() {
    const tasks = JSON.parse(localStorage.getItem('tasks'));

    if (tasks && tasks.length > 0) {
        tasks.forEach(task => {
            const li = createTaskElement(task.text);
            if (task.completed) {
                li.classList.add('completed');
            }
            ListaTareas.appendChild(li);
        });

        vacio.style.display = "none";
    } else {
        vacio.style.display = "block";
    }
}

/*const style = document.createElement('style');
style.innerHTML = 
`
    .completed {
        text-decoration: line-through;
        color: gray;
    }
`;
document.head.appendChild(style);*/