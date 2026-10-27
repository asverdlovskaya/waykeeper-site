/* Waykeeper · практика «Проверка „завтра понедельник“» · префикс mn-
   Контейнер: <div data-module="monday" data-clear></div>
   data-clear — без своей стеклянной подложки
   data-store — свой ключ хранения (по умолчанию «waykeeper.monday»)
   Шаг → «Завтра я это сделаю?» → если нет, уменьшить вдвое → снова. Версии шага стоят на тонкой линии.
   Ответы — только в этом браузере (localStorage). root.wkText() — ответы текстом для practice-kit. */
(function () {
  'use strict';

  var MAXV = 8;
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function blank() { return { v: 1, steps: [], phase: 'start' }; }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1 && Array.isArray(d.steps)) { if (!d.steps.length) d.phase = 'start'; return d; }
    } catch (e) { }
    return blank();
  }

  function init(root) {
    if (root.__mn) return;
    root.__mn = true;
    var P = 'mn' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.monday';
    var st = load(KEY);

    root.classList.add('mn');
    if (!root.hasAttribute('data-clear')) root.classList.add('mn--panel');

    root.innerHTML =
      '<ol class="mn-chain" data-chain aria-label="Версии шага"></ol>' +
      '<div class="mn-stage" data-stage></div>' +
      '<p class="mn-sr" aria-live="polite" data-live></p>' +
      '<div class="mn-foot"><button type="button" class="mn-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var chain = $('[data-chain]'), stage = $('[data-stage]'), live = $('[data-live]');

    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

    function renderChain() {
      var n = st.steps.length;
      chain.hidden = !n;
      chain.innerHTML = st.steps.map(function (s, i) {
        var last = i === n - 1;
        return '<li class="mn-v' + (last ? ' is-last' : '') + (last && st.phase === 'done' ? ' is-done' : '') + '">' +
          '<i aria-hidden="true"></i><span>' + esc(s) + '</span>' +
          (i > 0 ? '<small class="mn-sr">меньше вдвое</small>' : '') + '</li>';
      }).join('');
    }

    function renderStage(focus) {
      var h = '', ph = st.phase;
      if (ph === 'start') {
        h = '<form class="mn-form" data-form="start" novalidate>' +
          '<label class="mn-l" for="' + P + 'in">Шаг из плана</label>' +
          '<div class="mn-row"><input class="mn-in" id="' + P + 'in" type="text" data-in maxlength="140" autocomplete="off" placeholder="например, написать главу книги">' +
          '<button type="submit" class="mn-btn mn-btn--main">Проверить</button></div>' +
          '<p class="mn-err" data-err></p></form>';
      } else if (ph === 'ask') {
        h = '<div class="mn-ask" role="group" aria-labelledby="' + P + 'q"><p class="mn-q" id="' + P + 'q" tabindex="-1">Завтра понедельник. Ты это сделаешь?</p>' +
          '<div class="mn-row mn-row--btns"><button type="button" class="mn-btn mn-btn--main" data-yes>Да, сделаю</button>' +
          '<button type="button" class="mn-btn" data-no>Нет</button></div></div>';
      } else if (ph === 'shrink') {
        h = '<form class="mn-form" data-form="shrink" novalidate>' +
          '<label class="mn-l" for="' + P + 'in">Уменьши вдвое</label>' +
          '<div class="mn-row"><input class="mn-in" id="' + P + 'in" type="text" data-in maxlength="140" autocomplete="off" placeholder="меньше времени, меньше объёма или только начало">' +
          '<button type="submit" class="mn-btn mn-btn--main">Проверить</button></div>' +
          '<p class="mn-err" data-err></p></form>';
      } else if (ph === 'done') {
        h = '<div class="mn-done"><p class="mn-q" tabindex="-1">Этот шаг делается. Поставь его в календарь на завтра.</p>' +
          '<div class="mn-row mn-row--btns"><button type="button" class="mn-btn" data-new>Новый шаг</button></div></div>';
      }
      stage.innerHTML = h;
      if (!focus) return;
      var f = stage.querySelector('[data-in]') || stage.querySelector('.mn-q');
      if (f) f.focus({ preventScroll: false });
    }
    function render(focus) { renderChain(); renderStage(focus); }

    root.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-form]');
      if (!form) return;
      e.preventDefault();
      var inp = form.querySelector('[data-in]'), v = inp.value.trim(), err = form.querySelector('[data-err]');
      if (!v) { err.textContent = st.phase === 'start' ? 'Впиши один шаг.' : 'Впиши шаг поменьше.'; inp.focus(); return; }
      if (st.phase === 'shrink' && v === st.steps[st.steps.length - 1]) { err.textContent = 'Это тот же шаг. Сделай его вдвое меньше.'; inp.focus(); return; }
      st.steps.push(v);
      st.phase = 'ask';
      save(); render(true);
      say('Завтра понедельник. Ты это сделаешь?');
    });
    root.addEventListener('input', function (e) {
      if (!e.target.hasAttribute('data-in')) return;
      var err = stage.querySelector('[data-err]'); if (err) err.textContent = '';
    });

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-yes]')) { st.phase = 'done'; save(); render(true); say('Этот шаг делается. Поставь его в календарь на завтра.'); return; }
      if (e.target.closest('[data-no]')) {
        if (st.steps.length >= MAXV) { say('Уже восемь версий. Возьми самую маленькую и начни с неё.'); }
        st.phase = 'shrink'; save(); render(true);
        return;
      }
      if (e.target.closest('[data-new]')) { st = blank(); save(); render(true); return; }
      if ((b = e.target.closest('[data-clear-all]'))) {
        if (!armed) {
          armed = setTimeout(function () { armed = 0; b.textContent = 'Стереть ответы'; }, 3000);
          b.textContent = 'Точно стереть?';
          return;
        }
        clearTimeout(armed); armed = 0;
        st = blank();
        try { localStorage.removeItem(KEY); } catch (er) { }
        render(false);
        b.textContent = 'Стёрто';
        say('Ответы стёрты.');
        setTimeout(function () { b.textContent = 'Стереть ответы'; }, 1600);
      }
    });

    root.wkText = function () {
      if (!st.steps.length) return '';
      return 'Проверка «завтра понедельник»\n' + st.steps.map(function (s, i) {
        return (i ? '→ ' : 'Шаг: ') + s + (i === st.steps.length - 1 && st.phase === 'done' ? ' (делается)' : '');
      }).join('\n');
    };

    render(false);
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="monday"]'), init); }
  window.WaykeeperMonday = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
