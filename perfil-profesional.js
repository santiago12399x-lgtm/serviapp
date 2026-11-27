// Perfil profesional, directorio y búsqueda conectados a Django REST.
const API_PERFIL_PROFESIONAL = API_USUARIOS + "perfil-profesional/";
const API_PROFESIONALES = API_USUARIOS + "profesionales/";

document.getElementById("serviceGrid")?.replaceChildren();
document.getElementById("workerGrid")?.replaceChildren();

const ICONOS_CATEGORIA = {
    hogar: "🔧",
    limpieza: "🧹",
    tecnologia: "💻",
    belleza: "💇",
    automovil: "🚗",
    educacion: "📚",
    otros: "🛠️"
};

let perfilProfesionalGuardado = null;

function usuarioActualServiApp() {
    try {
        return JSON.parse(sessionStorage.getItem("serviappUsuario") || "null");
    } catch (error) {
        return null;
    }
}

function actualizarBotonPerfilProfesional(usuario) {
    const boton = document.getElementById("btnPerfilProfesional");
    if (boton) boton.hidden = !usuario || !usuario.es_trabajador;
}

function mensajeErrorApi(datos, fallback) {
    if (!datos || typeof datos !== "object") return fallback;
    const mensajes = Object.values(datos).flat().filter(Boolean);
    return mensajes.length ? mensajes.join(" ") : (datos.detail || fallback);
}

function abrirEditorPerfilProfesional(perfil) {
    const usuario = usuarioActualServiApp();
    if (!usuario || !usuario.es_trabajador) {
        mostrarMensaje("Inicia sesión con una cuenta profesional para editar este perfil.");
        return;
    }

    perfilProfesionalGuardado = perfil || null;
    const formulario = document.getElementById("workerProfileForm");
    formulario.reset();
    document.getElementById("workerProfileTitle").textContent = perfil
        ? "Edita tu perfil profesional"
        : "Completa tu perfil profesional";
    document.getElementById("workerCategory").value = perfil?.categoria || "";
    document.getElementById("workerTrade").value = perfil?.oficio || "";
    document.getElementById("workerServices").value = perfil?.servicios || "";
    document.getElementById("workerDescription").value = perfil?.descripcion || "";
    document.getElementById("workerExperience").value = perfil?.experiencia_anios ?? 0;
    document.getElementById("workerLocation").value = perfil?.ubicacion || "";
    document.getElementById("workerLatitude").value = perfil?.latitud ?? "";
    document.getElementById("workerLongitude").value = perfil?.longitud ?? "";
    document.getElementById("workerAvailability").value = perfil?.disponibilidad || "";
    document.getElementById("workerRate").value = perfil?.tarifa_desde || "";
    document.getElementById("workerPhonePublic").checked = Boolean(perfil?.telefono_publico);
    const fotoPreview = document.getElementById("workerProfilePhotoPreview");
    fotoPreview.hidden = !perfil?.foto_perfil;
    fotoPreview.src = perfil?.foto_perfil ? urlMediaServiApp(perfil.foto_perfil) : "";
    document.getElementById("workerProfilePhoto").value = "";
    const portfolioEditor = document.getElementById("portfolioEditor");
    portfolioEditor.hidden = !perfil;
    document.getElementById("workerProfileFeedback").textContent = "";
    document.getElementById("workerProfileSave").disabled = false;
    document.getElementById("workerProfileEditor").classList.add("show");
    if (typeof inicializarSelectorUbicacion === "function") {
        inicializarSelectorUbicacion(perfil?.latitud, perfil?.longitud);
    }
    if (perfil && typeof cargarTrabajosPropios === "function") cargarTrabajosPropios();
}

function cerrarEditorPerfilProfesional() {
    document.getElementById("workerProfileEditor").classList.remove("show");
}

async function cargarMiPerfilProfesional(opciones = {}) {
    const usuario = usuarioActualServiApp();
    if (!usuario || !usuario.es_trabajador) return;
    actualizarBotonPerfilProfesional(usuario);

    try {
        const respuesta = await solicitudAutenticada(API_PERFIL_PROFESIONAL);
        if (respuesta.status === 404) {
            perfilProfesionalGuardado = null;
            if (opciones.abrirSiFalta) abrirEditorPerfilProfesional(null);
            return true;
        }
        if (!respuesta.ok) {
            if (respuesta.status !== 401) {
                mostrarMensaje("No pudimos cargar tu perfil profesional.");
            }
            return false;
        }
        perfilProfesionalGuardado = await respuesta.json();
        return true;
    } catch (error) {
        console.error(error);
        mostrarMensaje("No se pudo conectar con el servidor para cargar tu perfil.");
        return false;
    }
}

