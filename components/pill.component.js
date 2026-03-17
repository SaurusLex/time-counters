// Componente para crear pills reutilizables (similar a tag y button)
// Uso: createPill({ text, icon, variant, size, onClick, ariaLabel, title })
// variant: "signed-in" | "signed-out"
// size: "xs" | "sm" | "md" | "lg" | "xl" (igual que botones + xl)

const VALID_VARIANTS = ["signed-in", "signed-out"];
const VALID_SIZES = ["xs", "sm", "md", "lg", "xl"];
const PILL_SIZE_CLASSES = {
  xs: "pill--xs",
  sm: "pill--sm",
  md: "pill--md",
  lg: "pill--lg",
  xl: "pill--xl",
};

function createPill({
  text = "",
  icon = null,
  variant = "signed-out",
  size = "md",
  onClick = null,
  ariaLabel = null,
  title = null,
} = {}) {
  const pill = document.createElement("span");
  const variantClass =
    VALID_VARIANTS.includes(variant) ? variant : "signed-out";
  const sizeClass =
    VALID_SIZES.includes(size) ? PILL_SIZE_CLASSES[size] : "pill--md";
  pill.className = `pill auth-status-pill ${variantClass} ${sizeClass}`;

  if (icon) {
    pill.innerHTML = `<i data-lucide="${icon}"></i><span>${text}</span>`;
  } else {
    pill.innerHTML = `<span>${text}</span>`;
  }

  if (ariaLabel) pill.setAttribute("aria-label", ariaLabel);
  if (title) pill.setAttribute("title", title);
  if (onClick) pill.onclick = onClick;

  return pill;
}

window.createPill = createPill;
