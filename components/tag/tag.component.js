// Componente para crear tags reutilizables
// Uso: createTag({ text, size, removable, onRemove, selectable, selected, onSelect })
// Estilos: style.css (sección tags)

const VALID_SIZES = ["xs", "sm", "md", "lg"];

function createTag({ text, size = "md", removable = false, onRemove = null, selectable = false, selected = false, onSelect = null }) {
    const tag = document.createElement('span');
    const sizeClass = VALID_SIZES.includes(size) ? `tag--${size}` : "tag--md";
    tag.className = `tag ${sizeClass}`;
    tag.textContent = text;
    if (selectable) {
        tag.classList.add('selectable-tag');
        if (selected) tag.classList.add('selected');
        tag.onclick = (e) => {
            if (onSelect) onSelect(e);
        };
    }
    if (removable) {
        const removeHit = document.createElement('span');
        removeHit.className = 'remove-tag';
        removeHit.title = 'Eliminar etiqueta';
        const iconEl = document.createElement('i');
        iconEl.setAttribute('data-lucide', 'x');
        iconEl.setAttribute('aria-hidden', 'true');
        removeHit.appendChild(iconEl);
        removeHit.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onRemove) onRemove();
        });
        tag.appendChild(removeHit);
    }
    return tag;
}

window.createTag = createTag;
