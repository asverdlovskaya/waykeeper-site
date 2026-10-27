/* =====================================================================
   Waykeeper · «Поставить точку» · префикс cr-
   Игровой слой, главная ниже первого экрана (00-ix-play.md, решение 1).

   Человек ставит одну точку в белом поле справа («куда примерно хочется»).
   От тёплой точки «ты здесь» к ней проходит пунктир; по нему по одной
   встают двенадцать недель (8 и 12 — привалы, 11 — первый шаг, тёплая).
   На седьмой неделе точка из размытой становится чёткой: решение.
   Дальше двенадцатой недели линия остаётся пунктиром — маршрут на год-два.

   Разметка страницы (прошлое — поле слева, вне модуля; будущее — белое, это сам модуль):
     <section class="sec cr-sec" id="point" aria-label="Куда дальше">
       <div class="wrap cr-wrap">
         <div class="cr-past" data-field=".85" aria-hidden="true"></div>
         <div data-module="coordinate" data-clear data-program-href="program.html"></div>
       </div>
     </section>
   data-practices-href — куда ведёт тихая ссылка «Все практики →» после точки (по умолчанию practices.html)
   data-say          — необязательная строка под линией (на одобрение Саше, см. 00-ix-play.md); без неё — только ссылка
   Хранение: только эта вкладка, sessionStorage «waykeeper.trail» → items.point = {x, y} (доли поля).
   Текста не хранит. Сообщает о точке событием wk:trail (его читает trail.js).
   ===================================================================== */
