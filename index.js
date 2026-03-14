// Asegura que window.createTag está disponible
import "./tag.component.js";
import "./button.component.js";
import {
  initAuth,
  handleLoginClick,
  handleLogoutClick,
  isSignedIn,
} from "./firebase-auth.js";
import {
  backupToFirestore,
  restoreFromFirestore,
  renderFirebaseBackupInfo,
} from "./firebase-backup.js";
import {
  dateDiff,
  formatDiff,
  getNextOccurrence,
  advanceDateByFrequency,
} from "./utils/dateUtils.js";
import {
  initCounterManager,
  getCounters,
  saveCounters,
  renderCounters,
  updateCountersTime,
  deleteCounter as deleteCounterFromManager,
  addOrUpdateCounter,
} from "./core/counterManager.js"; // Import addOrUpdateCounter
import { showPopover, closePopover } from "./popover.js";
import Modal from "./modal.component.js";


function getConfig() {
  const defaultConfig = {
    years: true,
    months: true,
    days: true,
    hours: true,
    minutes: true,
    seconds: true,
  };
  const saved = JSON.parse(
    localStorage.getItem("config") || JSON.stringify(defaultConfig)
  );
  // Ignorar cualquier clave antigua relacionada con Drive
  delete saved.driveSync;
  return saved;
}

function saveConfig(config) {
  localStorage.setItem("config", JSON.stringify(config));
}

function getFilterTags() {
  return currentFilterTags;
}

function getDomListElement() {
  return document.getElementById("counters-list");
}

function getCounterTimeElement(originalIdx, occurrenceIdx) {
  if (occurrenceIdx === null) {
    // For non-recurring counters
    return document.getElementById(`counter-time-${originalIdx}`);
  }
  return document.getElementById(
    `counter-time-${originalIdx}-${occurrenceIdx}`
  );
}

// Inicializar el CounterManager con las dependencias necesarias
initCounterManager({
  getConfig,
  getFilterTags,
  openCounterModal, // openCounterModal (from index.js)
  // openDeletePopover: showDeletePopover, // ELIMINADO: ya no existe showDeletePopover
  renderFilterTags, // renderFilterTags (from index.js)
  getDomListElement,
  getCounterTimeElement,
  deleteCounter: deleteCounterFromManager, // Pass the manager's deleteCounter
});

// --- ELIMINADO: Popover de confirmación de borrado legacy ---
// Toast HTML
const toastHtml = `
<div id="undo-toast" class="toast" style="display:none;">
  <div class="toast-content-row" id="toast-content-row"></div>
  <div class="toast-progress"><div id="toast-bar"></div></div>
</div>`;
document.body.insertAdjacentHTML("beforeend", toastHtml);

// --- MODAL NUEVO/EDITAR CONTADOR CON ETIQUETAS ---
let modalTags = [];
let editingIdx = null;
let deleteIdx = null;
let lastDeleted = null;
let toastTimeout = null;
let currentFilterTags = []; // Renamed for clarity and to avoid conflict if filterTags was meant to be local elsewhere.

