// Entrada por teclado y pausa segura al cambiar de pestaña o perder el foco.
export function instalarControlesArcade({
    obtenerPartida,
    overlayVisible,
    pausar,
    cerrarOverlay,
    elegirTrabajador,
    recorrerAvisos,
}) {
    function manejarTecla(evento) {
        const partida = obtenerPartida();
        const elemento = evento.target;
        const escribiendo = elemento instanceof HTMLElement
            && (elemento.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(elemento.tagName));
        if (escribiendo) return;

        if (evento.key === "Escape") {
            if (partida?.activa && !partida.pausada) pausar("teclado");
            else if (overlayVisible() && !partida?.pausada) cerrarOverlay();
            return;
        }
        if ((evento.key === "p" || evento.key === "P") && partida?.activa && !partida.pausada) {
            pausar("teclado");
            return;
        }
        if (!partida?.activa || partida.pausada || overlayVisible()) return;
        if (/^[1-6]$/.test(evento.key)) elegirTrabajador(Number(evento.key) - 1);
        if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
            evento.preventDefault();
            recorrerAvisos(evento.key === "ArrowDown" ? 1 : -1);
        }
    }

    function pausarPorPerdidaDeFoco() {
        const partida = obtenerPartida();
        if (partida?.activa && !partida.pausada && !partida.finalizada) pausar("foco");
    }

    function manejarVisibilidad() {
        if (document.visibilityState === "hidden") pausarPorPerdidaDeFoco();
    }

    document.addEventListener("keydown", manejarTecla);
    document.addEventListener("visibilitychange", manejarVisibilidad);
    window.addEventListener("blur", pausarPorPerdidaDeFoco);
    return () => {
        document.removeEventListener("keydown", manejarTecla);
        document.removeEventListener("visibilitychange", manejarVisibilidad);
        window.removeEventListener("blur", pausarPorPerdidaDeFoco);
    };
}

export function instalarControlesMapa({
    canvas,
    obtenerPartida,
    convertirPunto,
    trabajadorEnPunto,
    avisoEnPunto,
    seleccionarTrabajador,
    seleccionarAviso,
    asignarAviso,
    actualizarMensaje,
}) {
    let arrastre = null;

    function iniciarPuntero(evento) {
        const partida = obtenerPartida();
        if (!partida?.activa || partida.pausada) return;
        const punto = convertirPunto(evento);
        const trabajador = trabajadorEnPunto(punto);
        arrastre = trabajador ? { trabajadorId: trabajador.id, inicio: punto, movido: false } : null;
        if (trabajador) {
            partida.seleccionTrabajador = trabajador.id;
            canvas.setPointerCapture(evento.pointerId);
        }
    }

    function moverPuntero(evento) {
        if (!arrastre) return;
        const punto = convertirPunto(evento);
        if (Math.hypot(punto.x - arrastre.inicio.x, punto.y - arrastre.inicio.y) > 13) arrastre.movido = true;
    }

    function terminarPuntero(evento) {
        const partida = obtenerPartida();
        if (!partida?.activa || partida.pausada) return;
        const punto = convertirPunto(evento);
        if (arrastre?.trabajadorId) {
            const idTrabajador = arrastre.trabajadorId;
            const desplazo = arrastre.movido;
            arrastre = null;
            if (desplazo) {
                const aviso = avisoEnPunto(punto);
                if (aviso) asignarAviso(partida.equipo.find((persona) => persona.id === idTrabajador), aviso);
                else actualizarMensaje("Suelta al trabajador sobre un aviso del mapa.");
            } else seleccionarTrabajador(idTrabajador);
            return;
        }
        const aviso = avisoEnPunto(punto);
        if (aviso) seleccionarAviso(aviso.id);
    }

    function cancelarArrastre() { arrastre = null; }
    function actualizarCursor(evento) {
        if (arrastre) return;
        const punto = convertirPunto(evento);
        canvas.style.cursor = trabajadorEnPunto(punto) || avisoEnPunto(punto) ? "pointer" : "default";
    }

    canvas.addEventListener("pointerdown", iniciarPuntero);
    canvas.addEventListener("pointermove", moverPuntero);
    canvas.addEventListener("pointerup", terminarPuntero);
    canvas.addEventListener("pointercancel", cancelarArrastre);
    canvas.addEventListener("pointermove", actualizarCursor);
    return () => {
        canvas.removeEventListener("pointerdown", iniciarPuntero);
        canvas.removeEventListener("pointermove", moverPuntero);
        canvas.removeEventListener("pointerup", terminarPuntero);
        canvas.removeEventListener("pointercancel", cancelarArrastre);
        canvas.removeEventListener("pointermove", actualizarCursor);
    };
}
