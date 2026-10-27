/* Waykeeper · практика «Колесо контекстов» · префикс wh-
   Контейнер: <div data-module="wheel" data-clear></div>
   data-clear      — без своей стеклянной подложки (модуль лежит прямо на поле страницы)
   data-week-href  — адрес ссылки «Неделя 1 →» (по умолчанию program.html#week-1; пусто — ссылки нет)
   data-store      — свой ключ хранения (по умолчанию «waykeeper.wheel»)
   Ответы — только в этом браузере (localStorage). root.wkText() отдаёт ответы текстом для practice-kit. */
(function () {
  'use strict';

  var MIN = 3, MAX = 9, FMAX = 2;
  var PH = ['например, работа', 'например, дом', 'например, тело', 'например, близкие', 'например, деньги', 'например, своё время', 'например, друзья', 'например, учёба', 'например, город'];
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function item() { return { n: '', s: null, f: false, good: '', up: '' }; }
  function blank() { return { v: 1, items: [item(), item(), item(), item(), item(), item()] }; }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1 && Array.isArray(d.items) && d.items.length >= MIN) return d;
    } catch (e) { }
    return blank();
  }

  /* геометрия колеса */
  var CX = 260, CY = 214, R = 150, WRAP = 16; /* на телефоне R и WRAP меньше — подписи крупнее */
  function ang(i, n) { return -Math.PI / 2 + i * 2 * Math.PI / n; }
  function pt(a, r) { return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; }
  function f1(v) { return Math.round(v * 10) / 10; }

  function init(root) {
    if (root.__wh) return;
    root.__wh = true;
    var P = 'wh' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.wheel';
    var week = root.hasAttribute('data-week-href') ? root.getAttribute('data-week-href') : 'program.html#week-1';
    var st = load(KEY), saveT = 0;

    root.classList.add('wh');
    if (!root.hasAttribute('data-clear')) root.classList.add('wh--panel');

    root.innerHTML =
      '<div class="wh-in">' +
        '<ol class="wh-list" data-list></ol>' +
        '<button type="button" class="wh-add" data-add>+ сфера</button>' +
      '</div>' +
      '<figure class="wh-fig">' +
        '<svg class="wh-svg" viewBox="0 0 520 428" role="img" aria-labelledby="' + P + 'sum" data-svg><title id="' + P + 'sum"></title><g data-g></g></svg>' +
        '<figcaption class="wh-cap"><span>ближе к краю — лучше</span>' + (week ? '<a class="wh-link" href="' + esc(week) + '">Неделя 1 →</a>' : '') + '</figcaption>' +
      '</figure>' +
      '<div class="wh-focus" data-focus></div>' +
      '<p class="wh-sr" aria-live="polite" data-live></p>' +
      '<div class="wh-foot"><button type="button" class="wh-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var list = $('[data-list]'), svg = $('[data-svg]'), g = $('[data-g]'), live = $('[data-live]');

    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }, 250);
    }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function nm(it, i) { return it.n.trim() || ('сфера ' + (i + 1)); }

    /* ---------- список сфер ---------- */
    function ticks() {
      var t = '';
      for (var k = 0; k <= 10; k++) t += '<i style="left:' + (k * 10) + '%"' + (k % 5 ? '' : ' class="wh-t5"') + '></i>';
      return t;
    }
    function renderList() {
      var h = '';
      st.items.forEach(function (it, i) {
        h += '<li class="wh-row" data-i="' + i + '">' +
          '<input class="wh-nm" type="text" id="' + P + 'n' + i + '" data-n="' + i + '" maxlength="40" autocomplete="off" placeholder="' + esc(i === 0 ? 'Назови сферу' : PH[i] || 'ещё сфера') + '" aria-label="Сфера ' + (i + 1) + ', название" value="' + esc(it.n) + '">' +
          '<div class="wh-sl" role="slider" tabindex="0" data-sl="' + i + '" aria-valuemin="0" aria-valuemax="10">' +
            '<div class="wh-track"><span class="wh-ticks" aria-hidden="true">' + ticks() + '</span><i class="wh-fill"></i><i class="wh-thumb"></i></div></div>' +
          '<span class="wh-val" data-val="' + i + '" aria-hidden="true"></span>' +
          '<button type="button" class="wh-fb" data-f="' + i + '" aria-pressed="false"><i aria-hidden="true"></i><span aria-hidden="true">фокус</span></button>' +
          '<button type="button" class="wh-x" data-x="' + i + '" aria-label="Убрать сферу ' + (i + 1) + '"' + (st.items.length <= MIN ? ' disabled' : '') + '><span aria-hidden="true">×</span></button>' +
          '</li>';
      });
      list.innerHTML = h;
      st.items.forEach(function (it, i) { paintRow(i); });
      $('[data-add]').hidden = st.items.length >= MAX;
    }
    function paintRow(i) {
      var it = st.items[i], sl = root.querySelector('[data-sl="' + i + '"]'), fb = root.querySelector('[data-f="' + i + '"]');
      if (!sl) return;
      var v = it.s;
      sl.style.setProperty('--p', (v == null ? 0 : v * 10) + '%');
      sl.classList.toggle('is-empty', v == null);
      sl.setAttribute('aria-valuenow', v == null ? 0 : v);
      sl.setAttribute('aria-valuetext', v == null ? 'не оценено' : v + ' из 10');
      sl.setAttribute('aria-label', 'Оценка: ' + nm(it, i));
      root.querySelector('[data-val="' + i + '"]').textContent = v == null ? '—' : v;
      fb.setAttribute('aria-pressed', it.f ? 'true' : 'false');
      fb.setAttribute('aria-label', 'Фокус: ' + nm(it, i));
    }

    /* ---------- колесо ---------- */
    function named() {
      var r = [];
      st.items.forEach(function (it, i) { if (it.n.trim()) r.push(i); });
      return r;
    }
    function label(text, a, r) {
      var p = pt(a, r), c = Math.cos(a), s = Math.sin(a);
      var anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
      var t = text.length > 34 ? text.slice(0, 32) + '…' : text, lines = [t];
      if (t.length > WRAP && t.indexOf(' ') > 0) {
        var mid = Math.floor(t.length / 2), sp = t.lastIndexOf(' ', mid);
        if (sp < 4) sp = t.indexOf(' ', mid);
        if (sp > 0) lines = [t.slice(0, sp), t.slice(sp + 1)];
      }
      var LH = WRAP < 16 ? 22 : 15;
      var dy = s < -0.6 ? -(lines.length - 1) * LH - 2 : s > 0.6 ? LH * 0.7 : 4 - (lines.length - 1) * LH / 2;
      return '<text class="wh-lb" x="' + f1(p[0]) + '" y="' + f1(p[1] + dy) + '" text-anchor="' + anchor + '">' +
        lines.map(function (l, k) { return '<tspan x="' + f1(p[0]) + '"' + (k ? ' dy="' + LH + '"' : '') + '>' + esc(l) + '</tspan>'; }).join('') + '<title>' + esc(text) + '</title></text>';
    }
    function paintWheel() {
      var small = svg.getBoundingClientRect().width < 440;
      R = small ? 128 : 150; WRAP = small ? 10 : 16;
      root.classList.toggle('wh--small', small);
      var idx = named(), n = idx.length, h = '';
      h += '<circle class="wh-rim" cx="' + CX + '" cy="' + CY + '" r="' + R + '"/>';
      if (n < MIN) {
        h += '<circle class="wh-hub" cx="' + CX + '" cy="' + CY + '" r="2"/>';
        h += '<text class="wh-empty" x="' + CX + '" y="' + (CY + 34) + '" text-anchor="middle">Назови хотя бы три сферы</text>';
        g.innerHTML = h;
        $('#' + P + 'sum').textContent = 'Колесо: пока меньше трёх сфер.';
        return;
      }
      var poly = [], dots = '', rays = '', labels = '', sum = [];
      idx.forEach(function (i, k) {
        var it = st.items[i], a = ang(k, n), e = pt(a, R);
        rays += '<line class="wh-ray" x1="' + CX + '" y1="' + CY + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '"/>';
        /* засечки поперёк луча */
        var nx = -Math.sin(a), ny = Math.cos(a);
        for (var t = 1; t <= 10; t++) {
          var q = pt(a, R * t / 10), L = t % 5 ? 2.5 : 4.5;
          rays += '<line class="wh-tk' + (t % 5 ? '' : ' wh-tk5') + '" x1="' + f1(q[0] - nx * L) + '" y1="' + f1(q[1] - ny * L) + '" x2="' + f1(q[0] + nx * L) + '" y2="' + f1(q[1] + ny * L) + '"/>';
        }
        labels += label(it.n.trim(), a, R + 16);
        if (it.s != null) {
          var p = pt(a, R * it.s / 10);
          poly.push(f1(p[0]) + ',' + f1(p[1]));
          dots += '<circle class="wh-dot' + (it.f ? ' is-f' : '') + '" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (it.f ? 5 : 4.5) + '"/>';
        }
        sum.push(it.n.trim() + ' ' + (it.s == null ? 'без оценки' : it.s) + (it.f ? ', фокус' : ''));
      });
      h += rays;
      if (poly.length >= 3) h += '<polygon class="wh-poly" points="' + poly.join(' ') + '"/>';
      else if (poly.length === 2) h += '<polyline class="wh-poly wh-poly--open" points="' + poly.join(' ') + '"/>';
      h += '<circle class="wh-hub" cx="' + CX + '" cy="' + CY + '" r="2"/>' + dots + labels;
      g.innerHTML = h;
      $('#' + P + 'sum').textContent = 'Колесо: ' + sum.join('; ') + '.';
    }

    /* ---------- фокус: два вопроса ---------- */
    function renderFocus() {
      var fs = [];
      st.items.forEach(function (it, i) { if (it.f) fs.push(i); });
      var box = $('[data-focus]');
      if (!fs.length) {
        box.innerHTML = '<p class="wh-note">Отметь кружком одну-две сферы фокуса — для них два вопроса.</p>';
        return;
      }
      box.innerHTML = fs.map(function (i) {
        var it = st.items[i];
        return '<section class="wh-fq" aria-labelledby="' + P + 'fh' + i + '"><h3 class="wh-fh" id="' + P + 'fh' + i + '" data-fh="' + i + '">' + esc(nm(it, i)) + '</h3>' +
          '<label class="wh-q"><span>Что здесь значит «хорошо»</span><input class="wh-in-t" type="text" data-good="' + i + '" maxlength="160" value="' + esc(it.good) + '" placeholder="например, высыпаюсь и есть силы на вечер"></label>' +
          '<label class="wh-q"><span>Что сдвинет оценку на один балл</span><input class="wh-in-t" type="text" data-up="' + i + '" maxlength="160" value="' + esc(it.up) + '" placeholder="например, ложиться до полуночи три раза в неделю"></label>' +
          '</section>';
      }).join('');
    }

    function set(i, v) {
      v = Math.max(0, Math.min(10, v));
      if (st.items[i].s === v) return;
      st.items[i].s = v;
      paintRow(i); paintWheel(); save();
    }

    /* ---------- ползунок: мышь, палец, клавиатура ---------- */
    list.addEventListener('pointerdown', function (e) {
      var sl = e.target.closest('[data-sl]');
      if (!sl || e.button) return;
      var i = +sl.getAttribute('data-sl'), tr = sl.querySelector('.wh-track');
      function at(x) { var r = tr.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(1, (x - r.left) / r.width)) * 10); }
      sl.classList.add('is-drag');
      try { sl.setPointerCapture(e.pointerId); } catch (er) { }
      sl.focus({ preventScroll: true });
      set(i, at(e.clientX));
      function mv(ev) { set(i, at(ev.clientX)); }
      function up() { sl.classList.remove('is-drag'); sl.removeEventListener('pointermove', mv); sl.removeEventListener('pointerup', up); sl.removeEventListener('pointercancel', up); }
      sl.addEventListener('pointermove', mv); sl.addEventListener('pointerup', up); sl.addEventListener('pointercancel', up);
      e.preventDefault();
    });
    list.addEventListener('keydown', function (e) {
      var sl = e.target.closest('[data-sl]');
      if (!sl) return;
      var i = +sl.getAttribute('data-sl'), v = st.items[i].s, cur = v == null ? 0 : v, nv;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowUp': nv = v == null ? 5 : cur + 1; break;
        case 'ArrowLeft': case 'ArrowDown': nv = v == null ? 5 : cur - 1; break;
        case 'PageUp': nv = cur + 3; break;
        case 'PageDown': nv = cur - 3; break;
        case 'Home': nv = 0; break;
        case 'End': nv = 10; break;
        default: return;
      }
      e.preventDefault();
      set(i, nv);
    });

    /* колесо: на ноутбуке точку можно тянуть прямо по лучу */
    var drag = null;
    function rayAt(e) {
      var idx = named(), n = idx.length;
      if (n < MIN) return null;
      var r = svg.getBoundingClientRect(), sc = 520 / r.width;
      var x = (e.clientX - r.left) * sc - CX, y = (e.clientY - r.top) * sc - CY;
      if (Math.sqrt(x * x + y * y) > R + 14) return null;
      var a = Math.atan2(y, x) + Math.PI / 2; if (a < 0) a += 2 * Math.PI;
      var k = Math.round(a / (2 * Math.PI / n)) % n;
      return { i: idx[k], a: ang(k, n) };
    }
    function valAt(e, a) {
      var r = svg.getBoundingClientRect(), sc = 520 / r.width;
      var x = (e.clientX - r.left) * sc - CX, y = (e.clientY - r.top) * sc - CY;
      return Math.round(Math.max(0, (x * Math.cos(a) + y * Math.sin(a)) / R) * 10);
    }
    svg.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button) return;
      var h = rayAt(e);
      if (!h) return;
      drag = h;
      try { svg.setPointerCapture(e.pointerId); } catch (er) { }
      svg.classList.add('is-drag');
      set(h.i, valAt(e, h.a));
      e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) {
      if (drag) { set(drag.i, valAt(e, drag.a)); return; }
      if (e.pointerType !== 'touch') svg.classList.toggle('is-hot', !!rayAt(e));
    });
    function endDrag() { if (drag) { drag = null; svg.classList.remove('is-drag'); } }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('pointerleave', function () { svg.classList.remove('is-hot'); });

    /* ---------- ввод ---------- */
    root.addEventListener('input', function (e) {
      var t = e.target, a;
      if ((a = t.getAttribute('data-n')) !== null) {
        var i = +a;
        st.items[i].n = t.value;
        paintRow(i); paintWheel();
        var fh = root.querySelector('[data-fh="' + i + '"]');
        if (fh) fh.textContent = nm(st.items[i], i);
      } else if ((a = t.getAttribute('data-good')) !== null) st.items[+a].good = t.value;
      else if ((a = t.getAttribute('data-up')) !== null) st.items[+a].up = t.value;
      else return;
      save();
    });
    root.addEventListener('keydown', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-n');
      if (a === null || a === undefined || e.key !== 'Enter') return;
      e.preventDefault();
      var nx = root.querySelector('[data-n="' + (+a + 1) + '"]');
      if (nx) nx.focus();
      else if (st.items.length < MAX) add();
    });

    function add() {
      if (st.items.length >= MAX) return;
      st.items.push(item());
      renderList(); paintWheel(); save();
      root.querySelector('[data-n="' + (st.items.length - 1) + '"]').focus();
      if (st.items.length >= MAX) say('Это девятая сфера, больше не нужно.');
    }

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-add]')) { add(); return; }
      if ((b = e.target.closest('[data-x]'))) {
        var i = +b.getAttribute('data-x');
        if (st.items.length <= MIN) return;
        var was = nm(st.items[i], i);
        st.items.splice(i, 1);
        renderList(); paintWheel(); renderFocus(); save();
        var nx = root.querySelector('[data-n="' + Math.min(i, st.items.length - 1) + '"]');
        if (nx) nx.focus();
        say('Сфера «' + was + '» убрана.');
        return;
      }
      if ((b = e.target.closest('[data-f]'))) {
        var j = +b.getAttribute('data-f'), it = st.items[j];
        if (!it.f && st.items.filter(function (x) { return x.f; }).length >= FMAX) { say('Фокусов уже два. Сними один, чтобы выбрать другой.'); return; }
        it.f = !it.f;
        paintRow(j); paintWheel(); renderFocus(); save();
        return;
      }
      if ((b = e.target.closest('[data-clear-all]'))) {
        if (!armed) {
          armed = setTimeout(function () { armed = 0; b.textContent = 'Стереть ответы'; }, 3000);
          b.textContent = 'Точно стереть?';
          return;
        }
        clearTimeout(armed); armed = 0;
        st = blank();
        try { localStorage.removeItem(KEY); } catch (er) { }
        renderList(); paintWheel(); renderFocus();
        b.textContent = 'Стёрто';
        say('Ответы стёрты.');
        setTimeout(function () { b.textContent = 'Стереть ответы'; }, 1600);
      }
    });

    /* текст для «Скопировать текстом» */
    root.wkText = function () {
      var rows = [];
      st.items.forEach(function (it) {
        if (!it.n.trim()) return;
        var r = '— ' + it.n.trim() + ': ' + (it.s == null ? 'без оценки' : it.s + ' из 10') + (it.f ? ' (фокус)' : '');
        if (it.good.trim()) r += '\n  «хорошо»: ' + it.good.trim();
        if (it.up.trim()) r += '\n  на балл выше: ' + it.up.trim();
        rows.push(r);
      });
      return rows.length ? 'Колесо контекстов\n' + rows.join('\n') : '';
    };

    renderList(); paintWheel(); renderFocus();
    var lastW = 0;
    window.addEventListener('resize', function () {
      var w = svg.getBoundingClientRect().width;
      if (Math.abs(w - lastW) > 20) { lastW = w; paintWheel(); }
    });
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="wheel"]'), init); }
  window.WaykeeperWheel = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
