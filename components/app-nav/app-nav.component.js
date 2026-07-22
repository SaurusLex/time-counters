// Componente de navegación lateral de la app
// Uso: createAppNav({ items, value, onSelect, id, ariaLabel })
// Estilos: components/app-nav/app-nav.css

import "./nav-item.component.js";

function setNavItemSelected(btn, isSelected) {
  btn.classList.toggle("selected", isSelected);
  if (isSelected) {
    btn.setAttribute("aria-current", "page");
  } else {
    btn.removeAttribute("aria-current");
  }
}

function createAppNav({
  items = [],
  value = "",
  onSelect = null,
  id = "app-nav",
  ariaLabel = "Navegación",
} = {}) {
  const aside = document.createElement("aside");
  aside.id = id;
  aside.className = "app-nav";
  aside.setAttribute("aria-label", ariaLabel);

  const authSlot = document.createElement("div");
  authSlot.className = "app-nav-auth";

  const nav = document.createElement("nav");
  nav.className = "app-nav-list";

  const itemButtons = [];

  items.forEach((item) => {
    const btn = window.createNavItem({
      text: item.label,
      icon: item.icon,
      value: item.value,
      selected: item.value === value,
      onClick: () => {
        if (onSelect) onSelect(item.value);
      },
    });
    itemButtons.push(btn);
    nav.appendChild(btn);
  });

  aside.appendChild(authSlot);
  aside.appendChild(nav);

  aside.setValue = (newValue) => {
    itemButtons.forEach((btn) => {
      setNavItemSelected(btn, btn.dataset.archiveView === newValue);
    });
  };

  aside.getValue = () => {
    const selected = itemButtons.find((btn) =>
      btn.classList.contains("selected")
    );
    return selected ? selected.dataset.archiveView : value;
  };

  if (typeof lucide !== "undefined") {
    lucide.createIcons({ root: aside });
  }

  return aside;
}

window.createAppNav = createAppNav;
