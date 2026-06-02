// physics.js — per-letter physics: cursor repulsion + elastic spring return
//
// Every rendered character is a particle with a "home" position.
// The cursor creates a radial repulsion field. Spring forces pull
// letters back. Cursor velocity bleeds into nearby letters so the
// text feels like it's being dragged through.

class LetterPhysics {
  constructor() {
    this.container = null;
    this.letters   = [];        // array of LetterParticle

    // Cursor tracking
    this.cx  = -9999;  this.cy  = -9999;   // current viewport pos
    this.pvx = 0;      this.pvy = 0;        // velocity this frame
    this._lx = -9999;  this._ly = -9999;    // previous pos

    this.running = false;
    this._raf    = null;

    // ── Physics parameters (tweak these for feel) ───────────────
    this.repRadius    = 110;    // px radius of the repulsion field
    this.repForce     = 14;     // peak force magnitude at centre
    this.springK      = 0.14;   // spring constant (stiffness of return)
    this.damping      = 0.82;   // velocity damping (< 1 = energy loss)
    this.maxDisplace  = 160;    // hard limit on displacement px
    this.speedBonus   = 0.10;   // how much cursor speed amplifies force
    this.dragTransfer = 0.28;   // fraction of cursor velocity absorbed

    // Mouse / touch
    const mv = e => {
      const nx = e.clientX, ny = e.clientY;
      this.pvx = nx - this._lx;
      this.pvy = ny - this._ly;
      this._lx = this.cx;
      this._ly = this.cy;
      this.cx  = nx;
      this.cy  = ny;
    };
    const tv = e => mv({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    window.addEventListener('mousemove', mv);
    window.addEventListener('touchmove', tv, { passive: true });
    this._mvHandler = mv;
    this._tvHandler = tv;
  }

  setContainer(el) { this.container = el; }

  // ── Register ────────────────────────────────────────────────────
  // Call after text DOM is stable. Stores each letter's home position
  // relative to the scroll container (so scroll is handled correctly).
  registerAll(els) {
    const wasRunning = this.running;
    if (wasRunning) this._stopLoop();

    this.letters = [];
    if (!this.container || !els.length) return;

    const cr = this.container.getBoundingClientRect();
    const st = this.container.scrollTop;

    els.forEach(el => {
      const r = el.getBoundingClientRect();
      this.letters.push({
        el,
        // Home position relative to container's top-left + scroll offset
        hx: r.left + r.width  * 0.5 - cr.left,
        hy: r.top  + r.height * 0.5 - cr.top + st,
        dx: 0, dy: 0,   // current displacement from home
        vx: 0, vy: 0,   // velocity
        frozen: false,  // true during CSS-transition animations (scatter)
      });
    });

    if (wasRunning) this._startLoop();
  }

  // ── Lifecycle ───────────────────────────────────────────────────
  start() {
    if (this.running) return;
    this.running = true;
    this._startLoop();
  }

  stop() {
    this.running = false;
    this._stopLoop();
    this._resetAll();
    this.letters = [];
  }

  // Freeze/unfreeze individual letter elements (used by scatter effect).
  freeze(el)   { const p = this._find(el); if (p) p.frozen = true;  }
  unfreeze(el) { const p = this._find(el); if (p) p.frozen = false; }

  _find(el) { return this.letters.find(p => p.el === el); }

  _startLoop() {
    const loop = () => {
      if (!this.running) return;
      this._tick();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _resetAll() {
    for (const l of this.letters) {
      l.dx = l.dy = l.vx = l.vy = 0;
      l.el.style.transform = '';
    }
  }

  // ── Physics tick ────────────────────────────────────────────────
  _tick() {
    if (!this.container || !this.letters.length) return;

    // One getBoundingClientRect per frame (not per letter)
    const cr  = this.container.getBoundingClientRect();
    const st  = this.container.scrollTop;
    const { cx, cy, pvx, pvy } = this;

    // Scale force with cursor speed (faster cursor = bigger parting effect)
    const cursorSpeed = Math.min(Math.sqrt(pvx * pvx + pvy * pvy), 35);
    const speedMult   = 1 + cursorSpeed * this.speedBonus;

    const { repRadius: R, repForce: RF, springK: sk,
            damping: dm, maxDisplace: mxD, dragTransfer: dt } = this;

    for (const l of this.letters) {
      if (l.frozen) continue;

      // Home position in viewport coords (accounting for container scroll)
      const hx = cr.left + l.hx;
      const hy = cr.top  + l.hy - st;

      // Current visual position of this letter
      const lx = hx + l.dx;
      const ly = hy + l.dy;

      // Vector from cursor to letter (repulsion pushes letter away)
      const diffX = lx - cx;
      const diffY = ly - cy;
      const dist  = Math.sqrt(diffX * diffX + diffY * diffY) || 0.001;

      if (dist < R) {
        // Quadratic falloff: strong at centre, zero at radius edge
        const t     = (R - dist) / R;
        const force = t * t * RF * speedMult;
        const nx    = diffX / dist;
        const ny    = diffY / dist;

        l.vx += nx * force;
        l.vy += ny * force;

        // Drag: absorb a fraction of cursor's velocity into the letter.
        // This makes text feel like it's being *dragged through*, not just pushed.
        l.vx += pvx * t * dt;
        l.vy += pvy * t * dt;
      }

      // Spring force (Hooke's law — pulls back to home)
      l.vx -= l.dx * sk;
      l.vy -= l.dy * sk;

      // Velocity damping
      l.vx *= dm;
      l.vy *= dm;

      // Integrate velocity → position
      l.dx += l.vx;
      l.dy += l.vy;

      // Clamp maximum displacement
      const mag = Math.sqrt(l.dx * l.dx + l.dy * l.dy);
      if (mag > mxD) {
        const s = mxD / mag;
        l.dx *= s; l.dy *= s;
        l.vx *= s; l.vy *= s;
      }

      // Write transform (skip if negligible — avoids unnecessary style writes)
      if (Math.abs(l.dx) > 0.05 || Math.abs(l.dy) > 0.05) {
        l.el.style.transform = `translate(${l.dx.toFixed(2)}px,${l.dy.toFixed(2)}px)`;
      } else if (l.el.style.transform !== '') {
        l.el.style.transform = '';
        l.dx = l.dy = l.vx = l.vy = 0;
      }
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────
const letterPhysics = new LetterPhysics();
