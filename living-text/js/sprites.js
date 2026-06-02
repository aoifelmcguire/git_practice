// sprites.js — pixel art sprite definitions and renderer
// Each sprite is an array of strings; chars map to colours via palette.
// '.' = transparent.

const SPRITE_PALETTE = {
  '.': null,
  W: '#FFFFFF', w: '#E8E8E8', X: '#D0D0D0',
  B: '#111111', b: '#333333', G: '#888888', g: '#BBBBBB',
  O: '#FF6600', o: '#FF9933', K: '#FF8C00', k: '#FFB347',
  Y: '#FFDD00', y: '#FFEE88',
  R: '#CC2200', r: '#EE4422',
  N: '#5C3317', n: '#8B4513', J: '#A0522D',
  F: '#1A6B1A', f: '#2D9B2D', e: '#55BB55', E: '#88DD88',
  S: '#1E4080', s: '#6699CC', T: '#004466', t: '#336688',
  P: '#6B2FA0', p: '#9B59B6',
  C: '#00CCCC', c: '#66DDDD',
  L: '#FFAAFF', l: '#FFCCFF',
  Z: '#AAFFAA',
  M: '#FF6699',
};

const SPRITE_DATA = {

  // ── Goose ───────────────────────────────────────────────────────────────────
  goose: {
    size: 16,
    frames: [
      // wings level
      ['................',
       '........WW......',
       '.......WwBW.....',
       '.......WWWWW....',
       '........WWWWWW..',
       '........WWWWWWWW',
       'WWWWWWWWWWWWWWW.',
       '.WWWWWWWWWWWWWW.',
       '..WWWWWWWWWWWW..',
       '...WWWWWWWWWW...',
       '....WWWWWWWW....',
       '.....OO..OO.....',
       '.....OO..OO.....',
       '....OOOO.OOOO...',
       '................',
       '................'],
      // wings up
      ['....WWWWWWW.....',
       '...WWWWWWWWWW...',
       '.......WwBW.....',
       '.......WWWWW....',
       '........WWWWWW..',
       '.........WWWWWWW',
       '..........WWWWWW',
       '.........WWWWWWW',
       '........WWWWWW..',
       '.......WWWWWW...',
       '......WWWWWWW...',
       '.....OO..OO.....',
       '.....OO..OO.....',
       '....OOOO.OOOO...',
       '................',
       '................'],
    ],
  },

  // ── Bird (sparrow/small) ────────────────────────────────────────────────────
  bird: {
    size: 12,
    frames: [
      // wings mid
      ['............',
       '.....GGG....',
       '....GBgGG...',
       '....GGGGGGG.',
       'GGGGGGGGGGG.',
       '.GGGGGGGGGG.',
       '..GGGGGGGGG.',
       '....GGGGGGG.',
       '.....GGG.GG.',
       '......G...G.',
       '............',
       '............'],
      // wings up
      ['..GGGGGG....',
       '.GGGGGGGG...',
       '....GBgGG...',
       '....GGGGGGG.',
       '.....GGGGGGG',
       '......GGGGG.',
       '.......GGGG.',
       '........GGG.',
       '.....GGG.GG.',
       '......G...G.',
       '............',
       '............'],
    ],
  },

  // ── Fox ─────────────────────────────────────────────────────────────────────
  fox: {
    size: 16,
    frames: [
      // stand
      ['................',
       '.......OO.......',
       '......OBBO......',
       '......oooo......',
       '.....ooWoooo....',
       '....noooooonn...',
       '....nooooooonn..',
       '.....nooooonn...',
       '......noooon....',
       '.......noon.....',
       '......n..n......',
       '.....nN..nN.....',
       '....nN....nN....',
       '................',
       '................',
       '................'],
      // trot
      ['................',
       '.......OO.......',
       '......OBBO......',
       '......oooo......',
       '.....ooWoooo....',
       '....noooooonn...',
       '....nooooooonn..',
       '.....nooooonn...',
       '......noooon....',
       '.......noon.....',
       '......n..n......',
       '......N..n......',
       '......N..nN.....',
       '................',
       '................',
       '................'],
    ],
  },

  // ── Wolf ────────────────────────────────────────────────────────────────────
  wolf: {
    size: 16,
    frames: [
      ['................',
       '.....GGG........',
       '....GBgBGG......',
       '....GGGGGG......',
       '....GGWWGGGG....',
       '...GGGGGGGgGG...',
       '....GGGGGGgGG...',
       '.....GGgGGGG....',
       '......GGGG......',
       '.....GGGGGG.....',
       '....GG....GG....',
       '....G......G....',
       '................',
       '................',
       '................',
       '................'],
      ['................',
       '.....GGG........',
       '....GBgBGG......',
       '....GGGGGG......',
       '....GGWWGGGG....',
       '...GGGGGGGgGG...',
       '....GGGGGGgGG...',
       '.....GGgGGGG....',
       '......GGGG......',
       '.....GGGGGG.....',
       '...GG......GG...',
       '..GG........GG..',
       '................',
       '................',
       '................',
       '................'],
    ],
  },

  // ── Dragon (cursor trail head) ───────────────────────────────────────────────
  dragon: {
    size: 12,
    frames: [
      ['....FFFF....',
       '...FFFFfF...',
       '..FFfYFFFFF.',
       '.FFFFFFFFFf.',
       '.FFFfFFFFFf.',
       '..FFFFFFFf..',
       '...FFFFF....',
       '....FFF.....',
       '....FF......',
       '...FF.......',
       '..FF........',
       '............'],
      ['...FFFFF....',
       '..FFFFFfF...',
       '.FFfYFFFFF..',
       'FFFFFFFFFFf.',
       '.FFFfFFFFf..',
       '..FFFFFFf...',
       '...FFFFF....',
       '....FFF.....',
       '.....FF.....',
       '....FF......',
       '...FF.......',
       '............'],
    ],
  },

  // ── Dragon body segment ─────────────────────────────────────────────────────
  dragon_body: {
    size: 8,
    frames: [
      ['..FFFF..',
       '.FFfFFF.',
       'FFFfFFFf',
       'FFFFFFff',
       '.FFFFff.',
       '..FFFF..',
       '...FF...',
       '........'],
    ],
  },

  // ── Flower ──────────────────────────────────────────────────────────────────
  flower: {
    size: 12,
    frames: [
      // bud
      ['............',
       '......f.....',
       '.....fff....',
       '.....fFf....',
       '......f.....',
       '......f.....',
       '......f.....',
       '.....fff....',
       '............',
       '............',
       '............',
       '............'],
      // bloom
      ['....Y..Y....',
       '...YYkYY....',
       '..YYkkkYY...',
       '...YYkYY....',
       '....Y..Y....',
       '......f.....',
       '......f.....',
       '.....fff....',
       '............',
       '............',
       '............',
       '............'],
    ],
  },

  // ── Leaf ────────────────────────────────────────────────────────────────────
  leaf: {
    size: 10,
    frames: [
      ['..........', '....f.....',
       '...fFf....', '..fFFFf...',
       '.fFFFFFf..', '..fFFFf...',
       '...fFf....', '....f.....',
       '....N.....', '..........'],
    ],
  },

  // ── Snow / flake ─────────────────────────────────────────────────────────────
  snowflake: {
    size: 8,
    frames: [
      ['...W....', '...W....',
       'WWWWWWWW', '...W....',
       '...W....', 'WWWWWWWW',
       '...W....', '...W....'],
    ],
  },

  // ── Firefly ──────────────────────────────────────────────────────────────────
  firefly: {
    size: 6,
    frames: [
      ['..yY..', '.yYYy.', 'yYYYYy', '.yYYy.', '..yY..', '......'],
      ['......', '..yy..', '.yyyy.', '..yy..', '......', '......'],
    ],
  },

  // ── Star ─────────────────────────────────────────────────────────────────────
  star: {
    size: 6,
    frames: [
      ['..Y...', '.YYY..', 'YYYYYY', '.YYY..', '..Y...', '......'],
      ['......', '..y...', '.yyy..', '..y...', '......', '......'],
    ],
  },

  // ── Rain drop ────────────────────────────────────────────────────────────────
  raindrop: {
    size: 4,
    frames: [
      ['..s.', '.ss.', 'ssss', '.s..'],
    ],
  },

  // ── Generic cursor orb ───────────────────────────────────────────────────────
  orb: {
    size: 6,
    frames: [
      ['..CC..', '.CccC.', 'Cc..cC', 'Cc..cC', '.CccC.', '..CC..'],
    ],
  },

  // ── Cursor Dragon (large — 24×24, used at scale 4 = 96 px) ──────────────────
  // Head faces RIGHT. Frame 0 = neutral, Frame 1 = fire breath.
  cursor_dragon: {
    size: 24,
    frames: [
      [
        '....BFFF................',
        '...BFfffFB..............',
        '..BFfffffFB.............',
        '.BFFFFfffFFFB...........',
        'BFFFFFFFFFFFFe..........',
        'BFFFFFFFFFFFFFee........',
        'BFFFFFFFFFFFFFFee.......',
        'BFFFnJYJnFFFFFFFee......',
        'BFFFnJBJnFFFFFFFe.......',
        'BFFFFnJnFFFFFFFFee......',
        'BFFFFFFFFFFFFFFFee......',
        '.BFFFFFFFFFFFFFFFFe.....',
        '..BFFFFFFFFFFFFFFFe.....',
        '...BFFFFFFFFFFFFFFe.....',
        '....BFFFFFFFFFFFFFFe....',
        '.....BFFFFFFFFFFFFee....',
        '......BFFFFFFFee........',
        '.......BFFFFee..........',
        '......BFFFnnnn..........',
        '.....BFFFFnnn...........',
        '....BFFFFFnn............',
        '...BFFFFnnn.............',
        '..BFFFFFFF..............',
        '.BFFFFFFFF..............',
      ],
      [
        '....BFFF................',
        '...BFfffFB..............',
        '..BFfffffFB.............',
        '.BFFFFfffFFFB...........',
        'BFFFFFFFFFFFFe..........',
        'BFFFFFFFFFFFFFee........',
        'BFFFFFFFFFFFFFFee.......',
        'BFFFnJYJnFFFFFFFee......',
        'BFFFnJBJnFFFFFFFe.......',
        'BFFFFnJnFFFFFFFFee......',
        'BFFFFFFFFFFFFFFFee......',
        '.BFFFFFFFFFFFFFFFFe.....',
        '..BFFFFFFFFFFFFFFFe.....',
        '...BFFFFFFFFFFFFFFe.....',
        '....BFFFFFFFFFFFFFFe....',
        '.....BFFFFFFFFFFFFee....',
        '......BFFFFFFFee........',
        '.......BFFFFee.OOooo....',
        '......BFFFnnnnOOOooo....',
        '.....BFFFFnnn.OOoooo....',
        '....BFFFFFnn..Oooo......',
        '...BFFFFnnn...ooo.......',
        '..BFFFFFFF..............',
        '.BFFFFFFFF..............',
      ],
    ],
  },

  // ── Cursor Wolf (large — 20×20, used at scale 4 = 80 px) ────────────────────
  // Head faces RIGHT. Frame 0 = neutral, Frame 1 = jaw open (howl).
  cursor_wolf: {
    size: 20,
    frames: [
      [
        '....bGGG............',
        '...bGgGGb...........',
        '..bGGgGGGb..........',
        '.bGGGGGGGGb.........',
        'bGGGGGGGGGGGX.......',
        'bGGGGGGGGGGGGX......',
        'bGGGGGGGGGGGGGX.....',
        'bGGGGBGGGGGGGGGX....',
        'bGGGGGGGGGGGGGGX....',
        'bGGGGGGGGGGGGGGX....',
        '.bGGGGGGGGGGGGGX....',
        '..bGGGGGGGGGGGGX....',
        '...bGGGGGGGGGGGX....',
        '....bGGGGGGGGGGX....',
        '.....bGGGGGGGGX.....',
        '......bGGGGGGX......',
        '......bGGGWWGb......',
        '.......bGGWGb.......',
        '........bGGb........',
        '.........bb.........',
      ],
      [
        '....bGGG............',
        '...bGgGGb...........',
        '..bGGgGGGb..........',
        '.bGGGGGGGGb.........',
        'bGGGGGGGGGGGX.......',
        'bGGGGGGGGGGGGX......',
        'bGGGGGGGGGGGGGX.....',
        'bGGGGBGGGGGGGGGX....',
        'bGGGGGGGGGGGGGGX....',
        'bGGGGGGGGGGGGGGX....',
        '.bGGGGGGGGGGGGGX....',
        '..bGGGGGGGGGGGGX....',
        '...bGGGGGGGGGGGX....',
        '....bGGGGGGGGGGX....',
        '.....bGGGGGGGGX.....',
        '......bGGGGGGX......',
        '......bGGGWWWb......',
        '.......bGGWWb.......',
        '........bGGb........',
        '.........bb.........',
      ],
    ],
  },

  // ── Fire burst (effect particle sprite, 8×10, 3 frames) ─────────────────────
  fire_burst: {
    size: 8,
    frames: [
      ['..OOOO..', '.OOoOoo.', '.OoooOo.', 'Ooooooo.', '.Ooooo..', '..Ooo...', '...oo...', '....o...', '........', '........'],
      ['...OOO..', '..OOOoo.', '.OOoooo.', 'Ooooooo.', '.Ooooo..', '..Oooo..', '...ooo..', '....oo..', '.....o..', '........'],
      ['.OOOOOO.', 'OOoooOoo', 'OoooooOo', 'oooooooo', '.oooooo.', '..oooo..', '...ooo..', '....oo..', '.....o..', '........'],
    ],
  },
};

