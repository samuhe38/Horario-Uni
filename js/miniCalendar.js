/**
 * miniCalendar.js
 * Mini-calendarios mensuales del cuatrimestre, como los que aparecen en la
 * esquina del horario oficial de la ESI: un bloque por mes, con los días en
 * filas de lunes a domingo (sin cabecera de día de la semana, igual que el
 * original) y, a la izquierda de cada fila que contiene un lunes dentro del
 * cuatrimestre, el número de "semana" correspondiente (semana 1, 2, 3...).
 *
 * Los días sin clase se pintan en rojo:
 *  - Fines de semana: se calculan solos, no hace falta indicarlos.
 *  - Festivos y puentes: fechas sueltas que se añaden a mano.
 *  - Vacaciones: los mismos rangos `breaks` que ya se usan para no numerar
 *    esas semanas (Navidad, Semana Santa...), ahora también pintan en rojo
 *    cada día del rango.
 *
 * Es independiente de las sesiones del horario: es información del
 * calendario académico en sí. Debajo se pueden añadir notas de
 * reprogramación de clases, en texto libre.
 */

import { state } from "./state.js";
import { escapeHtml } from "./utils.js";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Día de la semana con lunes=0 ... domingo=6 (Date usa domingo=0, lo reordenamos). */
function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

/** Nueva Date sumando n días a otra fecha. */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Fecha en formato YYYY-MM-DD, para usar como clave de comparación por día. */
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calcula los meses que hay que dibujar para un cuatrimestre, qué número de
 * semana corresponde a cada lunes, y qué días concretos no tienen clase
 * (fines de semana, festivos/puentes sueltos, o dentro de un periodo de
 * vacaciones) para poder pintarlos en rojo.
 *
 * Los cuatrimestres reales no numeran las semanas de vacaciones (por
 * ejemplo, en Navidad la semana 15 no empieza justo 14 semanas después de la
 * semana 1: hay un hueco sin numerar de por medio). Por eso se puede pasar
 * `breaks`, un array de rangos {start, end} (fechas ISO) que se saltan al
 * contar semanas — esas semanas no reciben número, igual que en el original,
 * y además cada uno de sus días se marca como sin clase.
 *
 * @param {string} startDateStr fecha ISO (YYYY-MM-DD) del lunes de la semana 1
 * @param {number} weeksCount número de semanas lectivas del cuatrimestre
 * @param {{start:string, end:string}[]} [breaks] rangos de fechas a excluir (vacaciones)
 * @param {string[]} [holidays] fechas ISO sueltas sin clase (festivos, puentes)
 * @returns {{year:number, month:number, monthName:string, rows:{weekNumber:number|null, days:({day:number, nonClass:boolean}|null)[]}[]}[]}
 */
export function buildMonthGrids(startDateStr, weeksCount, breaks = [], holidays = []) {
  if (!startDateStr || !weeksCount) return [];
  const start = new Date(startDateStr + "T00:00:00");
  if (isNaN(start.getTime())) return [];

  const breakRanges = (breaks || [])
    .filter((b) => b && b.start && b.end)
    .map((b) => ({ start: new Date(b.start + "T00:00:00"), end: new Date(b.end + "T00:00:00") }));
  const isInBreak = (date) => breakRanges.some((r) => date >= r.start && date <= r.end);

  const holidaySet = new Set((holidays || []).filter(Boolean));

  /** Fin de semana, festivo/puente suelto, o dentro de un periodo de vacaciones. */
  const isNonClassDate = (date) => {
    const dow = date.getDay(); // 0 = domingo, 6 = sábado
    if (dow === 0 || dow === 6) return true;
    if (holidaySet.has(toKey(date))) return true;
    if (isInBreak(date)) return true;
    return false;
  };

  // Recorremos semana a semana desde el lunes de inicio, saltando las que
  // caen dentro de un descanso, hasta completar weeksCount semanas lectivas.
  const weekOf = new Map();
  let monday = new Date(start);
  let weekNum = 1;
  let safety = 0; // por si `breaks` cubre un rango absurdamente largo
  while (weekNum <= weeksCount && safety < 520) {
    if (!isInBreak(monday)) {
      weekOf.set(toKey(monday), weekNum);
      weekNum++;
    }
    monday = addDays(monday, 7);
    safety++;
  }
  const rangeEnd = addDays(monday, -1); // último lunes recorrido, ya sin usar, menos 1 día

  const grids = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  while (cursor <= lastMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Alineamos la primera fila para que empiece en lunes, con huecos en blanco antes.
    const leadingBlanks = mondayIndex(firstOfMonth);
    const cells = Array(leadingBlanks)
      .fill(null)
      .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    while (cells.length % 7 !== 0) cells.push(null);

    // El lunes real de la primera fila puede caer en el mes anterior (por
    // eso los huecos en blanco); lo calculamos como fecha absoluta para no
    // depender de si su número de día se ve o no en esta rejilla.
    const gridStartMonday = addDays(firstOfMonth, -leadingBlanks);

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      const weekCells = cells.slice(i, i + 7);
      const rowMonday = addDays(gridStartMonday, i); // i ya avanza de 7 en 7
      const weekNumber = weekOf.get(toKey(rowMonday)) || null;
      const days = weekCells.map((d) =>
        d ? { day: d, nonClass: isNonClassDate(new Date(year, month, d)) } : null
      );
      rows.push({ weekNumber, days });
    }

    grids.push({ year, month, monthName: MONTH_NAMES[month], rows });
    cursor = new Date(year, month + 1, 1);
  }

  return grids;
}

/** Repinta el bloque de mini-calendarios dentro de #miniCalendarBox. */
export function renderMiniCalendar() {
  const box = document.getElementById("miniCalendarBox");
  if (!box) return;
  const cfg = state.miniCalendar;

  if (!cfg || !cfg.enabled || !cfg.startDate || !cfg.weeksCount) {
    box.innerHTML = "";
    box.style.display = "none";
    return;
  }
  box.style.display = "flex";

  const grids = buildMonthGrids(cfg.startDate, cfg.weeksCount, cfg.breaks || [], cfg.holidays || []);

  const monthsHtml = grids
    .map((g) => {
      const rowsHtml = g.rows
        .map(
          (row) => `<div class="mc-row">
            <span class="mc-weeknum">${row.weekNumber ?? ""}</span>
            ${row.days
              .map((cell) =>
                cell
                  ? `<span class="mc-day${cell.nonClass ? " mc-nonclass" : ""}">${cell.day}</span>`
                  : `<span class="mc-day mc-blank"></span>`
              )
              .join("")}
          </div>`
        )
        .join("");
      return `<div class="mc-month">
          <div class="mc-monthname">${g.monthName}</div>
          ${rowsHtml}
        </div>`;
    })
    .join("");

  const notesHtml = (cfg.notes || [])
    .filter((n) => n.trim())
    .map((n) => `<div class="mc-note">${escapeHtml(n)}</div>`)
    .join("");

  // Las notas van primero (más cerca de la leyenda de asignaturas) y los
  // meses después, a la derecha del todo — igual que en el horario oficial.
  box.innerHTML =
    (notesHtml ? `<div class="mc-notes">${notesHtml}</div>` : "") + `<div class="mc-months">${monthsHtml}</div>`;
}
