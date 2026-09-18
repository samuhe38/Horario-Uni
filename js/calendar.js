/**
 * calendar.js
 * Motor visual del horario.
 *
 * Funciona sobre una rejilla temporal real: el eje vertical va de 08:30 a
 * 20:30 con una línea horizontal cada 30 minutos, de modo que cada clase se
 * dibuja exactamente en su posición y con la altura que le corresponde por
 * duración. Así se ven de un vistazo los huecos libres entre clases.
 *
 * Cuando varias clases se solapan en un mismo día, NO se encogen: es la
 * columna de ese día la que se ensancha (x2, x3... según haga falta), de
 * forma que cada caja mantiene su ancho legible y quedan pegadas una al lado
 * de la otra dentro del mismo día.
 */

import { state, DAY_NAMES } from "./state.js";
import { toMinutes, pastel, escapeHtml } from "./utils.js";
import { openModal } from "./modal.js";

/* ----------------------------- Parámetros de la rejilla ----------------------------- */

/** Primera línea de la rejilla: 08:30. */
const GRID_START = 8 * 60 + 30;
/** Última línea de la rejilla: 20:30. */
const GRID_END = 20 * 60 + 30;
/** Separación entre líneas horizontales, en minutos. */
const SLOT_MINUTES = 30;
/** Escala vertical. Con 2.2 px/min, media hora = 66 px y 1h30 = 198 px. */
const PX_PER_MIN = 2.2;
/** Ancho mínimo de una sub-columna (una clase) para que el texto siga siendo legible. */
const MIN_COL_WIDTH = 230;
/** Ancho de la columna de horas de la izquierda. */
const TIME_COL_WIDTH = 68;

/** Convierte un instante en minutos a su posición vertical en píxeles. */
function minutesToPx(minutes) {
  return (minutes - GRID_START) * PX_PER_MIN;
}

/* --------------------------------- Solapamientos --------------------------------- */

/**
 * Agrupa las sesiones de un día en clusters (bloques de sesiones encadenadas
 * por solape) y asigna a cada sesión una columna dentro de su cluster,
 * mediante el algoritmo voraz habitual de asignación de intervalos.
 *
 * Cada sesión queda anotada con `_col`; cada cluster, con `_numCols`.
 */
export function layoutDay(sessions) {
  const sorted = [...sessions].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end)
  );

  const clusters = [];
  let current = [];
  let clusterEnd = -1;
  sorted.forEach((s) => {
    const st = toMinutes(s.start),
      en = toMinutes(s.end);
    if (current.length === 0 || st < clusterEnd) {
      current.push(s);
      clusterEnd = Math.max(clusterEnd, en);
    } else {
      clusters.push(current);
      current = [s];
      clusterEnd = en;
    }
  });
  if (current.length) clusters.push(current);

  clusters.forEach((cluster) => {
    const columns = [];
    cluster.forEach((s) => {
      const st = toMinutes(s.start),
        en = toMinutes(s.end);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= st) {
          columns[i] = en;
          s._col = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push(en);
        s._col = columns.length - 1;
      }
    });
    cluster._numCols = columns.length;
  });

  return clusters;
}

/**
 * Nº máximo de clases simultáneas de un día. Determina cuántas veces más
 * ancha debe ser la columna de ese día.
 */
function maxConcurrency(clusters) {
  return clusters.reduce((max, c) => Math.max(max, c._numCols), 1);
}

/* ------------------------------------ Render ------------------------------------ */

/** HTML interno de una caja de sesión: hora + aula, siglas, grupos y semanas. */
function buildSessionBoxContent(session, subject) {
  // La hora va a la izquierda y el aula a la derecha, en esquinas opuestas.
  let inner = `<div class="sb-head">
      <span class="sb-time">${session.start} a ${session.end}</span>
      <span class="sb-room">${escapeHtml(session.room || "")}</span>
    </div>
    <div class="sb-siglas" style="color:${subject.color}">${escapeHtml(subject.siglas)}</div>`;

  session.grupos.forEach((g) => {
    inner += `<div class="sb-grupo">${escapeHtml(g.code)} - ${escapeHtml(g.tipo)}</div>`;
    inner +=
      `<div class="sb-weeks">` +
      g.weeksActive.map((active, i) => `<span class="${active ? "" : "off"}">${i + 1}</span>`).join("") +
      `</div>`;
  });

  return inner;
}

