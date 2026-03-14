import {
  dateDiff,
  formatDiff,
  getNextOccurrence as getNextOccurrenceFromUtils,
  advanceDateByFrequency as advanceDateByFrequencyFromUtils,
} from "../utils/dateUtils.js";

let _getConfig = () => ({});
let _getFilterTags = () => [];
let _openCounterModal = () => {};
let _renderFilterTags = () => {};
let _getDomListElement = () => null;
let _getCounterTimeElement = () => null;
let _renderCounters = () => {};
let _showDeleteConfirm = (opts) => {
  import("../popover.js").then(({ showPopover }) => showPopover(opts));
};
let _onAfterDelete = () => {};

export function initCounterManager(dependencies) {
  _getConfig = dependencies.getConfig;
  _getFilterTags = dependencies.getFilterTags;
  _openCounterModal = dependencies.openCounterModal;
  _renderFilterTags = dependencies.renderFilterTags;
  _getDomListElement = dependencies.getDomListElement;
  _getCounterTimeElement = dependencies.getCounterTimeElement;
  _renderCounters = renderCounters;
  if (dependencies.showDeleteConfirm) _showDeleteConfirm = dependencies.showDeleteConfirm;
  if (dependencies.onAfterDelete) _onAfterDelete = dependencies.onAfterDelete;
}

export function getCounters() {
  return JSON.parse(localStorage.getItem("counters") || "[]");
}

export function saveCounters(counters) {
  localStorage.setItem("counters", JSON.stringify(counters));
}

