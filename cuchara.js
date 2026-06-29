const SUPABASE_URL = 'https://lmlbrbepkwcpeeiffazm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NYqacCl9TRaTA5vV4TrY2g_juF4ARo0';

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let sessionUser = null;

function showNotification(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast-notif');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    if (!toast || !toastMsg || !toastIcon) return;

    toastMsg.textContent = mensaje;
    
    // Asignación de colores según diseño
    toast.style.backgroundColor = tipo === 'error' ? '#ff4d4d' : (tipo === 'success' ? '#4CAF50' : '#007bff');
    toastIcon.className = tipo === 'error' ? 'bi bi-x-circle' : (tipo === 'success' ? 'bi bi-check-circle' : 'bi bi-info-circle');

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function manejarInterfazUsuario(usuario) {
    const viewLogin = document.getElementById('view-login');
    const viewMain = document.getElementById('view-main');
    const profileName = document.getElementById('profile-name');
    const profileRole = document.getElementById('profile-role');
    const clientMenu = document.querySelector('.client-only-menu');
    const adminMenu = document.querySelector('.admin-only-menu');

    // Intercambiar pantallas principales
    if (viewLogin) viewLogin.classList.remove('active');
    if (viewMain) viewMain.classList.add('active');

    // Actualizar perfil del Sidebar
    if (profileName) profileName.textContent = usuario.username;
    if (profileRole) profileRole.textContent = usuario.rol;

    // Control estricto de visibilidad por Rol
    const esAdmin = usuario.rol.toLowerCase().includes('admin');
    if (clientMenu) clientMenu.style.display = esAdmin ? 'none' : 'block';
    if (adminMenu) adminMenu.style.display = esAdmin ? 'block' : 'none';
    
    showNotification(`Bienvenido, ${usuario.username}`, 'success');
}

// Evento de Login de cara a la base de datos
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();

    showNotification('Verificando credenciales...', 'info');

    try {
        const { data: usuario, error } = await client
            .from('usuarios')
            .select('*')
            .eq('username', user)
            .eq('password', pass)
            .single();

        if (error || !usuario) {
            showNotification('Usuario o contraseña incorrectos', 'error');
        } else {
            sessionUser = usuario;
            manejarInterfazUsuario(usuario);
        }
    } catch (err) {
        console.error(err);
        showNotification('Error de conexión con el servidor', 'error');
    }
});

// Evento de Cerrar Sesión del Sidebar
document.getElementById('btn-logout-sidebar').addEventListener('click', () => {
    sessionUser = null;
    location.reload(); // Recarga la página limpia devolviendo al usuario al Login
});

// ==========================================================================
// 5. VARIABLES DE ESTADO DEL WIZARD DE RESERVA
// ==========================================================================
let currentWizardStep = 1;
const MAX_STEPS = 5;

let reservaActual = {
    fecha: '',
    servicio: 'Almuerzo', // Por defecto
    plato: null,
    bebida: null,
    celular: '',
    personas: 2,
    ambiente: 'Salón General',
    horario: '',
    musica_vivo: 'No',
    mesa: null,
    total: 0
};

// ==========================================================================
// 6. CONTROL DE NAVEGACIÓN DEL WIZARD (PASO A PASO)
// ==========================================================================
function actualizarNodosVisuales() {
    for (let i = 1; i <= MAX_STEPS; i++) {
        const nodo = document.getElementById(`node-step${i}`);
        if (nodo) {
            if (i <= currentWizardStep) {
                nodo.classList.add('active');
            } else {
                nodo.classList.remove('active');
            }
        }
    }
}