async function abrirMiPerfilProfesional() {
    const usuario = usuarioActualServiApp();
    if (!usuario) {
        abrirLogin();
        return;
    }
    if (!usuario.es_trabajador) {
        mostrarMensaje("Esta opción está disponible para cuentas profesionales.");
        return;
    }
    const cargado = await cargarMiPerfilProfesional();
    if (!cargado) return;
    abrirEditorPerfilProfesional(perfilProfesionalGuardado);
}

function iniciarFlujoProfesional() {
    const usuario = usuarioActualServiApp();
    if (usuario?.es_trabajador) {
        abrirMiPerfilProfesional();
        return;
    }
    if (usuario) {
        mostrarMensaje("Para ofrecer servicios necesitas una cuenta profesional.");
        return;
    }
    abrirLogin();
    mostrarRegistro();
    const selector = document.getElementById("registerType");
    if (selector) selector.value = "profesional";
}

async function guardarPerfilProfesional(event) {
    event.preventDefault();
    const boton = document.getElementById("workerProfileSave");
    const feedback = document.getElementById("workerProfileFeedback");
    boton.disabled = true;
    feedback.textContent = "Guardando tu perfil…";

    const tarifa = document.getElementById("workerRate").value.trim();
    const datos = new FormData();
    datos.append("categoria", document.getElementById("workerCategory").value);
    datos.append("oficio", document.getElementById("workerTrade").value.trim());
    datos.append("servicios", document.getElementById("workerServices").value.trim());
    datos.append("descripcion", document.getElementById("workerDescription").value.trim());
    datos.append("experiencia_anios", document.getElementById("workerExperience").value);
    datos.append("ubicacion", document.getElementById("workerLocation").value.trim());
    datos.append("latitud", document.getElementById("workerLatitude").value);
    datos.append("longitud", document.getElementById("workerLongitude").value);
    datos.append("disponibilidad", document.getElementById("workerAvailability").value.trim());
    datos.append("tarifa_desde", tarifa);
    datos.append("telefono_publico", document.getElementById("workerPhonePublic").checked ? "true" : "false");
    const foto = document.getElementById("workerProfilePhoto").files[0];
    if (foto) datos.append("foto_perfil", foto);

    try {
        const respuesta = await solicitudAutenticada(API_PERFIL_PROFESIONAL, {
            method: perfilProfesionalGuardado ? "PATCH" : "POST",
            body: datos
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
            feedback.textContent = mensajeErrorApi(resultado, "No se pudo guardar el perfil.");
            return;
        }

        perfilProfesionalGuardado = resultado;
        document.getElementById("portfolioEditor").hidden = false;
        feedback.textContent = "Perfil guardado correctamente.";
        mostrarMensaje("Tu perfil profesional quedó guardado.");
        await cargarDirectorioProfesionales();
        setTimeout(cerrarEditorPerfilProfesional, 500);
    } catch (error) {
        console.error(error);
        feedback.textContent = "No se pudo conectar con el servidor. Intenta de nuevo.";
    } finally {
        boton.disabled = false;
    }
}

function precioProfesional(valor) {
    if (valor === null || valor === undefined || valor === "") return "Tarifa a convenir";
    return "Desde $" + new Intl.NumberFormat("es-CO").format(Number(valor)) + " COP";
}

function crearElemento(tag, className, texto) {
    const elemento = document.createElement(tag);
    if (className) elemento.className = className;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function crearTarjetaProfesional(profesional) {
    const tarjeta = crearElemento("article", "service");
    const imagen = profesional.foto_perfil
        ? document.createElement("img")
        : crearElemento("div", "service-image", ICONOS_CATEGORIA[profesional.categoria] || "🛠️");
    if (profesional.foto_perfil) {
        imagen.className = "service-image service-image-photo";
        imagen.src = urlMediaServiApp(profesional.foto_perfil);
        imagen.alt = "Foto de " + (profesional.nombre || "profesional");
    }
    const contenido = crearElemento("div", "service-content");
    const cabecera = crearElemento("div", "service-header");
    const identidad = document.createElement("div");
    identidad.appendChild(crearElemento("h3", "", profesional.oficio || profesional.categoria_nombre || "Servicio profesional"));
    identidad.appendChild(crearElemento("span", "", "👤 " + (profesional.nombre || "Profesional ServiApp")));
    cabecera.appendChild(identidad);
    cabecera.appendChild(crearElemento("span", "profile-category", profesional.categoria_nombre || "Profesional"));
    contenido.appendChild(cabecera);
    contenido.appendChild(crearElemento("p", "", profesional.descripcion || profesional.servicios || "Perfil profesional de ServiApp."));
    if (profesional.promedio_calificacion !== null && profesional.promedio_calificacion !== undefined) {
        contenido.appendChild(crearElemento("p", "review-stars", "★ " + profesional.promedio_calificacion + " · " + profesional.cantidad_resenas + " reseñas"));
    }
    contenido.appendChild(crearElemento("p", "profile-card-location", "📍 " + (profesional.ubicacion || "Ubicación no indicada")));
    contenido.appendChild(crearElemento("div", "price", precioProfesional(profesional.tarifa_desde)));

    const acciones = crearElemento("div", "worker-card-buttons");
    const ver = crearElemento("button", "btn btn-secondary", "Ver perfil");
    ver.type = "button";
    ver.addEventListener("click", () => verPerfilTrabajador(profesional.id));
    acciones.appendChild(ver);

    const contactar = crearElemento("button", "btn btn-primary", "Contactar");
    contactar.type = "button";
    if (profesional.telefono) {
        contactar.addEventListener("click", () => {
            window.location.href = "tel:" + profesional.telefono.replace(/[^+\d]/g, "");
        });
    } else {
        contactar.addEventListener("click", () => mostrarMensaje("El profesional no ha compartido su teléfono público."));
    }
    acciones.appendChild(contactar);
    contenido.appendChild(acciones);
    tarjeta.append(imagen, contenido);
    return tarjeta;
}

function mostrarProfesionales(profesionales, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.replaceChildren();
    if (!profesionales.length) {
        grid.appendChild(crearElemento("p", "worker-empty", "Aún no hay perfiles que coincidan. Vuelve a intentarlo más tarde."));
        return;
    }
    profesionales.forEach((profesional) => grid.appendChild(crearTarjetaProfesional(profesional)));
}

async function pedirProfesionales(filtros = {}) {
    const parametros = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
        if (valor && valor !== "all") parametros.set(clave, valor);
    });
    const respuesta = await fetch(API_PROFESIONALES + (parametros.size ? "?" + parametros.toString() : ""));
    if (!respuesta.ok) throw new Error("No fue posible cargar los perfiles.");
    return respuesta.json();
}

