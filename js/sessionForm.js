/**
 * sessionForm.js
 * Todo lo relativo a crear/editar una sesión: el propio formulario, el
 * constructor de grupos dentro de una sesión, la rejilla de semanas activas,
 * y el listado de sesiones ya guardadas.
 *
 * Mantiene su propio estado "de borrador" (tempGrupos, editingSessionId,
 * currentWeeksActive) que solo se vuelca a `state.sessions` al guardar.
 */

import { state, DAY_NAMES } from "./state.js";
import { uid, toMinutes, escapeHtml } from "./utils.js";

let tempGrupos = [];
let editingSessionId = null;
let currentWeeksActive = Array(16).fill(true);

/* ============================= Semanas activas ============================= */

/** Repinta la rejilla de números de semana (clic para marcar/desmarcar). */
export function renderWeekToggleGrid() {
  const total = parseInt(document.getElementById("grpWeeksTotal").value) || 16;
  if (currentWeeksActive.length !== total) {
    const old = currentWeeksActive;
    currentWeeksActive = Array(total)
      .fill(true)
      .map((v, i) => (i < old.length ? old[i] : true));
  }
  const grid = document.getElementById("weekToggleGrid");
  grid.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "week-btn" + (currentWeeksActive[i] ? "" : " off");
    btn.textContent = i + 1;
    btn.onclick = () => {
      currentWeeksActive[i] = !currentWeeksActive[i];
      renderWeekToggleGrid();
    };
    grid.appendChild(btn);
  }
}

export function setAllWeeks(value) {
  currentWeeksActive = currentWeeksActive.map(() => value);
  renderWeekToggleGrid();
}

export function applyQuickOff(raw) {
  if (!raw) return;
  const nums = raw
    .split(",")
    .map((x) => parseInt(x.trim()))
    .filter((n) => !isNaN(n));
  currentWeeksActive = currentWeeksActive.map((v, i) => !nums.includes(i + 1));
  renderWeekToggleGrid();
}

export function toggleCustomTipoField() {
  const tipo = document.getElementById("grpTipo").value;
  document.getElementById("grpTipoCustomWrap").style.display = tipo === "__custom" ? "block" : "none";
}

/* ================== Grupos dentro de la sesión en construcción ================== */

export function renderGrupoMiniList() {
  const box = document.getElementById("grupoMiniList");
  box.innerHTML = "";
  tempGrupos.forEach((g) => {
    const activos = g.weeksActive.filter(Boolean).length;
    const row = document.createElement("div");
    row.className = "grupo-mini";
    row.innerHTML = `<span><b>${escapeHtml(g.code)}</b> — ${escapeHtml(g.tipo)}
      <span class="weeks-preview">(${activos}/${g.weeksTotal} semanas activas)</span></span>`;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "small ghost-danger";
    del.textContent = "✕";
    del.onclick = () => {
      tempGrupos = tempGrupos.filter((x) => x.id !== g.id);
      renderGrupoMiniList();
    };
    row.appendChild(del);
    box.appendChild(row);
  });
}

export function addGrupoToTemp() {
  const code = document.getElementById("grpCode").value.trim();
  let tipo = document.getElementById("grpTipo").value;
  if (tipo === "__custom") {
    tipo = document.getElementById("grpTipoCustom").value.trim() || "Otro";
  }
  if (!code) {
    alert("Pon el código de grupo (ej: A1).");
    return;
  }
  tempGrupos.push({
    id: uid(),
    code,
    tipo,
    weeksTotal: parseInt(document.getElementById("grpWeeksTotal").value) || 16,
    weeksActive: [...currentWeeksActive],
  });
  document.getElementById("grpCode").value = "";
  document.getElementById("weekQuickOff").value = "";
  renderGrupoMiniList();
}

/* ============================ Guardar / editar sesión ============================ */