async function navegarWizard(direccion) {
    const btnNext = document.getElementById('btn-wiz-next');

    // Si estamos en el paso 5 y presiona continuar, ejecuta el guardado final en la base de datos
    if (direccion === 1 && currentWizardStep === MAX_STEPS) {
        await guardarReservaFinal();
        return;
    }
    
    // ==========================================================================
    // VALIDACIONES ANTES DE CAMBIAR DE PASO (HACIA ADELANTE)
    // ==========================================================================
    if (direccion === 1) {
        if (currentWizardStep === 1) {
            const fechaInput = document.getElementById('booking-date');
            if (!fechaInput || !fechaInput.value) {
                showNotification('Por favor, selecciona una fecha válida antes de continuar.', 'error');
                return;
            }
            reservaActual.fecha = fechaInput.value;
        }
        
        if (currentWizardStep === 2) {
            if (!reservaActual.plato) {
                showNotification('Por favor, selecciona un plato antes de continuar.', 'error');
                return;
            }
            if (!reservaActual.bebida) {
                showNotification('Por favor, selecciona una bebida antes de continuar.', 'error');
                return;
            }
        }

        if (currentWizardStep === 3) {
            const phoneInput = document.getElementById('booking-phone');
            const guestsInput = document.getElementById('booking-guests');
            const envSelect = document.getElementById('booking-environment');
            const musicSelect = document.getElementById('booking-live-music');
            const timeSelect = document.getElementById('booking-time-select');

            const regexTelefono = /^\d{9}$/;
            if (!phoneInput || !regexTelefono.test(phoneInput.value.trim())) {
                showNotification('Por favor, ingresa un número de celular válido (exactamente 9 dígitos).', 'error');
                return;
            }

            if (!guestsInput || guestsInput.value < 1) {
                showNotification('El número de personas debe ser como mínimo 1.', 'error');
                return;
            }

            if (!timeSelect || !timeSelect.value) {
                showNotification('Por favor, selecciona un horario válido.', 'error');
                return;
            }

            reservaActual.celular = phoneInput.value.trim();
            reservaActual.personas = parseInt(guestsInput.value);
            reservaActual.ambiente = envSelect.value;
            reservaActual.musica_vivo = musicSelect.value;
            reservaActual.horario = timeSelect.value;

            let basePrecioPlato = reservaActual.plato?.precio || 0;
            let basePrecioBebida = reservaActual.bebida?.precio || 0;
            let adicionalAmbiente = reservaActual.ambiente === 'Zona Ventana' ? 5 : 0;
            let adicionalMusica = reservaActual.musica_vivo === 'Sí' ? 10 : 0;
            
            reservaActual.total = basePrecioPlato + basePrecioBebida + adicionalAmbiente + adicionalMusica;
        }

        if (currentWizardStep === 4) {
            if (!reservaActual.mesa) {
                showNotification('Por favor, selecciona una mesa disponible en el mapa antes de continuar.', 'error');
                return;
            }
        }
    }

    // ==========================================================================
    // CAMBIO DE INTERFAZ (TRANSICIÓN DE PANELES)
    // ==========================================================================
    const panelActual = document.getElementById(`step-panel${currentWizardStep}`);
    if (panelActual) panelActual.classList.remove('active');

    currentWizardStep += direccion;

    const nuevoPanel = document.getElementById(`step-panel${currentWizardStep}`);
    if (nuevoPanel) nuevoPanel.classList.add('active');

    actualizarNodosVisuales();

    // Cambiar dinámicamente el texto del botón en el paso final
    if (btnNext) {
        if (currentWizardStep === MAX_STEPS) {
            btnNext.textContent = 'Confirmar Reserva';
            btnNext.style.backgroundColor = '#4CAF50'; // Verde de confirmación
        } else {
            btnNext.textContent = 'Continuar';
            btnNext.style.backgroundColor = ''; // Restaura estilo original
        }
    }

    // ==========================================================================
    // EJECUCIÓN DE CARGAS AL ENTRAR A UN PASO
    // ==========================================================================
    try {
        if (currentWizardStep === 2) {
            await cargarCarta();
        }
        if (currentWizardStep === 3) {
            await cargarHorariosDisponibles();
        }
        if (currentWizardStep === 4) {
            await cargarMapaMesas();
        }
        if (currentWizardStep === MAX_STEPS) {
            renderizarBoleta();
        }
    } catch (error) {
        console.error("Error al transicionar de paso:", error);
    }
}

// ==========================================================================
// 7. LISTENERS DE LA NAVEGACIÓN GLOBAL
// ==========================================================================
document.getElementById('btn-wiz-next').addEventListener('click', () => navegarWizard(1));
document.getElementById('btn-wiz-prev').addEventListener('click', () => navegarWizard(-1));

// ==========================================================================
// 8. FUNCIONES DEL PASO 2: CARGAR CARTA DESDE SUPABASE
// ==========================================================================
async function cargarCarta() {
    if (!reservaActual.fecha) return;
    
    // 1. Calcular el día de la semana en español sin desfases
    const fechaAjustada = new Date(reservaActual.fecha + 'T00:00:00');
    let dia = fechaAjustada.toLocaleDateString('es-ES', { weekday: 'long' });
    dia = dia.charAt(0).toUpperCase() + dia.slice(1); // Ejemplo: "Lunes", "Martes"
    
    const dayLabel = document.getElementById('day-of-week-label');
    if (dayLabel) dayLabel.textContent = dia;

    // 2. Obtener el tipo de servicio seleccionado
    const mealSelect = document.getElementById('booking-meal-type');
    if (mealSelect) reservaActual.servicio = mealSelect.value;

    try {
        // 3. Consultar platos del servicio y las bebidas en paralelo
        const [resPlatos, resBebidas] = await Promise.all([
            client.from('platos').select('*').eq('day', dia).eq('category', reservaActual.servicio),
            client.from('platos').select('*').eq('day', dia).eq('category', 'Bebida')
        ]);

        // 4. Renderizar Platos
        const containerPlatos = document.getElementById('dishes-list-step');
        if (containerPlatos) {
            containerPlatos.innerHTML = resPlatos.data && resPlatos.data.length > 0 
                ? resPlatos.data.map(item => `
                    <button type="button" class="dish-card ${reservaActual.plato?.id === item.id ? 'selected' : ''}" 
                            onclick="seleccionarPlato(${item.id}, '${item.name}', ${item.price})">
                        ${item.name} - S/. ${item.price}
                    </button>`).join('')
                : '<p style="color:var(--text-muted);">No hay platos disponibles para este servicio hoy.</p>';
        }

        // 5. Renderizar Bebidas
        const containerBebidas = document.getElementById('drinks-list-step');
        if (containerBebidas) {
            containerBebidas.innerHTML = resBebidas.data && resBebidas.data.length > 0 
                ? resBebidas.data.map(item => `
                    <button type="button" class="dish-card ${reservaActual.bebida?.id === item.id ? 'selected' : ''}" 
                            onclick="seleccionarBebida(${item.id}, '${item.name}', ${item.price})">
                        ${item.name} - S/. ${item.price}
                    </button>`).join('')
                : '<p style="color:var(--text-muted);">No hay bebidas disponibles para hoy.</p>';
        }
    } catch (err) {
        console.error("Error al cargar la carta:", err);
        showNotification('Error al conectar con la base de datos de la carta.', 'error');
    }
}

