/* =========================================================
   Waykeeper · модуль «Тогда и сейчас»
   Подключение: <div data-module="then-now" data-clear></div>
   Необязательные адреса ссылок (по умолчанию — якоря страницы):
     data-how="#how"  data-telegram="#telegram"
     data-week2="#week-2"  data-week3="#week-3"  data-week4="#week-4"
   Ничего не отправляется и не сохраняется: всё живёт в открытой вкладке.

   Сценарий: 00-ix-spec.md, 3.2 и 5.3.
   Рамка 760 × 560 на компьютере (экраны меняются без скачка страницы),
   на телефоне — на всю ширину, высота по содержимому.
   Экран 3: глаголы столбиком, справа тонкая линия «сейчас». Нажатый глагол
   тянет к ней линию; ненажатый — пунктир, который обрывается на середине.
   3 → 4: мир замирает сам — всё, кроме линий человека, выцветает на 1,2 с,
   затем спокойно проступает вывод. Уменьшенное движение — сразу вывод.
   ========================================================= */
(function () {
  'use strict';

  // 24 глагола: четыре группы задают порядок (делать · влиять · связывать · думать), подписи не выводим
  var VERBS = [
    'доводить до конца', 'наводить порядок', 'делать руками', 'держать ритм', 'чинить сломанное', 'сводить цифры',
    'убеждать', 'собирать людей', 'говорить прямо', 'договариваться', 'заряжать других', 'брать на себя',
    'слушать', 'замечать, что нужно', 'знакомить людей', 'держать всех вместе', 'учить', 'поддерживать',
    'распутывать сложное', 'придумывать с нуля', 'объяснять просто', 'видеть, куда идёт', 'копать до корня', 'собирать в систему'
  ];
  var MIN = 3, MAX = 6;

  var T = {
    title: 'Тогда и сейчас',
    s1: 'Вспомни',
    s1q: 'Вспомни время, когда дело шло: проект, учёба, переезд, лагерь, ремонт, что угодно, где было чувство «это я, и у меня получается». Если ничего не вспоминается, возьми время, когда было хоть чуть легче.',
    s2: 'Что там происходило',
    s2q: 'Что ты там делаешь, если забыть про должность? Отметь от трёх до шести.',
    s3: 'А сейчас',
    s3q: 'Что из этого есть в твоих днях сейчас, на этой неделе или в прошлом месяце?',
    s4: 'Что получилось',
    keep: 'Осталось с тобой',
    gone: 'Пропало из дней',
    A: 'Посмотри на «Пропало из дней». Это то, что ты умеешь, но сейчас негде делать, и, возможно, именно этого не хватает, когда кажется, что «что-то не то». В резюме таких глаголов не видно, там должности. Это один из фильтров для выбора дела: подходит то, где эти глаголы снова будут в твоих днях.',
    B: 'Всё, что было тогда, есть и сейчас, так что умения, похоже, на месте. Тогда вопрос в другом: где, с кем и ради чего ты это делаешь и что в нынешнем деле давно стало «надо».',
    C: 'Сейчас в днях ничего из этого нет. Если пусто не первую неделю, ничего не радует, трудно спать или вставать, покажи это врачу или психологу и начни с этого. Если это скорее усталость, в программе мы начинаем с того, где тебе было интересно.',
    w2: 'Неделя 2 · Где у тебя уже получалось ↓',
    w3: 'Неделя 3 · Что тебе важно и что навязано ↓',
    w4: 'Неделя 4 · Что ты умеешь, с доказательствами ↓',
    how: 'Как это устроено ↓',
    tg: 'Написать в Telegram',
    fine2: 'Если сейчас совсем тяжело, сначала врач или психолог.',
    next: 'Дальше →',
    show: 'Показать →',
    back: 'Назад',
    again: 'Пройти ещё раз'
  };

  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var SVGNS = 'http://www.w3.org/2000/svg';
  // пауза «мир замирает сам»: выцветание, неподвижность, уход линий
  // вся пауза короче 2 с (1,7 с; при выводе В — 1 с); нажатие во время паузы сразу открывает вывод
  var STILL_FADE = 450, STILL_HOLD = 250, STILL_HOLD_C = 250, STILL_OUT = 350;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function init(root, preset) {
    if (root.thenNow) { if (preset) root.thenNow.set(preset); return root.thenNow; }

    var st = { step: 1, picked: [], now: [] };   // индексы глаголов
    var arrivedFromPool = false;
    var still = 0;                               // идёт пауза перед выводом: клики не принимаем
    var links = {
      how: root.getAttribute('data-how') || '#how',
      tg: root.getAttribute('data-telegram') || '#telegram',
      w2: root.getAttribute('data-week2') || '#week-2',
      w3: root.getAttribute('data-week3') || '#week-3',
      w4: root.getAttribute('data-week4') || '#week-4'
    };

    root.classList.add('tn');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-labelledby', 'tn-title-' + (init.n = (init.n || 0) + 1));
    root.innerHTML =
      '<h2 class="tn-title" id="tn-title-' + init.n + '">' + T.title + '</h2>' +
      '<div class="tn-frame">' +
        '<div class="tn-dots" role="img"><i></i><i></i><i></i><i></i></div>' +
        '<div class="tn-body"></div>' +
        '<div class="tn-foot"></div>' +
        '<div class="tn-veil" aria-hidden="true"></div>' +
      '</div>' +
      '<p class="tn-sr" aria-live="polite"></p>';

    var frame = root.querySelector('.tn-frame');
    var body = root.querySelector('.tn-body');
    var foot = root.querySelector('.tn-foot');
    var dots = root.querySelector('.tn-dots');
    var live = root.querySelector('.tn-sr');

    function say(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
    function isPicked(i) { return st.picked.indexOf(i) > -1; }
    function isNow(i) { return st.now.indexOf(i) > -1; }
    function sortIdx(a) { return a.slice().sort(function (x, y) { return x - y; }); }

    // ---------- FLIP: метка плавно переезжает на новое место ----------
    function flip(mutate) {
      var first = {};
      if (!RM.matches) {
        root.querySelectorAll('[data-v]').forEach(function (el) { first[el.getAttribute('data-v')] = el.getBoundingClientRect(); });
      }
      mutate();
      if (RM.matches) return;
      root.querySelectorAll('[data-v]').forEach(function (el) {
        var a = first[el.getAttribute('data-v')];
        if (!a || !el.animate) return;
        var b = el.getBoundingClientRect();
        var dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        var end = getComputedStyle(el).transform;
        el.animate([
          { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
          { transform: end === 'none' ? 'translate(0,0)' : end }
        ], { duration: 560, easing: EASE });
      });
      drawLines(true);
    }

    function tile(i, pressed, extra) {
      return '<button type="button" class="tn-tile" data-v="' + i + '" aria-pressed="' + pressed + '"' + (extra || '') + '>' + esc(VERBS[i]) + '</button>';
    }

    // ---------- экраны ----------
    function screen1() {
      var pool = VERBS.map(function (v, i) {
        var jx = ((i * 37) % 13) - 6, jy = ((i * 53) % 9) - 4;
        return '<li><span class="tn-tile" style="--tn-jx:' + jx + 'px;--tn-jy:' + jy + 'px;--tn-dl:-' + (i % 7) + 's">' + esc(v) + '</span></li>';
      }).join('');
      body.innerHTML =
        '<div class="tn-screen"><h3 class="tn-sub" tabindex="-1">' + T.s1 + '</h3><p class="tn-q">' + T.s1q + '</p>' +
        '<div class="tn-pool" aria-hidden="true"><ul class="tn-grid">' + pool + '</ul></div></div>';
      foot.innerHTML = '<button type="button" class="tn-btn tn-primary" data-go="2">' + T.next + '</button>';
    }

    function screen2() {
      var full = st.picked.length >= MAX;
      var tiles = VERBS.map(function (v, i) {
        var p = isPicked(i);
        return '<li>' + tile(i, p, (full && !p ? ' disabled' : '') + ' style="--tn-sd:' + (i * 0.03).toFixed(2) + 's"') + '</li>';
      }).join('');
      body.innerHTML =
        '<div class="tn-screen"><h3 class="tn-sub" tabindex="-1">' + T.s2 + '</h3><p class="tn-q">' + T.s2q + '</p>' +
        '<ul class="tn-grid' + (arrivedFromPool ? ' tn-surface' : '') + '" aria-label="' + T.s2 + '">' + tiles + '</ul></div>';
      arrivedFromPool = false;
      foot.innerHTML = '<button type="button" class="tn-text" data-go="1">' + T.back + '</button>' +
        '<button type="button" class="tn-btn tn-primary" data-go="3"></button>';
      syncCount();
    }

    function syncCount() {
      var n = st.picked.length, full = n >= MAX;
      var b = foot.querySelector('[data-go="3"]');
      if (b) { b.textContent = T.next; b.setAttribute('aria-disabled', n < MIN ? 'true' : 'false'); }
      body.querySelectorAll('.tn-tile').forEach(function (el) {
        var i = +el.getAttribute('data-v'), p = isPicked(i);
        el.setAttribute('aria-pressed', p);
        el.disabled = full && !p;
      });
    }

    // экран 3: глаголы столбиком слева, линия «сейчас» справа, между ними — линии человека
    function screen3() {
      var picked = sortIdx(st.picked);
      body.innerHTML =
        '<div class="tn-screen tn-step3"><h3 class="tn-sub" tabindex="-1">' + T.s3 + '</h3><p class="tn-q">' + T.s3q + '</p>' +
        '<div class="tn-move">' +
          '<ul class="tn-stack" aria-label="' + T.s3 + '">' + picked.map(function (i) { return '<li>' + tile(i, isNow(i)) + '</li>'; }).join('') + '</ul>' +
          '<svg class="tn-lines" aria-hidden="true" focusable="false"></svg>' +
        '</div></div>';
      foot.innerHTML = '<button type="button" class="tn-text" data-go="2">' + T.back + '</button>' +
        '<button type="button" class="tn-btn tn-primary" data-show>' + T.show + '</button>';
      drawLines(true);
    }

    // линии: рисуем по месту плиток; при смене размера — заново, без анимации
    function drawLines(instant) {
      var move = body.querySelector('.tn-move');
      var svg = move && move.querySelector('.tn-lines');
      if (!svg) return;
      // берём место по раскладке (offset*), а не по экрану: во время переезда плиток линии не съезжают
      var stack = move.querySelector('.tn-stack');
      var tiles = move.querySelectorAll('.tn-stack .tn-tile');
      if (!tiles.length || !move.offsetWidth) return;
      var W = move.offsetWidth, H = move.offsetHeight;
      var nowX = Math.round(W - (W < 520 ? 14 : Math.max(96, W * .2))) + .5;
      var top = Infinity, bottom = 0, rows = '';
      tiles.forEach(function (el) {
        var i = el.getAttribute('data-v');
        var t0 = stack.offsetTop + el.offsetTop, h = el.offsetHeight;
        var y = Math.round(t0 + h / 2) + .5;
        var x1 = stack.offsetLeft + el.offsetLeft + el.offsetWidth + 12;
        var mid = Math.round(x1 + (nowX - x1) * .46);
        top = Math.min(top, t0); bottom = Math.max(bottom, t0 + h);
        rows += '<g class="tn-row' + (isNow(+i) ? ' tn-on' : '') + '" data-row="' + i + '">' +
          '<path class="tn-stub" d="M' + x1 + ' ' + y + 'H' + mid + '"/>' +
          '<path class="tn-ray" pathLength="1" d="M' + x1 + ' ' + y + 'H' + (nowX - 4) + '"/>' +
          '<circle class="tn-hit" cx="' + nowX + '" cy="' + y + '" r="3.5"/></g>';
      });
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      if (instant) svg.classList.add('tn-instant');
      svg.innerHTML = '<path class="tn-nowline" d="M' + nowX + ' ' + Math.round(top - 6) + 'V' + Math.round(bottom + 6) + '"/>' + rows;
      if (instant) { svg.getBoundingClientRect(); requestAnimationFrame(function () { svg.classList.remove('tn-instant'); }); }
    }

    function screen4(wake) {
      var picked = sortIdx(st.picked);
      var keep = picked.filter(isNow), gone = picked.filter(function (i) { return !isNow(i); });
      var kind = keep.length === 0 ? 'C' : (gone.length === 0 ? 'B' : 'A');
      function chips(arr) {
        if (!arr.length) return '<div class="tn-empty" aria-hidden="true"></div>';
        return '<ul>' + arr.map(function (i) { return '<li class="tn-chip" data-v="' + i + '">' + esc(VERBS[i]) + '</li>'; }).join('') + '</ul>';
      }
      function wk(key) { return '<a class="tn-link" href="' + esc(links[key]) + '">' + T[key] + '</a>'; }
      var weeks = kind === 'A' ? wk('w2') + wk('w4') : kind === 'B' ? wk('w3') : wk('w2');
      var tgHref = (function () { var h = document.querySelector('.site-head a[data-tg]'); return (links.tg === '#telegram' && h && h.getAttribute('href') !== '#telegram') ? h.getAttribute('href') : links.tg; })();
      // не больше двух действий: при А и Б — «Как это устроено ↓» и Telegram; при В — только «Пройти ещё раз»
      var acts = kind === 'C' ? '<button type="button" class="tn-text" data-again>' + T.again + '</button>' :
        '<div class="tn-acts"><a class="tn-btn tn-primary" href="' + esc(links.how) + '">' + T.how + '</a>' +
        '<a class="tn-btn tn-quiet" data-tg href="' + esc(tgHref) + '" target="_blank" rel="noopener">' + T.tg + '</a></div>';
      body.innerHTML =
        '<div class="tn-screen tn-step4' + (wake ? ' tn-wake' : '') + '"><h3 class="tn-sub" tabindex="-1">' + T.s4 + '</h3>' +
          '<div class="tn-cols">' +
            '<div class="tn-col tn-keep"><h4>' + T.keep + '</h4>' + chips(keep) + '</div>' +
            '<div class="tn-col tn-gone"><h4>' + T.gone + '</h4>' + chips(gone) + '</div>' +
          '</div>' +
          '<div class="tn-out" data-out="' + kind + '"><p>' + T[kind] + '</p><p class="tn-weeks">' + weeks + '</p></div>' +
          (kind === 'C' ? '<div class="tn-fine"><p>' + T.fine2 + '</p></div>' : '') +
        '</div>';
      foot.innerHTML = acts;
      if (wake) foot.classList.add('tn-wake');
    }

    function render(wake) {
      frame.setAttribute('data-step', st.step);
      foot.classList.remove('tn-wake');
      dots.setAttribute('aria-label', 'Шаг ' + st.step + ' из 4');
      [].forEach.call(dots.children, function (d, k) {
        d.className = k + 1 === st.step ? 'tn-cur' : (k + 1 < st.step ? 'tn-done' : '');
      });
      [null, screen1, screen2, screen3, screen4][st.step](wake);
    }

    function keepInView(smooth) {
      var r = frame.getBoundingClientRect(), vh = window.innerHeight || 0;
      if (r.top >= 0 && (r.bottom <= vh || r.top < 80)) return;
      var y = window.pageYOffset + r.top - (r.height < vh ? Math.max(16, (vh - r.height) / 2) : 16);
      window.scrollTo({ top: Math.max(0, y), behavior: smooth && !RM.matches ? 'smooth' : 'auto' });
    }

    function go(step, focusHead) {
      if (step === 2 && st.step === 1) arrivedFromPool = true;
      flip(function () {
        st.step = step;
        render();
        if (frame.getBoundingClientRect().top < 0) keepInView(false);
      });
      if (focusHead !== false) {
        var h = body.querySelector('.tn-sub');
        if (h) h.focus({ preventScroll: true });
      }
    }

    // ---------- 3 → 4: мир замирает сам ----------
    var stillT = [];
    function wakeUp() {
      stillT.forEach(clearTimeout); stillT = [];
      frame.classList.remove('tn-still', 'tn-still-c', 'tn-still-out');
      st.step = 4;
      render(true);
      var h = body.querySelector('.tn-sub');
      if (h) h.focus({ preventScroll: true });
      say(T.s4);
      still = 0;
      if (window.Field && window.Field.poke) window.Field.poke();
    }
    function reveal() {
      if (RM.matches) { go(4); say(T.s4); return; }
      var none = st.now.length === 0;
      still = 1;
      keepInView(true);
      frame.classList.add('tn-still');
      if (none) frame.classList.add('tn-still-c');
      if (window.Field && window.Field.poke) window.Field.poke();
      stillT.push(setTimeout(function () {
        frame.classList.add('tn-still-out');
        stillT.push(setTimeout(wakeUp, STILL_OUT));
      }, STILL_FADE + (none ? STILL_HOLD_C : STILL_HOLD)));
    }

    // ---------- нажатия ----------
    root.addEventListener('click', function (e) {
      if (still) { e.preventDefault(); wakeUp(); return; }   // пауза не держит: любое нажатие — сразу вывод
      var t = e.target.closest('button, a');
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-go')) {
        if (t.getAttribute('aria-disabled') === 'true') return;
        go(+t.getAttribute('data-go'));
        return;
      }
      if (t.hasAttribute('data-show')) { reveal(); return; }
      if (t.hasAttribute('data-again')) {
        st.picked = []; st.now = [];
        go(1);
        return;
      }
      if (!t.classList.contains('tn-tile')) return;
      var i = +t.getAttribute('data-v');
      if (st.step === 2) {
        if (isPicked(i)) st.picked.splice(st.picked.indexOf(i), 1);
        else if (st.picked.length < MAX) st.picked.push(i);
        syncCount();
        say('Выбрано ' + st.picked.length);
      } else if (st.step === 3) {
        var on = !isNow(i);
        if (on) st.now.push(i); else st.now.splice(st.now.indexOf(i), 1);
        t.setAttribute('aria-pressed', on);
        var row = body.querySelector('[data-row="' + i + '"]');
        if (row) row.classList.toggle('tn-on', on);
        say('«' + VERBS[i] + '» — ' + (on ? 'сейчас' : 'тогда'));
      }
    });

    // линии следуют за размером рамки
    var rsT = 0;
    function onResize() { clearTimeout(rsT); rsT = setTimeout(function () { if (st.step === 3 && !still) drawLines(true); }, 60); }
    if (window.ResizeObserver) { try { new ResizeObserver(onResize).observe(frame); } catch (err) {} }
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

    var api = {
      set: function (s) {
        if (s.picked) st.picked = s.picked.slice(0, MAX);
        if (s.now) st.now = s.now.filter(isPicked);
        st.step = s.step || 1;
        render();
      },
      get: function () { return JSON.parse(JSON.stringify(st)); }
    };
    root.thenNow = api;
    if (preset) api.set(preset); else render();
    return api;
  }

  function boot() {
    document.querySelectorAll('[data-module="then-now"]').forEach(function (el) { init(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.WaykeeperThenNow = { init: init, verbs: VERBS };
})();