(function () {
  'use strict';

  var T = {
    ask: 'Куда примерно хочется?',
    more: 'Все практики →',
    again: 'переставить',
    area: 'Поставить точку впереди. Стрелки двигают, Enter ставит.',
    placed: 'Точка стоит.'
  };
  var KEY = 'waykeeper.trail';
  var NS = 'http://www.w3.org/2000/svg';
  var REST = { 8: 1, 12: 1 }, FIRST = 11, DECIDE = 7;

  function rm() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function readTrail() {
    try { var d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (d && d.v === 1 && d.items) return d; } catch (e) { }
    return { v: 1, items: {} };
  }
  function writePoint(p) {
    try {
      var d = readTrail();
      if (p) d.items.point = { x: +p.x.toFixed(3), y: +p.y.toFixed(3), at: Date.now() }; else delete d.items.point;
      sessionStorage.setItem(KEY, JSON.stringify(d));
    } catch (e) { }
    try { document.dispatchEvent(new CustomEvent('wk:trail', { detail: { id: 'point', value: p } })); } catch (e) { }
  }

  function init(root) {
    if (root.wkCoordinate) return root.wkCoordinate;
    var href = root.getAttribute('data-practices-href') || 'practices.html';
    var say = root.getAttribute('data-say') || '';     // строка под линией — только если Саша её одобрит
    var uid = 'cr' + (init.n = (init.n || 0) + 1);

    root.classList.add('cr');
    root.innerHTML =
      '<p class="cr-ask" id="' + uid + '-ask">' + T.ask + '</p>' +
      '<button type="button" class="cr-area" aria-describedby="' + uid + '-ask" aria-label="' + T.area + '">' +
        '<svg class="cr-svg" aria-hidden="true" focusable="false"></svg>' +
      '</button>' +
      '<div class="cr-after">' +
        (say ? '<p class="cr-text">' + say.replace(/[&<>"]/g, '') + '</p>' : '') +
        '<p class="cr-acts"><a class="link" href="' + href + '">' + T.more + '</a>' +
        '<button type="button" class="link small cr-again">' + T.again + '</button></p>' +
      '</div>' +
      '<p class="visually-hidden" aria-live="polite"></p>' +
      '<i class="cr-warm" data-attract="warm .55 44" aria-hidden="true"></i>';

    var area = root.querySelector('.cr-area');
    var s = root.querySelector('.cr-svg');
    var after = root.querySelector('.cr-after');
    var live = root.querySelector('[aria-live]');
    var warm = root.querySelector('.cr-warm');
    var W = 0, H = 0, point = null, preview = null, timers = [];

    // слои рисунка: линия пройденного, пунктир, недели, точка, превью, «ты здесь»
    var gDash = svg('path', { class: 'cr-dash', d: '' }, s);
    var gWalk = svg('path', { class: 'cr-walk', d: '' }, s);
    var gWeeks = svg('g', { class: 'cr-weeks' }, s);
    var gPt = svg('g', { class: 'cr-pt' }, s);
    svg('circle', { r: 7, cx: 0, cy: 0 }, gPt);
    svg('line', { x1: 0, y1: -12, x2: 0, y2: 12 }, gPt);
    svg('line', { x1: -12, y1: 0, x2: 12, y2: 0 }, gPt);
    var gInv = svg('g', { class: 'cr-invite' }, s);
    var gInvPath = svg('path', { class: 'cr-inv-path', d: '' }, gInv);
    var gInvRing = svg('g', { class: 'cr-inv-ring' }, gInv);
    svg('circle', { r: 9, cx: 0, cy: 0 }, gInvRing);
    var gPrev = svg('g', { class: 'cr-prev' }, s);
    svg('circle', { r: 7, cx: 0, cy: 0 }, gPrev);
    var gStub = svg('g', { class: 'cr-stub' }, s);
    for (var si = 0; si < 6; si++) svg('circle', { r: 1.3, cx: 0, cy: 0, style: 'opacity:' + (0.5 - si * 0.08).toFixed(2) }, gStub);
    var gHere = svg('circle', { class: 'cr-here', r: 4, cx: 0, cy: 0 }, s);

    var INVITE = { x: 0.74, y: 0.38 };
    function start() { return { x: 12, y: H * 0.5 }; }
    function toPx(p) { return { x: clamp(p.x * W, W * 0.42, W - 20), y: clamp(p.y * H, 24, H - 24) }; }

    // квадратичная кривая: выходит горизонтально из «ты здесь» и мягко поворачивает к точке
    function curve(a, b) {
      var c = { x: a.x + (b.x - a.x) * 0.55, y: a.y };
      var pts = [], len = [0], N = 160;
      for (var i = 0; i <= N; i++) {
        var u = i / N, k1 = (1 - u) * (1 - u), k2 = 2 * (1 - u) * u, k3 = u * u;
        pts.push({ x: k1 * a.x + k2 * c.x + k3 * b.x, y: k1 * a.y + k2 * c.y + k3 * b.y });
        if (i) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      }
      return { c: c, pts: pts, len: len, L: len[N] };
    }
    function at(cv, d) {             // точка на кривой на расстоянии d от начала
      var i = 1; while (i < cv.len.length - 1 && cv.len[i] < d) i++;
      var a = cv.pts[i - 1], b = cv.pts[i], seg = (cv.len[i] - cv.len[i - 1]) || 1, t = clamp((d - cv.len[i - 1]) / seg, 0, 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, i: i };
    }
    function pathTo(cv, d0, d1) {
      var p0 = at(cv, d0), p1 = at(cv, d1), out = 'M' + p0.x.toFixed(1) + ' ' + p0.y.toFixed(1);
      for (var i = p0.i; i < p1.i; i++) out += 'L' + cv.pts[i].x.toFixed(1) + ' ' + cv.pts[i].y.toFixed(1);
      return out + 'L' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
    }
    // где на линии стоят недели: три месяца по четыре, между месяцами воздух
    function weekDist(cv, k) {
      var pos = k + Math.floor(k / 4) * 0.9, max = 11 + 2 * 0.9;
      var span = Math.min(cv.L * 0.62, cv.L - 40);
      return cv.L * 0.04 + span * pos / max;
    }

    function measure() {
      var r = area.getBoundingClientRect();
      W = r.width; H = r.height;
      s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var a = start();
      gHere.setAttribute('cx', a.x); gHere.setAttribute('cy', a.y);
      warm.style.top = (area.offsetTop + H * 0.5) + 'px';
      // короткий тающий пунктир из «ты здесь» вправо: подсказка, куда смотреть
      Array.prototype.forEach.call(gStub.childNodes, function (c, i) { c.setAttribute('cx', a.x + 16 + i * 9); c.setAttribute('cy', a.y); });
      // тихое приглашение: бледная координата впереди дышит, к ней тянется едва видный пунктир
      var ip = toPx(INVITE), icv = curve(a, ip);
      gInvRing.setAttribute('transform', 'translate(' + ip.x.toFixed(1) + ' ' + ip.y.toFixed(1) + ')');
      gInvPath.setAttribute('d', pathTo(icv, 70, icv.L - 16));
    }

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function draw(animate) {
      clearTimers();
      gWeeks.innerHTML = '';
      root.classList.toggle('is-placed', !!point);
      if (!point) { gDash.setAttribute('d', ''); gWalk.setAttribute('d', ''); gPt.classList.remove('on', 'clear'); return; }
      var a = start(), b = toPx(point), cv = curve(a, b);
      var end12 = weekDist(cv, 11);
      gPt.setAttribute('transform', 'translate(' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ')');
      gPt.classList.add('on');
      gDash.setAttribute('d', pathTo(cv, end12 + 6, cv.L - 10));
      gWalk.setAttribute('d', pathTo(cv, 0, end12));
      var dots = [];
      for (var k = 0; k < 12; k++) {
        var w = k + 1, p = at(cv, weekDist(cv, k));
        var cls = 'cr-wk' + (REST[w] ? ' is-rest' : '') + (w === FIRST ? ' is-first' : '');
        dots.push(svg('circle', { class: cls, cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: REST[w] ? 3.6 : (w === FIRST ? 3.4 : 2.6) }, gWeeks));
      }
      if (!animate || rm()) {
        dots.forEach(function (d) { d.classList.add('on'); });
        gPt.classList.add('clear'); gWalk.style.strokeDashoffset = 0; gWalk.style.strokeDasharray = 'none';
        root.classList.add('is-done');
        return;
      }
      // по одной неделе; пройденная линия дорисовывается следом
      root.classList.remove('is-done');
      gPt.classList.remove('clear');
      var walkLen = end12;
      gWalk.style.transition = 'none';
      gWalk.style.strokeDasharray = walkLen + ' ' + walkLen;
      gWalk.style.strokeDashoffset = walkLen;
      gWalk.getBoundingClientRect();
      var STEP = 150, T0 = 260;
      gWalk.style.transition = 'stroke-dashoffset ' + (STEP * 12 + 200) + 'ms linear';
      gWalk.style.strokeDashoffset = 0;
      dots.forEach(function (d, k) {
        timers.push(setTimeout(function () {
          d.classList.add('on');
          if (k + 1 === DECIDE) gPt.classList.add('clear');
        }, T0 + STEP * k));
      });
      timers.push(setTimeout(function () { root.classList.add('is-done'); if (window.Field) Field.refresh(); }, T0 + STEP * 12 + 260));
    }

    function place(p, animate) {
      point = p;
      writePoint(p);
      gPrev.classList.remove('on');
      draw(animate);
      live.textContent = '';
      setTimeout(function () { live.textContent = T.placed + (say ? ' ' + say : ''); }, 40);
      if (window.Field) Field.refresh();
    }

    // наведение: бледное кольцо там, где встанет точка (без своего курсора, только превью)
    function showPreview(px, py) {
      var b = toPx({ x: px / W, y: py / H });
      gPrev.setAttribute('transform', 'translate(' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ')');
      gPrev.classList.add('on');
      root.classList.add('is-aiming');
      preview = { x: b.x / W, y: b.y / H };
    }
    area.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || point) return;
      var r = area.getBoundingClientRect();
      showPreview(e.clientX - r.left, e.clientY - r.top);
    });
    area.addEventListener('pointerleave', function () { if (!area.matches(':focus-visible')) { gPrev.classList.remove('on'); root.classList.remove('is-aiming'); } });
    area.addEventListener('click', function (e) {
      if (point) return;
      var r = area.getBoundingClientRect(), b;
      if (e.detail === 0 || (e.clientX === 0 && e.clientY === 0)) b = toPx(preview || { x: 0.74, y: 0.4 });     // Enter / пробел
      else b = toPx({ x: (e.clientX - r.left) / W, y: (e.clientY - r.top) / H });
      place({ x: b.x / W, y: b.y / H }, true);
    });
    area.addEventListener('focus', function () {
      if (point || !area.matches(':focus-visible')) return;
      var p = preview || { x: 0.74, y: 0.4 }; showPreview(p.x * W, p.y * H);
    });
    area.addEventListener('blur', function () { gPrev.classList.remove('on'); root.classList.remove('is-aiming'); });
    area.addEventListener('keydown', function (e) {
      if (point) return;
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      var p = preview || { x: 0.74, y: 0.4 };
      showPreview((p.x + d[0] * 0.05) * W, (p.y + d[1] * 0.08) * H);
    });
    root.querySelector('.cr-again').addEventListener('click', function () {
      point = null; writePoint(null); draw(false);
      area.focus();
    });

    var rT = 0;
    function onResize() { clearTimeout(rT); rT = setTimeout(function () { measure(); draw(false); }, 80); }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(area); else window.addEventListener('resize', onResize);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { root.classList.toggle('is-vis', e.isIntersecting); }); }).observe(root);
    } else root.classList.add('is-vis');

    measure();
    var saved = readTrail().items.point;
    if (saved && typeof saved.x === 'number') { point = { x: saved.x, y: saved.y }; draw(false); }

    var api = {
      place: function (x, y, animate) { measure(); place({ x: x, y: y }, animate !== false); },
      reset: function () { point = null; writePoint(null); draw(false); }
    };
    root.wkCoordinate = api;
    return api;
  }

  function boot() { document.querySelectorAll('[data-module="coordinate"]').forEach(function (el) { init(el); }); }
  window.WaykeeperCoordinate = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
