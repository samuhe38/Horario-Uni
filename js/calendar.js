/**
 * calendar.js
 * Dibuja el horario a partir de `state.sessions`.
 *
 * Estructura: una fila de columnas independientes (horas + los 5 días). Cada
 * columna contiene DENTRO su propia cabecera y su propio cuerpo, de forma que
 * las cabeceras y los días nunca pueden desalinearse.
 *
 * Reparto del ancho: en vez de usar flex-grow combinado con min-width
 * distintos por columna (que el navegador puede repartir de forma poco
 * intuitiva cuando unas columnas topan con su mínimo y otras no — por
 * ejemplo, dejando una columna vacía mucho más ancha de lo que debería),
 * cada columna recibe un ancho explícito en porcentaje calculado aquí mismo:
 * un día con el doble de clases simultáneas que otro mide el doble, sin
 * ambigüedad, y con un mínimo en píxeles para que el texto siga siendo
 * legible (si no cabe, el conjunto se desplaza con scroll horizontal).
 *
 * NOTA IMPORTANTE SOBRE LOS ESTILOS
 * Los estilos que sostienen la ESTRUCTURA (display:flex del contenedor,
 * position:relative de los cuerpos, altura de las cabeceras...) se aplican
 * aquí en línea, desde JavaScript, además de estar en calendar.css. Es
 * deliberado: si el navegador sirviera una versión antigua de calendar.css
 * desde la caché, el calendario seguiría maquetándose bien en vez de
 * apilarse. calendar.css se ocupa del aspecto (colores, tipografía, bordes).
 */

import { state, DAY_NAMES } from "./state.js";
import { pastel, escapeHtml } from "./utils.js";
import { openModal } from "./modal.js";
import {
  buildTimeSlots,
  gridHeight,
  layoutDay,
  maxConcurrency,
  sessionGeometry,
  MIN_COL_WIDTH,
  TIME_COL_WIDTH,
  HEAD_HEIGHT,
} from "./timeGrid.js";

export { layoutDay };

/* ------------------------------ Piezas de la rejilla ------------------------------ */

/** Cabecera de una columna (nombre del día, o vacía en la columna de horas). */
function buildColumnHead(text) {
  const head = document.createElement("div");
  head.className = "cal-colhead";
  head.textContent = text || "";
  // Estructura crítica: misma altura en todas las cabeceras -> quedan alineadas.
  head.style.height = HEAD_HEIGHT + "px";
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.justifyContent = "center";
  head.style.flex = "0 0 auto";
  return head;
}

/** Cuerpo de una columna, con las líneas de la rejilla ya pintadas. */
function buildColumnBody() {
  const body = document.createElement("div");
  body.className = "cal-colbody";
  // Estructura crítica: lienzo de posicionamiento para líneas y clases.
  body.style.position = "relative";
  body.style.width = "100%";
  body.style.height = gridHeight() + "px";

  buildTimeSlots().forEach((slot) => {
    const line = document.createElement("div");
    line.className = "cal-line" + (slot.onHour ? " on-hour" : "");
    line.style.position = "absolute";
    line.style.left = "0";
    line.style.right = "0";
    line.style.top = slot.top + "px";
    line.style.pointerEvents = "none";
    body.appendChild(line);
  });

  return body;
}

/** Columna de la izquierda con las etiquetas de hora cada 30 minutos. */
function buildTimeColumn() {
  const col = document.createElement("div");
  col.className = "cal-col cal-timecol";
  col.style.display = "flex";
  col.style.flexDirection = "column";
  col.style.flex = `0 0 ${TIME_COL_WIDTH}px`;
  col.style.width = TIME_COL_WIDTH + "px";

  col.appendChild(buildColumnHead(""));
  const body = buildColumnBody();

  buildTimeSlots().forEach((slot) => {
    const lbl = document.createElement("div");
    lbl.className = "cal-timelabel" + (slot.onHour ? " on-hour" : "");
    lbl.style.position = "absolute";
    lbl.style.right = "8px";
    // La etiqueta se coloca justo DEBAJO de su línea (no centrada encima),
    // para que la línea no atraviese el texto por la mitad.
    lbl.style.top = slot.top + 2 + "px";
    lbl.textContent = slot.label;
    body.appendChild(lbl);
  });

  col.appendChild(body);
  return col;
}

