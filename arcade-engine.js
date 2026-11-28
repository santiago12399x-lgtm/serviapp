// Reglas puras del minijuego. No accede al DOM ni a la plataforma real.
const claveNodo = (nodo) => `${nodo.columna},${nodo.fila}`;

export function encontrarRutaCalles(inicio, fin, columnas, filas) {
    const abiertos = [inicio];
    const desde = new Map();
    const costos = new Map([[claveNodo(inicio), 0]]);
    const estimar = (nodo) => Math.abs(nodo.columna - fin.columna) + Math.abs(nodo.fila - fin.fila);
    const vecinos = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (abiertos.length) {
        abiertos.sort((a, b) => (costos.get(claveNodo(a)) + estimar(a)) - (costos.get(claveNodo(b)) + estimar(b)));
        const actual = abiertos.shift();
        if (actual.columna === fin.columna && actual.fila === fin.fila) {
            const ruta = [actual];
            let cursor = claveNodo(actual);
            while (desde.has(cursor)) { const previo = desde.get(cursor); ruta.unshift(previo); cursor = claveNodo(previo); }
            return ruta;
        }
        vecinos.forEach(([dc, dr]) => {
            const siguiente = { columna: actual.columna + dc, fila: actual.fila + dr };
            if (siguiente.columna < 0 || siguiente.columna >= columnas || siguiente.fila < 0 || siguiente.fila >= filas) return;
            const costo = costos.get(claveNodo(actual)) + 1;
            const key = claveNodo(siguiente);
            if (costo >= (costos.get(key) ?? Infinity)) return;
            desde.set(key, actual);
            costos.set(key, costo);
            if (!abiertos.some((nodo) => claveNodo(nodo) === key)) abiertos.push(siguiente);
        });
    }
    return [inicio, fin];
}

export function calcularPuntajeServicio({ tiempoDisponible, dificultad, combo, especialista }) {
    const rapidez = Math.max(0, Math.round(tiempoDisponible * 2.1));
    return 90 + rapidez + dificultad * 18 + Math.max(0, combo) * 12 + (especialista ? 35 : 0);
}

export function calcularTiempoTrabajo({ base, especialista, mejoraHerramientas, dificultad }) {
    const factorEspecialidad = especialista ? .66 : 1.12;
    const factorHerramientas = 1 - mejoraHerramientas * .08;
    const factorDificultad = 1 + (dificultad - 1) * .13;
    return Math.max(3.2, base * factorEspecialidad * factorHerramientas * factorDificultad);
}

export function fechaActualBogota() {
    const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const porTipo = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
    return `${porTipo.year}-${porTipo.month}-${porTipo.day}`;
}
