/**
 * utils.js
 * Funciones auxiliares puras: no tocan el DOM ni el estado global.
 */

/** Genera un identificador corto y suficientemente único para uso local. */
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Convierte "HH:MM" a minutos desde medianoche, para poder comparar horas. */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "#RRGGBB" o "#RGB" -> {r,g,b} */
export function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Aclara un color hexadecimal mezclándolo con blanco (relleno pastel de fondo). */
export function pastel(hex, amount = 0.84) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Escapa texto antes de insertarlo como innerHTML. */
export function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
