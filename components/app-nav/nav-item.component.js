// Componente para un ítem de navegación lateral
// Uso: createNavItem({ text, icon, value, selected, onClick })
// Estilos: components/app-nav/app-nav.css

function createNavItem({
  text = "",
  icon = null,
  value = "",
  selected = false,
  onClick = null,
} = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "app-nav-item";
  btn.dataset.archiveView = value;

  if (icon) {
    btn.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i><span>${text}</span>`;
  } else {
    btn.innerHTML = `<span>${text}</span>`;
  }

  if (selected) {
    btn.classList.add("selected");
    btn.setAttribute("aria-current", "page");
  }

  if (onClick) btn.addEventListener("click", onClick);

  return btn;
}

window.createNavItem = createNavItem;
