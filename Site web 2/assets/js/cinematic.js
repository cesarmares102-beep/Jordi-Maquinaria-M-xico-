/* ==========================================================================
   Jordi Maquinaria — Cinematic Scrollytelling engine (desktop + mobile)
   --------------------------------------------------------------------------
   Sistema de escenas con dos formas de conducirlo:

     · DESKTOP (modo "scrub"): la posición de scroll conduce todo sobre un
       escenario alto.
     · MOBILE  (modo "step"):  el scroll queda bloqueado; cada gesto avanza
       UNA parada con transición animada y bloqueo temporal.

   La escena "Aplicaciones" (índice APPS_IDX) NO ocupa 1 unidad de scroll
   sino APPS_UNITS extra: mientras se recorren, la escena permanece fija y
   una galería horizontal interna se desplaza (h: 0 → 1). Al terminar la
   galería, el siguiente gesto continúa a la escena siguiente.

   Todo el estado (posición de escenas, galería, indicador) deriva de una
   sola posición -> nunca se desincroniza ni queda el viewport vacío.
   ========================================================================== */
(() => {
  'use strict';

  /* i18n: usa el diccionario de i18n.js si está cargado, con respaldo inglés. */
  const T = (key, fallback) =>
    (typeof window.__t === 'function' ? window.__t(key) : fallback);

  const main = document.querySelector('main.stage');
  const topbar = document.querySelector('.topbar');
  const indicator = document.querySelector('.scene-indicator');
  const scenes = main ? [...main.querySelectorAll(':scope > .scene')] : [];
  const dots = indicator ? [...indicator.querySelectorAll('[data-scene-button]')] : [];
  const N = scenes.length;

  const mqDesktop = window.matchMedia('(min-width: 900px)');
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!main || N < 2) return;

  /* ----- sensación ----- */
  const HOLD = 0.46;
  const OUT_CONTENT_DIM = 0.4;
  const SETTLE_MS = 520;
  const SETTLE_IDLE = 150;

  const STEP_MS = 700;
  const STEP_COOLDOWN = 90;
  const WHEEL_TRIGGER = 14;
  const SWIPE_DIST = 44;
  const SWIPE_FLICK = 24;
  const SWIPE_TIME = 320;

  /* Galería de Aplicaciones en MÓVIL: swipe horizontal = cambia de aplicación */
  const APP_SWIPE_MS = 520;
  const SWIPE_H_DIST = 40;
  const SWIPE_H_FLICK = 22;

  /* ----- galería de Aplicaciones ----- */
  const APPS_IDX = scenes.findIndex((s) => s.hasAttribute('data-apps'));
  const HAS_APPS = APPS_IDX >= 0;
  const APPS_UNITS = 3;                        // unidades de scroll extra para la galería
  const APPS_COUNT = HAS_APPS ? scenes[APPS_IDX].querySelectorAll('.app').length : 0;
  const appsGallery = HAS_APPS ? scenes[APPS_IDX].querySelector('.apps-gallery') : null;
  const appsTrack = HAS_APPS ? scenes[APPS_IDX].querySelector('.apps-track') : null;
  const appEls = HAS_APPS ? [...scenes[APPS_IDX].querySelectorAll('.app')] : [];
  let appsMaxShift = 0;

  const EXTRA = HAS_APPS ? APPS_UNITS : 0;
  const TOTAL_UNITS = (N - 1) + EXTRA;         // unidades de scroll totales

  // u (unidad de scroll) -> { p (posición de escena 0..N-1), h (galería 0..1) }
  function mapU(u) {
    u = clamp(u, 0, TOTAL_UNITS);
    if (!HAS_APPS || u <= APPS_IDX) return { p: u, h: 0 };
    if (u <= APPS_IDX + EXTRA) return { p: APPS_IDX, h: (u - APPS_IDX) / EXTRA };
    return { p: APPS_IDX + (u - APPS_IDX - EXTRA), h: 1 };
  }
  // u donde ARRANCA cada escena (para navegación por menú)
  const sceneU = scenes.map((_, i) => (HAS_APPS && i > APPS_IDX ? i + EXTRA : i));
  // paradas (modo step): escenas normales + 1 parada por aplicación
  const STOPS = (() => {
    const s = [];
    for (let i = 0; i < N; i++) {
      if (HAS_APPS && i === APPS_IDX) {
        for (let a = 0; a < APPS_COUNT; a++) s.push(APPS_IDX + (a / (APPS_COUNT - 1)) * EXTRA);
      } else {
        s.push(sceneU[i]);
      }
    }
    return s;
  })();

  /* ----- direcciones de entrada (rotación derecha → abajo → izquierda → arriba …) -----
     0 inicio · 1 equipos · 2 calidad · 3 nosotros · 4 aplicaciones · 5 contacto */
  const ENTER = [ [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 0] ];
  const EXIT = ENTER.map((_, i) => {
    const nxt = ENTER[i + 1];
    return nxt ? [-nxt[0], -nxt[1]] : [0, 0];
  });

  const NAV_DARK = new Set([1]);
  const BRAND_LIGHT = new Set([4, 5]);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  const reveals = scenes.map((sc) => [...sc.querySelectorAll(':scope [data-reveal]')]);
  const bgs = scenes.map((sc) => sc.querySelector(':scope > [data-bg]'));

  let mode = 'off';
  let displayed = -1;
  let curH = -1;
  let lastAppIdx = -1;

  function measureApps() {
    if (!appsTrack || !appsGallery) return;
    appsMaxShift = Math.max(0, appsTrack.scrollWidth - appsGallery.clientWidth);
  }

  /* ----------------------------------------------------------------------
     "Leer más" dentro de una aplicación de la galería
     - Al abrir, el texto completo se despliega y el bloque de texto queda
       marcado [data-scene-scroll]: mientras se pueda seguir leyendo, el
       gesto de scroll alimenta ESE bloque y no cambia de aplicación.
     - Al llegar al límite (o al pulsar "Leer menos") se recupera la
       navegación cinematográfica normal.
     ---------------------------------------------------------------------- */
  let openApp = null;
  const appTextOf = (a) => (a ? a.querySelector('.app__text') : null);

  // fija el alto objetivo del bloque desplegable midiendo su contenido real
  function sizeMore(a) {
    const more = a && a.querySelector('.app__more');
    if (!more) return;
    if (a.classList.contains('is-open')) {
      more.style.maxHeight = 'none';
      const h = more.scrollHeight;
      more.style.maxHeight = '0px';
      void more.offsetHeight;                 // fuerza reflow -> transición real
      more.style.maxHeight = h + 'px';
    } else {
      more.style.maxHeight = '';
    }
  }

  function closeApp() {
    if (!openApp) return;
    const a = openApp;
    openApp = null;
    a.classList.remove('is-open');
    const btn = a.querySelector('.app__toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      const lb = btn.querySelector('.app__toggle-label');
      const ar = btn.querySelector('.app__toggle-arrow');
      if (lb) lb.textContent = T('ap.readMore', 'Read more');
      if (ar) ar.textContent = '→';
    }
    const more = a.querySelector('.app__more');
    if (more) more.style.maxHeight = '';
    const txt = appTextOf(a);
    if (txt) { txt.removeAttribute('data-scene-scroll'); txt.scrollTop = 0; }
  }

  function openAppEl(a) {
    if (!a) return;
    if (openApp && openApp !== a) closeApp();
    openApp = a;
    a.classList.add('is-open');
    const btn = a.querySelector('.app__toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      const lb = btn.querySelector('.app__toggle-label');
      const ar = btn.querySelector('.app__toggle-arrow');
      if (lb) lb.textContent = T('ap.readLess', 'Read less');
      if (ar) ar.textContent = '↑';
    }
    sizeMore(a);
    const txt = appTextOf(a);
    if (txt) { txt.setAttribute('data-scene-scroll', ''); txt.scrollTop = 0; }
  }

  function toggleAppEl(a) {
    if (!a) return;
    if (openApp === a) closeApp(); else openAppEl(a);
  }

  // ¿El texto abierto absorbe este gesto? (modo scrub/desktop y teclado)
  function openAppConsumes(dir, deltaPx) {
    if (!openApp) return false;
    const txt = appTextOf(openApp);
    if (!txt) return false;
    const can = dir > 0
      ? txt.scrollTop + txt.clientHeight < txt.scrollHeight - 1
      : txt.scrollTop > 1;
    if (can) {
      if (typeof deltaPx === 'number') txt.scrollTop += deltaPx;
      return true;
    }
    closeApp();          // en el límite: liberar el gesto a la navegación
    return false;
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.app__toggle');
    if (!btn) return;
    event.preventDefault();
    toggleAppEl(btn.closest('.app'));
  });

  /* ======================================================================
     applyFrame(p, h) — núcleo visual compartido
     ====================================================================== */
  function applyFrame(p, h) {
    p = clamp(p, 0, N - 1);
    h = clamp(h || 0, 0, 1);
    let base = Math.floor(p);
    if (base > N - 2) base = N - 2;
    const frac = p - base;

    const t = mode === 'step'
      ? easeInOut(clamp(frac, 0, 1))
      : easeInOut(clamp(frac <= HOLD ? 0 : (frac - HOLD) / (1 - HOLD), 0, 1));

    const nowDisplayed = t < 0.5 ? base : base + 1;

    for (let i = 0; i < N; i++) {
      const sc = scenes[i];
      let role, tx, ty;

      if (i < base) {
        role = 'previous';
        tx = EXIT[i][0] * 100; ty = EXIT[i][1] * 100;
      } else if (i > base + 1) {
        role = 'next';
        tx = ENTER[i][0] * 100; ty = ENTER[i][1] * 100;
      } else if (i === base) {
        role = 'active';
        tx = EXIT[i][0] * 100 * t; ty = EXIT[i][1] * 100 * t;
      } else {
        role = 'active-in';
        tx = ENTER[i][0] * 100 * (1 - t); ty = ENTER[i][1] * 100 * (1 - t);
      }

      sc.style.transform = `translate3d(${tx.toFixed(3)}%, ${ty.toFixed(3)}%, 0)`;
      sc.style.opacity = '1';
      if (sc.dataset.role !== role) sc.dataset.role = role;
      sc.inert = i !== nowDisplayed;

      const items = reveals[i];
      // stagger adaptativo: escenas con muchos elementos comprimen el paso
      // para mantener ~100-180ms de sensación sin alargar la secuencia.
      const step = items.length > 1 ? Math.min(0.095, 0.55 / (items.length - 1)) : 0;
      for (let k = 0; k < items.length; k++) {
        // recorrido jerarquizado: 02 label (corto) · 03 título (más largo) · 04 contenido
        const travel = k === 0 ? 14 : k === 1 ? 34 : 20;
        if (role === 'active-in') {
          const lag = k * step;
          const it = clamp((t - lag) / (1 - lag - 0.14), 0, 1);
          const e = easeOut(it);
          items[k].style.opacity = e.toFixed(3);
          items[k].style.transform = `translate3d(0, ${((1 - e) * travel).toFixed(2)}px, 0)`;
        } else if (role === 'active') {
          const e = easeOut(clamp(t, 0, 1));
          items[k].style.opacity = (1 - OUT_CONTENT_DIM * e).toFixed(3);
          items[k].style.transform = `translate3d(0, ${(-e * 12).toFixed(2)}px, 0)`;
        } else {
          items[k].style.opacity = '0';
          items[k].style.transform = `translate3d(0, ${travel}px, 0)`;
        }
      }

      const bg = bgs[i];
      if (bg) {
        let shift = 0;
        let zoom = 1.07;                              // base de parallax (sin cambio en reposo)
        if (i === base) shift = (frac - 0.5) * 3.2;
        else if (i === base + 1) {                    // escena entrando: la foto se asienta
          shift = (1 - t) * -2.4;
          zoom = 1.07 + (1 - t) * 0.03;               // ~1.10 -> 1.07 (efecto 05: escala sutil)
        }
        bg.style.transform = `scale(${zoom.toFixed(4)}) translate3d(0, ${shift.toFixed(3)}%, 0)`;
      }
    }

    /* --- galería horizontal de Aplicaciones --- */
    if (appsTrack && h !== curH) {
      curH = h;
      appsTrack.style.transform = `translate3d(${(-h * appsMaxShift).toFixed(1)}px, 0, 0)`;
    }

    /* --- indicador: escena visible, o aplicación visible si estamos en la galería --- */
    const inApps = HAS_APPS && nowDisplayed === APPS_IDX;
    if (inApps) {
      const appIdx = clamp(Math.round(h * (APPS_COUNT - 1)), 0, APPS_COUNT - 1);
      if (appIdx !== lastAppIdx) {
        lastAppIdx = appIdx;
        for (let i = 0; i < dots.length; i++) dots[i].setAttribute('aria-current', String(i === appIdx));
        // efecto 05: la aplicación centrada adquiere protagonismo
        for (let i = 0; i < appEls.length; i++) appEls[i].classList.toggle('is-focus', i === appIdx);
      }
      indicator?.style.setProperty('--seg', String(h));
    } else {
      if (lastAppIdx !== -1) for (let i = 0; i < appEls.length; i++) appEls[i].classList.remove('is-focus');
      lastAppIdx = -1;
      if (nowDisplayed !== displayed) {
        for (let i = 0; i < dots.length; i++) dots[i].setAttribute('aria-current', String(i === nowDisplayed));
      }
      indicator?.style.setProperty('--seg', String((base + t) / (N - 1)));
    }

    if (nowDisplayed !== displayed) {
      displayed = nowDisplayed;
      topbar.classList.toggle('nav-dark', NAV_DARK.has(displayed));
      topbar.classList.toggle('brand-light', BRAND_LIGHT.has(displayed));
      topbar.classList.toggle('at-hero', displayed === 0);
      indicator?.classList.toggle('on-dark', !NAV_DARK.has(displayed));
    }
    document.body.classList.toggle('in-apps', inApps);
    if (!inApps && openApp) closeApp();
  }

  /* ======================================================================
     MODO SCRUB (desktop)
     ====================================================================== */
  let rafId = 0;
  let lastY = -1;
  let idleTimer = 0;
  let settleAnim = 0;

  function scrubTick() {
    rafId = 0;
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    const { p, h } = mapU(y / window.innerHeight);
    applyFrame(p, h);
  }
  function requestScrub() { if (!rafId) rafId = requestAnimationFrame(scrubTick); }
  function cancelSettle() { if (settleAnim) { cancelAnimationFrame(settleAnim); settleAnim = 0; } }

  function scheduleSettle() {
    if (openApp) return;            // no reacomodar mientras se lee "Leer más"
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const u = clamp(window.scrollY / window.innerHeight, 0, TOTAL_UNITS);
      // parada más cercana (escenas + aplicaciones)
      let near = STOPS[0];
      for (const s of STOPS) if (Math.abs(s - u) < Math.abs(near - u)) near = s;
      if (Math.abs(near - u) < 0.015) return;
      const from = window.scrollY;
      const dist = near * window.innerHeight - from;
      if (Math.abs(dist) < 1) return;
      const t0 = performance.now();
      cancelSettle();
      const step = () => {
        const k = clamp((performance.now() - t0) / SETTLE_MS, 0, 1);
        window.scrollTo(0, from + dist * easeInOut(k));
        if (k < 1) settleAnim = requestAnimationFrame(step); else settleAnim = 0;
      };
      settleAnim = requestAnimationFrame(step);
    }, SETTLE_IDLE);
  }

  function onScrubScroll() { cancelSettle(); requestScrub(); scheduleSettle(); }

  // Mientras una aplicación está expandida, el scroll/teclado alimentan su
  // lectura interna antes de permitir avanzar de escena.
  function onScrubWheel(e) {
    if (!openApp) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    if (openAppConsumes(dir, e.deltaY)) {
      e.preventDefault();
      cancelSettle();
    }
  }
  function onScrubKey(e) {
    if (!openApp) return;
    const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key);
    const up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!down && !up) return;
    if (openAppConsumes(down ? 1 : -1, (down ? 1 : -1) * 60)) e.preventDefault();
  }

  function enterScrub() {
    mode = 'scrub';
    document.body.classList.add('cinematic-on');
    document.body.classList.remove('cinematic-step', 'reveal-on');
    main.style.height = `${(TOTAL_UNITS + 1) * 100}svh`;
    if (indicator) indicator.hidden = false;
    displayed = -1; lastY = -1; curH = -1;
    measureApps();
    window.addEventListener('scroll', onScrubScroll, { passive: true });
    window.addEventListener('wheel', onScrubWheel, { passive: false });
    window.addEventListener('keydown', onScrubKey);
    const { p, h } = mapU(window.scrollY / window.innerHeight);
    applyFrame(p, h);
  }
  function exitScrub() {
    window.removeEventListener('scroll', onScrubScroll);
    window.removeEventListener('wheel', onScrubWheel);
    window.removeEventListener('keydown', onScrubKey);
    closeApp();
    cancelSettle(); clearTimeout(idleTimer);
    main.style.removeProperty('height');
  }

  /* ======================================================================
     MODO STEP (mobile): cada gesto avanza UNA parada
     ====================================================================== */
  let mp = 0;                  // posición continua (u) durante la transición
  let index = 0;               // índice de parada asentada (en STOPS)
  let locked = false;
  let stepAnim = 0;
  let appAnim = 0;             // rAF del carrusel de apps (móvil)
  let touchY = 0, touchX = 0, touchT = 0, touchScroller = null, touchAxis = null;

  function tweenTo(stopIdx) {
    stopIdx = clamp(Math.round(stopIdx), 0, STOPS.length - 1);
    if (locked || stopIdx === index) return;
    closeApp();
    locked = true;
    const from = mp;
    const target = STOPS[stopIdx];
    const t0 = performance.now();
    if (stepAnim) cancelAnimationFrame(stepAnim);
    const run = () => {
      const k = clamp((performance.now() - t0) / STEP_MS, 0, 1);
      mp = from + (target - from) * easeInOut(k);
      const f = mapU(mp);
      applyFrame(f.p, f.h);
      if (k < 1) {
        stepAnim = requestAnimationFrame(run);
      } else {
        stepAnim = 0; mp = target; index = stopIdx;
        const g = mapU(mp); applyFrame(g.p, g.h);
        setTimeout(() => { locked = false; }, STEP_COOLDOWN);
      }
    };
    setTimeout(() => {
      if (!locked) return;
      if (stepAnim) { cancelAnimationFrame(stepAnim); stepAnim = 0; }
      mp = target; index = stopIdx;
      const g = mapU(mp); applyFrame(g.p, g.h); locked = false;
    }, STEP_MS + 250);
    stepAnim = requestAnimationFrame(run);
  }
  const stepNext = () => tweenTo(index + 1);
  const stepPrev = () => tweenTo(index - 1);

  function scrollerCanTake(node, dir) {
    const el = node && node.closest ? node.closest('[data-scene-scroll]') : null;
    if (!el) return false;
    if (dir > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    return el.scrollTop > 1;
  }

  function onStepWheel(e) {
    // Galería de apps (móvil): rueda/trackpad HORIZONTAL cambia de aplicación.
    if (inAppsStep() && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      if (!locked && Math.abs(e.deltaX) >= WHEEL_TRIGGER) {
        tweenAppTo(curAppIndex() + (e.deltaX > 0 ? 1 : -1));
      }
      return;
    }
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    if (scrollerCanTake(e.target, dir)) return;
    e.preventDefault();
    if (locked || Math.abs(e.deltaY) < WHEEL_TRIGGER) return;
    // en la galería, el gesto vertical SALE de la escena (no recorre las apps)
    if (inAppsStep()) { tweenTo(dir > 0 ? SCENE_AFTER_APPS : SCENE_BEFORE_APPS); return; }
    dir > 0 ? stepNext() : stepPrev();
  }
  function onStepTouchStart(e) {
    const tt = e.touches[0];
    touchY = tt.clientY; touchX = tt.clientX; touchT = performance.now();
    touchScroller = e.target;
    touchAxis = null;
  }
  function onStepTouchMove(e) {
    const tt = e.touches[0];
    const dy = tt.clientY - touchY;
    const dx = tt.clientX - touchX;
    if (!touchAxis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    // gesto horizontal dentro de la galería -> lo controla el carrusel
    if (inAppsStep() && touchAxis === 'x') { e.preventDefault(); return; }
    if (Math.abs(dy) < Math.abs(dx)) return;
    const dir = dy < 0 ? 1 : -1;
    if (scrollerCanTake(touchScroller, dir)) return;
    e.preventDefault();
  }
  function onStepTouchEnd(e) {
    const tt = e.changedTouches[0];
    const dy = tt.clientY - touchY;
    const dx = tt.clientX - touchX;
    const dt = performance.now() - touchT;

    // --- carrusel horizontal de aplicaciones (solo móvil, dentro de la escena) ---
    if (inAppsStep() && (touchAxis === 'x' || (touchAxis !== 'y' && Math.abs(dx) > Math.abs(dy)))) {
      const far = Math.abs(dx) >= SWIPE_H_DIST || (Math.abs(dx) >= SWIPE_H_FLICK && dt <= SWIPE_TIME);
      if (far) tweenAppTo(curAppIndex() + (dx < 0 ? 1 : -1));
      return;
    }

    if (Math.abs(dy) < Math.abs(dx)) return;
    const dir = dy < 0 ? 1 : -1;
    if (scrollerCanTake(touchScroller, dir)) return;
    const far = Math.abs(dy) >= SWIPE_DIST || (Math.abs(dy) >= SWIPE_FLICK && dt <= SWIPE_TIME);
    if (!far) return;
    // dentro de la galería: el swipe vertical SALE de la escena
    if (inAppsStep()) { tweenTo(dir > 0 ? SCENE_AFTER_APPS : SCENE_BEFORE_APPS); return; }
    dir > 0 ? stepNext() : stepPrev();
  }
  function onStepKey(e) {
    const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key);
    const up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (openApp && (down || up)) {
      e.preventDefault();
      if (openAppConsumes(down ? 1 : -1, (down ? 1 : -1) * 60)) return;
    }
    // galería de apps en móvil: ← / → cambian de aplicación; ↑ / ↓ salen de la escena
    if (inAppsStep() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      tweenAppTo(curAppIndex() + (e.key === 'ArrowRight' ? 1 : -1));
      return;
    }
    if (inAppsStep() && (down || up)) {
      e.preventDefault();
      tweenTo(down ? SCENE_AFTER_APPS : SCENE_BEFORE_APPS);
      return;
    }
    if (down) { e.preventDefault(); stepNext(); }
    else if (up) { e.preventDefault(); stepPrev(); }
    else if (e.key === 'Home') { e.preventDefault(); tweenTo(0); }
    else if (e.key === 'End') { e.preventDefault(); tweenTo(STOPS.length - 1); }
  }

  function nearestStopIndex(u) {
    let bi = 0;
    for (let i = 1; i < STOPS.length; i++) {
      if (Math.abs(STOPS[i] - u) < Math.abs(STOPS[bi] - u)) bi = i;
    }
    return bi;
  }

  /* ----- carrusel horizontal de Aplicaciones (SOLO móvil / modo step) -----
     El swipe horizontal recorre 01…06; el swipe vertical solo entra/sale de
     la escena (a la escena anterior o siguiente, sin recorrer las apps). */
  const SCENE_BEFORE_APPS = HAS_APPS ? nearestStopIndex(sceneU[APPS_IDX - 1]) : -1;
  const SCENE_AFTER_APPS = HAS_APPS ? nearestStopIndex(sceneU[APPS_IDX + 1]) : -1;
  const inAppsStep = () => mode === 'step' && HAS_APPS && displayed === APPS_IDX;
  const curAppIndex = () =>
    clamp(Math.round(((mp - APPS_IDX) / EXTRA) * (APPS_COUNT - 1)), 0, APPS_COUNT - 1);

  function tweenAppTo(targetIdx) {
    if (!HAS_APPS) return;
    targetIdx = clamp(targetIdx, 0, APPS_COUNT - 1);
    const targetU = APPS_IDX + (targetIdx / (APPS_COUNT - 1)) * EXTRA;
    if (locked || Math.abs(targetU - mp) < 0.0015) return;
    closeApp();
    locked = true;
    const from = mp;
    const t0 = performance.now();
    if (appAnim) cancelAnimationFrame(appAnim);
    const finish = () => {
      appAnim = 0; mp = targetU; index = nearestStopIndex(mp);
      const g = mapU(mp); applyFrame(g.p, g.h);
    };
    const run = () => {
      const k = clamp((performance.now() - t0) / APP_SWIPE_MS, 0, 1);
      mp = from + (targetU - from) * easeInOut(k);
      const f = mapU(mp); applyFrame(f.p, f.h);
      if (k < 1) appAnim = requestAnimationFrame(run);
      else { finish(); setTimeout(() => { locked = false; }, STEP_COOLDOWN); }
    };
    setTimeout(() => {
      if (locked && appAnim) { cancelAnimationFrame(appAnim); finish(); locked = false; }
    }, APP_SWIPE_MS + 250);
    appAnim = requestAnimationFrame(run);
  }

  function enterStep() {
    mode = 'step';
    index = nearestStopIndex((window.scrollY || 0) / window.innerHeight);
    mp = STOPS[index];
    document.body.classList.add('cinematic-on', 'cinematic-step');
    document.body.classList.remove('reveal-on');
    main.style.removeProperty('height');
    if (indicator) indicator.hidden = false;
    displayed = -1; curH = -1;
    window.scrollTo(0, 0);
    measureApps();
    const f = mapU(mp); applyFrame(f.p, f.h);
    window.addEventListener('wheel', onStepWheel, { passive: false });
    window.addEventListener('touchstart', onStepTouchStart, { passive: true });
    window.addEventListener('touchmove', onStepTouchMove, { passive: false });
    window.addEventListener('touchend', onStepTouchEnd, { passive: true });
    window.addEventListener('keydown', onStepKey);
  }
  function exitStep() {
    window.removeEventListener('wheel', onStepWheel);
    window.removeEventListener('touchstart', onStepTouchStart);
    window.removeEventListener('touchmove', onStepTouchMove);
    window.removeEventListener('touchend', onStepTouchEnd);
    window.removeEventListener('keydown', onStepKey);
    closeApp();
    if (stepAnim) { cancelAnimationFrame(stepAnim); stepAnim = 0; }
    if (appAnim) { cancelAnimationFrame(appAnim); appAnim = 0; }
    touchAxis = null;
    locked = false;
  }

  /* ======================================================================
     Navegación por índice (menú + puntos del indicador)
     ====================================================================== */
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-scene-button], a[href^="#"]');
    if (!trigger) return;
    closeApp();
    const id = trigger.dataset.sceneButton || trigger.getAttribute('href')?.slice(1);

    // punto del indicador mientras estamos en la galería -> ir a esa aplicación
    if (mode !== 'off' && HAS_APPS && displayed === APPS_IDX && trigger.hasAttribute('data-scene-button')) {
      const k = dots.indexOf(trigger);
      if (k >= 0) {
        event.preventDefault();
        if (mode === 'step') { tweenAppTo(clamp(k, 0, APPS_COUNT - 1)); return; }
        const targetU = APPS_IDX + (k / (APPS_COUNT - 1)) * EXTRA;
        cancelSettle();
        window.scrollTo({ top: targetU * window.innerHeight, behavior: 'smooth' });
        return;
      }
    }

    const target = scenes.findIndex((sc) => sc.id === id);
    if (target < 0) return;
    if (mode === 'scrub') {
      event.preventDefault();
      cancelSettle();
      window.scrollTo({ top: sceneU[target] * window.innerHeight, behavior: 'smooth' });
    } else if (mode === 'step') {
      event.preventDefault();
      tweenTo(nearestStopIndex(sceneU[target]));
    }
  });

  /* ======================================================================
     Cambio de modo
     ====================================================================== */
  function clearInline() {
    for (let i = 0; i < N; i++) {
      const sc = scenes[i];
      sc.style.transform = ''; sc.style.opacity = '';
      sc.removeAttribute('data-role'); sc.inert = false;
      reveals[i].forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
      if (bgs[i]) bgs[i].style.transform = '';
    }
    if (appsTrack) appsTrack.style.transform = '';
    appEls.forEach((a) => a.classList.remove('is-focus'));
    lastAppIdx = -1;
    closeApp();
    document.body.classList.remove('in-apps');
  }

  function setMode(next) {
    if (next === mode) return;
    if (mode === 'scrub') exitScrub();
    else if (mode === 'step') exitStep();

    if (next === 'scrub') { teardownObserver(); enterScrub(); }
    else if (next === 'step') { teardownObserver(); enterStep(); }
    else {
      mode = 'off';
      document.body.classList.remove('cinematic-on', 'cinematic-step');
      topbar.classList.remove('nav-dark', 'brand-light');
      indicator?.classList.remove('on-dark');
      if (indicator) indicator.hidden = true;
      main.style.removeProperty('height');
      displayed = -1; curH = -1;
      clearInline();
      setupObserver();
    }
  }

  function syncMode() {
    if (mqReduce.matches) setMode('off');
    else if (mqDesktop.matches) setMode('scrub');
    else setMode('step');
  }

  /* ----- fallback (modo off) ----- */
  let io = null;
  let revealSafety = 0;
  function setupObserver() {
    const items = reveals.flat();
    document.body.classList.add('reveal-on');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in-view'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    }
    const vh = window.innerHeight;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('in-view');
      else io.observe(el);
    });
    clearTimeout(revealSafety);
    revealSafety = setTimeout(() => items.forEach((el) => el.classList.add('in-view')), 1600);
  }
  function teardownObserver() {
    clearTimeout(revealSafety);
    if (io) { io.disconnect(); io = null; }
    document.body.classList.remove('reveal-on');
    reveals.flat().forEach((el) => el.classList.remove('in-view'));
  }

  /* ----- listeners globales ----- */
  function onResize() {
    measureApps();
    if (openApp) sizeMore(openApp);
    if (mode === 'scrub') { lastY = -1; curH = -1; const f = mapU(window.scrollY / window.innerHeight); applyFrame(f.p, f.h); }
    else if (mode === 'step') { curH = -1; const f = mapU(mp); applyFrame(f.p, f.h); }
  }
  window.addEventListener('resize', onResize);
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) =>
    window.addEventListener(evt, () => { if (mode === 'scrub') cancelSettle(); }, { passive: true })
  );
  mqDesktop.addEventListener('change', syncMode);
  mqReduce.addEventListener('change', syncMode);

  // re-mide la galería cuando cargan sus imágenes (cambian el scrollWidth)
  if (appsTrack) {
    appsTrack.querySelectorAll('img').forEach((im) => {
      if (im.complete) return;
      im.addEventListener('load', onResize, { once: true });
      im.addEventListener('error', onResize, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize).catch(() => {});
  }

  syncMode();

  /* ======================================================================
     Bandas infinitas (marquees): hero + pilares de "Calidad / Origen".
     Clona el set original hasta llenar el ancho y fija --marquee-shift =
     ancho de UN set -> bucle sin saltos. Mismo motor para todas.
     ====================================================================== */
  function setupMarquee(bandSel, trackSel, speed) {
    const band = document.querySelector(bandSel);
    const track = document.querySelector(trackSel);
    if (!track || !band) return;

    const originals = [...track.children].filter((n) => !n.hasAttribute('data-clone'));
    if (originals.length < 2) return;
    const SETN = originals.length;

    const appendSet = () => originals.forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-clone', '');
      track.appendChild(c);
    });
    const oneSetWidth = () =>
      track.children[SETN].getBoundingClientRect().left -
      track.children[0].getBoundingClientRect().left;

    function build() {
      track.querySelectorAll('[data-clone]').forEach((n) => n.remove());
      appendSet();
      let oneSet = oneSetWidth();
      let guard = 0;
      while (track.scrollWidth < band.clientWidth + oneSet + 48 && guard < 16) {
        appendSet();
        guard += 1;
      }
      oneSet = oneSetWidth();
      track.style.setProperty('--marquee-shift', `-${oneSet.toFixed(2)}px`);
      track.style.animationDuration = `${Math.max(18, oneSet / speed).toFixed(1)}s`;
    }

    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build).catch(() => {});
    let t = 0;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(build, 200); });
    // el texto cambió de idioma -> recalcular anchos del bucle
    window.addEventListener('langchange', () => { clearTimeout(t); t = setTimeout(build, 60); });
  }

  setupMarquee('.hero-marquee', '.hero-marquee__track', 48);
  setupMarquee('.origin-marquee', '.origin-marquee__track', 42);

  /* al cambiar de idioma, i18n reescribe la etiqueta a "Leer más" -> si hay
     una aplicación abierta, devolverle el texto de estado abierto */
  window.addEventListener('langchange', () => {
    if (openApp) {
      const lb = openApp.querySelector('.app__toggle-label');
      if (lb) lb.textContent = T('ap.readLess', 'Read less');
    }
  });

  /* ======================================================================
     Formulario de cotización
     ====================================================================== */
  const form = document.getElementById('quote-form');
  if (form) {
    const statusEl = form.querySelector('.form-status');
    const say = (msg, kind) => {
      if (!statusEl) return;
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.classList.toggle('is-error', kind === 'error');
      statusEl.classList.toggle('is-ok', kind === 'ok');
    };
    const endpointConfigured = !form.action.includes('your-form-id');

    form.addEventListener('submit', async (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        say(T('form.checkFields', 'Please check the required fields: name, phone and email.'), 'error');
        form.reportValidity();
        return;
      }
      if (!endpointConfigured) {
        event.preventDefault();
        const body = [...new FormData(form).entries()].map(([k, v]) => `${k}: ${v}`).join('\n');
        const subject = encodeURIComponent(T('form.mailSubject', 'Quote request — Jordi Maquinaria'));
        window.location.href =
          `mailto:ventas@jordimaquinaria.mx?subject=${subject}&body=${encodeURIComponent(body)}`;
        say(T('form.mailOpened', 'Your email client opened with the details. Send the message to complete your request.'), 'ok');
        return;
      }
      event.preventDefault();
      say(T('form.sending', 'Sending…'));
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (res.ok) { form.reset(); say(T('form.sent', 'Thank you! Your request was sent. We will contact you soon.'), 'ok'); }
        else say(T('form.sendError', "Couldn't send. Write to us at ventas@jordimaquinaria.mx"), 'error');
      } catch {
        say(T('form.offline', 'No connection. Write to us at ventas@jordimaquinaria.mx'), 'error');
      }
    });
  }
})();
