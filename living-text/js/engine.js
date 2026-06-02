// engine.js — canvas animation engine: cursor trail, sprites, particles

class AnimationEngine {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.running = false;
    this.elapsed = 0;
    this._raf    = null;

    // Sub-systems
    this.cursor   = new CursorTrail(this);
    this.particles = new ParticleSystem(this);
    this.sprites   = new SpriteManager(this);

    // Narrative config (set from app.js)
    this.narrativeMap = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(now - last, 50);
      last = now;
      this.elapsed += dt;
      this._tick(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _tick(dt) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Clip canvas rendering below the two fixed bars (~90px)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 90, canvas.width, canvas.height - 90);
    ctx.clip();
    this.particles.tick(dt, ctx, this.elapsed);
    this.sprites.tick(dt, ctx, this.elapsed);
    ctx.restore();
    // Cursor trail drawn over the full canvas (needs to track freely)
    this.cursor.draw(ctx, this.elapsed, dt);
  }

  applyNarrative(map) {
    this.narrativeMap = map;
    this.particles.configure(map);
    this.sprites.configure(map);
  }
}

// ── CursorEffectParticle ──────────────────────────────────────────────────────

class CursorEffectParticle {
  constructor(x, y, type, headAngle = 0) {
    this.x = x; this.y = y;
    this.type = type;
    this.life = 1.0;

    if (type === 'fire') {
      const spread = (Math.random() - 0.5) * 0.9;
      const speed  = 2.5 + Math.random() * 3;
      this.vx    = Math.cos(headAngle + spread) * speed;
      this.vy    = Math.sin(headAngle + spread) * speed - 0.4;
      this.decay = 0.024 + Math.random() * 0.018;
      this.maxSz = 9;
    } else if (type === 'water') {
      this.vx    = (Math.random() - 0.5) * 2;
      this.vy    = 1.2 + Math.random() * 1.5;
      this.decay = 0.018;
      this.maxSz = 5;
    } else if (type === 'bloom') {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 2;
      this.vx    = Math.cos(a) * s;
      this.vy    = Math.sin(a) * s - 0.8;
      this.decay = 0.013;
      this.maxSz = 7;
    } else { // shadow / smoke
      this.vx    = (Math.random() - 0.5) * 1.2;
      this.vy    = -0.8 - Math.random() * 0.8;
      this.decay = 0.011;
      this.maxSz = 11;
    }
  }

