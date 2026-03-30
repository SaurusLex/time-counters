/**
 * Calendario popover (lunes como primer día). Se ancla al input de texto y se monta en document.body.
 */
import { formatDateDisplay, parseDateInput } from "../../utils/dateUtils.js";

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
/** Abreviaturas para la cuadrícula del selector de mes */
const MONTH_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function mondayFirstColumn(jsGetDay) {
  return (jsGetDay + 6) % 7;
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const startCol = mondayFirstColumn(first.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startCol; i++) {
    const day = prevMonthLast - startCol + i + 1;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ y: py, m: pm, d: day, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: year, m: month, d, outside: false });
  }
  let nextD = 1;
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  while (cells.length < 42) {
    cells.push({ y: ny, m: nm, d: nextD++, outside: true });
  }
  return cells;
}

let activeClose = null;

export function closeActiveCalendarPopover() {
  if (typeof activeClose === "function") {
    activeClose();
  }
}

/**
 * @param {HTMLInputElement} textInput
 * @param {{ getFormatKey: () => string }} options
 */
export function attachCalendarPopover(textInput, { getFormatKey }) {
  if (!textInput) return;

  let layer = null;
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  /** @type {'days' | 'months'} */
  let viewMode = "days";
  let docClickBound = false;
  let escapeBound = false;

  function getFormat() {
    return typeof getFormatKey === "function" ? getFormatKey() : "dd/MM/yyyy";
  }

  function close() {
    if (layer && layer.parentNode) {
      layer.remove();
    }
    layer = null;
    if (docClickBound) {
      document.removeEventListener("click", onDocClick, true);
      docClickBound = false;
    }
    if (escapeBound) {
      document.removeEventListener("keydown", onEscape, true);
      escapeBound = false;
    }
    window.removeEventListener("scroll", onReposition, true);
    window.removeEventListener("resize", onReposition);
    if (activeClose === close) activeClose = null;
  }

  function onEscape(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  function onDocClick(e) {
    if (!layer) return;
    const panel = layer.querySelector(".calendar-popover-panel");
    if (panel && (panel.contains(e.target) || e.target === textInput)) {
      return;
    }
    close();
  }

  function onReposition() {
    if (layer) positionPanel(layer, textInput);
  }

  function positionPanel(layerEl, anchorEl) {
    const panel = layerEl.querySelector(".calendar-popover-panel");
    if (!panel || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    let top = rect.bottom + 8;
    let left = rect.left;
    if (top + ph > window.innerHeight - 8) {
      top = Math.max(8, rect.top - ph - 8);
    }
    left = Math.min(left, window.innerWidth - pw - 8);
    left = Math.max(8, left);
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

  function render() {
    if (!layer) return;
    const panel = layer.querySelector(".calendar-popover-panel");
    if (!panel) return;

    const titleEl = panel.querySelector(".calendar-popover-title");
    const weekdaysEl = panel.querySelector(".calendar-popover-weekdays");
    const gridEl = panel.querySelector(".calendar-popover-grid");
    const prevEl = panel.querySelector(".calendar-popover-prev");
    const nextEl = panel.querySelector(".calendar-popover-next");
    if (!titleEl || !gridEl) return;

    if (prevEl && nextEl) {
      if (viewMode === "months") {
        prevEl.setAttribute("aria-label", "Año anterior");
        nextEl.setAttribute("aria-label", "Año siguiente");
      } else {
        prevEl.setAttribute("aria-label", "Mes anterior");
        nextEl.setAttribute("aria-label", "Mes siguiente");
      }
    }

    panel.classList.toggle("calendar-popover-panel--month-picker", viewMode === "months");
    titleEl.setAttribute("aria-expanded", viewMode === "months" ? "true" : "false");

    if (viewMode === "months") {
      titleEl.textContent = String(viewYear);
      titleEl.setAttribute("aria-label", "Volver al calendario de días");
      weekdaysEl?.setAttribute("hidden", "");
    } else {
      titleEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
      titleEl.setAttribute("aria-label", "Elegir mes en cuadrícula");
      weekdaysEl?.removeAttribute("hidden");
    }

    const today = new Date();
    const selParsed = parseDateInput(textInput.value.trim(), getFormat());
    const selY = selParsed ? selParsed.getFullYear() : null;
    const selM = selParsed ? selParsed.getMonth() : null;
    const selD = selParsed ? selParsed.getDate() : null;

    gridEl.innerHTML = "";
    gridEl.classList.toggle("calendar-popover-grid--months", viewMode === "months");

    if (viewMode === "months") {
      for (let m = 0; m < 12; m++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-popover-month";
        btn.textContent = MONTH_SHORT[m];
        btn.setAttribute("aria-label", MONTH_NAMES[m]);
        if (viewYear === today.getFullYear() && m === today.getMonth()) {
          btn.classList.add("calendar-popover-month--today");
        }
        if (selParsed && viewYear === selY && m === selM) {
          btn.classList.add("calendar-popover-month--selected");
        }
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          viewMonth = m;
          viewMode = "days";
          render();
          positionPanel(layer, textInput);
        });
        gridEl.appendChild(btn);
      }
      return;
    }

    const cells = buildMonthCells(viewYear, viewMonth);
    cells.forEach(({ y, m, d, outside }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-popover-day";
      btn.textContent = String(d);
      if (outside) btn.classList.add("calendar-popover-day--outside");
      if (
        !outside &&
        y === today.getFullYear() &&
        m === today.getMonth() &&
        d === today.getDate()
      ) {
        btn.classList.add("calendar-popover-day--today");
      }
      if (selParsed && y === selY && m === selM && d === selD && !outside) {
        btn.classList.add("calendar-popover-day--selected");
      }
      if (!outside) {
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const picked = new Date(y, m, d);
          textInput.value = formatDateDisplay(picked, getFormat());
          textInput.dispatchEvent(new Event("input", { bubbles: true }));
          textInput.dispatchEvent(new Event("change", { bubbles: true }));
          close();
        });
      } else {
        btn.disabled = true;
        btn.setAttribute("aria-hidden", "true");
      }
      gridEl.appendChild(btn);
    });
  }

  function open() {
    if (activeClose && activeClose !== close) activeClose();

    const parsed = parseDateInput(textInput.value.trim(), getFormat());
    if (parsed) {
      viewYear = parsed.getFullYear();
      viewMonth = parsed.getMonth();
    } else {
      const n = new Date();
      viewYear = n.getFullYear();
      viewMonth = n.getMonth();
    }
    viewMode = "days";

    layer = document.createElement("div");
    layer.className = "calendar-popover-layer";
    layer.innerHTML = `
      <div class="calendar-popover-panel" role="dialog" aria-modal="true" aria-label="Elegir fecha">
        <div class="calendar-popover-header">
          <button type="button" class="calendar-popover-prev" aria-label="Mes anterior">
            <i data-lucide="chevron-left" aria-hidden="true"></i>
          </button>
          <button type="button" class="calendar-popover-title"></button>
          <button type="button" class="calendar-popover-next" aria-label="Mes siguiente">
            <i data-lucide="chevron-right" aria-hidden="true"></i>
          </button>
        </div>
        <div class="calendar-popover-weekdays">
          ${WEEKDAY_LABELS.map((w) => `<span>${w}</span>`).join("")}
        </div>
        <div class="calendar-popover-grid"></div>
      </div>
    `;
    document.body.appendChild(layer);

    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
      lucide.createIcons({ root: layer });
    }

    const prevBtn = layer.querySelector(".calendar-popover-prev");
    const nextBtn = layer.querySelector(".calendar-popover-next");
    const titleBtn = layer.querySelector(".calendar-popover-title");

    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (viewMode === "months") {
        viewYear--;
      } else {
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
      }
      render();
      positionPanel(layer, textInput);
    });
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (viewMode === "months") {
        viewYear++;
      } else {
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
      }
      render();
      positionPanel(layer, textInput);
    });
    titleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (viewMode === "days") {
        viewMode = "months";
      } else {
        viewMode = "days";
      }
      render();
      positionPanel(layer, textInput);
    });

    render();
    requestAnimationFrame(() => {
      positionPanel(layer, textInput);
    });

    activeClose = close;
    setTimeout(() => {
      document.addEventListener("click", onDocClick, true);
      docClickBound = true;
    }, 0);
    document.addEventListener("keydown", onEscape, true);
    escapeBound = true;
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
  }

  textInput.addEventListener("click", (e) => {
    e.stopPropagation();
    if (layer) {
      close();
      return;
    }
    open();
  });
}
