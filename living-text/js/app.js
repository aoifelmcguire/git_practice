// app.js — main controller: API call, orchestration, default text

// ── Default example text (original, evocative) ────────────────────────────────
const DEFAULT_TEXT = `The Wolf at the Edge of Winter

A wolf moves through the dark pines,
gray as the morning frost,
her breath rising in small clouds
that vanish before they reach the sky.

The snow has settled on everything —
on the black branches, on the frozen creek,
on the stones that line the hillside
where the deer once gathered.

She stops. Listens.
The forest holds its breath.

Then, with one leap,
she is gone —
just a shadow dissolving
into the white field beyond.

Only her pawprints remain,
a dotted line of questions
leading somewhere the eye cannot follow.`;

// ── Fallback narrative map (used when no API key / API fails) ─────────────────
const FALLBACK_WOLF_MAP = {
  entities: [
    { name: 'wolf', type: 'animal', sprite: 'wolf', count: 1 },
    { name: 'deer', type: 'animal', sprite: 'wolf', count: 1 },
    { name: 'snow', type: 'weather', sprite: 'snowflake', count: 1 },
  ],
  actions: [
    { word: 'leap',       type: 'impact',   intensity: 'high' },
    { word: 'dissolving', type: 'settle',   intensity: 'low' },
    { word: 'vanish',     type: 'settle',   intensity: 'low' },
    { word: 'moves',      type: 'movement', intensity: 'medium' },
  ],
  environment: { setting: 'dark forest', time: 'dawn', season: 'winter', description: 'snow-covered pine forest at dawn' },
  tone:        { primary: 'melancholic', secondary: 'tense', energy: 0.35 },
  palette: {
    background: '#0d1520',
    text:       '#e0ddd8',
    accent:     '#8ab4cc',
    particle:   'rgba(180,210,240,0.5)',
  },
  particles:  { type: 'snow', density: 0.4, speed: 0.3 },
  keyMoments: [
    { phrase: 'the forest holds its breath', effect: 'glow', intensity: 'gentle' },
    { phrase: 'just a shadow dissolving',    effect: 'fade', intensity: 'soft' },
  ],
  interactiveWords: [
    { word: 'wolf',       entity: 'wolf',   effect: 'hover-cursor' },
    { word: 'deer',       entity: 'wolf',   effect: 'hover-cursor' },
    { word: 'snow',       entity: 'snow',   effect: 'settle' },
    { word: 'leap',       entity: null,     effect: 'scatter-letters' },
    { word: 'dissolving', entity: null,     effect: 'shadow-fade' },
    { word: 'vanish',     entity: null,     effect: 'shadow-fade' },
    { word: 'shadow',     entity: null,     effect: 'shadow-fade' },
    { word: 'pines',      entity: 'leaf',   effect: 'hover-cursor' },
    { word: 'pawprints',  entity: null,     effect: 'scatter-letters' },
    { word: 'breath',     entity: null,     effect: 'water-flow' },
    { word: 'frost',      entity: null,     effect: 'water-flow' },
  ],
};

// ── API ────────────────────────────────────────────────────────────────────────

