/**
 * main.js
 * Punto de entrada de la aplicación. Es el único módulo que conoce a todos
 * los demás: conecta los botones de la interfaz con las acciones de cada
 * módulo y decide cuándo hay que volver a pintar la pantalla.
 */

import { state } from "./state.js";
import { saveState, loadState } from "./storage.js";
import * as subjects from "./subjects.js";
import * as sessionForm from "./sessionForm.js";
import * as calendar from "./calendar.js";
import { initModal } from "./modal.js";
import * as importExport from "./importExport.js";
import * as miniCalendar from "./miniCalendar.js";

const META_FIELDS = {
  metaTitulo: "titulo",
  metaAnio: "anio",
  metaCurso: "curso",
  metaSemestre: "semestre",
  metaGrupo: "grupo",
};

/** Vuelve a pintar todo lo que depende del estado y lo guarda en localStorage. */
function fullRender() {
  subjects.renderSubjectChips(handleDeleteSubject);
  sessionForm.renderSessionList(handleEditSession, handleDeleteSession);
  calendar.renderCalendar();
  calendar.renderLegend();
  miniCalendar.renderMiniCalendar();
  saveState();
}

function handleDeleteSubject(id) {
  if (subjects.removeSubject(id)) fullRender();
}
function handleEditSession(id) {
  sessionForm.loadSessionIntoForm(id);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function handleDeleteSession(id) {
  if (sessionForm.deleteSessionById(id)) fullRender();
}

/** Sincroniza los campos de Año académico/Curso/Semestre/Grupo con `state.meta`. */
function bindMetaInputs() {
  Object.entries(META_FIELDS).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    el.value = state.meta[key];
    el.addEventListener("input", () => {
      state.meta[key] = el.value;
      saveState();
    });
  });
}

/** Solo refresca los valores mostrados (tras una importación), sin duplicar listeners. */
function refreshMetaInputs() {
  Object.entries(META_FIELDS).forEach(([elId, key]) => {
    document.getElementById(elId).value = state.meta[key];
  });
}

/** "2026-12-28,2027-01-03\n..." -> [{start,end}, ...] */
function parseBreaksText(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [start, end] = line.split(",").map((s) => (s || "").trim());
      return { start, end };
    })
    .filter((b) => b.start && b.end);
}

/** [{start,end}, ...] -> "2026-12-28,2027-01-03\n..." */
function breaksToText(breaks) {
  return (breaks || []).map((b) => `${b.start},${b.end}`).join("\n");
}

/** "2026-10-12\n2026-12-08\n..." -> ["2026-10-12","2026-12-08",...] (líneas vacías fuera) */
function parseNotesText(raw) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Sincroniza los campos del mini calendario con `state.miniCalendar`. */
function bindMiniCalendarInputs() {
  const cfg = state.miniCalendar;
  const elEnabled = document.getElementById("mcEnabled");
  const elStart = document.getElementById("mcStartDate");
  const elWeeks = document.getElementById("mcWeeksCount");
  const elBreaks = document.getElementById("mcBreaks");
  const elHolidays = document.getElementById("mcHolidays");
  const elNotes = document.getElementById("mcNotes");

  refreshMiniCalendarInputs();

  const onChange = () => {
    cfg.enabled = elEnabled.value === "1";
    cfg.startDate = elStart.value;
    cfg.weeksCount = parseInt(elWeeks.value) || 16;
    cfg.breaks = parseBreaksText(elBreaks.value);
    cfg.holidays = parseNotesText(elHolidays.value); // mismo formato: una fecha por línea
    cfg.notes = parseNotesText(elNotes.value);
    saveState();
    miniCalendar.renderMiniCalendar();
  };

  elEnabled.addEventListener("change", onChange);
  elStart.addEventListener("input", onChange);
  elWeeks.addEventListener("input", onChange);
  elBreaks.addEventListener("input", onChange);
  elHolidays.addEventListener("input", onChange);
  elNotes.addEventListener("input", onChange);
}

