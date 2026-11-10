(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const fsBtn = document.getElementById('fsBtn');
  ctx.imageSmoothingEnabled = false;

  // ---------- Константы ----------
  const W = 800, H = 360;
  const GROUND = 300;          // y поверхности земли
  const S = 3;                 // размер одного "пикселя" спрайта
  const GRAV = 2600;
  const JUMP_V = -900;
  const HI_KEY = 'bearRunRecord';
  const THEME_STEP = 800;      // смена локации каждые N очков

  // ---------- Палитра ----------
  const PAL = {
    b: '#8B4513', k: '#111111', w: '#ffffff', n: '#f2c79b',
    h: '#0039a6', r: '#d52b1e', g: '#7cb342', G: '#1b5e20',
    y: '#ffd700', s: '#cfe9ff', o: '#8a8f98', d: '#4a4f57',
    O: '#ff8c00', p: '#3b2a5a', M: '#fff6c8', L: '#e8741c',
    R: '#b3261e', Y: '#f2c230', P: '#ffb3a0', c: '#9fd3ff',
  };

  // ---------- Спрайты ----------
  function makeSprite(rows, scale = S) {
    const w = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => r.padEnd(w, '.'));
    return { rows: padded, w: w * scale, h: padded.length * scale, scale };
  }

  function recolor(sp, from, to) {
    return makeSprite(sp.rows.map(r => r.split(from).join(to)), sp.scale);
  }

  function drawSprite(sp, x, y) {
    for (let ry = 0; ry < sp.rows.length; ry++) {
      const row = sp.rows[ry];
      for (let cx = 0; cx < row.length; cx++) {
        const col = PAL[row[cx]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x + cx * sp.scale), Math.round(y + ry * sp.scale), sp.scale, sp.scale);
      }
    }
  }

  // Медведь
  const BODY = [
    "....hhhhhh....", "...hhhhhhhh...", "...rrrrrrrr...", "..bbbbbbbbbb..",
    "..bkbbbbbbkb..", ".bbbbbbbbbbbb.", ".bbbbnnnnbbbb.", ".bbbbnkknbbbb.",
    ".bbbbbnnbbbbb.", "..bbbbbbbbbb..", "..bbbbbbbbbb..",
  ];
  const LEG_A = ["...bb....bb...", "...bb....bb...", "..bbb....bbb.."];
  const LEG_B = ["...bb..bb.....", "...bb..bb.....", "..bbb..bbb...."];
  const BEAR_RUN = [makeSprite([...BODY, ...LEG_A]), makeSprite([...BODY, ...LEG_B])];
  const BEAR_DUCK = makeSprite([
    "....hhhhhhhh.....", "..hhhhhhhhhhhh...", "..rrrrrrrrrrrr...", ".bbbbbbbbbbbbbbb.",
    "bbkbbbbbbbbbbbkbb", "bbbbbbnnnnnbbbbbb", "..bbbbbbbbbbbbb..", "..bbb.........bb.",
  ]);

  // Препятствия-природа
  const BIRCH = makeSprite([
    "...gggg...", "..gggggg..", ".gggggggg.", "gggggggggg", ".gggggggg.",
    "..gggggg..", "...gggg...", "....ww....", "....wk....", "....ww....",
    "....wk....", "....ww....", "....wk....", "....ww....",
  ]);
  const FIR = makeSprite([
    ".....G.....", "....GGG....", "...GGGGG...", "....GGG....", "...GGGGG...",
    "..GGGGGGG..", "...GGGGG...", "..GGGGGGG..", ".GGGGGGGGG.", "....bbb....", "....bbb....",
  ]);

  // Враги
  const CROW = [
    makeSprite(["...kk.....", "..kkkk....", "kkkkkkkk..", ".kkkkkkkk.", "..kkkkkk..", "...k..k..."]),
    makeSprite(["k........k", "kk......kk", ".kkkkkkkk.", "..kkkkkk..", "...kkkk...", "....kk...."]),
  ];
  const BAT = [
    makeSprite(["pp.........pp", "ppppp...ppppp", ".ppppppppppp.", ".ppwpppppwpp.", "..ppppppppp..", "....ppppp...."]),
    makeSprite(["....ppppp....", "..pppppppppp.", ".ppwpppppwpp.", "..ppppppppp..", "p.p.ppppp.p.p", "p...........p"]),
  ];
  const WOLF = [
    makeSprite([
      "..o.o...........", "..oooo..........", ".oookoo.........", "oooooooooooo....",
      "oooooooooooooo..", ".oooooooooooooo.", "..ooooooooooooo.", "..dd.....dd.....", "..dd.....dd.....",
    ]),
    makeSprite([
      "..o.o...........", "..oooo..........", ".oookoo.........", "oooooooooooo....",
      "oooooooooooooo..", ".oooooooooooooo.", "..ooooooooooooo.", "...dd...dd......", "..d.......d.....",
    ]),
  ];
  const SNOWMAN = makeSprite([
    "...kkkkkk...", "...kkkkkk...", "kkkkkkkkkkkk", "...wwwwww...",
    "...wkwwkw...", "...wwOwww...", "....wwww....", "..rrrrrrrr..",
    "..wwwwwwww..", ".wwwwkwwwww.", ".wwwwwwwwww.", "wwwwwwwwwwww", "wwwwwwwwwwww",
  ]);

  // Небо и декор
  const SUN = makeSprite([
    "...yyy...", ".yyyyyyy.", "yyyyyyyyy", "yyyyyyyyy", "yyyyyyyyy",
    "yyyyyyyyy", "yyyyyyyyy", ".yyyyyyy.", "...yyy...",
  ], 4);
  const MOON = makeSprite([
    "..MMMM..", ".MMMMM..", "MMMM....", "MMMM....", "MMMM....", "MMMM....", ".MMMMM..", "..MMMM..",
  ], 4);
  const CLOUD_W = makeSprite(["...wwwww....", "..wwwwwwwww.", ".wwwwwwwwwww", "wwwwwwwwwwww"], 3);
  const CLOUD_P = recolor(CLOUD_W, 'w', 'P');

  const CLOUD_C = recolor(CLOUD_W, 'w', 'c');
  const CLOUDS_BY_KEY = { w: CLOUD_W, P: CLOUD_P, c: CLOUD_C };
  const BIRCH_AUT = recolor(BIRCH, 'g', 'L');
  const SUN_SET = recolor(SUN, 'y', 'O');

  // ---------- Локации ----------
  // far: тип дальнего фона, cloud: ключ облака, celestial: солнце или луна
  const THEMES = [
    { name: 'Зимняя Россия', top: '#7ec8f0', bot: '#c9ecff', ground: '#f4fbff', line: '#b0d6f0', dash: '#a6cde8',
      far: 'fir', farColor: '#6fa3c0', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: true, forest: 'winter' },
    { name: 'Ночная Москва', top: '#0a0f2c', bot: '#243a6e', ground: '#c8d4e8', line: '#8ea3c7', dash: '#7f93b8',
      far: 'kremlin', farColor: '#1a2446', celestial: 'moon', sun: MOON, cloud: 'c', snowflakes: true, forest: 'night', stars: true },
    { name: 'Байкал на закате', top: '#3b1f6b', bot: '#ff7b3a', ground: '#7fb4d6', line: '#5d93bd', dash: '#4f7fa8',
      far: 'mountain', farColor: '#4a2a5a', celestial: 'sun', sun: SUN_SET, cloud: 'P', snowflakes: false, forest: 'winter' },
    { name: 'Золотая осень', top: '#8fd0ec', bot: '#e8f7d8', ground: '#c9a66b', line: '#a5854e', dash: '#8c6d3e',
      far: 'autumn', farColor: '#c0662a', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: false, forest: 'autumn' },
    { name: 'Лето у Волги', top: '#58b8f2', bot: '#c8f0ff', ground: '#7cc24a', line: '#5a9e32', dash: '#4f8c2b',
      far: 'hills', farColor: '#3f8f3a', celestial: 'sun', sun: SUN, cloud: 'w', snowflakes: false, forest: 'summer' },
  ];
  let themeIdx = Math.floor(Math.random() * THEMES.length);
  let bannerT = 0;             // сколько секунд показывать название локации
  const theme = () => THEMES[themeIdx];

  function pickNewTheme() {
    let n;
    do { n = Math.floor(Math.random() * THEMES.length); } while (THEMES.length > 1 && n === themeIdx);
    themeIdx = n;
    bannerT = 2.5;
  }

  // Деревья в зависимости от локации
  function birchFor() { return theme().forest === 'autumn' ? BIRCH_AUT : BIRCH; }

  // ---------- Состояние ----------
  let state = 'ready';         // ready | running | over
  let distance = 0;
  let score = 0;
  let speed = 380;
  let lastMilestone = 0;
  let nextSpawnAt = 0;
  let duckHeld = false;
  let hi = parseInt(localStorage.getItem(HI_KEY) || '0', 10);

  const player = { x: 70, y: GROUND, vy: 0, frame: 0, ft: 0 };
  const obstacles = [];
  const clouds = [];
  const flakes = [];
  const stars = [];

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
  let actx = null;
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

  // ---------- Логика ----------
  let nextThemeAt = THEME_STEP;
  let flash = 0;               // белая вспышка при смене локации

  function currentSprite() {
    const ducking = duckHeld && player.y >= GROUND;
    if (ducking) return BEAR_DUCK;
    return BEAR_RUN[player.y >= GROUND ? player.frame : 0];
  }

  function playerBox() {
    const sp = currentSprite();
    return { x: player.x + 6, y: player.y - sp.h + 6, w: sp.w - 12, h: sp.h - 10 };
  }

  function addObstacle(frames, y, fast = 1) {
    const sp = frames[0];
    obstacles.push({ frames, x: W + 10, y, w: sp.w, h: sp.h, fast, t: 0 });
  }

  function spawnObstacle() {
    const th = theme();
    const r = Math.random();
    const birch = birchFor();
    if (distance > 1200 && r < 0.2) {
      // Летающие: вороны в обычных локациях, летучие мыши в Ночной Москве
      const high = Math.random() < 0.5;
      const flyer = th.forest === 'night' ? BAT : CROW;
      addObstacle(flyer, high ? GROUND - 50 : GROUND - 24);
    } else if (distance > 500 && r < 0.42) {
      addObstacle(WOLF, GROUND - WOLF[0].h, 1.3);   // волк бежит быстрее
    } else if (distance > 300 && r < 0.6) {
      addObstacle([SNOWMAN], GROUND - SNOWMAN.h);
    } else if (r < 0.8) {
      addObstacle([birch], GROUND - birch.h);
    } else {
      addObstacle([FIR], GROUND - FIR.h);
    }
  }

  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function reset() {
    state = 'running';
    distance = 0;
    score = 0;
    speed = 380;
    lastMilestone = 0;
    nextSpawnAt = 250;
    nextThemeAt = THEME_STEP;
    obstacles.length = 0;
    player.y = GROUND;
    player.vy = 0;
    player.frame = 0;
    player.ft = 0;
    flash = 0;
    themeIdx = Math.floor(Math.random() * THEMES.length);  // случайная локация при старте
    bannerT = 2.5;
  }

  function gameOver() {
    state = 'over';
    beep(150, 0.4, 'sawtooth', 0.08);
    if (score > hi) {
      hi = score;
      localStorage.setItem(HI_KEY, String(hi));
    }
  }

  function jump() {
    ensureAudio();
    if (state === 'ready' || state === 'over') { reset(); return; }
    if (state === 'running' && player.y >= GROUND) {
      player.vy = JUMP_V;
      beep(520, 0.12);
    }
  }

  function update(dt) {
    distance += speed * dt;
    speed = Math.min(950, 380 + distance * 0.02);
    score = Math.floor(distance / 10);

    if (score >= lastMilestone + 100) {
      lastMilestone += 100;
      beep(880, 0.1);
    }
    if (score >= nextThemeAt) {
      nextThemeAt += THEME_STEP;
      pickNewTheme();
      flash = 1;
      beep(660, 0.08);
      setTimeout(() => beep(990, 0.12), 90);
    }

    // Физика игрока
    const onGround = player.y >= GROUND;
    player.vy += GRAV * dt * (duckHeld && !onGround ? 2 : 1);
    player.y += player.vy * dt;
    if (player.y >= GROUND) {
      player.y = GROUND;
      player.vy = 0;
      player.ft += dt;
      if (player.ft > 0.12) {
        player.ft = 0;
        player.frame ^= 1;
      }
    }

    // Облака и снежинки
    for (const c of clouds) {
      c.x -= speed * c.s * dt;
      if (c.x < -60) { c.x = W + Math.random() * 100; c.y = 20 + Math.random() * 60; }
    }
    for (const f of flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(f.y * 0.05 + f.d) * 0.4;
      if (f.y > GROUND) { f.y = -4; f.x = Math.random() * W; }
    }

    // Препятствия и враги
    for (const o of obstacles) { o.x -= speed * o.fast * dt; o.t += dt; }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].x + obstacles[i].w < -10) obstacles.splice(i, 1);
    }

    if (distance >= nextSpawnAt) {
      spawnObstacle();
      nextSpawnAt = distance + (380 + Math.random() * 320) * (speed / 380);
    }

    // Столкновения
    const pb = playerBox();
    for (const o of obstacles) {
      if (hit(pb, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) { gameOver(); return; }
    }
  }

  // ---------- Отрисовка ----------
  function hash01(k) {
    const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawSky(th) {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, th.top);
    g.addColorStop(1, th.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND);

    if (th.stars) {
      for (const s of stars) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(s.t + Date.now() / 700));
        ctx.fillStyle = PAL.w;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    if (th.celestial === 'moon') drawSprite(MOON, 120, 56);
    else drawSprite(th.sun, 120, 56);
  }

  function drawClouds(th) {
    const spr = CLOUDS_BY_KEY[th.cloud];
    for (const c of clouds) drawSprite(spr, c.x, c.y);
  }

  // Дальний план: процедурные силуэты, прокручиваются с параллаксом
  function drawFar(th) {
    const off = distance * 0.35;
    const i0 = Math.floor(off / 40);
    ctx.fillStyle = th.farColor;
    for (let i = 0; i < W / 40 + 3; i++) {
      const k = i0 + i;
      const x = k * 40 - off;
      const h = hash01(k);
      switch (th.far) {
        case 'fir': {
          const ht = 50 + h * 50;
          ctx.beginPath();
          ctx.moveTo(x - 14, GROUND); ctx.lineTo(x + 14, GROUND); ctx.lineTo(x, GROUND - ht);
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'kremlin': {
          ctx.fillRect(x - 20, GROUND - 18, 40, 18);          // стена
          if (k % 3 === 0) {
            const ht = 70 + h * 40;
            ctx.fillRect(x - 12, GROUND - ht, 24, ht);        // башня
            ctx.beginPath();
            ctx.moveTo(x - 14, GROUND - ht); ctx.lineTo(x + 14, GROUND - ht); ctx.lineTo(x, GROUND - ht - 34);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.y;                             // рубиновая звезда
            ctx.fillRect(x - 2, GROUND - ht - 42, 4, 6);
            ctx.fillStyle = th.farColor;
          }
          break;
        }
        case 'mountain': {
          if (k % 3 !== 0) break;
          const ht = 70 + h * 70;
          ctx.beginPath();
          ctx.moveTo(x - 80, GROUND); ctx.lineTo(x, GROUND - ht); ctx.lineTo(x + 80, GROUND);
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'autumn': {
          ctx.beginPath();
          ctx.arc(x, GROUND - 22 - h * 10, 16 + h * 8, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'hills': {
          ctx.beginPath();
          ctx.ellipse(x, GROUND, 60 + h * 30, 30 + h * 25, 0, Math.PI, 0);
          ctx.fill();
          break;
        }
      }
    }
  }

  function drawGround(th) {
    ctx.fillStyle = th.ground;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = th.line;
    ctx.fillRect(0, GROUND, W, 2);
    const shift = distance % 40;
    ctx.fillStyle = th.dash;
    for (let x = -40; x < W + 40; x += 40) {
      ctx.fillRect(Math.round(x - shift), GROUND + 12, 14, 3);
      ctx.fillRect(Math.round(x - shift + 20), GROUND + 24, 6, 3);
    }
  }

  function drawFlakes() {
    ctx.fillStyle = PAL.s;
    for (const f of flakes) ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
  }

  function drawObstacles() {
    for (const o of obstacles) {
      const frame = o.frames[Math.floor(o.t * 6) % o.frames.length];
      drawSprite(frame, o.x, o.y);
    }
  }

  function drawPlayer() {
    const sp = currentSprite();
    drawSprite(sp, player.x, player.y - sp.h);
  }

  function drawText(text, x, y, size, color, align = 'left') {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.fillStyle = '#0039a6';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawHUD() {
    const pad = n => String(n).padStart(5, '0');
    drawText(`СЧЁТ ${pad(score)}`, W - 20, 30, 16, '#fff', 'right');
    drawText(`РЕКОРД ${pad(hi)}`, W - 20, 52, 14, '#ffd700', 'right');
    drawText(theme().name, 20, 30, 14, '#fff', 'left');
  }

  function drawBanner() {
    if (bannerT <= 0) return;
    const a = Math.min(1, bannerT);
    ctx.globalAlpha = a;
    drawText(`ЛОКАЦИЯ: ${theme().name.toUpperCase()}`, W / 2, 90, 22, '#ffd700', 'center');
    ctx.globalAlpha = 1;
  }

  function drawOverlay() {
    ctx.fillStyle = 'rgba(11, 26, 51, 0.55)';
    ctx.fillRect(0, 0, W, GROUND);
    if (state === 'ready') {
      drawText('НАЖМИ ПРОБЕЛ ИЛИ ТАП, ЧТОБЫ НАЧАТЬ', W / 2, 130, 20, '#fff', 'center');
      drawText('Беги, Мишка, по зимней России!', W / 2, 160, 14, '#cfe9ff', 'center');
      drawText('Локация меняется каждые 800 очков', W / 2, 186, 12, '#cfe9ff', 'center');
    } else if (state === 'over') {
      drawText('ИГРА ОКОНЧЕНА', W / 2, 130, 26, '#d52b1e', 'center');
      drawText(`Счёт: ${score}`, W / 2, 160, 16, '#fff', 'center');
      drawText('ПРОБЕЛ ИЛИ ТАП — ЗАНОВО', W / 2, 190, 14, '#cfe9ff', 'center');
    }
  }

  function draw() {
    const th = theme();
    ctx.clearRect(0, 0, W, H);
    drawSky(th);
    drawClouds(th);
    drawFar(th);
    if (th.snowflakes) drawFlakes();
    drawGround(th);
    drawObstacles();
    drawPlayer();
    drawHUD();
    drawBanner();
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (state !== 'running') drawOverlay();
  }

  // ---------- Полный экран ----------
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      req.call(el).then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    }
  }

  fsBtn.addEventListener('click', e => { e.stopPropagation(); toggleFullscreen(); });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = isFullscreen() ? '✕' : '⛶';
  });

  // ---------- Цикл ----------
  let lastTs = null;
  function loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state === 'running') update(dt);
    else {
      for (const c of clouds) { c.x -= 20 * c.s * dt; if (c.x < -60) c.x = W + 20; }
      for (const f of flakes) { f.y += f.v * dt; if (f.y > GROUND) f.y = -4; }
    }
    if (bannerT > 0) bannerT -= dt;
    if (flash > 0) flash = Math.max(0, flash - dt * 2);

    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Управление ----------
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyF') { toggleFullscreen(); return; }
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat) jump();
    if (e.code === 'ArrowDown') duckHeld = true;
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowDown') duckHeld = false;
  });

  canvas.addEventListener('pointerdown', e => {
    ensureAudio();
    // Первый тап на телефоне включает полный экран
    if (!isFullscreen() && 'ontouchstart' in window) toggleFullscreen();
    const r = canvas.getBoundingClientRect();
    const yRel = (e.clientY - r.top) / r.height;
    if (yRel > 0.6) {
      duckHeld = true;
      if (state !== 'running') jump();
    } else {
      jump();
    }
  });
  const releaseDuck = () => { duckHeld = false; };
  canvas.addEventListener('pointerup', releaseDuck);
  canvas.addEventListener('pointerleave', releaseDuck);
  canvas.addEventListener('pointercancel', releaseDuck);

  requestAnimationFrame(loop);
})();
