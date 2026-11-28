import { calcularPuntajeServicio, calcularTiempoTrabajo, encontrarRutaCalles, fechaActualBogota } from "./arcade-engine.js";
import { crearBucleRender, renderizarClasificacion, renderizarVidas } from "./arcade-renderer.js";
import { instalarControlesArcade, instalarControlesMapa } from "./arcade-controls.js";

// El Caos del Barrio: datos locales; el backend solo recibe puntajes autenticados.
const ANCHO_MUNDO = 1000;
const ALTO_MUNDO = 620;
const CLAVE_PROGRESO_ARCADE = "serviapp-caos-barrio-v1";
const EJES_CALLE_X = [45, 227, 409, 591, 773, 955];
const EJES_CALLE_Y = [38, 174, 310, 446, 582];
const DURACION_TURNO = 180;
const API_ARCADE = "http://127.0.0.1:8000/api/usuarios/arcade/";
const CLAVE_CRT_ARCADE = "serviapp-caos-crt-v1";

const SERVICIOS = [
    { id: "plomeria", nombre: "Plomería", corto: "Fuga de agua", sello: "AGUA", trabajo: 8, recompensa: 54, color: "#36a9ca" },
    { id: "electricidad", nombre: "Electricidad", corto: "Falla eléctrica", sello: "LUZ", trabajo: 9, recompensa: 65, color: "#e3a632" },
    { id: "carpinteria", nombre: "Carpintería", corto: "Mueble dañado", sello: "MUEBLE", trabajo: 10, recompensa: 72, color: "#b7784c" },
    { id: "mantenimiento", nombre: "Mantenimiento", corto: "Reparación", sello: "ARREGLO", trabajo: 7, recompensa: 49, color: "#6786a1" },
    { id: "pintura", nombre: "Pintura", corto: "Fachada por pintar", sello: "PINTURA", trabajo: 10, recompensa: 70, color: "#a878d1" },
    { id: "mensajeria", nombre: "Mensajería", corto: "Paquete urgente", sello: "ENVÍO", trabajo: 6, recompensa: 44, color: "#42a779" },
];

const CUADRILLA_BASE = [
    { id: "lina", nombre: "Lina", oficio: "Plomera", especialidad: "plomeria", color: "#25a9a4", velocidad: 61, trabajo: 8, tono: "#d99d75", herramienta: "P" },
    { id: "mateo", nombre: "Mateo", oficio: "Electricista", especialidad: "electricidad", color: "#e3a83d", velocidad: 57, trabajo: 9, tono: "#9d6848", herramienta: "E" },
    { id: "sofia", nombre: "Sofía", oficio: "Carpintera", especialidad: "carpinteria", color: "#9a6b4d", velocidad: 53, trabajo: 10, tono: "#edc09b", herramienta: "C" },
    { id: "nico", nombre: "Nico", oficio: "Mantenimiento", especialidad: "mantenimiento", color: "#577dad", velocidad: 67, trabajo: 7, tono: "#bd7f59", herramienta: "M" },
];

const ESPECIALISTAS_EXTRA = {
    pintora: { id: "mar", nombre: "Mar", oficio: "Pintora", especialidad: "pintura", color: "#a36cc6", velocidad: 59, trabajo: 9, tono: "#e5ae8c", herramienta: "P" },
    mensajero: { id: "dani", nombre: "Dani", oficio: "Mensajero", especialidad: "mensajeria", color: "#42956e", velocidad: 73, trabajo: 6, tono: "#a86f4e", herramienta: "↗" },
};

const REFERENCIAS_LOCALES = ["Casa Robles", "Tienda La Esquina", "Edificio Aurora", "Café Central", "Casa Amarilla", "Taller del Parque", "Panadería Sol", "Edificio Arrayán", "Casa del Puente", "Mercado Vecino", "Peluquería Luna", "Casa Verde", "Bazar de Ana", "Edificio Nogal", "Restaurante El Patio", "Casa Mora", "Lavandería Rápida", "Papelería Colores", "Edificio San Luis", "Taller El Tornillo"];

const ui = {
    welcome: document.getElementById("welcomeScreen"),
    prepare: document.getElementById("prepareScreen"),
    game: document.getElementById("gameScreen"),
    overlay: document.getElementById("arcadeOverlay"),
    overlayCard: document.getElementById("overlayCard"),
    canvas: document.getElementById("cityCanvas"),
    ctx: document.getElementById("cityCanvas").getContext("2d"),
    toast: document.getElementById("toast"),
    requests: document.getElementById("requestsList"),
    workers: document.getElementById("gameWorkers"),
    prepWorkers: document.getElementById("prepWorkers"),
};

function cargarProgreso() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_PROGRESO_ARCADE) || "{}");
        return {
            monedas: Math.max(0, Number(guardado.monedas) || 0),
            xp: Math.max(0, Number(guardado.xp) || 0),
            record: Math.max(0, Number(guardado.record) || 0),
            retosDiarios: guardado.retosDiarios && typeof guardado.retosDiarios === "object" ? guardado.retosDiarios : {},
            mejoras: { velocidad: 0, herramientas: 0, pintora: false, mensajero: false, ...(guardado.mejoras || {}) },
        };
    } catch (_error) {
        return { monedas: 0, xp: 0, record: 0, retosDiarios: {}, mejoras: { velocidad: 0, herramientas: 0, pintora: false, mensajero: false } };
    }
}

let progreso = cargarProgreso();
let partida = null;
let preparacionSeleccionada = "lina";
let buclePartida = null;
let ultimaActualizacionPanel = 0;
let temporizadorToast = 0;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
let escalaCanvas = 1;
const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let retoDiarioPendiente = false;
let sonidoActivo = false;
let indiceAvisoTeclado = 0;
let contextoSonido = null;

const EDIFICIOS = crearBarrio();

function crearBarrio() {
    const clases = ["casa", "tienda", "apartamentos", "cafe", "casa", "taller", "mercado", "apartamentos", "parque", "tienda", "cafe", "casa", "tienda", "apartamentos", "cafe", "casa", "taller", "tienda", "apartamentos", "casa"];
    return clases.map((clase, indice) => {
        const fila = Math.floor(indice / 5);
        const columna = indice % 5;
        return {
            id: indice,
            fila,
            columna,
            clase,
            nombre: REFERENCIAS_LOCALES[indice],
            x: (EJES_CALLE_X[columna] + EJES_CALLE_X[columna + 1]) / 2,
            y: (EJES_CALLE_Y[fila] + EJES_CALLE_Y[fila + 1]) / 2,
            w: clase === "apartamentos" ? 104 : 90,
            h: clase === "apartamentos" ? 73 : 66,
            approach: { fila, columna },
            paleta: indice % 4,
        };
    });
}

function equipoDisponible() {
    const equipo = CUADRILLA_BASE.map((persona) => ({ ...persona }));
    if (progreso.mejoras.pintora) equipo.push({ ...ESPECIALISTAS_EXTRA.pintora });
    if (progreso.mejoras.mensajero) equipo.push({ ...ESPECIALISTAS_EXTRA.mensajero });
    return equipo;
}

