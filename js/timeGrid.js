/**
 * timeGrid.js
 * Geometría de la rejilla temporal del horario. Módulo de lógica pura: no
 * toca el DOM, así que puede probarse de forma aislada.
 *
 * Define el eje vertical del calendario (de 08:30 a 20:30, con una marca
 * cada 30 minutos) y resuelve los solapamientos de clases dentro de un día.
 */

import { toMinutes } from "./utils.js";

/* --------------------------------- Parámetros --------------------------------- */

/** Primera línea de la rejilla: 08:30. */
export const GRID_START = 8 * 60 + 30;
/** Última línea de la rejilla: 20:30. */
export const GRID_END = 20 * 60 + 30;
/** Separación entre líneas horizontales, en minutos. */
export const SLOT_MINUTES = 30;
/** Escala vertical: con 2.2 px/min, media hora = 66 px y 1h30 = 198 px. */
export const PX_PER_MIN = 2.2;
/** Ancho mínimo de una sub-columna (una clase) para que el texto siga siendo legible. */
export const MIN_COL_WIDTH = 230;
/** Ancho de la columna de horas de la izquierda. */
export const TIME_COL_WIDTH = 68;
/** Altura de la cabecera de cada columna (debe ser igual en todas para que alineen). */
export const HEAD_HEIGHT = 38;
/** Altura mínima de una caja de clase, por si la sesión es muy corta. */
export const MIN_BOX_HEIGHT = 34;

/* ------------------------------ Geometría vertical ------------------------------ */

/** Posición vertical en píxeles de un instante dado (en minutos desde medianoche). */
export function minutesToPx(minutes) {
  return (minutes - GRID_START) * PX_PER_MIN;
}

/** Altura total del cuerpo de la rejilla, en píxeles. */
export function gridHeight() {
  return minutesToPx(GRID_END);
}

/**
 * Lista de marcas de la rejilla, una cada 30 minutos entre GRID_START y
 * GRID_END (ambos incluidos).
 * @returns {{minutes:number, top:number, label:string, onHour:boolean}[]}
 */
export function buildTimeSlots() {
  const slots = [];
  for (let t = GRID_START; t <= GRID_END; t += SLOT_MINUTES) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    slots.push({
      minutes: t,
      top: minutesToPx(t),
      label: `${h}:${m}`,
      onHour: t % 60 === 0,
    });
  }
  return slots;
}

/** Geometría (posición y tamaño) de la caja de una sesión dentro de su día. */
export function sessionGeometry(session, totalCols) {
  const start = toMinutes(session.start);
  const end = toMinutes(session.end);
  return {
    top: minutesToPx(start),
    height: Math.max((end - start) * PX_PER_MIN, MIN_BOX_HEIGHT),
    leftPct: (session._col / totalCols) * 100,
    widthPct: 100 / totalCols,
  };
}

/* -------------------------------- Solapamientos -------------------------------- */

/**
 * Agrupa las sesiones de un día en clusters (bloques encadenados por solape)
 * y asigna a cada sesión una columna dentro de su cluster, con el algoritmo
 * voraz habitual de asignación de intervalos.
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
 * Nº máximo de clases simultáneas de un día: determina cuántas veces más
 * ancha debe dibujarse la columna de ese día.
 */
export function maxConcurrency(clusters) {
  return clusters.reduce((max, c) => Math.max(max, c._numCols), 1);
}
