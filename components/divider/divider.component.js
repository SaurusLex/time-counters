// Separador horizontal de 1px. Estilos: divider.css
// Uso: createDivider() o dividerHtml()

/**
 * @param {Object} [opts]
 * @param {string} [opts.className] - clases CSS extra opcionales
 * @returns {HTMLDivElement}
 */
function createDivider(opts = {}) {
  const el = document.createElement("div");
  el.className = ["divider", opts.className].filter(Boolean).join(" ");
  el.setAttribute("role", "separator");
  el.setAttribute("aria-orientation", "horizontal");
  return el;
}

/** Cadena HTML para plantillas (mismo markup que createDivider). */
function dividerHtml(extraClass = "") {
  const cls = extraClass.trim()
    ? `divider ${extraClass.trim()}`
    : "divider";
  return `<div class="${cls}" role="separator" aria-orientation="horizontal"></div>`;
}

window.createDivider = createDivider;
window.dividerHtml = dividerHtml;

export { createDivider, dividerHtml };