/** Solo refresca los valores mostrados (tras cargar o importar), sin duplicar listeners. */
function refreshMiniCalendarInputs() {
  const cfg = state.miniCalendar;
  document.getElementById("mcEnabled").value = cfg.enabled ? "1" : "0";
  document.getElementById("mcStartDate").value = cfg.startDate || "";
  document.getElementById("mcWeeksCount").value = cfg.weeksCount || 16;
  document.getElementById("mcBreaks").value = breaksToText(cfg.breaks);
  document.getElementById("mcHolidays").value = (cfg.holidays || []).join("\n");
  document.getElementById("mcNotes").value = (cfg.notes || []).join("\n");
}

function onImportSuccess() {
  sessionForm.resetForm();
  refreshMetaInputs();
  refreshMiniCalendarInputs();
  fullRender();
  alert("Horario importado correctamente.");
}

function wireFileImportInput(inputId) {
  document.getElementById(inputId).addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importExport.handleFileImport(file, onImportSuccess);
    e.target.value = "";
  });
}

function wireEvents() {
  // ---- Asignaturas ----
  document.getElementById("btnAddSubject").addEventListener("click", () => {
    const siglas = document.getElementById("subSiglas").value.trim();
    const nombre = document.getElementById("subNombre").value.trim();
    const codigo = document.getElementById("subCodigo").value.trim();
    const color = document.getElementById("subColor").value;
    if (!siglas || !nombre) {
      alert("Pon siglas y nombre completo.");
      return;
    }
    subjects.addSubject({ siglas, nombre, codigo, color });
    document.getElementById("subSiglas").value = "";
    document.getElementById("subNombre").value = "";
    document.getElementById("subCodigo").value = "";
    fullRender();
  });

  // ---- Semanas activas ----
  document.getElementById("grpWeeksTotal").addEventListener("input", sessionForm.renderWeekToggleGrid);
  document.getElementById("btnAllOn").addEventListener("click", () => sessionForm.setAllWeeks(true));
  document.getElementById("btnAllOff").addEventListener("click", () => sessionForm.setAllWeeks(false));
  document.getElementById("btnApplyQuick").addEventListener("click", () => {
    sessionForm.applyQuickOff(document.getElementById("weekQuickOff").value.trim());
  });
  document.getElementById("grpTipo").addEventListener("change", sessionForm.toggleCustomTipoField);

  // ---- Grupos de la sesión en construcción ----
  document.getElementById("btnAddGrupo").addEventListener("click", () => sessionForm.addGrupoToTemp());

  // ---- Guardar / cancelar sesión ----
  document.getElementById("btnSaveSession").addEventListener("click", () => {
    if (sessionForm.saveSessionFromForm()) {
      sessionForm.resetForm();
      fullRender();
    }
  });
  document.getElementById("btnCancelEditSession").addEventListener("click", sessionForm.resetForm);

  // ---- Meta (título / año / curso / semestre / grupo) ----
  bindMetaInputs();

  // ---- Import / Export JSON ----
  document.getElementById("btnExport").addEventListener("click", importExport.exportJSON);
  wireFileImportInput("fileImport");
  wireFileImportInput("fileImport2");
  document.getElementById("btnImportPaste").addEventListener("click", () => {
    const raw = document.getElementById("importText").value;
    importExport.importFromPastedText(raw, onImportSuccess);
  });

  // ---- Vaciar horario ----
  document.getElementById("btnReset").addEventListener("click", () => {
    if (!confirm("Esto borrará todas las asignaturas y sesiones. ¿Seguro?")) return;
    state.subjects = [];
    state.sessions = [];
    sessionForm.resetForm();
    fullRender();
  });

  // ---- Descargar imagen PNG ----
  document.getElementById("btnPNG").addEventListener("click", importExport.downloadPNG);

  // ---- Pestañas ----
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function init() {
  loadState();
  sessionForm.renderWeekToggleGrid();
  sessionForm.renderGrupoMiniList();
  initModal();
  wireEvents(); // bindMetaInputs() se llama aquí dentro, una única vez
  fullRender();
}

init();
