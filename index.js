// Asegura que window.createTag está disponible
import "./tag.component.js";
import "./button.component.js";
import "./pill.component.js";
import {
  initAuth,
  handleLoginClick,
  handleLogoutClick,
  isSignedIn,
  getCurrentUser,
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
import { showOptionsBottomSheet, isMobile } from "./bottom-sheet-options.js";
import Modal from "./modal.component.js";
import BottomSheet from "./bottom-sheet.component.js";
import "./dropdown.component.js";


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

function showDeleteConfirm({ message, actions, anchorElement, counterName }) {
  const isMobile = window.matchMedia("(max-width: 600px)").matches;
  if (isMobile) {
    let msg = typeof message === "string" ? message : "";
    if (counterName) {
      msg = msg.includes("este contador")
        ? msg.replace("este contador", `«${counterName}»`)
        : msg.includes("Qué deseas borrar")
          ? `¿Qué deseas borrar del contador «${counterName}»?`
          : `${msg} «${counterName}»`;
    }
    const cancelBtn = actions.find((a) => !a.onClick);
    const confirmBtns = actions.filter((a) => a.onClick);
    const cancelHtml = cancelBtn
      ? `<button type="button" class="${cancelBtn.className || ""}" data-delete-action="cancel">${cancelBtn.text}</button>`
      : "";
    const confirmHtml = confirmBtns
      .map(
        (a, i) =>
          `<button type="button" class="${a.className || ""}" data-delete-action="confirm-${i}">${a.text}</button>`
      )
      .join("");
    const sheet = new BottomSheet({
      header: '<span class="modal-title">¿Estás seguro?</span>',
      body: `<p style="margin:0; color:#333;">${msg}</p>`,
      footer: cancelHtml + confirmHtml,
      closable: true,
      onClose: () => {},
    });
    sheet.open();
    const root = sheet.sheet;
    confirmBtns.forEach((a, i) => {
      const btn = root.querySelector(`[data-delete-action="confirm-${i}"]`);
      if (btn) {
        btn.onclick = () => {
          a.onClick();
          sheet.close();
        };
      }
    });
    const cancelEl = root.querySelector('[data-delete-action="cancel"]');
    if (cancelEl) cancelEl.onclick = () => sheet.close();
  } else {
    showPopover({ message, actions, anchorElement });
  }
}

// Inicializar el CounterManager con las dependencias necesarias
initCounterManager({
  getConfig,
  getFilterTags,
  openCounterModal,
  renderFilterTags,
  getDomListElement,
  getCounterTimeElement,
  deleteCounter: deleteCounterFromManager,
  showDeleteConfirm,
  onAfterDelete: async () => {
    if (isSignedIn()) {
      try {
        await backupToFirestore();
      } catch (e) {}
    }
  },
});

// --- ELIMINADO: Popover de confirmación de borrado legacy ---
// Toast HTML
const toastHtml = `
<div id="undo-toast" class="toast" style="display:none;">
  <div class="toast-content-row" id="toast-content-row"></div>
  <div class="toast-progress"><div id="toast-bar"></div></div>
</div>`;
document.body.insertAdjacentHTML("beforeend", toastHtml);

// Crear botones de header con el componente createButton
const addBtnContainer = document.getElementById("add-button-container");
if (addBtnContainer) {
  const addBtn = window.createButton({
    text: "Añadir contador",
    icon: "plus",
    color: "add",
    id: "open-add-modal",
    onClick: () => openCounterModal("new"),
  });
  addBtnContainer.appendChild(addBtn);
}
if (typeof lucide !== "undefined") {
  const driveBtns = document.querySelector(".drive-btns");
  if (driveBtns) lucide.createIcons({ root: driveBtns });
}

// Botón para quitar la hora (usa createButton)
const clearTimeContainer = document.getElementById("clear-time-btn-container");
if (clearTimeContainer && window.createButton) {
  const clearBtn = window.createButton({
    icon: "x",
    text: "",
    color: "secondary",
    size: "md",
    shape: "circle",
    className: "clear-time-btn",
    type: "button",
    title: "Quitar hora",
    id: "clear-time-btn",
    onClick: () => {
      const timeInput = document.getElementById("modal-counter-time");
      if (timeInput) {
        timeInput.value = "";
        updateClearTimeButtonState();
      }
    },
  });
  clearBtn.style.display = "none";
  clearTimeContainer.appendChild(clearBtn);
  if (typeof lucide !== "undefined") lucide.createIcons({ root: clearTimeContainer });
}

// --- MODAL NUEVO/EDITAR CONTADOR CON ETIQUETAS ---
let modalTags = [];
let editingIdx = null;
let deleteIdx = null;
let lastDeleted = null;
let toastTimeout = null;
let currentFilterTags = []; // Renamed for clarity and to avoid conflict if filterTags was meant to be local elsewhere.
let counterModalRoot = null; // Contenedor actual: modal o BottomSheet
let counterSheetView = null; // BottomSheet cuando se usa en móvil

function getCounterRoot() {
  return counterModalRoot;
}

function openCounterModal(mode = "new", idx = null) {
  const isMobile = window.matchMedia("(max-width: 600px)").matches;
  const modal = document.getElementById("counter-modal");
  const modalContent = modal?.querySelector(".modal-content");

  if (isMobile) {
    // Usar BottomSheet (mismo componente que configuración)
    const headerEl = modalContent?.querySelector(".modal-header");
    const bodyEl = modalContent?.querySelector(".modal-body");
    const footerEl = modalContent?.querySelector(".modal-footer");
    if (!headerEl || !bodyEl || !footerEl) return;

    const view = new BottomSheet({
      header: headerEl,
      body: bodyEl,
      footer: footerEl,
      closable: true,
      onClose: () => {
        // Devolver header, body y footer al modal para próxima apertura
        const sheet = view.sheet; // usar view (capturado), no counterSheetView (ya null)
        if (sheet && modalContent) {
          const h = sheet.querySelector(".modal-header");
          const b = sheet.querySelector(".modal-body");
          const f = sheet.querySelector(".modal-footer");
          if (h) modalContent.appendChild(h);
          if (b) modalContent.appendChild(b);
          if (f) modalContent.appendChild(f);
        }
        counterModalRoot = null;
        counterSheetView = null;
        editingIdx = null;
      },
    });
    counterSheetView = view;
    counterModalRoot = view.sheet;
    view.open();
    if (typeof lucide !== "undefined") lucide.createIcons({ root: counterModalRoot });
  } else {
    counterModalRoot = modalContent;
    modal.style.display = "flex";
  }

  const root = getCounterRoot();
  const title = root?.querySelector("#counter-modal-title");
  const nameInput = root?.querySelector("#modal-counter-name");
  const dateInput = root?.querySelector("#modal-counter-date");
  const timeInput = root?.querySelector("#modal-counter-time");
  const frequencyDropdown = root?.querySelector("#frequency-dropdown-container .dropdown-wrapper");
  const frequencyHiddenInput = root?.querySelector("#modal-counter-frequency");
  const endDateGroup = root?.querySelector("#modal-end-date-group");
  const endDateInput = root?.querySelector("#modal-counter-end-date");
  const dateHint = root?.querySelector("#modal-date-hint");

  if (!nameInput || !dateInput || !frequencyDropdown || !frequencyHiddenInput) return;

  if (mode === "edit" && idx !== null) {
    const counters = getCounters();
    const counter = counters[idx];
    nameInput.value = counter.name;
    if (counter.date) {
      const dateObj = new Date(counter.date);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        dateInput.value = `${year}-${month}-${day}`;
        if (counter.date.includes("T")) {
          const hours = String(dateObj.getHours()).padStart(2, "0");
          const minutes = String(dateObj.getMinutes()).padStart(2, "0");
          timeInput.value = `${hours}:${minutes}`;
        } else {
          timeInput.value = "";
        }
      } else {
        dateInput.value = counter.date;
        timeInput.value = "";
      }
    } else {
      dateInput.value = "";
      timeInput.value = "";
    }
    modalTags = Array.isArray(counter.tags) ? [...counter.tags] : [];
    const freq = counter.frequency || "none";
    frequencyDropdown.setValue(freq);
    frequencyHiddenInput.value = freq;
    if (endDateInput) endDateInput.value = counter.endDate || "";
    updateFrequencyDependentUI(root, freq);
    if (title) title.textContent = "Editar contador";
    editingIdx = idx;
  } else {
    nameInput.value = "";
    dateInput.value = "";
    timeInput.value = "";
    modalTags = [];
    frequencyDropdown.setValue("none");
    frequencyHiddenInput.value = "none";
    if (endDateInput) endDateInput.value = "";
    updateFrequencyDependentUI(root, "none");
    if (title) title.textContent = "Nuevo contador";
    editingIdx = null;
  }
  renderTagsList();
  renderTagSuggestions();
  updateClearTimeButtonState(root);
  setTimeout(() => nameInput.focus(), 100);
}