async function callClaude(text, apiKey) {
  const systemPrompt = `You are a narrative analysis engine for an interactive text animation app.
Analyse the provided text and return ONLY a valid JSON object — no markdown, no commentary.

Return this exact structure:
{
  "entities": [
    { "name": "entity name (lower case)", "type": "animal|person|object|weather", "sprite": "goose|bird|wolf|fox|dragon|flower|leaf|snowflake|firefly|star|raindrop", "count": 1 }
  ],
  "actions": [
    { "word": "exact word from text", "type": "movement|impact|settle|bloom|flight", "intensity": "low|medium|high" }
  ],
  "environment": {
    "setting": "brief description",
    "time": "day|night|dawn|dusk",
    "season": "spring|summer|autumn|winter|none",
    "description": "one sentence visual description"
  },
  "tone": { "primary": "one word", "secondary": "one word", "energy": 0.0 },
  "palette": {
    "background": "#rrggbb",
    "text": "#rrggbb",
    "accent": "#rrggbb",
    "particle": "rgba(r,g,b,0.5)"
  },
  "particles": { "type": "leaf|snow|firefly|star|rain|none", "density": 0.3, "speed": 0.3 },
  "keyMoments": [
    { "phrase": "exact phrase from text", "effect": "glow|bloom|fade|pulse", "intensity": "gentle|medium|strong" }
  ],
  "interactiveWords": [
    { "word": "exact word from text (lower case)", "entity": "entity name or null", "effect": "hover-cursor|scatter-letters|settle|drift-creature|fire-breath|water-flow|bloom-grow|shadow-fade" }
  ]
}

Rules:
- palette.background should match the mood/setting (dark for night/winter, warm for day/summer etc.)
- palette.text must have sufficient contrast against background
- particles.type should match the environment (snow for winter, leaf for autumn/forest, firefly for night)
- interactiveWords: include all animals/creatures with "hover-cursor", dramatic action verbs with "scatter-letters", stillness words with "settle"
- interactiveWords: fire/flame/burn/blaze words get "fire-breath"; water/rain/river/flood words get "water-flow"; bloom/flower/petal/spring words get "bloom-grow"; shadow/dark/fade/vanish/ghost words get "shadow-fade"
- entities: include up to 5 most visually interesting entities
- interactiveWords: include up to 14 words
- keyMoments: include up to 3 most evocative phrases`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            apiKey,
      'anthropic-version':    '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-5-20250514',
      max_tokens: 1500,
      system:     systemPrompt,
      messages: [{ role: 'user', content: `Analyse this text:\n\n${text}` }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';

  // Strip any accidental markdown fences
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt to extract JSON from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse narrative map from response');
  }
}

// ── Main App ──────────────────────────────────────────────────────────────────

class LivingTextApp {
  constructor() {
    // Canvas engine
    this.canvas  = document.getElementById('main-canvas');
    this.engine  = new AnimationEngine(this.canvas);
    window._livingTextEngine = this.engine;

    // Text engine (render + interactions)
    this.textEl  = document.getElementById('text-display');
    this.textEng = new TextEngine(this.textEl, this.engine);

    // Pixel editor
    const edCanvas = document.getElementById('editor-canvas');
    this.editor  = new PixelArtEditor(edCanvas, { size: 16 });
    this.editorUI = new EditorUI(this.editor);
    window._editorInstance = this.editor;

    this.currentText = '';
    this.currentMap  = null;

    this._bindUI();
    this._loadApiKey();
    this.engine.start();
  }

  _bindUI() {
    // Animate button
    document.getElementById('animate-btn').addEventListener('click', () => this._animate());

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => this._showInput());

