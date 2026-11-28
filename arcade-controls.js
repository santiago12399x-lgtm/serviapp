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