function openCounterModal(mode = "new", idx = null) {
  const modal = document.getElementById("counter-modal");
  const title = document.getElementById("counter-modal-title");
  const nameInput = document.getElementById("modal-counter-name");
  const dateInput = document.getElementById("modal-counter-date");
  const timeInput = document.getElementById("modal-counter-time");
  const frequencySelect = document.getElementById("modal-counter-frequency"); // Added
  const endDateGroup = document.getElementById("modal-end-date-group"); // Added
  const endDateInput = document.getElementById("modal-counter-end-date"); // Added
  const dateHint = document.getElementById("modal-date-hint");

  // Show/hide date hint and end date field based on frequency selection
  frequencySelect.onchange = function () {
    const selectedFrequency = this.value;
    dateHint.style.display = selectedFrequency === "annual" ? "block" : "none";
    endDateGroup.style.display =
      selectedFrequency !== "none" ? "block" : "none";
    if (selectedFrequency === "none") {
      endDateInput.value = ""; // Clear end date if not recurring
    }
  };

  if (mode === "edit" && idx !== null) {
    const counters = getCounters();
    const counter = counters[idx];
    nameInput.value = counter.name;
    // Rellenar fecha y hora a partir de counter.date
    if (counter.date) {
      const dateObj = new Date(counter.date);
      if (!isNaN(dateObj.getTime())) {
        // Fecha (YYYY-MM-DD)
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        dateInput.value = `${year}-${month}-${day}`;
        // Hora (HH:MM)
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        timeInput.value = `${hours}:${minutes}`;
      } else {
        // Compatibilidad si el formato no es reconocible
        dateInput.value = counter.date;
        timeInput.value = "";
      }
    } else {
      dateInput.value = "";
      timeInput.value = "";
    }
    modalTags = Array.isArray(counter.tags) ? [...counter.tags] : [];
    frequencySelect.value = counter.frequency || "none"; // Added
    endDateInput.value = counter.endDate || ""; // Added
    // Trigger change to set initial visibility of hint and end date
    frequencySelect.dispatchEvent(new Event("change"));
    title.textContent = "Editar contador";
    editingIdx = idx;
  } else {
    nameInput.value = "";
    dateInput.value = "";
    timeInput.value = "";
    modalTags = [];
    frequencySelect.value = "none"; // Added
    endDateInput.value = ""; // Added
    // Trigger change to set initial visibility of hint and end date
    frequencySelect.dispatchEvent(new Event("change"));
    title.textContent = "Nuevo contador";
    editingIdx = null;
  }
  renderTagsList();
  renderTagSuggestions();
  modal.style.display = "flex";
  setTimeout(() => nameInput.focus(), 100);
}

function closeCounterModal() {
  document.getElementById("counter-modal").style.display = "none";
  editingIdx = null;
}

function getAllTags() {
  const counters = getCounters();
  const tagsSet = new Set();
  counters.forEach((c) => {
    if (Array.isArray(c.tags)) {
      c.tags.forEach((tag) => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet);
}

function renderTagSuggestions() {
  const suggestionsDiv = document.getElementById("tag-suggestions");
  if (!suggestionsDiv) return;
  const allTags = getAllTags().filter((tag) => !modalTags.includes(tag));
  suggestionsDiv.innerHTML = "";
  allTags.forEach((tag) => {
    const tagEl = window.createTag({
      text: tag,
      removable: false,
      onRemove: null,
    });
    if (!tagEl) return; // Si no se pudo crear el tag, saltar
    tagEl.classList.add("tag-suggestion");
    // Solo asignar onclick si el elemento está en el DOM
    tagEl.addEventListener &&
      tagEl.addEventListener("click", () => {
        modalTags.push(tag);
        renderTagsList();
        renderTagSuggestions();
      });
    suggestionsDiv.appendChild(tagEl);
  });
  suggestionsDiv.style.display = allTags.length ? "flex" : "none";
}

function renderTagsList() {
  const tagsList = document.getElementById("tags-list");
  tagsList.innerHTML = "";
  modalTags.forEach((tag, i) => {
    const tagEl = window.createTag({
      text: tag,
      removable: true,
      onRemove: () => {
        modalTags.splice(i, 1);
        renderTagsList();
        renderTagSuggestions();
      },
    });
    tagsList.appendChild(tagEl);
  });
  // Botón añadir etiqueta
  const addTagBtn = document.getElementById("add-tag-btn");
  if (addTagBtn) {
    const newBtn = window.createButton({
      text: "Añadir",
      color: "primary",
      id: "add-tag-btn",
      onClick: addTagBtn.onclick,
    });
    addTagBtn.replaceWith(newBtn);
  }
  renderTagSuggestions();
}

document.getElementById("tag-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("add-tag-btn").click();
  }
});

document.getElementById("close-counter-modal").onclick = closeCounterModal;
document.getElementById("cancel-counter-modal").onclick = closeCounterModal;
document.getElementById("counter-modal").onclick = function (e) {
  if (e.target === this) closeCounterModal();
};
document.addEventListener("keydown", function (e) {
  if (
    document.getElementById("counter-modal").style.display !== "none" &&
    e.key === "Escape"
  ) {
    closeCounterModal();
  }
});

document.getElementById("open-add-modal").onclick = function () {
  openCounterModal("new");
};

document
  .getElementById("counter-form-modal")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("modal-counter-name").value.trim();
    const date = document.getElementById("modal-counter-date").value;
    const time = document.getElementById("modal-counter-time").value;
    const frequency = document.getElementById("modal-counter-frequency").value; // Added
    const endDate = document.getElementById("modal-counter-end-date").value; // Added

    if (!name || !date) return;
    // Validate that end date is after start date if frequency is not 'none'
    if (frequency !== "none" && endDate && new Date(endDate) < new Date(date)) {
      alert(
        "La fecha de finalización no puede ser anterior a la fecha de inicio del contador."
      );
      return;
    }

    // Combinar fecha y hora en un solo valor (si hay hora)
    let combinedDate = date;
    if (time) {
      // Formato YYYY-MM-DDTHH:MM para que new Date(...) pueda interpretarlo
      combinedDate = `${date}T${time}`;
    }

    const counterData = {
      name,
      date: combinedDate,
      tags: [...modalTags],
      frequency,
      endDate: frequency !== "none" ? endDate : "", // Save endDate only if recurring
    };

    // Use the manager function to add or update the counter
    addOrUpdateCounter(counterData, editingIdx);
    // renderCounters() is called by addOrUpdateCounter in the manager
    // saveCounters() is also called by addOrUpdateCounter in the manager

    closeCounterModal();
    // Backup automático en Firebase si está autenticado
    if (isSignedIn()) {
      try {
        await backupToFirestore();
      } catch (e) {}
    }
  });

