// text.js — text parsing, letter-level DOM wrapping, physics integration, interactions

class TextEngine {
  constructor(displayEl, engine) {
    this.display  = displayEl;
    this.engine   = engine;
    this.map      = null;
    this._wordEls = new Map();
  }

  // ── Main render ────────────────────────────────────────────────
  render(rawText, narrativeMap) {
    this.map = narrativeMap;
    this._wordEls.clear();
    this.display.innerHTML = '';

    // Stop any running physics before rebuilding DOM
    letterPhysics.stop();

    const interactiveMap     = this._buildInteractiveMap(narrativeMap);
    const keyMomentPhrases   = (narrativeMap?.keyMoments || []).map(k => k.phrase.toLowerCase());

    this._applyTheme(narrativeMap);

    // Split on blank lines → stanzas / paragraphs
    const stanzas  = rawText.split(/\n{2,}/);
    const fragment = document.createDocumentFragment();

    stanzas.forEach((stanza, si) => {
      const stanzaEl = document.createElement('p');
      stanzaEl.className = 'stanza';

      stanza.split('\n').forEach((line, li) => {
        if (li > 0) stanzaEl.appendChild(document.createElement('br'));
        this._renderLine(line, stanzaEl, interactiveMap, keyMomentPhrases);
      });

      fragment.appendChild(stanzaEl);

      if (si < stanzas.length - 1) {
        const br = document.createElement('span');
        br.className = 'stanza-break';
        fragment.appendChild(br);
      }
    });

    this.display.appendChild(fragment);

    // Fade in
    this.display.style.opacity = '0';
    this.display.style.transition = 'opacity 0.7s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.display.style.opacity = '1';
    }));
    // Physics is started explicitly by the caller via startPhysics()
  }

  // Call this after render() — kicks off the letter physics simulation.
  // Uses setTimeout so the browser has finished layout before we record positions.
  startPhysics() {
    setTimeout(() => {
      const allLetters = [...this.display.querySelectorAll('.letter')];
      if (!allLetters.length) return;
      letterPhysics.setContainer(this.display);
      letterPhysics.registerAll(allLetters);
      letterPhysics.start();
    }, 80);
  }

  // ── Render one line of text ─────────────────────────────────────
  _renderLine(line, parent, interactiveMap, keyMomentPhrases) {
    // Tokenise into [word, space, word, space, ...]
    const tokens = line.split(/(\s+)/);

    for (const token of tokens) {
      if (!token) continue;

      if (/^\s+$/.test(token)) {
        // Space between words — each space character gets its own letter span
        // so the physics field moves whitespace too (true parting effect)
        for (const ch of token) {
          parent.appendChild(this._makeSpaceLetter(ch));
        }
        continue;
      }

      // Word token
      const wordKey   = token.toLowerCase().replace(/[^a-z]/g, '');
      const interactive = wordKey ? interactiveMap.get(wordKey) : null;

      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      wordSpan.dataset.word = wordKey;

      if (interactive) {
        wordSpan.dataset.interactive = '1';
        wordSpan.dataset.type   = interactive.type;
        wordSpan.dataset.entity = interactive.entity || '';
        wordSpan.dataset.effect = interactive.effect || '';
        this._attachInteraction(wordSpan, interactive);
        if (!this._wordEls.has(wordKey)) this._wordEls.set(wordKey, []);
        this._wordEls.get(wordKey).push(wordSpan);
      }

      // Key-moment glow
      if (keyMomentPhrases.some(p => p.startsWith(token.toLowerCase()))) {
        wordSpan.classList.add('key-moment');
      }

      // Wrap every character — including punctuation — in a .letter span
      for (const ch of token) {
        wordSpan.appendChild(this._makeCharLetter(ch));
      }

      parent.appendChild(wordSpan);
    }
  }

  _makeCharLetter(ch) {
    const s = document.createElement('span');
    s.className = 'letter';
    s.textContent = ch;
    return s;
  }

  _makeSpaceLetter(ch) {
    const s = document.createElement('span');
    s.className = 'letter letter-space';
    // Use NBSP so inline-block spans render with visible width
    s.textContent = ' ';
    return s;
  }

  // ── Interactive word map ────────────────────────────────────────
  _buildInteractiveMap(map) {
    const result = new Map();
    if (!map) return result;

    // Explicit interactive words from Claude's analysis
    (map.interactiveWords || []).forEach(iw => {
      const key = iw.word.toLowerCase().replace(/[^a-z]/g, '');
      result.set(key, {
        type:       this._classifyEffect(iw.effect, iw),
        effect:     iw.effect,
        entity:     iw.entity,
        spriteName: iw.entity
          ? (spriteRenderer.bestSprite(iw.entity) || spriteRenderer.bestSprite(iw.word))
          : null,
      });
    });

    // Auto-register entity names
    (map.entities || []).forEach(ent => {
      ent.name.toLowerCase().split(' ').forEach(w => {
        const key = w.replace(/[^a-z]/g, '');
        if (!key || result.has(key)) return;
        const sp = spriteRenderer.bestSprite(ent.name);
        result.set(key, { type: 'animal', effect: 'hover-cursor', entity: ent.name, spriteName: sp });
      });
    });

    // Auto-register action words
    (map.actions || []).forEach(act => {
      const key = act.word.toLowerCase().replace(/[^a-z]/g, '');
      if (!key || result.has(key)) return;
      result.set(key, {
        type:       this._classifyEffect(null, act),
        effect:     act.type === 'impact' ? 'scatter-letters' : 'drift-creature',
        entity:     null,
        spriteName: null,
      });
    });

    return result;
  }

  _classifyEffect(effectStr, item) {
    const e = (effectStr || '').toLowerCase();
    const t = (item?.type || '').toLowerCase();
    // Specific elemental effects (checked first — more specific than generic)
    if (/fire.breath|fire|flame|burn|blaze|ignite|scorch|ember|inferno/.test(e + t)) return 'fire';
    if (/water.flow|water|rain|river|flood|wave|drown|ocean|stream/.test(e + t))     return 'water';
    if (/bloom.grow|petal|blossom|spring.grow|garden/.test(e + t))                   return 'bloom';
    if (/shadow.fade|shadow|darkness|shade|ghost|disappear/.test(e + t))             return 'shadow';
    // Generic effects
    if (/scatter|explod|burst|impact|shatter/.test(e + t)) return 'impact';
    if (/settle|still|gather|collect|rest/.test(e + t))    return 'settle';
    if (/hover|cursor|trail/.test(e))                      return 'animal';
    if (/drift|fly|float|movement|flying/.test(e + t))     return 'movement';
    if (/bloom|glow|light/.test(e + t))                    return 'bloom';
    if (/animal|creature|entity/.test(t))                  return 'animal';
    return 'interactive';
  }

  // ── Word-level interactions ─────────────────────────────────────
  _attachInteraction(span, interactive) {
    const eng = this.engine;

    // Animal / cursor-trail words: hover changes cursor sprite
    if (interactive.effect === 'hover-cursor' || interactive.type === 'animal') {
      span.addEventListener('mouseenter', () => {
        if (interactive.spriteName) eng.cursor.useSpriteFor(interactive.spriteName);
        // Spawn a quick fly-across burst near this word
        if (interactive.spriteName) {
          setTimeout(() => {
            const r = span.getBoundingClientRect();
            eng.sprites.burst(interactive.spriteName, r.left + r.width / 2, r.top + r.height / 2, 1);
          }, 200);
        }
      });
      span.addEventListener('mouseleave', () => eng.cursor.resetSprite());
      span.addEventListener('touchstart', () => {
        if (interactive.spriteName) eng.cursor.useSpriteFor(interactive.spriteName);
      }, { passive: true });
    }

    // Impact / scatter words: click explodes letters
    if (interactive.effect === 'scatter-letters' || interactive.type === 'impact') {
      span.addEventListener('click', () => {
        scatterWord(span);
        const r   = span.getBoundingClientRect();
        const cx  = r.left + r.width / 2;
        const cy  = r.top  + r.height / 2;
        eng.particles.addSettling(span, 3);
        const sp = interactive.spriteName || 'star';
        if (SPRITE_DATA[sp]) eng.sprites.burst(sp, cx, cy, 3);
      });
    }

    // Settle words: hover attracts ambient particles
    if (interactive.type === 'settle') {
      span.addEventListener('mouseenter', () => eng.particles.addSettling(span, 5));
    }

    // Movement words: trigger a fly-across near this word
    if (interactive.type === 'movement' || interactive.effect === 'drift-creature') {
      span.addEventListener('mouseenter', () => {
        const r  = span.getBoundingClientRect();
        const sp = interactive.spriteName || 'bird';
        if (!SPRITE_DATA[sp]) return;
        const s = new ActiveSprite(eng.canvas, sp, 'fly-across', null);
        s.y   = r.top + r.height / 2;
        s.x   = r.left < window.innerWidth / 2 ? -20 : window.innerWidth + 20;
        s.vx  = s.x < 0 ? 1.5 : -1.5;
        s.flipH = s.x > 0;
        eng.sprites.sprites.push(s);
      });
    }

    // Fire words: cursor breathes fire, text glows/falls
    if (interactive.type === 'fire') {
      span.addEventListener('mouseenter', () => {
        eng.cursor.triggerEffect('fire', 2800);
        span.style.transition  = 'color 0.12s, text-shadow 0.12s';
        span.style.color       = '#FF6600';
        span.style.textShadow  = '0 0 10px #FF8800, 0 0 22px #FF4400';
        glowNearbyWords(span, '#FF6600', 130, 2000);
      });
      span.addEventListener('mouseleave', () => {
        span.style.transition = 'color 0.6s, text-shadow 0.6s';
        span.style.color = '';
        span.style.textShadow = '';
      });
      span.addEventListener('click', () => fireScatterWord(span));
    }

    // Water words: ripple cursor effect + cool blue tint
    if (interactive.type === 'water') {
      span.addEventListener('mouseenter', () => {
        eng.cursor.triggerEffect('water', 2200);
        span.style.transition = 'color 0.2s, text-shadow 0.2s';
        span.style.color      = '#88BBEE';
        span.style.textShadow = '0 0 8px #6699CC';
        glowNearbyWords(span, '#6699CC', 100, 1800);
      });
      span.addEventListener('mouseleave', () => {
        span.style.transition = 'color 0.7s, text-shadow 0.7s';
        span.style.color = '';
        span.style.textShadow = '';
      });
    }

    // Bloom words: petals burst from cursor + pink/green glow
    if (interactive.type === 'bloom') {
      span.addEventListener('mouseenter', () => {
        eng.cursor.triggerEffect('bloom', 2500);
        span.style.transition = 'color 0.2s, text-shadow 0.2s';
        span.style.color      = '#FFAACC';
        span.style.textShadow = '0 0 10px #FF88BB';
        glowNearbyWords(span, '#FFAACC', 110, 2000);
        eng.particles.addSettling(span, 4);
      });
      span.addEventListener('mouseleave', () => {
        span.style.transition = 'color 0.6s, text-shadow 0.6s';
        span.style.color = '';
        span.style.textShadow = '';
      });
    }

    // Shadow words: dark smoke cursor + text dims
    if (interactive.type === 'shadow') {
      span.addEventListener('mouseenter', () => {
        eng.cursor.triggerEffect('shadow', 2200);
        span.style.transition = 'color 0.2s, opacity 0.2s';
        span.style.color   = '#888888';
        span.style.opacity = '0.45';
        glowNearbyWords(span, '#444444', 90, 1600);
      });
      span.addEventListener('mouseleave', () => {
        span.style.transition = 'color 0.6s, opacity 0.5s';
        span.style.color   = '';
        span.style.opacity = '';
      });
    }
  }

  // ── Theme ───────────────────────────────────────────────────────
  _applyTheme(map) {
    if (!map?.palette) return;
    const r = document.documentElement.style;
    const p = map.palette;
    if (p.background) r.setProperty('--bg', p.background);
    if (p.text)       r.setProperty('--text', p.text);
    if (p.accent)     r.setProperty('--accent', p.accent);
    if (p.particle)   r.setProperty('--particle', p.particle);
    if (p.accent) {
      const hex = p.accent.replace('#', '');
      const rgb = [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
      r.setProperty('--glow', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.18)`);
    }
  }

  getWordEls(word) {
    return this._wordEls.get(word.toLowerCase()) || [];
  }
}
