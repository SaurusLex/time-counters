// toast.js
// Toast global con variantes y acción opcional (p. ej. Deshacer)
// En viewport ≤600px el mismo nodo usa estilo snackbar (toast.css @media)
// Estilos: components/toast/toast.css

const TOAST_ID = "app-toast";
const VARIANTS = ["default", "success", "error", "warning", "info"];
const PLACEMENTS = ["bottom-center", "top-right"];
const SIZES = ["md", "lg"];

let toastTimeout = null;
let barRaf = null;

function ensureToastHost() {
  let el = document.getElementById(TOAST_ID);
  if (el) return el;
  const html = `
<div id="${TOAST_ID}" class="toast toast--default" style="display:none;" role="status" aria-live="polite">
  <div class="toast-content-row" id="toast-content-row"></div>
  <div class="toast-progress"><div class="toast-progress-bar" id="toast-bar"></div></div>
</div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  return document.getElementById(TOAST_ID);
}

function normalizeOptions(second) {
  if (typeof second === "function") {
    return {
      action: { label: "Deshacer", onClick: second },
      duration: 10000,
      variant: "default",
      placement: "bottom-center",
      size: "md",
    };
  }
  if (second && typeof second === "object") {
    const o = { ...second };
    if (!VARIANTS.includes(o.variant)) o.variant = "default";
    if (!PLACEMENTS.includes(o.placement)) o.placement = "bottom-center";
    if (!SIZES.includes(o.size)) o.size = "md";
    if (o.duration == null) o.duration = o.action ? 10000 : 4000;
    return o;
  }
  return {
    variant: "default",
    duration: 4000,
    placement: "bottom-center",
    size: "md",
  };
}

function applyVariant(toastEl, variant) {
  VARIANTS.forEach((v) => toastEl.classList.remove(`toast--${v}`));
  toastEl.classList.add(`toast--${variant}`);
}

function applyPlacement(toastEl, placement) {
  toastEl.classList.toggle("toast--top-right", placement === "top-right");
}

function applySize(toastEl, size) {
  toastEl.classList.toggle("toast--lg", size === "lg");
}

/**
 * @param {string} message
 * @param {object|function} [optionsOrOnUndo]
 * @param {string} [optionsOrOnUndo.variant] default|success|error|warning|info
 * @param {number} [optionsOrOnUndo.duration] ms
 * @param {{ label: string, onClick: function }} [optionsOrOnUndo.action]
 * @param {'bottom-center'|'top-right'} [optionsOrOnUndo.placement]
 * @param {'md'|'lg'} [optionsOrOnUndo.size]
 */
export function showToast(message, optionsOrOnUndo) {
  const opts = normalizeOptions(optionsOrOnUndo);
  const toast = ensureToastHost();
  const row = document.getElementById("toast-content-row");
  const bar = document.getElementById("toast-bar");
  if (!row || !bar) return;

  const actionBtnSize = opts.size === "lg" ? "md" : "sm";

  row.innerHTML = "";
  const msgSpan = document.createElement("span");
  msgSpan.className = "toast-msg";
  msgSpan.id = "toast-msg";
  msgSpan.textContent = message;
  row.appendChild(msgSpan);

  if (opts.action && typeof opts.action.onClick === "function") {
    const btn = window.createButton
      ? window.createButton({
          text: opts.action.label || "Acción",
          color: "primary",
          size: actionBtnSize,
          className: "toast-action-btn",
          onClick: () => {
            opts.action.onClick();
            hideToast();
          },
        })
      : (() => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "toast-action-btn-fallback";
          b.textContent = opts.action.label || "Acción";
          b.onclick = () => {
            opts.action.onClick();
            hideToast();
          };
          return b;
        })();
    row.appendChild(btn);
    if (typeof lucide !== "undefined") lucide.createIcons({ root: row });
  }

  applyVariant(toast, opts.variant);
  applyPlacement(toast, opts.placement);
  applySize(toast, opts.size);
  toast.style.display = "flex";
  toast.classList.add("show");

  const duration = Math.max(0, opts.duration);
  if (barRaf != null) cancelAnimationFrame(barRaf);
  barRaf = null;

  if (duration <= 0) {
    bar.style.width = "100%";
  } else {
    bar.style.width = "100%";
    const start = Date.now();
    function animateBar() {
      const elapsed = Date.now() - start;
      const percent = Math.max(0, 1 - elapsed / duration);
      bar.style.width = percent * 100 + "%";
      if (percent > 0 && toast.style.display !== "none") {
        barRaf = requestAnimationFrame(animateBar);
      } else {
        barRaf = null;
      }
    }
    animateBar();
  }

  clearTimeout(toastTimeout);
  if (duration > 0) {
    toastTimeout = setTimeout(hideToast, duration);
  } else {
    toastTimeout = null;
  }
}

export function hideToast() {
  const toast = document.getElementById(TOAST_ID);
  if (barRaf != null) {
    cancelAnimationFrame(barRaf);
    barRaf = null;
  }
  clearTimeout(toastTimeout);
  toastTimeout = null;
  if (toast) {
    toast.style.display = "none";
    toast.classList.remove("show");
  }
}

if (typeof window !== "undefined") {
  window.showToast = showToast;
  window.hideToast = hideToast;
}