async function cargarDirectorioProfesionales() {
    const status = document.getElementById("searchResultsStatus");
    if (status) status.textContent = "Cargando profesionales…";
    try {
        const perfiles = await pedirProfesionales();
        mostrarProfesionales(perfiles, "serviceGrid");
        mostrarProfesionales(perfiles, "workerGrid");
        if (typeof actualizarMapaProfesionales === "function") actualizarMapaProfesionales(perfiles);
        if (status) status.textContent = perfiles.length
            ? "Mostrando " + perfiles.length + " perfiles profesionales."
            : "Todavía no hay perfiles publicados. Si eres profesional, crea tu perfil para aparecer aquí.";
    } catch (error) {
        console.error(error);
        if (status) status.textContent = "No pudimos conectar con el servidor. Revisa que Django esté activo.";
        mostrarProfesionales([], "serviceGrid");
        mostrarProfesionales([], "workerGrid");
        if (typeof actualizarMapaProfesionales === "function") actualizarMapaProfesionales([]);
    }
}

window.buscarServicios = async function () {
    const status = document.getElementById("searchResultsStatus");
    const grid = document.getElementById("serviceGrid");
    const filtros = {
        q: document.getElementById("search").value.trim(),
        categoria: document.getElementById("category").value,
        ubicacion: document.getElementById("searchLocation").value.trim()
    };
    status.textContent = "Buscando profesionales…";
    grid.replaceChildren();
    try {
        const perfiles = await pedirProfesionales(filtros);
        mostrarProfesionales(perfiles, "serviceGrid");
        if (typeof actualizarMapaProfesionales === "function") actualizarMapaProfesionales(perfiles);
        status.textContent = perfiles.length
            ? "Encontramos " + perfiles.length + " profesional(es)."
            : "No encontramos profesionales con esos filtros. Prueba con otra categoría o zona.";
        document.getElementById("servicios").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
        console.error(error);
        status.textContent = "No se pudo completar la búsqueda. Revisa que el servidor esté activo.";
    }
};

window.seleccionarCategoria = function (categoria) {
    document.getElementById("category").value = categoria;
    window.buscarServicios();
};

window.buscarTrabajadoresCercanos = async function () {
    const estado = document.getElementById("estadoUbicacion");
    estado.textContent = "Cargando perfiles profesionales…";
    try {
        const perfiles = await pedirProfesionales();
        mostrarProfesionales(perfiles, "workerGrid");
        if (typeof actualizarMapaProfesionales === "function") actualizarMapaProfesionales(perfiles);
        estado.textContent = perfiles.length
            ? "Mostrando perfiles de profesionales registrados. Usa el buscador para filtrar por zona."
            : "Aún no hay perfiles profesionales publicados.";
    } catch (error) {
        console.error(error);
        estado.textContent = "No pudimos cargar los perfiles. Revisa que Django esté activo.";
    }
};

