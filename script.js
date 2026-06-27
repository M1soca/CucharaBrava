// 1. Configura tus credenciales de Supabase
const SUPABASE_URL = 'https://lmlbrbepkwcpeeiffazm.supabase.co'; // Copia tu Project URL exacta
const SUPABASE_ANON_KEY = 'sb_publishable_NYqacCl9TRaTA5vV4TrY2g_juF4ARo0'; // Copia tu Publishable key completa

// 2. Inicializa el cliente global de Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ¡Listo! Ya puedes usar la variable 'supabase' en el resto de tu código.

let reservas = JSON.parse(localStorage.getItem("reservas")) || [];
let mesaSeleccionada = null;

// LOGIN
function login() {
    let u = document.getElementById("usuario").value;
    let p = document.getElementById("password").value;

    if (u === "cucharita" && p === "1") {
        document.getElementById("login").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        cargarMesas();
        cargarCarta();
        cargarReservas();
    } else {
        document.getElementById("mensaje").textContent = "Error de login";
    }
}

function logout() {
    location.reload();
}

// MESAS
function cargarMesas() {
    let cont = document.getElementById("mesas");
    cont.innerHTML = "";

    for (let i = 1; i <= 15; i++) {
        let div = document.createElement("div");
        div.classList.add("mesa");
        div.textContent = i;

        // verificar si está ocupada
        if (reservas.find(r => r.mesa == i)) {
            div.classList.add("ocupada");
        }

        div.onclick = () => {
            mesaSeleccionada = i;
            alert("Mesa seleccionada: " + i);
        };

        cont.appendChild(div);
    }
}

// CARTA
function cargarCarta() {
    let carta = [
        "Ceviche",
        "Lomo Saltado",
        "Arroz con Mariscos",
        "Parrilla",
        "Postres"
    ];

    let ul = document.getElementById("carta");
    ul.innerHTML = "";

    carta.forEach(p => {
        let li = document.createElement("li");
        li.textContent = p;
        ul.appendChild(li);
    });
}

// RESERVA
function crearReserva() {

    if (!mesaSeleccionada) {
        alert("Selecciona una mesa");
        return;
    }

    let nueva = {
        cliente: document.getElementById("cliente").value,
        servicio: document.getElementById("servicio").value,
        fecha: document.getElementById("fecha").value,
        piso: document.getElementById("piso").value,
        ubicacion: document.getElementById("ubicacion").value,
        evento: document.getElementById("evento").value,
        mesa: mesaSeleccionada
    };

    reservas.push(nueva);
    localStorage.setItem("reservas", JSON.stringify(reservas));

    mesaSeleccionada = null;

    cargarReservas();
    cargarMesas();
}

// LISTAR
function cargarReservas() {
    let ul = document.getElementById("lista");
    ul.innerHTML = "";

    reservas.forEach(r => {
        let li = document.createElement("li");
        li.textContent = `${r.cliente} - Mesa ${r.mesa} - ${r.servicio} - ${r.piso}`;
        ul.appendChild(li);
    });
}