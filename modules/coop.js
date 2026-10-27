/* =====================================================================
   Waykeeper · «Кооп» · префикс co-
   Игровой слой, «О проекте», блок «Что будет дальше» (00-ix-play.md, решение 9). Пасхалка.
   Источник — Journey: двое идут рядом. Фраза Саши: «…выходить в PvP больно, а кооперативные я обожаю».

   Человек наводит курсор на слово (или ставит на него фокус, или касается его) →
   рядом в поле появляются две тонкие точки, тёплая и тёмная, какое-то время идут вместе
   и растворяются. Ни подписей, ни подсказок, курсор обычный.

   Разметка: слово в тексте страницы оборачивается в <span data-coop>кооперативные</span>.
   Подключение: <link rel="stylesheet" href="modules/coop.css"> и <script src="modules/coop.js" defer></script>.
   field.js не трогает и ни от чего не зависит. Ничего не хранит.
   ===================================================================== */
(function () {
  'use strict';

  var DUR = 6400;          /* сколько идут вместе, мс */
  var REST = 1600;         /* пауза, прежде чем можно позвать снова, мс */

  function rm() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* путь: в свободное поле справа от текста, а если места нет (телефон) — под текстом */
  function route(word) {
    var r = word.getBoundingClientRect();
    var block = word.closest('p, li, div') || word.parentNode;
    var b = block.getBoundingClientRect();
    var sx = window.scrollX, sy = window.scrollY, vw = document.documentElement.clientWidth;
    var free = vw - b.right;
    if (free >= 200) {
      var len = Math.min(220, free - 60);
      return { x: b.right + 36 + sx, y: r.top + r.height / 2 + sy, dx: len, dy: -18 };
    }
    var x0 = Math.max(20, Math.min(r.left, vw - 220));
    return { x: x0 + sx, y: b.bottom + 30 + sy, dx: Math.min(190, vw - x0 - 30), dy: 6 };
  }

  /* точка на пути с лёгким покачиванием; k — доля пути */
  function at(p, k, side, phase) {
    var e = smooth(k);
    var x = p.x + p.dx * e;
    var y = p.y + p.dy * e + Math.sin(k * Math.PI * 2 + phase) * 5;
    var gap = 5 + 2.5 * Math.sin(k * Math.PI * 3 + phase);   /* то ближе, то чуть дальше */
    return [x, y + side * gap];
  }

  function frames(p, side, lag, phase, peak) {
    var out = [], N = 24;
    for (var i = 0; i <= N; i++) {
      var u = i / N, k = Math.max(0, Math.min(1, (u - lag) / (1 - lag)));
      var q = at(p, k, side, phase);
      var op = u < .12 ? u / .12 : u > .68 ? 1 - (u - .68) / .32 : 1;
      var blur = u > .68 ? ((u - .68) / .32 * 2).toFixed(2) : 0;
      out.push({ transform: 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px)', opacity: (Math.max(0, op) * peak).toFixed(3), filter: 'blur(' + blur + 'px)', offset: u });
    }
    return out;
  }

  function dot(cls) {
    var d = document.createElement('i');
    d.className = 'co-dot ' + cls;
    d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
    return d;
  }

  /* pin — для проверки: остановить на доле 0…1 */
  function play(word, pin) {
    if (word.coBusy) return;
    word.coBusy = true;
    var p = route(word), still = rm();
    var a = dot('co-warm'), b = dot('co-ink');
    var anims = [];
    if (still || !a.animate) {
      /* без движения: две точки рядом проступают и гаснут на месте */
      [[a, -1], [b, 1]].forEach(function (x) {
        var q = at(p, .2, x[1], 0);
        x[0].style.transform = 'translate(' + q[0] + 'px,' + q[1] + 'px)';
        x[0].classList.add('co-still');
      });
      requestAnimationFrame(function () { a.classList.add('on'); b.classList.add('on'); });
      setTimeout(function () { a.classList.remove('on'); b.classList.remove('on'); }, 2600);
      setTimeout(end, 3600);
    } else {
      anims.push(a.animate(frames(p, -1, 0, 0, .9), { duration: DUR, easing: 'linear', fill: 'both' }));
      anims.push(b.animate(frames(p, 1, .04, .8, .6), { duration: DUR, easing: 'linear', fill: 'both' }));
      if (pin != null) anims.forEach(function (an) { an.pause(); an.currentTime = DUR * pin; });
      else anims[0].onfinish = end;
    }
    function end() {
      a.remove(); b.remove();
      setTimeout(function () { word.coBusy = false; }, REST);
    }
  }

  function init(word) {
    if (word.coReady) return;
    word.coReady = true;
    word.classList.add('co-word');
    if (!word.hasAttribute('tabindex')) word.setAttribute('tabindex', '0');
    var go = function () { play(word); };
    word.addEventListener('pointerenter', go);
    word.addEventListener('focus', go);
  }

  function boot() { document.querySelectorAll('[data-coop]').forEach(init); }
  window.WaykeeperCoop = { init: init, play: play };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
