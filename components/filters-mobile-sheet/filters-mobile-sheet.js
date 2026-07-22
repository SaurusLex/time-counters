// filters-mobile-sheet.js
// Bottom sheet en móvil: Vista (archivados) como lista plana
// Estilos: components/bottom-sheet/bottom-sheet.css

import BottomSheet from "../bottom-sheet/bottom-sheet.component.js";

/**
 * @param {Object} opts
 * @param {Array<{value: *, label: string}>} [opts.archiveOptions]
 * @param {function(): *} [opts.getArchive]
 * @param {function(value, option)} [opts.onArchiveChange]
 */
export function openFiltersBottomSheet({
  archiveOptions = [],
  getArchive = () => null,
  onArchiveChange = null,
} = {}) {
  const body = document.createElement("div");
  body.className = "modal-body bottom-sheet-filters-body";

  const archiveHeading = document.createElement("h3");
  archiveHeading.className = "bottom-sheet-filter-section-title";
  archiveHeading.textContent = "Vista";

  const archiveList = document.createElement("ul");
  archiveList.className = "bottom-sheet-options-list";

  function refreshSelected() {
    const a = getArchive();
    archiveList.querySelectorAll(".bottom-sheet-option").forEach((li) => {
      li.classList.toggle("selected", li.dataset.value === String(a));
    });
  }

  archiveOptions.forEach((opt) => {
    const li = document.createElement("li");
    li.className = "bottom-sheet-option";
    li.dataset.value = String(opt.value);
    li.textContent = opt.label;
    li.addEventListener("click", () => {
      if (typeof onArchiveChange === "function") onArchiveChange(opt.value, opt);
      refreshSelected();
    });
    archiveList.appendChild(li);
  });

  body.appendChild(archiveHeading);
  body.appendChild(archiveList);

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
