// ================================
// MENSAJE FLOTANTE
// ================================

function mostrarMensaje(texto) {

    const caja =
        document.getElementById("message");

    if (!caja) return;

    caja.innerText = texto;

    caja.style.display = "block";

    clearTimeout(window._mensajeTimeout);

    window._mensajeTimeout = setTimeout(function () {

        caja.style.display = "none";

    }, 3000);

}


// ================================
// BUSCADOR DE SERVICIOS
// ================================

function buscarServicios() {

    const texto =
        document
        .getElementById("search")
        .value
        .trim()
        .toLowerCase();

    const categoria =
        document
        .getElementById("category")
        .value;

    const tarjetas =
        document.querySelectorAll(
            "#serviceGrid .service"
        );

    let encontrados = 0;

    tarjetas.forEach(function (tarjeta) {

        const nombre =
            tarjeta.dataset.name || "";

        const cat =
            tarjeta.dataset.category || "";

        const coincideTexto =
            texto === "" || nombre.includes(texto);

        const coincideCategoria =
            categoria === "all" || cat === categoria;

        if (coincideTexto && coincideCategoria) {

            tarjeta.style.display = "";
            encontrados++;

        } else {

            tarjeta.style.display = "none";

        }

    });

    document
        .getElementById("servicios")
        .scrollIntoView({ behavior: "smooth" });

    if (encontrados === 0) {

        mostrarMensaje(
            "No se encontraron servicios para esa búsqueda."
        );

    }

}


// ================================
// SELECCIONAR CATEGORÍA
// ================================

function seleccionarCategoria(categoria) {

    document.getElementById("category").value = categoria;

    buscarServicios();

}


// ================================
// BASE DE DATOS DE TRABAJADORES
// ================================
//
// Simulación de base de datos en el cliente (localStorage),
// modelada según el diagrama entidad-relación del SRS de
// ServApp (entidad Trabajador con perfil, categoría,
// calificación, ubicación y disponibilidad).
//
// Cuando el backend real (API REST + MySQL/PostgreSQL)
// esté disponible, basta con reemplazar las funciones
// obtenerTrabajadores(), guardarTrabajadores() y
// actualizarUbicacionTrabajador() por llamadas fetch() a
// esa API; el resto de la app (mapa, cercanos, perfil) no
// necesita cambiar porque siempre lee a través de ellas.

const DB_TRABAJADORES_KEY = "serviappTrabajadoresDB";

// Datos semilla: se usan solo la primera vez, para poblar
// la "base de datos" si todavía está vacía.
const trabajadoresSemilla = [

    {
        id: "t1",
        nombre: "Carlos M.",
        categoria: "hogar",
        oficio: "Plomería y reparaciones",
        icono: "🔧",
        descripcion: "Instalaciones, fugas, grifería y reparaciones del hogar.",
        calificacion: 4.9,
        serviciosCompletados: 132,
        precio: "Desde $40.000",
        telefono: "+57 300 123 4567",
        disponibilidad: "Lunes a sábado, 8:00 am - 6:00 pm",
        verificado: true,
        lat: 4.7110, lng: -74.0721
    },
    {
        id: "t2",
        nombre: "Andrea R.",
        categoria: "limpieza",
        oficio: "Limpieza del hogar",
        icono: "🧹",
        descripcion: "Limpieza profunda de casas, apartamentos y oficinas.",
        calificacion: 4.8,
        serviciosCompletados: 98,
        precio: "Desde $50.000",
        telefono: "+57 301 234 5678",
        disponibilidad: "Todos los días, 7:00 am - 5:00 pm",
        verificado: true,
        lat: 4.6970, lng: -74.0837
    },
    {
        id: "t3",
        nombre: "Daniel P.",
        categoria: "tecnologia",
        oficio: "Soporte técnico",
        icono: "💻",
        descripcion: "Formateo, mantenimiento e instalación de software y redes.",
        calificacion: 4.7,
        serviciosCompletados: 76,
        precio: "Desde $35.000",
        telefono: "+57 302 345 6789",
        disponibilidad: "Lunes a viernes, 9:00 am - 7:00 pm",
        verificado: false,
        lat: 4.6280, lng: -74.0650
    },
    {
        id: "t4",
        nombre: "Laura G.",
        categoria: "belleza",
        oficio: "Peluquería y estética",
        icono: "💇",
        descripcion: "Cortes, color, peinados y tratamientos capilares a domicilio.",
        calificacion: 4.9,
        serviciosCompletados: 154,
        precio: "Desde $45.000",
        telefono: "+57 303 456 7890",
        disponibilidad: "Martes a domingo, 10:00 am - 8:00 pm",
        verificado: true,
        lat: 4.6486, lng: -74.1178
    },
    {
        id: "t5",
        nombre: "Miguel A.",
        categoria: "automovil",
        oficio: "Mecánica automotriz",
        icono: "🚗",
        descripcion: "Diagnóstico, mantenimiento preventivo y reparaciones menores.",
        calificacion: 4.6,
        serviciosCompletados: 61,
        precio: "Desde $60.000",
        telefono: "+57 304 567 8901",
        disponibilidad: "Lunes a sábado, 8:00 am - 5:00 pm",
        verificado: false,
        lat: 4.7590, lng: -74.0450
    },
    {
        id: "t6",
        nombre: "Sofía T.",
        categoria: "educacion",
        oficio: "Clases y tutorías",
        icono: "📚",
        descripcion: "Refuerzo escolar en matemáticas, física e inglés.",
        calificacion: 4.8,
        serviciosCompletados: 89,
        precio: "Desde $30.000",
        telefono: "+57 305 678 9012",
        disponibilidad: "Lunes a viernes, 2:00 pm - 8:00 pm",
        verificado: true,
        lat: 4.6015, lng: -74.0665
    }

];


