// Solicitudes de servicio, reseñas, notificaciones y fotos del portafolio.
const API_SOLICITUDES = API_USUARIOS + "solicitudes/";
const API_RESENAS = API_USUARIOS + "resenas/";
const API_NOTIFICACIONES = API_USUARIOS + "notificaciones/";
const API_TRABAJOS = API_USUARIOS + "perfil-profesional/trabajos/";

let profesionalParaSolicitud = null;

function urlMediaServiApp(valor) {
    if (!valor) return "";
    try {
        return new URL(valor, API_USUARIOS).href;
    } catch (error) {
        return valor;
    }
}

function usuarioInteracciones() {
    return usuarioActualServiApp();
}

function crearNodo(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
}

function crearTarjetaTrabajo(trabajo, permitirEliminar) {
    const tarjeta = crearNodo("article", "portfolio-item");
    const imagen = document.createElement("img");
    imagen.src = urlMediaServiApp(trabajo.foto);
    imagen.alt = trabajo.titulo || "Trabajo realizado por el profesional";
    imagen.loading = "lazy";
    tarjeta.appendChild(imagen);
    const cuerpo = crearNodo("div", "portfolio-item-body");
    cuerpo.appendChild(crearNodo("strong", "", trabajo.titulo));
    if (trabajo.descripcion) cuerpo.appendChild(crearNodo("p", "", trabajo.descripcion));
    tarjeta.appendChild(cuerpo);
    if (permitirEliminar) {
        const eliminar = crearNodo("button", "portfolio-delete", "Eliminar foto");
        eliminar.type = "button";
        eliminar.addEventListener("click", () => eliminarTrabajoProfesional(trabajo.id));
        tarjeta.appendChild(eliminar);
    }
    return tarjeta;
}

window.cargarTrabajosPropios = async function () {
    const grid = document.getElementById("portfolioOwnGrid");
    if (!grid || !sessionStorage.getItem("serviappAccessToken")) return;
    grid.replaceChildren(crearNodo("p", "worker-empty", "Cargando fotos…"));
    try {
        const respuesta = await solicitudAutenticada(API_TRABAJOS);
        if (!respuesta.ok) throw new Error("No se pudieron cargar las fotos.");
        const trabajos = await respuesta.json();
        grid.replaceChildren();
        if (!trabajos.length) {
            grid.appendChild(crearNodo("p", "worker-empty", "Todavía no has subido fotos de trabajos."));
            return;
        }
        trabajos.forEach((trabajo) => grid.appendChild(crearTarjetaTrabajo(trabajo, true)));
    } catch (error) {
        console.error(error);
        grid.replaceChildren(crearNodo("p", "worker-empty", "No se pudieron cargar tus fotos."));
    }
};

window.guardarTrabajoProfesional = async function (event) {
    event.preventDefault();
    const archivo = document.getElementById("portfolioPhoto").files[0];
    const feedback = document.getElementById("portfolioFeedback");
    const boton = document.getElementById("portfolioSave");
    if (!archivo) {
        feedback.textContent = "Selecciona una foto del trabajo.";
        return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
        feedback.textContent = "La foto no puede superar 5 MB.";
        return;
    }

    const datos = new FormData();
    datos.append("titulo", document.getElementById("portfolioTitle").value.trim());
    datos.append("descripcion", document.getElementById("portfolioDescription").value.trim());
    datos.append("foto", archivo);
    boton.disabled = true;
    feedback.textContent = "Subiendo foto…";
    try {
        const respuesta = await solicitudAutenticada(API_TRABAJOS, { method: "POST", body: datos });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(mensajeErrorApi(resultado, "No se pudo subir la foto."));
        document.getElementById("portfolioForm").reset();
        feedback.textContent = "Foto agregada a tu perfil.";
        await window.cargarTrabajosPropios();
        await cargarDirectorioProfesionales();
    } catch (error) {
        console.error(error);
        feedback.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
        boton.disabled = false;
    }
};

async function eliminarTrabajoProfesional(id) {
    if (!window.confirm("¿Quieres eliminar esta foto del perfil?")) return;
    try {
        const respuesta = await solicitudAutenticada(API_TRABAJOS + encodeURIComponent(id) + "/", { method: "DELETE" });
        if (!respuesta.ok) throw new Error("No se pudo eliminar la foto.");
        await window.cargarTrabajosPropios();
        await cargarDirectorioProfesionales();
        mostrarMensaje("Foto eliminada.");
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message || "No se pudo conectar con el servidor.");
    }
}

