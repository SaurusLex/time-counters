// Componente para crear tags reutilizables
// Uso: createTag({ text, size, removable, onRemove, selectable, selected, onSelect })

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
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'remove-tag-btn';
        closeBtn.textContent = '×';
        closeBtn.title = 'Eliminar etiqueta';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            if (onRemove) onRemove();
        };
        tag.appendChild(closeBtn);
    }
    return tag;
}

window.createTag = createTag;
