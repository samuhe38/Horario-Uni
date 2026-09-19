/**
 * importExport.js
 * Exportar/importar el horario como JSON, y exportar el calendario como
 * imagen PNG (usando la librería html2canvas cargada desde el HTML).
 */

import { state } from "./state.js";
import { uid } from "./utils.js";

/** Descarga el estado completo como archivo .json. */
export function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mi-horario-esi.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Vuelca un objeto con forma {titulo, curso, semestre, grupo, anioAcademico,
 * subjects, sessions} sobre `state`, regenerando ids para evitar colisiones.
 * Devuelve `true` si el JSON tenía el formato esperado.
 */
export function importFromObject(obj) {
  if (!obj || !Array.isArray(obj.subjects) || !Array.isArray(obj.sessions)) {
    alert("El JSON no tiene el formato esperado (faltan subjects/sessions).");
    return false;
  }

  const subjects = obj.subjects.map((s) => ({
    id: s.id || uid(),
    siglas: s.siglas || "",
    nombre: s.nombre || "",
    codigo: s.codigo || "",
    color: s.color || "#00767a",
  }));
  const idMap = {};
  obj.subjects.forEach((s, i) => {
    idMap[s.id] = subjects[i].id;
  });

  const sessions = obj.sessions.map((s) => ({
    id: uid(),
    subjectId: idMap[s.subjectId] || s.subjectId,
    day: typeof s.day === "number" ? s.day : 0,
    start: s.start || "08:30",
    end: s.end || "10:00",
    room: s.room || "",
    grupos: (s.grupos || []).map((g) => ({
      id: uid(),
      code: g.code || "A1",
      tipo: g.tipo || "Clases de teoría",
      weeksTotal: g.weeksTotal || (g.weeksActive ? g.weeksActive.length : 16),
      weeksActive: g.weeksActive || Array(g.weeksTotal || 16).fill(true),
    })),
  }));

  state.subjects = subjects;
  state.sessions = sessions;
  if (obj.titulo) state.meta.titulo = obj.titulo;
  if (obj.anioAcademico) state.meta.anio = obj.anioAcademico;
  if (obj.curso) state.meta.curso = obj.curso;
  if (obj.semestre) state.meta.semestre = obj.semestre;
  if (obj.grupo) state.meta.grupo = obj.grupo;

  // El mini calendario es opcional: si el JSON no trae "miniCalendar", no se
  // activa nada solo (sigue como estaba, apagado por defecto). Si lo trae,
  // se puede rellenar entero (fecha de inicio, semanas, vacaciones y notas)
  // sin tocar el formulario a mano.
  if (obj.miniCalendar && typeof obj.miniCalendar === "object") {
    const mc = obj.miniCalendar;
    state.miniCalendar = {
      enabled: !!mc.enabled,
      startDate: mc.startDate || "",
      weeksCount: mc.weeksCount || 16,
      breaks: Array.isArray(mc.breaks)
        ? mc.breaks.filter((b) => b && b.start && b.end).map((b) => ({ start: b.start, end: b.end }))
        : [],
      notes: Array.isArray(mc.notes) ? mc.notes.filter((n) => typeof n === "string") : [],
    };
  }

  return true;
}

/** Lee un archivo .json seleccionado por el usuario e importa su contenido. */
export function handleFileImport(file, onSuccess) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (importFromObject(obj)) onSuccess();
    } catch (err) {
      alert("No se pudo leer el archivo JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

/** Importa el JSON pegado como texto (pestaña "Importar"). */
export function importFromPastedText(raw, onSuccess) {
  if (!raw.trim()) {
    alert("Pega primero el JSON.");
    return;
  }
  try {
    const obj = JSON.parse(raw);
    if (importFromObject(obj)) onSuccess();
  } catch (err) {
    alert("El texto pegado no es JSON válido: " + err.message);
  }
}

/** Captura #exportArea (título + meta + calendario + leyenda) y lo descarga como PNG. */
export async function downloadPNG() {
  const btn = document.getElementById("btnPNG");
  const original = btn.textContent;

  if (state.sessions.length === 0) {
    alert("Añade al menos una sesión antes de descargar la imagen.");
    return;
  }
  if (typeof html2canvas === "undefined") {
    alert(
      "No se pudo cargar la librería de exportación de imagen (revisa tu conexión a internet) e inténtalo de nuevo."
    );
    return;
  }

  btn.disabled = true;
  btn.textContent = "Generando imagen…";

  const shell = document.querySelector(".shell");
  const scrollBox = document.querySelector(".cal-scroll");
  const target = document.getElementById("exportArea");

  // Guardamos los estilos que vamos a tocar para restaurarlos después.
  const prevShellMaxWidth = shell ? shell.style.maxWidth : null;
  const prevScrollOverflow = scrollBox.style.overflow;
  const prevScrollWidth = scrollBox.style.width;

  // El contenedor ".shell" tiene un max-width para verse bien en pantalla,
  // y ".cal-scroll" recorta con scroll horizontal cuando el horario es más
  // ancho que la pantalla (por ejemplo, con días que llevan solapes). Antes
  // de hacer la foto quitamos ambas limitaciones para que TODO el horario se
  // despliegue a su ancho real; si no, html2canvas solo capturaba la parte
  // que cabía en pantalla y el resto se quedaba cortado en la imagen.
  if (shell) shell.style.maxWidth = "none";
  scrollBox.style.overflow = "visible";
  scrollBox.style.width = "max-content";

  try {
    // Con las limitaciones ya quitadas, medimos el tamaño real desplegado.
    const fullWidth = target.scrollWidth;
    const fullHeight = target.scrollHeight;

    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
    });
    const link = document.createElement("a");
    const safeName = (state.meta.titulo || "horario").toLowerCase().replace(/[^a-z0-9]+/gi, "_");
    link.download = safeName + ".png";
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    alert("No se pudo generar la imagen: " + err.message);
  } finally {
    if (shell) shell.style.maxWidth = prevShellMaxWidth;
    scrollBox.style.overflow = prevScrollOverflow;
    scrollBox.style.width = prevScrollWidth;
    btn.disabled = false;
    btn.textContent = original;
  }
}