// ── SpriteRenderer ───────────────────────────────────────────────────────────
class SpriteRenderer {
  constructor() {
    this._cache = new Map();   // key: "name-frame-scale" → ImageBitmap
    this._frameTimers = new Map();
  }

  // Build an offscreen canvas for a sprite frame at a given pixel scale.
  _render(spriteName, frameIdx, scale = 2) {
    const key = `${spriteName}-${frameIdx}-${scale}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const def = SPRITE_DATA[spriteName];
    if (!def) return null;

    const rows = def.frames[frameIdx] || def.frames[0];
    const size = def.size;
    const w = size * scale;
    const h = rows.length * scale;
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const ctx = oc.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length && c < size; c++) {
        const ch = row[c];
        const col = SPRITE_PALETTE[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }

    this._cache.set(key, oc);
    return oc;
  }

  // Draw a sprite on a canvas context at (x, y), optionally flipped/rotated.
  draw(ctx, spriteName, frameIdx, x, y, scale = 2, flipH = false, alpha = 1) {
    const img = this._render(spriteName, frameIdx, scale);
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flipH) {
      ctx.scale(-1, 1);
      ctx.drawImage(img, -x - img.width, y);
    } else {
      ctx.drawImage(img, x, y);
    }
    ctx.restore();
  }

  // Draw centred on (cx, cy).
  drawCentered(ctx, spriteName, frameIdx, cx, cy, scale = 2, flipH = false, alpha = 1, rotation = 0) {
    const img = this._render(spriteName, frameIdx, scale);
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    if (rotation) ctx.rotate(rotation);
    if (flipH) ctx.scale(-1, 1);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  // Return pixel dimensions of a sprite at given scale.
  size(spriteName, scale = 2) {
    const def = SPRITE_DATA[spriteName];
    if (!def) return { w: 0, h: 0 };
    const rows = def.frames[0];
    return { w: def.size * scale, h: rows.length * scale };
  }

  frameCount(spriteName) {
    return (SPRITE_DATA[spriteName]?.frames.length) || 1;
  }

  // Returns current animated frame index given elapsed ms and fps.
  animFrame(spriteName, elapsed, fps = 6) {
    const count = this.frameCount(spriteName);
    if (count <= 1) return 0;
    return Math.floor((elapsed / (1000 / fps)) % count);
  }

  // Build a tinted version of a sprite (for highlight effects).
  drawTinted(ctx, spriteName, frameIdx, cx, cy, scale, tint, alpha = 0.6) {
    const img = this._render(spriteName, frameIdx, scale);
    if (!img) return;
    // Draw base sprite
    this.drawCentered(ctx, spriteName, frameIdx, cx, cy, scale, false, alpha);
    // Overlay tint
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = tint;
    ctx.translate(cx, cy);
    ctx.fillRect(-img.width / 2, -img.height / 2, img.width, img.height);
    ctx.restore();
  }

  // Generate a simple procedural sprite for unknown entity names.
  generateProceduralSprite(entityName) {
    const hash = [...entityName].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
    const size = 8;
    const oc = document.createElement('canvas');
    oc.width = size * 2; oc.height = size * 2;
    const ctx = oc.getContext('2d');
    const hue = Math.abs(hash) % 360;
    const sat = 60 + (Math.abs(hash >> 4) % 30);
    const lit = 50 + (Math.abs(hash >> 8) % 20);
    ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
    // Draw a simple blob shape
    ctx.beginPath();
    ctx.ellipse(size, size, size - 2, size - 4, (hash % 6) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${hue},${sat}%,${lit + 20}%)`;
    ctx.beginPath();
    ctx.ellipse(size - 2, size - 2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return oc;
  }

  // Returns the best large cursor sprite for a given entity.
  bestCursorSprite(entityName) {
    const n = entityName.toLowerCase();
    if (/dragon|drake|wyrm|wyvern|fire.beast/.test(n)) return 'cursor_dragon';
    if (/wolf|wolves|werewolf|hound|dog|beast/.test(n))  return 'cursor_wolf';
    return null;
  }

  // Returns the best-match sprite name for a given entity description.
  bestSprite(entityName) {
    const n = entityName.toLowerCase();
    if (/geese|goose|swan|duck/.test(n)) return 'goose';
    if (/bird|sparrow|robin|crow|raven|wren|finch|swallow/.test(n)) return 'bird';
    if (/wolf|wolves/.test(n)) return 'wolf';
    if (/fox|foxes/.test(n)) return 'fox';
    if (/dragon/.test(n)) return 'dragon';
    if (/flower|bloom|blossom|rose|daisy|lily/.test(n)) return 'flower';
    if (/leaf|leaves/.test(n)) return 'leaf';
    if (/snow|flake/.test(n)) return 'snowflake';
    if (/firefly|fireflies|glow|light/.test(n)) return 'firefly';
    if (/star|stars/.test(n)) return 'star';
    if (/rain|drop/.test(n)) return 'raindrop';
    if (/cat|kitten|feline/.test(n)) return 'fox';       // fallback similar shape
    if (/deer|elk|moose/.test(n)) return 'wolf';         // fallback similar shape
    return null;
  }
}

// Singleton
const spriteRenderer = new SpriteRenderer();
