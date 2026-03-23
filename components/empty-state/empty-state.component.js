// Lista vacía dentro de #counters-list: devuelve un <li class="counters-empty-state">.
// Requiere window.createButton si hay primaryAction. Estilos: empty-state.css
// Uso: createEmptyStateListItem({ icon, title, subtitle, primaryAction? })

/**
 * @param {Object} opts
 * @param {string} opts.icon - nombre del icono Lucide (data-lucide)
 * @param {string} opts.title
 * @param {string} opts.subtitle
 * @param {null | { text: string, icon?: string, color?: string, onClick: () => void }} [opts.primaryAction]
 * @returns {HTMLLIElement}
 */
function createEmptyStateListItem({
  icon,
  title,
  subtitle,
  primaryAction = null,
}) {
  const li = document.createElement("li");
  li.className = "counters-empty-state";
  const inner = document.createElement("div");
  inner.className = "counters-empty-inner";

  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon);
  iconEl.className = "counters-empty-icon";
  iconEl.setAttribute("aria-hidden", "true");

  const titleEl = document.createElement("p");
  titleEl.className = "counters-empty-title";
  titleEl.textContent = title;

  const subEl = document.createElement("p");
  subEl.className = "counters-empty-subtitle";
  subEl.textContent = subtitle;

  inner.append(iconEl, titleEl, subEl);

  if (primaryAction && typeof window.createButton === "function") {
    const btn = window.createButton({
      text: primaryAction.text,
      icon: primaryAction.icon ?? "plus",
      color: primaryAction.color ?? "add",
      onClick: primaryAction.onClick,
    });
    inner.appendChild(btn);
  }

  li.appendChild(inner);
  return li;
}

function refreshEmptyStateIcons(root) {
  const lucide = globalThis.lucide;
  if (lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root });
  }
}

window.createEmptyStateListItem = createEmptyStateListItem;
window.refreshEmptyStateIcons = refreshEmptyStateIcons;

export { createEmptyStateListItem, refreshEmptyStateIcons };