export function deleteCounter(id, occurrenceDateString) {
  const counters = getCounters();
  const index = counters.findIndex((c) => c.id === id);
  if (index === -1) {
    console.warn(`Counter with id ${id} not found for deletion.`);
    return false;
  }

  const counter = counters[index];

  if (occurrenceDateString && counter.frequency !== "none") {
    // This is a deletion of a specific occurrence of a recurring counter
    const occurrenceDate = new Date(occurrenceDateString);
    if (isNaN(occurrenceDate.getTime())) {
      console.warn(
        `Invalid occurrenceDateString provided: ${occurrenceDateString}`
      );
      return false;
    }

    // Si la ocurrencia es igual o posterior a la fecha de fin, borra la serie entera
    if (counter.endDate) {
      const endDate = new Date(counter.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (occurrenceDate >= endDate) {
        counters.splice(index, 1);
        saveCounters(counters);
        _renderCounters();
        _renderFilterTags();
        _onAfterDelete?.();
        return true;
      }
    }

    if (!counter.deletedOccurrences) {
      counter.deletedOccurrences = [];
    }
    const occurrenceISOString = occurrenceDate.toISOString().split("T")[0]; // Store as YYYY-MM-DD

    if (!counter.deletedOccurrences.includes(occurrenceISOString)) {
      counter.deletedOccurrences.push(occurrenceISOString);
    }
    // Do not remove the counter from the array, just mark the occurrence as deleted.
    // The counter.date (start of series) should also remain unchanged.
    console.log(
      `Marked occurrence ${occurrenceISOString} of counter ${id} as deleted.`
    );
  } else {
    // This is a deletion of the entire counter (either non-recurring or a recurring one without a specific occurrence)
    counters.splice(index, 1);
    console.log(`Counter ${id} fully deleted.`);
  }

  saveCounters(counters);
  _renderCounters();
  _renderFilterTags();
  _onAfterDelete?.();
  return true;
}

export function addOrUpdateCounter(counterData, editIndex) {
  let counters = getCounters();
  const {
    name,
    date,
    tags,
    frequency,
    dayOfWeek,
    dayOfMonth,
    isPublic,
    originalDate,
    endDate, // <-- Asegúrate de incluir endDate
  } = counterData;

  if (frequency && frequency !== "none") {
    console.log(
      "[addOrUpdateCounter] Creando/actualizando contador recurrente:",
      {
        name,
        date,
        frequency,
        endDate,
        editIndex,
        counterData,
      }
    );
  }
  const newCounter = {
    name,
    date,
    tags: tags.filter((tag) => tag.trim() !== ""),
    frequency: frequency || "none",
    dayOfWeek: frequency === "weekly" ? parseInt(dayOfWeek) : null,
    dayOfMonth: frequency === "monthly" ? parseInt(dayOfMonth) : null,
    isPublic: isPublic || false,
    id:
      editIndex !== null && counters[editIndex]
        ? counters[editIndex].id
        : Date.now().toString(),
    originalDate:
      frequency !== "none"
        ? editIndex !== null &&
          counters[editIndex] &&
          counters[editIndex].originalDate
          ? counters[editIndex].originalDate
          : date
        : null,
    history:
      editIndex !== null && counters[editIndex]
        ? counters[editIndex].history
        : [],
    endDate: frequency !== "none" ? endDate : undefined, // <-- Asegúrate de guardar endDate
  };

  if (editIndex !== null) {
    // If editing, and it's a recurring counter that was advanced, log the change to history
    const oldCounter = counters[editIndex];
    if (
      oldCounter.frequency &&
      oldCounter.frequency !== "none" &&
      oldCounter.date !== newCounter.date
    ) {
      // This condition might need refinement based on how "advancement" vs "true edit" is determined.
      // For now, any date change on a recurring item could be an advancement or a correction.
      // Let's assume for now that if the date changes and it's recurring, it was an advancement.
      // A more robust way would be to specifically track "advancements".
    }
    counters[editIndex] = newCounter;
  } else {
    counters.push(newCounter);
  }

  saveCounters(counters);
  _renderCounters();
  _renderFilterTags();
}

export function renderCounters() {
  const list = _getDomListElement();
  if (!list) {
    console.error(
      "DOM list element not found in counterManager.renderCounters"
    );
    return;
  }
  const counters = getCounters();
  const now = new Date();
  const config = _getConfig();
  list.innerHTML = "";
  let filtered = counters;
  const filterTags = _getFilterTags();

  if (filterTags.length) {
    filtered = counters.filter(
      (c) =>
        Array.isArray(c.tags) && filterTags.every((tag) => c.tags.includes(tag))
    );
  }

  filtered.forEach((counter, idxInFilteredArray) => {
    // Find the original index of the counter in the unfiltered 'counters' array
    // This is crucial because edit/delete operations rely on the original index.
    const originalIdx = counters.findIndex((c) => c === counter);

    const originalStartDate = new Date(counter.date);
    let editText = "Editar";
    let deleteText = "Eliminar";
    const isRecurring = counter.frequency && counter.frequency !== "none";

    if (isRecurring) {
      editText = "Editar Serie";
      // deleteText = "Eliminar Serie"; // Ya no, ahora siempre "Eliminar"
    }

    if (isRecurring) {
      const endDate = counter.endDate ? new Date(counter.endDate) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);

      const MAX_REPETITIONS_TO_RENDER = 5;
      let repetitionsRendered = 0;
      let occurrenceIdxForId = 0;

      // --- NUEVO: Filtrar ocurrencias eliminadas ---
      const deletedSet = new Set(
        (counter.deletedOccurrences || []).map(
          (d) => new Date(d).toISOString().split("T")[0]
        )
      );

      let currentOccurrenceDate = getNextOccurrenceFromUtils(
        originalStartDate,
        counter.frequency
      );

      // --- NUEVO: Renderizar la cabecera de la serie (sin data-occurrence-date) ---
      if (currentOccurrenceDate) {
        let diff, text;
        if (now < currentOccurrenceDate) {
          diff = dateDiff(now, currentOccurrenceDate);
          text = `Quedan ${formatDiff(diff, config)}`;
        } else {
          diff = dateDiff(currentOccurrenceDate, now);
          text = `Pasó hace ${formatDiff(diff, config)}`;
        }
        let frequencyDisplaySuffix = "";
        switch (counter.frequency) {
          case "daily":
            frequencyDisplaySuffix = " (Diario)";
            break;
          case "weekly":
            frequencyDisplaySuffix = " (Semanal)";
            break;
          case "monthly":
            frequencyDisplaySuffix = " (Mensual)";
            break;
          case "annual":
            frequencyDisplaySuffix = " (Anual)";
            break;
        }
        let fechaStr = currentOccurrenceDate.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        if (counter.frequency === "annual") {
          const day = currentOccurrenceDate
            .getDate()
            .toString()
            .padStart(2, "0");
          const month = (currentOccurrenceDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          fechaStr = `${day}/${month}`;
        }
        fechaStr += frequencyDisplaySuffix;
        const li = document.createElement("li");
        // NO poner data-occurrence-date en la cabecera
        li.setAttribute("data-original-counter-idx", originalIdx.toString());
        let tagsHtml = "";
        if (counter.tags && counter.tags.length) {
          const tagsSpan = document.createElement("span");
          tagsSpan.className = "counter-tags";
          counter.tags.forEach((tag) => {
            const tagEl = window.createTag({ text: tag, removable: false, size: "xs" });
            tagsSpan.appendChild(tagEl);
          });
          tagsHtml = tagsSpan.outerHTML;
        }
        const actions = document.createElement("span");
        actions.className = "counter-actions";
        actions.appendChild(
          window.createButton({
            text: editText,
            color: "secondary",
            type: "button",
            "data-idx": originalIdx.toString(),
            className: "edit-btn",
            onClick: () => _openCounterModal("edit", originalIdx),
          })
        );
        actions.appendChild(
          window.createButton({
            text: deleteText,
            color: "danger",
            type: "button",
            "data-idx": originalIdx.toString(),
            className: "delete-btn",
            onClick: (e) => {
              if (isRecurring) {
                const li = e.target.closest("li");
                const occurrenceDate = li ? li.getAttribute("data-occurrence-date") : null;
                _showDeleteConfirm({
                  message: "¿Qué deseas borrar?",
                  actions: [
                    {
                      text: "Solo este evento",
                      className: "btn-danger",
                      onClick: () => {
                        if (occurrenceDate) deleteCounter(counter.id, occurrenceDate);
                        else deleteCounter(counter.id, null);
                      },
                    },
                    { text: "Toda la serie", className: "btn-danger", onClick: () => deleteCounter(counter.id, null) },
                    { text: "Cancelar", className: "btn-secondary" },
                  ],
                  anchorElement: e.target,
                  counterName: counter.name,
                });
              } else {
                _showDeleteConfirm({
                  message: "¿Estás seguro de eliminar este contador?",
                  actions: [
                    { text: "Eliminar", className: "btn-danger", onClick: () => deleteCounter(counter.id, null) },
                    { text: "Cancelar", className: "btn-secondary" },
                  ],
                  anchorElement: e.target,
                  counterName: counter.name,
                });
              }
            },
          })
        );
        li.innerHTML = `
                  <span class=\"counter-info\">
                    <span>
                      <span class=\"counter-name\">${counter.name}</span>
                      <span class=\"counter-date\">(${fechaStr})</span>
                      <span class=\"counter-time\" id=\"counter-time-${originalIdx}-0\">${text}</span>
                      ${tagsHtml}
                    </span>
                  </span>
                `;
        li.appendChild(actions);
        list.appendChild(li);
        repetitionsRendered++;
        occurrenceIdxForId++;
        // Avanzar a la siguiente ocurrencia
        currentOccurrenceDate = advanceDateByFrequencyFromUtils(
          new Date(currentOccurrenceDate.getTime()),
          counter.frequency,
          originalStartDate
        );
      }

      // --- Renderizar el resto de ocurrencias (con data-occurrence-date) ---
      while (
        currentOccurrenceDate &&
        repetitionsRendered < MAX_REPETITIONS_TO_RENDER
      ) {
        const dateKey = currentOccurrenceDate.toISOString().split("T")[0];
        if (deletedSet.has(dateKey)) {
          // Si la ocurrencia está eliminada, saltarla y seguir mostrando las siguientes
          currentOccurrenceDate = advanceDateByFrequencyFromUtils(
            new Date(currentOccurrenceDate.getTime()),
            counter.frequency,
            originalStartDate
          );
          continue;
        }
        if (endDate && currentOccurrenceDate > endDate) {
          break;
        }
        let diff, text;
        if (now < currentOccurrenceDate) {
          diff = dateDiff(now, currentOccurrenceDate);
          text = `Quedan ${formatDiff(diff, config)}`;
        } else {
          diff = dateDiff(currentOccurrenceDate, now);
          text = `Pasó hace ${formatDiff(diff, config)}`;
        }
        let frequencyDisplaySuffix = "";
        switch (counter.frequency) {
          case "daily":
            frequencyDisplaySuffix = " (Diario)";
            break;
          case "weekly":
            frequencyDisplaySuffix = " (Semanal)";
            break;
          case "monthly":
            frequencyDisplaySuffix = " (Mensual)";
            break;
          case "annual":
            frequencyDisplaySuffix = " (Anual)";
            break;
        }
        let fechaStr = currentOccurrenceDate.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        if (counter.frequency === "annual") {
          const day = currentOccurrenceDate
            .getDate()
            .toString()
            .padStart(2, "0");
          const month = (currentOccurrenceDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          fechaStr = `${day}/${month}`;
        }
        fechaStr += frequencyDisplaySuffix;
        const li = document.createElement("li");
        li.setAttribute(
          "data-occurrence-date",
          currentOccurrenceDate.toISOString()
        );
        li.setAttribute("data-original-counter-idx", originalIdx.toString());
        let tagsHtml = "";
        if (counter.tags && counter.tags.length) {
          const tagsSpan = document.createElement("span");
          tagsSpan.className = "counter-tags";
          counter.tags.forEach((tag) => {
            const tagEl = window.createTag({ text: tag, removable: false, size: "xs" });
            tagsSpan.appendChild(tagEl);
          });
          tagsHtml = tagsSpan.outerHTML;
        }
        const actions = document.createElement("span");
        actions.className = "counter-actions";
        actions.appendChild(
          window.createButton({
            text: editText,
            color: "secondary",
            type: "button",
            "data-idx": originalIdx.toString(),
            className: "edit-btn",
            onClick: () => _openCounterModal("edit", originalIdx),
          })
        );
        actions.appendChild(
          window.createButton({
            text: deleteText,
            color: "danger",
            type: "button",
            "data-idx": originalIdx.toString(),
            className: "delete-btn",
            onClick: (e) => {
              if (isRecurring) {
                const li = e.target.closest("li");
                const occurrenceDate = li ? li.getAttribute("data-occurrence-date") : null;
                _showDeleteConfirm({
                  message: "¿Qué deseas borrar?",
                  actions: [
                    {
                      text: "Solo este evento",
                      className: "btn-danger",
                      onClick: () => {
                        if (occurrenceDate) deleteCounter(counter.id, occurrenceDate);
                        else deleteCounter(counter.id, null);
                      },
                    },
                    { text: "Toda la serie", className: "btn-danger", onClick: () => deleteCounter(counter.id, null) },
                    { text: "Cancelar", className: "btn-secondary" },
                  ],
                  anchorElement: e.target,
                  counterName: counter.name,
                });
              } else {
                _showDeleteConfirm({
                  message: "¿Estás seguro de eliminar este contador?",
                  actions: [
                    { text: "Eliminar", className: "btn-danger", onClick: () => deleteCounter(counter.id, null) },
                    { text: "Cancelar", className: "btn-secondary" },
                  ],
                  anchorElement: e.target,
                  counterName: counter.name,
                });
              }
            },
          })
        );
        li.innerHTML = `
                  <span class=\"counter-info\">
                    <span>
                      <span class=\"counter-name\">${counter.name}</span>
                      <span class=\"counter-date\">(${fechaStr})</span>
                      <span class=\"counter-time\" id=\"counter-time-${originalIdx}-${occurrenceIdxForId}\">${text}</span>
                      ${tagsHtml}
                    </span>
                  </span>
                `;
        li.appendChild(actions);
        list.appendChild(li);
        repetitionsRendered++;
        occurrenceIdxForId++;
        if (repetitionsRendered >= MAX_REPETITIONS_TO_RENDER) break;
        currentOccurrenceDate = advanceDateByFrequencyFromUtils(
          new Date(currentOccurrenceDate.getTime()),
          counter.frequency,
          originalStartDate
        );
      }
      // Si no se renderizó ninguna ocurrencia, puedes mostrar un mensaje opcional aquí
    } else {
      // Non-recurring counter
      let target = originalStartDate;
      let diff, text;

      if (now < target) {
        diff = dateDiff(now, target);
        text = `Quedan ${formatDiff(diff, config)}`;
      } else {
        diff = dateDiff(target, now);
        text = `Han pasado ${formatDiff(diff, config)}`;
      }
      const fechaStr = target.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const li = document.createElement("li");
      li.setAttribute("data-original-counter-idx", originalIdx.toString());

      let tagsHtml = "";
      if (counter.tags && counter.tags.length) {
        const tagsSpan = document.createElement("span");
        tagsSpan.className = "counter-tags";
        counter.tags.forEach((tag) => {
          const tagEl = window.createTag({ text: tag, removable: false, size: "xs" });
          tagsSpan.appendChild(tagEl);
        });
        tagsHtml = tagsSpan.outerHTML;
      }
      const actions = document.createElement("span");
      actions.className = "counter-actions";
      actions.appendChild(
        window.createButton({
          text: editText,
          color: "secondary",
          type: "button",
          "data-idx": originalIdx.toString(),
          className: "edit-btn",
          onClick: () => _openCounterModal("edit", originalIdx),
        })
      );
      actions.appendChild(
        window.createButton({
          text: deleteText,
          color: "danger",
          type: "button",
          "data-idx": originalIdx.toString(),
          className: "delete-btn",
          onClick: (e) => {
            _showDeleteConfirm({
              message: "¿Estás seguro de eliminar este contador?",
              actions: [
                { text: "Eliminar", className: "btn-danger", onClick: () => deleteCounter(counter.id, null) },
                { text: "Cancelar", className: "btn-secondary" },
              ],
              anchorElement: e.target,
              counterName: counter.name,
            });
          },
        })
      );

      li.innerHTML = `
              <span class=\"counter-info\">
                <span>
                  <span class=\"counter-name\">${counter.name}</span>
                  <span class=\"counter-date\">(${fechaStr})</span>
                  <span class=\"counter-time\" id=\"counter-time-${originalIdx}\">${text}</span> 
                  ${tagsHtml}
                </span>
              </span>
            `;
      li.appendChild(actions);
      list.appendChild(li);
    }
  });
  _renderFilterTags();
}

export function updateCountersTime() {
  const counters = getCounters();
  const now = new Date();
  const config = _getConfig();

  counters.forEach((counter, originalIdx) => {
    if (counter.frequency && counter.frequency !== "none") {
      let occurrenceRenderIdx = 0;
      const MAX_REPETITIONS_TO_CHECK = 10;

      while (occurrenceRenderIdx < MAX_REPETITIONS_TO_CHECK) {
        const timeSpan = _getCounterTimeElement(
          originalIdx,
          occurrenceRenderIdx
        );

        if (!timeSpan) {
          if (occurrenceRenderIdx > 0) break;
          occurrenceRenderIdx++;
          continue;
        }

        const liElement = timeSpan.closest("li");
        if (!liElement) {
          occurrenceRenderIdx++;
          continue;
        }
        const occurrenceDateStr = liElement.getAttribute(
          "data-occurrence-date"
        );
        if (!occurrenceDateStr) {
          occurrenceRenderIdx++;
          continue;
        }
        const occurrenceDate = new Date(occurrenceDateStr);
        const globalEndDate = counter.endDate
          ? new Date(counter.endDate)
          : null;
        if (globalEndDate) globalEndDate.setHours(23, 59, 59, 999);

        if (
          globalEndDate &&
          now > globalEndDate &&
          occurrenceDate > globalEndDate
        ) {
          if (!timeSpan.textContent.includes("Finalizado")) {
            const nameSpan = liElement.querySelector(".counter-name");
            if (nameSpan && !nameSpan.textContent.includes("(Finalizado)")) {
              nameSpan.textContent = counter.name + " (Finalizado)";
              timeSpan.textContent = "Evento concluido";
              const dateSpan = liElement.querySelector(".counter-date");
              if (dateSpan)
                dateSpan.textContent = `(Terminó el ${globalEndDate.toLocaleDateString(
                  "es-ES"
                )})`;
            }
          }
          occurrenceRenderIdx++;
          continue;
        }

        let diff, text;
        if (now < occurrenceDate) {
          diff = dateDiff(now, occurrenceDate);
          text = `Quedan ${formatDiff(diff, config)}`;
        } else {
          diff = dateDiff(occurrenceDate, now);
          text = `Pasó hace ${formatDiff(diff, config)}`;
        }
        timeSpan.textContent = text;
        occurrenceRenderIdx++;
      }
    } else {
      // Non-recurring
      const timeSpan = _getCounterTimeElement(originalIdx, null); // null for non-recurring occurrence index
      if (timeSpan) {
        const target = new Date(counter.date);
        let diff, text;
        if (now < target) {
          diff = dateDiff(now, target);
          text = `Quedan ${formatDiff(diff, config)}`;
        } else {
          diff = dateDiff(target, now);
          text = `Han pasado ${formatDiff(diff, config)}`;
        }
        timeSpan.textContent = text;
      }
    }
  });
}

export function generateOccurrences(
  counter,
  startDate,
  endDate,
  includeMissed = false
) {
  if (!counter || !startDate || !endDate) return [];
  if (counter.frequency === "none") {
    const counterDate = new Date(counter.date);
    // Ensure single occurrence is within the view window and not before the counter's own date
    if (counterDate >= startDate && counterDate <= endDate) {
      return [{ ...counter, date: counterDate.toISOString() }];
    }
    return [];
  }

  const occurrences = [];
  let currentDate = new Date(counter.date); // Start from the counter's base date
  const viewStart = new Date(startDate);
  const viewEnd = new Date(endDate);

  // Normalize deletedOccurrences to YYYY-MM-DD format if they exist
  const deletedOccurrencesSet = new Set(
    (counter.deletedOccurrences || []).map(
      (d) => new Date(d).toISOString().split("T")[0]
    )
  );

  // Iterate to find the first occurrence that is on or after the counter's date
  // and potentially after the viewStart if includeMissed is false.
  let next;
  let initialSeekDate =
    viewStart > currentDate && !includeMissed ? viewStart : currentDate;

  // Adjust initialSeekDate to be just before, to allow getNextOccurrence to find it if it's the exact date.
  const seekFrom = new Date(initialSeekDate);
  seekFrom.setDate(seekFrom.getDate() - 1);

  next = getNextOccurrenceFromUtils(counter, counter.date, seekFrom);

  while (next && next <= viewEnd) {
    const nextDateOnly = next.toISOString().split("T")[0];
    if (!deletedOccurrencesSet.has(nextDateOnly)) {
      if (next >= viewStart) {
        // Only add if it's within the view window
        occurrences.push({
          ...counter,
          date: next.toISOString(),
          originalCounterDate: counter.date,
        });
      }
    }
    // To find the subsequent occurrence, we must look for one *after* the current 'next'
    next = getNextOccurrenceFromUtils(counter, counter.date, next);
  }
  return occurrences;
}
