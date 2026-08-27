/**
 * storage.js
 * Persistencia local del horario usando `localStorage`, la API estándar de
 * cualquier navegador. Todo se guarda en el propio dispositivo del usuario;
 * nada sale de su navegador ni se envía a ningún servidor.
 */

import { state } from "./state.js";

const STORAGE_KEY = "horario-esi-data";

/** Guarda el estado actual en localStorage y actualiza el indicador visual. */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStatus(true);
  } catch (err) {
    // Puede fallar en navegación privada con cuota agotada, etc.
    console.error("No se pudo guardar el horario en localStorage:", err);
    setStatus(false);
  }
}

/**
 * Carga el estado guardado, si existe. Muta las propiedades del `state`
 * existente en lugar de reemplazar la referencia (ver nota en state.js).
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.subjects) && Array.isArray(parsed.sessions)) {
      state.meta = parsed.meta || state.meta;
      state.subjects = parsed.subjects;
      state.sessions = parsed.sessions;
    }
  } catch (err) {
    console.error("No se pudo leer el horario guardado:", err);
  }
}

/** Actualiza la píldora de estado "Guardado" de la barra superior. */
export function setStatus(ok) {
  const el = document.getElementById("statusPill");
  if (!el) return;
  el.innerHTML = ok
    ? '<span class="dot" style="background:#7fbf7f;"></span> Guardado en este navegador'
    : '<span class="dot" style="background:#e0a83f;"></span> No se pudo guardar localmente';
}
