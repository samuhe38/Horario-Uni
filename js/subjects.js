/**
 * subjects.js
 * CRUD de asignaturas y su renderizado en la interfaz (fichas + <select>).
 */

import { state } from "./state.js";
import { uid, escapeHtml } from "./utils.js";

/** Añade una asignatura nueva al estado. */
export function addSubject({ siglas, nombre, codigo, color }) {
  state.subjects.push({ id: uid(), siglas, nombre, codigo, color });
}

/**
 * Elimina una asignatura. Si tiene sesiones asociadas, pide confirmación y
 * las elimina también. Devuelve `true` si finalmente se eliminó algo.
 */
export function removeSubject(id) {
  if (state.sessions.some((se) => se.subjectId === id)) {
    const ok = confirm(
      "Esta asignatura tiene sesiones en el horario. Si la eliminas, también se eliminarán esas sesiones. ¿Continuar?"
    );
    if (!ok) return false;
    state.sessions = state.sessions.filter((se) => se.subjectId !== id);
  }
  state.subjects = state.subjects.filter((s) => s.id !== id);
  return true;
}

/**
 * Dibuja las fichas ("chips") de asignaturas creadas.
 * @param {(id:string)=>void} onDelete callback cuando se pulsa eliminar
 */
export function renderSubjectChips(onDelete) {
  const box = document.getElementById("subjectChips");
  box.innerHTML = "";
  state.subjects.forEach((s) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span class="swatch" style="background:${s.color}"></span>
      <b>${escapeHtml(s.siglas)}</b> — ${escapeHtml(s.nombre)}
      ${s.codigo ? `<span class="code">${escapeHtml(s.codigo)}</span>` : ""}
      <button class="small ghost-danger" type="button">✕</button>`;
    chip.querySelector("button").onclick = () => onDelete(s.id);
    box.appendChild(chip);
  });
  renderSubjectSelect();
}

/** Refresca el <select> de asignaturas del formulario de sesiones. */
export function renderSubjectSelect() {
  const sel = document.getElementById("sesSubject");
  sel.innerHTML = state.subjects
    .map((s) => `<option value="${s.id}">${escapeHtml(s.siglas)} — ${escapeHtml(s.nombre)}</option>`)
    .join("");
}