/** Valida el formulario y guarda (crea o actualiza) la sesión en `state.sessions`. */
export function saveSessionFromForm() {
  const subjectId = document.getElementById("sesSubject").value;
  if (!subjectId) {
    alert("Primero crea al menos una asignatura.");
    return false;
  }
  const day = parseInt(document.getElementById("sesDay").value);
  const start = document.getElementById("sesStart").value;
  const end = document.getElementById("sesEnd").value;
  const room = document.getElementById("sesRoom").value.trim();
  if (!start || !end) {
    alert("Pon hora de inicio y fin.");
    return false;
  }
  if (toMinutes(end) <= toMinutes(start)) {
    alert("La hora de fin debe ser posterior a la de inicio.");
    return false;
  }
  if (tempGrupos.length === 0) {
    alert("Añade al menos un grupo a esta sesión.");
    return false;
  }

  if (editingSessionId) {
    const s = state.sessions.find((x) => x.id === editingSessionId);
    Object.assign(s, { subjectId, day, start, end, room, grupos: tempGrupos });
  } else {
    state.sessions.push({ id: uid(), subjectId, day, start, end, room, grupos: tempGrupos });
  }
  return true;
}

/** Limpia el formulario y vuelve al modo "nueva sesión". */
export function resetForm() {
  editingSessionId = null;
  tempGrupos = [];
  currentWeeksActive = Array(16).fill(true);
  document.getElementById("sesRoom").value = "";
  document.getElementById("grpCode").value = "";
  document.getElementById("grpWeeksTotal").value = 16;
  document.getElementById("weekQuickOff").value = "";
  document.getElementById("btnSaveSession").textContent = "Guardar sesión";
  document.getElementById("btnCancelEditSession").style.display = "none";
  renderGrupoMiniList();
  renderWeekToggleGrid();
}

/** Vuelca una sesión existente en el formulario para editarla. */
export function loadSessionIntoForm(id) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return;
  editingSessionId = id;
  document.getElementById("sesSubject").value = s.subjectId;
  document.getElementById("sesDay").value = s.day;
  document.getElementById("sesStart").value = s.start;
  document.getElementById("sesEnd").value = s.end;
  document.getElementById("sesRoom").value = s.room;
  tempGrupos = JSON.parse(JSON.stringify(s.grupos));
  renderGrupoMiniList();
  document.getElementById("btnSaveSession").textContent = "Guardar cambios";
  document.getElementById("btnCancelEditSession").style.display = "inline-block";
}

/** Elimina una sesión (con confirmación). Devuelve `true` si se eliminó. */
export function deleteSessionById(id) {
  if (!confirm("¿Eliminar esta sesión del horario?")) return false;
  state.sessions = state.sessions.filter((s) => s.id !== id);
  return true;
}

/**
 * Dibuja el listado de sesiones ya guardadas.
 * @param {(id:string)=>void} onEdit
 * @param {(id:string)=>void} onDelete
 */
export function renderSessionList(onEdit, onDelete) {
  const box = document.getElementById("sessionList");
  box.innerHTML = "";
  const sorted = [...state.sessions].sort(
    (a, b) => a.day - b.day || toMinutes(a.start) - toMinutes(b.start)
  );
  sorted.forEach((s) => {
    const subj = state.subjects.find((x) => x.id === s.subjectId);
    if (!subj) return;
    const item = document.createElement("div");
    item.className = "session-item";
    item.style.borderLeftColor = subj.color;
    const grupoTxt = s.grupos.map((g) => `${g.code} (${g.tipo})`).join(", ");
    item.innerHTML = `<div class="info">
        <b>${DAY_NAMES[s.day]} · ${s.start}–${s.end}</b>
        <span class="muted">${escapeHtml(subj.siglas)} · ${escapeHtml(s.room || "sin aula")} · ${escapeHtml(grupoTxt)}</span>
      </div>
      <div class="btns"></div>`;
    const btns = item.querySelector(".btns");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "small";
    editBtn.textContent = "Editar";
    editBtn.onclick = () => onEdit(s.id);
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "small ghost-danger";
    delBtn.textContent = "Eliminar";
    delBtn.onclick = () => onDelete(s.id);
    btns.appendChild(editBtn);
    btns.appendChild(delBtn);
    box.appendChild(item);
  });
}
