/**
 * modal.js
 * Ventana emergente con el detalle de una sesión (día, horario, aula, grupos
 * y semanas activas/inactivas).
 */

import { DAY_NAMES } from "./state.js";
import { escapeHtml } from "./utils.js";

export function openModal(session, subject) {
  document.getElementById("modalSiglas").textContent = subject.siglas;
  document.getElementById("modalSiglas").style.color = subject.color;
  document.getElementById("modalNombre").textContent =
    subject.nombre + (subject.codigo ? " · " + subject.codigo : "");

  const body = document.getElementById("modalBody");
  let html = `<dt>Día</dt><dd>${DAY_NAMES[session.day]}</dd>
    <dt>Horario</dt><dd>${session.start} – ${session.end}</dd>
    <dt>Aula</dt><dd>${escapeHtml(session.room || "—")}</dd>`;

  session.grupos.forEach((g) => {
    const activas = g.weeksActive
      .map((a, i) => (a ? i + 1 : null))
      .filter((x) => x)
      .join(", ");
    const inactivas =
      g.weeksActive
        .map((a, i) => (!a ? i + 1 : null))
        .filter((x) => x)
        .join(", ") || "ninguna";
    html += `<dt>Grupo</dt><dd>${escapeHtml(g.code)} — ${escapeHtml(g.tipo)}</dd>
      <dt>Semanas activas</dt><dd>${activas || "ninguna"}</dd>
      <dt>Semanas sin clase</dt><dd>${inactivas}</dd>`;
  });

  body.innerHTML = html;
  document.getElementById("modalOverlay").classList.add("show");
}

export function closeModal() {
  document.getElementById("modalOverlay").classList.remove("show");
}

/** Conecta los listeners de cierre (botón y clic fuera del modal). Llamar una sola vez. */
export function initModal() {
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });
}