function crearNodo(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

function guardarProgreso() {
    try {
        localStorage.setItem(CLAVE_PROGRESO_ARCADE, JSON.stringify(progreso));
    } catch (_error) {
        mostrarToast("No se pudo guardar el progreso en este navegador.");
    }
    actualizarPantallaInicio();
}

function nivelDelEquipo() { return Math.floor(progreso.xp / 250) + 1; }
function formatoMoneda(valor) { return Math.round(valor).toLocaleString("es-CO"); }

function avatarTrabajador(persona, compacto = false) {
    const avatar = crearNodo("span", "worker-avatar" + (compacto ? " avatar-compact" : ""));
    avatar.style.setProperty("--worker", persona.color);
    avatar.append(
        crearNodo("i", "avatar-head"),
        crearNodo("i", "avatar-body"),
        crearNodo("i", "avatar-cap"),
    );
    const herramienta = crearNodo("b", "avatar-tool", persona.herramienta);
    avatar.appendChild(herramienta);
    return avatar;
}

function actualizarPantallaInicio() {
    document.getElementById("recordValue").textContent = formatoMoneda(progreso.record);
    document.getElementById("walletValue").textContent = formatoMoneda(progreso.monedas);
    document.getElementById("teamLevelValue").textContent = String(nivelDelEquipo());
    renderizarTienda();
}

function renderizarTienda() {
    const contenedor = document.getElementById("upgradeShop");
    contenedor.replaceChildren();
    const articulos = [
        { id: "velocidad", icono: "↗", nombre: "¡Más velocidad!", detalle: `Acelera toda la cuadrilla · nivel ${progreso.mejoras.velocidad}/3`, precio: 90 + progreso.mejoras.velocidad * 75, max: progreso.mejoras.velocidad >= 3, compra: () => { progreso.mejoras.velocidad += 1; } },
        { id: "herramientas", icono: "⚙", nombre: "Kit de herramientas", detalle: `Reduce el tiempo de trabajo · nivel ${progreso.mejoras.herramientas}/3`, precio: 100 + progreso.mejoras.herramientas * 80, max: progreso.mejoras.herramientas >= 3, compra: () => { progreso.mejoras.herramientas += 1; } },
        { id: "pintora", icono: "✦", nombre: progreso.mejoras.pintora ? "Mar ya es del equipo" : "Desbloquea a Mar", detalle: progreso.mejoras.pintora ? "Pintora especialista disponible" : "Nueva especialista en pintura", precio: 220, max: progreso.mejoras.pintora, compra: () => { progreso.mejoras.pintora = true; } },
        { id: "mensajero", icono: "→", nombre: progreso.mejoras.mensajero ? "Dani ya es del equipo" : "Desbloquea a Dani", detalle: progreso.mejoras.mensajero ? "Mensajero especialista disponible" : "Nuevo especialista en entregas", precio: 250, max: progreso.mejoras.mensajero, compra: () => { progreso.mejoras.mensajero = true; } },
    ];
    articulos.forEach((articulo) => {
        const tarjeta = crearNodo("article", "upgrade-card");
        const top = crearNodo("div", "upgrade-card-top");
        top.append(crearNodo("span", "upgrade-symbol", articulo.icono), crearNodo("small", "upgrade-level", articulo.max ? "LISTO" : `${articulo.precio} ◈`));
        tarjeta.append(top, crearNodo("h3", "", articulo.nombre), crearNodo("p", "", articulo.detalle));
        const comprar = crearNodo("button", "upgrade-buy", articulo.max ? "Conseguido" : `Comprar · ${articulo.precio} ◈`);
        comprar.type = "button";
        comprar.disabled = articulo.max || progreso.monedas < articulo.precio;
        comprar.addEventListener("click", () => {
            if (comprar.disabled) return;
            progreso.monedas -= articulo.precio;
            articulo.compra();
            guardarProgreso();
            mostrarToast("¡Mejora lista para el próximo turno!");
        });
        tarjeta.appendChild(comprar);
        contenedor.appendChild(tarjeta);
    });
}

function mostrarToast(texto) {
    ui.toast.textContent = texto;
    ui.toast.classList.add("visible");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => ui.toast.classList.remove("visible"), 2400);
}

function fechaLocalReto() {
    return fechaActualBogota();
}

function actualizarRetoDiario() {
    const fecha = fechaLocalReto();
    document.getElementById("dailyDateLabel").textContent = fecha;
    const guardado = progreso.retosDiarios?.[fecha];
    document.getElementById("dailyChallengeStatus").textContent = guardado?.completado
        ? `¡Reto superado! Récord de hoy: ${guardado.mejor} puntos. Se renueva mañana.`
        : "Completa 8 servicios en un turno para ganar +150 monedas y 100 XP.";
}

async function cargarClasificacion() {
    const modo = document.getElementById("leaderboardMode").value;
    try {
        const respuesta = await fetch(`${API_ARCADE}clasificacion/?modo=${encodeURIComponent(modo)}`);
        if (!respuesta.ok) throw new Error("El servidor no devolvió la clasificación.");
        const datos = await respuesta.json();
        renderizarClasificacion(datos.clasificacion || []);
    } catch (_error) {
        renderizarClasificacion([], "Inicia el servidor Django para cargar la clasificación.");
    }
}

