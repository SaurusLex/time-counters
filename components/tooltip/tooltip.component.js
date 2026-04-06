/**
 * Tooltip reutilizable (una capa flotante compartida, posición fija).
 * Estilos: components/tooltip/tooltip.css
 *
 *   attachTooltip(el, { text: '…', placement: 'top' });
 *   initTooltipsIn(container); // elementos con data-tooltip="…"
 */

const triggerConfig = new WeakMap();
const handlerPairs = new WeakMap();

let tooltipEl = null;
let showTimer = null;
let hideTimer = null;
let activeTrigger = null;
let escHandler = null;

const PLACEMENTS = new Set(["top", "bottom", "left", "right"]);

function ensureTooltipEl() {
  if (tooltipEl && document.body.contains(tooltipEl)) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.id = "app-tooltip";
  tooltipEl.setAttribute("role", "tooltip");
  tooltipEl.hidden = true;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function nextTooltipId() {
  return `app-tooltip-${Math.random().toString(36).slice(2, 11)}`;
}

function positionTooltip(trigger, placement) {
  const tip = ensureTooltipEl();
  tip.className = `tooltip--placement-${placement}`;
  tip.style.visibility = "hidden";
  tip.hidden = false;

  const margin = 8;
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - tw / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.left - tw - margin;
      break;
    case "right":
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.right + margin;
      break;
    case "top":
    default:
      top = rect.top - th - margin;
      left = rect.left + rect.width / 2 - tw / 2;
      break;
  }

  left = Math.max(margin, Math.min(left, vw - tw - margin));
  top = Math.max(margin, Math.min(top, vh - th - margin));

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tip.style.visibility = "visible";
}

function hideTooltip() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  if (!tooltipEl) {
    activeTrigger = null;
    return;
  }
  tooltipEl.classList.remove("tooltip--visible");
  tooltipEl.hidden = true;
  tooltipEl.style.visibility = "";
  if (activeTrigger) {
    activeTrigger.removeAttribute("aria-describedby");
    activeTrigger = null;
  }
  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }
}

function scheduleHide(delay) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideTooltip, delay);
}

function showTooltip(trigger) {
  const cfg = triggerConfig.get(trigger);
  if (!cfg) return;

  clearTimeout(hideTimer);

  const run = () => {
    if (activeTrigger && !activeTrigger.isConnected) {
      hideTooltip();
    }
    const tip = ensureTooltipEl();
    const placement = PLACEMENTS.has(cfg.placement) ? cfg.placement : "top";

    if (!tip.id) tip.id = nextTooltipId();

    tip.textContent = cfg.text;
    tip.classList.remove("tooltip--visible");
    positionTooltip(trigger, placement);

    if (activeTrigger && activeTrigger !== trigger) {
      activeTrigger.removeAttribute("aria-describedby");
    }
    activeTrigger = trigger;
    trigger.setAttribute("aria-describedby", tip.id);

    requestAnimationFrame(() => {
      tip.classList.add("tooltip--visible");
    });

    if (!escHandler) {
      escHandler = (e) => {
        if (e.key === "Escape") hideTooltip();
      };
      document.addEventListener("keydown", escHandler);
    }
  };

  const delay = typeof cfg.showDelay === "number" ? cfg.showDelay : 200;
  clearTimeout(showTimer);
  showTimer = setTimeout(run, delay);
}

function onScrollOrResize() {
  if (!activeTrigger || !tooltipEl || tooltipEl.hidden) return;
  const cfg = triggerConfig.get(activeTrigger);
  if (!cfg) return;
  const placement = PLACEMENTS.has(cfg.placement) ? cfg.placement : "top";
  positionTooltip(activeTrigger, placement);
}

/**
 * @param {HTMLElement} trigger
 * @param {object} opts
 * @param {string} opts.text
 * @param {'top'|'bottom'|'left'|'right'} [opts.placement='top']
 * @param {number} [opts.showDelay=200]
 * @param {number} [opts.hideDelay=80]
 * @returns {() => void} detach
 */
export function attachTooltip(trigger, opts) {
  if (!trigger || !opts || typeof opts.text !== "string" || !opts.text.trim()) {
    return () => {};
  }

  detachTooltip(trigger);

  const placement = PLACEMENTS.has(opts.placement) ? opts.placement : "top";
  const showDelay = typeof opts.showDelay === "number" ? opts.showDelay : 200;
  const hideDelay = typeof opts.hideDelay === "number" ? opts.hideDelay : 80;

  triggerConfig.set(trigger, {
    text: opts.text.trim(),
    placement,
    showDelay,
    hideDelay,
  });

  const onEnter = () => showTooltip(trigger);
  const onLeave = () => scheduleHide(hideDelay);
  const onFocusIn = () => showTooltip(trigger);
  const onFocusOut = (e) => {
    if (!trigger.contains(e.relatedTarget)) scheduleHide(hideDelay);
  };
  const onScroll = () => onScrollOrResize();
  const onResize = () => onScrollOrResize();

  trigger.addEventListener("mouseenter", onEnter);
  trigger.addEventListener("mouseleave", onLeave);
  trigger.addEventListener("focusin", onFocusIn);
  trigger.addEventListener("focusout", onFocusOut);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

  handlerPairs.set(trigger, {
    onEnter,
    onLeave,
    onFocusIn,
    onFocusOut,
    onScroll,
    onResize,
  });

  return () => detachTooltip(trigger);
}

/**
 * @param {HTMLElement} trigger
 */
export function detachTooltip(trigger) {
  if (!trigger) return;

  const h = handlerPairs.get(trigger);
  if (h) {
    trigger.removeEventListener("mouseenter", h.onEnter);
    trigger.removeEventListener("mouseleave", h.onLeave);
    trigger.removeEventListener("focusin", h.onFocusIn);
    trigger.removeEventListener("focusout", h.onFocusOut);
    window.removeEventListener("scroll", h.onScroll, true);
    window.removeEventListener("resize", h.onResize);
    handlerPairs.delete(trigger);
  }

  triggerConfig.delete(trigger);

  if (activeTrigger === trigger) {
    hideTooltip();
  }
}

/**
 * Enlaza tooltips a nodos con `data-tooltip` (y opcionalmente `data-tooltip-placement`).
 * @param {ParentNode} root
 */
export function initTooltipsIn(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll("[data-tooltip]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const text = el.getAttribute("data-tooltip");
    if (!text || !text.trim()) return;
    const placement = el.getAttribute("data-tooltip-placement") || "top";
    attachTooltip(el, { text, placement });
  });
}

window.attachTooltip = attachTooltip;
window.detachTooltip = detachTooltip;
window.initTooltipsIn = initTooltipsIn;