// Crea la base de datos con los datos semilla si aún no existe

function inicializarBaseDatos() {

    const existente = localStorage.getItem(DB_TRABAJADORES_KEY);

    if (!existente) {

        guardarTrabajadores(trabajadoresSemilla);

    }

}


// Lee todos los trabajadores desde la "base de datos"

function obtenerTrabajadores() {

    const datos =
        JSON.parse(
            localStorage.getItem(DB_TRABAJADORES_KEY)
        ) || [];

    return datos;

}


// Sobrescribe la lista completa de trabajadores

function guardarTrabajadores(lista) {

    localStorage.setItem(
        DB_TRABAJADORES_KEY,
        JSON.stringify(lista)
    );

}


function obtenerTrabajadorPorId(id) {

    return obtenerTrabajadores().find(function (t) {

        return t.id === id;

    });

}


// Actualiza solo la ubicación (y su marca de tiempo) de un
// trabajador en la base de datos. Esta es la función que
// se debería reemplazar por una llamada real al backend
// (por ejemplo, PATCH /api/trabajadores/:id/ubicacion) para
// tener ubicación en tiempo real de verdad, entre dispositivos.

function actualizarUbicacionTrabajador(id, lat, lng) {

    const lista = obtenerTrabajadores();

    const trabajador =
        lista.find(function (t) { return t.id === id; });

    if (!trabajador) return;

    trabajador.lat = lat;
    trabajador.lng = lng;
    trabajador.ultimaActualizacion = Date.now();

    guardarTrabajadores(lista);

}


// ================================
// TRABAJADORES CERCANOS
// ================================

// Fórmula de Haversine: distancia en km entre dos coordenadas

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c =
        2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;

}


function buscarTrabajadoresCercanos() {

    const estado =
        document.getElementById("estadoUbicacion");

    const boton =
        document.getElementById("btnUbicacion");

    if (!navigator.geolocation) {

        estado.innerText =
            "Tu navegador no soporta geolocalización.";

        return;
    }

    boton.disabled = true;

    estado.innerText = "Obteniendo tu ubicación...";

    navigator.geolocation.getCurrentPosition(

        function (posicion) {

            const lat = posicion.coords.latitude;
            const lng = posicion.coords.longitude;

            mostrarTrabajadoresCercanos(lat, lng);

            actualizarMarcadorUsuario(lat, lng);

            boton.disabled = false;

        },

        function (error) {

            boton.disabled = false;

            estado.innerText =
                "No pudimos acceder a tu ubicación. " +
                "Revisa los permisos de tu navegador.";

        }

    );

}


