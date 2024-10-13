
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        console.log("hola", data);
        localStorage.setItem('userId', data.user.id)
        window.location.href = 'todolist.html';
        
    } else {
        alert('Usuario no encontrado');
    }
});

document.getElementById('registerButton').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'registro.html';
});