document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('https://edgarrolon.github.io/2do_list/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        alert('Registro exitoso. Inicia sesión ahora.');
        window.location.href = 'index.html';
    } else {
        alert('Error al registrarse');
    }
});

document.getElementById('volverlogin').addEventListener('click', async (e) => {
    e.preventDefault();
    window.location.href = 'index.html';
});