var lastTs = null;
  function loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state === 'running') {
      update(dt);
    } else {
      for (const c of clouds) { c.x -= 20 * c.s * dt; if (c.x < -60) c.x = W + 20; }
      for (const f of flakes) { f.y += f.v * dt; if (f.y > GROUND) f.y = -4; }
    }
    if (bannerT > 0) bannerT -= dt;
    if (flash > 0) flash = Math.max(0, flash - dt * 2);

    draw();
    requestAnimationFrame(loop);
  }

  // Поле ввода включается только на экране ввода ника
  if (nickInput) {
    nickInput.disabled = true;
    nickInput.maxLength = NAME_MAX;
    nickInput.addEventListener('input', () => {
      pendingName = nickInput.value.slice(0, NAME_MAX);
    });
    nickInput.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commitScore(); }
    });
  }

  function commitScore() {
    const nm = (nickInput && nickInput.value ? nickInput.value : pendingName).slice(0, NAME_MAX);
    saveRecord(nm || 'МИШКА', lastScore);
    showNickInput = false;
    showBoard = true;
    beep(880, 0.12);
    if (nickInput) { nickInput.blur(); nickInput.disabled = true; }
  }

  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  // Canvas вписан по object-fit: contain, поэтому поле может быть в рамках чёрных полос.
  // Переводим координаты указателя в систему координат игры (800x360).
  function gamePoint(e) {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(r.width / W, r.height / H);
    const dw = W * scale, dh = H * scale;
    const ox = r.left + (r.width - dw) / 2;
    const oy = r.top + (r.height - dh) / 2;
    return { px: (e.clientX - ox) / scale, py: (e.clientY - oy) / scale };
  }

  // ---------- Управление ----------
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyF') { toggleFullscreen(); return; }
    if (e.code === 'Enter' && showNickInput) { e.preventDefault(); commitScore(); return; }
    if (e.code === 'Escape') {
      if (showNickInput) { showNickInput = false; showBoard = true; if (nickInput) nickInput.blur(); }
      else if (showBoard) { showBoard = false; }
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();

    if (state === 'ready') {
      if (e.code === 'ArrowLeft') { cycleSkin(-1); return; }
      if (e.code === 'ArrowRight') { cycleSkin(1); return; }
    }
    if (showBoard && (e.code === 'Space' || e.code === 'Enter')) {
      showBoard = false;
      if (state === 'over') { reset(); return; }
      return;                              // из меню просто закрываем таблицу
    }
    if (state === 'over' && showNickInput) return;   // ждём ввода ника

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

    const pt = gamePoint(e);
    const px = pt.px, py = pt.py;

    // Кнопки меню
    if (state === 'ready') {
      if (inRect(px, py, UI.left)) { cycleSkin(-1); return; }
      if (inRect(px, py, UI.right)) { cycleSkin(1); return; }
      if (inRect(px, py, UI.board)) { showBoard = true; return; }
    }
    if (showNickInput) {
      if (inRect(px, py, UI.save)) { commitScore(); return; }
      // тап в любом месте просто фокусирует поле ввода ника
      if (nickInput) { try { nickInput.focus(); } catch (e) { /* нет фокуса */ } }
      return;
    }
    if (showBoard) {
      showBoard = false;
      if (state === 'over') { reset(); return; }
      return;                              // из меню просто закрываем таблицу
    }

    const yRel = py / H;
    if (yRel > 0.6) {
      duckHeld = true;
      if (state !== 'running') jump();
    } else {
      jump();
    }
  });
  var releaseDuck = () => { duckHeld = false; };
  canvas.addEventListener('pointerup', releaseDuck);
  canvas.addEventListener('pointerleave', releaseDuck);
  canvas.addEventListener('pointercancel', releaseDuck);

  requestAnimationFrame(loop);