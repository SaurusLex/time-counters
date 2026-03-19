// modal.component.js
// Componente Modal reutilizable en JavaScript puro
// Estilos: components/modal/modal.css

class Modal {
  constructor({ header = null, body = null, footer = null, closable = true, onClose = null } = {}) {
    this.header = header !== null ? header : '<span class="modal-title">Modal</span>';
    this.body = body !== null ? body : '<div style="padding:16px;">Contenido del modal</div>';
    this.footer = footer !== null ? footer : '<button type="button" class="modal-close-btn">Cerrar</button>';
    this.closable = closable;
    this.onClose = onClose;
    this._render();
  }

  _render() {
    // Crear overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
      padding: 5vh 0; box-sizing: border-box;
      z-index: 1000; visibility: hidden; opacity: 0; transition: opacity 0.2s;
    `;
    // Crear modal
    this.modal = document.createElement('div');
    this.modal.className = 'modal-box';
    this.modal.style.cssText = `
      background: #fff; border-radius: 8px; min-width: 300px; max-width: 90vw;
      max-height: 80vh; margin: auto;
      box-shadow: 0 2px 16px rgba(0,0,0,0.2); padding: 0; position: relative;
      animation: modalIn 0.2s;
      display: flex; flex-direction: column; overflow: hidden;
    `;
    // Header
    let headerEl = null;
    if (this.header) {
      headerEl = document.createElement('div');
      headerEl.className = 'modal-header';
      if (typeof this.header === 'string') {
        headerEl.innerHTML = this.header;
      } else if (this.header instanceof Node) {
        headerEl.appendChild(this.header);
      }
      this.modal.appendChild(headerEl);
    }
    // Botón cerrar: por defecto en el header, alineado a la derecha
    if (this.closable && !this.footer.includes('modal-close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.className = 'modal-close-btn';
      closeBtn.onclick = () => this.close();
      if (headerEl) {
        headerEl.appendChild(closeBtn);
      } else {
        this.modal.appendChild(closeBtn);
      }
    }
    // Body
    if (this.body) {
      const bodyEl = document.createElement('div');
      bodyEl.className = 'modal-body';
      if (typeof this.body === 'string') {
        bodyEl.innerHTML = this.body;
      } else if (this.body instanceof Node) {
        bodyEl.appendChild(this.body);
      }
      this.modal.appendChild(bodyEl);
    }
    // Footer: añade listener al botón cerrar por defecto
    if (this.footer && this.footer.includes('modal-close-btn')) {
      setTimeout(() => {
        const closeBtn = this.modal.querySelector('.modal-close-btn');
        if (closeBtn) closeBtn.onclick = () => this.close();
      }, 0);
    }
    if (this.footer) {
      const footerEl = document.createElement('div');
      footerEl.className = 'modal-footer';
      if (typeof this.footer === 'string') {
        footerEl.innerHTML = this.footer;
      } else if (this.footer instanceof Node) {
        footerEl.appendChild(this.footer);
      }
      this.modal.appendChild(footerEl);
    }
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    // Cerrar al hacer clic fuera
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.closable) this.close();
    });
  }

  open() {
    this.overlay.style.visibility = 'visible';
    this.overlay.style.opacity = '1';
  }

  close() {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.style.visibility = 'hidden';
      if (typeof this.onClose === 'function') this.onClose();
    }, 200);
  }

  destroy() {
    this.overlay.remove();
  }
}

export default Modal;
