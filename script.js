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


// Los perfiles reales y la búsqueda están en perfil-profesional.js.

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
        if (usuario.es_trabajador && typeof cargarMiPerfilProfesional === "function") {
            await cargarMiPerfilProfesional({ abrirSiFalta: true });
        }
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

    if (typeof actualizarBotonPerfilProfesional === "function") {
        actualizarBotonPerfilProfesional(usuario);
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
            if (usuario.es_trabajador && typeof cargarMiPerfilProfesional === "function") {
                await cargarMiPerfilProfesional({ abrirSiFalta: true });
            }
        } catch (error) {
            console.error(error);
        }
    }
);
