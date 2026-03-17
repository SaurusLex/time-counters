// dropdown.component.js
// Componente dropdown reutilizable: lista de opciones, selección única
// En móvil usa bottom sheet para las opciones
// Uso: createDropdown({ options, value, placeholder, onSelect, className, disabled, mobileTitle })

import { showOptionsBottomSheet, isMobile } from "./bottom-sheet-options.js";

const CHEVRON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

function createDropdown({
  options = [],
  value = null,
  placeholder = "Seleccionar...",
  onSelect = null,
  className = "",
  disabled = false,
  mobileTitle = "Seleccionar",
} = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `dropdown-wrapper ${className}`.trim();

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "dropdown-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  if (disabled) trigger.disabled = true;

  const triggerText = document.createElement("span");
  triggerText.className = "dropdown-trigger-text";

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "dropdown-trigger-icon";
  triggerIcon.innerHTML = CHEVRON_SVG;

  trigger.appendChild(triggerText);
  trigger.appendChild(triggerIcon);

  const panel = document.createElement("div");
  panel.className = "dropdown-panel";
  panel.setAttribute("role", "listbox");
  panel.hidden = true;

  const list = document.createElement("ul");
  list.className = "dropdown-list";

  function getSelectedOption() {
    return options.find((opt) => opt.value === value) || null;
  }

  function updateTriggerText() {
    const selected = getSelectedOption();
    triggerText.textContent = selected ? selected.label : placeholder;
  }

  function positionPanel() {
    const rect = trigger.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.left = `${rect.left}px`;
    panel.style.minWidth = `${rect.width}px`;

    requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;

      if (top + panelRect.height > window.innerHeight - 8) {
        top = rect.top - panelRect.height - 8;
      }
      left = Math.max(8, Math.min(left, window.innerWidth - panelRect.width - 8));

      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    });
  }

  function open() {
    if (disabled) return;
    if (isMobile()) {
      wrapper.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      showOptionsBottomSheet({
        options,
        value,
        title: mobileTitle,
        onSelect: (val, opt) => {
          selectOption(opt);
        },
        onClose: onSheetClose,
      });
      return;
    }
    panel.hidden = false;
    wrapper.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    positionPanel();
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
  }

  function close() {
    panel.hidden = true;
    wrapper.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", handleOutside);
    document.removeEventListener("keydown", handleEscape);
  }

  function onSheetClose() {
    wrapper.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }


  function toggle() {
    if (panel.hidden) open();
    else close();
  }

  function handleOutside(e) {
    if (!wrapper.contains(e.target)) close();
  }

  function handleEscape(e) {
    if (e.key === "Escape") close();
  }

  function selectOption(opt) {
    value = opt.value;
    updateTriggerText();
    list.querySelectorAll(".dropdown-option").forEach((el) => {
      el.classList.toggle("selected", el.dataset.value === String(opt.value));
    });
    close();
    if (typeof onSelect === "function") onSelect(opt.value, opt);
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  options.forEach((opt) => {
    const li = document.createElement("li");
    li.className = "dropdown-option";
    li.dataset.value = String(opt.value);
    li.setAttribute("role", "option");
    li.textContent = opt.label;
    if (opt.value === value) li.classList.add("selected");
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      selectOption(opt);
    });
    list.appendChild(li);
  });

  panel.appendChild(list);
  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);

  updateTriggerText();

  // API pública para actualizar valor desde fuera
  wrapper.setValue = (newValue) => {
    value = newValue;
    updateTriggerText();
    list.querySelectorAll(".dropdown-option").forEach((el) => {
      el.classList.toggle("selected", el.dataset.value === String(newValue));
    });
  };

  wrapper.getValue = () => value;

  return wrapper;
}

export { createDropdown };
window.createDropdown = createDropdown;