document.getElementById("counters-list").onclick = function (e) {
  if (e.target.classList.contains("edit-btn")) {
    const idx = e.target.getAttribute("data-idx");
    openCounterModal("edit", idx);
  }
  if (e.target.classList.contains("delete-btn")) {
    const idx = e.target.getAttribute("data-idx");
    const counters = getCounters();
    const counter = counters[idx];
    if (!counter) return;
    // Detectar si es una ocurrencia recurrente
    const li = e.target.closest("li");
    const occurrenceDate = li ? li.getAttribute("data-occurrence-date") : null;
    showPopover({
      message: "¿Estás seguro de eliminar este contador?",
      actions: [
        {
          text: "Eliminar",
          className: "btn-danger",
          onClick: () => {
            if (
              occurrenceDate &&
              counter.frequency &&
              counter.frequency !== "none"
            ) {
              // Borrar solo la ocurrencia específica
              deleteCounterFromManager(counter.id, occurrenceDate);
            } else {
              // Borrar el contador completo
              deleteCounterFromManager(counter.id, null);
            }
          },
        },
        { text: "Cancelar", className: "btn-secondary" },
      ],
      anchorElement: e.target,
    });
  }
};

function showToast(msg, onUndo) {
  const toast = document.getElementById("undo-toast");
  document.getElementById("toast-msg").textContent = msg;
  toast.style.display = "flex";
  toast.classList.add("show");
  document.getElementById("undo-btn").onclick = function () {
    if (onUndo) onUndo();
    hideToast();
  };
  // Barra de progreso
  const bar = document.getElementById("toast-bar");
  let duration = 10000;
  let start = Date.now();
  bar.style.width = "100%";
  function animateBar() {
    let elapsed = Date.now() - start;
    let percent = Math.max(0, 1 - elapsed / duration);
    bar.style.width = percent * 100 + "%";
    if (percent > 0 && toast.style.display !== "none") {
      requestAnimationFrame(animateBar);
    }
  }
  animateBar();
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(hideToast, duration);
}

function hideToast() {
  const toast = document.getElementById("undo-toast");
  toast.style.display = "none";
  toast.classList.remove("show");
  clearTimeout(toastTimeout);
}

// --- ELIMINADO: closeDeletePopover y referencias a delete-popover ---

function deleteCounter(idx, deleteAllOccurrences = false) {
  // This function in index.js is now primarily a trigger for the popover or direct calls.
  // The actual deletion logic is in counterManager.js.
  // For simplicity, we'll call the manager's delete function directly from here if needed,
  // or let the popover call it.
  // However, the popover's buttons are already wired to call deleteCounterFromManager via the init step.

  // If this function is called directly (e.g. not from popover), it should use the manager's delete.
  // But the current setup has the popover buttons directly calling the manager's delete function.
  // This local deleteCounter might become obsolete or just be for non-popover scenarios.

  // console.log(`index.js deleteCounter called for index: ${idx}, deleteAll: ${deleteAllOccurrences}`);
  // deleteCounterFromManager(idx, deleteAllOccurrences); // Example of direct call if needed

  // The popover buttons are now the primary way to delete, and they call the manager's delete directly.
  // So, this function might not be strictly needed anymore unless there are other call sites.
  // For now, let's ensure it calls the manager's version if it *is* called.
  deleteCounterFromManager(idx, deleteAllOccurrences);
}