    // Remix buttons
    ['remix-btn', 'remix-display-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => this._remix());
    });

    // File upload
    document.getElementById('file-upload').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('text-input').value = ev.target.result;
      };
      reader.readAsText(file);
    });

    // API key save
    document.getElementById('save-key-btn').addEventListener('click', () => this._saveApiKey());
    document.getElementById('api-key-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._saveApiKey();
    });
  }

  _loadApiKey() {
    const key = localStorage.getItem('lt_api_key');
    if (key) {
      document.getElementById('api-key-input').value = key;
      document.getElementById('key-status').textContent = '✓ saved';
    }
  }

  _saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
      localStorage.setItem('lt_api_key', key);
      document.getElementById('key-status').textContent = '✓ saved';
      setTimeout(() => { document.getElementById('key-status').textContent = ''; }, 2000);
    }
  }

  async _animate() {
    let text = document.getElementById('text-input').value.trim();
    if (!text) text = DEFAULT_TEXT;
    this.currentText = text;

    this._showLoading(true);
    document.getElementById('error-msg').hidden = true;

    const apiKey = localStorage.getItem('lt_api_key') || document.getElementById('api-key-input').value.trim();

    let map;
    if (apiKey) {
      this._setLoadingText('Analysing the narrative…');
      try {
        map = await callClaude(text, apiKey);
      } catch (err) {
        console.warn('API call failed, using fallback:', err.message);
        const errEl = document.getElementById('error-msg');
        errEl.textContent = `API note: ${err.message}. Using built-in animation for demo.`;
        errEl.hidden = false;
        map = this._buildFallbackMap(text);
      }
    } else {
      // No API key — use smart fallback based on text content
      map = this._buildFallbackMap(text);
    }

    this.currentMap = map;
    this._setLoadingText('Bringing it to life…');
    await this._sleep(400);

    this._showLoading(false);
    this._showDisplay(text, map);
  }

  async _remix() {
    if (!this.currentText) return;
    this.currentMap = null;
    this._showInput();
    await this._sleep(100);
    document.getElementById('text-input').value = this.currentText;
    // Vary the seed slightly for remixed animations
    await this._animate();
  }

  _showDisplay(text, map) {
    document.getElementById('input-panel').hidden = true;
    document.getElementById('display-panel').hidden = false;

    // Set title from first line of text
    const firstLine = text.split('\n')[0].trim();
    document.getElementById('display-title').textContent = firstLine;

    // Apply narrative + render text + start letter physics
    this.engine.applyNarrative(map);
    this.engine.cursor.setPrimary(this._pickCursorSprite(map));
    this.textEng.render(text, map);
    this.textEng.startPhysics();

    // Show remix button
    document.getElementById('remix-btn').hidden = false;
  }

  _showInput() {
    document.getElementById('display-panel').hidden = true;
    document.getElementById('input-panel').hidden = false;
    // Close editor if open
    const edPanel = document.getElementById('editor-panel');
    if (edPanel) { edPanel.classList.remove('open'); setTimeout(() => { edPanel.hidden = true; }, 300); }
    // Reset theme on return
    document.documentElement.style.removeProperty('--bg');
    document.documentElement.style.removeProperty('--text');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--particle');
    document.documentElement.style.removeProperty('--glow');
    // Stop letter physics
    letterPhysics.stop();
    // Reset canvas engine
    this.engine.particles.particles = [];
    this.engine.sprites.sprites = [];
    this.engine.cursor.clearPrimary();
  }

  _showLoading(show) {
    document.getElementById('loading-state').hidden = !show;
    document.getElementById('animate-btn').disabled = show;
  }

  _setLoadingText(msg) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = msg;
  }

  // Smart fallback map based on keyword detection in text.
  _buildFallbackMap(text) {
    const lower = text.toLowerCase();
    if (!localStorage.getItem('lt_api_key')) {
      // If it looks like the default wolf text, use the pre-built map
      if (lower.includes('wolf') || lower.includes('pine') || lower.includes('snow')) {
        return FALLBACK_WOLF_MAP;
      }
    }
    return this._detectFromText(text);
  }

  _detectFromText(text) {
    const lower = text.toLowerCase();

    // Entity detection
    const entityKeywords = {
      wolf:      'wolf',  wolves: 'wolf',
      fox:       'fox',   foxes:  'fox',
      goose:     'goose', geese:  'goose',
      bird:      'bird',  birds:  'bird',
      sparrow:   'bird',  crow:   'bird',
      dragon:    'dragon',
      deer:      'wolf',  elk:    'wolf',
      cat:       'fox',   cats:   'fox',
      flower:    'flower', flowers: 'flower', rose: 'flower',
      leaf:      'leaf',   leaves: 'leaf',
    };
    const particleKeywords = {
      snow: 'snow', snowing: 'snow', snowflakes: 'snow', frost: 'snow', ice: 'snow',
      rain: 'rain', raining: 'rain', drizzle: 'rain',
      leaves: 'leaf', autumn: 'leaf', fall: 'leaf',
      stars: 'star', night: 'star', dark: 'firefly',
      fireflies: 'firefly', glowing: 'firefly',
    };

    const entities = [];
    const seenSprites = new Set();
    Object.entries(entityKeywords).forEach(([kw, sprite]) => {
      if (lower.includes(kw) && !seenSprites.has(sprite)) {
        seenSprites.add(sprite);
        entities.push({ name: kw, type: 'animal', sprite, count: 1 });
      }
    });

    let particleType = 'star';
    Object.entries(particleKeywords).forEach(([kw, pt]) => {
      if (lower.includes(kw)) particleType = pt;
    });

    // Palette detection
    const isNight   = /night|dark|moon|stars|midnight/.test(lower);
    const isWinter  = /snow|frost|ice|cold|winter/.test(lower);
    const isAutumn  = /autumn|fall|orange|harvest|leaves/.test(lower);
    const isSpring  = /spring|bloom|blossom|flower|green/.test(lower);
    const isSummer  = /summer|sun|warm|golden|bright/.test(lower);

    let bg = '#0d1520', accent = '#8ab4cc', particle = 'rgba(180,210,240,0.5)';
    if (isNight)   { bg = '#080812'; accent = '#8888cc'; particle = 'rgba(140,140,220,0.5)'; }
    if (isWinter)  { bg = '#0d1520'; accent = '#aaccdd'; particle = 'rgba(180,210,240,0.5)'; }
    if (isAutumn)  { bg = '#1a0f05'; accent = '#d4804a'; particle = 'rgba(210,130,60,0.5)'; }
    if (isSpring)  { bg = '#0a1a0a'; accent = '#88cc88'; particle = 'rgba(120,200,120,0.5)'; }
    if (isSummer)  { bg = '#0d1205'; accent = '#c8d860'; particle = 'rgba(200,220,100,0.5)'; }

    // Action word detection
    const impactWords   = ['explodes', 'explode', 'burst', 'crash', 'shatter', 'breaks', 'snap', 'leap', 'leaps', 'jump', 'shock'];
    const settleWords   = ['settles', 'settle', 'still', 'quiet', 'silent', 'sleep', 'rest', 'drift', 'fades', 'vanish', 'dissolving'];
    const movementWords = ['flies', 'fly', 'soars', 'runs', 'moves', 'racing', 'rushing', 'drifts', 'flows', 'swims'];

    const actions = [];
    [...impactWords, ...settleWords, ...movementWords].forEach(w => {
      if (lower.includes(w)) {
        const type = impactWords.includes(w) ? 'impact' : settleWords.includes(w) ? 'settle' : 'movement';
        actions.push({ word: w, type, intensity: 'medium' });
      }
    });

    // Interactive words
    const interactiveWords = [];
    entities.forEach(ent => {
      interactiveWords.push({ word: ent.name, entity: ent.name, effect: 'hover-cursor' });
    });
    actions.slice(0, 6).forEach(act => {
      interactiveWords.push({
        word: act.word,
        entity: null,
        effect: act.type === 'impact' ? 'scatter-letters' : act.type === 'settle' ? 'settle' : 'drift-creature',
      });
    });

    return {
      entities,
      actions,
      environment: { setting: 'natural landscape', time: isNight ? 'night' : 'day', season: isWinter ? 'winter' : isAutumn ? 'autumn' : isSpring ? 'spring' : 'none', description: '' },
      tone: { primary: 'evocative', secondary: 'natural', energy: 0.4 },
      palette: { background: bg, text: '#e4e0da', accent, particle },
      particles: { type: particleType, density: 0.35, speed: 0.3 },
      keyMoments: [],
      interactiveWords,
    };
  }

  // Pick the best cursor creature sprite based on the narrative entities.
  _pickCursorSprite(map) {
    const entities = map?.entities || [];
    if (!entities.length) return null;
    for (const ent of entities) {
      const sp = spriteRenderer.bestCursorSprite(ent.name);
      if (sp) return sp;
    }
    for (const ent of entities) {
      const sp = spriteRenderer.bestSprite(ent.name);
      if (sp) return sp;
    }
    return null;
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const app = new LivingTextApp();
  window._livingTextApp = app;

  // Keyboard shortcut: Enter in textarea triggers animate
  document.getElementById('text-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      app._animate();
    }
  });
});
