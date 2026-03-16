// Componente para crear avatares con acrónimo del nombre
// Uso: createAvatar({ name, color, size, className })
// size: "xs" | "sm" | "md" | "lg"

const VALID_SIZES = ["xs", "sm", "md", "lg"];
const AVATAR_SIZE_CLASSES = {
  xs: "avatar--xs",
  sm: "avatar--sm",
  md: "avatar--md",
  lg: "avatar--lg",
};

const AVATAR_COLOR_PALETTE = [
  "#007bff",
  "#28a745",
  "#6f42c1",
  "#fd7e14",
  "#20c997",
  "#e83e8c",
  "#17a2b8",
  "#6c757d",
];

function getAcronym(name) {
  if (!name || typeof name !== "string") return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0];
    const last = words[words.length - 1];
    const a = first[0];
    const b = last[0];
    return (a + b).toUpperCase();
  }
  if (words.length === 1) {
    const w = words[0];
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w[0].toUpperCase();
  }
  return "?";
}

function getColorFromName(name) {
  if (!name || typeof name !== "string") return AVATAR_COLOR_PALETTE[7];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLOR_PALETTE.length;
  return AVATAR_COLOR_PALETTE[index];
}

function createAvatar({
  name = "",
  color = null,
  size = "md",
  className = "",
} = {}) {
  const avatar = document.createElement("span");
  const sizeClass =
    VALID_SIZES.includes(size) ? AVATAR_SIZE_CLASSES[size] : "avatar--md";
  avatar.className = `avatar ${sizeClass} ${className}`.trim();
  avatar.textContent = getAcronym(name);
  avatar.style.backgroundColor = color ?? getColorFromName(name);
  return avatar;
}

window.createAvatar = createAvatar;
