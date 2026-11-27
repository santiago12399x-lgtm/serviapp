const CENTRO_INICIAL_SERVIAPP = [4.7110, -74.0721];
const URL_MOSAICOS_SERVIAPP = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
let mapaDirectorioProfesionales = null;
let marcadoresDirectorioProfesionales = null;
let mapaSelectorUbicacion = null;
let marcadorSelectorUbicacion = null;
let marcadorUbicacionCliente = null;

function instalarMosaicosOpenStreetMap(mapa) {
    L.tileLayer(URL_MOSAICOS_SERVIAPP, {
        maxZoom: 19,
        noWrap: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);
}

function ajustarTamanoFotosDelMapa() {
    if (!mapaDirectorioProfesionales) return;
    const zoom = mapaDirectorioProfesionales.getZoom();
    const escala = Math.max(0.58, Math.min(1, 0.58 + ((zoom - 3) / 9) * 0.42));
    mapaDirectorioProfesionales.getContainer().style.setProperty("--escala-fotos-trabajadores", escala);
}

function mensajeErrorUbicacion(error, contexto) {
    if (error.code === error.PERMISSION_DENIED) {
        return "El navegador bloqueó el permiso de ubicación. Revisa el permiso del sitio y la ubicación de Windows; también puedes elegir la zona haciendo clic en el mapa.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
        return "El dispositivo no pudo determinar tu ubicación. Activa la ubicación de Windows o elige una zona haciendo clic en el mapa.";
    }
    if (error.code === error.TIMEOUT) {
        return "La búsqueda de ubicación tardó demasiado. Inténtalo otra vez o elige una zona haciendo clic en el mapa.";
    }
    return contexto === "perfil"
        ? "No se pudo obtener la ubicación. Puedes elegir una zona haciendo clic en el mapa."
        : "No se pudo centrar el mapa en tu ubicación. Puedes mover el mapa manualmente.";
}

function inicializarMapaDirectorio() {
    const estado = document.getElementById("mapaEstado");
    if (!window.L) {
        if (estado) estado.textContent = "No se pudo cargar el mapa. Revisa tu conexión a internet.";
        return false;
    }
    if (!mapaDirectorioProfesionales) {
        mapaDirectorioProfesionales = L.map("mapaTrabajadores", {
            minZoom: 3,
            maxBounds: [[-85.05112878, -180], [85.05112878, 180]],
            maxBoundsViscosity: 1,
        }).setView(CENTRO_INICIAL_SERVIAPP, 11);
        instalarMosaicosOpenStreetMap(mapaDirectorioProfesionales);
        marcadoresDirectorioProfesionales = L.featureGroup().addTo(mapaDirectorioProfesionales);
        mapaDirectorioProfesionales.on("zoomend", ajustarTamanoFotosDelMapa);
        ajustarTamanoFotosDelMapa();
        setTimeout(() => mapaDirectorioProfesionales.invalidateSize(), 100);
    }
    return true;
}

function crearIconoFotoProfesional(profesional) {
    const contenedor = document.createElement("div");
    contenedor.className = "map-worker-avatar-marker";

    const mostrarReemplazo = () => {
        const reemplazo = document.createElement("span");
        reemplazo.className = "map-worker-avatar-fallback";
        reemplazo.textContent = "👤";
        contenedor.replaceChildren(reemplazo);
    };

    if (profesional.foto_perfil) {
        const imagen = document.createElement("img");
        imagen.className = "map-worker-avatar-photo";
        imagen.alt = "";
        imagen.src = urlMediaServiApp(profesional.foto_perfil);
        imagen.addEventListener("error", mostrarReemplazo, { once: true });
        contenedor.appendChild(imagen);
    } else {
        mostrarReemplazo();
    }
    return contenedor;
}

window.actualizarMapaProfesionales = function (profesionales) {
    const estado = document.getElementById("mapaEstado");
    if (!inicializarMapaDirectorio()) return;

    marcadoresDirectorioProfesionales.clearLayers();
    const conUbicacion = profesionales.filter((profesional) => {
        return profesional.latitud !== null && profesional.latitud !== undefined && profesional.latitud !== ""
            && profesional.longitud !== null && profesional.longitud !== undefined && profesional.longitud !== ""
            && Number.isFinite(Number(profesional.latitud))
            && Number.isFinite(Number(profesional.longitud));
    });

    conUbicacion.forEach((profesional) => {
        const posicion = [Number(profesional.latitud), Number(profesional.longitud)];
        const nombre = profesional.nombre || "profesional ServiApp";
        const marcador = L.marker(posicion, {
            icon: L.divIcon({
                className: "map-worker-avatar-icon",
                html: crearIconoFotoProfesional(profesional),
                iconSize: [48, 48],
                iconAnchor: [24, 24],
            }),
            title: `Ver perfil de ${nombre}`,
            alt: `Foto de ${nombre}`,
            keyboard: true,
        });
        marcador.on("click", () => window.verPerfilTrabajador(profesional.id));
        marcador.addTo(marcadoresDirectorioProfesionales);
    });

    if (!conUbicacion.length) {
        if (estado) estado.textContent = profesionales.length
            ? "Estos perfiles aún no tienen una ubicación aproximada."
            : "Todavía no hay profesionales con ubicación aproximada.";
        if (!marcadorUbicacionCliente) mapaDirectorioProfesionales.setView(CENTRO_INICIAL_SERVIAPP, 11);
        ajustarTamanoFotosDelMapa();
        return;
    }

    if (estado) estado.textContent = `Mostrando ${conUbicacion.length} ubicación(es) aproximada(s).`;
    if (conUbicacion.length === 1) {
        mapaDirectorioProfesionales.setView(
            [Number(conUbicacion[0].latitud), Number(conUbicacion[0].longitud)],
            12,
        );
    } else {
        mapaDirectorioProfesionales.fitBounds(marcadoresDirectorioProfesionales.getBounds(), { padding: [24, 24], maxZoom: 13 });
    }
    ajustarTamanoFotosDelMapa();
};

function redondearUbicacionProfesional(latitud, longitud) {
    const latitudAproximada = Math.round(Number(latitud) * 100) / 100;
    const longitudAproximada = Math.round(Number(longitud) * 100) / 100;
    document.getElementById("workerLatitude").value = latitudAproximada.toFixed(2);
    document.getElementById("workerLongitude").value = longitudAproximada.toFixed(2);
    const posicion = [latitudAproximada, longitudAproximada];
    if (!marcadorSelectorUbicacion) {
        marcadorSelectorUbicacion = L.circleMarker(posicion, {
            radius: 9,
            color: "#1d4ed8",
            fillColor: "#3b82f6",
            fillOpacity: 0.85,
        }).addTo(mapaSelectorUbicacion);
    } else {
        marcadorSelectorUbicacion.setLatLng(posicion);
    }
    mapaSelectorUbicacion.setView(posicion, 12);
    document.getElementById("workerLocationMapStatus").textContent =
        `Zona aproximada seleccionada: ${latitudAproximada.toFixed(2)}, ${longitudAproximada.toFixed(2)}.`;
}

window.inicializarSelectorUbicacion = function (latitud, longitud) {
    if (!window.L) {
        document.getElementById("workerLocationMapStatus").textContent = "No se pudo cargar el mapa. Puedes guardar tu zona de atención escrita.";
        return;
    }
    const tieneUbicacion = latitud !== null && latitud !== undefined && latitud !== ""
        && longitud !== null && longitud !== undefined && longitud !== "";
    const centro = tieneUbicacion ? [Number(latitud), Number(longitud)] : CENTRO_INICIAL_SERVIAPP;

    if (!mapaSelectorUbicacion) {
        mapaSelectorUbicacion = L.map("selectorUbicacionProfesional").setView(centro, tieneUbicacion ? 12 : 11);
        instalarMosaicosOpenStreetMap(mapaSelectorUbicacion);
        mapaSelectorUbicacion.on("click", (evento) => {
            redondearUbicacionProfesional(evento.latlng.lat, evento.latlng.lng);
        });
    }

    if (marcadorSelectorUbicacion) {
        mapaSelectorUbicacion.removeLayer(marcadorSelectorUbicacion);
        marcadorSelectorUbicacion = null;
    }
    document.getElementById("workerLatitude").value = "";
    document.getElementById("workerLongitude").value = "";
    if (tieneUbicacion) {
        redondearUbicacionProfesional(latitud, longitud);
    } else {
        mapaSelectorUbicacion.setView(CENTRO_INICIAL_SERVIAPP, 11);
        document.getElementById("workerLocationMapStatus").textContent = "Haz clic en el mapa para elegir una zona aproximada.";
    }
    setTimeout(() => mapaSelectorUbicacion.invalidateSize(), 100);
};

window.usarUbicacionActualProfesional = function () {
    if (!navigator.geolocation) {
        mostrarMensaje("Este navegador no permite consultar la ubicación.");
        return;
    }
    const estado = document.getElementById("workerLocationMapStatus");
    estado.textContent = "Solicitando permiso para usar tu ubicación…";
    navigator.geolocation.getCurrentPosition(
        (posicion) => redondearUbicacionProfesional(posicion.coords.latitude, posicion.coords.longitude),
        (error) => {
            estado.textContent = mensajeErrorUbicacion(error, "perfil");
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 },
    );
};

window.borrarUbicacionProfesional = function () {
    document.getElementById("workerLatitude").value = "";
    document.getElementById("workerLongitude").value = "";
    if (marcadorSelectorUbicacion && mapaSelectorUbicacion) {
        mapaSelectorUbicacion.removeLayer(marcadorSelectorUbicacion);
        marcadorSelectorUbicacion = null;
    }
    document.getElementById("workerLocationMapStatus").textContent = "No se guardará un punto en el mapa.";
};

window.centrarMapaEnMiUbicacion = function () {
    if (!navigator.geolocation) {
        mostrarMensaje("Este navegador no permite consultar la ubicación.");
        return;
    }
    const estado = document.getElementById("mapaEstado");
    estado.textContent = "Solicitando permiso para centrar el mapa…";
    navigator.geolocation.getCurrentPosition(
        (posicion) => {
            const ubicacion = [posicion.coords.latitude, posicion.coords.longitude];
            if (!inicializarMapaDirectorio()) return;
            mapaDirectorioProfesionales.setView(ubicacion, 12);
            if (marcadorUbicacionCliente) {
                marcadorUbicacionCliente.setLatLng(ubicacion);
            } else {
                marcadorUbicacionCliente = L.circleMarker(ubicacion, {
                    radius: 8,
                    color: "#1d4ed8",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.9,
                }).addTo(mapaDirectorioProfesionales).bindPopup("Tu ubicación (solo visible en este mapa)");
            }
            estado.textContent = "Mapa centrado en tu ubicación. No se envió al servidor.";
        },
        (error) => {
            estado.textContent = mensajeErrorUbicacion(error, "directorio");
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 },
    );
};

document.addEventListener("DOMContentLoaded", function () {
    inicializarMapaDirectorio();
});
