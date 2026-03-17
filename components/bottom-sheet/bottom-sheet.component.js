// bottom-sheet.component.js
// Componente BottomSheet para móvil: sale desde abajo, grabber, deja ver contenido detrás
// Estilos: components/bottom-sheet/bottom-sheet.css (cargado en index.html)

class BottomSheet {
  constructor({ header = null, body = null, footer = null, closable = true, onClose = null } = {}) {
    this.header = header !== null ? header : '<span class="modal-title">Bottom Sheet</span>';
    this.body = body !== null ? body : '<div style="padding:16px;">Contenido</div>';
    this.footer = footer !== null ? footer : '<button type="button" class="modal-close-btn">Cerrar</button>';
    this.closable = closable;
    this.onClose = onClose;
    this._render();
  }

  _render() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'bottom-sheet-overlay';
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; height: 100dvh;
      background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center;
      z-index: 1000; visibility: hidden; opacity: 0; transition: opacity 0.2s;
    `;

    this.sheet = document.createElement('div');
    this.sheet.className = 'bottom-sheet';
    this.sheet.style.cssText = `
      width: 100%; max-height: 85vh; background: #fff; border-radius: 16px 16px 0 0;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.15); padding: 0; margin-bottom: env(safe-area-inset-bottom); position: relative;
      display: flex; flex-direction: column; overflow: hidden;
      animation: bottomSheetSlideUp 0.3s ease-out;
    `;

    // Grabber (arrastrar hacia abajo para cerrar)
    const grabber = document.createElement('div');
    grabber.className = 'bottom-sheet-grabber';
    grabber.setAttribute('aria-hidden', 'true');
    this._setupGrabberDrag(grabber);
    this.sheet.appendChild(grabber);

    // Header: sin wrapper cuando es Node (evita anidación)
    let headerEl = null;
    if (this.header) {
      if (typeof this.header === 'string') {
        headerEl = document.createElement('div');
        headerEl.className = 'modal-header';
        headerEl.innerHTML = this.header;
        this.sheet.appendChild(headerEl);
      } else if (this.header instanceof Node) {
        headerEl = this.header;
        this.sheet.appendChild(headerEl);
      }
    }
    const footerStr = typeof this.footer === 'string' ? this.footer : '';
    const footerHasCloseBtn = footerStr.includes('modal-close-btn');
    const headerIsNode = this.header instanceof Node;
    if (this.closable && !footerHasCloseBtn && !headerIsNode) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.className = 'modal-close-btn';
      closeBtn.onclick = () => this.close();
      if (headerEl) {
        headerEl.appendChild(closeBtn);
      } else {
        this.sheet.appendChild(closeBtn);
      }
    }

    // Body: sin wrapper cuando es Node (solo el contenido)
    if (this.body) {
      if (typeof this.body === 'string') {
        const bodyEl = document.createElement('div');
        bodyEl.className = 'modal-body';
        bodyEl.innerHTML = this.body;
        this.sheet.appendChild(bodyEl);
      } else if (this.body instanceof Node) {
        this.sheet.appendChild(this.body);
      }
    }

    if (this.footer && footerStr.includes('modal-close-btn')) {
      setTimeout(() => {
        const closeBtn = this.sheet.querySelector('.modal-close-btn');
        if (closeBtn) closeBtn.onclick = () => this.close();
      }, 0);
    }
    // Footer: sin wrapper cuando es Node
    if (this.footer) {
      if (typeof this.footer === 'string') {
        const footerEl = document.createElement('div');
        footerEl.className = 'modal-footer';
        footerEl.innerHTML = this.footer;
        this.sheet.appendChild(footerEl);
      } else if (this.footer instanceof Node) {
        this.sheet.appendChild(this.footer);
      }
    }

    this.overlay.appendChild(this.sheet);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.closable) this.close();
    });

    this._viewportHandler = null;
    this._focusResizeTimeouts = [];
    this.sheet.addEventListener('focusin', (e) => {
      const t = e.target;
      if (t && (t.matches?.('input, textarea, [contenteditable="true"]'))) {
        this._scheduleViewportResizeOnFocus();
      }
    });
  }

  _scheduleViewportResizeOnFocus() {
    this._clearFocusResizeTimeouts();
    const delays = [100, 250, 450];
    this._focusResizeTimeouts = delays.map((d) =>
      setTimeout(() => this._onVisualViewportResize(), d)
    );
  }

  _clearFocusResizeTimeouts() {
    if (this._focusResizeTimeouts) {
      this._focusResizeTimeouts.forEach((id) => clearTimeout(id));
      this._focusResizeTimeouts = [];
    }
  }

  _onVisualViewportResize() {
    const vv = window.visualViewport;
    if (!vv) return;
    this.overlay.style.top = `${vv.offsetTop}px`;
    this.overlay.style.left = `${vv.offsetLeft}px`;
    this.overlay.style.width = `${vv.width}px`;
    this.overlay.style.height = `${vv.height}px`;
    this.sheet.style.maxHeight = `${Math.round(vv.height * 0.85)}px`;
  }

  _bindVisualViewport() {
    if (!window.visualViewport) return;
    this._viewportHandler = () => this._onVisualViewportResize();
    window.visualViewport.addEventListener('resize', this._viewportHandler);
    window.visualViewport.addEventListener('scroll', this._viewportHandler);
  }

  _unbindVisualViewport() {
    this._clearFocusResizeTimeouts();
    if (!window.visualViewport || !this._viewportHandler) return;
    window.visualViewport.removeEventListener('resize', this._viewportHandler);
    window.visualViewport.removeEventListener('scroll', this._viewportHandler);
    this._viewportHandler = null;
  }

  _setupGrabberDrag(grabber) {
    if (!this.closable) return;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;

    const onStart = (e) => {
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      currentY = startY;
      startTime = Date.now();
      this.sheet.style.transition = "none";
    };

    const onMove = (e) => {
      currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        e.preventDefault();
        this.sheet.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const onEnd = () => {
      const deltaY = currentY - startY;
      const duration = Date.now() - startTime;
      const velocity = duration > 0 ? deltaY / duration : 0; // px/ms
      const distanceThreshold = this.sheet.offsetHeight * 0.5; // 50% del alto
      const velocityThreshold = 0.4; // px/ms — arrastre rápido
      const minDragForVelocity = 50; // px mínimos para que la velocidad cuente
      const shouldClose =
        deltaY > distanceThreshold ||
        (velocity > velocityThreshold && deltaY > minDragForVelocity);

      this.sheet.style.transition = "transform 0.2s ease-out";
      if (shouldClose) {
        this.sheet.style.transform = "translateY(100%)";
        this.overlay.style.transition = "opacity 0.2s";
        this.overlay.style.opacity = "0";
        setTimeout(() => {
          this._unlockBodyScroll();
          this.sheet.style.transform = "";
          this.sheet.style.transition = "";
          this.overlay.style.visibility = "hidden";
          this.overlay.style.opacity = "0";
          if (typeof this.onClose === "function") this.onClose();
        }, 200);
      } else {
        this.sheet.style.transform = "";
      }
    };

    grabber.addEventListener("touchstart", onStart, { passive: true });
    grabber.addEventListener("touchmove", onMove, { passive: false });
    grabber.addEventListener("touchend", onEnd);
    grabber.addEventListener("mousedown", (e) => {
      onStart(e);
      const onMouseMove = (ev) => onMove(ev);
      const onMouseUp = () => {
        onEnd();
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  _lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }

  _unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }

  open() {
    this._lockBodyScroll();
    this._bindVisualViewport();
    this._onVisualViewportResize();
    this.overlay.style.visibility = 'visible';
    this.overlay.style.opacity = '1';
  }

  close() {
    this._unbindVisualViewport();
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this._unlockBodyScroll();
      this.overlay.style.visibility = 'hidden';
      if (typeof this.onClose === 'function') this.onClose();
    }, 200);
  }

  destroy() {
    this._unbindVisualViewport();
    this.overlay.remove();
  }
}

/** Utilidad para arrastrar y cerrar (usado por modales estáticos en móvil) */
export function setupDragToClose(grabber, sheet, overlay, onClose) {
  if (!grabber || !sheet || !overlay) return;
  let startY = 0;
  let currentY = 0;
  let startTime = 0;

  const onStart = (e) => {
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    currentY = startY;
    startTime = Date.now();
    sheet.style.transition = "none";
  };

  const onMove = (e) => {
    currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = currentY - startY;
    if (deltaY > 0) {
      e.preventDefault();
      sheet.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const onEnd = () => {
    const deltaY = currentY - startY;
    const duration = Date.now() - startTime;
    const velocity = duration > 0 ? deltaY / duration : 0;
    const distanceThreshold = sheet.offsetHeight * 0.5;
    const velocityThreshold = 0.4;
    const minDragForVelocity = 50;
    const shouldClose =
      deltaY > distanceThreshold ||
      (velocity > velocityThreshold && deltaY > minDragForVelocity);

    sheet.style.transition = "transform 0.2s ease-out";
    if (shouldClose) {
      sheet.style.transform = "translateY(100%)";
      overlay.style.transition = "opacity 0.2s";
      overlay.style.opacity = "0";
      setTimeout(() => {
        sheet.style.transform = "";
        sheet.style.transition = "";
        overlay.style.display = "none";
        overlay.style.opacity = "1";
        if (typeof onClose === "function") onClose();
      }, 200);
    } else {
      sheet.style.transform = "";
    }
  };

  grabber.addEventListener("touchstart", onStart, { passive: true });
  grabber.addEventListener("touchmove", onMove, { passive: false });
  grabber.addEventListener("touchend", onEnd);
  grabber.addEventListener("mousedown", (e) => {
    onStart(e);
    const onMouseMove = (ev) => onMove(ev);
    const onMouseUp = () => {
      onEnd();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

export default BottomSheet;