function mostrarTrabajadoresCercanos(lat, lng) {

    const estado =
        document.getElementById("estadoUbicacion");

    const grid =
        document.getElementById("workerGrid");

    const conDistancia =
        obtenerTrabajadores().map(function (trabajador) {

            const distancia =
                calcularDistanciaKm(
                    lat, lng,
                    trabajador.lat, trabajador.lng
                );

            return Object.assign(
                {}, trabajador, { distancia: distancia }
            );

        });

    conDistancia.sort(function (a, b) {

        return a.distancia - b.distancia;

    });

    grid.innerHTML = "";

    if (conDistancia.length === 0) {

        grid.innerHTML =
            '<p class="worker-empty">' +
            "No hay trabajadores disponibles cerca de ti." +
            "</p>";

        estado.innerText = "";

        return;
    }

    conDistancia.forEach(function (trabajador) {

        const tarjeta = document.createElement("div");

        tarjeta.className = "service";

        const insignia =
            trabajador.verificado ?
                '<span class="badge-verificado">✔ Verificado</span>' :
                "";

        tarjeta.innerHTML =
            '<div class="service-image">' +
                trabajador.icono +
            "</div>" +
            '<div class="service-content">' +
                '<div class="service-header">' +
                    "<div>" +
                        "<h3>" + trabajador.oficio + "</h3>" +
                        "<span>👤 " + trabajador.nombre + "</span>" +
                    "</div>" +
                    '<span class="rating">★ ' +
                        trabajador.calificacion +
                    "</span>" +
                "</div>" +
                insignia +
                "<p>" +
                    '<span class="worker-distance">' +
                        trabajador.distancia.toFixed(1) + " km" +
                    "</span>" +
                "</p>" +
                '<div class="price">' + trabajador.precio + "</div>" +
                '<div class="worker-card-buttons">' +
                    '<button class="btn btn-secondary" ' +
                        'onclick="verPerfilTrabajador(\'' + trabajador.id + '\')">' +
                        "Ver perfil" +
                    "</button>" +
                    '<button class="btn btn-primary" ' +
                        'onclick="mostrarMensaje(\'Contactando a ' +
                        trabajador.nombre + '...\')">' +
                        "Contactar" +
                    "</button>" +
                "</div>" +
            "</div>";

        grid.appendChild(tarjeta);

    });

    estado.innerText =
        "Mostrando " + conDistancia.length +
        " trabajadores ordenados por cercanía.";

}


// ================================
// PERFIL DEL TRABAJADOR
// ================================

function verPerfilTrabajador(id) {

    const trabajador = obtenerTrabajadorPorId(id);

    if (!trabajador) return;

    document.getElementById("perfilIcono").innerText =
        trabajador.icono;

    document.getElementById("perfilNombre").innerText =
        trabajador.nombre;

    document.getElementById("perfilOficio").innerText =
        trabajador.oficio;

    document.getElementById("perfilDescripcion").innerText =
        trabajador.descripcion;

    document.getElementById("perfilCalificacion").innerText =
        "★ " + trabajador.calificacion +
        " · " + trabajador.serviciosCompletados +
        " servicios completados";

    document.getElementById("perfilDisponibilidad").innerText =
        trabajador.disponibilidad;

    document.getElementById("perfilTelefono").innerText =
        trabajador.telefono;

    document.getElementById("perfilPrecio").innerText =
        trabajador.precio;

    document.getElementById("perfilVerificado").style.display =
        trabajador.verificado ? "inline-block" : "none";

    document.getElementById("perfilBtnContactar").onclick =
        function () {

            mostrarMensaje(
                "Contactando a " + trabajador.nombre + "..."
            );

        };

    document
        .getElementById("profileModal")
        .classList.add("show");

}


function cerrarPerfil() {

    document
        .getElementById("profileModal")
        .classList.remove("show");

}


// ================================
// MAPA EN TIEMPO REAL
// ================================

let mapaLeaflet = null;
let marcadorUsuario = null;
const marcadoresTrabajadores = {};

// Cada cuántos milisegundos se simula el movimiento de
// los trabajadores. En un backend real, en vez de simular
// esto se reemplazaría por datos que llegan por WebSocket,
// polling a la API REST, o un listener de base de datos en
// tiempo real (Firebase, Supabase, etc.).
const INTERVALO_SIMULACION_MS = 4000;


function iniciarMapaTrabajadores() {

    const contenedor =
        document.getElementById("mapaTrabajadores");

    if (!contenedor || typeof L === "undefined") return;

    mapaLeaflet = L.map("mapaTrabajadores").setView(
        [4.6800, -74.0700], 12
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "© OpenStreetMap"
        }
    ).addTo(mapaLeaflet);

    obtenerTrabajadores().forEach(function (trabajador) {

        const icono = L.divIcon({

            className: "",

            html:
                '<div class="marcador-trabajador">' +
                    trabajador.icono +
                "</div>",

            iconSize: [34, 34],
            iconAnchor: [17, 17]

        });

        const marcador =
            L.marker(
                [trabajador.lat, trabajador.lng],
                { icon: icono }
            ).addTo(mapaLeaflet);

        marcador.bindPopup(
            '<div class="popup-trabajador">' +
                "<strong>" + trabajador.nombre + "</strong>" +
                trabajador.oficio + " · ★ " + trabajador.calificacion +
                '<button class="popup-btn-perfil" ' +
                    'onclick="verPerfilTrabajador(\'' + trabajador.id + '\')">' +
                    "Ver perfil" +
                "</button>" +
            "</div>"
        );

        marcadoresTrabajadores[trabajador.id] = marcador;

    });

    // Simular actualizaciones de ubicación en tiempo real,
    // guardándolas en la base de datos del cliente

    setInterval(
        simularMovimientoTrabajadores,
        INTERVALO_SIMULACION_MS
    );

}