function renderFilterTags() {
  const filterTagsList = document.getElementById("filter-tags-list");
  if (!filterTagsList) return;
  const allTags = getAllTags();
  filterTagsList.innerHTML = "";
  allTags.forEach((tag) => {
    const btn = window.createTag({
      text: tag,
      removable: false,
      selectable: true,
      selected: currentFilterTags.includes(tag),
      onSelect: () => {
        if (currentFilterTags.includes(tag)) {
          currentFilterTags = currentFilterTags.filter((t) => t !== tag);
        } else {
          currentFilterTags.push(tag);
        }
        renderFilterTags();
        renderCounters();
      },
    });
    btn.classList.add("filter-tag-btn");
    filterTagsList.appendChild(btn);
  });
}

window.renderFirebaseBackupInfo = renderFirebaseBackupInfo;
window.renderCounters = renderCounters;

window.addEventListener("DOMContentLoaded", () => {
  initAuth(async (user) => {
    if (user) {
      const localCounters = localStorage.getItem("counters");
      if (!localCounters || localCounters === "[]") {
        try {
          await restoreFromFirestore(true);
        } catch (e) {}
      }
    }
  });
  // Configuración de formulario y UI
  const config = getConfig();
  renderFilterTags();

  // Reemplazar botones del popover
  const popoverActions = document.getElementById("popover-actions");
  if (popoverActions) {
    popoverActions.innerHTML = "";
    popoverActions.appendChild(
      window.createButton({
        text: "Cancelar",
        color: "secondary",
        id: "popover-cancel",
        onClick: closeDeletePopover,
      })
    );
    popoverActions.appendChild(
      window.createButton({
        text: "Eliminar",
        color: "danger",
        id: "popover-confirm",
        onClick: async function () {
          if (deleteIdx !== null) {
            const counters = getCounters();
            lastDeleted = { ...counters[deleteIdx], idx: deleteIdx };
            counters.splice(deleteIdx, 1);
            saveCounters(counters);
            renderCounters();
            showToast("Contador eliminado", async function () {
              const counters = getCounters();
              if (lastDeleted) {
                counters.splice(lastDeleted.idx, 0, { ...lastDeleted });
                saveCounters(counters);
                renderCounters();
                lastDeleted = null;
                if (isSignedIn()) {
                  try {
                    await backupToFirestore();
                  } catch (e) {}
                }
              }
            });
            if (isSignedIn()) {
              try {
                await backupToFirestore();
              } catch (e) {}
            }
          }
        },
      })
    );
  }
  // Reemplazar botón de toast
  const toastContentRow = document.getElementById("toast-content-row");
  if (toastContentRow) {
    toastContentRow.innerHTML = "";
    const msgSpan = document.createElement("span");
    msgSpan.id = "toast-msg";
    toastContentRow.appendChild(msgSpan);
    toastContentRow.appendChild(
      window.createButton({
        text: "Deshacer",
        color: "primary",
        id: "undo-btn",
      })
    );
  }
  renderCounters(); // <-- Asegura que la lista se muestre al cargar la página
  // Actualizar tiempos en las cards cada segundo
  setInterval(updateCountersTime, 1000);
});

