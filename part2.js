var nextThemeAt = THEME_STEP;
  var flash = 0;               // белая вспышка при смене локации
  var shield = 0;              // время щита, сек
  var jumpsLeft = 1;           // двойной прыжок: 1 = один прыжок доступен
  var combo = 0;               // серия собранных монеток
  var comboT = 0;

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
    if (distance > 1200 && r < 0.18) {
      // Летающие: вороны в обычных локациях, летучие мыши в Ночной Москве
      const high = Math.random() < 0.5;
      const flyer = th.forest === 'night' ? BAT : CROW;
      addObstacle(flyer, high ? GROUND - 50 : GROUND - 24);
    } else if (distance > 1400 && r < 0.32) {
      addObstacle(FOX, GROUND - FOX[0].h, 1.55);      // лиса — самый быстрый
    } else if (distance > 500 && r < 0.5) {
      addObstacle(WOLF, GROUND - WOLF[0].h, 1.25);    // волк быстрее остальных
    } else if (distance > 300 && r < 0.66) {
      addObstacle([SNOWMAN], GROUND - SNOWMAN.h);
    } else if (distance > 800 && r < 0.78) {
      addObstacle([SAMOVAR], GROUND - SAMOVAR.h);
    } else if (r < 0.9) {
      addObstacle([birch], GROUND - birch.h);
    } else {
      addObstacle([FIR], GROUND - FIR.h);
    }
  }

  function spawnPickup() {
    pickups.push({ x: W + 20, y: GROUND - 70 - Math.random() * 60, t: 0, got: false });
  }

  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function saveRecord(name, sc) {
    board.push({ name: String(name || 'МИШКА').slice(0, NAME_MAX), score: sc });
    board.sort((a, b) => b.score - a.score);
    board = board.slice(0, BOARD_SIZE);
    try { localStorage.setItem(BOARD_KEY, JSON.stringify(board)); } catch (e) { /* без сохранения */ }
    hi = board.length ? board[0].score : 0;
  }

  function reset() {
    state = 'running';
    distance = 0;
    score = 0;
    coins = 0;
    combo = 0;
    comboT = 0;
    speed = 380;
    lastMilestone = 0;
    nextSpawnAt = 250;
    nextThemeAt = THEME_STEP;
    nextPickupAt = 400;
    obstacles.length = 0;
    pickups.length = 0;
    player.y = GROUND;
    player.vy = 0;
    player.frame = 0;
    player.ft = 0;
    jumpsLeft = 1;
    shield = 0;
    flash = 0;
    showBoard = false;
    showNickInput = false;
    themeIdx = Math.floor(Math.random() * THEMES.length);  // случайная локация при старте
    prevIdx = themeIdx;
    transT = 1;
    bannerT = 2.5;
  }

  function gameOver() {
    state = 'over';
    beep(150, 0.4, 'sawtooth', 0.08);
    lastScore = score;
    if (score > hi) {
      hi = score;
      showNickInput = true;
      pendingName = '';
      showBoard = false;
      if (nickInput) {
        nickInput.value = '';
        nickInput.disabled = false;
        // фокус с задержкой, чтобы экран успел отрисоваться
        setTimeout(() => { try { nickInput.focus(); } catch (e) { /* нет фокуса */ } }, 60);
      }
    } else {
      showBoard = true;
    }
  }

  function jump() {
    ensureAudio();
    if (state === 'ready' || state === 'over') { reset(); return; }
    if (state === 'running' && jumpsLeft > 0) {
      player.vy = JUMP_V;
      jumpsLeft--;
      beep(jumpsLeft === 0 ? 520 : 700, 0.12);
    }
  }

  var nextPickupAt = 400;

  function update(dt) {
    distance += speed * dt;
    speed = Math.min(950, 380 + distance * 0.02);
    score = Math.floor(distance / 10) + coins * 5;

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

    // Плавный переход между локациями
    if (transT < 1) transT = Math.min(1, transT + dt / TRANS_TIME);

    // Физика игрока
    const onGround = player.y >= GROUND;
    player.vy += GRAV * dt * (duckHeld && !onGround ? 2 : 1);
    player.y += player.vy * dt;
    if (player.y >= GROUND) {
      player.y = GROUND;
      player.vy = 0;
      jumpsLeft = 1;                       // двойной прыжок восстановился
      player.ft += dt;
      if (player.ft > 0.12) {
        player.ft = 0;
        player.frame ^= 1;
      }
    }

    // Щит и комбо
    if (shield > 0) shield -= dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

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

    // Препятствия, враги и монетки
    for (const o of obstacles) { o.x -= speed * o.fast * dt; o.t += dt; }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].x + obstacles[i].w < -10) obstacles.splice(i, 1);
    }
    for (const p of pickups) { p.x -= speed * dt; p.t += dt; }
    for (let i = pickups.length - 1; i >= 0; i--) {
      if (pickups[i].x < -20) pickups.splice(i, 1);
    }

    if (distance >= nextSpawnAt) {
      spawnObstacle();
      nextSpawnAt = distance + (380 + Math.random() * 320) * (speed / 380);
    }
    if (distance >= nextPickupAt) {
      spawnPickup();
      nextPickupAt = distance + (260 + Math.random() * 220) * (speed / 380);
    }

    // Сбор монеток
    const pb = playerBox();
    for (const p of pickups) {
      if (!p.got && hit(pb, { x: p.x + 4, y: p.y + 4, w: 16, h: 16 })) {
        p.got = true;
        coins++;
        combo++;
        comboT = 2.5;
        beep(1040, 0.08);
        if (combo >= 3) {
          shield = 5;                     // серия из 3 монет даёт щит
          combo = 0;
          beep(1320, 0.2, 'square', 0.07);
        }
      }
    }

    // Столкновения
    for (const o of obstacles) {
      if (hit(pb, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) {
        if (shield > 0) {
          shield = 0;
          o.x = W + 40;                    // щит ломает препятствие
          beep(180, 0.15, 'sawtooth', 0.06);
        } else {
          gameOver();
          return;
        }
      }
    }
  }