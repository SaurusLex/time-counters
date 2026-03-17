// Componente para crear botones reutilizables con colores, tamaños y formas
// Uso: createButton({ text, onClick, color, size, shape, className, type, ...attrs })
// Estilos: components/button/button.css (cargado en index.html)

const VALID_SIZES = ["xs", "sm", "md", "lg"];
const VALID_SHAPES = ["default", "circle"];

const BUTTON_COLOR_CLASSES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  success: "btn-success",
  warning: "btn-warning",
  info: "btn-info",
  add: "btn-add",
  auth: "btn-auth",
  default: "btn-default",
};

const BUTTON_SIZE_CLASSES = {
  xs: "btn--xs",
  sm: "btn--sm",
  md: "btn--md",
  lg: "btn--lg",
};
const BUTTON_SHAPE_CLASSES = {
  default: "",
  circle: "btn--circle",
};

function createButton({
  text = "",
  icon = null,
  onClick = null,
  color = "default",
  size = "md",
  shape = "default",
  className = "",
  type = "button",
  ...attrs
}) {
  const btn = document.createElement("button");
  btn.type = type;
  if (icon) {
    btn.innerHTML = `<span class="btn-ico"><i data-lucide="${icon}"></i></span><span class="btn-text">${text}</span>`;
  } else {
    btn.textContent = text;
  }
  const colorClass =
    BUTTON_COLOR_CLASSES[color] || BUTTON_COLOR_CLASSES.default;
  const sizeClass =
    VALID_SIZES.includes(size) ? BUTTON_SIZE_CLASSES[size] : "btn--md";
  const shapeClass =
    VALID_SHAPES.includes(shape) ? BUTTON_SHAPE_CLASSES[shape] : "";
  btn.className = [colorClass, sizeClass, shapeClass, className]
    .filter(Boolean)
    .join(" ");
  if (onClick) btn.onclick = onClick;
  // Permite pasar atributos extra (id, aria-label, etc)
  Object.entries(attrs).forEach(([key, value]) => {
    if (key in btn) {
      btn[key] = value;
    } else {
      btn.setAttribute(key, value);
    }
  });
  return btn;
}

window.createButton = createButton;
