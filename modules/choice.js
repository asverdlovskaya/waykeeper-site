/* Waykeeper · модуль «Что ближе к тебе сейчас?» · префикс ch-
   Контейнер: <div data-module="choice" data-mode="home|program" data-clear></div>
   home    — фрагменты-ссылки на program.html?s=<id>#choice (data-program-href меняет адрес)
   program — выбор «ты здесь», ответ и линия к неделе; читает ?s= при загрузке
   data-clear     — без своей стеклянной подложки (модуль лежит прямо на поле страницы)
   data-head="none" — не рисовать заголовок и строку под ним
   data-talk-href — адрес страницы «Разговор» (по умолчанию talk.html) */
(function () {
  'use strict';

  var WEEKS = {
    1: 'Один главный вопрос на три месяца',
    2: 'Где у тебя уже получалось',
    3: 'Что тебе важно и что навязано',
    4: 'Что ты умеешь, с доказательствами',
    5: 'Какой может быть жизнь, если не фильтровать',
    6: 'Два-три направления',
    7: 'Одна дорога и деньги',
    8: 'Разговоры с теми, кто уже там',
    9: 'Почему прошлые попытки срывались',
    10: 'Дорога к делу по шагам',
    11: 'Первый шаг',
    12: 'Как прошли первые дни'
  };
  var REST = { 8: 1, 12: 1 };

  /* тексты — дословно из texts/v2/02-program.md, блок 2 */
  var SIT = [
    { id: 'work', w: [2, 7],
      t: 'Закончилась работа или своё дело, и уже несколько месяцев «надо что-то решать».',
      a: 'Начинаем с того, где тебе уже было интересно и получалось. А мой страх «не вытяну» стал меньше, когда я посчитала, на сколько месяцев хватит подушки, — это неделя 7.' },
    { id: 'move', w: [4],
      t: 'Переезд: профессия, которая дома работала, здесь не складывается.',
      a: 'У меня в Нидерландах прежние регалии почти не работали, зато умение разбираться в сложном переехало со мной. Смотрим, что едет с тобой; подтверждением диплома я не занимаюсь, но время и деньги на него заложим в план.' },
    { id: 'burn', w: [3],
      t: 'Много лет в одном деле, и силы кончились. Обратно не хочется, а что вместо — непонятно.',
      a: 'У меня так было с Tetraform: бросать страшно, продолжать нет сил. Внутри одного дела часто сидят своё и давно ставшее «надо», их и разделяем, чтобы ответить на вопрос «это всё ещё про меня?».' },
    { id: 'roads', w: [3, 7],
      t: 'Есть две-три дороги в деле, в призвании, в будущем — и уже давно не получается выбрать.',
      a: 'Сначала собираем компас, чтобы было чем выбирать, потом берём одну дорогу и проверяем её со всех сторон, включая деньги.' },
    { id: 'plans', w: [9],
      t: 'Планы были, но каждый раз срывались на одном и том же месте.',
      a: 'У меня без опор планы тоже не держались. Разбираем, что срывало прошлые попытки, и собираем то, что будет держать.' },
    { id: 'other', w: [0], only: 'program',
      t: 'Другое.',
      a: 'Расскажи на разговоре. Если вопрос окажется не про дело, я скажу и подскажу, к кому лучше пойти.' }
  ];

  var HEAD = {
    h: 'Что ближе к тебе сейчас?',
    home: '',
    program: ''
  };

  var MQ = window.matchMedia('(max-width: 760px)');
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* последнее слово и стрелка не расстаются при переносе */
  function tail(t) {
    var k = t.lastIndexOf(' ');
    return esc(t.slice(0, k + 1)) + '<span class="ch-nw">' + esc(t.slice(k + 1)) + '<span class="ch-arr" aria-hidden="true">→</span></span>';
  }
  function glue(t, end) {
    var k = t.lastIndexOf(' ');
    return esc(t.slice(0, k + 1)) + '<span class="ch-nw">' + esc(t.slice(k + 1)) + end + '</span>';
  }
  function byId(id) { for (var i = 0; i < SIT.length; i++) if (SIT[i].id === id) return SIT[i]; return null; }

  function init(root) {
    if (root.__ch) return;
    root.__ch = true;
    var mode = root.getAttribute('data-mode') === 'program' ? 'program' : 'home';
    var progHref = root.getAttribute('data-program-href') || 'program.html';
    var talkHref = root.getAttribute('data-talk-href') || 'talk.html';
    var items = SIT.filter(function (s) { return !s.only || s.only === mode; });
    var n = ++uid, hid = 'ch-h-' + n;
    var state = { sel: null, ghost: null };

    root.classList.add('ch', 'ch--' + mode);
    if (!root.hasAttribute('data-clear')) root.classList.add('ch--panel');
    if (mode === 'program' && !root.id && !document.getElementById('choice')) root.id = 'choice';

    /* ---------- разметка ---------- */
    var h = '';
    if (root.getAttribute('data-head') !== 'none') {
      h += '<h2 class="ch-h" id="' + hid + '">' + HEAD.h + '</h2>' + (HEAD[mode] ? '<p class="ch-lead">' + HEAD[mode] + '</p>' : '');
    }
    h += '<div class="ch-field">';
    h += mode === 'program'
      ? '<div class="ch-list" role="radiogroup" aria-label="' + HEAD.h + '">'
      : '<ul class="ch-list" aria-label="' + HEAD.h + '">';
    items.forEach(function (s, i) {
      var st = ' style="--i:' + i + '"';
      if (mode === 'program') {
        h += '<div class="ch-item"' + st + '><button type="button" class="ch-frag" role="radio" aria-checked="false" tabindex="' + (i ? -1 : 0) + '" data-id="' + s.id + '">' +
          '<i class="ch-dot" aria-hidden="true"></i><span class="ch-t">' + esc(s.t) + '</span></button></div>';
      } else {
        h += '<li class="ch-item"' + st + '><a class="ch-frag" data-id="' + s.id + '" href="' + esc(progHref) + '?s=' + s.id + '#choice">' +
          '<i class="ch-dot" aria-hidden="true"></i><span class="ch-t">' + tail(s.t) + '</span></a></li>';
      }
    });
    h += mode === 'program' ? '</div>' : '</ul>';
    h += '<div class="ch-future"><div class="ch-track" aria-hidden="true"><i class="ch-wk ch-wk--start" data-w="0"></i>';
    for (var w = 1; w <= 12; w++) h += '<i class="ch-wk' + (REST[w] ? ' ch-wk--rest' : '') + '" data-w="' + w + '"></i>';
    h += '</div><div class="ch-ans"' + (mode === 'program' ? ' aria-live="polite"' : ' aria-hidden="true"') + '></div></div>';
    h += '<svg class="ch-lines" aria-hidden="true" focusable="false"><path d=""/><path d=""/></svg>';
    h += '</div>';
    root.innerHTML = h;

    var field = root.querySelector('.ch-field');
    var list = root.querySelector('.ch-list');
    var future = root.querySelector('.ch-future');
    var track = root.querySelector('.ch-track');
    var ans = root.querySelector('.ch-ans');
    var svg = root.querySelector('.ch-lines');
    var paths = svg.querySelectorAll('path');
    var frags = [].slice.call(root.querySelectorAll('.ch-frag'));

    function fragOf(id) { for (var i = 0; i < frags.length; i++) if (frags[i].getAttribute('data-id') === id) return frags[i]; return null; }

    /* ---------- ответ ---------- */
    function fill(s, ghost) {
      var html = ghost ? '' : '<p class="ch-say">' + esc(s.a) + '</p>';
      s.w.forEach(function (w) {
        var tag = ghost ? 'span' : 'a';
        var label = w === 0 ? 'Как проходит <span class="ch-nw">разговор →</span>'
          : '<span class="ch-wn">Неделя ' + w + '</span> · ' + glue(WEEKS[w], ghost ? '' : ' ↓');
        var href = ghost ? '' : ' href="' + (w === 0 ? esc(talkHref) : '#week-' + w) + '"';
        html += '<' + tag + ' class="ch-to" data-w="' + w + '"' + href + '><i class="ch-ring" aria-hidden="true"></i><span class="ch-lb">' + label + '</span></' + tag + '>';
      });
      ans.innerHTML = html;
      ans.classList.toggle('ch-ans--ghost', !!ghost);
      ans.classList.remove('is-in');
      void ans.offsetWidth;
      ans.classList.add('is-in');
    }

    function clearAns() {
      ans.innerHTML = '';
      ans.classList.remove('is-in', 'ch-ans--ghost');
      [].forEach.call(track.children, function (d) { d.classList.remove('is-target'); });
      paths[0].setAttribute('d', ''); paths[1].setAttribute('d', '');
    }

    /* ---------- раскладка ---------- */
    function weekY(w, H) { return w === 0 ? 8 : 46 + (w - 1) * (H - 46 - 8) / 11; }

    function layout(animate) {
      var active = state.sel || state.ghost;
      var mobile = MQ.matches;
      var s = active ? byId(active) : null;

      /* где живёт ответ: на телефоне — под выбранным фрагментом, иначе — в колонке будущего */
      var host = (mobile && s) ? fragOf(active).parentNode : future;
      if (ans.parentNode !== host) host.appendChild(ans);

      if (!mobile) {
        future.style.minHeight = '';
        var H = Math.max(list.offsetHeight, 420);
        future.style.height = H + 'px';
        [].forEach.call(track.children, function (d) {
          var w = +d.getAttribute('data-w');
          d.style.top = weekY(w, H) + 'px';
          d.classList.toggle('is-target', !!(s && s.w.indexOf(w) > -1));
        });
        if (s) {
          var tos = [].slice.call(ans.querySelectorAll('.ch-to'));
          var boxes = tos.map(function (el) {
            var y = weekY(+el.getAttribute('data-w'), H), lh = el.offsetHeight || 24;
            el.style.top = (y - 12) + 'px';
            return { top: y - 12, bot: y - 12 + lh };
          });
          var say = ans.querySelector('.ch-say');
          if (say) {
            var th = say.offsetHeight, gap = 16, top = null;
            var first = boxes[0], last = boxes[boxes.length - 1];
            var cands = [first.top - gap - th, first.bot + gap];
            if (boxes.length > 1) cands.push(last.bot + gap);
            for (var i = 0; i < cands.length; i++) {
              var t = cands[i], b = t + th;
              if (t < 0 || b > H) continue;
              var hit = boxes.some(function (bx) { return t < bx.bot + 6 && b > bx.top - 6; });
              if (!hit) { top = t; break; }
            }
            if (top === null) { top = last.bot + gap; future.style.height = Math.max(H, top + th) + 'px'; }
            say.style.top = top + 'px';
          }
        }
      } else {
        future.style.height = '';
        [].forEach.call(ans.querySelectorAll('.ch-to, .ch-say'), function (el) { el.style.top = ''; });
      }
      draw(animate);
    }

    function draw(animate) {
      var active = state.sel || state.ghost;
      var s = active ? byId(active) : null;
      paths[0].setAttribute('d', ''); paths[1].setAttribute('d', '');
      svg.classList.toggle('ch-lines--ghost', !state.sel && !!state.ghost);
      if (!s) return;
      var fr = field.getBoundingClientRect();
      var f = fragOf(active).getBoundingClientRect();
      var rings = [].slice.call(ans.querySelectorAll('.ch-ring')).map(function (r) {
        var b = r.getBoundingClientRect();
        return { x: b.left + b.width / 2 - fr.left, y: b.top + b.height / 2 - fr.top, r: b.width / 2 };
      });
      if (!rings.length) return;
      var d1 = '', d2 = '';
      var rd = function (v) { return Math.round(v * 10) / 10; };
      if (!MQ.matches) {
        /* от правого края фрагмента — мягкой дугой к первой неделе */
        var lr = list.getBoundingClientRect();
        var x0 = f.right - fr.left, y0 = f.top + f.height / 2 - fr.top, xc = Math.max(lr.right - fr.left, x0);
        var r0 = rings[0], x1 = r0.x - r0.r - 3;
        d1 = 'M' + rd(x0) + ',' + rd(y0) + ' H' + rd(xc) + ' C' + rd(xc + (x1 - xc) * .55) + ',' + rd(y0) + ' ' + rd(x1 - (x1 - xc) * .45) + ',' + rd(r0.y) + ' ' + rd(x1) + ',' + rd(r0.y);
      } else {
        var dot = fragOf(active).querySelector('.ch-dot').getBoundingClientRect();
        var dx = dot.left + dot.width / 2 - fr.left, dy = dot.bottom - fr.top + 5;
        d1 = 'M' + rd(dx) + ',' + rd(dy) + ' V' + rd(rings[0].y - rings[0].r - 4);
      }
      /* дальше — по линии программы к следующей неделе */
      for (var i = 1; i < rings.length; i++) d2 += 'M' + rd(rings[i - 1].x) + ',' + rd(rings[i - 1].y + rings[i - 1].r + 4) + ' V' + rd(rings[i].y - rings[i].r - 4) + ' ';
      paths[0].setAttribute('d', d1.trim());
      paths[1].setAttribute('d', d2.trim());
      [].forEach.call(paths, function (p) {
        p.style.transition = 'none';
        p.style.strokeDasharray = ''; p.style.strokeDashoffset = '';
        if (!p.getAttribute('d') || !animate || RM.matches || !state.sel) return;
        var len = p.getTotalLength();
        p.style.strokeDasharray = len + ' ' + len;
        p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1) .12s';
        p.style.strokeDashoffset = 0;
      });
    }

    /* ---------- выбор ---------- */
    function select(id, opts) {
      opts = opts || {};
      var s = byId(id);
      if (!s || state.sel === id) return;
      state.sel = id; state.ghost = null;
      frags.forEach(function (b) {
        var on = b.getAttribute('data-id') === id;
        b.classList.toggle('is-here', on);
        b.classList.toggle('is-away', !on);
        if (mode === 'program') { b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }
      });
      root.classList.add('ch--chosen');
      fill(s, false);
      layout(!opts.still);
      if (mode === 'program' && opts.url) {
        try {
          var u = new URL(location.href);
          u.searchParams.set('s', id);
          history.replaceState(history.state, '', u.toString());
        } catch (e) { /* file:// и старые браузеры — без адреса, выбор живёт на странице */ }
      }
    }

    function preview(id) {
      if (state.sel || MQ.matches) return;
      if (state.ghost === id) return;
      state.ghost = id;
      if (!id) { clearAns(); return; }
      fill(byId(id), true);
      layout(false);
    }

    if (mode === 'program') {
      list.addEventListener('click', function (e) {
        var b = e.target.closest('.ch-frag');
        if (b) select(b.getAttribute('data-id'), { url: true });
      });
      list.addEventListener('keydown', function (e) {
        var i = frags.indexOf(document.activeElement);
        if (i < 0) return;
        var k = e.key, j = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % frags.length;
        else if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + frags.length) % frags.length;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = frags.length - 1;
        if (j === null) return;
        e.preventDefault();
        frags[j].focus();
        select(frags[j].getAttribute('data-id'), { url: true });
      });
    } else {
      frags.forEach(function (a) {
        a.addEventListener('mouseenter', function () { preview(a.getAttribute('data-id')); });
        a.addEventListener('focus', function () { preview(a.getAttribute('data-id')); });
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
          if (RM.matches) return;
          e.preventDefault();
          state.ghost = null;
          frags.forEach(function (b) { b.classList.toggle('is-here', b === a); b.classList.toggle('is-away', b !== a); });
          root.classList.add('ch--chosen');
          setTimeout(function () { location.href = a.href; }, 280);
        });
      });
      list.addEventListener('mouseleave', function () { if (!list.contains(document.activeElement)) preview(null); });
      list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) preview(null); });
      window.addEventListener('pageshow', function () {
        frags.forEach(function (b) { b.classList.remove('is-here', 'is-away'); });
        root.classList.remove('ch--chosen');
      });
    }

    /* ---------- проявление при появлении на экране ---------- */
    if ('IntersectionObserver' in window && !RM.matches) {
      root.classList.add('ch--pre');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          root.classList.add('ch--up');
          io.disconnect();
          setTimeout(function () { root.classList.remove('ch--pre', 'ch--up'); }, 1400);
        });
      }, { threshold: 0.15 });
      io.observe(root);
    }

    /* ---------- перерисовка при изменении размеров ---------- */
    var raf = 0;
    function relayout() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { layout(false); }); }
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(field);
    else window.addEventListener('resize', relayout);
    if (MQ.addEventListener) MQ.addEventListener('change', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

    /* ---------- program: ?s= ---------- */
    if (mode === 'program') {
      var q = null;
      try { q = new URLSearchParams(location.search).get('s'); } catch (e) { }
      if (q && byId(q) && fragOf(q)) {
        select(q, { still: true });
        if (location.hash === '#' + root.id) {
          requestAnimationFrame(function () { root.scrollIntoView({ block: 'start' }); });
        }
      }
    }
    layout(false);
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="choice"]'), init); }
  window.WaykeeperChoice = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
