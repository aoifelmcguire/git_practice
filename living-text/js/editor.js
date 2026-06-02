// editor.js — pixel art editor (16×16 or 32×32 grid)

class PixelArtEditor {
  constructor(canvasEl, opts = {}) {
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.size   = opts.size || 16;   // sprite size in pixels
    this.scale  = 1;                 // computed from canvas dimensions
    this.tool   = 'draw';
    this.colour = '#ffffff';

    this.grid   = null;  // Float32Array-ish; index = r * size + c → colour string or null
    this._initGrid();

    this._drawing = false;
    this._bound   = {};
    this._attachEvents();
    this._render();

    // Default palette
    this.palette = [
      '#ffffff', '#eeeeee', '#aaaaaa', '#555555', '#111111',
      '#ff6600', '#ffdd00', '#2d9b2d', '#1e4080', '#6699cc',
      '#8b4513', '#cc2200', '#9b59b6', '#00cccc', '#ff6699',
    ];

    this.onSave = opts.onSave || null;   // callback(imageData, size)
    this.onAssign = opts.onAssign || null;
  }

  _initGrid() {
    this.grid = new Array(this.size * this.size).fill(null);
  }

  resize(size) {
    this.size = size;
    this._initGrid();
    this._updateScale();
    this._render();
  }

  _updateScale() {
    const desired = Math.min(256, Math.floor(256 / this.size) * this.size);
    this.canvas.width  = desired;
    this.canvas.height = desired;
    this.scale = desired / this.size;
  }

  _attachEvents() {
    const el = this.canvas;

    const getCell = (e) => {
      const rect = el.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const c = Math.floor(px / this.scale);
      const r = Math.floor(py / this.scale);
      return { r, c };
    };

    const paint = (e) => {
      const { r, c } = getCell(e);
      if (r < 0 || r >= this.size || c < 0 || c >= this.size) return;
      if (this.tool === 'draw')  this._setCell(r, c, this.colour);
      if (this.tool === 'erase') this._setCell(r, c, null);
      if (this.tool === 'fill')  this._fill(r, c, this.colour);
      if (this.tool === 'pick') {
        const col = this.grid[r * this.size + c];
        if (col) this.setColour(col);
        return;
      }
      this._render();
    };

    el.addEventListener('mousedown',  e => { this._drawing = true;  paint(e); });
    el.addEventListener('mousemove',  e => { if (this._drawing) paint(e); });
    el.addEventListener('mouseup',    () => { this._drawing = false; });
    el.addEventListener('mouseleave', () => { this._drawing = false; });

    el.addEventListener('touchstart', e => { e.preventDefault(); this._drawing = true;  paint(e); }, { passive: false });
    el.addEventListener('touchmove',  e => { e.preventDefault(); if (this._drawing) paint(e); }, { passive: false });
    el.addEventListener('touchend',   () => { this._drawing = false; });
  }

  _setCell(r, c, col) {
    this.grid[r * this.size + c] = col;
  }