// Funciones globales de selección
window.seleccionarPlato = function(id, nombre, precio) {
    reservaActual.plato = { id, nombre, precio };
    cargarCarta(); // Refresca clases visuales
    showNotification(`Plato seleccionado: ${nombre}`, 'success');
};

window.seleccionarBebida = function(id, nombre, precio) {
    reservaActual.bebida = { id, nombre, precio };
    cargarCarta(); // Refresca clases visuales
    showNotification(`Bebida seleccionada: ${nombre}`, 'success');
};

// Listener para cambio de servicio (Desayuno/Almuerzo/Cena)
document.getElementById('booking-meal-type').addEventListener('change', (e) => {
    reservaActual.servicio = e.target.value;
    reservaActual.plato = null; // Resetea plato para evitar mezclas incorrecas
    cargarCarta();
});

// ==========================================================================
// 10. FUNCIONES DEL PASO 3: HORARIOS DINÁMICOS Y CAPTURA DE DATOS
// ==========================================================================
async function cargarHorariosDisponibles() {
    const timeSelect = document.getElementById('booking-time-select');
    if (!timeSelect) return;

    try {
        // Consultar el rango de horas de la tabla 'local_hours' según el servicio elegido en el Paso 2
        const { data: rango, error } = await client
            .from('local_hours')
            .select('open_time, close_time')
            .eq('service_type', reservaActual.servicio)
            .single();

        if (error || !rango) {
            timeSelect.innerHTML = '<option value="">No hay horarios configurados</option>';
            return;
        }

        // Generar intervalos de 30 minutos
        let opcionesHtml = '';
        let [horaInicio, minInicio] = rango.open_time.split(':').map(Number);
        let [horaFin, minFin] = rango.close_time.split(':').map(Number);

        let tiempoActual = new Date();
        tiempoActual.setHours(horaInicio, minInicio, 0, 0);

        const tiempoLimite = new Date();
        tiempoLimite.setHours(horaFin, minFin, 0, 0);

        while (tiempoActual <= tiempoLimite) {
            let hh = tiempoActual.getHours().toString().padStart(2, '0');
            let mm = tiempoActual.getMinutes().toString().padStart(2, '0');
            let horaFormateada = `${hh}:${mm}`;

            opcionesHtml += `<option value="${horaFormateada}">${horaFormateada}</option>`;
            
            // Sumar 30 minutos
            tiempoActual.setMinutes(tiempoActual.getMinutes() + 30);
        }

        timeSelect.innerHTML = opcionesHtml;
        
        // Guardar por defecto la primera opción generada en nuestro estado global
        reservaActual.horario = timeSelect.value;

    } catch (err) {
        console.error("Error al generar los intervalos de tiempo:", err);
        showNotification('Error al cargar los horarios.', 'error');
    }
}

// Función global enlazada al onchange del select en tu HTML
window.actualizarReservaHorario = function() {
    const timeSelect = document.getElementById('booking-time-select');
    if (timeSelect) {
        reservaActual.horario = timeSelect.value;
    }
};

// ==========================================================================
// 11. FUNCIONES DEL PASO 4: MAPA DE MESAS INTERACTIVO (CINE-STYLE)
// ==========================================================================
async function cargarMapaMesas() {
    const gridContenedor = document.getElementById('cinema-seats-grid');
    if (!gridContenedor) return;

    try {
        // Consultar usando los nombres exactos de tus columnas en Supabase
        const { data: ordenesOcupadas, error } = await client
            .from('orders')
            .select('table_id')
            .eq('date', reservaActual.fecha)
            .eq('time', reservaActual.horario);

        if (error) throw error;

        // Crear un Set con los IDs mapeados correctamente
        const idsMesasOcupadas = new Set(ordenesOcupadas ? ordenesOcupadas.map(o => parseInt(o.table_id)) : []);

        let mesasHtml = '';
        const TOTAL_MESAS = 15;

        for (let i = 1; i <= TOTAL_MESAS; i++) {
            const estaOcupada = idsMesasOcupadas.has(i);
            const estaSeleccionada = reservaActual.mesa === i;

            let claseMesa = 'seat-element'; 
            let atributoDeshabilitado = '';

            if (estaOcupada) {
                claseMesa += ' occupied';
                atributoDeshabilitado = 'disabled';
            } else if (estaSeleccionada) {
                claseMesa += ' selected';
            }

            mesasHtml += `
                <button type="button" class="${claseMesa}" ${atributoDeshabilitado} onclick="seleccionarMesa(${i})">
                    <i class="bi bi-grid-1x2"></i>
                    <span>M<sup>${i}</sup></span>
                </button>
            `;
        }

        gridContenedor.innerHTML = mesasHtml;

    } catch (err) {
        console.error("Error al cargar el mapa de mesas:", err);
        showNotification('Error al verificar la disponibilidad de mesas.', 'error');
    }
}

