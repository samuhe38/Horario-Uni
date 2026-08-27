/**
 * calendar.js
 * El corazón visual de la app: agrupa las sesiones de cada día en "clusters"
 * (franjas que se solapan en el tiempo) y las dibuja como filas de altura
 * automática, igual que la tabla del horario oficial de la ESI — sin escala
 * de reloj fija. Si una sesión va sola ocupa el 100% del ancho del día; si
 * dos o más se solapan, se reparten el ancho a partes iguales.
 */

import { state, DAY_NAMES } from "./state.js";
import { toMinutes, pastel, escapeHtml } from "./utils.js";
import { openModal } from "./modal.js";

/**
 * Agrupa las sesiones de un día en clusters cronológicos y, dentro de cada
 * cluster, asigna una columna a cada sesión mediante un algoritmo voraz de
 * asignación de intervalos (el mismo que usan los calendarios tipo Google
 * Calendar para repartir eventos solapados en columnas).
 *
 * Devuelve un array de clusters en orden cronológico. Cada sesión queda
 * anotada con `_col` (su columna dentro del cluster) y cada cluster con
 * `_numCols` (cuántas columnas reales tiene esa franja).
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

/** Construye el HTML interno de una caja de sesión (hora, siglas, grupos, semanas). */
function buildSessionBoxContent(session, subject) {
  let inner = `<div class="sb-time">${session.start} a ${session.end}${
    session.room ? "&nbsp;&nbsp;" + escapeHtml(session.room) : ""
  }</div>
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

/** Repinta el calendario completo a partir de `state.sessions`. */
export function renderCalendar() {
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  DAY_NAMES.forEach((name) => {
    const d = document.createElement("div");
    d.className = "cal-daylabel";
    d.textContent = name;
    grid.appendChild(d);
  });

  for (let day = 0; day < 5; day++) {
    const col = document.createElement("div");
    col.className = "cal-daycol";

    const daySessions = state.sessions.filter((s) => s.day === day);
    const clusters = layoutDay(daySessions);

    clusters.forEach((cluster) => {
      const row = document.createElement("div");
      row.className = "cluster-row";

      // Se reparte en columnas solo si hay solape real (_numCols > 1).
      // Sin solape, la única sesión del cluster ocupa el 100% del ancho.
      const ordered = [...cluster].sort((a, b) => a._col - b._col);

      ordered.forEach((s) => {
        const subj = state.subjects.find((x) => x.id === s.subjectId);
        if (!subj) return;
        const box = document.createElement("div");
        box.className = "session-box";
        box.style.background = pastel(subj.color, 0.84);
        box.title = `${subj.siglas} — ${subj.nombre}`;
        box.innerHTML = buildSessionBoxContent(s, subj);
        box.onclick = () => openModal(s, subj);
        row.appendChild(box);
      });

      col.appendChild(row);
    });

    grid.appendChild(col);
  }

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
