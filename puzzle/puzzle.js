(function () {
  'use strict';

  /* ============ config ============ */
  var ROWS = 3, COLS = 3, N = ROWS * COLS;
  var CONTACT = 'Contrataciones.mayo214@gmail.com';
  var LS = { code: 'm214_code', dl: 'm214_deadline', best: 'm214_best', snd: 'm214_snd' };

  var boardEl = document.getElementById('board');
  var gridEl = document.getElementById('grid');
  var timeEl = document.getElementById('time');
  var movesEl = document.getElementById('moves');
  var progEl = document.getElementById('prog');
  var hintEl = document.getElementById('hint');
  var modal = document.getElementById('modal');
  var toastEl = document.getElementById('toast');
  var cta = document.getElementById('cta');

  var slots = [], tiles = [], selected = null;
  var moves = 0, seconds = 0, timerId = null, playing = false, locked = false;
  var lastResult = null;
  var unlocked = false;

  /* ============ sound (WebAudio, sin ficheros) ============ */
  var actx = null, soundOn = localStorage.getItem(LS.snd) !== '0';
  var sndBtn = document.getElementById('snd');
  var song = document.getElementById('song');
  if (!soundOn) sndBtn.classList.add('off');

  /* canción de fondo: «Nunca me fui» */
  if (song) {
    song.volume = 0.42;
    song.muted = !soundOn;
  }
  function playSong() {
    if (!song || !soundOn) return;
    var pr = song.play();
    if (pr && pr.catch) pr.catch(function () {});
  }
  function armSong() {
    function start() {
      playSong();
      document.removeEventListener('pointerdown', start, true);
      document.removeEventListener('keydown', start, true);
      document.removeEventListener('touchstart', start, true);
    }
    document.addEventListener('pointerdown', start, true);
    document.addEventListener('keydown', start, true);
    document.addEventListener('touchstart', start, true);
    playSong();
  }

  function ac() {
    if (!actx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      } catch (e) { return null; }
    }
    try { if (actx.state === 'suspended') actx.resume(); } catch (e) {}
    return actx;
  }
  function beep(freq, dur, type, vol, delay) {
    if (!soundOn) return;
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.09, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sndPick() { beep(720, 0.07, 'triangle', 0.07); }
  function sndSwap() { beep(430, 0.09, 'sine', 0.06); beep(640, 0.1, 'sine', 0.05, 0.05); }
  function sndWin() {
    [523, 659, 784, 1046, 1318].forEach(function (f, i) {
      beep(f, 0.5, 'triangle', 0.075, i * 0.1);
    });
    beep(130, 0.7, 'sine', 0.05, 0);
  }

  sndBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    localStorage.setItem(LS.snd, soundOn ? '1' : '0');
    sndBtn.classList.toggle('off', !soundOn);
    sndBtn.setAttribute('aria-pressed', String(soundOn));
    if (song) song.muted = !soundOn;
    if (soundOn) { playSong(); sndPick(); }
  });

  /* ============ construction ============ */
  function build() {
    gridEl.innerHTML = '';
    tiles = []; slots = [];
    for (var i = 0; i < N; i++) {
      var r = Math.floor(i / COLS), c = i % COLS;
      var t = document.createElement('div');
      t.className = 'tile';
      t.style.width = (100 / COLS) + '%';
      t.style.height = (100 / ROWS) + '%';
      t.style.backgroundSize = (COLS * 100) + '% ' + (ROWS * 100) + '%';
      t.style.backgroundPosition = (c / (COLS - 1) * 100) + '% ' + (r / (ROWS - 1) * 100) + '%';
      t.setAttribute('role', 'gridcell');
      t.setAttribute('tabindex', '0');
      t.dataset.tile = i;
      t.setAttribute('aria-label', 'Pieza ' + (i + 1));
      gridEl.appendChild(t);
      tiles.push(t);
    }
  }

  function place(tileId, slotIdx, animate) {
    var el = tiles[tileId];
    var c = slotIdx % COLS, r = Math.floor(slotIdx / COLS);
    if (!animate) el.style.transition = 'none';
    el.style.transform = 'translate(' + (c * 100) + '%,' + (r * 100) + '%)';
    if (!animate) { void el.offsetWidth; el.style.transition = ''; }
  }

  function render(animate) {
    for (var i = 0; i < N; i++) place(slots[i], i, animate);
  }

  function shuffle() {
    var arr;
    do {
      arr = [];
      for (var i = 0; i < N; i++) arr.push(i);
      for (var j = N - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp;
      }
    } while (!isHardEnough(arr));
    return arr;
  }

  function isHardEnough(arr) {
    var fixed = 0;
    for (var i = 0; i < N; i++) if (arr[i] === i) fixed++;
    return fixed === 0 && !isSolvedArr(arr);
  }

  function isSolvedArr(arr) {
    for (var i = 0; i < N; i++) if (arr[i] !== i) return false;
    return true;
  }

  function newGame() {
    if (locked) return;
    clearSelection();
    slots = shuffle();
    render(false);
    moves = 0; seconds = 0; playing = false;
    movesEl.textContent = '0';
    timeEl.textContent = '0:00';
    clearInterval(timerId); timerId = null;
    boardEl.classList.remove('win');
    updateProgress();
    hintEl.textContent = 'Toca dos piezas para intercambiarlas.';
    tiles.forEach(function (t) { t.classList.remove('done'); });
  }

  function updateProgress() {
    var ok = 0;
    for (var i = 0; i < N; i++) if (slots[i] === i) ok++;
    progEl.style.width = (ok / N * 100) + '%';
    if (!unlocked && ok > 0 && ok < N) hintEl.textContent = ok + ' de ' + N + ' piezas en su sitio.';
    return ok;
  }

  /* ============ interactions ============ */
  function slotOf(tileId) {
    for (var i = 0; i < N; i++) if (slots[i] === tileId) return i;
    return -1;
  }

  function clearSelection() {
    if (selected) tiles[selected].classList.remove('sel');
    selected = null;
  }

  function onTile(tileId) {
    if (locked || unlocked) return;
    if (selected === null) {
      selected = tileId;
      tiles[tileId].classList.add('sel');
      sndPick();
      if (navigator.vibrate) navigator.vibrate(8);
      return;
    }
    if (selected === tileId) { clearSelection(); return; }

    var a = slotOf(selected), b = slotOf(tileId);
    slots[a] = tileId; slots[b] = selected;
    place(selected, b, true);
    place(tileId, a, true);
    clearSelection();
    sndSwap();
    if (navigator.vibrate) navigator.vibrate(12);

    moves++;
    movesEl.textContent = moves;
    if (!playing) startTimer();
    var ok = updateProgress();
    if (ok === N) setTimeout(win, 220);
  }

  gridEl.addEventListener('click', function (e) {
    var t = e.target.closest('.tile');
    if (t) onTile(parseInt(t.dataset.tile, 10));
  });
  gridEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target.closest('.tile');
    if (!t) return;
    e.preventDefault();
    onTile(parseInt(t.dataset.tile, 10));
  });

  function startTimer() {
    playing = true;
    timerId = setInterval(function () {
      seconds++;
      timeEl.textContent = fmt(seconds);
    }, 1000);
  }

  function fmt(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ============ peek + shuffle ============ */
  var peekT = null;
  document.getElementById('peek').addEventListener('click', function () {
    boardEl.classList.add('peek-on');
    clearTimeout(peekT);
    peekT = setTimeout(function () { boardEl.classList.remove('peek-on'); }, 2200);
    beep(880, 0.05, 'sine', 0.04);
  });

  document.getElementById('shuffle').addEventListener('click', function () {
    unlocked = false;
    newGame();
    beep(300, 0.1, 'triangle', 0.05);
  });

  /* ============ win ============ */
  function win() {
    if (unlocked) return;
    unlocked = true; locked = true;
    clearInterval(timerId); timerId = null;

    for (var i = 0; i < N; i++) {
      (function (idx) {
        setTimeout(function () { tiles[idx].classList.add('done'); }, idx * 55);
      })(i);
    }
    boardEl.classList.add('win');
    hintEl.textContent = 'Puzzle completado.';
    progEl.style.width = '100%';
    sndWin();

    var best = parseInt(localStorage.getItem(LS.best) || '0', 10);
    if (!best || seconds < best) { localStorage.setItem(LS.best, String(seconds)); best = seconds; }
    lastResult = { t: seconds, m: moves, best: best };
    try { localStorage.setItem('m214_stats', JSON.stringify(lastResult)); } catch (e) {}
    paintStats(best);

    setTimeout(function () {
      flash();
      openModal();
    }, 950);
    setTimeout(function () { locked = false; }, 1400);
  }

  function flash() {
    var f = document.getElementById('flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  /* ============ modal ============ */
  var code = '';
  var deadline = 0;

  function makeCode() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return 'M214-VIP-' + s;
  }

  function openModal() {
    code = localStorage.getItem(LS.code);
    if (!code) { code = makeCode(); localStorage.setItem(LS.code, code); }
    deadline = parseInt(localStorage.getItem(LS.dl) || '0', 10);
    if (!deadline || deadline < Date.now()) {
      deadline = Date.now() + 48 * 3600 * 1000;
      localStorage.setItem(LS.dl, String(deadline));
    }
    document.getElementById('code').textContent = code;
    var st = lastResult;
    if (!st) { try { st = JSON.parse(localStorage.getItem('m214_stats') || 'null'); } catch (e) {} }
    if (st) paintStats(st.best || st.t); else paintStats(0);
    document.getElementById('passBtn').hidden = false;
    setCta();
    modal.classList.add('on');
    document.body.style.overflow = 'hidden';
    tickCd();
    burst(150);
    setTimeout(function () {
      var b = modal.querySelector('.cta'); if (b) b.focus({ preventScroll: true });
    }, 500);
  }

  function closeModal() {
    modal.classList.remove('on');
    document.body.style.overflow = '';
  }

  modal.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('on')) closeModal();
  });

  function paintStats(best) {
    var st = lastResult;
    if (!st) { try { st = JSON.parse(localStorage.getItem('m214_stats') || 'null'); } catch (e) {} }
    document.getElementById('wTime').textContent = st ? fmt(st.t) : '—';
    document.getElementById('wMoves').textContent = st ? String(st.m) : '—';
    document.getElementById('wBest').textContent = best ? fmt(best) : '—';
  }

  document.getElementById('passBtn').addEventListener('click', function () {
    seconds = 0; moves = 0;
    openModal();
  });

  function setCta() {
    var subject = 'Entrada anticipada 18 € · ' + code;
    var body = 'Hola.\n\nHe completado el puzzle del 214 y quiero mi entrada anticipada por 18 €.\n\n'
      + 'Código VIP: ' + code + '\n'
      + 'Tiempo: ' + fmt(seconds) + ' · Movimientos: ' + moves + '\n\n'
      + 'Gracias.';
    cta.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  var cdId = null;
  function tickCd() {
    clearInterval(cdId);
    var el = document.getElementById('cd');
    function upd() {
      var left = deadline - Date.now();
      if (left <= 0) {
        el.textContent = 'caducado';
        clearInterval(cdId);
        return;
      }
      var h = Math.floor(left / 3600000),
          m = Math.floor(left % 3600000 / 60000),
          s = Math.floor(left % 60000 / 1000);
      el.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    upd();
    cdId = setInterval(upd, 1000);
  }

  /* ============ confetti ============ */
  var cvs = document.getElementById('confetti');
  var ctx = cvs.getContext('2d');
  var parts = [], rafId = null;
  var COLORS = ['#FF4D6A', '#FF8A9B', '#F1F3F4', '#C1102E', '#FF3355'];

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = innerWidth * dpr;
    cvs.height = innerHeight * dpr;
    cvs.style.width = innerWidth + 'px';
    cvs.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  addEventListener('resize', sizeCanvas);

  function burst(n) {
    n = n || 120;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 3 + Math.random() * 11;
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: innerHeight * 0.42 + (Math.random() - 0.5) * 60,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 4,
        w: 4 + Math.random() * 7,
        h: 6 + Math.random() * 12,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.34,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0, max: 140 + Math.random() * 90
      });
    }
    if (!rafId) rafId = requestAnimationFrame(draw);
  }

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 0.16; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      var fade = Math.min(1, (p.max - p.life) / 45);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      if (p.life > p.max || p.y > innerHeight + 60) parts.splice(i, 1);
    }
    if (parts.length) {
      rafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      rafId = null;
    }
  }

  /* ============ toast ============ */
  var toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2000);
  }

  /* ============ copy code ============ */
  document.getElementById('copyBtn').addEventListener('click', function () {
    var txt = document.getElementById('code').textContent;
    function done() { toast('Código copiado'); beep(900, 0.08, 'sine', 0.06); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copia el código a mano'); }
      document.body.removeChild(ta);
    }
  });

  /* ============ poster ============ */
  document.getElementById('posterBtn').addEventListener('click', function () {
    var img = new Image();
    img.onload = function () { drawPoster(img); };
    img.onerror = function () { toast('No se pudo generar el pase'); };
    img.src = 'puzzle.jpg';
    toast('Generando tu pase…');
  });

  function drawPoster(img) {
    var W = 1080, H = 1350;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');

    g.drawImage(img, 0, 0, W, H);

    var grad = g.createLinearGradient(0, H * 0.42, 0, H);
    grad.addColorStop(0, 'rgba(7,11,16,0)');
    grad.addColorStop(0.55, 'rgba(7,11,16,.78)');
    grad.addColorStop(1, 'rgba(7,11,16,.98)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    var top = g.createLinearGradient(0, 0, 0, 260);
    top.addColorStop(0, 'rgba(7,11,16,.85)');
    top.addColorStop(1, 'rgba(7,11,16,0)');
    g.fillStyle = top; g.fillRect(0, 0, W, 260);

    g.fillStyle = '#FF3355';
    g.fillRect(64, 60, 64, 4);

    g.fillStyle = '#F1F3F4';
    g.font = '400 34px Anton, Impact, sans-serif';
    g.textBaseline = 'top';
    g.fillText('MAYO 214', 64, 82);

    g.fillStyle = 'rgba(241,243,244,.62)';
    g.font = '600 19px Inter, sans-serif';
    g.fillText('EXPERIENCIA VIP · EN DIRECTO', 64, 132);

    g.fillStyle = 'rgba(255,51,85,.95)';
    g.font = '700 22px Inter, sans-serif';
    g.fillText('ACCESO DESBLOQUEADO', 64, H - 400);

    g.fillStyle = '#F1F3F4';
    g.font = '400 118px Anton, Impact, sans-serif';
    g.fillText('PASE VIP', 60, H - 366);

    g.fillStyle = '#FF8A9B';
    g.fillRect(64, H - 218, W - 128, 1);

    g.fillStyle = '#F1F3F4';
    g.font = '600 30px ui-monospace, Menlo, monospace';
    g.fillText(code, 64, H - 196);

    g.fillStyle = 'rgba(241,243,244,.78)';
    g.font = '700 24px Inter, sans-serif';
    g.fillText('ENTRADA ANTICIPADA · 18 €', 64, H - 138);

    g.fillStyle = 'rgba(241,243,244,.42)';
    g.font = '400 19px Inter, sans-serif';
    g.fillText('Concierto MAYO 214 · ' + (seconds > 0 ? fmt(seconds) + ' · ' : '') + moves + ' movimientos', 64, H - 92);

    c.toBlob(function (blob) {
      if (!blob) { toast('No se pudo generar el pase'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mayo214-pase-vip-' + code.replace(/[^A-Z0-9]/gi, '') + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Pase descargado');
    }, 'image/png');
  }

  /* ============ share ============ */
  document.getElementById('shareBtn').addEventListener('click', function () {
    var url = location.href;
    var data = {
      title: 'MAYO 214 — El puzzle del 214',
      text: 'He desbloqueado el acceso anticipado a las entradas de MAYO 214 por 18 €. ¿Puedes tú?',
      url: url
    };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { toast('Enlace copiado'); });
    } else {
      toast(url);
    }
  });

  /* ============ init ============ */
  build();
  newGame();
  try { if (localStorage.getItem(LS.code)) document.getElementById('passBtn').hidden = false; } catch (e) {}
  armSong();
  window.addEventListener('load', function () {
    document.body.classList.add('ready');
  });
})();
