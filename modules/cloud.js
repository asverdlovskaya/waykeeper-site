/* =====================================================================
   Waykeeper · «Облако и вешки» · префикс cl-
   Игровой слой, страница 404 (00-ix-play.md, решение 4).
   Источник образа — история Саши с Эльбруса («меня накрыло облаком, я перестала видеть вешки»):
   ничего не нужно делать — облако за текстом само редеет, и по одной проступают вешки
   к живым страницам. Ссылки нажимаются сразу, ждать не нужно: проступает только их вид.

   Разметка (новая страница 404.html, из _template.html, вместо примеров в <main>):
     <section class="hero hero--text cl-hero" data-field=".15" aria-labelledby="page-title">
       <div class="wrap"><div class="hero-text">
         <h1 id="page-title">Такой страницы нет</h1>
         <div data-module="cloud" data-clear></div>
       </div></div>
     </section>
   data-to=".42"   — до какой густоты редеет облако (густота «до» — data-field секции)
   data-home, data-program, data-practices, data-talk — адреса (по умолчанию index.html, program.html, practices.html, talk.html)
   Использует field.js: меняет data-field своей секции и зовёт Field.refresh(). Ничего не хранит.
   Облаку нужны широкие мягкие формы поля — на этой странице поле запускается так:
     Field.init({blobs: WaykeeperCloud.blobs});
   ===================================================================== */
(function () {
  'use strict';

  var T = {
    home: 'На главную →',
    program: 'Как устроен «Переход» →',
    practices: 'Все практики →',
    talk: 'Как проходит разговор →',
    tg: 'Написать в Telegram'
  };

  function rm() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function init(root) {
    if (root.wkCloud) return root.wkCloud;
    var a = function (k, d) { return esc(root.getAttribute('data-' + k) || d); };
    var zone = root.closest('[data-field]');
    var k0 = zone ? parseFloat(zone.getAttribute('data-field')) : NaN;
    var k1 = parseFloat(root.getAttribute('data-to') || '.42');

    root.classList.add('cl');
    root.innerHTML =
      '<ol class="cl-path">' +
        '<li class="cl-here" aria-hidden="true"><i></i></li>' +
        '<li class="cl-pole"><i aria-hidden="true"></i><a class="link" href="' + a('home', 'index.html') + '">' + T.home + '</a></li>' +
        '<li class="cl-pole"><i aria-hidden="true"></i><a class="link" href="' + a('program', 'program.html') + '">' + T.program + '</a></li>' +
        '<li class="cl-pole"><i aria-hidden="true"></i><a class="link" href="' + a('practices', 'practices.html') + '">' + T.practices + '</a></li>' +
        '<li class="cl-pole"><i aria-hidden="true"></i><a class="link" href="' + a('talk', 'talk.html') + '">' + T.talk + '</a></li>' +
        '<li class="cl-pole"><i aria-hidden="true"></i><a class="link" href="https://t.me/asverdlovskaya" target="_blank" rel="noopener" data-tg>' + T.tg + '</a></li>' +
      '</ol>';

    // адрес Telegram подставляет site.js; если он уже отработал — повторяем его правило здесь
    var tgSrc = document.querySelector('a[data-tg]:not(.cl a)');
    var tg = root.querySelector('[data-tg]');
    if (tgSrc && tgSrc.getAttribute('href') !== '#telegram') {
      tg.setAttribute('href', tgSrc.getAttribute('href'));
      if (tgSrc.target) { tg.target = tgSrc.target; tg.rel = 'noopener'; }
    }

    var poles = Array.prototype.slice.call(root.querySelectorAll('.cl-pole'));
    var timers = [];

    function done() {
      root.classList.add('is-clear');
      poles.forEach(function (p) { p.classList.add('on'); });
      if (zone && !isNaN(k0)) { zone.setAttribute('data-field', String(k1)); if (window.Field) Field.refresh(); }
    }
    function play() {
      if (rm() || !zone || isNaN(k0)) { done(); return; }
      // облако редеет за 3,2 с, вешки проступают одна за другой
      var STEPS = 14, DUR = 3200, START = 500;
      for (var s = 1; s <= STEPS; s++) (function (s) {
        timers.push(setTimeout(function () {
          var v = k0 + (k1 - k0) * ease(s / STEPS);
          zone.setAttribute('data-field', v.toFixed(3));
          if (window.Field) Field.refresh();
        }, START + DUR * s / STEPS));
      })(s);
      poles.forEach(function (p, i) { timers.push(setTimeout(function () { p.classList.add('on'); }, START + 900 + i * 520)); });
      timers.push(setTimeout(function () { root.classList.add('is-clear'); }, START + DUR));
    }
    // фокус с клавиатуры не ждёт облака
    root.addEventListener('focusin', function () { timers.forEach(clearTimeout); done(); });

    play();
    var api = { done: done };
    root.wkCloud = api;
    return api;
  }

  function boot() { document.querySelectorAll('[data-module="cloud"]').forEach(function (el) { init(el); }); }
  // широкие медленные формы на весь экран — облако (формат BLOBS из field.js, доли окна)
  var BLOBS = [
    { ax: .74, ay: .34, rx: .05, ry: .04, sx: .30, sy: .22, sp: .030, ph: 0.0, a: .44, rot: -.3 },
    { ax: .28, ay: .80, rx: .06, ry: .03, sx: .34, sy: .16, sp: .024, ph: 1.7, a: .40, rot: .2 },
    { ax: .50, ay: .08, rx: .05, ry: .03, sx: .40, sy: .12, sp: .027, ph: 3.1, a: .34, rot: .1 },
    { ax: .95, ay: .82, rx: .04, ry: .05, sx: .18, sy: .24, sp: .033, ph: 4.4, a: .36, rot: .5 }
  ];
  window.WaykeeperCloud = { init: init, blobs: BLOBS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
