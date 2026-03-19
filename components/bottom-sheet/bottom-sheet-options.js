// bottom-sheet-options.js
// Muestra opciones en un BottomSheet para móvil (selector tipo picker)
// Uso: showOptionsBottomSheet({ options, value, title, onSelect })
// Estilos: components/bottom-sheet/bottom-sheet.css

import BottomSheet from "./bottom-sheet.component.js";

const MOBILE_BREAKPOINT = 600;

function isMobile() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

/**
 * Muestra las opciones en un bottom sheet (solo en móvil).
 * @param {Object} opts
 * @param {Array<{value: *, label: string}>} opts.options - Opciones a mostrar
 * @param {*} opts.value - Valor actualmente seleccionado
 * @param {string} [opts.title="Seleccionar"] - Título del sheet
 * @param {function(value, option)} [opts.onSelect] - Callback al elegir una opción
 * @param {function} [opts.onClose] - Callback al cerrar sin seleccionar
 * @returns {BottomSheet|null} La instancia del BottomSheet o null si no es móvil
 */
export function showOptionsBottomSheet({ options = [], value = null, title = "Seleccionar", onSelect = null, onClose = null } = {}) {
  if (!isMobile()) return null;

  const list = document.createElement("ul");
  list.className = "bottom-sheet-options-list";

  let sheetRef = null;

  options.forEach((opt) => {
    const li = document.createElement("li");
    li.className = "bottom-sheet-option";
    li.dataset.value = String(opt.value);
    li.textContent = opt.label;
    if (opt.value === value) li.classList.add("selected");
    li.addEventListener("click", () => {
      if (typeof onSelect === "function") onSelect(opt.value, opt);
      sheetRef?.close();
    });
    list.appendChild(li);
  });

  const header = document.createElement("div");
  header.className = "modal-header";
  header.innerHTML = `<span class="modal-title">${title}</span>`;

  const sheet = new BottomSheet({
    header,
    body: list,
    /* '' evita el footer por defecto de BottomSheet (botón "Cerrar"); se cierra con overlay, grabber o eligiendo opción */
    footer: "",
    closable: true,
    onClose: () => {
      if (typeof onClose === "function") onClose();
    },
  });
  sheetRef = sheet;

  sheet.open();
  return sheet;
}

export { isMobile };
