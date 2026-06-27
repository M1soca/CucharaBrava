// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://lmlbrbepkwcpeeiffazm.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_NYqacCl9TRaTA5vV4TrY2g_juF4ARo0'; 

// CAMBIO CLAVE: Cambiamos el nombre de la variable a "supabaseClient"
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Arreglo global dinámico
let reservas = [];
let mesaSeleccionada = null;

// ==========================================
// LOGIN REAL CON SUPABASE
// ==========================================
async function login() {
    let u = document.getElementById("usuario").value;
    let p = document.getElementById("password").value;

    // Usamos supabaseClient
    const { data: usuarioEncontrado, error } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .maybeSingle(); 

    if (error || !usuarioEncontrado) {
        document.getElementById("mensaje").textContent = "Error de login: Usuario o contraseña incorrectos";
        console.log("Intento de login fallido: Credenciales inválidas.");
        return;
    }

    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    await cargarReservas(); 
    cargarMesas();          
    cargarCarta();
}

function logout() {
    location.reload();
}

// ==========================================
// MESAS 
// ==========================================
function cargarMesas() {
    let cont = document.getElementById("mesas");
    cont.innerHTML = "";

    for (let i = 1; i <= 15; i++) {
        let div = document.createElement("div");
        div.classList.add("mesa");
        div.textContent = i;

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

// ==========================================
// CARTA 
// ==========================================
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

// ==========================================
// CREAR RESERVA (INSERTAR EN SUPABASE)
// ==========================================
async function crearReserva() {
    if (!mesaSeleccionada) {
        alert("Selecciona una mesa");
        return;
    }

    let nuevaReserva = {
        cliente: document.getElementById("cliente").value,
        servicio: document.getElementById("servicio").value,
        fecha: document.getElementById("fecha").value,
        piso: document.getElementById("piso").value,
        ubicacion: document.getElementById("ubicacion").value,
        evento: document.getElementById("evento").value,
        mesa: mesaSeleccionada
    };

    // Usamos supabaseClient
    const { error } = await supabaseClient
        .from('reservas')
        .insert([nuevaReserva]);

    if (error) {
        console.error("Error al guardar la reserva:", error.message);
        alert("No se pudo guardar la reserva en la base de datos.");
        return;
    }

    alert("¡Reserva guardada con éxito!");
    mesaSeleccionada = null;

    await cargarReservas();
    cargarMesas();
}

// ==========================================
// LISTAR RESERVAS (LEER DESDE SUPABASE)
// ==========================================
async function cargarReservas() {
    let ul = document.getElementById("lista");
    ul.innerHTML = "";

    // Usamos supabaseClient
    const { data, error } = await supabaseClient
        .from('reservas')
        .select('*');

    if (error) {
        console.error("Error al traer reservas:", error.message);
        return;
    }

    reservas = data || [];

    reservas.forEach(r => {
        let li = document.createElement("li");
        li.textContent = `${r.cliente} - Mesa ${r.mesa} - ${r.servicio} - ${r.piso}`;
        ul.appendChild(li);
    });
}