// Función global para seleccionar una mesa disponible
window.seleccionarMesa = function(numeroMesa) {
    reservaActual.mesa = numeroMesa;
    cargarMapaMesas(); // Refresca los estados visuales en pantalla
    showNotification(`Mesa ${numeroMesa} seleccionada correctamente.`, 'success');
};

// ==========================================================================
// 12. FUNCIONES DEL PASO 5: RESUMEN DE BOLETA Y GUARDADO EN BD
// ==========================================================================
function renderizarBoleta() {
    const boxBoleta = document.getElementById('ticket-preview-box');
    if (!boxBoleta) return;

    // Estructura visual limpia y estilizada para la boleta
    boxBoleta.innerHTML = `
        <div class="boleta-detalle" style="padding: 15px; font-family: monospace; line-height: 1.6; color: #333;">
            <h3 style="text-align: center; margin-bottom: 15px; color: var(--primary);">LA CUCHARA BRAVA</h3>
            <p><strong>Cliente:</strong> ${sessionUser ? sessionUser.username : 'Invitado'}</p>
            <p><strong>Fecha:</strong> ${reservaActual.fecha}</p>
            <p><strong>Horario:</strong> ${reservaActual.horario} (${reservaActual.servicio})</p>
            <p><strong>Celular:</strong> ${reservaActual.celular}</p>
            <p><strong>Personas:</strong> ${reservaActual.personas}</p>
            <p><strong>Mesa Reservada:</strong> Mesa ${reservaActual.mesa}</p>
            <p><strong>Ambiente:</strong> ${reservaActual.ambiente}</p>
            <p><strong>Show en Vivo:</strong> ${reservaActual.musica_vivo}</p>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0;">
            <p><strong>Plato:</strong> ${reservaActual.plato?.nombre} - S/. ${reservaActual.plato?.precio.toFixed(2)}</p>
            <p><strong>Bebida:</strong> ${reservaActual.bebida?.nombre} - S/. ${reservaActual.bebida?.precio ? reservaActual.bebida.precio.toFixed(2) : '0.00'}</p>
            ${reservaActual.ambiente === 'Zona Ventana' ? '<p><strong>Adicional Ventana:</strong> S/. 5.00</p>' : ''}
            ${reservaActual.musica_vivo === 'Sí' ? '<p><strong>Adicional Show:</strong> S/. 10.00</p>' : ''}
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0;">
            <h2 style="text-align: right; color: #000; margin-top: 10px; font-size: 1.6rem;">
                TOTAL: S/. ${reservaActual.total.toFixed(2)}
            </h2>
        </div>
    `;
}

async function guardarReservaFinal() {
    showNotification('Procesando tu reserva...', 'info');

    try {
        // Mapeo exacto de las columnas en inglés de tu tabla 'orders'
        const { data, error } = await client
            .from('orders')
            .insert([
                {
                    client_name: sessionUser ? sessionUser.username : 'Cliente Anónimo',
                    phone: reservaActual.celular,
                    guests: reservaActual.personas,
                    date: reservaActual.fecha,
                    meal_type: reservaActual.servicio,
                    time: reservaActual.horario,
                    dish_name: reservaActual.plato?.nombre || 'Plato No Especificado',
                    table_id: reservaActual.mesa,
                    environment: reservaActual.ambiente,
                    live_music: reservaActual.musica_vivo,
                    total: reservaActual.total,
                    status: 'Pendiente'
                }
            ]);

        if (error) throw error;

        showNotification('¡Reserva confirmada y guardada con éxito!', 'success');
        
        // Esperamos un instante y recargamos para limpiar todo de forma segura
        setTimeout(() => {
            location.reload();
        }, 2000);

    } catch (err) {
        console.error("Error al insertar la orden en Supabase:", err);
        showNotification('No se pudo guardar la reserva en la base de datos.', 'error');
    }
}

