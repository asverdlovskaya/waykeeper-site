/* Waykeeper · практика «Собрать один ритуал» · префикс rt-
   Контейнер: <div data-module="ritual" data-clear></div>
   data-clear — без своей стеклянной подложки
   data-store — свой ключ хранения (по умолчанию «waykeeper.ritual»)
   Пять деталей → карточка. «Распечатать» печатает только карточку (window.print, стили печати в ritual.css).
   Ответы — только в этом браузере (localStorage). root.wkText() — ответы текстом для practice-kit,
   root.wkPrintSheet() — разметка печатной карточки. */
(function () {
  'use strict';

  var F = [
    { id: 'why', l: 'Зачем', ph: 'войти в день спокойно' },
    { id: 'trig', l: 'После чего начинается', ph: 'после того, как поставлю чайник' },
    { id: 'obj', l: 'Что под рукой', ph: 'окно, стакан воды' },
    { id: 'act', l: 'Что делаю', hint: 'так коротко, чтобы получилось и в плохой день', ph: 'три вдоха и минута взгляда в небо' },
    { id: 'end', l: 'Как заканчиваю', ph: 'сказать вслух: «Всё, день начат»' }
  ];
  var NOTE = 'Не пошёл — замени одну деталь. Чиним дизайн, а не себя.';
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function blank() { return { v: 1, name: '', why: '', trig: '', obj: '', act: '', end: '' }; }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1) return d;
    } catch (e) { }
    return blank();
  }

  /* печать одного листа: всё остальное на странице прячется стилями печати */
  function printSheet(html) {
    var old = document.querySelector('.wk-print-sheet');
    if (old) old.parentNode.removeChild(old);
    var d = document.createElement('div');
    d.className = 'wk-print-sheet';
    d.innerHTML = html;
    document.body.appendChild(d);
    document.documentElement.classList.add('wk-print');
    function done() {
      document.documentElement.classList.remove('wk-print');
      if (d.parentNode) d.parentNode.removeChild(d);
      window.removeEventListener('afterprint', done);
    }
    window.addEventListener('afterprint', done);
    window.print();
  }

  function init(root) {
    if (root.__rt) return;
    root.__rt = true;
    var P = 'rt' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.ritual';
    var st = load(KEY), saveT = 0;

    root.classList.add('rt');
    if (!root.hasAttribute('data-clear')) root.classList.add('rt--panel');

    var form = '<label class="rt-f rt-f--name"><span>Название</span><input class="rt-in" type="text" data-k="name" maxlength="60" autocomplete="off" placeholder="например, Утро у окна"></label>';
    F.forEach(function (f, i) {
      form += '<label class="rt-f"><span><em>' + (i + 1) + '</em>' + f.l + (f.hint ? ' <small>— ' + f.hint + '</small>' : '') + '</span>' +
        '<textarea class="rt-in rt-ta" rows="1" data-k="' + f.id + '" maxlength="160" placeholder="' + esc(f.ph) + '"></textarea></label>';
    });

    root.innerHTML =
      '<div class="rt-form">' + form + '</div>' +
      '<div class="rt-side">' +
        '<article class="rt-card" aria-labelledby="' + P + 'h" data-card></article>' +
        '<div class="rt-acts"><button type="button" class="rt-btn" data-print>Распечатать</button></div>' +
      '</div>' +
      '<p class="rt-sr" aria-live="polite" data-live></p>' +
      '<div class="rt-foot"><button type="button" class="rt-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var card = $('[data-card]'), live = $('[data-live]');

    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }, 250);
    }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function v(k) { return (st[k] || '').trim(); }

    function cardHtml(id) {
      var h = '<h3 class="rt-ct' + (v('name') ? '' : ' is-empty') + '"' + (id ? ' id="' + id + '"' : '') + '>' + (v('name') ? esc(v('name')) : 'Мой ритуал') + '</h3><dl class="rt-dl">';
      F.forEach(function (f) {
        h += '<div><dt>' + f.l + '</dt><dd' + (v(f.id) ? '' : ' class="is-empty"') + '>' + (v(f.id) ? esc(v(f.id)) : '—') + '</dd></div>';
      });
      return h + '</dl><p class="rt-cn">' + NOTE + '</p>';
    }
    function paintCard() { card.innerHTML = cardHtml(P + 'h'); }
    function grow(ta) { if (ta.tagName !== 'TEXTAREA') return; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
    function growAll() { [].forEach.call(root.querySelectorAll('.rt-ta'), grow); }
    function paintForm() { [].forEach.call(root.querySelectorAll('[data-k]'), function (inp) { inp.value = st[inp.getAttribute('data-k')] || ''; }); growAll(); }

    root.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k');
      if (!k) return;
      st[k] = e.target.value;
      grow(e.target); paintCard(); save();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target.getAttribute || !e.target.getAttribute('data-k')) return;
      e.preventDefault();
      var all = [].slice.call(root.querySelectorAll('[data-k]')), i = all.indexOf(e.target);
      if (all[i + 1]) all[i + 1].focus();
    });

    root.wkPrintSheet = function () {
      return '<div class="rt-print"><article class="rt-card">' + cardHtml('') + '</article></div>';
    };

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-print]')) {
        if (!F.some(function (f) { return v(f.id); })) { say('Карточка пока пустая — впиши хотя бы одну деталь.'); return; }
        printSheet(root.wkPrintSheet());
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
        paintForm(); paintCard();
        b.textContent = 'Стёрто';
        say('Ответы стёрты.');
        setTimeout(function () { b.textContent = 'Стереть ответы'; }, 1600);
      }
    });

    root.wkText = function () {
      var r = F.filter(function (f) { return v(f.id); }).map(function (f) { return f.l + ': ' + v(f.id); });
      if (!r.length && !v('name')) return '';
      return 'Ритуал' + (v('name') ? ' «' + v('name') + '»' : '') + '\n' + r.join('\n');
    };

    paintForm(); paintCard();
    var lastW = root.offsetWidth;
    window.addEventListener('resize', function () { if (root.offsetWidth !== lastW) { lastW = root.offsetWidth; growAll(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(growAll);
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="ritual"]'), init); }
  window.WaykeeperRitual = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
