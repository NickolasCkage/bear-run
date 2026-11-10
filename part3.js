function hash01(k) {
    const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Offscreen-канвас для дальнего плана: его можно размыть целиком
  var farCanvas = document.createElement('canvas');
  farCanvas.width = W;
  farCanvas.height = GROUND + 2;
  var fctx = farCanvas.getContext('2d');
  fctx.imageSmoothingEnabled = false;

  function lerpHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function drawSky(th, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, th.top);
    g.addColorStop(1, th.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND);
    if (th.stars) {
      for (const s of stars) {
        ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(s.t + Date.now() / 700)));
        ctx.fillStyle = PAL.w;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
      }
    }
    ctx.restore();
  }

  function drawClouds(th, alpha) {
    const spr = CLOUDS_BY_KEY[th.cloud];
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const c of clouds) drawSprite(spr, c.x, c.y);
    ctx.restore();
  }

  // Дальний план рисуется в offscreen, затем размывается целиком
  function drawFar(th, alpha) {
    const off = distance * 0.35;
    const i0 = Math.floor(off / 40);
    fctx.clearRect(0, 0, W, GROUND + 2);
    fctx.fillStyle = th.farColor;
    for (let i = 0; i < W / 40 + 3; i++) {
      const k = i0 + i;
      const x = k * 40 - off;
      const h = hash01(k);
      switch (th.far) {
        case 'fir': {
          const ht = 50 + h * 50;
          fctx.beginPath();
          fctx.moveTo(x - 14, GROUND); fctx.lineTo(x + 14, GROUND); fctx.lineTo(x, GROUND - ht);
          fctx.closePath(); fctx.fill();
          break;
        }
        case 'kremlin': {
          fctx.fillRect(x - 20, GROUND - 18, 40, 18);         // крепостная стена
          if (k % 3 === 0) {
            const ht = 70 + h * 40;
            fctx.fillRect(x - 12, GROUND - ht, 24, ht);       // башня
            fctx.beginPath();
            fctx.moveTo(x - 14, GROUND - ht); fctx.lineTo(x + 14, GROUND - ht);
            fctx.lineTo(x, GROUND - ht - 34);
            fctx.closePath(); fctx.fill();
            fctx.fillStyle = PAL.y;                            // рубиновая звезда
            fctx.fillRect(x - 2, GROUND - ht - 42, 4, 6);
            fctx.fillStyle = th.farColor;
          }
          break;
        }
        case 'mountain': {
          if (k % 3 !== 0) break;
          const ht = 70 + h * 70;
          fctx.beginPath();
          fctx.moveTo(x - 80, GROUND); fctx.lineTo(x, GROUND - ht); fctx.lineTo(x + 80, GROUND);
          fctx.closePath(); fctx.fill();
          break;
        }
        case 'autumn': {
          fctx.beginPath();
          fctx.arc(x, GROUND - 22 - h * 10, 16 + h * 8, 0, Math.PI * 2);
          fctx.fill();
          break;
        }
        case 'hills': {
          fctx.beginPath();
          fctx.ellipse(x, GROUND, 60 + h * 30, 30 + h * 25, 0, Math.PI, 0);
          fctx.fill();
          break;
        }
        case 'ryazan': {
          // Кремль Рязани: стена, башни, собор
          fctx.fillRect(x - 22, GROUND - 20, 44, 20);
          if (k % 4 === 0) {
            const ht = 60 + h * 30;
            fctx.fillRect(x - 10, GROUND - ht, 20, ht);
            fctx.beginPath();
            fctx.moveTo(x - 12, GROUND - ht); fctx.lineTo(x + 12, GROUND - ht);
            fctx.lineTo(x, GROUND - ht - 26);
            fctx.closePath(); fctx.fill();
          }
          if (k % 4 === 2) {
            // Собор с куполом
            fctx.fillRect(x - 12, GROUND - 46, 24, 46);
            fctx.beginPath();
            fctx.arc(x, GROUND - 46, 12, Math.PI, 0);
            fctx.closePath(); fctx.fill();
            fctx.fillRect(x - 2, GROUND - 70, 4, 12);
          }
          break;
        }
      }
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    if (HAS_FILTER) ctx.filter = 'blur(1.6px)';
    ctx.drawImage(farCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }

  function drawGround(th, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
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
    ctx.restore();
  }

  function drawFlakes() {
    ctx.fillStyle = PAL.s;
    for (const f of flakes) ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
  }

  function drawObstacles() {
    for (const o of obstacles) {
      const frame = o.frames[Math.floor(o.t * 6) % o.frames.length];
      drawOutlined(frame, o.x, o.y);
    }
  }

  function drawPickups() {
    for (const p of pickups) {
      if (p.got) continue;
      const bob = Math.sin(p.t * 5) * 3;
      // медальон-рублёвик
      ctx.fillStyle = '#111111';
      ctx.fillRect(Math.round(p.x + 1), Math.round(p.y + bob + 1), 20, 18);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(Math.round(p.x + 3), Math.round(p.y + bob + 3), 16, 14);
      ctx.fillStyle = '#8a6a1f';
      ctx.fillRect(Math.round(p.x + 9), Math.round(p.y + bob + 6), 4, 8);
      ctx.fillRect(Math.round(p.x + 6), Math.round(p.y + bob + 8), 10, 4);
    }
  }

  function drawPlayer() {
    const sp = currentSprite();
    const x = player.x, y = player.y - sp.h;
    if (shield > 0) {
      // пульсирующий щит вокруг героя
      const pulse = 0.45 + 0.25 * Math.sin(Date.now() / 90);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + sp.w / 2, y + sp.h / 2, sp.w * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawOutlined(sp, x, y);
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
    if (coins > 0) drawText(`РУБЛИ ${coins}`, 20, 52, 13, '#ffd700', 'left');
  }

  function drawBanner() {
    if (bannerT <= 0) return;
    ctx.globalAlpha = Math.min(1, bannerT);
    drawText(`ЛОКАЦИЯ: ${theme().name.toUpperCase()}`, W / 2, 90, 22, '#ffd700', 'center');
    ctx.globalAlpha = 1;
  }

  function drawButton(rect, label, hot) {
    ctx.fillStyle = hot ? '#ffd700' : '#ffffff';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#0039a6';
    ctx.fillRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
    drawText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 6, 16, '#ffffff', 'center');
  }

  function drawSkinPreview(cx, cy) {
    const sp = BEAR_RUN[0];
    drawOutlined(sp, cx - sp.w / 2, cy - sp.h);
  }

  // Экран перед стартом: выбор скина и таблица рекордов
  function drawMenu() {
    ctx.fillStyle = 'rgba(11, 26, 51, 0.68)';
    ctx.fillRect(0, 0, W, H);

    drawText('МИШКА НА СНЕГУ', W / 2, 46, 30, '#ffd700', 'center');
    drawText('Выбери наряд и начинай забег', W / 2, 74, 14, '#cfe9ff', 'center');

    // Кнопки скина
    drawButton(UI.left, '◀', false);
    drawButton(UI.right, '▶', false);
    drawSkinPreview(400, 190);
    drawText(`СКИН: ${SKINS[skinIdx].name}`, W / 2, 205, 14, '#ffffff', 'center');

    drawButton(UI.board, 'ТАБЛИЦА РЕКОРДОВ', false);
    drawText('ПРОБЕЛ / ТАП — НАЧАТЬ БЕГ', W / 2, 320, 15, '#ffffff', 'center');
  }

  function drawBoard() {
    ctx.fillStyle = 'rgba(11, 26, 51, 0.82)';
    ctx.fillRect(0, 0, W, H);
    drawText('ТАБЛИЦА РЕКОРДОВ', W / 2, 40, 24, '#ffd700', 'center');
    if (!board.length) {
      drawText('Пока пусто. Будь первым!', W / 2, 170, 15, '#cfe9ff', 'center');
    } else {
      for (let i = 0; i < board.length; i++) {
        const e = board[i];
        const y = 76 + i * 24;
        const medal = i === 0 ? '★' : i === 1 ? '☆' : ' ';
        drawText(`${medal} ${i + 1}.`, 190, y, 15, '#ffffff', 'left');
        drawText(e.name.slice(0, NAME_MAX), 290, y, 15, '#ffffff', 'left');
        drawText(String(e.score), 610, y, 15, '#ffd700', 'right');
      }
    }
    drawText('ПРОБЕЛ / ТАП — НАЗАД', W / 2, 330, 14, '#cfe9ff', 'center');
  }

  // Экран ввода ника после рекорда
  function drawNickScreen() {
    ctx.fillStyle = 'rgba(11, 26, 51, 0.82)';
    ctx.fillRect(0, 0, W, H);
    drawText('НОВЫЙ РЕКОРД!', W / 2, 60, 28, '#ffd700', 'center');
    drawText(`Счёт: ${lastScore}`, W / 2, 100, 18, '#ffffff', 'center');
    drawText('Введи ник:', W / 2, 140, 15, '#cfe9ff', 'center');
    // рамка поля ввода
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(UI.nick.x, UI.nick.y, UI.nick.w, UI.nick.h);
    ctx.fillStyle = '#0b1a33';
    ctx.fillRect(UI.nick.x + 3, UI.nick.y + 3, UI.nick.w - 6, UI.nick.h - 6);
    const nm = (nickInput && nickInput.value ? nickInput.value : pendingName).slice(0, NAME_MAX);
    if (nm) drawText(nm, UI.nick.x + 12, UI.nick.y + 24, 17, '#ffffff', 'left');
    else drawText('мишка', UI.nick.x + 12, UI.nick.y + 24, 17, '#5a6a8c', 'left');
    drawButton(UI.save, 'СОХРАНИТЬ РЕКОРД', false);
    drawText('ENTER — сохранить, ESC — без ника', W / 2, 300, 12, '#cfe9ff', 'center');
  }

  function drawOverlay() {
    if (showBoard) { drawBoard(); return; }
    if (showNickInput) { drawNickScreen(); return; }
    if (state === 'ready') { drawMenu(); return; }
    if (state === 'over') {
      ctx.fillStyle = 'rgba(11, 26, 51, 0.6)';
      ctx.fillRect(0, 0, W, GROUND);
      drawText('ИГРА ОКОНЧЕНА', W / 2, 110, 26, '#d52b1e', 'center');
      drawText(`Счёт: ${score}`, W / 2, 142, 16, '#fff', 'center');
      drawText('ПРОБЕЛ ИЛИ ТАП — ЗАНОВО', W / 2, 172, 14, '#cfe9ff', 'center');
    }
  }

  function draw() {
    const th = theme();
    const prev = prevTheme();
    const t = transT;
    ctx.clearRect(0, 0, W, H);

    if (t < 1) {
      // Плавный переход: сначала старая локация, поверх неё наплывает новая
      drawSky(prev, 1);
      drawClouds(prev, 1);
      drawFar(prev, 1);
      if (prev.snowflakes) drawFlakes();
      drawGround(prev, 1);
      drawSky(th, t);
      drawClouds(th, t);
      drawFar(th, t);
      if (th.snowflakes) drawFlakes();
      drawGround(th, t);
    } else {
      drawSky(th, 1);
      drawClouds(th, 1);
      drawFar(th, 1);
      if (th.snowflakes) drawFlakes();
      drawGround(th, 1);
    }

    drawPickups();
    drawObstacles();
    drawPlayer();
    drawHUD();
    drawBanner();
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.55;
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