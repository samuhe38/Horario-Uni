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

  const scrollBox = document.querySelector(".cal-scroll");
  const prevOverflow = scrollBox.style.overflow;
  scrollBox.style.overflow = "visible"; // para que no se recorte el ancho scrolleable

  try {
    const target = document.getElementById("exportArea");
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
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
    scrollBox.style.overflow = prevOverflow;
    btn.disabled = false;
    btn.textContent = original;
  }
}
