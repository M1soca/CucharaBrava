document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    let usuario = document.getElementById("usuario").value;
    let password = document.getElementById("password").value;
    let mensaje = document.getElementById("mensaje");

    // Usuario de prueba
    let userCorrecto = "cucharita";
    let passCorrecto = "1234";

    if (usuario === userCorrecto && password === passCorrecto) {
        mensaje.style.color = "green";
        mensaje.textContent = "Login correcto";

        // Redirección futura
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } else {
        mensaje.style.color = "red";
        mensaje.textContent = "Usuario o contraseña incorrectos";
    }
});