// ==========================================================================
// 13. NAVEGACIÓN DE LA BARRA LATERAL (SIDEBAR) - OPTIMIZADO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {

    // Listener para el input de búsqueda por fecha en el panel Admin
    const inputFechaAdmin = document.getElementById('admin-search-date');
    if (inputFechaAdmin) {
        inputFechaAdmin.addEventListener('change', (e) => {
            cargarPedidosAdmin(e.target.value);
        });
    }

    // Captura de todos los botones con data-target
    const menuButtons = document.querySelectorAll('button[data-target]');
    
    menuButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetId = button.getAttribute('data-target');
            if (!targetId) return;

            console.log("Cambiando al panel:", targetId); 

            // 1. Alternar estado activo en los botones de la barra lateral
            menuButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 2. Apagar TODOS los paneles existentes usando un selector de clases genérico
            // Esto evita que los paneles se monten o queden superpuestos
            const todosLosPaneles = document.querySelectorAll('.panel-container, .step-panel, .panel-view');
            todosLosPaneles.forEach(panel => {
                panel.classList.remove('active');
            });

            // 3. Encender exclusivamente el panel objetivo del clic
            const activePanel = document.getElementById(targetId);
            if (activePanel) {
                activePanel.classList.add('active');
            } else {
                console.warn(`El contenedor con id "${targetId}" no existe en el HTML.`);
            }
            
            // 4. Disparadores asíncronos limpios basados en el panel seleccionado
            switch (targetId) {
                case 'panel-client-history':
                    await cargarHistorialReservas();
                    break;
                case 'panel-admin-dashboard':
                    await cargarMetricasDashboard();
                    break;
                case 'panel-admin-orders':
                    await cargarPedidosAdmin();
                    break;
                case 'panel-admin-menu-crud':
                    inicializarFiltrosCatalogo();
                    await cargarCartaAdmin();
                    break;
                default:
                case 'panel-admin-tables':
                    await cargarConfiguracionHorarios(); // Trae las horas guardadas por defecto
                    break;
                    // Por si haces clic en opciones que aún no tengan funciones asociadas
                    break;
            }
        });
    });
});