function updateClearTimeButtonState(root) {
  const r = root || getCounterRoot() || document;
  const timeInput = r.querySelector?.("#modal-counter-time");
  const clearBtn = r.querySelector?.("#clear-time-btn");
  if (!timeInput || !clearBtn) return;
  clearBtn.style.display = timeInput.value ? "flex" : "none";
}

function closeCounterModal() {
  if (counterSheetView) {
    counterSheetView.close();
  } else {
    document.getElementById("counter-modal").style.display = "none";
  }
  counterModalRoot = null;
  counterSheetView = null;
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
  const root = getCounterRoot();
  const suggestionsDiv = root?.querySelector("#tag-suggestions");
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
  const root = getCounterRoot();
  const tagsList = root?.querySelector("#tags-list");
  if (!tagsList) return;
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
  const addTagBtn = root?.querySelector("#add-tag-btn");
  if (addTagBtn) {
    const newBtn = window.createButton({
      text: "Añadir",
      color: "primary",
      id: "add-tag-btn",
      onClick: () => {
        const input = getCounterRoot()?.querySelector("#tag-input");
        const tag = (input?.value || "").trim();
        if (tag && !modalTags.includes(tag)) {
          modalTags.push(tag);
          if (input) input.value = "";
          renderTagsList();
          renderTagSuggestions();
        }
      },
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

const FREQUENCY_OPTIONS = [
  { value: "none", label: "No recurrente" },
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "annual", label: "Anual (ej. cumpleaños)" },
];

function updateFrequencyDependentUI(root, frequency) {
  const dateHint = root?.querySelector("#modal-date-hint");
  const endDateGroup = root?.querySelector("#modal-end-date-group");
  const endDateInput = root?.querySelector("#modal-counter-end-date");
  if (dateHint) dateHint.style.display = frequency === "annual" ? "block" : "none";
  if (endDateGroup) endDateGroup.style.display = frequency !== "none" ? "block" : "none";
  if (frequency === "none" && endDateInput) endDateInput.value = "";
}

function initFrequencyDropdown() {
  const container = document.getElementById("frequency-dropdown-container");
  const hiddenInput = document.getElementById("modal-counter-frequency");
  if (!container || !hiddenInput || typeof createDropdown !== "function") return;

  const dropdown = createDropdown({
    options: FREQUENCY_OPTIONS,
    value: "none",
    placeholder: "Seleccionar...",
    mobileTitle: "Frecuencia",
    className: "modal-frequency-dropdown",
    onSelect: (value) => {
      hiddenInput.value = value;
      updateFrequencyDependentUI(getCounterRoot(), value);
    },
  });
  container.appendChild(dropdown);
}

document.getElementById("close-counter-modal").onclick = closeCounterModal;
document.getElementById("cancel-counter-modal").onclick = closeCounterModal;

// Actualizar visibilidad del botón quitar hora cuando cambia el input
document.getElementById("modal-counter-time")?.addEventListener("input", () => updateClearTimeButtonState());
document.getElementById("counter-modal").onclick = function (e) {
  if (e.target === this) closeCounterModal();
};
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && (counterSheetView || document.getElementById("counter-modal")?.style.display !== "none")) {
    closeCounterModal();
  }
});

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
  const btn = e.target.closest(".edit-btn");
  if (btn) {
    openCounterModal("edit", btn.getAttribute("data-idx"));
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
  const filterSection = document.querySelector(".filter-tags-section");
  if (!filterTagsList || !filterSection) return;
  const allTags = getAllTags();
  if (allTags.length === 0) {
    filterSection.style.display = "none";
    currentFilterTags = [];
    return;
  }
  filterSection.style.display = "";
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

let authStateResolved = false;

function renderAuthStatusIndicator() {
  const container = document.getElementById("auth-status-indicator");
  if (!container) return;
  const loading = !authStateResolved;
  const user = getCurrentUser();
  const signedIn = isSignedIn();
  const text = loading
    ? "Cargando…"
    : signedIn
      ? (user?.displayName || user?.email || "Conectado")
      : "Iniciar sesión";
  const pill = window.createPill({
    text,
    icon: loading ? "loader" : signedIn ? "cloud" : "cloud-off",
    variant: loading ? "signed-out" : signedIn ? "signed-in" : "signed-out",
    size: "md",
    ariaLabel: loading ? "Comprobando sesión…" : `Estado de sesión: ${text}`,
    title: text,
  });
  if (loading) pill.classList.add("auth-pill-loading");

  const wrapper = document.createElement("div");
  wrapper.className = "auth-pill-dropdown";
  wrapper.appendChild(pill);

  const panel = document.createElement("div");
  panel.className = "auth-pill-dropdown-panel";
  panel.hidden = true;

  const options = signedIn
    ? [
        { id: "config", label: "Configuración", icon: "settings", action: () => openConfigModal() },
        { id: "logout", label: "Cerrar sesión", icon: "log-out", action: () => handleLogoutClick() },
      ]
    : [
        { id: "config", label: "Configuración", icon: "settings", action: () => openConfigModal() },
        { id: "login", label: "Iniciar sesión", icon: "log-in", action: () => handleLoginClick() },
      ];

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "auth-pill-dropdown-option";
    btn.innerHTML = `<i data-lucide="${opt.icon}"></i><span>${opt.label}</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      closePanel();
      opt.action();
    };
    panel.appendChild(btn);
  });

  function positionPanel() {
    const rect = pill.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${rect.right - 200}px`;
    panel.style.minWidth = "180px";
    requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.right - panelRect.width;
      if (top + panelRect.height > window.innerHeight - 8) top = rect.top - panelRect.height - 8;
      if (left < 8) left = 8;
      if (left + panelRect.width > window.innerWidth - 8) left = window.innerWidth - panelRect.width - 8;
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    });
  }

  function openPanel() {
    panel.hidden = false;
    wrapper.classList.add("open");
    positionPanel();
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
  }

  function closePanel() {
    panel.hidden = true;
    wrapper.classList.remove("open");
    document.removeEventListener("mousedown", handleOutside);
    document.removeEventListener("keydown", handleEscape);
  }

  function handleOutside(e) {
    if (!wrapper.contains(e.target)) closePanel();
  }

  function handleEscape(e) {
    if (e.key === "Escape") closePanel();
  }

  pill.onclick = (e) => {
    e.stopPropagation();
    if (loading) return;
    if (isMobile()) {
      showOptionsBottomSheet({
        options: options.map((o) => ({ value: o.id, label: o.label })),
        value: null,
        title: text,
        onSelect: (val, opt) => {
          const selected = options.find((x) => x.id === val);
          if (selected) selected.action();
        },
      });
    } else {
      if (panel.hidden) openPanel();
      else closePanel();
    }
  };

  wrapper.appendChild(panel);
  container.innerHTML = "";
  container.appendChild(wrapper);
  if (typeof lucide !== "undefined") lucide.createIcons({ root: wrapper });
}