function simularMovimientoTrabajadores() {

    obtenerTrabajadores().forEach(function (trabajador) {

        // Pequeño desplazamiento aleatorio (~ hasta 80 m)

        const nuevaLat =
            trabajador.lat + (Math.random() - 0.5) * 0.0008;

        const nuevaLng =
            trabajador.lng + (Math.random() - 0.5) * 0.0008;

        actualizarUbicacionTrabajador(
            trabajador.id, nuevaLat, nuevaLng
        );

        const marcador =
            marcadoresTrabajadores[trabajador.id];

        if (marcador) {

            marcador.setLatLng([nuevaLat, nuevaLng]);

        }

    });

}


function actualizarMarcadorUsuario(lat, lng) {

    if (!mapaLeaflet) return;

    if (marcadorUsuario) {

        marcadorUsuario.setLatLng([lat, lng]);

    } else {

        const icono = L.divIcon({

            className: "",

            html: '<div class="marcador-usuario"></div>',

            iconSize: [18, 18],
            iconAnchor: [9, 9]

        });

        marcadorUsuario =
            L.marker([lat, lng], { icon: icono })
                .addTo(mapaLeaflet)
                .bindPopup("Tu ubicación");

    }

    mapaLeaflet.setView([lat, lng], 13);

}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        inicializarBaseDatos();
        iniciarMapaTrabajadores();

    }
);


// ================================
// SISTEMA DE LOGIN Y REGISTRO
// ================================



// ================================
// SISTEMA DE LOGIN Y REGISTRO
// ================================


// ABRIR LOGIN

function abrirLogin() {

    const modal =
        document.getElementById("authModal");

    modal.classList.add("show");

    mostrarLogin();
}


// CERRAR MODAL

function cerrarAuth() {

    const modal =
        document.getElementById("authModal");

    modal.classList.remove("show");
}


// MOSTRAR LOGIN

function mostrarLogin() {

    document
        .getElementById("loginForm")
        .classList.remove("hidden");

    document
        .getElementById("registerForm")
        .classList.add("hidden");


    document
        .getElementById("loginTab")
        .classList.add("active");

    document
        .getElementById("registerTab")
        .classList.remove("active");

}


// MOSTRAR REGISTRO

function mostrarRegistro() {

    document
        .getElementById("loginForm")
        .classList.add("hidden");

    document
        .getElementById("registerForm")
        .classList.remove("hidden");


    document
        .getElementById("loginTab")
        .classList.remove("active");

    document
        .getElementById("registerTab")
        .classList.add("active");

}


// ================================
// REGISTRAR USUARIO CON DJANGO
// ================================

const API_USUARIOS = "http://127.0.0.1:8000/api/usuarios/";

function guardarTokens(tokens) {
    sessionStorage.setItem("serviappAccessToken", tokens.access);
    if (tokens.refresh) {
        sessionStorage.setItem("serviappRefreshToken", tokens.refresh);
    }
}

function limpiarSesion() {
    sessionStorage.removeItem("serviappAccessToken");
    sessionStorage.removeItem("serviappRefreshToken");
    sessionStorage.removeItem("serviappUsuario");
}

async function solicitudAutenticada(url, opciones = {}, renovar = true) {
    const access = sessionStorage.getItem("serviappAccessToken");
    const headers = new Headers(opciones.headers || {});
    if (access) headers.set("Authorization", "Bearer " + access);

    let respuesta = await fetch(url, { ...opciones, headers });
    if (respuesta.status !== 401 || !renovar) return respuesta;

    const refresh = sessionStorage.getItem("serviappRefreshToken");
    if (!refresh) return respuesta;

    const renovacion = await fetch(API_USUARIOS + "token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refresh })
    });
    if (!renovacion.ok) {
        limpiarSesion();
        return respuesta;
    }

    const tokens = await renovacion.json();
    guardarTokens(tokens);
    const nuevosHeaders = new Headers(opciones.headers || {});
    nuevosHeaders.set("Authorization", "Bearer " + tokens.access);
    respuesta = await fetch(url, { ...opciones, headers: nuevosHeaders });
    return respuesta;
}