// ==========================================================================
// 14. LÓGICA DE CONSULTA Y RENDERIZADO DEL HISTORIAL DE RESERVAS
// ==========================================================================
async function cargarHistorialReservas() {
    // Usamos exactamente el ID de tu HTML: 'client-history-rows'
    const tablaCuerpo = document.getElementById('client-history-rows');
    if (!tablaCuerpo) return;

    // Mensaje temporal de carga
    tablaCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center;">Cargando tus consumos...</td></tr>`;

    try {
        // Consultamos a Supabase filtrando por el cliente actual
        const { data: historial, error } = await client
            .from('orders')
            .select('*')
            .eq('client_name', sessionUser ? sessionUser.username : '')
            .order('id', { ascending: false }); // Las más recientes primero

        if (error) throw error;

        if (!historial || historial.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">Aún no registras ninguna reserva.</td></tr>`;
            return;
        }

        // Construir dinámicamente las filas (tr) de la tabla
        let filasHtml = '';
        historial.forEach(orden => {
            // Evaluamos el estilo visual para el estado de la reserva
            let badgeStyle = 'background: #ffeeba; color: #856404;'; // Pendiente por defecto
            if (orden.status === 'Confirmado') badgeStyle = 'background: #d4edda; color: #155724;';
            if (orden.status === 'Cancelado') badgeStyle = 'background: #f8d7da; color: #721c24;';

            filasHtml += `
                <tr>
                    <td><strong>#${orden.id}</strong></td>
                    <td>${orden.date} <br><small style="color:gray;">${orden.time}</small></td>
                    <td>${orden.meal_type}</td>
                    <td>${orden.dish_name} <br><small style="color:gray;">Ambiente: ${orden.environment}</small></td>
                    <td>Mesa ${orden.table_id} <br><small style="color:gray;">${orden.guests} pers.</small></td>
                    <td><strong>S/. ${parseFloat(orden.total).toFixed(2)}</strong></td>
                    <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; display: inline-block; ${badgeStyle}">${orden.status}</span></td>
                </tr>
            `;
        });

        tablaCuerpo.innerHTML = filasHtml;

    } catch (err) {
        console.error("Error al traer el historial de Supabase:", err);
        tablaCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error al conectar con el servidor.</td></tr>`;
    }
}

// ==========================================================================
// 15. FUNCIONES DE ADMINISTRACIÓN: DASHBOARD & METRICAS (ADAPTADO)
// ==========================================================================
async function cargarMetricasDashboard() {
    try {
        // Traer todas las órdenes registradas en Supabase
        const { data: ordenes, error } = await client
            .from('orders')
            .select('total, status, date, table_id');

        if (error) throw error;

        let ingresosTotales = 0;
        let reservasConcretadas = 0;
        
        // Obtener la fecha de hoy en formato local YYYY-MM-DD para la ocupación de mesas
        const hoy = new Date().toISOString().split('T')[0];
        const mesasOcupadasHoy = new Set();
        const TOTAL_MESAS = 15;

        if (ordenes) {
            ordenes.forEach(orden => {
                // 1. Acumular ingresos de reservas que no estén canceladas
                if (orden.status !== 'Cancelado') {
                    ingresosTotales += parseFloat(orden.total || 0);
                }
                
                // 2. Conteo de reservas concretadas (Confirmadas / Exitosas)
                if (orden.status === 'Confirmado') {
                    reservasConcretadas++;
                }

                // 3. Evaluar si la mesa está apartada el día de hoy
                if (orden.date === hoy && orden.status !== 'Cancelado') {
                    mesasOcupadasHoy.add(orden.table_id);
                }
            });
        }

        // Calcular porcentaje de ocupación
        const porcentajeOcupacion = ((mesasOcupadasHoy.size / TOTAL_MESAS) * 100).toFixed(0);

        // Inyectar los valores exactamente en tus IDs de HTML
        document.getElementById('stat-total-income').textContent = `S/. ${ingresosTotales.toFixed(2)}`;
        document.getElementById('stat-total-reservations').textContent = reservasConcretadas;
        document.getElementById('stat-table-occupation').textContent = `${porcentajeOcupacion}%`;

    } catch (err) {
        console.error("Error al cargar el dashboard de administración:", err);
    }
}

// ==========================================================================
// 16. GESTIÓN DE PEDIDOS & RESERVAS (ADMINISTRADOR)
// ==========================================================================

// Carga principal de órdenes con soporte para filtros por fecha opcionales
async function cargarPedidosAdmin(fechaFiltro = '') {
    const tablaCuerpo = document.getElementById('admin-orders-rows');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="9" style="text-align:center;">Cargando pedidos de la base de datos...</td></tr>`;

    try {
        let query = client.from('orders').select('*');
        
        // Si hay una fecha seleccionada en el input, filtramos
        if (fechaFiltro) {
            query = query.eq('date', fechaFiltro);
        }

        // Ordenamos para ver primero las últimas ingresadas
        const { data: pedidos, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        if (!pedidos || pedidos.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted);">No se encontraron reservas registradas.</td></tr>`;
            return;
        }

        let filasHtml = '';
        pedidos.forEach(p => {
            // Estilos dinámicos para los badges de estado
            let badgeStyle = 'background: #ffeeba; color: #856404;'; 
            if (p.status === 'Confirmado') badgeStyle = 'background: #d4edda; color: #155724;';
            if (p.status === 'Cancelado') badgeStyle = 'background: #f8d7da; color: #721c24;';

            // Generar botones condicionales para las acciones según su estado actual
            let botonesAccion = '';
            if (p.status === 'Pendiente') {
                botonesAccion = `
                    <button onclick="cambiarEstadoPedido(${p.id}, 'Confirmado')" class="btn-primary" style="padding:4px 8px; font-size:0.8rem; background:#4CAF50; border:none; margin-right:5px; width:auto; display:inline-block;">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button onclick="cambiarEstadoPedido(${p.id}, 'Cancelado')" class="btn-primary" style="padding:4px 8px; font-size:0.8rem; background:#f44336; border:none; width:auto; display:inline-block;">
                        <i class="bi bi-x-lg"></i>
                    </button>
                `;
            } else {
                botonesAccion = `<small style="color:var(--text-muted);">Sin acciones</small>`;
            }

            filasHtml += `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td>${p.client_name} <br><small style="color:gray;">${p.phone || 'S/T'}</small></td>
                    <td>${p.date} <br><small style="color:gray;">${p.time}</small></td>
                    <td>${p.meal_type}</td>
                    <td>${p.dish_name}</td>
                    <td>Mesa ${p.table_id} <br><small style="color:gray;">${p.guests} pers. / ${p.environment}</small></td>
                    <td><strong>S/. ${parseFloat(p.total).toFixed(2)}</strong></td>
                    <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; display: inline-block; ${badgeStyle}">${p.status}</span></td>
                    <td style="white-space: nowrap;">${botonesAccion}</td>
                </tr>
            `;
        });

        tablaCuerpo.innerHTML = filasHtml;

    } catch (err) {
        console.error("Error al cargar pedidos del admin:", err);
        tablaCuerpo.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
    }
}

// Cambiar de estado (Confirmar o Cancelar) una reserva
window.cambiarEstadoPedido = async function(idPedido, nuevoEstado) {
    try {
        const { error } = await client
            .from('orders')
            .update({ status: nuevoEstado })
            .eq('id', idPedido);

        if (error) throw error;

        showNotification(`Pedido #${idPedido} actualizado a ${nuevoEstado}`, 'success');
        
        // Recargamos el listado respetando si ya había un filtro de fecha activo
        const filtroFecha = document.getElementById('admin-search-date').value;
        await cargarPedidosAdmin(filtroFecha);

    } catch (err) {
        console.error("Error al actualizar estado del pedido:", err);
        showNotification("No se pudo cambiar el estado del pedido.", "error");
    }
};

// Acción para el botón "Ver Todas"
window.clearAdminSearchDate = async function() {
    const inputFecha = document.getElementById('admin-search-date');
    if (inputFecha) inputFecha.value = ''; // Limpiamos el input visualmente
    await cargarPedidosAdmin(); // Cargamos todo el universo de datos
};

// ==========================================================================
// 17. GESTIÓN DE CARTA CRIOLLA SEMANAL (CRUD ADMIN - CON FILTROS ACTIVOS)
// ==========================================================================

async function cargarCartaAdmin() {
    const gridContenedor = document.getElementById('admin-dishes-grid');
    if (!gridContenedor) return;

    // Capturamos los valores seleccionados en los dropdowns de filtrado
    const selectDia = document.getElementById('admin-filter-day');
    const selectCat = document.getElementById('admin-filter-category');
    
    const filtroDia = selectDia ? selectDia.value : 'Todos';
    const filtroCat = selectCat ? selectCat.value : 'Todos';

    console.log(`Filtrando catálogo -> Día: ${filtroDia} | Categoría: ${filtroCat}`);
    gridContenedor.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Actualizando catálogo...</p>`;

    try {
        let query = client.from('platos').select('*');

        // Aplicamos condicionales de Supabase solo si el valor no es 'Todos'
        if (filtroDia !== 'Todos') {
            query = query.eq('day', filtroDia);
        }
        if (filtroCat !== 'Todos') {
            query = query.eq('category', filtroCat);
        }

        const { data: platos, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        if (!platos || platos.length === 0) {
            gridContenedor.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">No hay platos registrados para esta combinación.</p>`;
            return;
        }

        let htmlGrid = '';
        platos.forEach(p => {
            htmlGrid += `
                <div class="glass" style="display:flex; align-items:center; gap:15px; padding:15px; margin-bottom:12px; border-radius:8px;">
                    <div style="flex-grow:1;">
                        <h4 style="margin:0; font-size:1.1rem; color:#fff;">${p.name}</h4>
                        <small style="color:var(--text-muted);">${p.day} — <strong>${p.category}</strong></small>
                        <div style="color:var(--primary); font-weight:bold; font-size:1rem;">S/. ${parseFloat(p.price).toFixed(2)}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <button onclick="prepararEdicionPlato(${p.id}, '${p.name.replace(/'/g, "\\'")}', '${p.day}', '${p.category}', ${p.price})" class="btn-primary" style="padding:4px 8px; font-size:0.8rem; background:#2196F3; border:none; width:auto; display:inline-block;">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="eliminarPlatoAdmin(${p.id})" class="btn-primary" style="padding:4px 8px; font-size:0.8rem; background:#f44336; border:none; width:auto; display:inline-block;">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        gridContenedor.innerHTML = htmlGrid;

    } catch (err) {
        console.error("Error al renderizar el catálogo admin con filtros:", err);
        gridContenedor.innerHTML = `<p style="text-align:center; color:red;">Error de sincronización con la base de datos.</p>`;
    }
}

// Función auxiliar para inicializar y amarrar los eventos de los selectores en vivo
function inicializarFiltrosCatalogo() {
    const fDia = document.getElementById('admin-filter-day');
    const fCat = document.getElementById('admin-filter-category');

    if (fDia && !fDia.dataset.listenerAttached) {
        fDia.addEventListener('change', async () => {
            await cargarCartaAdmin();
        });
        fDia.dataset.listenerAttached = "true"; // Evita duplicar listeners
    }

    if (fCat && !fCat.dataset.listenerAttached) {
        fCat.addEventListener('change', async () => {
            await cargarCartaAdmin();
        });
        fCat.dataset.listenerAttached = "true";
    }
}

// Aseguramos que la función sea global adjuntándola a window
window.cancelarEdicionPlato = function() {
    // 1. Limpiamos el ID oculto para que el formulario vuelva a modo "Añadir"
    const idInput = document.getElementById('crud-dish-id');
    if (idInput) idInput.value = "";

    // 2. Reseteamos todos los inputs del formulario
    const formCrud = document.getElementById('form-crud-dish');
    if (formCrud) formCrud.reset();

    // 3. Restauramos los textos originales del diseño glass
    const formTitle = document.getElementById('crud-form-title');
    if (formTitle) formTitle.textContent = "Añadir Nuevo Plato";

    const btnSubmit = document.getElementById('btn-submit-crud');
    if (btnSubmit) btnSubmit.textContent = "Guardar en la Carta";

    // 4. Ocultamos el botón de cancelar edición
    const btnCancel = document.getElementById('btn-cancel-crud');
    if (btnCancel) btnCancel.style.display = "none";
};

// Función global para lanzar la confirmación con tu diseño premium
window.mostrarConfirmacionGlass = function(titulo, mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const btnAceptar = document.getElementById('btn-confirm-accept');
        const btnCancelar = document.getElementById('btn-confirm-cancel');
        
        document.getElementById('confirm-modal-title').textContent = titulo;
        document.getElementById('confirm-modal-message').textContent = mensaje;

        modal.style.display = 'flex';

        // Manejadores de clics
        const limpiarEventos = () => {
            btnAceptar.replaceWith(btnAceptar.cloneNode(true));
            btnCancelar.replaceWith(btnCancelar.cloneNode(true));
        };

        document.getElementById('btn-confirm-accept').addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(true);
        });

        document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(false);
        });
    });
};

window.eliminarPlatoAdmin = async function(idPlato) {
    // LLAMADA PREMIUM: Reemplaza el feo confirm() del navegador
    const seguro = await window.mostrarConfirmacionGlass(
        "¿Retirar de la carta?", 
        "¿Estás seguro de que deseas eliminar este plato de la carta semanal?"
    );
    
    if (!seguro) return; // Si le da a Cancelar, frena el flujo
    
    try {
        const { error } = await client.from('platos').delete().eq('id', idPlato);
        if (error) throw error;

        if (typeof showNotification === 'function') {
            showNotification("Plato removido con éxito.", "success");
        }
        await cargarCartaAdmin();
    } catch (err) {
        console.error("Error al borrar el plato:", err);
    }
};

// ==========================================================================
// 18. ESCUCHADOR PARA AÑADIR / EDITAR PLATOS EN LA CARTA
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const formCrud = document.getElementById('form-crud-dish');
    
    if (formCrud) {
        formCrud.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitamos que la página se recargue

            // 1. Capturamos los IDs y valores exactos de tu HTML
            const idPlato = document.getElementById('crud-dish-id').value;
            const nombrePlato = document.getElementById('crud-dish-name').value.trim();
            const diaSemana = document.getElementById('crud-dish-day').value;
            const categoriaServicio = document.getElementById('crud-dish-category').value;
            const precioPlato = parseFloat(document.getElementById('crud-dish-price').value);

            // 2. Construimos el objeto con las columnas exactas de tu tabla 'platos'
            const payload = {
                name: nombrePlato,
                day: diaSemana,
                category: categoriaServicio,
                price: precioPlato
            };

            try {
                if (idPlato) {
                    // MODO EDICIÓN: Si el input oculto tiene un ID, actualiza el registro
                    const { error } = await client
                        .from('platos')
                        .update(payload)
                        .eq('id', idPlato);

                    if (error) throw error;
                    if (typeof showNotification === 'function') showNotification("¡Plato actualizado con éxito!", "success");
                } else {
                    // MODO NUEVO: Si el input está vacío, añade una nueva fila
                    const { error } = await client
                        .from('platos')
                        .insert([payload]);

                    if (error) throw error;
                    if (typeof showNotification === 'function') showNotification("¡Nuevo plato agregado a la carta!", "success");
                }

                // 3. Limpiamos el formulario y refrescamos la lista de la derecha en tiempo real
                window.cancelarEdicionPlato();
                await cargarCartaAdmin();

            } catch (err) {
                console.error("Error al guardar en la tabla 'platos':", err);
                if (typeof showNotification === 'function') {
                    showNotification("Hubo un problema al guardar el plato.", "error");
                } else {
                    alert("Error al guardar en Supabase. Revisa la consola.");
                }
            }
        });
    }
});

// ==========================================================================
// 19. CONFIGURACIÓN DE HORARIOS & MESAS (OPCIÓN A: POR SERVICIO)
// ==========================================================================

// Carga las horas de un servicio específico desde la tabla 'local_hours'
async function cargarConfiguracionHorarios() {
    const selectServicio = document.getElementById('local-service-type');
    if (!selectServicio) return;

    const servicioSeleccionado = selectServicio.value; // 'Desayuno', 'Almuerzo' o 'Cena'

    try {
        const { data: config, error } = await client
            .from('local_hours')
            .select('*')
            .eq('service_type', servicioSeleccionado)
            .maybeSingle(); // Trae de forma segura la fila de ese servicio

        if (error) throw error;

        if (config) {
            document.getElementById('local-open-time').value = config.open_time || '';
            document.getElementById('local-close-time').value = config.close_time || '';
        } else {
            // Valores de respaldo si la fila no existiera por algún motivo
            document.getElementById('local-open-time').value = "08:00";
            document.getElementById('local-close-time').value = "12:00";
        }
    } catch (err) {
        console.error("Error al cargar horarios del servicio:", err);
    }
}

// Escuchadores de eventos para inicializar el comportamiento
document.addEventListener('DOMContentLoaded', () => {
    const formHours = document.getElementById('form-admin-hours');
    const selectServicio = document.getElementById('local-service-type');

    // 1. Cada vez que cambie el tipo de servicio en el select, recarga sus horas correspondientes en caliente
    if (selectServicio) {
        selectServicio.addEventListener('change', cargarConfiguracionHorarios);
    }

    // 2. Procesar la actualización en Supabase
    if (formHours) {
        formHours.addEventListener('submit', async (e) => {
            e.preventDefault();

            const servicio = document.getElementById('local-service-type').value;
            const horaApertura = document.getElementById('local-open-time').value;
            const horaCierre = document.getElementById('local-close-time').value;

            try {
                // Hacemos el update apuntando exactamente al tipo de servicio seleccionado
                const { error } = await client
                    .from('local_hours')
                    .update({ open_time: horaApertura, close_time: horaCierre })
                    .eq('service_type', servicio);

                if (error) throw error;

                if (typeof showNotification === 'function') {
                    showNotification(`Horario de ${servicio} actualizado con éxito.`, "success");
                } else {
                    alert(`Horario de ${servicio} actualizado.`);
                }

            } catch (err) {
                console.error("Error al actualizar el horario del servicio:", err);
                if (typeof showNotification === 'function') showNotification("No se pudo guardar el horario.", "error");
            }
        });
    }
});