window.solicitarServicioDesdePerfil = function (perfilId, nombre, oficio) {
    const usuario = usuarioInteracciones();
    if (!usuario) {
        mostrarMensaje("Inicia sesión con una cuenta de cliente para enviar una solicitud.");
        abrirLogin();
        return;
    }
    if (usuario.es_trabajador) {
        mostrarMensaje("Inicia sesión con una cuenta de cliente para solicitar un servicio.");
        return;
    }
    profesionalParaSolicitud = perfilId;
    document.getElementById("requestProfessionalName").textContent = "Solicitud para " + (nombre || "el profesional") + ".";
    document.getElementById("requestService").value = oficio || "";
    document.getElementById("requestFeedback").textContent = "";
    const fecha = document.getElementById("requestDate");
    const fechaMinima = new Date(Date.now() + 60 * 1000);
    fecha.min = new Date(fechaMinima.getTime() - fechaMinima.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById("requestModal").classList.add("show");
};

window.cerrarSolicitud = function () {
    document.getElementById("requestModal").classList.remove("show");
};

window.enviarSolicitudServicio = async function (event) {
    event.preventDefault();
    const boton = document.getElementById("requestSubmit");
    const feedback = document.getElementById("requestFeedback");
    boton.disabled = true;
    feedback.textContent = "Enviando solicitud…";
    const fechaLocal = document.getElementById("requestDate").value;
    const datos = {
        profesional: profesionalParaSolicitud,
        servicio: document.getElementById("requestService").value.trim(),
        descripcion: document.getElementById("requestDescription").value.trim(),
        ubicacion: document.getElementById("requestLocation").value.trim(),
        fecha_solicitada: new Date(fechaLocal).toISOString()
    };
    try {
        const respuesta = await solicitudAutenticada(API_SOLICITUDES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(mensajeErrorApi(resultado, "No se pudo enviar la solicitud."));
        document.getElementById("requestForm").reset();
        window.cerrarSolicitud();
        mostrarMensaje("Solicitud enviada al profesional.");
        await cargarContadorNotificaciones();
    } catch (error) {
        console.error(error);
        feedback.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
        boton.disabled = false;
    }
};

function estadoSolicitudLabel(estado) {
    return {
        pendiente: "Pendiente",
        aceptada: "Aceptada",
        rechazada: "Rechazada",
        completada: "Completada",
        cancelada: "Cancelada"
    }[estado] || estado;
}

function botonAccionSolicitud(texto, clase, accion) {
    const boton = crearNodo("button", "btn " + clase, texto);
    boton.type = "button";
    boton.addEventListener("click", accion);
    return boton;
}

function crearTarjetaSolicitud(solicitud, esProfesional) {
    const tarjeta = crearNodo("article", "dashboard-item");
    tarjeta.appendChild(crearNodo("strong", "", solicitud.servicio));
    tarjeta.appendChild(crearNodo("p", "", esProfesional
        ? "Cliente: " + solicitud.cliente_nombre
        : "Profesional: " + solicitud.profesional_nombre));
    tarjeta.appendChild(crearNodo("p", "", solicitud.descripcion));
    tarjeta.appendChild(crearNodo("p", "", "Ubicación: " + solicitud.ubicacion));
    tarjeta.appendChild(crearNodo("small", "", "Fecha solicitada: " + new Date(solicitud.fecha_solicitada).toLocaleString("es-CO")));
    tarjeta.appendChild(crearNodo("p", "", "Estado: " + estadoSolicitudLabel(solicitud.estado)));
    const acciones = crearNodo("div", "dashboard-item-actions");

    if (esProfesional && solicitud.estado === "pendiente") {
        acciones.appendChild(botonAccionSolicitud("Aceptar", "btn-primary", () => cambiarEstadoSolicitud(solicitud.id, "aceptada")));
        acciones.appendChild(botonAccionSolicitud("Rechazar", "btn-secondary", () => cambiarEstadoSolicitud(solicitud.id, "rechazada")));
    } else if (esProfesional && solicitud.estado === "aceptada") {
        acciones.appendChild(botonAccionSolicitud("Marcar completada", "btn-primary", () => cambiarEstadoSolicitud(solicitud.id, "completada")));
    } else if (!esProfesional && ["pendiente", "aceptada"].includes(solicitud.estado)) {
        acciones.appendChild(botonAccionSolicitud("Cancelar solicitud", "btn-secondary", () => cambiarEstadoSolicitud(solicitud.id, "cancelada")));
    } else if (!esProfesional && solicitud.estado === "completada" && !solicitud.resena_publicada) {
        acciones.appendChild(botonAccionSolicitud("Calificar servicio", "btn-primary", () => abrirFormularioResena(solicitud.id)));
    }

    if (acciones.childElementCount) tarjeta.appendChild(acciones);
    return tarjeta;
}

window.abrirPanelSolicitudes = async function () {
    if (!usuarioInteracciones()) {
        abrirLogin();
        return;
    }
    document.getElementById("dashboardTitle").textContent = usuarioInteracciones().es_trabajador
        ? "Solicitudes recibidas"
        : "Mis solicitudes";
    document.getElementById("dashboardModal").classList.add("show");
    await cargarSolicitudes();
};

window.cerrarPanelSolicitudes = function () {
    document.getElementById("dashboardModal").classList.remove("show");
};

async function cargarSolicitudes() {
    const lista = document.getElementById("dashboardRequests");
    const feedback = document.getElementById("dashboardFeedback");
    lista.replaceChildren();
    feedback.textContent = "Cargando solicitudes…";
    try {
        const respuesta = await solicitudAutenticada(API_SOLICITUDES);
        const solicitudes = await respuesta.json();
        if (!respuesta.ok) throw new Error("No se pudieron cargar las solicitudes.");
        feedback.textContent = solicitudes.length ? "" : "Todavía no hay solicitudes.";
        solicitudes.forEach((solicitud) => lista.appendChild(crearTarjetaSolicitud(solicitud, usuarioInteracciones().es_trabajador)));
    } catch (error) {
        console.error(error);
        feedback.textContent = error.message || "No se pudo conectar con el servidor.";
    }
}

async function cambiarEstadoSolicitud(id, estado) {
    try {
        const respuesta = await solicitudAutenticada(API_SOLICITUDES + encodeURIComponent(id) + "/", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: estado })
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(mensajeErrorApi(resultado, "No se pudo actualizar la solicitud."));
        await cargarSolicitudes();
        await cargarContadorNotificaciones();
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message || "No se pudo conectar con el servidor.");
    }
}

