/* Waykeeper · «Сезоны жизни» к практике «Три живых периода» · префикс lf-
   Контейнер: <div data-module="seasons" data-clear></div>
   data-clear — без своей стеклянной подложки
   data-store — свой ключ хранения (по умолчанию «waykeeper.seasons»)
   Ответы — только в этом браузере (localStorage). root.wkText() отдаёт ответы текстом для practice-kit. */
(function () {
  'use strict';

  var MIN = 2, MAX = 12, ALIVE = 3;
  var PH = [
    ['например, детство до школы', '0–6'],
    ['например, школа в другом городе', '7–17'],
    ['например, университет', '18–22'],
    ['например, первая работа', '23–26']
  ];
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function item() { return { n: '', y: '', a: false, p: '', d: '', w: '' }; }
  function blank() { return { v: 1, items: [item(), item(), item(), item()], common: '' }; }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1 && Array.isArray(d.items) && d.items.length >= MIN) { d.common = d.common || ''; return d; }
    } catch (e) { }
    return blank();
  }

  function init(root) {
    if (root.__lf) return;
    root.__lf = true;
    var P = 'lf' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.seasons';
    var st = load(KEY), saveT = 0;

    root.classList.add('lf');
    if (!root.hasAttribute('data-clear')) root.classList.add('lf--panel');

    root.innerHTML =
      '<p class="lf-step">Раздели жизнь на сезоны и дай каждому название.</p>' +
      '<ol class="lf-rows" data-rows></ol>' +
      '<button type="button" class="lf-add" data-add>+ сезон</button>' +
      '<div class="lf-fig">' +
        '<div class="lf-line" role="group" aria-labelledby="' + P + 'hint" data-line></div>' +
        '<p class="lf-hint" id="' + P + 'hint" data-hint></p>' +
      '</div>' +
      '<div class="lf-alive" data-alive></div>' +
      '<label class="lf-common" data-common-box hidden><span class="lf-step">Что повторяется в живых сезонах</span>' +
        '<textarea class="lf-ta" rows="3" data-common placeholder="Глаголы, места, люди, роль. Например: запускать с нуля, маленькая команда, много свободы"></textarea></label>' +
      '<p class="lf-sr" aria-live="polite" data-live></p>' +
      '<div class="lf-foot"><button type="button" class="lf-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var rows = $('[data-rows]'), line = $('[data-line]'), hint = $('[data-hint]'), alive = $('[data-alive]'), live = $('[data-live]');

    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }, 250);
    }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function aliveCount() { return st.items.filter(function (it) { return it.a && it.n.trim(); }).length; }

    /* ---------- строки сезонов ---------- */
    function renderRows() {
      rows.innerHTML = st.items.map(function (it, i) {
        var ph = PH[i] || ['ещё сезон', 'годы'];
        return '<li class="lf-row">' +
          '<input class="lf-in lf-in--n" type="text" data-n="' + i + '" maxlength="48" autocomplete="off" value="' + esc(it.n) + '" placeholder="' + esc(ph[0]) + '" aria-label="Сезон ' + (i + 1) + ', название">' +
          '<input class="lf-in lf-in--y" type="text" data-y="' + i + '" maxlength="16" autocomplete="off" value="' + esc(it.y) + '" placeholder="' + esc(ph[1]) + '" aria-label="Сезон ' + (i + 1) + ', годы или возраст">' +
          '<button type="button" class="lf-x" data-x="' + i + '" aria-label="Убрать сезон ' + (i + 1) + '"' + (st.items.length <= MIN ? ' disabled' : '') + '><span aria-hidden="true">×</span></button>' +
          '</li>';
      }).join('');
      $('[data-add]').hidden = st.items.length >= MAX;
    }

    /* ---------- линия жизни ---------- */
    function renderLine() {
      var segs = [];
      st.items.forEach(function (it, i) { if (it.n.trim()) segs.push(i); });
      root.classList.toggle('lf--empty', segs.length < MIN);
      if (segs.length < MIN) {
        line.innerHTML = '<span class="lf-ghost" aria-hidden="true"></span>';
        hint.textContent = 'Назови хотя бы два сезона — они встанут на линию.';
        return;
      }
      line.innerHTML = segs.map(function (i) {
        var it = st.items[i];
        return '<button type="button" class="lf-seg" data-seg="' + i + '" aria-pressed="' + (it.a ? 'true' : 'false') + '">' +
          '<span class="lf-sn">' + esc(it.n.trim()) + '</span>' +
          '<span class="lf-bar" aria-hidden="true"><i></i></span>' +
          '<span class="lf-sy">' + (it.y.trim() ? esc(it.y.trim()) : '&nbsp;') + '</span>' +
          '</button>';
      }).join('') + '<span class="lf-seg lf-tail" aria-hidden="true"><span class="lf-sn"></span><span class="lf-bar"></span><span class="lf-sy">&nbsp;</span></span>';
      paintHint();
    }
    function paintHint() {
      hint.textContent = 'Отметь на линии три самых живых сезона';
    }

    /* ---------- живые сезоны ---------- */
    function renderAlive() {
      var on = [];
      st.items.forEach(function (it, i) { if (it.a && it.n.trim()) on.push(i); });
      var box = $('[data-common-box]'), was = box.hidden;
      box.hidden = !on.length;
      if (was && !box.hidden) grow($('[data-common]'));
      if (!on.length) { alive.innerHTML = ''; return; }
      alive.innerHTML = '<p class="lf-step">Для каждого живого: где, чем, с кем.</p>' + on.map(function (i) {
        var it = st.items[i];
        return '<section class="lf-card" aria-labelledby="' + P + 'a' + i + '">' +
          '<h3 class="lf-ch" id="' + P + 'a' + i + '"><i aria-hidden="true"></i><span data-an="' + i + '">' + esc(it.n.trim()) + '</span>' + (it.y.trim() ? ' <small>' + esc(it.y.trim()) + '</small>' : '') + '</h3>' +
          '<div class="lf-q3">' +
            '<label><span>Место</span><input class="lf-in" type="text" data-p="' + i + '" maxlength="120" value="' + esc(it.p) + '" placeholder="город, дом, комната"></label>' +
            '<label><span>Дело</span><input class="lf-in" type="text" data-d="' + i + '" maxlength="120" value="' + esc(it.d) + '" placeholder="чем были заняты дни"></label>' +
            '<label><span>Люди рядом</span><input class="lf-in" type="text" data-w="' + i + '" maxlength="120" value="' + esc(it.w) + '" placeholder="кто был рядом"></label>' +
          '</div></section>';
      }).join('');
    }

    function grow(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }
    function renderAll() {
      renderRows(); renderLine(); renderAlive();
      var ta = $('[data-common]');
      ta.value = st.common;
      if (!$('[data-common-box]').hidden) grow(ta);
    }

    /* ---------- ввод ---------- */
    root.addEventListener('input', function (e) {
      var t = e.target, a;
      if ((a = t.getAttribute('data-n')) !== null) {
        var i = +a, had = !!st.items[i].n.trim();
        st.items[i].n = t.value;
        if (had !== !!t.value.trim()) { renderLine(); renderAlive(); }
        else {
          var sn = line.querySelector('[data-seg="' + i + '"] .lf-sn'); if (sn) sn.textContent = t.value.trim();
          var an = root.querySelector('[data-an="' + i + '"]'); if (an) an.textContent = t.value.trim();
        }
      } else if ((a = t.getAttribute('data-y')) !== null) {
        st.items[+a].y = t.value;
        var sy = line.querySelector('[data-seg="' + a + '"] .lf-sy'); if (sy) sy.innerHTML = t.value.trim() ? esc(t.value.trim()) : '&nbsp;';
      } else if ((a = t.getAttribute('data-p')) !== null) st.items[+a].p = t.value;
      else if ((a = t.getAttribute('data-d')) !== null) st.items[+a].d = t.value;
      else if ((a = t.getAttribute('data-w')) !== null) st.items[+a].w = t.value;
      else if (t.hasAttribute('data-common')) { st.common = t.value; grow(t); }
      else return;
      save();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target.getAttribute) return;
      var a = e.target.getAttribute('data-n'), b = e.target.getAttribute('data-y');
      if (a !== null) { e.preventDefault(); root.querySelector('[data-y="' + a + '"]').focus(); return; }
      if (b !== null) {
        e.preventDefault();
        var nx = root.querySelector('[data-n="' + (+b + 1) + '"]');
        if (nx) nx.focus(); else add();
      }
    });

    function add() {
      if (st.items.length >= MAX) return;
      st.items.push(item());
      renderRows(); save();
      root.querySelector('[data-n="' + (st.items.length - 1) + '"]').focus();
    }

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-add]')) { add(); return; }
      if ((b = e.target.closest('[data-x]'))) {
        var i = +b.getAttribute('data-x');
        if (st.items.length <= MIN) return;
        st.items.splice(i, 1);
        renderAll(); save();
        var nx = root.querySelector('[data-n="' + Math.min(i, st.items.length - 1) + '"]');
        if (nx) nx.focus();
        say('Сезон убран.');
        return;
      }
      if ((b = e.target.closest('[data-seg]'))) {
        var j = +b.getAttribute('data-seg'), it = st.items[j];
        if (!it.a && aliveCount() >= ALIVE) { say('Уже три. Сними отметку с одного, чтобы выбрать другой.'); hint.textContent = 'Уже три. Сними отметку с одного, чтобы выбрать другой.'; return; }
        it.a = !it.a;
        b.setAttribute('aria-pressed', it.a ? 'true' : 'false');
        paintHint(); renderAlive(); save();
        say((it.a ? 'Отмечен: ' : 'Отметка снята: ') + it.n.trim() + '. ' + aliveCount() + ' из 3.');
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
        renderAll();
        b.textContent = 'Стёрто';
        say('Ответы стёрты.');
        setTimeout(function () { b.textContent = 'Стереть ответы'; }, 1600);
      }
    });

    root.wkText = function () {
      var r = [];
      st.items.forEach(function (it) {
        if (!it.n.trim()) return;
        var s = '— ' + it.n.trim() + (it.y.trim() ? ' (' + it.y.trim() + ')' : '') + (it.a ? ' — живой' : '');
        if (it.a) {
          if (it.p.trim()) s += '\n  место: ' + it.p.trim();
          if (it.d.trim()) s += '\n  дело: ' + it.d.trim();
          if (it.w.trim()) s += '\n  люди рядом: ' + it.w.trim();
        }
        r.push(s);
      });
      if (!r.length) return '';
      return 'Сезоны жизни\n' + r.join('\n') + (st.common.trim() ? '\n\nЧто повторяется в живых сезонах:\n' + st.common.trim() : '');
    };

    renderAll();
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="seasons"]'), init); }
  window.WaykeeperSeasons = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