async function enviarPuntuacion(mostrarToastAlGuardar = false) {
    let acceso;
    let refresco;
    try {
        acceso = sessionStorage.getItem("serviappAccessToken");
        refresco = sessionStorage.getItem("serviappRefreshToken");
    } catch (_error) { acceso = null; }
    const estado = document.getElementById("scoreSubmitStatus");
    if (!acceso) {
        if (estado) estado.textContent = "Inicia sesión en ServiApp para guardar tu puntaje en la clasificación.";
        return;
    }
    const payload = {
        puntuacion: partida.puntuacion,
        servicios_completados: partida.completados,
        duracion_segundos: Math.max(1, Math.min(DURACION_TURNO, Math.ceil(DURACION_TURNO - partida.restante))),
        modo: partida.retoDiario ? "diario" : "normal",
    };
    const enviar = (token) => fetch(`${API_ARCADE}puntuaciones/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    try {
        let respuesta = await enviar(acceso);
        if (respuesta.status === 401 && refresco) {
            const respuestaRefresh = await fetch("http://127.0.0.1:8000/api/usuarios/token/refresh/", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh: refresco }),
            });
            if (respuestaRefresh.ok) {
                const tokens = await respuestaRefresh.json();
                sessionStorage.setItem("serviappAccessToken", tokens.access);
                respuesta = await enviar(tokens.access);
            }
        }
        if (!respuesta.ok) throw new Error("El servidor rechazó el puntaje.");
        if (estado) estado.textContent = "Puntaje guardado en la clasificación semanal.";
        if (mostrarToastAlGuardar) mostrarToast("Puntaje enviado a la clasificación.");
        cargarClasificacion();
    } catch (_error) {
        if (estado) estado.textContent = "No se pudo enviar el puntaje; tu récord local sigue guardado.";
    }
}

function tonoArcade(tipo = "ok") {
    if (!sonidoActivo) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        contextoSonido ||= new AudioContextClass();
        if (contextoSonido.state === "suspended") contextoSonido.resume();
        const oscilador = contextoSonido.createOscillator();
        const volumen = contextoSonido.createGain();
        const ahora = contextoSonido.currentTime;
        const tonos = { select: [520, 760], assign: [310, 560], complete: [660, 990], expire: [270, 140], coin: [820, 1180], level: [540, 1080], gameover: [360, 120] }[tipo] || [440, 660];
        oscilador.type = "square";
        oscilador.frequency.setValueAtTime(tonos[0], ahora);
        oscilador.frequency.exponentialRampToValueAtTime(tonos[1], ahora + .1);
        volumen.gain.setValueAtTime(.035, ahora);
        volumen.gain.exponentialRampToValueAtTime(.001, ahora + .13);
        oscilador.connect(volumen).connect(contextoSonido.destination);
        oscilador.start(ahora);
        oscilador.stop(ahora + .14);
    } catch (_error) { /* Sonido opcional: el juego funciona sin Web Audio. */ }
}

function mostrarPantalla(nombre) {
    ui.welcome.hidden = nombre !== "welcome";
    ui.prepare.hidden = nombre !== "prepare";
    ui.game.hidden = nombre !== "game";
    if (nombre === "game") {
        ajustarCanvas();
        buclePartida?.iniciar();
    } else if (nombre === "welcome" || nombre === "prepare") {
        if (partida?.activa) partida.activa = false;
        cancelarCicloPartida();
    }
}

function cancelarCicloPartida() {
    buclePartida?.detener();
}

function hacerAvatarCanvas(ctx, x, y, persona, tiempo, seleccionado, estado) {
    const paso = movimientoReducido ? 0 : estado === "traveling" ? Math.sin(tiempo * 13 + x) * 2.6 : estado === "working" ? Math.sin(tiempo * 17 + y) * 1.3 : Math.sin(tiempo * 2 + x) * .7;
    ctx.save();
    ctx.translate(x, y + paso);
    ctx.scale(1.42, 1.42);
    ctx.fillStyle = "#1c2b3880";
    ctx.beginPath(); ctx.ellipse(0, 11, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (seleccionado) {
        const pulso = movimientoReducido ? 1 : 1 + Math.sin(tiempo * 5) * .08;
        ctx.globalAlpha = .28; ctx.fillStyle = "#ffe16a"; ctx.beginPath(); ctx.ellipse(0, 4, 24 * pulso, 19 * pulso, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ffe16a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 8, 20 * pulso, 10 * pulso, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#f6d45c"; ctx.beginPath(); ctx.arc(0, -31, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "#23394e"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-5 + paso * .4, 10); ctx.moveTo(4, 5); ctx.lineTo(5 - paso * .4, 10); ctx.stroke();
    ctx.fillStyle = persona.color; ctx.beginPath(); ctx.roundRect(-9, -10, 18, 19, 6); ctx.fill();
    ctx.strokeStyle = persona.color; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-12, 2 + paso * .3); ctx.moveTo(8, -3); ctx.lineTo(11, 1 - paso * .3); ctx.stroke();
    ctx.fillStyle = persona.tono; ctx.beginPath(); ctx.arc(0, -17, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#263549"; ctx.beginPath(); ctx.arc(0, -21, 8, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f1c656"; ctx.fillRect(-9, -22, 18, 2.5);
    ctx.fillStyle = "#243a52"; ctx.beginPath(); ctx.arc(-2.5, -17, 1, 0, Math.PI * 2); ctx.arc(2.5, -17, 1, 0, Math.PI * 2); ctx.fill();
    if (estado === "working") {
        const pulse = Math.sin(tiempo * 15) * 2;
        ctx.strokeStyle = "#fff1a6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(11, -7); ctx.lineTo(14 + pulse, -12); ctx.lineTo(18, -8); ctx.stroke();
    }
    ctx.restore();
}

function crearEquipoPartida() {
    return equipoDisponible().map((persona, indice) => ({
        ...persona,
        x: EJES_CALLE_X[[0, 5, 0, 5, 2, 3][indice]],
        y: EJES_CALLE_Y[[0, 0, 4, 4, 2, 1][indice]],
        estado: "idle",
        jobId: null,
        ruta: [],
        puntoRuta: 0,
        tiempoTrabajo: 0,
        tiempoTrabajoTotal: 0,
    }));
}

function abrirPreparacion() {
    renderizarPreparacion();
    mostrarPantalla("prepare");
}

function renderizarPreparacion() {
    ui.prepWorkers.replaceChildren();
    const equipo = equipoDisponible();
    if (!equipo.some((persona) => persona.id === preparacionSeleccionada)) preparacionSeleccionada = equipo[0].id;
    equipo.forEach((persona) => {
        const card = crearNodo("button", "worker-card" + (persona.id === preparacionSeleccionada ? " selected" : ""));
        card.type = "button";
        card.appendChild(avatarTrabajador(persona));
        const datos = crearNodo("span", "worker-card-data");
        datos.append(crearNodo("strong", "worker-card-name", persona.nombre), crearNodo("span", "worker-card-role", persona.oficio), crearNodo("small", "worker-card-stat", `Vel. ${persona.velocidad} · Trabajo ${persona.trabajo}s`));
        card.appendChild(datos);
        card.addEventListener("click", () => { preparacionSeleccionada = persona.id; renderizarPreparacion(); });
        ui.prepWorkers.appendChild(card);
    });
    const seleccionado = equipo.find((persona) => persona.id === preparacionSeleccionada);
    const velocidad = Math.round(seleccionado.velocidad * (1 + progreso.mejoras.velocidad * .08));
    const herramienta = Math.max(3, seleccionado.trabajo * (1 - progreso.mejoras.herramientas * .08));
    document.getElementById("workerPreview").replaceChildren(
        crearNodo("strong", "", `${seleccionado.nombre} · ${seleccionado.oficio}`),
        crearNodo("span", "", `Velocidad ${velocidad}`),
        crearNodo("span", "", `Trabajo base ${herramienta.toFixed(1)} s`),
        crearNodo("span", "", `Especialidad: ${nombreServicio(seleccionado.especialidad)}`),
    );
}

function nombreServicio(id) { return SERVICIOS.find((servicio) => servicio.id === id)?.nombre || "Apoyo"; }

function iniciarTurno() {
    partida = {
        activa: true, pausada: false, finalizada: false,
        transcurrido: 0, restante: DURACION_TURNO,
        puntuacion: 0, monedas: 0, reputacion: 100, vidas: 5,
        nivel: 1, particulas: [], temblorRestante: 0,
        retoDiario: retoDiarioPendiente, objetivoDiario: 8,
        completados: 0, vencidos: 0, combo: 0, mejorCombo: 0,
        ultimaCompletada: -99, bonusAgradecimiento: 0,
        equipo: crearEquipoPartida(), avisos: [], siguienteAviso: 7,
        siguienteEvento: 29 + Math.random() * 8, evento: null,
        ultimoPanel: 0, ultimoAvisoId: 0, lluvia: false,
        seleccionTrabajador: null, seleccionAviso: null,
    };
    retoDiarioPendiente = false;
    mostrarPantalla("game");
    agregarAviso();
    agregarAviso();
    renderizarPaneles();
    actualizarHUD();
}

function agregarAviso(servicioForzado = null) {
    if (!partida || partida.finalizada) return null;
    const pendientes = partida.avisos.filter((aviso) => aviso.estado !== "done");
    const dificultadMaxima = Math.min(5, 1 + Math.floor(partida.transcurrido / 36));
    const limite = 3 + Math.floor(partida.transcurrido / 56);
    if (pendientes.length >= limite) return null;
    const ocupados = new Set(pendientes.map((aviso) => aviso.edificioId));
    const disponibles = EDIFICIOS.filter((edificio) => edificio.clase !== "parque" && !ocupados.has(edificio.id));
    if (!disponibles.length) return null;
    const edificio = disponibles[Math.floor(Math.random() * disponibles.length)];
    const serviciosDisponibles = SERVICIOS.filter((servicio) => {
        if (servicio.id === "pintura") return progreso.mejoras.pintora;
        if (servicio.id === "mensajeria") return progreso.mejoras.mensajero;
        return true;
    });
    const servicio = servicioForzado || serviciosDisponibles[Math.floor(Math.random() * serviciosDisponibles.length)];
    const dificultad = 1 + Math.floor(Math.random() * dificultadMaxima);
    const aviso = {
        id: ++partida.ultimoAvisoId,
        servicio,
        edificioId: edificio.id,
        estado: "pending",
        trabajadorId: null,
        dificultad,
        tiempo: Math.max(28, 55 - dificultad * 4 - Math.floor(partida.transcurrido / 35)),
        tiempoInicial: 0,
        recompensa: Math.round(servicio.recompensa * (.82 + dificultad * .17)),
        progresoTrabajo: 0,
    };
    aviso.tiempoInicial = aviso.tiempo;
    partida.avisos.push(aviso);
    renderizarPaneles();
    return aviso;
}

function indiceMasCercano(eje, valor) {
    let mejor = 0;
    for (let indice = 1; indice < eje.length; indice += 1) if (Math.abs(eje[indice] - valor) < Math.abs(eje[mejor] - valor)) mejor = indice;
    return mejor;
}

function asignarAviso(trabajador, aviso) {
    if (!trabajador || !aviso || trabajador.estado !== "idle" || aviso.estado !== "pending") return false;
    const edificio = EDIFICIOS[aviso.edificioId];
    const inicio = { columna: indiceMasCercano(EJES_CALLE_X, trabajador.x), fila: indiceMasCercano(EJES_CALLE_Y, trabajador.y) };
    const nodos = encontrarRutaCalles(inicio, edificio.approach, EJES_CALLE_X.length, EJES_CALLE_Y.length);
    trabajador.ruta = nodos.slice(1).map((nodo) => ({ x: EJES_CALLE_X[nodo.columna], y: EJES_CALLE_Y[nodo.fila] }));
    if (!trabajador.ruta.length) trabajador.ruta = [{ x: trabajador.x, y: trabajador.y }];
    trabajador.puntoRuta = 0;
    trabajador.estado = "traveling";
    trabajador.jobId = aviso.id;
    aviso.estado = "assigned";
    aviso.trabajadorId = trabajador.id;
    aviso.destino = { x: EJES_CALLE_X[edificio.approach.columna], y: EJES_CALLE_Y[edificio.approach.fila] };
    tonoArcade("assign");
    partida.seleccionTrabajador = null;
    partida.seleccionAviso = null;
    document.getElementById("selectionStatus").textContent = `${trabajador.nombre} va hacia ${edificio.nombre}.`;
    renderizarPaneles();
    return true;
}

function seleccionarTrabajador(id) {
    const trabajador = partida?.equipo.find((persona) => persona.id === id);
    if (!trabajador || trabajador.estado !== "idle") {
        if (trabajador) mostrarToast(`${trabajador.nombre} está ocupado; no puede aceptar otro aviso todavía.`);
        return;
    }
    partida.seleccionTrabajador = id;
    tonoArcade("select");
    const aviso = partida.avisos.find((item) => item.id === partida.seleccionAviso && item.estado === "pending");
    if (aviso) { asignarAviso(trabajador, aviso); return; }
    document.getElementById("selectionStatus").textContent = `${trabajador.nombre} seleccionado. Ahora elige un aviso.`;
    renderizarPaneles();
}

function seleccionarAviso(id) {
    const aviso = partida?.avisos.find((item) => item.id === id && item.estado === "pending");
    if (!aviso) return;
    partida.seleccionAviso = id;
    tonoArcade("select");
    const trabajador = partida.equipo.find((persona) => persona.id === partida.seleccionTrabajador);
    if (trabajador) { asignarAviso(trabajador, aviso); return; }
    document.getElementById("selectionStatus").textContent = `${aviso.servicio.corto} seleccionado. Elige un trabajador libre.`;
    renderizarPaneles();
}

function animarDesplazamiento(trabajador, delta) {
    if (trabajador.estado !== "traveling") return;
    const evento = partida.evento;
    let velocidad = trabajador.velocidad * (1 + progreso.mejoras.velocidad * .08);
    if (evento?.id === "rush") velocidad *= .72;
    if (evento?.id === "rain") velocidad *= .84;
    let distanciaDisponible = velocidad * delta;
    while (distanciaDisponible > 0 && trabajador.puntoRuta < trabajador.ruta.length) {
        const destino = trabajador.ruta[trabajador.puntoRuta];
        const dx = destino.x - trabajador.x;
        const dy = destino.y - trabajador.y;
        const distancia = Math.hypot(dx, dy);
        if (distancia <= distanciaDisponible || distancia < .1) {
            trabajador.x = destino.x;
            trabajador.y = destino.y;
            distanciaDisponible -= distancia;
            trabajador.puntoRuta += 1;
        } else {
            trabajador.x += (dx / distancia) * distanciaDisponible;
            trabajador.y += (dy / distancia) * distanciaDisponible;
            distanciaDisponible = 0;
        }
    }
    if (trabajador.puntoRuta >= trabajador.ruta.length) {
        trabajador.estado = "working";
        const aviso = partida.avisos.find((item) => item.id === trabajador.jobId);
        if (!aviso) { trabajador.estado = "idle"; trabajador.jobId = null; return; }
        aviso.estado = "working";
        const coincide = trabajador.especialidad === aviso.servicio.id;
        trabajador.tiempoTrabajoTotal = calcularTiempoTrabajo({
            base: trabajador.trabajo,
            especialista: coincide,
            mejoraHerramientas: progreso.mejoras.herramientas,
            dificultad: aviso.dificultad,
        });
        trabajador.tiempoTrabajo = trabajador.tiempoTrabajoTotal;
        aviso.tiempoTrabajoTotal = trabajador.tiempoTrabajoTotal;
        document.getElementById("selectionStatus").textContent = `${trabajador.nombre} está trabajando en ${EDIFICIOS[aviso.edificioId].nombre}.`;
        renderizarPaneles();
    }
}

function completarAviso(trabajador, aviso) {
    const coincide = trabajador.especialidad === aviso.servicio.id;
    const comboAnterior = partida.combo;
    const rapidez = Math.max(0, Math.round(aviso.tiempo * 2.1));
    let monedas = Math.round(aviso.recompensa * (coincide ? 1.2 : .9) + Math.min(30, rapidez / 2));
    if (partida.evento?.id === "market") monedas = Math.round(monedas * 1.15);
    monedas += partida.bonusAgradecimiento;
    partida.bonusAgradecimiento = 0;
    if (partida.transcurrido - partida.ultimaCompletada <= 18) partida.combo += 1;
    else partida.combo = 1;
    const puntos = calcularPuntajeServicio({
        tiempoDisponible: aviso.tiempo,
        dificultad: aviso.dificultad,
        combo: comboAnterior,
        especialista: coincide,
    });
    partida.ultimaCompletada = partida.transcurrido;
    partida.mejorCombo = Math.max(partida.mejorCombo, partida.combo);
    partida.completados += 1;
    tonoArcade("complete");
    partida.puntuacion += puntos;
    partida.monedas += monedas;
    crearParticulas(EDIFICIOS[aviso.edificioId].x, EDIFICIOS[aviso.edificioId].y - 32, aviso.servicio.color);
    animarPuntaje();
    aviso.estado = "done";
    aviso.completadoHasta = partida.transcurrido + 3.5;
    trabajador.estado = "idle";
    trabajador.jobId = null;
    trabajador.ruta = [];
    document.getElementById("selectionStatus").textContent = `${trabajador.nombre} completó el servicio. +${puntos} puntos y ${monedas} monedas arcade.`;
    document.getElementById("comboStatus").textContent = partida.combo > 1 ? `RACHA ×${partida.combo}` : "";
    if (partida.evento?.id === "thanks") {
        partida.bonusAgradecimiento = 32;
        mostrarToast("¡Un vecino agradecido! El próximo servicio dará monedas extra.");
    }
    renderizarPaneles();
    actualizarHUD();
}

function crearParticulas(x, y, color) {
    if (movimientoReducido) return;
    for (let indice = 0; indice < 14; indice += 1) {
        const angulo = (Math.PI * 2 * indice) / 14 + Math.random() * .25;
        const rapidez = 28 + Math.random() * 46;
        partida.particulas.push({
            x, y,
            vx: Math.cos(angulo) * rapidez,
            vy: Math.sin(angulo) * rapidez - 16,
            vida: .55 + Math.random() * .35,
            vidaTotal: .9,
            radio: 2 + Math.random() * 2.5,
            color,
        });
    }
}

function animarPuntaje() {
    if (movimientoReducido) return;
    const puntaje = document.getElementById("scoreValue");
    puntaje.classList.remove("score-jump");
    void puntaje.offsetWidth;
    puntaje.classList.add("score-jump");
}

function animarPerdidaDeVida() {
    if (movimientoReducido) return;
    ui.game.classList.remove("life-shake");
    void ui.game.offsetWidth;
    ui.game.classList.add("life-shake");
}

function expirarAviso(aviso) {
    if (aviso.estado === "done") return;
    const trabajador = partida.equipo.find((persona) => persona.id === aviso.trabajadorId);
    if (trabajador) { trabajador.estado = "idle"; trabajador.jobId = null; trabajador.ruta = []; }
    aviso.estado = "expired";
    aviso.completadoHasta = partida.transcurrido + 2.5;
    const penalizacion = 8 + aviso.dificultad * 2;
    partida.reputacion = Math.max(0, partida.reputacion - penalizacion);
    partida.vencidos += 1;
    partida.vidas = Math.max(0, partida.vidas - 1);
    partida.temblorRestante = movimientoReducido ? 0 : .24;
    animarPerdidaDeVida();
    tonoArcade("expire");
    partida.puntuacion = Math.max(0, partida.puntuacion - 25);
    partida.combo = 0;
    document.getElementById("selectionStatus").textContent = `Se venció un aviso en ${EDIFICIOS[aviso.edificioId].nombre}. El barrio perdió ${penalizacion}% de reputación.`;
    document.getElementById("comboStatus").textContent = "";
    mostrarToast(`Aviso vencido: perdió una vida y reputación (${partida.vidas} vidas restantes).`);
    renderizarPaneles();
    actualizarHUD();
}

const EVENTOS = [
    { id: "rush", nombre: "Hora pico", detalle: "El tráfico ralentiza los desplazamientos", icono: "⌁", duracion: 22, clase: "event-rush" },
    { id: "rain", nombre: "Lluvia en el barrio", detalle: "Las calles mojadas hacen más lento al equipo", icono: "⌁", duracion: 19, clase: "event-rain" },
    { id: "market", nombre: "Día de mercado", detalle: "Llegan más vecinos y sube la recompensa", icono: "✦", duracion: 18, clase: "event-thanks" },
    { id: "multiple", nombre: "Emergencia múltiple", detalle: "Dos vecinos pidieron ayuda al mismo tiempo", icono: "!", duracion: 10, clase: "event-rush" },
    { id: "thanks", nombre: "Cliente agradecido", detalle: "El próximo servicio da monedas extra", icono: "♥", duracion: 16, clase: "event-thanks" },
];

function iniciarEvento() {
    if (partida.evento) return;
    const evento = { ...EVENTOS[Math.floor(Math.random() * EVENTOS.length)] };
    evento.restante = evento.duracion;
    partida.evento = evento;
    partida.siguienteEvento = partida.transcurrido + 29 + Math.random() * 13;
    if (evento.id === "multiple") { agregarAviso(); agregarAviso(); }
    if (evento.id === "market") { agregarAviso(); }
    document.getElementById("eventBanner").hidden = false;
    document.getElementById("eventBanner").className = `event-banner ${evento.clase}`;
    document.getElementById("eventBannerIcon").textContent = evento.icono;
    document.getElementById("eventBannerText").textContent = `${evento.nombre}: ${evento.detalle}`;
    mostrarToast(evento.nombre);
}

function actualizarPartida(delta) {
    if (!partida?.activa || partida.pausada || partida.finalizada) return;
    partida.transcurrido += delta;
    partida.restante = Math.max(0, DURACION_TURNO - partida.transcurrido);
    partida.temblorRestante = Math.max(0, partida.temblorRestante - delta);
    partida.particulas = partida.particulas.filter((particula) => {
        particula.vida -= delta;
        particula.x += particula.vx * delta;
        particula.y += particula.vy * delta;
        particula.vy += 38 * delta;
        return particula.vida > 0;
    });
    const nivelNuevo = Math.min(5, 1 + Math.floor(partida.transcurrido / 36));
    if (nivelNuevo > partida.nivel) {
        partida.nivel = nivelNuevo;
        tonoArcade("level");
        mostrarToast(`¡Nivel ${partida.nivel}! Llegan más avisos difíciles.`);
        const indicadorNivel = document.getElementById("levelValue");
        indicadorNivel.classList.remove("level-up");
        void indicadorNivel.offsetWidth;
        indicadorNivel.classList.add("level-up");
    }
    partida.siguienteAviso -= delta;
    if (partida.siguienteAviso <= 0) {
        const pendientes = partida.avisos.filter((aviso) => aviso.estado === "pending" || aviso.estado === "assigned" || aviso.estado === "working").length;
        if (pendientes < 3 + Math.floor(partida.transcurrido / 55)) {
            agregarAviso();
            if (partida.transcurrido > 48 && Math.random() < .24) setTimeout(() => { if (partida?.activa && !partida.finalizada) agregarAviso(); }, 950);
        }
        const dificultad = Math.floor(partida.transcurrido / 35);
        partida.siguienteAviso = Math.max(8, 16 - dificultad * 1.8) + Math.random() * 3;
    }
    if (!partida.evento && partida.transcurrido >= partida.siguienteEvento) iniciarEvento();
    if (partida.evento) {
        partida.evento.restante -= delta;
        document.getElementById("eventBannerTime").textContent = `${Math.ceil(partida.evento.restante)} s`;
        if (partida.evento.restante <= 0) {
            partida.evento = null;
            document.getElementById("eventBanner").hidden = true;
        }
    }

    partida.avisos.forEach((aviso) => {
        if (aviso.estado === "pending" || aviso.estado === "assigned" || aviso.estado === "working") {
            aviso.tiempo -= delta;
            if (aviso.tiempo <= 0) expirarAviso(aviso);
        }
    });
    partida.equipo.forEach((trabajador) => {
        if (trabajador.estado === "traveling") animarDesplazamiento(trabajador, delta);
        if (trabajador.estado === "working") {
            trabajador.tiempoTrabajo -= delta;
            const aviso = partida.avisos.find((item) => item.id === trabajador.jobId);
            if (aviso && trabajador.tiempoTrabajo <= 0 && aviso.estado === "working") completarAviso(trabajador, aviso);
        }
    });
    partida.avisos = partida.avisos.filter((aviso) => aviso.estado !== "done" && aviso.estado !== "expired" || partida.transcurrido < aviso.completadoHasta);
    if (partida.reputacion <= 0) { finalizarPartida("reputacion"); return; }
    if (partida.vidas <= 0) { finalizarPartida("vidas"); return; }
    if (partida.restante <= 0) { finalizarPartida("tiempo"); return; }
}

function actualizarFramePartida(delta) {
    if (partida.activa && !partida.pausada) actualizarPartida(delta);
}

function dibujarFramePartida(tiempo) {
    dibujarBarrio(movimientoReducido ? 0 : tiempo);
}

function despuesDeFramePartida(ahora) {
    if (ahora - partida.ultimoPanel > 280) {
        partida.ultimoPanel = ahora;
        renderizarPaneles();
        actualizarHUD();
    }
}

function actualizarHUD() {
    if (!partida) return;
    document.getElementById("timerValue").textContent = `${String(Math.floor(partida.restante / 60)).padStart(2, "0")}:${String(Math.floor(partida.restante % 60)).padStart(2, "0")}`;
    document.getElementById("scoreValue").textContent = formatoMoneda(partida.puntuacion);
    document.getElementById("roundCoinsValue").textContent = formatoMoneda(partida.monedas);
    document.getElementById("levelValue").textContent = String(partida.nivel);
    document.getElementById("reputationValue").textContent = `${Math.round(partida.reputacion)}%`;
    const barra = document.getElementById("reputationBar");
    barra.style.width = `${partida.reputacion}%`;
    barra.style.background = partida.reputacion < 35 ? "#ed7069" : partida.reputacion < 65 ? "#f0b54c" : "linear-gradient(90deg,#40d39f,#9be5ad)";
    document.getElementById("workersAvailable").textContent = `${partida.equipo.filter((trabajador) => trabajador.estado === "idle").length} libres`;
    document.getElementById("requestsCount").textContent = String(partida.avisos.filter((aviso) => aviso.estado === "pending" || aviso.estado === "assigned" || aviso.estado === "working").length);
    renderizarVidas(partida);
}

function renderizarPaneles() {
    if (!partida) return;
    ui.workers.replaceChildren();
    partida.equipo.forEach((trabajador) => {
        const button = crearNodo("button", `game-worker-row${trabajador.id === partida.seleccionTrabajador ? " selected" : ""}${trabajador.estado !== "idle" ? " busy" : ""}`);
        button.type = "button";
        button.appendChild(avatarTrabajador(trabajador, true));
        const texto = crearNodo("span", "game-worker-info");
        texto.append(crearNodo("strong", "", trabajador.nombre), crearNodo("small", "", trabajador.oficio));
        const estados = { idle: ["Libre", ""], traveling: ["En camino", "traveling"], working: ["Trabajando", "working"] };
        const [etiqueta, clase] = estados[trabajador.estado] || ["Libre", ""];
        button.append(texto, crearNodo("small", `worker-state ${clase}`, etiqueta));
        button.disabled = trabajador.estado !== "idle";
        button.addEventListener("click", () => seleccionarTrabajador(trabajador.id));
        ui.workers.appendChild(button);
    });
    ui.requests.replaceChildren();
    const avisosActivos = partida.avisos.filter((aviso) => aviso.estado === "pending" || aviso.estado === "assigned" || aviso.estado === "working").sort((a, b) => a.tiempo - b.tiempo);
    if (!avisosActivos.length) {
        ui.requests.appendChild(crearNodo("div", "empty-requests", "Barrio tranquilo por ahora. Los nuevos avisos aparecerán durante el turno."));
    }
    avisosActivos.forEach((aviso) => {
        const edificio = EDIFICIOS[aviso.edificioId];
        const card = crearNodo("button", `request-card${aviso.id === partida.seleccionAviso ? " selected" : ""}${aviso.estado !== "pending" ? " assigned" : ""}`);
        card.type = "button";
        card.disabled = aviso.estado !== "pending";
        const icon = crearNodo("span", "request-service-icon", aviso.servicio.sello.slice(0, 2));
        icon.style.color = aviso.servicio.color;
        icon.style.background = `${aviso.servicio.color}18`;
        const details = crearNodo("span", "request-card-text");
        details.append(crearNodo("strong", "", `${aviso.servicio.corto} · ${edificio.nombre}`), crearNodo("small", "", `Nivel ${aviso.dificultad} · ${aviso.estado === "pending" ? "Sin asignar" : aviso.estado === "assigned" ? "En camino" : "En trabajo"}`));
        const side = crearNodo("span", "request-card-side");
        const tiempo = crearNodo("strong", `request-time${aviso.tiempo > 19 ? " safe" : ""}`, `${Math.ceil(aviso.tiempo)}s`);
        side.append(tiempo, crearNodo("small", "request-reward", `+${aviso.recompensa} ◈`), crearNodo("small", "request-difficulty", "●".repeat(aviso.dificultad)));
        card.append(icon, details, side);
        card.addEventListener("click", () => seleccionarAviso(aviso.id));
        ui.requests.appendChild(card);
    });
}

function ajustarCanvas() {
    if (!ui.canvas || ui.game.hidden) return;
    const rect = ui.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    ui.canvas.width = Math.round(rect.width * pixelRatio);
    ui.canvas.height = Math.round(rect.height * pixelRatio);
    escalaCanvas = rect.width / ANCHO_MUNDO;
    ui.ctx.setTransform(pixelRatio * escalaCanvas, 0, 0, pixelRatio * escalaCanvas, 0, 0);
    if (partida) dibujarBarrio(performance.now() / 1000);
}

function dibujarCalle(ctx) {
    ctx.fillStyle = "#a9cdb2";
    ctx.fillRect(0, 0, ANCHO_MUNDO, ALTO_MUNDO);
    // Pequeñas parcelas de césped entre las aceras.
    for (let fila = 0; fila < EJES_CALLE_Y.length - 1; fila += 1) {
        for (let columna = 0; columna < EJES_CALLE_X.length - 1; columna += 1) {
            const x = EJES_CALLE_X[columna] + 27;
            const y = EJES_CALLE_Y[fila] + 27;
            const ancho = EJES_CALLE_X[columna + 1] - EJES_CALLE_X[columna] - 54;
            const alto = EJES_CALLE_Y[fila + 1] - EJES_CALLE_Y[fila] - 54;
            ctx.fillStyle = (fila + columna) % 2 ? "#b8d4b5" : "#b2d0ae";
            ctx.beginPath(); ctx.roundRect(x, y, ancho, alto, 8); ctx.fill();
        }
    }
    // Aceras, bordillos y vías continuas. La navegación usa solo estos ejes.
    ctx.fillStyle = "#d5d4c8";
    EJES_CALLE_Y.forEach((y) => ctx.fillRect(0, y - 31, ANCHO_MUNDO, 62));
    EJES_CALLE_X.forEach((x) => ctx.fillRect(x - 31, 0, 62, ALTO_MUNDO));
    ctx.fillStyle = "#505c64";
    EJES_CALLE_Y.forEach((y) => ctx.fillRect(0, y - 23, ANCHO_MUNDO, 46));
    EJES_CALLE_X.forEach((x) => ctx.fillRect(x - 23, 0, 46, ALTO_MUNDO));
    ctx.strokeStyle = "#f5d774"; ctx.lineWidth = 2; ctx.setLineDash([13, 13]);
    EJES_CALLE_Y.forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ANCHO_MUNDO, y); ctx.stroke(); });
    EJES_CALLE_X.forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTO_MUNDO); ctx.stroke(); });
    ctx.setLineDash([]);
    // Cruces peatonales en las intersecciones principales.
    EJES_CALLE_X.forEach((x, col) => EJES_CALLE_Y.forEach((y, row) => {
        if ((col + row) % 2 !== 0) return;
        ctx.fillStyle = "#e9e8df";
        for (let k = -2; k <= 2; k += 1) ctx.fillRect(x - 21 + k * 8, y - 35, 4, 10);
        for (let k = -2; k <= 2; k += 1) ctx.fillRect(x + 25, y - 20 + k * 8, 10, 4);
    }));
}

function dibujarArbol(ctx, x, y, escala = 1) {
    ctx.fillStyle = "#765a42"; ctx.fillRect(x - 3 * escala, y + 2 * escala, 6 * escala, 13 * escala);
    ctx.fillStyle = "#43845e"; ctx.beginPath(); ctx.arc(x, y, 13 * escala, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5c9b70"; ctx.beginPath(); ctx.arc(x - 4 * escala, y - 4 * escala, 8 * escala, 0, Math.PI * 2); ctx.fill();
}

function dibujarEdificio(ctx, edificio) {
    const { x, y, w, h, clase, paleta } = edificio;
    if (clase === "parque") {
        ctx.fillStyle = "#8ac7a4"; ctx.beginPath(); ctx.roundRect(x - 55, y - 35, 110, 70, 13); ctx.fill();
        ctx.strokeStyle = "#d6f1d9"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.quadraticCurveTo(x, y - 17, x + 39, y); ctx.stroke();
        dibujarArbol(ctx, x - 23, y - 13, .72); dibujarArbol(ctx, x + 28, y + 12, .67);
        ctx.fillStyle = "#e4f2df"; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#765c49"; ctx.fillRect(x - 39, y + 19, 25, 3); ctx.fillRect(x - 36, y + 18, 3, 7); ctx.fillRect(x - 18, y + 18, 3, 7);
        return;
    }
    const paredes = ["#f0c77d", "#e89676", "#d8e1ec", "#eccb94"];
    const techos = ["#b65f50", "#d17258", "#7e9bb0", "#c3895a"];
    const pared = paredes[paleta]; const techo = techos[paleta];
    ctx.save();
    ctx.fillStyle = "#253b3d30"; ctx.beginPath(); ctx.ellipse(x, y + h * .43, w * .62, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c6bca7"; ctx.fillRect(x - w / 2 - 6, y + h / 2 - 7, w + 12, 8);
    ctx.fillStyle = pared; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2 + 8, w, h - 8, 5); ctx.fill();
    ctx.fillStyle = techo; ctx.beginPath(); ctx.roundRect(x - w / 2 - 3, y - h / 2, w + 6, h * .62, 6); ctx.fill();
    ctx.fillStyle = "#ffffff24"; ctx.fillRect(x - w / 2 + 7, y - h / 2 + 5, w - 14, 4);
    // Tejados diferenciados para casas, edificios y locales.
    if (clase === "casa") {
        ctx.fillStyle = "#8a5149"; ctx.beginPath(); ctx.moveTo(x - w * .55, y - h * .2); ctx.lineTo(x, y - h * .67); ctx.lineTo(x + w * .55, y - h * .2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#b6dfe3"; ctx.fillRect(x - w * .3, y - h * .1, 17, 13); ctx.fillRect(x + w * .1, y - h * .1, 17, 13);
    } else if (clase === "apartamentos") {
        ctx.fillStyle = "#526d86"; ctx.fillRect(x - w / 2 + 7, y - h / 2 + 11, w - 14, h * .49);
        ctx.fillStyle = "#bde2e8";
        for (let row = 0; row < 2; row += 1) for (let col = 0; col < 4; col += 1) ctx.fillRect(x - w / 2 + 13 + col * 21, y - h / 2 + 17 + row * 17, 12, 9);
        ctx.fillStyle = "#d9e4e5"; ctx.fillRect(x - 19, y + h * .1, 38, 11);
    } else if (["tienda", "mercado", "cafe"].includes(clase)) {
        ctx.fillStyle = clase === "cafe" ? "#cb7056" : "#d56354";
        ctx.fillRect(x - w / 2 + 2, y - h / 2 + 29, w - 4, 11);
        ctx.fillStyle = "#fff0d7"; ctx.fillRect(x - w / 2 + 6, y - h / 2 + 40, w - 12, 4);
        ctx.fillStyle = "#a9d6dc"; ctx.fillRect(x - w / 2 + 12, y - h / 2 + 46, w * .43, 14);
        ctx.fillStyle = "#845346"; ctx.fillRect(x + w * .2, y - h / 2 + 44, 14, 22);
        ctx.fillStyle = "#fff8df"; ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center"; ctx.fillText(clase === "cafe" ? "CAFÉ" : "ABIERTO", x, y - h / 2 + 25);
    } else {
        ctx.fillStyle = "#b6dce0"; ctx.fillRect(x - w * .3, y - h * .16, 19, 15); ctx.fillRect(x + w * .08, y - h * .16, 19, 15);
        ctx.fillStyle = "#875546"; ctx.fillRect(x - 8, y + h * .12, 17, h * .25);
    }
    ctx.fillStyle = "#536253"; ctx.fillRect(x - w / 2 + 9, y + h / 2 - 4, 15, 5); ctx.fillRect(x + w / 2 - 24, y + h / 2 - 4, 15, 5);
    ctx.restore();
    dibujarArbol(ctx, x - w * .64, y + h * .3, .68);
}

function dibujarAuto(ctx, x, y, color, vertical = false, escala = 1) {
    ctx.save(); ctx.translate(x, y); if (vertical) ctx.rotate(Math.PI / 2); ctx.scale(escala, escala);
    ctx.fillStyle = "#182b3b50"; ctx.beginPath(); ctx.ellipse(1, 3, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-21, -9, 42, 18, 6); ctx.fill();
    ctx.fillStyle = "#b8dce3"; ctx.beginPath(); ctx.roundRect(-9, -6, 19, 12, 4); ctx.fill();
    ctx.fillStyle = "#f6e1a1"; ctx.fillRect(18, -6, 3, 4); ctx.fillRect(18, 3, 3, 4);
    ctx.fillStyle = "#263542"; ctx.fillRect(-13, -10, 7, 2); ctx.fillRect(8, -10, 7, 2); ctx.fillRect(-13, 8, 7, 2); ctx.fillRect(8, 8, 7, 2);
    ctx.restore();
}

function dibujarPeaton(ctx, x, y, t, color) {
    const balanceo = Math.sin(t * 4 + x) * 1.6;
    ctx.fillStyle = "#26364745"; ctx.beginPath(); ctx.ellipse(x, y + 4, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3c4b5b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 1, y + 1); ctx.lineTo(x - 2 + balanceo, y + 5); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 2 - balanceo, y + 5); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x - 3, y - 3, 6, 7, 2); ctx.fill();
    ctx.fillStyle = "#c78d69"; ctx.beginPath(); ctx.arc(x, y - 5, 2.7, 0, Math.PI * 2); ctx.fill();
}

function dibujarEmergencia(ctx, aviso, edificio, tiempo) {
    const pulse = 1 + Math.sin(tiempo * 5 + aviso.id) * .09;
    const x = edificio.x + edificio.w * .38;
    const y = edificio.y - edificio.h * .53;
    const color = aviso.servicio.color;
    ctx.save();
    ctx.globalAlpha = .18; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 31 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.font = "900 9px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(aviso.servicio.sello.slice(0, 3), x, y + .5);
    if (aviso.servicio.id === "plomeria") {
        const drip = (tiempo * 42 + aviso.id * 13) % 23;
        ctx.fillStyle = "#4bbce4"; ctx.beginPath(); ctx.ellipse(edificio.x + edificio.w * .38, y + 16 + drip, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (aviso.servicio.id === "electricidad") {
        ctx.strokeStyle = "#ffe58a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 16, y - 12); ctx.lineTo(x + 20, y - 17); ctx.lineTo(x + 18, y - 11); ctx.lineTo(x + 23, y - 14); ctx.stroke();
    }
    if (aviso.estado === "assigned" || aviso.estado === "working") {
        ctx.fillStyle = "#235d8f"; ctx.beginPath(); ctx.roundRect(x - 32, y - 39, 64, 15, 6); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 8px Inter,sans-serif"; ctx.fillText(aviso.estado === "working" ? "EN TRABAJO" : "EN CAMINO", x, y - 31.5);
    }
    ctx.restore();
}

function dibujarBarrio(tiempo) {
    if (!ui.ctx || ui.game.hidden) return;
    const ctx = ui.ctx;
    ctx.setTransform(pixelRatio * escalaCanvas, 0, 0, pixelRatio * escalaCanvas, 0, 0);
    if (!movimientoReducido && partida?.temblorRestante > 0) {
        const fuerza = partida.temblorRestante / .24 * 7;
        ctx.translate((Math.random() - .5) * fuerza, (Math.random() - .5) * fuerza);
    }
    dibujarCalle(ctx);
    EDIFICIOS.forEach((edificio) => dibujarEdificio(ctx, edificio));
    const coloresAutos = ["#e9a146", "#d65f58", "#5d8ec3", "#f0e8cf", "#50a38a"];
    const cantidadAutos = partida?.evento?.id === "rush" ? 8 : 4;
    for (let indice = 0; indice < cantidadAutos; indice += 1) {
        const carril = indice % 2 ? 3 : 1;
        const direccion = indice % 2 ? -1 : 1;
        const avance = ((tiempo * (partida?.evento?.id === "rush" ? 48 : 25) + indice * 137) % 1120) - 60;
        dibujarAuto(ctx, direccion > 0 ? avance : ANCHO_MUNDO - avance, EJES_CALLE_Y[carril] + (indice % 2 ? 13 : -13), coloresAutos[indice % coloresAutos.length], false, .75);
    }
    for (let indice = 0; indice < 7; indice += 1) {
        const x = EJES_CALLE_X[(indice * 2 + 1) % EJES_CALLE_X.length] + (indice % 2 ? 11 : -12);
        const avance = (tiempo * (partida?.evento?.id === "rush" ? 33 : 20) + indice * 91) % (ALTO_MUNDO + 80) - 30;
        dibujarAuto(ctx, x, avance, coloresAutos[(indice + 2) % coloresAutos.length], true, .63);
    }
    for (let indice = 0; indice < 18; indice += 1) {
        const fila = indice % EJES_CALLE_Y.length;
        const columna = Math.floor(indice / EJES_CALLE_Y.length) % (EJES_CALLE_X.length - 1);
        const avance = (tiempo * (7 + (indice % 3)) + indice * 29) % 110;
        const x = EJES_CALLE_X[columna] + 36 + avance;
        const y = EJES_CALLE_Y[fila] + (indice % 2 ? 29 : -29) + Math.sin(tiempo + indice) * 1.5;
        dibujarPeaton(ctx, x, y, tiempo + indice, ["#e77755", "#517db1", "#daae4e", "#855cb1"][indice % 4]);
    }
    if (partida) {
        partida.avisos.filter((aviso) => aviso.estado !== "done" && aviso.estado !== "expired").forEach((aviso) => dibujarEmergencia(ctx, aviso, EDIFICIOS[aviso.edificioId], tiempo));
        const trabajadorElegido = partida.equipo.find((persona) => persona.id === partida.seleccionTrabajador);
        const avisoElegido = partida.avisos.find((aviso) => aviso.id === partida.seleccionAviso && aviso.estado === "pending");
        if (trabajadorElegido && avisoElegido) {
            ctx.save(); ctx.setLineDash([7, 7]); ctx.strokeStyle = "#ffe06a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(trabajadorElegido.x, trabajadorElegido.y);
            const destino = avisoElegido.destino || { x: EJES_CALLE_X[EDIFICIOS[avisoElegido.edificioId].approach.columna], y: EJES_CALLE_Y[EDIFICIOS[avisoElegido.edificioId].approach.fila] };
            ctx.lineTo(destino.x, destino.y); ctx.stroke(); ctx.restore();
        }
        partida.equipo.forEach((trabajador) => {
            const seleccionado = trabajador.id === partida.seleccionTrabajador;
            hacerAvatarCanvas(ctx, trabajador.x, trabajador.y, trabajador, tiempo, seleccionado, trabajador.estado);
            ctx.fillStyle = seleccionado ? "#183e68" : "#19334d"; ctx.beginPath(); ctx.roundRect(trabajador.x - 34, trabajador.y + 20, 68, 17, 6); ctx.fill();
            if (seleccionado) { ctx.strokeStyle = "#ffe16a"; ctx.lineWidth = 1.5; ctx.stroke(); }
            ctx.fillStyle = "#fff"; ctx.font = "bold 10px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(trabajador.nombre, trabajador.x, trabajador.y + 28.5);
            if (seleccionado) {
                ctx.fillStyle = "#19334d"; ctx.beginPath(); ctx.roundRect(trabajador.x - 27, trabajador.y - 50, 54, 14, 6); ctx.fill();
                ctx.fillStyle = "#ffe16a"; ctx.font = "900 7px Inter,sans-serif"; ctx.fillText("ELIGE AVISO", trabajador.x, trabajador.y - 43);
            }
            if (trabajador.estado === "working") {
                const aviso = partida.avisos.find((item) => item.id === trabajador.jobId);
                if (aviso) {
                    const pct = 1 - trabajador.tiempoTrabajo / Math.max(1, trabajador.tiempoTrabajoTotal);
                    ctx.fillStyle = "#344b61"; ctx.beginPath(); ctx.roundRect(trabajador.x - 19, trabajador.y - 37, 38, 5, 3); ctx.fill();
                    ctx.fillStyle = "#63d8b5"; ctx.beginPath(); ctx.roundRect(trabajador.x - 19, trabajador.y - 37, 38 * Math.max(0, Math.min(1, pct)), 5, 3); ctx.fill();
                }
            }
        });
        partida.avisos.filter((aviso) => aviso.estado === "done" && partida.transcurrido < aviso.completadoHasta).forEach((aviso) => {
            const edificio = EDIFICIOS[aviso.edificioId];
            const alpha = Math.max(0, (aviso.completadoHasta - partida.transcurrido) / 3.5);
            ctx.globalAlpha = alpha; ctx.fillStyle = "#137957"; ctx.beginPath(); ctx.arc(edificio.x, edificio.y - 39 - (1 - alpha) * 16, 15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✓", edificio.x, edificio.y - 39 - (1 - alpha) * 16); ctx.globalAlpha = 1;
        });
        if (partida.evento?.id === "rain") dibujarLluvia(ctx, tiempo);
        partida.particulas.forEach((particula) => {
            ctx.globalAlpha = Math.max(0, particula.vida / particula.vidaTotal);
            ctx.fillStyle = particula.color;
            ctx.beginPath();
            ctx.arc(particula.x, particula.y, particula.radio, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

function dibujarLluvia(ctx, tiempo) {
    ctx.save(); ctx.strokeStyle = "#d8f1ff9c"; ctx.lineWidth = 1.2;
    for (let indice = 0; indice < 62; indice += 1) {
        const x = (indice * 173 + tiempo * 95) % ANCHO_MUNDO;
        const y = (indice * 97 + tiempo * 160) % ALTO_MUNDO;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 10); ctx.stroke();
    }
    ctx.restore();
}

function trabajadorEnPunto(punto) {
    return partida?.equipo.find((persona) => persona.estado === "idle" && Math.hypot(persona.x - punto.x, persona.y - punto.y) < 35);
}

function avisoEnPunto(punto) {
    const avisos = partida?.avisos.filter((aviso) => aviso.estado === "pending").slice().reverse() || [];
    return avisos.find((aviso) => {
        const edificio = EDIFICIOS[aviso.edificioId];
        const marcadorX = edificio.x + edificio.w * .38;
        const marcadorY = edificio.y - edificio.h * .53;
        return Math.hypot(marcadorX - punto.x, marcadorY - punto.y) < 43 || (Math.abs(edificio.x - punto.x) < edificio.w * .62 && Math.abs(edificio.y - punto.y) < edificio.h * .72);
    });
}

function finalizarPartida(motivo) {
    if (!partida || partida.finalizada) return;
    partida.finalizada = true;
    partida.activa = false;
    partida.pausada = false;
    buclePartida?.detener();
    tonoArcade("gameover");
    const retoSuperado = partida.retoDiario && partida.completados >= partida.objetivoDiario;
    const experiencia = partida.completados * 32 + Math.floor(partida.puntuacion / 25) + (retoSuperado ? 100 : 0);
    const monedasFinales = partida.monedas + (retoSuperado ? 150 : 0);
    progreso.monedas += monedasFinales;
    if (partida.retoDiario) {
        progreso.retosDiarios ||= {};
        const fecha = fechaLocalReto();
        const previo = progreso.retosDiarios[fecha] || { completado: false, mejor: 0 };
        progreso.retosDiarios[fecha] = { completado: previo.completado || retoSuperado, mejor: Math.max(previo.mejor || 0, partida.puntuacion) };
    }
    progreso.xp += experiencia;
    const nuevoRecord = partida.puntuacion > progreso.record;
    progreso.record = Math.max(progreso.record, partida.puntuacion);
    guardarProgreso();
    actualizarRetoDiario();
    mostrarResultados({ motivo, experiencia, monedasFinales, retoSuperado, nuevoRecord });
}

function mostrarResultados(resultado) {
    const titulo = resultado.motivo === "tiempo" ? "¡Turno terminado!" : "El barrio necesita un respiro";
    const subtitulo = resultado.motivo === "tiempo" ? "Tu cuadrilla completó su jornada." : resultado.motivo === "vidas" ? "Se agotaron las vidas de la cuadrilla. La próxima ronda será mejor." : "La reputación llegó a cero. La próxima ronda será mejor.";
    ui.overlayCard.innerHTML = `
        <div class="result-hero"><span class="overlay-kicker">CIERRE DE TURNO</span><h2 id="overlayTitle">${titulo}</h2><p>${subtitulo}</p><div class="result-score">${formatoMoneda(partida.puntuacion)} <small>PTS</small></div></div>
        <div class="result-grid">
            <div class="result-stat"><small>SERVICIOS</small><strong>${partida.completados}</strong></div>
            <div class="result-stat"><small>VENCIDOS</small><strong>${partida.vencidos}</strong></div>
            <div class="result-stat"><small>MEJOR RACHA</small><strong>×${partida.mejorCombo}</strong></div>
            <div class="result-stat"><small>MONEDAS GANADAS</small><strong>+${resultado.monedasFinales} ◈</strong></div>
            <div class="result-stat"><small>EXPERIENCIA</small><strong>+${resultado.experiencia} XP</strong></div>
            <div class="result-stat"><small>NIVEL DE EQUIPO</small><strong>${nivelDelEquipo()}</strong></div>
        </div>
        <div class="result-record">${resultado.nuevoRecord ? "✦ ¡Nuevo récord personal!" : `Récord personal: ${formatoMoneda(progreso.record)} puntos`}${partida.retoDiario ? (resultado.retoSuperado ? " · ¡Reto diario cumplido! +150 ◈ y +100 XP" : ` · Reto diario: ${partida.completados}/${partida.objetivoDiario} servicios`) : ""}</div>
        <p id="scoreSubmitStatus" class="leaderboard-note" aria-live="polite"></p>
        <div class="overlay-actions"><button type="button" class="arcade-button arcade-button-blue" data-arcade-action="again">VOLVER A JUGAR</button><button type="button" class="arcade-button arcade-button-white" data-arcade-action="home">VOLVER AL INICIO</button></div>`;
    ui.overlay.hidden = false;
    ui.overlayCard.querySelector('[data-arcade-action="again"]')?.focus();
    enviarPuntuacion();
    ui.overlayCard.querySelectorAll("[data-arcade-action]").forEach((button) => button.addEventListener("click", () => {
        ui.overlay.hidden = true;
        if (button.dataset.arcadeAction === "again") { retoDiarioPendiente = Boolean(partida.retoDiario); abrirPreparacion(); }
        else mostrarPantalla("welcome");
    }));
}

function mostrarOverlay(tipo) {
    if (tipo === "instructions") {
        ui.overlayCard.innerHTML = `<div class="overlay-top"><div><span class="overlay-kicker">GUÍA RÁPIDA</span><h2 id="overlayTitle">Coordina, prioriza, ayuda</h2></div><button type="button" class="overlay-close" data-arcade-action="close" aria-label="Cerrar">×</button></div><p>Tu equipo tiene tres minutos para resolver las urgencias que aparecen por todo el barrio.</p><div class="overlay-instructions"><div class="instruction-row"><b>1</b><span><strong>Elige una persona libre.</strong> La especialidad correcta termina el trabajo más rápido y gana más puntos.</span></div><div class="instruction-row"><b>2</b><span><strong>Asigna un aviso.</strong> Toca el aviso o arrastra al trabajador hasta el edificio. Con teclado: 1–6 elige trabajador y ↑/↓ recorre avisos; al seleccionar ambos, el servicio se asigna. P pausa.</span></div><div class="instruction-row"><b>3</b><span><strong>Cuida vidas y reputación.</strong> Cada aviso vencido cuesta una vida y reputación; al perder las cinco vidas o toda la reputación termina el turno.</span></div><div class="instruction-row"><b>4</b><span><strong>Reacciona a los eventos.</strong> La lluvia y la hora pico ralentizan las rutas; las rachas y clientes agradecidos dan bonificaciones.</span></div><div class="instruction-row"><b>5</b><span><strong>Reto diario.</strong> Completa ocho servicios para ganar monedas y experiencia extra. Solo se guarda en este dispositivo.</span></div></div><div class="overlay-actions"><button class="arcade-button arcade-button-blue" type="button" data-arcade-action="close">¡ENTENDIDO!</button></div>`;
    } else {
        const mensajePausa = partida?.motivoPausa === "foco" ? "La partida se pausó al salir de esta pestaña o ventana." : "El barrio espera. Puedes volver a coordinar, reiniciar el turno o salir al inicio.";
        ui.overlayCard.innerHTML = `<div class="overlay-top"><div><span class="overlay-kicker">TURNO EN PAUSA</span><h2 id="overlayTitle">Toma aire, capitán</h2></div><button type="button" class="overlay-close" data-arcade-action="resume" aria-label="Continuar">×</button></div><p>${mensajePausa}</p><div class="overlay-actions"><button class="arcade-button arcade-button-blue" type="button" data-arcade-action="resume">CONTINUAR</button><button class="arcade-button arcade-button-white" type="button" data-arcade-action="restart">REINICIAR TURNO</button><button class="arcade-button arcade-button-white" type="button" data-arcade-action="home">SALIR AL INICIO</button></div>`;
    }
    ui.overlay.hidden = false;
    ui.overlayCard.querySelector("button")?.focus();
    ui.overlayCard.querySelectorAll("[data-arcade-action]").forEach((button) => button.addEventListener("click", () => {
        const action = button.dataset.arcadeAction;
        if (action === "close") ui.overlay.hidden = true;
        if (action === "resume") { ui.overlay.hidden = true; partida.pausada = false; partida.motivoPausa = null; buclePartida?.iniciar(); }
        if (action === "restart") { ui.overlay.hidden = true; abrirPreparacion(); }
        if (action === "home") { ui.overlay.hidden = true; partida.activa = false; mostrarPantalla("welcome"); }
    }));
}

function alternarPausa(motivo = "teclado") {
    if (!partida?.activa || partida.finalizada) return;
    partida.pausada = true;
    partida.motivoPausa = motivo;
    buclePartida?.detener();
    mostrarOverlay("pause");
}

buclePartida = crearBucleRender({
    esVisible: () => Boolean(partida && !ui.game.hidden),
    actualizar: actualizarFramePartida,
    dibujar: dibujarFramePartida,
    despuesDeDibujar: despuesDeFramePartida,
});

instalarControlesArcade({
    obtenerPartida: () => partida,
    overlayVisible: () => !ui.overlay.hidden,
    pausar: alternarPausa,
    cerrarOverlay: () => { ui.overlay.hidden = true; },
    elegirTrabajador: (indice) => {
        const trabajador = partida?.equipo[indice];
        if (trabajador) seleccionarTrabajador(trabajador.id);
    },
    recorrerAvisos: (direccion) => {
        const pendientes = partida?.avisos.filter((aviso) => aviso.estado === "pending") || [];
        if (!pendientes.length) return;
        indiceAvisoTeclado = (indiceAvisoTeclado + direccion + pendientes.length) % pendientes.length;
        seleccionarAviso(pendientes[indiceAvisoTeclado].id);
    },
});

document.getElementById("playButton").addEventListener("click", abrirPreparacion);
document.getElementById("instructionsButton").addEventListener("click", () => mostrarOverlay("instructions"));
document.getElementById("backWelcome").addEventListener("click", () => mostrarPantalla("welcome"));
document.getElementById("startShiftButton").addEventListener("click", iniciarTurno);
document.getElementById("pauseButton").addEventListener("click", alternarPausa);
document.getElementById("dailyChallengeButton").addEventListener("click", () => { retoDiarioPendiente = true; abrirPreparacion(); });
ui.overlay.addEventListener("click", (evento) => { if (evento.target === ui.overlay && !partida?.pausada) ui.overlay.hidden = true; });

window.addEventListener("resize", ajustarCanvas);
if ("ResizeObserver" in window) new ResizeObserver(ajustarCanvas).observe(ui.canvas);
instalarControlesMapa({
    canvas: ui.canvas,
    obtenerPartida: () => partida,
    convertirPunto: (evento) => {
        const rect = ui.canvas.getBoundingClientRect();
        return { x: (evento.clientX - rect.left) / rect.width * ANCHO_MUNDO, y: (evento.clientY - rect.top) / rect.height * ALTO_MUNDO };
    },
    trabajadorEnPunto,
    avisoEnPunto,
    seleccionarTrabajador,
    seleccionarAviso,
    asignarAviso,
    actualizarMensaje: (mensaje) => { document.getElementById("selectionStatus").textContent = mensaje; },
});
actualizarPantallaInicio();
actualizarRetoDiario();
document.getElementById("leaderboardMode").addEventListener("change", cargarClasificacion);
cargarClasificacion();

// El filtro CRT es opcional y se guarda solo para esta página del minijuego.
const botonCRT = document.getElementById("crtToggleButton");
function ajustarEfectoCRT(activo) {
    document.body.classList.toggle("crt-enabled", activo);
    botonCRT.setAttribute("aria-pressed", String(activo));
    botonCRT.setAttribute("aria-label", activo ? "Desactivar efecto de pantalla retro" : "Activar efecto de pantalla retro");
    botonCRT.querySelector("strong").textContent = activo ? "ON" : "OFF";
}
try { ajustarEfectoCRT(localStorage.getItem(CLAVE_CRT_ARCADE) === "true"); }
catch (_error) { ajustarEfectoCRT(false); }
botonCRT.addEventListener("click", () => {
    const activo = !document.body.classList.contains("crt-enabled");
    ajustarEfectoCRT(activo);
    try { localStorage.setItem(CLAVE_CRT_ARCADE, String(activo)); } catch (_error) { /* Preferencia temporal. */ }
});
const botonSonido = document.getElementById("soundToggleButton");
botonSonido.addEventListener("click", () => {
    sonidoActivo = !sonidoActivo;
    botonSonido.setAttribute("aria-pressed", String(sonidoActivo));
    botonSonido.setAttribute("aria-label", sonidoActivo ? "Silenciar sonido" : "Activar sonido");
    botonSonido.querySelector("strong").textContent = sonidoActivo ? "ON" : "OFF";
    if (sonidoActivo) tonoArcade("select");
});