  tick() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.type === 'fire')  { this.vy -= 0.07; this.vx *= 0.97; }
    if (this.type === 'water') { this.vy += 0.04; }
    if (this.type === 'bloom') { this.vx *= 0.95; this.vy *= 0.95; }
    if (this.type === 'shadow'){ this.vx *= 0.94; }
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const sz = Math.max(1, (0.3 + 0.7 * this.life) * this.maxSz);
    ctx.save();
    if (this.type === 'fire') {
      ctx.globalAlpha = this.life * 0.85;
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, sz);
      g.addColorStop(0,   '#FFEE00');
      g.addColorStop(0.4, '#FF5500');
      g.addColorStop(1,   'rgba(180,0,0,0)');
      ctx.fillStyle = g;
    } else if (this.type === 'water') {
      ctx.globalAlpha = this.life * 0.7;
      ctx.fillStyle = '#6699CC';
    } else if (this.type === 'bloom') {
      ctx.globalAlpha = this.life * 0.8;
      ctx.fillStyle = this.life > 0.5 ? '#FFAACC' : '#AA66BB';
    } else {
      ctx.globalAlpha = this.life * 0.4;
      ctx.fillStyle = 'rgba(40,20,60,0.9)';
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, sz, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── CursorTrail ───────────────────────────────────────────────────────────────

class CursorTrail {
  constructor(engine) {
    this.engine        = engine;
    this.positions     = [];
    this.maxLen        = 40;

    // Narrative-assigned creature (always shown while display panel is active)
    this.primarySprite  = null;
    // Per-word hover override (temporary)
    this.activeSprite   = null;
    // Scale for the main cursor creature
    this.cursorScale    = 4;

    // Transient effect (fire / water / bloom / shadow)
    this.effectType     = null;
    this.effectTimer    = 0;
    this.effectParticles = [];
    this.headAngle      = 0;

    this.cx = -200; this.cy = -200;
    this.pvx = 0;   this.pvy = 0;

    // Custom sprite set from pixel editor
    this._customCursorCanvas = null;

    window.addEventListener('mousemove', e => this._onMove(e));
    window.addEventListener('touchmove', e => {
      const t = e.touches[0];
      this._onMove({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: true });
  }

  _onMove(e) {
    const nx = e.clientX, ny = e.clientY;
    this.pvx = nx - this.cx;
    this.pvy = ny - this.cy;
    this.cx  = nx;
    this.cy  = ny;
    this.positions.unshift({ x: nx, y: ny });
    if (this.positions.length > this.maxLen) this.positions.length = this.maxLen;
    if (this.positions.length >= 2) {
      const dx = this.positions[0].x - this.positions[1].x;
      const dy = this.positions[0].y - this.positions[1].y;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) this.headAngle = Math.atan2(dy, dx);
    }
  }

  // Called from app.js after narrative loads — sets the always-on cursor creature.
  setPrimary(name) {
    this.primarySprite = name;
    if (!name) { this.cursorScale = 2; return; }
    const sz = SPRITE_DATA[name]?.size || 8;
    this.cursorScale = name.startsWith('cursor_') ? 4 : (sz <= 8 ? 5 : sz <= 12 ? 4 : 3);
  }

  // Called when returning to input panel.
  clearPrimary() {
    this.primarySprite       = null;
    this.activeSprite        = null;
    this.effectType          = null;
    this.effectTimer         = 0;
    this.effectParticles     = [];
    this._customCursorCanvas = null;
  }

  // Called by pixel editor "Set as Cursor" button.
  setCustomCursor(spriteDef) {
    const { grid, size } = spriteDef;
    const sc = 4;
    const oc = document.createElement('canvas');
    oc.width = size * sc; oc.height = size * sc;
    const ctx = oc.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    grid.forEach((col, idx) => {
      if (!col) return;
      const r = Math.floor(idx / size), c = idx % size;
      ctx.fillStyle = col;
      ctx.fillRect(c * sc, r * sc, sc, sc);
    });
    this._customCursorCanvas = oc;
    this.primarySprite = 'cursor_custom';
    this.cursorScale   = 1; // canvas is pre-scaled
  }

  // Temporary word-hover override.
  useSpriteFor(name) { this.activeSprite = name; }
  resetSprite()       { this.activeSprite = null; }

  // Trigger a timed visual effect (fire / water / bloom / shadow).
  triggerEffect(type, duration = 2500) {
    this.effectType  = type;
    this.effectTimer = duration;
  }

  draw(ctx, elapsed, dt = 16) {
    if (!this.positions.length) return;

    // Tick effect timer + spawn particles
    if (this.effectType) {
      this.effectTimer -= dt;
      if (this.effectTimer <= 0) {
        this.effectType = null;
      } else {
        this._spawnEffectParticles(this.effectType === 'fire' ? 3 : 2);
      }
    }

    // Tick + draw effect particles
    this.effectParticles = this.effectParticles.filter(p => p.life > 0);
    for (const p of this.effectParticles) { p.tick(); p.draw(ctx); }

    // Draw cursor creature (or dot trail if no creature assigned)
    const sp = this.activeSprite || this.primarySprite;
    if (sp) {
      this._drawCreatureCursor(ctx, elapsed, sp);
    } else {
      this._drawDotTrail(ctx);
    }
  }

  _drawCreatureCursor(ctx, elapsed, spriteName) {
    const head = this.positions[0];
    if (!head) return;

    // Custom pixel-editor cursor
    if (spriteName === 'cursor_custom' && this._customCursorCanvas) {
      const img = this._customCursorCanvas;
      for (let i = Math.min(this.positions.length - 1, 8); i >= 1; i--) {
        const { x, y } = this.positions[i];
        ctx.save();
        ctx.globalAlpha = (1 - i / 9) * 0.3;
        ctx.drawImage(img, x - img.width / 2, y - img.height / 2);
        ctx.restore();
      }
      ctx.drawImage(img, head.x - img.width / 2, head.y - img.height / 2);
      return;
    }

    const len  = this.positions.length;

    // Direction for flip + tilt
    let moveX = 0, moveY = 0;
    if (len >= 4) {
      const lookback = Math.min(6, len - 1);
      moveX = this.positions[0].x - this.positions[lookback].x;
      moveY = this.positions[0].y - this.positions[lookback].y;
    }
    const movingLeft = moveX < -3;
    const flipH  = movingLeft;
    const tilt   = Math.atan2(moveY, Math.max(Math.abs(moveX), 2)) * 0.25;

    // Frame selection
    const frames = spriteRenderer.frameCount(spriteName);
    const frame  = (this.effectType === 'fire' && frames > 1)
      ? 1
      : Math.floor((elapsed / 240) % frames);

    // Body trail (dragon_body segments for dragon, ghost copies for others)
    const useDragonBody = spriteName === 'cursor_dragon' || spriteName === 'dragon';
    const bodySprite    = useDragonBody ? 'dragon_body' : null;
    const segSpacing    = 5;
    const segCount      = Math.min(Math.floor(len / segSpacing), 6);

    for (let i = segCount; i >= 1; i--) {
      const idx = i * segSpacing;
      if (idx >= len) continue;
      const { x, y } = this.positions[idx];
      const alpha    = 0.2 + (1 - i / (segCount + 1)) * 0.55;
      const segScale = Math.max(1, this.cursorScale - 1 - Math.floor(i / 3));

      if (bodySprite) {
        spriteRenderer.drawCentered(ctx, bodySprite, 0, x, y, segScale, flipH, alpha);
      } else {
        spriteRenderer.drawCentered(ctx, spriteName, frame, x, y,
          Math.max(1, segScale - 1), flipH, alpha * 0.4, tilt);
      }
    }

    // Head
    spriteRenderer.drawCentered(ctx, spriteName, frame,
      head.x, head.y, this.cursorScale, flipH, 1.0, tilt);
  }

  _spawnEffectParticles(count) {
    const head = this.positions[0];
    if (!head) return;
    for (let i = 0; i < count; i++) {
      this.effectParticles.push(
        new CursorEffectParticle(head.x, head.y, this.effectType, this.headAngle)
      );
    }
    if (this.effectParticles.length > 120) this.effectParticles = this.effectParticles.slice(-90);
  }

  _drawDotTrail(ctx) {
    const accent = getComputedStyle(document.documentElement)
                     .getPropertyValue('--accent').trim() || '#c8a96e';
    for (let i = 0; i < this.positions.length; i++) {
      const { x, y } = this.positions[i];
      const t = 1 - i / this.positions.length;
      ctx.save();
      ctx.globalAlpha = t * 0.55;
      ctx.fillStyle   = accent;
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * t + 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── ParticleSystem ────────────────────────────────────────────────────────────

class Particle {
  constructor(canvas, type, options = {}) {
    this.canvas = canvas;
    this.type   = type;
    this.reset(true);
    if (options.x !== undefined) this.x = options.x;
    if (options.y !== undefined) this.y = options.y;
    this.settling = options.settling || false;
    this.targetX  = options.targetX;
    this.targetY  = options.targetY;
  }

  reset(initial = false) {
    const c = this.canvas;
    this.x = Math.random() * c.width;
    this.y = initial ? Math.random() * c.height : -10;
    const slow = this.type === 'firefly' || this.type === 'star';
    this.vx = (Math.random() - 0.5) * (slow ? 0.3 : 0.8);
    this.vy = slow ? (Math.random() - 0.5) * 0.4 : Math.random() * 0.8 + 0.2;
    this.alpha = Math.random() * 0.6 + 0.4;
    this.life = 1.0;
    this.size = Math.random() * 2 + 1;
    this.phase = Math.random() * Math.PI * 2;
    this.spriteName = this._spriteFor(this.type);
    this.frame = 0;
  }

  _spriteFor(type) {
    const map = {
      leaf: 'leaf', snow: 'snowflake', firefly: 'firefly',
      star: 'star', rain: 'raindrop',
    };
    return map[type] || null;
  }

  tick(dt, elapsed) {
    if (this.settling && this.targetX !== undefined) {
      // Drift toward target
      this.x += (this.targetX - this.x) * 0.01;
      this.y += (this.targetY - this.y) * 0.01;
      this.alpha = 0.7;
      return;
    }
    this.x += this.vx + Math.sin(elapsed * 0.001 + this.phase) * 0.3;
    this.y += this.vy;
    this.phase += 0.02;
    if (this.y > this.canvas.height + 20) this.reset();
  }

  draw(ctx, elapsed) {
    const sp = this.spriteName;
    if (sp) {
      const frameCount = spriteRenderer.frameCount(sp);
      const frame = Math.floor((elapsed / 500 + this.phase) % frameCount);
      spriteRenderer.drawCentered(ctx, sp, frame, this.x, this.y, 2, false, this.alpha);
    } else {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

class ParticleSystem {
  constructor(engine) {
    this.engine    = engine;
    this.particles = [];
    this.type      = 'none';
    this.density   = 0;
  }

  configure(map) {
    if (!map) return;
    const pt = map.particles?.type || 'none';
    const density = map.particles?.density || 0.3;
    this.type = pt;
    this.density = density;
    this.particles = [];
    const count = Math.round(density * 40);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(this.engine.canvas, pt, {}));
    }
  }

  // Add settling particles around a specific DOM element
  addSettling(el, count = 6) {
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const tx = rect.left + Math.random() * rect.width;
      const ty = rect.top  + Math.random() * rect.height + 4;
      const p = new Particle(this.engine.canvas, this.type || 'star', {
        x: tx + (Math.random() - 0.5) * 40,
        y: ty - 30,
        settling: true,
        targetX: tx,
        targetY: ty,
      });
      this.particles.push(p);
    }
    // Expire after 4s
    setTimeout(() => {
      this.particles = this.particles.filter(p => !p.settling);
    }, 4000);
  }

  tick(dt, ctx, elapsed) {
    for (const p of this.particles) {
      p.tick(dt, elapsed);
      p.draw(ctx, elapsed);
    }
  }
}

// ── SpriteManager — active sprites that move across the scene ─────────────────

class ActiveSprite {
  constructor(canvas, name, behavior, narrativeMap) {
    this.canvas  = canvas;
    this.name    = name;
    this.behavior = behavior;  // 'fly-across', 'idle-margin', 'drift'
    this.scale   = 2;
    this.alpha   = 0;
    this.dead    = false;
    this._init();
  }

  _init() {
    const c = this.canvas;
    const sz = spriteRenderer.size(this.name, this.scale);

    if (this.behavior === 'fly-across') {
      const fromLeft = Math.random() < 0.5;
      this.x = fromLeft ? -sz.w - 10 : c.width + 10;
      this.y = 80 + Math.random() * (c.height * 0.6);
      this.vx = fromLeft ? 1.2 + Math.random() * 1 : -(1.2 + Math.random() * 1);
      this.vy = (Math.random() - 0.5) * 0.4;
      this.flipH = !fromLeft;
    } else if (this.behavior === 'idle-margin') {
      // Keep sprites in the outer ~10% of each side, away from the text column
      const margin = Math.max(40, c.width * 0.08);
      this.x = Math.random() < 0.5
        ? margin * Math.random()                      // left strip
        : c.width - margin + margin * Math.random();  // right strip
      this.y = 100 + Math.random() * (c.height * 0.75);
      this.vx = 0; this.vy = 0;
      this.idlePhase = Math.random() * Math.PI * 2;
      this.flipH = this.x > c.width / 2;
    } else {
      this.x = Math.random() * c.width;
      this.y = Math.random() * c.height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.flipH = Math.random() < 0.5;
    }

    this.alpha = 0;
  }

  tick(dt, elapsed) {
    // Fade in
    if (this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt * 0.002);

    if (this.behavior === 'fly-across') {
      this.x += this.vx;
      this.y += this.vy;
      const sz = spriteRenderer.size(this.name, this.scale);
      if (this.x > this.canvas.width + 100 || this.x < -100) {
        this.dead = true;
      }
    } else if (this.behavior === 'idle-margin') {
      this.idlePhase += 0.02;
      this.x += Math.sin(this.idlePhase * 0.7) * 0.3;
      this.y += Math.sin(this.idlePhase) * 0.5;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      // Wrap
      if (this.x > this.canvas.width + 20) this.x = -20;
      if (this.x < -20) this.x = this.canvas.width + 20;
      if (this.y > this.canvas.height + 20) this.y = -20;
      if (this.y < -20) this.y = this.canvas.height + 20;
    }
  }

  draw(ctx, elapsed) {
    const frames = spriteRenderer.frameCount(this.name);
    const frame = Math.floor((elapsed / 200) % frames);
    spriteRenderer.drawCentered(ctx, this.name, frame,
      this.x, this.y, this.scale, this.flipH, this.alpha);
  }
}

class SpriteManager {
  constructor(engine) {
    this.engine  = engine;
    this.sprites = [];
    this.schedule = [];   // { at: ms, name, behavior }
    this._nextSchedule = 0;
  }

  configure(map) {
    if (!map) return;
    this.sprites = [];
    this.schedule = [];

    // Add idle-margin sprites for each entity
    (map.entities || []).forEach(ent => {
      const sp = spriteRenderer.bestSprite(ent.name) || spriteRenderer.bestSprite(ent.sprite || '');
      if (!sp) return;
      const count = Math.min(ent.count || 1, 3);
      for (let i = 0; i < count; i++) {
        this.sprites.push(new ActiveSprite(this.engine.canvas, sp, 'idle-margin', map));
      }
    });

    // Schedule periodic fly-across events
    let t = 4000;
    (map.entities || []).forEach(ent => {
      const sp = spriteRenderer.bestSprite(ent.name) || spriteRenderer.bestSprite(ent.sprite || '');
      if (!sp) return;
      const behavior = this._behaviorForAction(ent, map);
      if (behavior === 'fly-across') {
        // Schedule several fly-across events
        for (let i = 0; i < 4; i++) {
          t += 3000 + Math.random() * 8000;
          this.schedule.push({ at: t, name: sp, behavior: 'fly-across' });
        }
      }
    });
  }

  _behaviorForAction(ent, map) {
    const actions = (map.actions || []).map(a => a.type);
    if (actions.includes('movement') || actions.includes('flying')) return 'fly-across';
    return 'idle-margin';
  }

  tick(dt, ctx, elapsed) {
    // Spawn scheduled sprites
    while (this.schedule.length && this.schedule[0].at < elapsed) {
      const evt = this.schedule.shift();
      this.sprites.push(new ActiveSprite(this.engine.canvas, evt.name, evt.behavior, null));
    }

    // Update + draw
    this.sprites = this.sprites.filter(s => !s.dead);
    for (const s of this.sprites) {
      s.tick(dt, elapsed);
      s.draw(ctx, elapsed);
    }
  }

  // Manually trigger a sprite burst at a position (e.g., on word click)
  burst(spriteName, x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      const s = new ActiveSprite(this.engine.canvas, spriteName, 'drift', null);
      s.x = x; s.y = y;
      s.vx = (Math.random() - 0.5) * 3;
      s.vy = (Math.random() - 0.5) * 3;
      s.alpha = 1;
      // Mark for removal after 2s
      setTimeout(() => { s.dead = true; }, 2000);
      this.sprites.push(s);
    }
  }
}

// ── Glow nearby words (shared DOM helper) ────────────────────────────────────

function glowNearbyWords(wordEl, color, radius, duration) {
  const allWords = [...document.querySelectorAll('.word')];
  const rect = wordEl.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  allWords.forEach(w => {
    if (w === wordEl) return;
    const r  = w.getBoundingClientRect();
    const wx = r.left + r.width  / 2;
    const wy = r.top  + r.height / 2;
    const d  = Math.sqrt((wx - cx) ** 2 + (wy - cy) ** 2);
    if (d >= radius) return;
    const a = 1 - d / radius;
    w.style.transition = 'color 0.25s, text-shadow 0.25s';
    w.style.color = color;
    w.style.textShadow = `0 0 ${Math.round(8 * a)}px ${color}`;
    setTimeout(() => {
      w.style.transition = 'color 0.7s, text-shadow 0.7s';
      w.style.color = '';
      w.style.textShadow = '';
    }, duration);
  });
}

// ── Fire scatter — letters ignite and fall with gravity ───────────────────────

function fireScatterWord(wordEl) {
  const letters = [...wordEl.querySelectorAll('.letter')];
  if (!letters.length) return;

  letters.forEach(l => letterPhysics.freeze(l));

  // Ignite: flash red/orange
  requestAnimationFrame(() => {
    letters.forEach(l => {
      l.style.transition  = 'color 0.12s, text-shadow 0.12s';
      l.style.color       = '#FF5500';
      l.style.textShadow  = '0 0 8px #FF8800, 0 0 18px #FF4400';
    });
  });

  // Fall down with gravity + staggered delay
  setTimeout(() => {
    letters.forEach((l, i) => {
      const lag = i * 18;
      const dx  = (Math.random() - 0.5) * 55;
      const dy  = 85 + Math.random() * 105;
      const rot = (Math.random() - 0.5) * 75;
      l.style.transition = `transform 1.0s cubic-bezier(0.25,0,0.8,0.3) ${lag}ms, opacity 0.6s ${lag + 180}ms`;
      l.style.transform  = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
      l.style.opacity    = '0';
    });
  }, 170);

  // Restore — rise back up
  setTimeout(() => {
    letters.forEach(l => {
      l.style.transition = 'transform 1.2s cubic-bezier(0.18,1,0.3,1), opacity 0.9s, color 0.5s, text-shadow 0.5s';
      l.style.transform  = '';
      l.style.opacity    = '1';
      l.style.color      = '';
      l.style.textShadow = '';
    });
    setTimeout(() => {
      letters.forEach(l => { l.style.transition = ''; letterPhysics.unfreeze(l); });
    }, 1300);
  }, 2300);
}

// ── LetterScatter ─────────────────────────────────────────────────────────────
// Works with pre-existing .letter children (created by text.js).
// Freezes physics during the CSS transition so they don't fight each other.

function scatterWord(wordEl) {
  // Letters are already wrapped by text.js
  const letters = [...wordEl.querySelectorAll('.letter')];
  if (!letters.length) return;

  // Pause physics for these letters
  letters.forEach(l => letterPhysics.freeze(l));

  // Scatter outward
  requestAnimationFrame(() => {
    letters.forEach(l => {
      const dx  = (Math.random() - 0.5) * 140;
      const dy  = (Math.random() - 0.5) * 90 - 30;
      const rot = (Math.random() - 0.5) * 70;
      l.style.transition = 'transform 0.45s cubic-bezier(.2,1.6,.5,1), opacity 0.35s';
      l.style.transform  = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
      l.style.opacity    = '0';
    });
  });

  // Reassemble
  setTimeout(() => {
    letters.forEach(l => {
      l.style.transition = 'transform 1.1s cubic-bezier(.18,1,.3,1), opacity 0.75s';
      l.style.transform  = '';
      l.style.opacity    = '1';
    });

    // Hand back to physics after CSS transition finishes
    setTimeout(() => {
      letters.forEach(l => {
        l.style.transition = '';
        letterPhysics.unfreeze(l);
      });
    }, 1500);
  }, 600);
}
