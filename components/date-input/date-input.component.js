/**
 * Campo de fecha con calendario popover (ver calendar-popover).
 */
import {
  attachCalendarPopover,
  closeActiveCalendarPopover,
} from "../calendar-popover/calendar-popover.component.js";

export { closeActiveCalendarPopover };

/**
 * Conecta el popover de calendario a un input de texto de fecha.
 * @param {HTMLInputElement} input
 * @param {{ getFormatKey: () => string }} options
 */
export function attachDateInput(input, options) {
  attachCalendarPopover(input, options);
}

/**
 * Inicializa todos los contenedores `.date-input` bajo `root`: enlaza el calendario
 * al primer `input.date-input__field` o al primer `input[type="text"]` / `input`.
 * @param {ParentNode | null | undefined} root
 * @param {{ getFormatKey: () => string }} options
 */
export function initDateInputsIn(root, options) {
  if (!root) return;
  const wraps = root.querySelectorAll(".date-input");
  wraps.forEach((wrap) => {
    const input =
      wrap.querySelector("input.date-input__field") ||
      wrap.querySelector('input[type="text"]') ||
      wrap.querySelector("input");
    if (input instanceof HTMLInputElement) {
      attachDateInput(input, options);
    }
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
      lucide.createIcons({ root: wrap });
    }
  });
}