function abrirFormularioResena(solicitudId) {
    document.getElementById("reviewForm").reset();
    document.getElementById("reviewRequestId").value = solicitudId;
    document.getElementById("reviewFeedback").textContent = "";
    document.getElementById("reviewModal").classList.add("show");
}

window.cerrarResena = function () {
    document.getElementById("reviewModal").classList.remove("show");
};

window.enviarResena = async function (event) {
    event.preventDefault();
    const boton = document.getElementById("reviewSubmit");
    const feedback = document.getElementById("reviewFeedback");
    boton.disabled = true;
    feedback.textContent = "Publicando reseña…";
    try {
        const respuesta = await solicitudAutenticada(API_RESENAS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                solicitud: document.getElementById("reviewRequestId").value,
                calificacion: Number(document.getElementById("reviewRating").value),
                comentario: document.getElementById("reviewComment").value.trim()
            })
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(mensajeErrorApi(resultado, "No se pudo publicar la reseña."));
        window.cerrarResena();
        await cargarSolicitudes();
        await cargarContadorNotificaciones();
        mostrarMensaje("Gracias por compartir tu opinión.");
    } catch (error) {
        console.error(error);
        feedback.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
        boton.disabled = false;
    }
};

window.abrirNotificaciones = async function () {
    if (!usuarioInteracciones()) {
        abrirLogin();
        return;
    }
    document.getElementById("notificationsModal").classList.add("show");
    await Promise.all([cargarNotificaciones(), cargarPreferenciasNotificaciones()]);
};

window.cerrarNotificaciones = function () {
    document.getElementById("notificationsModal").classList.remove("show");
};

async function cargarNotificaciones() {
    const lista = document.getElementById("notificationsList");
    lista.replaceChildren(crearNodo("p", "worker-empty", "Cargando notificaciones…"));
    try {
        const respuesta = await solicitudAutenticada(API_NOTIFICACIONES);
        const notificaciones = await respuesta.json();
        if (!respuesta.ok) throw new Error("No se pudieron cargar las notificaciones.");
        lista.replaceChildren();
        if (!notificaciones.length) lista.appendChild(crearNodo("p", "worker-empty", "No tienes notificaciones."));
        notificaciones.forEach((notificacion) => {
            const tarjeta = crearNodo("article", "notification-item" + (notificacion.leida ? "" : " unread"));
            tarjeta.appendChild(crearNodo("strong", "notification-title", notificacion.titulo || "Notificación"));
            tarjeta.appendChild(crearNodo("p", "", notificacion.mensaje));
            tarjeta.appendChild(crearNodo("small", "", new Date(notificacion.creado).toLocaleString("es-CO")));
            if (notificacion.destino === "solicitudes") {
                tarjeta.appendChild(botonAccionSolicitud("Ver solicitudes", "btn-secondary", () => {
                    window.cerrarNotificaciones();
                    window.abrirPanelSolicitudes();
                }));
            }
            if (!notificacion.leida) {
                tarjeta.appendChild(botonAccionSolicitud("Marcar como leída", "btn-secondary", () => marcarNotificacionLeida(notificacion.id)));
            }
            lista.appendChild(tarjeta);
        });
        await cargarContadorNotificaciones(notificaciones);
    } catch (error) {
        console.error(error);
        lista.replaceChildren(crearNodo("p", "worker-empty", error.message || "No se pudieron cargar las notificaciones."));
    }
}