async function registrarUsuario(event) {

    event.preventDefault();

    const nombre = document
        .getElementById("registerName")
        .value.trim();

    const email = document
        .getElementById("registerEmail")
        .value.trim()
        .toLowerCase();

    const password = document
        .getElementById("registerPassword")
        .value;

    const telefono = document
        .getElementById("registerTelefono")
        .value.trim();

    const tipo = document
        .getElementById("registerType")
        .value;

    // Separar nombre y apellido
    const partesNombre = nombre.split(" ");

    const first_name = partesNombre.shift();
    const last_name = partesNombre.join(" ");

    // Convertir tipo de cuenta
    const es_trabajador = tipo === "profesional";

    try {

        const respuesta = await fetch(
            "http://127.0.0.1:8000/api/usuarios/registro/",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    email: email,
                    password: password,
                    first_name: first_name,
                    last_name: last_name,
                    telefono: telefono,
                    es_trabajador: es_trabajador

                })
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {

            console.error(datos);

            mostrarMensaje(
                "Error al registrar. Verifica los datos."
            );

            return;
        }

        mostrarMensaje(
            "¡Cuenta creada correctamente!"
        );

        document
            .getElementById("registerForm")
            .reset();

        setTimeout(function () {

            mostrarLogin();

        }, 1000);

    } catch (error) {

        console.error(error);

        mostrarMensaje(
            "No se pudo conectar con el servidor."
        );

    }

}


// ================================
// INICIAR SESIÓN
// ================================

async function iniciarSesion(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const boton = event.submitter || document.querySelector("#loginForm button[type='submit']");

    if (boton) boton.disabled = true;
    try {
        const respuesta = await fetch(API_USUARIOS + "token/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mostrarMensaje("Correo o contraseña incorrectos.");
            return;
        }

        guardarTokens(datos);
        const perfilRespuesta = await solicitudAutenticada(API_USUARIOS + "perfil/");
        if (!perfilRespuesta.ok) {
            limpiarSesion();
            mostrarMensaje("No pudimos cargar tu perfil. Intenta iniciar sesión de nuevo.");
            return;
        }

        const usuario = await perfilRespuesta.json();
        sessionStorage.setItem("serviappUsuario", JSON.stringify(usuario));
        document.getElementById("loginForm").reset();
        cerrarAuth();
        actualizarUsuario(usuario);
        mostrarMensaje("¡Bienvenido, " + nombreCompleto(usuario) + "!");
    } catch (error) {
        console.error(error);
        mostrarMensaje("No se pudo conectar con el servidor.");
    } finally {
        if (boton) boton.disabled = false;
    }
}

function nombreCompleto(usuario) {
    return [usuario.first_name, usuario.last_name].filter(Boolean).join(" ") || usuario.email;
}


// ================================
// ACTUALIZAR BOTÓN DE USUARIO
// ================================

function actualizarUsuario(usuario) {

    const botones =
        document.querySelectorAll(
            ".navbar .btn-primary"
        );


    if (botones.length > 0) {

        botones[0].innerText = nombreCompleto(usuario);

        botones[0].onclick =
            cerrarSesion;

    }

}


// ================================
// CERRAR SESIÓN
// ================================

function cerrarSesion() {
    limpiarSesion();
    mostrarMensaje(
        "Sesión cerrada correctamente."
    );


    setTimeout(function () {

        location.reload();

    }, 800);

}


// ================================
// RESTAURAR Y VALIDAR LA SESIÓN AL CARGAR
// ================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {
        // El flujo anterior guardaba contraseñas sin cifrar en localStorage.
        localStorage.removeItem("serviappUsuarios");
        localStorage.removeItem("serviappSesion");

        if (!sessionStorage.getItem("serviappRefreshToken")) return;
        try {
            const respuesta = await solicitudAutenticada(API_USUARIOS + "perfil/");
            if (!respuesta.ok) {
                limpiarSesion();
                return;
            }
            const usuario = await respuesta.json();
            sessionStorage.setItem("serviappUsuario", JSON.stringify(usuario));
            actualizarUsuario(usuario);
        } catch (error) {
            console.error(error);
        }
    }
);
