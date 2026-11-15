/**
 * input.js — keyboard and mouse state for PRISM BREAK. The paddle follows the
 * mouse when it moves and the arrow keys / A-D when they are held; clicks and
 * Space launch the ball, fire the laser and confirm menus. All coordinates
 * are converted into the canvas's own 1280x720 space.
 */

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    /** Keys pressed since the last consumePressed() call. */
    this.justPressed = new Set();
    this.mouseX = CANVAS_W / 2;
    this.mouseY = CANVAS_H / 2;
    this.mouseInside = false;
    /** Set true on a click/tap; the game consumes it (set false) each frame. */
    this.clicked = false;
    /** True while the mouse has moved since the last keyboard paddle move. */
    this.mouseActive = false;
    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!e.repeat) this.justPressed.add(k);
      this.keys.add(k);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.toLowerCase());
    };
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
      this.mouseInside = true;
      this.mouseActive = true;
    };
    this._onMouseDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
      this.mouseInside = true;
      this.clicked = true;
    };
    this._onBlur = () => {
      this.keys.clear();
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  /** True while a key is held (case-insensitive, e.g. 'arrowleft', ' '). */
  held(key) {
    return this.keys.has(key.toLowerCase());
  }

  /**
   * The keys pressed since the last call, as a Set; clears the set. Call once
   * per frame so a press is never handled twice.
   */
  consumePressed() {
    const out = this.justPressed;
    this.justPressed = new Set();
    return out;
  }

  /** True once when a key was pressed this frame; the game consumes it. */
  pressed(key, pressedSet) {
    return pressedSet.has(key.toLowerCase());
  }

  /** -1, 0 or +1 from the left/right keys, for keyboard paddle movement. */
  steer() {
    const left = this.held('arrowleft') || this.held('a') ? 1 : 0;
    const right = this.held('arrowright') || this.held('d') ? 1 : 0;
    return right - left;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
  }
}
