// Utilidades para calcular diferencia de fechas
dateDiff = (from, to) => {
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
};

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

// Modal HTML
const modalHtml = `
<div id="edit-modal" class="modal" style="display:none;">
  <div class="modal-content">
    <div class="modal-header">
      <span class="modal-title">Editar contador</span>
      <button class="modal-close" id="close-modal" type="button">&times;</button>
    </div>
    <form id="edit-form">
      <div class="modal-body">
        <input type="text" id="edit-name" required>
        <input type="date" id="edit-date" required>
      </div>
      <div class="modal-footer">
        <button type="button" id="cancel-modal">Cancelar</button>
        <button type="submit">Guardar</button>
      </div>
    </form>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', modalHtml);

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

let editIdx = null;
let deleteIdx = null;
let lastDeleted = null;
let toastTimeout = null;

function openEditModal(idx) {
    const counters = getCounters();
    const counter = counters[idx];
    document.getElementById('edit-name').value = counter.name;
    document.getElementById('edit-date').value = counter.date;
    document.getElementById('edit-modal').style.display = 'flex';
    editIdx = idx;
    setTimeout(() => {
        document.getElementById('edit-name').focus();
    }, 100);
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editIdx = null;
}

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

document.getElementById('counters-list').addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-btn')) {
        const idx = e.target.getAttribute('data-idx');
        openEditModal(idx);
    }
    if (e.target.classList.contains('delete-btn')) {
        const idx = e.target.getAttribute('data-idx');
        openDeletePopover(idx, e.target);
    }
});

document.getElementById('close-modal').onclick = closeEditModal;
document.getElementById('cancel-modal').onclick = closeEditModal;
document.getElementById('edit-modal').onclick = function(e) {
    if (e.target === this) closeEditModal();
};
document.addEventListener('keydown', function(e) {
    if (document.getElementById('edit-modal').style.display !== 'none' && e.key === 'Escape') {
        closeEditModal();
    }
});

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
                counters.splice(lastDeleted.idx, 0, { name: lastDeleted.name, date: lastDeleted.date });
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

document.getElementById('edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('edit-name').value.trim();
    const date = document.getElementById('edit-date').value;
    if (!name || !date || editIdx === null) return;
    const counters = getCounters();
    counters[editIdx] = { name, date };
    saveCounters(counters);
    renderCounters();
    closeEditModal();
});

function renderCounters() {
    const list = document.getElementById('counters-list');
    const counters = getCounters();
    const now = new Date();
    const config = getConfig();
    if (list.children.length === counters.length) {
        counters.forEach((counter, idx) => {
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
            const li = list.children[idx];
            li.querySelector('.counter-name').textContent = counter.name;
            li.querySelector('.counter-date').textContent = `(${fechaStr})`;
            li.querySelector('.counter-time').textContent = text;
        });
        return;
    }
    list.innerHTML = '';
    counters.forEach((counter, idx) => {
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
        li.innerHTML = `
          <span class="counter-info">
            <span>
              <span class="counter-name">${counter.name}</span>
              <span class="counter-date">(${fechaStr})</span>
              <br>
              <span class="counter-time">${text}</span>
            </span>
          </span>
          <span class="counter-actions">
            <button data-idx="${idx}" class="edit-btn">Editar</button>
            <button data-idx="${idx}" class="delete-btn">Eliminar</button>
          </span>
        `;
        list.appendChild(li);
    });
}

document.getElementById('counter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('counter-name').value.trim();
    const date = document.getElementById('counter-date').value;
    if (!name || !date) return;
    const counters = getCounters();
    counters.push({ name, date });
    saveCounters(counters);
    renderCounters();
    this.reset();
});

function startUpdating() {
    renderCounters();
    setInterval(renderCounters, 1000);
}

window.onload = startUpdating;

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
});