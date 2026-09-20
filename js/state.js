/**
 * state.js
 * Estado global de la aplicación, compartido por todos los módulos.
 *
 * Importante: `state` se declara con `const` a propósito. Ningún módulo debe
 * reemplazar la referencia completa (state = {...}); todos mutan sus
 * propiedades (state.subjects = [...], state.sessions = [...]). Así cualquier
 * módulo que haya importado `state` sigue viendo los mismos datos siempre.
 */

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export const state = {
  meta: {
    titulo: "Grado en Ingeniería Informática",
    anio: "2026-2027",
    curso: "1º",
    semestre: "1º",
    grupo: "1ºA",
  },
  // { id, siglas, nombre, codigo, color }
  subjects: [],
  // { id, subjectId, day, start, end, room, grupos:[{id,code,tipo,weeksTotal,weeksActive:[bool]}] }
  sessions: [],
  // Mini-calendario del cuatrimestre (como el de la esquina del horario oficial).
  // Es independiente de las sesiones: solo marca qué semana del curso es cada fecha.
  miniCalendar: {
    enabled: false,
    startDate: "", // fecha ISO (YYYY-MM-DD) del lunes de la semana 1
    weeksCount: 16,
    breaks: [], // [{start:'YYYY-MM-DD', end:'YYYY-MM-DD'}, ...] periodos sin numerar (vacaciones) — se pintan en rojo
    holidays: [], // ["YYYY-MM-DD", ...] festivos/puentes sueltos — se pintan en rojo
    notes: [], // notas de reprogramación, una por línea
  },
};

