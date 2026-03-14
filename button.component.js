// Componente para crear botones reutilizables con colores predefinidos
// Uso: createButton({ text, onClick, color, className, type, ...attrs })

const BUTTON_COLOR_CLASSES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  success: "btn-success",
  warning: "btn-warning",
  info: "btn-info",
  default: "btn-default",
};

function createButton({
  text = "",
  onClick = null,
  color = "default",
  className = "",
  type = "button",
  ...attrs
}) {
  const btn = document.createElement("button");
  btn.type = type;
  btn.textContent = text;
  // Aplica la clase de color predefinido
  const colorClass =
    BUTTON_COLOR_CLASSES[color] || BUTTON_COLOR_CLASSES.default;
  btn.className = colorClass + (className ? " " + className : "");
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
