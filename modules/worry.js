/* Waykeeper · практика «Контейнер для тревоги» · префикс wr-
   Контейнер: <div data-module="worry" data-clear></div>
   data-clear — без своей стеклянной подложки
   data-store — свой ключ хранения (по умолчанию «waykeeper.worry»)
   Мысль одной строкой + время, когда о ней подумать; список отложенного, наступившее время отмечено.
   Ответы — только в этом браузере (localStorage). root.wkText() — ответы текстом для practice-kit. */
(function () {
  'use strict';

  var WD = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
  var WS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function blank() { return { v: 1, items: [], time: '18:00' }; }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1 && Array.isArray(d.items)) { d.time = d.time || '18:00'; return d; }
    } catch (e) { }
    return blank();
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = dayStart(d); x.setDate(x.getDate() + n); return x; }
  function stamp(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function parseAt(s) { var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null; }
  /* «сегодня в 18:00», «завтра в 18:00», «в пятницу в 18:00» */
  function when(at, short) {
    var d = parseAt(at); if (!d) return '';
    var diff = Math.round((dayStart(d) - dayStart(new Date())) / 864e5), t = p2(d.getHours()) + ':' + p2(d.getMinutes());
    var day = diff === 0 ? 'сегодня' : diff === 1 ? 'завтра' : diff === -1 ? 'вчера'
      : (diff > 1 && diff < 7) ? (short ? WS[d.getDay()] : WD[d.getDay()]) : WS[d.getDay()] + ' ' + d.getDate() + '.' + p2(d.getMonth() + 1);
    return short ? day + ', ' + t : day + ' в ' + t;
  }

  function init(root) {
    if (root.__wr) return;
    root.__wr = true;
    var P = 'wr' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.worry';
    var st = load(KEY);

    root.classList.add('wr');
    if (!root.hasAttribute('data-clear')) root.classList.add('wr--panel');

    root.innerHTML =
      '<form class="wr-form" data-form novalidate>' +
        '<label class="wr-l" for="' + P + 't">Мысль, которая крутится</label>' +
        '<input class="wr-in wr-in--t" id="' + P + 't" type="text" data-t maxlength="140" autocomplete="off" placeholder="например: а вдруг проект не взлетит">' +
        '<div class="wr-when">' +
          '<span class="wr-wl" id="' + P + 'wl">Подумаю об этом</span>' +
          '<select class="wr-sel" data-day aria-labelledby="' + P + 'wl"></select>' +
          '<input class="wr-in wr-time" type="time" step="900" data-time aria-label="Во сколько">' +
          '<button type="submit" class="wr-btn">Отложить</button>' +
        '</div>' +
        '<p class="wr-err" data-err aria-live="polite"></p>' +
      '</form>' +
      '<p class="wr-say" data-say aria-live="polite"></p>' +
      '<section class="wr-box" aria-labelledby="' + P + 'h"><h3 class="wr-h" id="' + P + 'h">Отложено</h3><ul class="wr-list" data-list></ul></section>' +
      '<div class="wr-foot"><button type="button" class="wr-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var inp = $('[data-t]'), sel = $('[data-day]'), tm = $('[data-time]'), list = $('[data-list]'), err = $('[data-err]'), sayEl = $('[data-say]');

    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }

    function fillDays() {
      var keep = sel.value, now = new Date(), h = '';
      for (var i = 0; i < 7; i++) {
        var d = addDays(now, i);
        h += '<option value="' + stamp(d) + '">' + (i === 0 ? 'сегодня' : i === 1 ? 'завтра' : WD[d.getDay()]) + '</option>';
      }
      sel.innerHTML = h;
      if (keep && sel.querySelector('option[value="' + keep + '"]')) sel.value = keep;
    }

    function renderList() {
      var now = Date.now();
      var items = st.items.slice().sort(function (a, b) { return (parseAt(a.at) || 0) - (parseAt(b.at) || 0); });
      var h = !items.length ? '<li class="wr-empty">Пока пусто.</li>' : items.map(function (it) {
        var d = parseAt(it.at), due = d && d.getTime() <= now;
        return '<li class="wr-it' + (due ? ' is-due' : '') + '">' +
          '<span class="wr-at">' + (due ? '<i aria-hidden="true"></i>пора · ' : '') + esc(when(it.at, true)) + '</span>' +
          '<span class="wr-tx">' + esc(it.t) + '</span>' +
          '<button type="button" class="wr-x" data-x="' + esc(it.id) + '" aria-label="Убрать: ' + esc(it.t) + '"><span aria-hidden="true">×</span></button>' +
          '</li>';
      }).join('');
      if (h !== last) { list.innerHTML = h; last = h; }
    }
    var last = null;

    $('[data-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = inp.value.trim(), time = tm.value || st.time;
      err.textContent = '';
      if (!t) { err.textContent = 'Сначала запиши мысль одной строкой.'; inp.focus(); return; }
      var at = sel.value + 'T' + time, d = parseAt(at);
      if (!d) { err.textContent = 'Выбери время.'; tm.focus(); return; }
      if (d.getTime() <= Date.now()) { err.textContent = 'Это время уже прошло. Выбери позже или завтра.'; tm.focus(); return; }
      st.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: t, at: at });
      st.time = time;
      save(); renderList();
      inp.value = '';
      sayEl.innerHTML = 'Скажи себе: <q>Я подумаю об этом ' + esc(when(at)) + '</q>. И вернись к своему дню.';
      inp.focus();
    });
    inp.addEventListener('input', function () { if (err.textContent) err.textContent = ''; });

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-x]'))) {
        var id = b.getAttribute('data-x');
        st.items = st.items.filter(function (it) { return it.id !== id; });
        save(); renderList();
        inp.focus();
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
        tm.value = st.time; inp.value = ''; sayEl.textContent = 'Ответы стёрты.';
        renderList();
        b.textContent = 'Стёрто';
        setTimeout(function () { b.textContent = 'Стереть ответы'; if (sayEl.textContent === 'Ответы стёрты.') sayEl.textContent = ''; }, 1600);
      }
    });

    root.wkText = function () {
      if (!st.items.length) return '';
      return 'Контейнер для тревоги\n' + st.items.slice().sort(function (a, b) { return (parseAt(a.at) || 0) - (parseAt(b.at) || 0); })
        .map(function (it) { return '— ' + it.t + ' (' + when(it.at, true) + ')'; }).join('\n');
    };

    fillDays();
    tm.value = st.time;
    var first = parseAt(sel.value + 'T' + st.time);
    if (!first || first.getTime() <= Date.now()) sel.selectedIndex = 1;
    renderList();
    /* раз в полминуты: наступило ли время, сменились ли сутки */
    setInterval(function () { fillDays(); renderList(); }, 30000);
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="worry"]'), init); }
  window.WaykeeperWorry = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
