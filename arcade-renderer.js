// Infraestructura de dibujo: reloj de fotogramas limitado a 60 FPS y deltas estables.
export function crearBucleRender({ esVisible, actualizar, dibujar, despuesDeDibujar }) {
    let idFotograma = 0;
    let ultimoFotograma = 0;
    let enMarcha = false;

    function tick(ahora) {
        if (!enMarcha || !esVisible()) { idFotograma = 0; enMarcha = false; return; }
        const delta = Math.min(.06, Math.max(0, (ahora - ultimoFotograma) / 1000));
        ultimoFotograma = ahora;
        actualizar(delta);
        dibujar(ahora / 1000);
        despuesDeDibujar(ahora);
        if (enMarcha) idFotograma = requestAnimationFrame(tick);
    }

    return {
        iniciar() {
            if (enMarcha) return;
            enMarcha = true;
            ultimoFotograma = performance.now();
            idFotograma = requestAnimationFrame(tick);
        },
        detener() {
            if (idFotograma) cancelAnimationFrame(idFotograma);
            idFotograma = 0;
            enMarcha = false;
        },
        activo() { return enMarcha; },
    };
}

export function renderizarClasificacion(filas, mensaje = "") {
    const lista = document.getElementById("arcadeLeaderboard");
    lista.replaceChildren();
    if (mensaje || !filas.length) {
        const item = document.createElement("li");
        item.className = "leaderboard-message";
        item.textContent = mensaje || "Todavía no hay puntajes esta semana.";
        lista.appendChild(item);
        return;
    }
    filas.forEach((fila) => {
        const item = document.createElement("li");
        const nombre = document.createElement("span");
        const puntos = document.createElement("strong");
        nombre.textContent = fila.nombre;
        puntos.textContent = `${Math.round(fila.puntuacion).toLocaleString("es-CO")} PTS`;
        item.append(nombre, puntos);
        lista.appendChild(item);
    });
}

export function renderizarVidas(partida) {
    const vidas = document.getElementById("livesValue");
    vidas.innerHTML = `${"♥".repeat(partida.vidas)}<span class="lost-life">${"♥".repeat(5 - partida.vidas)}</span>`;
    vidas.setAttribute("aria-label", `${partida.vidas} de 5 vidas`);
}
