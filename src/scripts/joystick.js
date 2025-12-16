/* src/scripts/joystick.js */
export class Joystick {
  constructor(id, parent, options = {}) {
    this.padding = options.padding || 0.2;
    this.x = 0.0;
    this.y = 0.0;
    this.active = false; // Track if currently being touched
    this._pointerId = -1;

    // DOM Creation
    this._panel = document.createElement("div");
    this._panel.id = id || "joystick";
    this._panel.classList.add("joystick-panel");
    
    // Apply custom styles if provided
    if (options.left) this._panel.style.left = options.left;
    if (options.right) this._panel.style.right = options.right;
    if (options.bottom) this._panel.style.bottom = options.bottom;

    this._thumb = document.createElement("div");
    this._thumb.classList.add("joystick-thumb");
    this._panel.appendChild(this._thumb);

    (parent || document.body).appendChild(this._panel);

    // Pointer event handlers
    this._onPointerDown = (e) => this._onPointerDown(e);
    this._onPointerMove = (e) => this._onPointerMove(e);
    this._onPointerUp = (e) => this._onPointerUp(e);
    this._onPointerCancel = (e) => this._onPointerUp(e);

    this._panel.addEventListener("pointerdown", this._onPointerDown);
    this._panel.addEventListener("pointermove", this._onPointerMove);
    this._panel.addEventListener("pointerup", this._onPointerUp);
    this._panel.addEventListener("pointercancel", this._onPointerCancel);

    // Prevent gestures/scrolling
    this._panel.style.touchAction = "none";

    // Initial state: Hidden by default until mobile mode is detected
    this.hide(); 
    requestAnimationFrame(() => this.resetThumb());
  }

  hide() { this._panel.style.display = "none"; }
  show() { this._panel.style.display = "block"; }

  _onPointerDown(e) {
    if (e.isPrimary === false || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (this._pointerId !== -1) return;

    this._pointerId = e.pointerId;
    this.active = true;
    try { this._panel.setPointerCapture(this._pointerId); } catch (err) {}

    this._moveFromClient(e.clientX, e.clientY);
    
    // Trigger callback if needed
    if (this.onActive) this.onActive();
    
    e.preventDefault();
    e.stopPropagation();
  }

  _onPointerMove(e) {
    if (e.pointerId !== this._pointerId) return;
    this._moveFromClient(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  }

  _onPointerUp(e) {
    if (e.pointerId !== this._pointerId) return;
    try { this._panel.releasePointerCapture(this._pointerId); } catch (err) {}
    this._pointerId = -1;
    this.active = false;
    this.x = 0.0;
    this.y = 0.0;
    this.resetThumb();
    e.preventDefault();
    e.stopPropagation();
  }

  _moveFromClient(clientX, clientY) {
    const panelRect = this._panel.getBoundingClientRect();
    const thumbRect = this._thumb.getBoundingClientRect();

    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;
    const thumbWidth = thumbRect.width || 32;
    const thumbHeight = thumbRect.height || 32;
    const halfThumbWidth = thumbWidth / 2;
    const halfThumbHeight = thumbHeight / 2;

    let left = clientX - panelRect.left - halfThumbWidth;
    let top = clientY - panelRect.top - halfThumbHeight;

    left = Math.max(-halfThumbWidth, Math.min(panelWidth - halfThumbWidth, left));
    top = Math.max(-halfThumbHeight, Math.min(panelHeight - halfThumbHeight, top));

    this._thumb.style.left = `${left}px`;
    this._thumb.style.top = `${top}px`;

    const px = panelWidth / 2.0;
    const py = panelHeight / 2.0;
    const x = Math.max(-1.0, Math.min(1.0, (left + halfThumbWidth - px) / (px / 2.0)));
    const y = -Math.max(-1.0, Math.min(1.0, (top + halfThumbHeight - py) / (py / 2.0)));

    // Deadzone logic
    this.x = Math.abs(x) < this.padding ? 0.0 : x;
    this.y = Math.abs(y) < this.padding ? 0.0 : y;
  }

  resetThumb() {
    const panelWidth = this._panel.clientWidth || 100;
    const panelHeight = this._panel.clientHeight || 100;
    const thumbWidth = this._thumb.clientWidth || 40;
    const thumbHeight = this._thumb.clientHeight || 40;

    this._thumb.style.left = `${(panelWidth - thumbWidth) / 2.0}px`;
    this._thumb.style.top = `${(panelHeight - thumbHeight) / 2.0}px`;
  }
}