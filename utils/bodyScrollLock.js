/** Evita scroll del documento detrás de overlays (modales, bottom sheets). Usa contador para anidar capas. */

let lockCount = 0;

export function lockBodyScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
  document.documentElement.style.overflow = "hidden";
}

export function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount !== 0) return;
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
  document.documentElement.style.overflow = "";
}