window.addEventListener("DOMContentLoaded", () => {
  initFrequencyDropdown();
  if (typeof lucide !== "undefined") lucide.createIcons();
  const authChangedHandler = () => {
    authStateResolved = true;
    renderAuthStatusIndicator();
  };
  document.addEventListener("firebase-auth-changed", authChangedHandler);
  let initialAuthResolved = false;
  initAuth(async (user) => {
    if (user && !initialAuthResolved) {
      try {
        await restoreFromFirestore(true);
      } catch (e) {}
    }
    initialAuthResolved = true;
  });
  renderAuthStatusIndicator();
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

// --- Modal de configuración: BottomSheet en móvil, Modal en escritorio ---
function openConfigModal() {
  const isMobile = window.matchMedia("(max-width: 600px)").matches;
  const header = `
    <span class="modal-title">Configuración</span>
  `;

  const body = `
    <div class="units-section-modal units-section-box" style="margin-top: 10px">
      <div class="units-section-title">
        <i data-lucide="clock" style="margin-right: 7px"></i>Unidades de tiempo
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
        <i data-lucide="file-spreadsheet" style="margin-right: 7px; color: #1d6f42"></i>Importar / Exportar
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap">
        <button id="export-excel-btn" class="btn-backup" type="button"><i data-lucide="download"></i> Exportar a Excel</button>
        <label for="import-excel-input" class="btn-restore" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="upload"></i> Importar desde Excel
          <input id="import-excel-input" type="file" accept=".xlsx,.xls" style="display: none" />
        </label>
      </div>
    </div>
    <div id="firebase-section" class="units-section-modal units-section-box" style="margin-top: 22px">
      <div class="units-section-title">
        <i data-lucide="log-in" style="margin-right: 7px"></i><span id="account-section-title">Iniciar sesión</span>
      </div>
      <div id="firebase-auth-area"></div>
    </div>
  `;

  const footer = `<button type="button" id="close-config-modal-footer">Cerrar</button>`;

  const view = isMobile
    ? new BottomSheet({ header, body, footer, closable: true, onClose: () => {} })
    : new Modal({ header, body, footer, closable: true, onClose: () => {} });

  view.open();

  const root = view.sheet ?? view.modal;
  if (typeof lucide !== "undefined") lucide.createIcons({ root });
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

  // Sección cuenta: login, backup, restore (Firebase en backend, caja negra para el usuario)
  function renderFirebaseAuthArea() {
    const area = root.querySelector("#firebase-auth-area");
    const titleEl = root.querySelector("#account-section-title");
    const sectionTitle = root.querySelector("#firebase-section .units-section-title");
    if (!area) return;
    if (titleEl) titleEl.textContent = isSignedIn() ? "Tu cuenta" : "Iniciar sesión";
    if (sectionTitle) {
      const icon = sectionTitle.querySelector("i");
      if (icon) icon.setAttribute("data-lucide", isSignedIn() ? "user" : "log-in");
      if (typeof lucide !== "undefined") lucide.createIcons({ root: sectionTitle });
    }
    area.innerHTML = "";
    if (isSignedIn()) {
      const btnFullWidth = "100%";
      const backupBtn = document.createElement("button");
      backupBtn.id = "firebase-backup-btn";
      backupBtn.className = "btn-backup";
      backupBtn.type = "button";
      backupBtn.style.width = btnFullWidth;
      backupBtn.innerHTML = '<i data-lucide="cloud-upload"></i> Guardar en la nube';
      backupBtn.onclick = backupToFirestore;
      const restoreBtn = document.createElement("button");
      restoreBtn.id = "firebase-restore-btn";
      restoreBtn.className = "btn-restore";
      restoreBtn.type = "button";
      restoreBtn.style.width = btnFullWidth;
      restoreBtn.innerHTML = '<i data-lucide="cloud-download"></i> Restaurar desde la nube';
      restoreBtn.onclick = restoreFromFirestore;
      const logoutBtn = document.createElement("button");
      logoutBtn.className = "btn-secondary";
      logoutBtn.type = "button";
      logoutBtn.style.width = btnFullWidth;
      logoutBtn.innerHTML = '<i data-lucide="log-out"></i> Cerrar sesión';
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
      loginBtn.innerHTML = '<i data-lucide="log-in"></i> Iniciar sesión con Google';
      loginBtn.onclick = handleLoginClick;
      area.appendChild(loginBtn);
    }
  }
  renderFirebaseAuthArea();
  const authChangedHandler = () => renderFirebaseAuthArea();
  document.addEventListener("firebase-auth-changed", authChangedHandler);
  view.onClose = () => {
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
          view.close();
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
    closeFooterBtn.onclick = () => view.close();
  }
}

// El botón de configuración se crea con createButton y ya tiene onClick: openConfigModal

