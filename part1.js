var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var fsBtn = document.getElementById('fsBtn');
  var nickInput = document.getElementById('nick');
  var HAS_FILTER = 'filter' in ctx;
  ctx.imageSmoothingEnabled = false;

  // ---------- Константы ----------
  var W = 800, H = 360;
  var GROUND = 300;            // y поверхности земли
  var S = 3;                   // размер одного "пикселя" спрайта
  var GRAV = 2600;
  var JUMP_V = -900;
  var BOARD_KEY = 'bearRunBoard';
  var SKIN_KEY = 'bearRunSkin';
  var BOARD_SIZE = 10;
  var THEME_STEP = 800;        // смена локации каждые N очков
  var TRANS_TIME = 1.2;        // длительность плавного перехода, сек
  var NAME_MAX = 12;

  // Кнопки на канвасе (координаты в пикселях поля W x H)
  var UI = {
    left: { x: 300, y: 150, w: 40, h: 40 },
    right: { x: 460, y: 150, w: 40, h: 40 },
    board: { x: 320, y: 254, w: 160, h: 32 },
    nick: { x: 230, y: 168, w: 340, h: 36 },
    save: { x: 300, y: 224, w: 200, h: 36 },
  };

  // ---------- Палитра ----------
  var PAL = {
    k: '#111111', w: '#ffffff', r: '#d52b1e', g: '#7cb342', G: '#1b5e20',
    y: '#ffd700', s: '#cfe9ff', o: '#8a8f98', d: '#4a4f57',
    O: '#ff8c00', p: '#3b2a5a', M: '#fff6c8', L: '#e8741c',
    R: '#b3261e', Y: '#f2c230', P: '#ffb3a0', c: '#9fd3ff',
    b: '#8B4513', Q: '#b8562a',
    // цвета медведя (B, H, X, N меняются скином)
    B: '#8B4513', H: '#0039a6', X: '#d52b1e', N: '#f2c79b',
  };

  // ---------- Скины медведя ----------
  var SKINS = [
    { name: 'Классика',      B: '#8B4513', H: '#0039a6', X: '#d52b1e', N: '#f2c79b' },
    { name: 'Красная шапка', B: '#6b3a1f', H: '#d52b1e', X: '#ffffff', N: '#f2c79b' },
    { name: 'Полярный',      B: '#c9d6e6', H: '#2a4d8f', X: '#ffd700', N: '#f2c79b' },
    { name: 'Золотой',       B: '#c58b2a', H: '#ffd700', X: '#d52b1e', N: '#f2c79b' },
    { name: 'Ночной',        B: '#6a5a8a', H: '#7a3ea8', X: '#ffd700', N: '#e8b890' },
  ];
  var skinIdx = 0;
  try {
    skinIdx = Math.min(SKINS.length - 1, parseInt(localStorage.getItem(SKIN_KEY) || '0', 10) || 0);
  } catch (e) { skinIdx = 0; }
  function applySkin() {
    const s = SKINS[skinIdx];
    PAL.B = s.B; PAL.H = s.H; PAL.X = s.X; PAL.N = s.N;
  }
  function cycleSkin(dir) {
    skinIdx = (skinIdx + dir + SKINS.length) % SKINS.length;
    applySkin();
    try { localStorage.setItem(SKIN_KEY, String(skinIdx)); } catch (e) { /* без сохранения */ }
  }
  applySkin();

  // ---------- Спрайты ----------
  function makeSprite(rows, scale = S) {
    const w = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => r.padEnd(w, '.'));
    return { rows: padded, w: w * scale, h: padded.length * scale, scale };
  }

  function recolor(sp, from, to) {
    return makeSprite(sp.rows.map(r => r.split(from).join(to)), sp.scale);
  }

  // sil = true рисует силуэт чёрным (для контура)
  function drawSprite(sp, x, y, sil = false) {
    for (let ry = 0; ry < sp.rows.length; ry++) {
      const row = sp.rows[ry];
      for (let cx = 0; cx < row.length; cx++) {
        const ch = row[cx];
        const col = sil ? (ch === '.' ? null : '#111111') : PAL[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x + cx * sp.scale), Math.round(y + ry * sp.scale), sp.scale, sp.scale);
      }
    }
  }

  // Спрайт с чёрным контуром, чтобы герой и враги читались на любом фоне
  function drawOutlined(sp, x, y) {
    drawSprite(sp, x - 2, y, true);
    drawSprite(sp, x + 2, y, true);
    drawSprite(sp, x, y - 2, true);
    drawSprite(sp, x, y + 2, true);
    drawSprite(sp, x, y);
  }

  // Медведь (цвета B, H, X, N задаются скином)
  var BODY = [
    "....HHHHHH....", "...HHHHHHHH...", "...XXXXXXXX...", "..BBBBBBBBBB..",
    "..BkBBBBBBkB..", ".BBBBBBBBBBBB.", ".BBBBNNNNBBBB.", ".BBBBNkkNBBBB.",
    ".BBBBBNNBBBBB.", "..BBBBBBBBBB..", "..BBBBBBBBBB..",
  ];
  var LEG_A = ["...BB....BB...", "...BB....BB...", "..BBB....BBB.."];
  var LEG_B = ["...BB..BB.....", "...BB..BB.....", "..BBB..BBB...."];
  var BEAR_RUN = [makeSprite([...BODY, ...LEG_A]), makeSprite([...BODY, ...LEG_B])];
  var BEAR_DUCK = makeSprite([
    "....HHHHHHHH.....", "..HHHHHHHHHHHH...", "..XXXXXXXXXXXX...", ".BBBBBBBBBBBBBBB.",
    "BBkBBBBBBBBBBBkBB", "BBBBBBNNNNNBBBBBB", "..BBBBBBBBBBBBB..", "..BBB.........BB.",
  ]);

  // Природа
  var BIRCH = makeSprite([
    "...gggg...", "..gggggg..", ".gggggggg.", "gggggggggg", ".gggggggg.",
    "..gggggg..", "...gggg...", "....ww....", "....wk....", "....ww....",
    "....wk....", "....ww....", "....wk....", "....ww....",
  ]);
  var BIRCH_AUT = recolor(BIRCH, 'g', 'L');
  var FIR = makeSprite([
    ".....G.....", "....GGG....", "...GGGGG...", "....GGG....", "...GGGGG...",
    "..GGGGGGG..", "...GGGGG...", "..GGGGGGG..", ".GGGGGGGGG.", "....bbb....", "....bbb....",
  ]);

  // Летающие враги
  var CROW = [
    makeSprite(["...kk.....", "..kkkk....", "kkkkkkkk..", ".kkkkkkkk.", "..kkkkkk..", "...k..k..."]),
    makeSprite(["k........k", "kk......kk", ".kkkkkkkk.", "..kkkkkk..", "...kkkk...", "....kk...."]),
  ];
  var BAT = [
    makeSprite(["pp.........pp", "ppppp...ppppp", ".ppppppppppp.", ".ppwpppppwpp.", "..ppppppppp..", "....ppppp...."]),
    makeSprite(["....ppppp....", "..pppppppppp.", ".ppwpppppwpp.", "..ppppppppp..", "p.p.ppppp.p.p", "p...........p"]),
  ];

  // Наземные враги
  var WOLF = [
    makeSprite([
      "..o.o...........", "..oooo..........", ".oookoo.........", "oooooooooooo....",
      "oooooooooooooo..", ".oooooooooooooo.", "..ooooooooooooo.", "..dd.....dd.....",
      "..dd.....dd.....",
    ]),
    makeSprite([
      "..o.o...........", "..oooo..........", ".oookoo.........", "oooooooooooo....",
      "oooooooooooooo..", ".oooooooooooooo.", "..ooooooooooooo.", "...dd...dd......",
      "..d.......d.....",
    ]),
  ];
  // Лиса: бежит быстрее волка
  var FOX = [
    makeSprite([
      "...L.L........", ".LLLLLL.......", ".LLkLLLL......", "LLLLLLLLLLLLLLw",
      ".LLLLLLLLLLLL.", "..LL...LL.....", "..LL...LL.....",
    ]),
    makeSprite([
      "...L.L........", ".LLLLLL.......", ".LLkLLLL......", "LLLLLLLLLLLLLLw",
      ".LLLLLLLLLLLL.", ".LL.....LL....", "LL.........LL.",
    ]),
  ];
  var SNOWMAN = makeSprite([
    "...kkkkkk...", "...kkkkkk...", "kkkkkkkkkkkk", "...wwwwww...",
    "...wkwwkw...", "...wwOwww...", "....wwww....", "..rrrrrrrr..",
    "..wwwwwwww..", ".wwwwkwwwww.", ".wwwwwwwwww.", "wwwwwwwwwwww", "wwwwwwwwwwww",
  ]);
  // Самовар: медный, стоит на земле
  var SAMOVAR = makeSprite([
    "...QQ.....", "..QQQQ....", ".QQQQQQQQ.", "QQQQQQQQQQ",
    "QyyQQQQyyQ", "QQQQQQQQQQ", "QQQQQQQQQQ", ".QQQQQQQQ.", "..QQQQQQ..", "..kk..kk..",
  ]);

  // Небо и декор
  var SUN = makeSprite([
    "...yyy...", ".yyyyyyy.", "yyyyyyyyy", "yyyyyyyyy", "yyyyyyyyy",
    "yyyyyyyyy", "yyyyyyyyy", ".yyyyyyy.", "...yyy...",
  ], 4);
  var MOON = makeSprite([
    "..MMMM..", ".MMMMM..", "MMMM....", "MMMM....", "MMMM....", "MMMM....", ".MMMMM..", "..MMMM..",
  ], 4);
  var CLOUD_W = makeSprite(["...wwwww....", "..wwwwwwwww.", ".wwwwwwwwwww", "wwwwwwwwwwww"], 3);
  var CLOUD_P = recolor(CLOUD_W, 'w', 'P');
  var CLOUD_C = recolor(CLOUD_W, 'w', 'c');
  var CLOUDS_BY_KEY = { w: CLOUD_W, P: CLOUD_P, c: CLOUD_C };
  var SUN_SET = recolor(SUN, 'y', 'O');

  // ---------- Локации ----------
  var THEMES = [
    { name: 'Зимняя Россия', top: '#5fb3e8', bot: '#dff2ff', ground: '#f4fbff', line: '#a9d3f2', dash: '#9cc7e8',
      far: 'fir', farColor: '#5b8fb0', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: true, forest: 'winter' },
    { name: 'Ночная Москва', top: '#070b24', bot: '#2b4680', ground: '#c8d4e8', line: '#8ea3c7', dash: '#7f93b8',
      far: 'kremlin', farColor: '#141c38', celestial: 'moon', sun: MOON, cloud: 'c', snowflakes: true, forest: 'night', stars: true },
    { name: 'Байкал на закате', top: '#2b1259', bot: '#ff8a3d', ground: '#6fa8cf', line: '#4d84b0', dash: '#43729b',
      far: 'mountain', farColor: '#3d2150', celestial: 'sun', sun: SUN_SET, cloud: 'P', snowflakes: false, forest: 'winter' },
    { name: 'Золотая осень', top: '#7fc4e8', bot: '#f6e7c0', ground: '#c9a66b', line: '#9c7c48', dash: '#8c6d3e',
      far: 'autumn', farColor: '#b5561f', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: false, forest: 'autumn' },
    { name: 'Лето у Волги', top: '#3ea8ee', bot: '#c2efff', ground: '#7cc24a', line: '#56992e', dash: '#4f8c2b',
      far: 'hills', farColor: '#357f33', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: false, forest: 'summer' },
    { name: 'Рязань', top: '#8fb8d8', bot: '#f0dcae', ground: '#c8a86a', line: '#9d8045', dash: '#8a6d39',
      far: 'ryazan', farColor: '#8a6a45', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: false, forest: 'field' },
  ];
  var themeIdx = Math.floor(Math.random() * THEMES.length);
  var prevIdx = themeIdx;
  var transT = 1;               // прогресс перехода 0..1 (1 = перехода нет)
  var bannerT = 0;              // сколько секунд показывать название локации
  var theme = () => THEMES[themeIdx];
  var prevTheme = () => THEMES[prevIdx];

  function pickNewTheme() {
    let n;
    do { n = Math.floor(Math.random() * THEMES.length); } while (THEMES.length > 1 && n === themeIdx);
    prevIdx = themeIdx;
    themeIdx = n;
    transT = 0;
    bannerT = 2.5;
  }

  // Деревья в зависимости от локации
  function birchFor() { return theme().forest === 'autumn' ? BIRCH_AUT : BIRCH; }

  // ---------- Состояние ----------
  var state = 'ready';         // ready | running | over
  var distance = 0;
  var score = 0;
  var speed = 380;
  var lastMilestone = 0;
  var nextSpawnAt = 0;
  var duckHeld = false;
  var hi = 0;
  var board = [];               // [{name, score}]
  var pendingName = '';         // введённый ник, ждёт сохранения
  var showBoard = false;        // показывать таблицу рекордов
  var showNickInput = false;    // показывать поле ввода ника
  var lastScore = 0;
  var coins = 0;                // собранные монетки

  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (raw) {
      board = JSON.parse(raw).filter(e => e && typeof e.name === 'string')
        .map(e => ({ name: String(e.name).slice(0, NAME_MAX), score: Number(e.score) || 0 }))
        .sort((a, b) => b.score - a.score).slice(0, BOARD_SIZE);
    }
  } catch (e) { board = []; }
  hi = board.length ? board[0].score : 0;

  var player = { x: 70, y: GROUND, vy: 0, frame: 0, ft: 0 };
  var obstacles = [];
  var clouds = [];
  var flakes = [];
  var stars = [];
  var pickups = [];            // монетки-побилки

  for (let i = 0; i < 4; i++) {
    clouds.push({ x: Math.random() * W, y: 20 + Math.random() * 60, s: 0.3 + Math.random() * 0.2 });
  }
  for (let i = 0; i < 45; i++) {
    flakes.push({ x: Math.random() * W, y: Math.random() * GROUND, v: 25 + Math.random() * 35, d: Math.random() * 2 });
  }
  for (let i = 0; i < 35; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * 150, t: Math.random() * 6 });
  }

  // ---------- Звук (8-bit) ----------
  var actx = null;
  function ensureAudio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function beep(freq, dur, type = 'square', vol = 0.05) {
    if (!actx) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(actx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.stop(actx.currentTime + dur);
  }