window.verPerfilTrabajador = async function (id) {
    try {
        const respuesta = await fetch(API_PROFESIONALES + encodeURIComponent(id) + "/");
        if (!respuesta.ok) throw new Error("No se pudo consultar el perfil.");
        const perfil = await respuesta.json();
        document.getElementById("perfilIcono").textContent = ICONOS_CATEGORIA[perfil.categoria] || "🛠️";
        const fotoPerfil = document.getElementById("perfilFoto");
        fotoPerfil.hidden = !perfil.foto_perfil;
        fotoPerfil.src = perfil.foto_perfil ? urlMediaServiApp(perfil.foto_perfil) : "";
        document.getElementById("perfilIcono").hidden = Boolean(perfil.foto_perfil);
        document.getElementById("perfilNombre").textContent = perfil.nombre || "Profesional ServiApp";
        document.getElementById("perfilOficio").textContent = perfil.oficio || perfil.categoria_nombre || "";
        document.getElementById("perfilDescripcion").textContent = perfil.descripcion || "";
        document.getElementById("perfilCalificacion").textContent = (perfil.experiencia_anios || 0) + " años";
        document.getElementById("perfilServicios").textContent = perfil.servicios || "No especificados";
        document.getElementById("perfilUbicacion").textContent = perfil.ubicacion || "No indicada";
        document.getElementById("perfilDisponibilidad").textContent = perfil.disponibilidad || "Consultar disponibilidad";
        document.getElementById("perfilTelefono").textContent = perfil.telefono || "No compartido";
        document.getElementById("perfilPrecio").textContent = precioProfesional(perfil.tarifa_desde);
        document.getElementById("perfilPromedio").textContent = perfil.promedio_calificacion === null
            ? "Aún sin reseñas"
            : "★ " + perfil.promedio_calificacion + " de 5 · " + perfil.cantidad_resenas + " reseña(s)";
        const galeria = document.getElementById("perfilGaleria");
        galeria.replaceChildren();
        (perfil.trabajos || []).forEach((trabajo) => galeria.appendChild(crearTarjetaTrabajo(trabajo, false)));
        if (!(perfil.trabajos || []).length) {
            galeria.appendChild(crearElemento("p", "worker-empty", "Este profesional todavía no ha publicado fotos de trabajos."));
        }
        const resenas = document.getElementById("perfilResenas");
        resenas.replaceChildren();
        (perfil.resenas || []).forEach((resena) => {
            const tarjetaResena = crearElemento("article", "review-card");
            tarjetaResena.appendChild(crearElemento("strong", "", resena.cliente));
            tarjetaResena.appendChild(crearElemento("div", "review-stars", "★".repeat(resena.calificacion) + "☆".repeat(5 - resena.calificacion)));
            if (resena.comentario) tarjetaResena.appendChild(crearElemento("p", "", resena.comentario));
            tarjetaResena.appendChild(crearElemento("small", "", new Date(resena.creado).toLocaleDateString("es-CO")));
            resenas.appendChild(tarjetaResena);
        });
        if (!(perfil.resenas || []).length) resenas.appendChild(crearElemento("p", "worker-empty", "Aún no hay opiniones publicadas."));
        document.getElementById("perfilVerificado").style.display = "none";
        const boton = document.getElementById("perfilBtnContactar");
        boton.onclick = perfil.telefono
            ? () => { window.location.href = "tel:" + perfil.telefono.replace(/[^+\d]/g, ""); }
            : () => mostrarMensaje("El profesional no ha compartido su teléfono público.");
        document.getElementById("perfilBtnSolicitar").onclick = () => solicitarServicioDesdePerfil(perfil.id, perfil.nombre, perfil.oficio);
        document.getElementById("profileModal").classList.add("show");
    } catch (error) {
        console.error(error);
        mostrarMensaje("No pudimos cargar ese perfil profesional.");
    }
};

window.cerrarPerfil = function () {
    document.getElementById("profileModal").classList.remove("show");
};

document.addEventListener("DOMContentLoaded", function () {
    const usuario = usuarioActualServiApp();
    actualizarBotonPerfilProfesional(usuario);
    cargarDirectorioProfesionales();

    const busqueda = document.getElementById("search");
    const ubicacion = document.getElementById("searchLocation");
    [busqueda, ubicacion].forEach((campo) => campo?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            window.buscarServicios();
        }
    }));

    const editor = document.getElementById("workerProfileEditor");
    editor.addEventListener("click", (event) => {
        if (event.target === editor) cerrarEditorPerfilProfesional();
    });
});