/** Dibuja las líneas horizontales cada 30 minutos dentro de un contenedor. */
function paintGridLines(container) {
  for (let t = GRID_START; t <= GRID_END; t += SLOT_MINUTES) {
    const line = document.createElement("div");
    // Las líneas en punto se marcan un poco más que las de la media hora.
    line.className = "cal-line" + (t % 60 === 0 ? " on-hour" : "");
    line.style.top = minutesToPx(t) + "px";
    container.appendChild(line);
  }
}

/** Repinta el calendario completo a partir de `state.sessions`. */
export function renderCalendar() {
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  const gridHeight = minutesToPx(GRID_END);

  // 1. Calcular, por día, cuántas clases simultáneas hay como máximo.
  const perDay = [];
  for (let day = 0; day < 5; day++) {
    const daySessions = state.sessions.filter((s) => s.day === day);
    const clusters = layoutDay(daySessions);
    perDay.push({ clusters, cols: maxConcurrency(clusters) });
  }

  // 2. Repartir el ancho: un día con 2 clases a la vez ocupa el doble, etc.
  const totalCols = perDay.reduce((sum, d) => sum + d.cols, 0);
  grid.style.gridTemplateColumns =
    `${TIME_COL_WIDTH}px ` + perDay.map((d) => `${d.cols}fr`).join(" ");
  grid.style.minWidth = TIME_COL_WIDTH + totalCols * MIN_COL_WIDTH + "px";

  // 3. Fila de cabecera: esquina vacía + nombres de los días.
  const corner = document.createElement("div");
  corner.className = "cal-corner";
  grid.appendChild(corner);

  DAY_NAMES.forEach((name) => {
    const d = document.createElement("div");
    d.className = "cal-daylabel";
    d.textContent = name;
    grid.appendChild(d);
  });

  // 4. Columna de horas de la izquierda.
  const timeCol = document.createElement("div");
  timeCol.className = "cal-timecol";
  timeCol.style.height = gridHeight + "px";
  for (let t = GRID_START; t <= GRID_END; t += SLOT_MINUTES) {
    const lbl = document.createElement("div");
    lbl.className = "cal-timelabel" + (t % 60 === 0 ? " on-hour" : "");
    lbl.style.top = minutesToPx(t) + "px";
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    lbl.textContent = `${h}:${m}`;
    timeCol.appendChild(lbl);
  }
  paintGridLines(timeCol);
  grid.appendChild(timeCol);

  // 5. Una columna por día, con sus líneas de fondo y sus clases encima.
  perDay.forEach(({ clusters, cols }) => {
    const col = document.createElement("div");
    col.className = "cal-daycol";
    col.style.height = gridHeight + "px";

    paintGridLines(col);

    clusters.forEach((cluster) => {
      cluster.forEach((s) => {
        const subj = state.subjects.find((x) => x.id === s.subjectId);
        if (!subj) return;

        const st = toMinutes(s.start);
        const en = toMinutes(s.end);

        const box = document.createElement("div");
        box.className = "session-box";
        // Posición y altura reales según la hora: si dos clases solo coinciden
        // media hora, cada una queda a su altura exacta, no al mismo nivel.
        box.style.top = minutesToPx(st) + "px";
        box.style.height = Math.max((en - st) * PX_PER_MIN, 34) + "px";
        // El día se ha ensanchado, así que cada sub-columna conserva su ancho.
        box.style.left = (s._col / cols) * 100 + "%";
        box.style.width = 100 / cols + "%";
        box.style.background = pastel(subj.color, 0.84);
        box.title = `${subj.siglas} — ${subj.nombre}`;
        box.innerHTML = buildSessionBoxContent(s, subj);
        box.onclick = () => openModal(s, subj);
        col.appendChild(box);
      });
    });

    grid.appendChild(col);
  });

  document.getElementById("emptyNote").style.display = state.sessions.length ? "none" : "block";
}

/** Repinta la leyenda de asignaturas (texto plano coloreado, como el original). */
export function renderLegend() {
  const box = document.getElementById("legendBox");
  if (state.subjects.length === 0) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = state.subjects
    .map(
      (s) =>
        `<div class="legend-item" style="color:${s.color}">${escapeHtml(s.siglas)} - ${escapeHtml(s.nombre)}${
          s.codigo ? " - " + escapeHtml(s.codigo) : ""
        }</div>`
    )
    .join("");
}
