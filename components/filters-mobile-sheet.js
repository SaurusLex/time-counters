// filters-mobile-sheet.js
// Bottom sheet único en móvil: Ordenar + Mostrar como listas planas

import BottomSheet from "./bottom-sheet/bottom-sheet.component.js";

/**
 * @param {Object} opts
 * @param {Array<{value: *, label: string}>} opts.sortOptions
 * @param {Array<{value: *, label: string}>} opts.timeOptions
 * @param {function(): *} opts.getSort
 * @param {function(): *} opts.getTime
 * @param {function(value, option)} [opts.onSortChange]
 * @param {function(value, option)} [opts.onTimeChange]
 */
export function openFiltersBottomSheet({
  sortOptions = [],
  timeOptions = [],
  getSort = () => null,
  getTime = () => null,
  onSortChange = null,
  onTimeChange = null,
} = {}) {
  const body = document.createElement("div");
  body.className = "modal-body bottom-sheet-filters-body";

  const sortHeading = document.createElement("h3");
  sortHeading.className = "bottom-sheet-filter-section-title";
  sortHeading.textContent = "Ordenar";

  const sortList = document.createElement("ul");
  sortList.className = "bottom-sheet-options-list";

  const timeHeading = document.createElement("h3");
  timeHeading.className = "bottom-sheet-filter-section-title";
  timeHeading.textContent = "Mostrar";

  const timeList = document.createElement("ul");
  timeList.className = "bottom-sheet-options-list";

  function refreshSelected() {
    const s = getSort();
    const t = getTime();
    sortList.querySelectorAll(".bottom-sheet-option").forEach((li) => {
      li.classList.toggle("selected", li.dataset.value === String(s));
    });
    timeList.querySelectorAll(".bottom-sheet-option").forEach((li) => {
      li.classList.toggle("selected", li.dataset.value === String(t));
    });
  }

  sortOptions.forEach((opt) => {
    const li = document.createElement("li");
    li.className = "bottom-sheet-option";
    li.dataset.value = String(opt.value);
    li.textContent = opt.label;
    li.addEventListener("click", () => {
      if (typeof onSortChange === "function") onSortChange(opt.value, opt);
      refreshSelected();
    });
    sortList.appendChild(li);
  });

  timeOptions.forEach((opt) => {
    const li = document.createElement("li");
    li.className = "bottom-sheet-option";
    li.dataset.value = String(opt.value);
    li.textContent = opt.label;
    li.addEventListener("click", () => {
      if (typeof onTimeChange === "function") onTimeChange(opt.value, opt);
      refreshSelected();
    });
    timeList.appendChild(li);
  });

  body.appendChild(sortHeading);
  body.appendChild(sortList);
  body.appendChild(timeHeading);
  body.appendChild(timeList);

  refreshSelected();

  const header = document.createElement("div");
  header.className = "modal-header";
  header.innerHTML = `<span class="modal-title">Filtros</span>`;

  const sheet = new BottomSheet({
    header,
    body,
    footer: "",
    closable: true,
  });

  sheet.open();
  return sheet;
}