async function cargarPreferenciasNotificaciones() {
    const lista = document.getElementById("notificationPreferences");
    const feedback = document.getElementById("notificationPreferencesFeedback");
    if (!lista) return;
    lista.replaceChildren(crearNodo("p", "worker-empty", "Cargando preferencias…"));
    try {
        const respuesta = await solicitudAutenticada(API_NOTIFICACIONES + "preferencias/");
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(mensajeErrorApi(resultado, "No se pudieron cargar las preferencias."));
        lista.replaceChildren();
        resultado.preferencias.forEach((preferencia) => {
            const etiqueta = crearNodo("label", "notification-preference");
            const control = document.createElement("input");
            control.type = "checkbox";
            control.checked = preferencia.activada;
            control.addEventListener("change", () => guardarPreferenciaNotificacion(preferencia.tipo, control));
            etiqueta.append(control, crearNodo("span", "", preferencia.nombre));
            lista.appendChild(etiqueta);
        });
        feedback.textContent = "Los cambios se guardan automáticamente.";
    } catch (error) {
        lista.replaceChildren();
        feedback.textContent = error.message || "No se pudieron cargar las preferencias.";
    }
}

async function guardarPreferenciaNotificacion(tipo, control) {
    const feedback = document.getElementById("notificationPreferencesFeedback");
    control.disabled = true;
    feedback.textContent = "Guardando preferencia…";
    try {
        const respuesta = await solicitudAutenticada(API_NOTIFICACIONES + "preferencias/", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferencias: { [tipo]: control.checked } }),
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(mensajeErrorApi(resultado, "No se pudo guardar la preferencia."));
        feedback.textContent = "Preferencia guardada.";
    } catch (error) {
        control.checked = !control.checked;
        feedback.textContent = error.message || "No se pudo guardar la preferencia.";
    } finally {
        control.disabled = false;
    }
}

window.marcarTodasLeidas = async function () {
    try {
        const respuesta = await solicitudAutenticada(API_NOTIFICACIONES, { method: "POST" });
        if (!respuesta.ok) throw new Error("No se pudieron marcar las notificaciones.");
        await cargarNotificaciones();
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message || "No se pudo conectar con el servidor.");
    }
};

async function marcarNotificacionLeida(id) {
    try {
        const respuesta = await solicitudAutenticada(API_NOTIFICACIONES + encodeURIComponent(id) + "/", { method: "PATCH" });
        if (!respuesta.ok) throw new Error("No se pudo actualizar la notificación.");
        await cargarNotificaciones();
    } catch (error) {
        console.error(error);
        mostrarMensaje(error.message || "No se pudo conectar con el servidor.");
    }
}

window.cargarContadorNotificaciones = async function (datosPrevios) {
    const boton = document.getElementById("btnNotificaciones");
    const contador = document.getElementById("notificationCount");
    if (!usuarioInteracciones() || !sessionStorage.getItem("serviappAccessToken")) {
        boton.hidden = true;
        return;
    }
    try {
        const datos = datosPrevios || await (await solicitudAutenticada(API_NOTIFICACIONES)).json();
        const sinLeer = datos.filter((notificacion) => !notificacion.leida).length;
        boton.hidden = false;
        contador.hidden = !sinLeer;
        contador.textContent = String(sinLeer);
    } catch (error) {
        console.error(error);
    }
};

window.actualizarBotonesInteracciones = function (usuario) {
    const solicitudes = document.getElementById("btnSolicitudes");
    const notificaciones = document.getElementById("btnNotificaciones");
    solicitudes.hidden = !usuario;
    notificaciones.hidden = !usuario;
    if (usuario) window.cargarContadorNotificaciones();
};

document.addEventListener("DOMContentLoaded", function () {
    const archivoPerfil = document.getElementById("workerProfilePhoto");
    archivoPerfil?.addEventListener("change", () => {
        const archivo = archivoPerfil.files[0];
        const preview = document.getElementById("workerProfilePhotoPreview");
        if (!archivo) return;
        if (archivo.size > 5 * 1024 * 1024) {
            archivoPerfil.value = "";
            mostrarMensaje("La foto no puede superar 5 MB.");
            return;
        }
        preview.src = URL.createObjectURL(archivo);
        preview.hidden = false;
    });

    ["requestModal", "dashboardModal", "notificationsModal", "reviewModal"].forEach((id) => {
        const modal = document.getElementById(id);
        modal?.addEventListener("click", (event) => {
            if (event.target === modal) modal.classList.remove("show");
        });
    });

    const usuario = usuarioInteracciones();
    if (usuario) window.actualizarBotonesInteracciones(usuario);
});