/** HTML interno de una caja de clase: hora + aula, siglas, grupos y semanas. */
function buildSessionBoxContent(session, subject) {
  // Hora a la izquierda y aula a la derecha, en esquinas opuestas: esto es
  // la "cabecera" de la caja y se queda fija arriba.
  let inner = `<div class="sb-head">
      <span class="sb-time">${session.start} a ${session.end}</span>
      <span class="sb-room">${escapeHtml(session.room || "")}</span>
    </div>`;

  // Las siglas, el grupo y sus semanas activas van juntos en un bloque que
  // se centra en el espacio que le sobra a la caja (entre la cabecera de
  // arriba y el final de la caja), en vez de quedarse la sigla pegada justo
  // debajo de la cabecera y solo el grupo/semanas centrado aparte.
  let groupsInner = `<div class="sb-siglas" style="color:${subject.color}">${escapeHtml(subject.siglas)}</div>`;
  session.grupos.forEach((g) => {
    groupsInner += `<div class="sb-grupo">${escapeHtml(g.code)} - ${escapeHtml(g.tipo)}</div>`;
    groupsInner +=
      `<div class="sb-weeks">` +
      g.weeksActive.map((active, i) => `<span class="${active ? "" : "off"}">${i + 1}</span>`).join("") +
      `</div>`;
  });
  inner += `<div class="sb-groups">${groupsInner}</div>`;

  return inner;
}

/**
 * Caja de una clase, ya posicionada en su hora exacta.
 * `clusterCols` es el nº de columnas de SU PROPIO cluster (no el máximo del
 * día entero): así una clase que no solapa con nada ocupa el 100% del
 * ancho del día aunque ese mismo día tenga un solape en otra franja horaria.
 */
function buildSessionBox(session, subject, clusterCols) {
  const geo = sessionGeometry(session, clusterCols);

  const box = document.createElement("div");
  box.className = "session-box";
  // Estructura crítica: posición real según la hora, por encima de las líneas.
  box.style.position = "absolute";
  box.style.zIndex = "2";
  box.style.overflow = "hidden";
  box.style.top = geo.top + "px";
  box.style.height = geo.height + "px";
  box.style.left = geo.leftPct + "%";
  box.style.width = geo.widthPct + "%";
  box.style.background = pastel(subject.color, 0.84);
  box.title = `${subject.siglas} — ${subject.nombre}`;
  box.innerHTML = buildSessionBoxContent(session, subject);
  box.onclick = () => openModal(session, subject);
  return box;
}

/**
 * Columna completa de un día ya con su ancho decidido (`widthPct`, en % del
 * ancho total disponible para los 5 días) y sus clases colocadas, cada una
 * dividida según el nº de columnas de SU cluster, no del día completo.
 */
function buildDayColumn(dayIndex, clusters, widthPct, minWidthPx) {
  const col = document.createElement("div");
  col.className = "cal-col cal-daycol";
  // Estructura crítica: ancho explícito y fijo (nada de flex-grow ambiguo).
  col.style.display = "flex";
  col.style.flexDirection = "column";
  col.style.flex = "0 0 auto";
  col.style.width = widthPct + "%";
  col.style.minWidth = minWidthPx + "px";

  col.appendChild(buildColumnHead(DAY_NAMES[dayIndex]));
  const body = buildColumnBody();

  clusters.forEach((cluster) => {
    cluster.forEach((s) => {
      const subj = state.subjects.find((x) => x.id === s.subjectId);
      if (!subj) return;
      body.appendChild(buildSessionBox(s, subj, cluster._numCols));
    });
  });

  col.appendChild(body);
  return col;
}

/* ------------------------------------ Render ------------------------------------ */

/** Repinta el calendario completo. */
export function renderCalendar() {
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  // Estructura crítica: las columnas van en fila, no apiladas.
  grid.style.display = "flex";
  grid.style.flexDirection = "row";
  grid.style.alignItems = "flex-start";

  // 1º pasada: cuántas "unidades" de ancho necesita cada día (1 por cada
  // clase simultánea como máximo). Un día vacío o sin solapes vale 1 unidad,
  // igual que cualquier otro día sin solapes — nunca más ancho que ellos.
  const perDay = [];
  for (let day = 0; day < 5; day++) {
    const daySessions = state.sessions.filter((s) => s.day === day);
    const clusters = layoutDay(daySessions);
    perDay.push({ day, clusters, units: maxConcurrency(clusters) });
  }
  const totalUnits = perDay.reduce((sum, d) => sum + d.units, 0) || 5;

  grid.appendChild(buildTimeColumn());
  perDay.forEach(({ day, clusters, units }) => {
    const widthPct = (units / totalUnits) * 100;
    const minWidthPx = units * MIN_COL_WIDTH;
    grid.appendChild(buildDayColumn(day, clusters, widthPct, minWidthPx));
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