  _fill(r, c, colour) {
    const target = this.grid[r * this.size + c];
    if (target === colour) return;
    const stack = [[r, c]];
    const visited = new Set();
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const key = cr * this.size + cc;
      if (cr < 0 || cr >= this.size || cc < 0 || cc >= this.size) continue;
      if (visited.has(key)) continue;
      if (this.grid[key] !== target) continue;
      visited.add(key);
      this.grid[key] = colour;
      stack.push([cr+1,cc],[cr-1,cc],[cr,cc+1],[cr,cc-1]);
    }
  }

  _render() {
    this._updateScale();
    const { ctx, size, scale, grid } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Background checker
    const check = scale >= 4 ? scale : 4;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const light = (r + c) % 2 === 0;
        ctx.fillStyle = light ? '#1a1a2e' : '#141420';
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }

    // Pixels
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const col = grid[r * size + c];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }

    // Grid lines (only when scale >= 4)
    if (scale >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth   = 0.5;
      for (let i = 0; i <= size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * scale, 0);
        ctx.lineTo(i * scale, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * scale);
        ctx.lineTo(W, i * scale);
        ctx.stroke();
      }
    }
  }

  setTool(tool) { this.tool = tool; }

  setColour(colour) {
    this.colour = colour;
    // Sync UI colour picker
    const picker = document.getElementById('colour-picker');
    if (picker) picker.value = colour;
  }

  clear() {
    this._initGrid();
    this._render();
  }

  // Export as a canvas element (thumbnail) for library display.
  exportThumbnail(thumbSize = 32) {
    const oc = document.createElement('canvas');
    oc.width = thumbSize; oc.height = thumbSize;
    const ctx = oc.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const s = thumbSize / this.size;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const col = this.grid[r * this.size + c];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(c * s, r * s, s, s);
      }
    }
    return oc;
  }

  // Export as a sprite definition compatible with SpriteRenderer.
  exportSpriteDef() {
    const rows = [];
    for (let r = 0; r < this.size; r++) {
      let row = '';
      for (let c = 0; c < this.size; c++) {
        const col = this.grid[r * this.size + c];
        row += col ? '#' : '.';   // '#' used as placeholder for custom colour
      }
      rows.push(row);
    }
    // Return a canvas-ready ImageData-like object alongside rows
    return { rows, grid: [...this.grid], size: this.size };
  }

  // Draw a custom sprite def directly onto a canvas context.
  drawCustomSprite(ctx, spriteDef, x, y, scale = 2) {
    const { grid, size } = spriteDef;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const col = grid[r * size + c];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

// ── Editor UI ─────────────────────────────────────────────────────────────────

class EditorUI {
  constructor(editorInstance) {
    this.ed = editorInstance;
    this._library = this._loadLibrary();
    this._activeLibIndex = null;
    this._customAssignments = new Map(); // word → spriteDef

    this._setup();
  }

  _setup() {
    // Size controls
    document.querySelectorAll('[name="sprite-size"]').forEach(r => {
      r.addEventListener('change', () => {
        this.ed.resize(parseInt(r.value, 10));
      });
    });

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.ed.setTool(btn.dataset.tool);
      });
    });

    // Colour picker
    const picker = document.getElementById('colour-picker');
    if (picker) {
      picker.addEventListener('input', () => this.ed.setColour(picker.value));
    }

    // Palette swatches
    this._buildPaletteSwatches();

    // Save sprite
    document.getElementById('save-sprite-btn')?.addEventListener('click', () => this._saveSprite());
    document.getElementById('clear-canvas-btn')?.addEventListener('click', () => this.ed.clear());

    // Assign button
    document.getElementById('assign-sprite-btn')?.addEventListener('click', () => this._assignSprite());

    // Set as cursor button
    document.getElementById('set-cursor-btn')?.addEventListener('click', () => {
      const eng = window._livingTextEngine;
      if (!eng) return;
      const def = this.ed.exportSpriteDef();
      eng.cursor.setCustomCursor(def);
      const btn = document.getElementById('set-cursor-btn');
      if (btn) { btn.textContent = '✓ Cursor set!'; setTimeout(() => { btn.textContent = '⊕ Set as Cursor'; }, 1800); }
    });

    // Toggle panel
    document.getElementById('toggle-editor-btn')?.addEventListener('click', () => this._openPanel());
    document.getElementById('close-editor-btn')?.addEventListener('click', () => this._closePanel());

    this._renderLibrary();
  }

  _buildPaletteSwatches() {
    const container = document.getElementById('palette-swatches');
    if (!container) return;
    container.innerHTML = '';
    this.ed.palette.forEach(col => {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = col;
      sw.title = col;
      sw.addEventListener('click', () => this.ed.setColour(col));
      container.appendChild(sw);
    });
  }

  _saveSprite() {
    const def = this.ed.exportSpriteDef();
    const thumb = this.ed.exportThumbnail(32);
    this._library.push({ def, thumbDataUrl: thumb.toDataURL() });
    this._persistLibrary();
    this._renderLibrary();
  }

  _assignSprite() {
    const word  = document.getElementById('word-assign')?.value.trim().toLowerCase();
    const trigger = document.getElementById('trigger-select')?.value;
    if (!word) return;

    const def = this.ed.exportSpriteDef();
    this._customAssignments.set(word, { def, trigger });

    // Inject into the live text
    this._applyCustomAssignment(word, def, trigger);

    const btn = document.getElementById('assign-sprite-btn');
    if (btn) { btn.textContent = '✓ Assigned'; setTimeout(() => { btn.textContent = 'Assign'; }, 1500); }
  }

  _applyCustomAssignment(word, spriteDef, trigger) {
    // Find all word spans matching this word and attach the custom sprite
    const spans = document.querySelectorAll(`.word[data-word="${word}"]`);
    const eng = window._livingTextEngine;  // global set by app.js

    spans.forEach(span => {
      span.dataset.interactive = '1';
      span.dataset.type = 'custom';

      if (trigger === 'hover') {
        span.addEventListener('mouseenter', () => {
          // Show custom sprite as cursor trail by drawing on canvas directly
          if (eng) {
            eng.cursor._customDef = spriteDef;
            eng.cursor._customActive = true;
          }
        });
        span.addEventListener('mouseleave', () => {
          if (eng) eng.cursor._customActive = false;
        });
      } else if (trigger === 'click') {
        span.addEventListener('click', () => {
          if (!eng) return;
          const rect = span.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top  + rect.height / 2;
          // Draw custom sprite burst on canvas
          this._burstCustom(eng.canvas, spriteDef, cx, cy);
        });
      } else if (trigger === 'idle') {
        // Add a floating custom sprite near the word
        this._addIdleCustom(span, spriteDef, eng);
      }
    });
  }

  _burstCustom(canvas, spriteDef, cx, cy) {
    const oc = document.createElement('canvas');
    oc.width  = canvas.width;
    oc.height = canvas.height;
    const ctx = oc.getContext('2d');

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, oc.width, oc.height);
      const spread = frame * 3;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const x = cx + Math.cos(angle) * spread - (spriteDef.size);
        const y = cy + Math.sin(angle) * spread - (spriteDef.size);
        this.ed.drawCustomSprite(ctx, spriteDef, x, y, 2);
      }
    };

    // Overlay the temp canvas
    oc.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:901;';
    document.body.appendChild(oc);
    const id = setInterval(() => { draw(); if (frame > 15) { clearInterval(id); oc.remove(); } }, 50);
  }

  _addIdleCustom(span, spriteDef, eng) {
    if (!eng) return;
    // We'll inject a custom idle animation into the engine's sprite list
    const rect = span.getBoundingClientRect();
    // Wrap in a minimal ActiveSprite-like object
    const idle = {
      x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 30,
      y: rect.top  - 10,
      vx: 0, vy: 0,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.9,
      dead: false,
      spriteDef,
      tick(dt) {
        this.phase += 0.03;
        this.x += Math.sin(this.phase * 0.7) * 0.4;
        this.y += Math.sin(this.phase) * 0.5;
      },
      draw(ctx, elapsed) {
        if (!this.spriteDef) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        const ed = window._editorInstance;
        if (ed) ed.drawCustomSprite(ctx, this.spriteDef, this.x - this.spriteDef.size, this.y - this.spriteDef.size, 2);
        ctx.restore();
      },
    };
    eng.sprites.sprites.push(idle);
  }

  _openPanel() {
    const p = document.getElementById('editor-panel');
    if (p) { p.hidden = false; requestAnimationFrame(() => p.classList.add('open')); }
  }

  _closePanel() {
    const p = document.getElementById('editor-panel');
    if (p) { p.classList.remove('open'); setTimeout(() => { p.hidden = true; }, 300); }
  }

  _renderLibrary() {
    const gallery = document.getElementById('sprite-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    this._library.forEach((entry, i) => {
      const img = document.createElement('img');
      img.src = entry.thumbDataUrl;
      img.className = 'gallery-sprite';
      img.title = `Sprite ${i + 1}`;
      img.style.imageRendering = 'pixelated';
      if (i === this._activeLibIndex) img.classList.add('active');
      img.addEventListener('click', () => {
        this._activeLibIndex = i;
        this._loadSprite(entry.def);
        gallery.querySelectorAll('.gallery-sprite').forEach((el, j) => {
          el.classList.toggle('active', j === i);
        });
      });
      gallery.appendChild(img);
    });
  }

  _loadSprite(def) {
    this.ed.resize(def.size);
    this.ed.grid = [...def.grid];
    this.ed._render();
  }

  _persistLibrary() {
    try {
      localStorage.setItem('lt_sprite_library', JSON.stringify(
        this._library.map(e => ({ def: e.def, thumbDataUrl: e.thumbDataUrl }))
      ));
    } catch (_) {}
  }

  _loadLibrary() {
    try {
      const raw = localStorage.getItem('lt_sprite_library');
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
}
