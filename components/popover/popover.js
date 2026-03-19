// popover.js
// Módulo para el popover de confirmación de borrado
// Estilos: components/popover/popover.css

/**
 * Muestra un popover general reutilizable junto a un elemento ancla.
 * @param {Object} options
 * @param {string|HTMLElement} options.message - Mensaje o nodo a mostrar.
 * @param {Array<{text: string, className?: string, onClick: function}>} options.actions - Botones a mostrar.
 * @param {function=} options.onClose - Callback al cerrar el popover.
 * @param {HTMLElement=} options.anchorElement - Elemento junto al que mostrar el popover.
 */
export function showPopover({ message, actions, onClose, anchorElement }) {
  let popover = document.getElementById("general-popover");
  if (!popover) {
    const popoverHtml = `
      <div id="general-popover" class="popover" style="display:none;">
        <div class="popover-content">
          <span id="popover-message"></span>
          <div class="popover-actions" id="general-popover-actions"></div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", popoverHtml);
    popover = document.getElementById("general-popover");
  }
  // Mensaje
  const msgContainer = document.getElementById("popover-message");
  if (typeof message === "string") {
    msgContainer.textContent = message;
  } else if (message instanceof HTMLElement) {
    msgContainer.innerHTML = "";
    msgContainer.appendChild(message);
  }
  // Acciones
  const actionsContainer = document.getElementById("general-popover-actions");
  actionsContainer.innerHTML = "";
  actions.forEach(({ text, className = "", onClick }) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    if (className) btn.className = className;
    btn.onclick = () => {
      if (onClick) onClick();
      closePopover();
    };
    actionsContainer.appendChild(btn);
  });
  // Posicionamiento
  popover.style.display = "block";
  popover.style.position = "fixed";
  if (anchorElement) {
    const rect = anchorElement.getBoundingClientRect();
    const popoverContent = popover.querySelector(".popover-content");
    // Esperar a que el popover esté en el DOM para medirlo
    setTimeout(() => {
      const popRect = popoverContent.getBoundingClientRect();
      let top = rect.bottom + 8; // 8px debajo del botón
      let left = rect.left + (rect.width - popRect.width) / 2;
      // Ajuste para que no se salga de la pantalla
      left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
      if (top + popRect.height > window.innerHeight) {
        top = rect.top - popRect.height - 8; // Mostrar arriba si no cabe abajo
      }
      popoverContent.style.position = "absolute";
      popoverContent.style.top = top + "px";
      popoverContent.style.left = left + "px";
    }, 0);
  } else {
    // Centrado por defecto si no hay anchorElement
    const popoverContent = popover.querySelector(".popover-content");
    popoverContent.style.position = "";
    popoverContent.style.top = "";
    popoverContent.style.left = "";
  }
  // Cerrar al hacer click fuera
  function handleOutside(e) {
    if (!popover.contains(e.target)) {
      closePopover();
    }
  }
  function handleEsc(e) {
    if (e.key === "Escape") closePopover();
  }
  document.addEventListener("mousedown", handleOutside);
  document.addEventListener("keydown", handleEsc);
  // Guardar para limpiar
  popover._cleanup = () => {
    document.removeEventListener("mousedown", handleOutside);
    document.removeEventListener("keydown", handleEsc);
    if (onClose) onClose();
  };
}

export function closePopover() {
  const popover = document.getElementById("general-popover");
  if (popover) {
    popover.style.display = "none";
    if (popover._cleanup) popover._cleanup();
  }
}
