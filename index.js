// Utilidades para calcular diferencia de fechas
function dateDiff(from, to) {
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();
    let hours = to.getHours() - from.getHours();
    let minutes = to.getMinutes() - from.getMinutes();
    let seconds = to.getSeconds() - from.getSeconds();
    if (seconds < 0) { seconds += 60; minutes--; }
    if (minutes < 0) { minutes += 60; hours--; }
    if (hours < 0) { hours += 24; days--; }
    if (days < 0) {
        months--;
        let prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) { months += 12; years--; }
    return { years, months, days, hours, minutes, seconds };
}

function getConfig() {
    const defaultConfig = { years: true, months: true, days: true, hours: true, minutes: true, seconds: true };
    return JSON.parse(localStorage.getItem('config') || JSON.stringify(defaultConfig));
}

function saveConfig(config) {
    localStorage.setItem('config', JSON.stringify(config));
}

function formatDiff(diff, config) {
    let parts = [];
    if (config.years && diff.years) parts.push(`${diff.years} año${diff.years !== 1 ? 's' : ''}`);
    if (config.months && diff.months) parts.push(`${diff.months} mes${diff.months !== 1 ? 'es' : ''}`);
    if (config.days && diff.days) parts.push(`${diff.days} día${diff.days !== 1 ? 's' : ''}`);
    if (config.hours && diff.hours) parts.push(`${diff.hours} hora${diff.hours !== 1 ? 's' : ''}`);
    if (config.minutes && diff.minutes) parts.push(`${diff.minutes} minuto${diff.minutes !== 1 ? 's' : ''}`);
    if (config.seconds && diff.seconds) parts.push(`${diff.seconds} segundo${diff.seconds !== 1 ? 's' : ''}`);
    if (parts.length === 0) return '0 segundos';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts.join(' y ');
    return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
}

function getCounters() {
    return JSON.parse(localStorage.getItem('counters') || '[]');
}

function saveCounters(counters) {
    localStorage.setItem('counters', JSON.stringify(counters));
}

// Popover de confirmación de borrado
const popoverHtml = `
<div id="delete-popover" class="popover" style="display:none;">
  <div class="popover-content">
    <span>¿Estás seguro de eliminar este contador?</span>
    <div class="popover-actions">
      <button id="popover-cancel" type="button">Cancelar</button>
      <button id="popover-confirm" type="button">Eliminar</button>
    </div>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', popoverHtml);

// Toast HTML
const toastHtml = `
<div id="undo-toast" class="toast" style="display:none;">
  <span id="toast-msg"></span>
  <button id="undo-btn" type="button">Deshacer</button>
  <div class="toast-progress"><div id="toast-bar"></div></div>