// --- Modal de configuración usando el componente Modal ---
function openConfigModal() {
  const header = `
    <span class="modal-title">Configuración</span>
  `;

  const body = `
    <div class="units-section-modal units-section-box" style="margin-top: 10px">
      <div class="units-section-title">
        <i class="fa-solid fa-clock" style="margin-right: 7px"></i>Unidades de tiempo
      </div>
      <div id="config-form-modal" class="units-buttons-row">
        <button type="button" class="unit-btn" data-unit="years">Años</button>
        <button type="button" class="unit-btn" data-unit="months">Meses</button>
        <button type="button" class="unit-btn" data-unit="days">Días</button>
        <button type="button" class="unit-btn" data-unit="hours">Horas</button>
        <button type="button" class="unit-btn" data-unit="minutes">Min</button>
        <button type="button" class="unit-btn" data-unit="seconds">Seg</button>
      </div>
      <div id="units-preview" class="units-preview"></div>
    </div>
    <div class="units-section-modal units-section-box" style="margin-top: 22px">
      <div class="units-section-title">
        <i class="fa-solid fa-file-excel" style="margin-right: 7px; color: #1d6f42"></i>Importar / Exportar
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap">
        <button id="export-excel-btn" class="btn-backup" type="button"><i class="fa-solid fa-file-arrow-down"></i> Exportar a Excel</button>
        <label for="import-excel-input" class="btn-restore" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-file-arrow-up"></i> Importar desde Excel
          <input id="import-excel-input" type="file" accept=".xlsx,.xls" style="display: none" />
        </label>
      </div>
    </div>
    <div id="firebase-section" class="units-section-modal units-section-box" style="margin-top: 22px">
      <div class="units-section-title">
        <i class="fa-solid fa-cloud" style="margin-right: 7px"></i>Sincronización con Firebase
      </div>
      <div id="firebase-auth-area"></div>
    </div>
  `;

  const footer = `<button type="button" id="close-config-modal-footer">Cerrar</button>`;

  const modal = new Modal({
    header,
    body,
    footer,
    closable: true,
    onClose: () => {},
  });

  modal.open();

  const root = modal.modal;
  const config = getConfig();

  // Sincronizar y manejar unidades + preview
  const configFormModal = root.querySelector("#config-form-modal");
  const unitsPreview = root.querySelector("#units-preview");

  function renderUnitsPreview(cfg) {
    if (!unitsPreview) return;
    const fakeDiff = {
      years: 2,
      months: 5,
      days: 12,
      hours: 4,
      minutes: 30,
      seconds: 15,
    };
    const text = formatDiff(fakeDiff, cfg);
    unitsPreview.textContent = `Ejemplo: ${text}`;
  }

  if (configFormModal) {
    function syncButtonsFromConfig(cfg) {
      configFormModal.querySelectorAll(".unit-btn").forEach((btn) => {
        const unit = btn.dataset.unit;
        btn.classList.toggle("selected", !!cfg[unit]);
      });
    }

    syncButtonsFromConfig(config);
    renderUnitsPreview(config);

    configFormModal.querySelectorAll(".unit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const unit = btn.dataset.unit;
        const cfg = getConfig();
        cfg[unit] = !cfg[unit];
        saveConfig(cfg);
        syncButtonsFromConfig(cfg);
        renderCounters();
        renderUnitsPreview(cfg);
      });
    });
  }

  // Sección Firebase: login, backup, restore
  function renderFirebaseAuthArea() {
    const area = root.querySelector("#firebase-auth-area");
    if (!area) return;
    area.innerHTML = "";
    if (isSignedIn()) {
      const btnFullWidth = "100%";
      const backupBtn = document.createElement("button");
      backupBtn.id = "firebase-backup-btn";
      backupBtn.className = "btn-backup";
      backupBtn.type = "button";
      backupBtn.style.width = btnFullWidth;
      backupBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar en la nube';
      backupBtn.onclick = backupToFirestore;
      const restoreBtn = document.createElement("button");
      restoreBtn.id = "firebase-restore-btn";
      restoreBtn.className = "btn-restore";
      restoreBtn.type = "button";
      restoreBtn.style.width = btnFullWidth;
      restoreBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Restaurar desde la nube';
      restoreBtn.onclick = restoreFromFirestore;
      const logoutBtn = document.createElement("button");
      logoutBtn.className = "btn-secondary";
      logoutBtn.type = "button";
      logoutBtn.style.width = btnFullWidth;
      logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión';
      logoutBtn.onclick = handleLogoutClick;
      const hintStyle = "font-size: 0.85em; color: #666; margin: 4px 0 12px 0;";
      const backupHint = document.createElement("p");
      backupHint.className = "firebase-hint";
      backupHint.style.cssText = hintStyle;
      backupHint.id = "firebase-backup-info";
      const restoreHint = document.createElement("p");
      restoreHint.className = "firebase-hint";
      restoreHint.style.cssText = hintStyle;
      restoreHint.textContent = "Restaurar sustituye todos los contadores locales por los de la nube.";
      const btnContainer = document.createElement("div");
      btnContainer.style.cssText = "display: flex; flex-direction: column; gap: 12px;";
      const guardarRow = document.createElement("div");
      guardarRow.appendChild(backupBtn);
      guardarRow.appendChild(backupHint);
      btnContainer.appendChild(guardarRow);
      const restoreRow = document.createElement("div");
      restoreRow.appendChild(restoreBtn);
      restoreRow.appendChild(restoreHint);
      btnContainer.appendChild(restoreRow);
      btnContainer.appendChild(logoutBtn);
      area.appendChild(btnContainer);
      renderFirebaseBackupInfo(backupHint);
    } else {
      const loginBtn = document.createElement("button");
      loginBtn.className = "btn-backup";
      loginBtn.type = "button";
      loginBtn.innerHTML = '<i class="fa-brands fa-google"></i> Iniciar sesión con Google';
      loginBtn.onclick = handleLoginClick;
      area.appendChild(loginBtn);
    }
  }
  renderFirebaseAuthArea();
  const authChangedHandler = () => renderFirebaseAuthArea();
  document.addEventListener("firebase-auth-changed", authChangedHandler);
  modal.onClose = () => {
    document.removeEventListener("firebase-auth-changed", authChangedHandler);
  };

  // Exportar a Excel
  const exportBtn = root.querySelector("#export-excel-btn");
  if (exportBtn) {
    exportBtn.onclick = function () {
      const XLSXlib = window.XLSX;
      if (!XLSXlib) {
        alert("No se ha cargado la librería XLSX.");
        return;
      }
      const counters = getCounters();
      const data = counters.map((c) => ({
        nombre: c.name,
        fecha: c.date,
        tags: Array.isArray(c.tags) ? c.tags : [],
      }));
      const dataExcel = data.map((row) => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
      }));
      const ws = XLSXlib.utils.json_to_sheet(dataExcel);
      const wb = XLSXlib.utils.book_new();
      XLSXlib.utils.book_append_sheet(wb, ws, "Contadores");
      XLSXlib.writeFile(wb, "contadores.xlsx");
    };
  }

  // Importar desde Excel
  const importInput = root.querySelector("#import-excel-input");
  if (importInput) {
    importInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) {
        window.showToast &&
          window.showToast("No se seleccionó ningún archivo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = function (evt) {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = window.XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = window.XLSX.utils.sheet_to_json(sheet);
          if (!Array.isArray(json) || !json.length) {
            window.showToast &&
              window.showToast("El archivo Excel está vacío o no tiene datos.");
            return;
          }
          const valid = json.every(
            (row) => "nombre" in row && "fecha" in row && "tags" in row
          );
          if (!valid) {
            window.showToast &&
              window.showToast(
                "El archivo debe tener las columnas: nombre, fecha y tags"
              );
            return;
          }
          const counters = json
            .map((row) => ({
              name: String(row.nombre || "").trim(),
              date: String(row.fecha || "").trim(),
              tags:
                typeof row.tags === "string" && row.tags.trim()
                  ? row.tags.split(/,\s*/)
                  : [],
            }))
            .filter((c) => c.name && c.date);
          if (!counters.length) {
            window.showToast &&
              window.showToast(
                "No se encontraron contadores válidos en el archivo."
              );
            return;
          }
          localStorage.setItem("counters", JSON.stringify(counters));
          renderCounters();
          window.showToast &&
            window.showToast("Contadores importados correctamente");
          modal.close();
        } catch (err) {
          window.showToast &&
            window.showToast(
              "Error al importar el archivo. ¿Es un Excel válido?"
            );
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = "";
    });
  }

  // Botón cerrar del footer
  const closeFooterBtn = root.querySelector("#close-config-modal-footer");
  if (closeFooterBtn) {
    closeFooterBtn.onclick = () => modal.close();
  }
}

// Conectar botón principal a este modal
const openConfigModalBtn = document.getElementById("open-config-modal");
if (openConfigModalBtn) {
  openConfigModalBtn.onclick = openConfigModal;
}