</div>`;
document.body.insertAdjacentHTML('beforeend', toastHtml);

// --- MODAL NUEVO/EDITAR CONTADOR CON ETIQUETAS ---
let modalTags = [];
let editingIdx = null;
let deleteIdx = null;
let lastDeleted = null;
let toastTimeout = null;
let filterTags = [];

function openCounterModal(mode = 'new', idx = null) {
    const modal = document.getElementById('counter-modal');
    const title = document.getElementById('counter-modal-title');
    const nameInput = document.getElementById('modal-counter-name');
    const dateInput = document.getElementById('modal-counter-date');
    if (mode === 'edit' && idx !== null) {
        const counters = getCounters();
        const counter = counters[idx];
        nameInput.value = counter.name;
        dateInput.value = counter.date;
        modalTags = Array.isArray(counter.tags) ? [...counter.tags] : [];
        title.textContent = 'Editar contador';
        editingIdx = idx;
    } else {
        nameInput.value = '';
        dateInput.value = '';
        modalTags = [];
        title.textContent = 'Nuevo contador';
        editingIdx = null;
    }
    renderTagsList();
    renderTagSuggestions();
    modal.style.display = 'flex';
    setTimeout(() => nameInput.focus(), 100);
}

function closeCounterModal() {
    document.getElementById('counter-modal').style.display = 'none';
    editingIdx = null;
}

function getAllTags() {
    const counters = getCounters();
    const tagsSet = new Set();
    counters.forEach(c => {
        if (Array.isArray(c.tags)) {
            c.tags.forEach(tag => tagsSet.add(tag));
        }
    });
    return Array.from(tagsSet);
}

function renderTagSuggestions() {
    const suggestionsDiv = document.getElementById('tag-suggestions');
    if (!suggestionsDiv) return;
    const allTags = getAllTags().filter(tag => !modalTags.includes(tag));
    suggestionsDiv.innerHTML = '';
    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag tag-suggestion';
        btn.textContent = tag;
        btn.onclick = () => {
            modalTags.push(tag);
            renderTagsList();
            renderTagSuggestions();
        };
        suggestionsDiv.appendChild(btn);
    });
    suggestionsDiv.style.display = allTags.length ? 'flex' : 'none';
}

function renderTagsList() {
    const tagsList = document.getElementById('tags-list');
    tagsList.innerHTML = '';
    modalTags.forEach((tag, i) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-tag-btn';
        removeBtn.onclick = () => {
            modalTags.splice(i, 1);
            renderTagsList();
            renderTagSuggestions();
        };
        tagEl.appendChild(removeBtn);
        tagsList.appendChild(tagEl);
    });
    renderTagSuggestions();
}

document.getElementById('add-tag-btn').onclick = function(e) {
    e.preventDefault();
    const tagInput = document.getElementById('tag-input');
    const tag = tagInput.value.trim();
    if (tag && !modalTags.includes(tag)) {
        modalTags.push(tag);
        renderTagsList();
    }
    tagInput.value = '';
    tagInput.focus();
};

document.getElementById('tag-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('add-tag-btn').click();
    }
});

document.getElementById('close-counter-modal').onclick = closeCounterModal;
document.getElementById('cancel-counter-modal').onclick = closeCounterModal;
document.getElementById('counter-modal').onclick = function(e) {
    if (e.target === this) closeCounterModal();
};
document.addEventListener('keydown', function(e) {
    if (document.getElementById('counter-modal').style.display !== 'none' && e.key === 'Escape') {
        closeCounterModal();
    }
});

document.getElementById('open-add-modal').onclick = function() {
    openCounterModal('new');
};

document.getElementById('counter-form-modal').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('modal-counter-name').value.trim();
    const date = document.getElementById('modal-counter-date').value;
    if (!name || !date) return;
    const counters = getCounters();
    if (editingIdx !== null) {
        counters[editingIdx] = { ...counters[editingIdx], name, date, tags: [...modalTags] };
    } else {
        counters.push({ name, date, tags: [...modalTags] });
    }
    saveCounters(counters);
    renderCounters();
    closeCounterModal();
});

function openDeletePopover(idx, button) {
    deleteIdx = idx;
    const popover = document.getElementById('delete-popover');
    popover.style.display = 'block';
    // Posicionar el popover cerca del botón
    const rect = button.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top = (rect.bottom + 8) + 'px';
    popover.style.left = (rect.left + rect.width/2 - 110) + 'px';
}

function closeDeletePopover() {
    document.getElementById('delete-popover').style.display = 'none';
    deleteIdx = null;
}

function showToast(msg, onUndo) {
    const toast = document.getElementById('undo-toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.style.display = 'flex';
    toast.classList.add('show');
    document.getElementById('undo-btn').onclick = function() {
        if (onUndo) onUndo();
        hideToast();
    };
    // Barra de progreso
    const bar = document.getElementById('toast-bar');
    let duration = 10000;
    let start = Date.now();
    bar.style.width = '100%';
    function animateBar() {
        let elapsed = Date.now() - start;
        let percent = Math.max(0, 1 - elapsed / duration);
        bar.style.width = (percent * 100) + '%';
        if (percent > 0 && toast.style.display !== 'none') {
            requestAnimationFrame(animateBar);
        }
    }
    animateBar();
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hideToast, duration);
}

function hideToast() {
    const toast = document.getElementById('undo-toast');
    toast.style.display = 'none';
    toast.classList.remove('show');
    clearTimeout(toastTimeout);
}

document.getElementById('counters-list').onclick = function(e) {
    if (e.target.classList.contains('edit-btn')) {
        const idx = e.target.getAttribute('data-idx');
        openCounterModal('edit', idx);
    }
    if (e.target.classList.contains('delete-btn')) {
        const idx = e.target.getAttribute('data-idx');
        openDeletePopover(idx, e.target);
    }
};

document.getElementById('popover-cancel').onclick = closeDeletePopover;
document.getElementById('popover-confirm').onclick = function() {
    if (deleteIdx !== null) {
        const counters = getCounters();
        lastDeleted = { ...counters[deleteIdx], idx: deleteIdx };
        counters.splice(deleteIdx, 1);
        saveCounters(counters);
        renderCounters();
        showToast('Contador eliminado', function() {
            // Deshacer
            const counters = getCounters();
            if (lastDeleted) {
                counters.splice(lastDeleted.idx, 0, { ...lastDeleted });
                saveCounters(counters);
                renderCounters();
                lastDeleted = null;
            }
        });
    }
    closeDeletePopover();
};
document.addEventListener('mousedown', function(e) {
    const popover = document.getElementById('delete-popover');
    if (popover.style.display === 'block' && !popover.contains(e.target) && !e.target.classList.contains('delete-btn')) {
        closeDeletePopover();
    }
});
document.addEventListener('keydown', function(e) {
    if (document.getElementById('delete-popover').style.display === 'block' && e.key === 'Escape') {
        closeDeletePopover();
    }
});

function renderCounters() {
    const list = document.getElementById('counters-list');
    const counters = getCounters();
    const now = new Date();
    const config = getConfig();
    list.innerHTML = '';
    let filtered = counters;
    if (filterTags.length) {
        filtered = counters.filter(c => Array.isArray(c.tags) && filterTags.every(tag => c.tags.includes(tag)));
    }
    filtered.forEach((counter, idx) => {
        const target = new Date(counter.date);
        let diff, text;
        if (now < target) {
            diff = dateDiff(now, target);
            text = `Quedan ${formatDiff(diff, config)}`;
        } else {
            diff = dateDiff(target, now);
            text = `Han pasado ${formatDiff(diff, config)}`;
        }
        const fechaStr = target.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const li = document.createElement('li');
        let tagsHtml = '';
        if (counter.tags && counter.tags.length) {
            tagsHtml = `<span class="counter-tags">${counter.tags.map(tag => `<span class='tag'>${tag}</span>`).join(' ')}</span>`;
        }
        li.innerHTML = `
          <span class="counter-info">
            <span>
              <span class="counter-name">${counter.name}</span>
              <span class="counter-date">(${fechaStr})</span>
              <br>
              <span class="counter-time">${text}</span>
              ${tagsHtml}
            </span>
          </span>
          <span class="counter-actions">
            <button data-idx="${idx}" class="edit-btn">Editar</button>
            <button data-idx="${idx}" class="delete-btn">Eliminar</button>
          </span>
        `;
        list.appendChild(li);
    });
    renderFilterTags();
}

function startUpdating() {
    renderCounters();
    setInterval(renderCounters, 1000);
}

window.onload = startUpdating;

function renderFilterTags() {
    const filterTagsList = document.getElementById('filter-tags-list');
    if (!filterTagsList) return;
    const allTags = getAllTags();
    filterTagsList.innerHTML = '';
    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag filter-tag-btn' + (filterTags.includes(tag) ? ' selected' : '');
        btn.textContent = tag;
        btn.onclick = () => {
            if (filterTags.includes(tag)) {
                filterTags = filterTags.filter(t => t !== tag);
            } else {
                filterTags.push(tag);
            }
            renderFilterTags();
            renderCounters();
        };
        filterTagsList.appendChild(btn);
    });
}

// Config form event
const configForm = document.getElementById('config-form');
configForm.addEventListener('change', function() {
    const config = {
        years: configForm.years.checked,
        months: configForm.months.checked,
        days: configForm.days.checked,
        hours: configForm.hours.checked,
        minutes: configForm.minutes.checked,
        seconds: configForm.seconds.checked
    };
    saveConfig(config);
    renderCounters();
});

// Al cargar, poner los valores del config en el form
window.addEventListener('DOMContentLoaded', () => {
    const config = getConfig();
    Object.keys(config).forEach(key => {
        if (configForm[key]) configForm[key].checked = config[key];
    });
    renderFilterTags();
});