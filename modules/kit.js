/* Waykeeper · практика «Аптечка на стену» · префикс kt-
   Контейнер: <div data-module="kit" data-clear></div>
   data-clear — без своей стеклянной подложки
   data-store — свой ключ хранения (по умолчанию «waykeeper.kit»)
   Одна страница «где я → что открыть → одно действие». Первая строка — сон, еда, вода (её не удалить).
   Последняя — «Кому я звоню, когда совсем плохо: …»: человек вписывает сам, сайт ничего не подставляет.
   «Распечатать» печатает только лист (window.print, стили печати в kit.css).
   Ответы — только в этом браузере (localStorage). root.wkText(), root.wkPrintSheet() — для practice-kit и печати. */
(function () {
  'use strict';

  var MAXROWS = 10;
  var CALL = 'Кому я звоню, когда совсем плохо:';
  var PH = [
    ['тревожно', 'карточку ритуала', 'записать мысль и назначить ей время'],
    ['перегруз', 'список дел', 'оставить два-три дела, остальное перенести'],
    ['пусто', 'плейлист «тихо»', 'свеча, уборка, позвонить одному человеку'],
    ['злюсь', 'заметку «не сейчас»', 'не писать сообщений, пройтись']
  ];
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row() { return { w: '', o: '', a: '' }; }
  function blank() {
    return { v: 1, call: '', rows: [{ w: 'Сначала всегда', o: '', a: 'Сон, еда, вода: поесть, выпить стакан воды, лечь пораньше' }, row(), row(), row()] };
  }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1 && Array.isArray(d.rows) && d.rows.length) { d.call = d.call || ''; return d; }
    } catch (e) { }
    return blank();
  }

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
    if (root.__kt) return;
    root.__kt = true;
    var P = 'kt' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.kit';
    var st = load(KEY), saveT = 0;

    root.classList.add('kt');
    if (!root.hasAttribute('data-clear')) root.classList.add('kt--panel');

    root.innerHTML =
      '<div class="kt-head" aria-hidden="true"><span>Где я</span><span>Что открыть</span><span>Одно действие</span></div>' +
      '<ol class="kt-rows" data-rows></ol>' +
      '<button type="button" class="kt-add" data-add>+ строка</button>' +
      '<label class="kt-call"><i aria-hidden="true"></i><span>' + CALL + '</span>' +
        '<input class="kt-in" type="text" data-call maxlength="80" autocomplete="off" placeholder="имя или служба"></label>' +
      '<div class="kt-acts"><button type="button" class="kt-btn" data-print>Распечатать</button></div>' +
      '<p class="kt-sr" aria-live="polite" data-live></p>' +
      '<div class="kt-foot"><button type="button" class="kt-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var rows = $('[data-rows]'), live = $('[data-live]');

    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }, 250);
    }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

    function cell(i, k, lab, ph, val) {
      var at = ' data-r="' + i + '" data-k="' + k + '" placeholder="' + esc(ph) + '" aria-label="Строка ' + (i + 1) + ': ' + lab.toLowerCase() + '"';
      return '<label class="kt-c"><span class="kt-cl">' + lab + '</span>' + (k === 'a'
        ? '<textarea class="kt-in kt-ta" rows="1" maxlength="160"' + at + '>' + esc(val) + '</textarea>'
        : '<input class="kt-in" type="text" maxlength="60" autocomplete="off" value="' + esc(val) + '"' + at + '>') + '</label>';
    }
    function renderRows() {
      rows.innerHTML = st.rows.map(function (r, i) {
        var ph = i === 0 ? ['сначала всегда', '', 'сон, еда, вода'] : (PH[(i - 1) % PH.length]);
        return '<li class="kt-row' + (i === 0 ? ' kt-row--first' : '') + '">' +
          cell(i, 'w', 'Где я', ph[0], r.w) +
          '<span class="kt-ar" aria-hidden="true">→</span>' +
          cell(i, 'o', 'Что открыть', ph[1], r.o) +
          '<span class="kt-ar" aria-hidden="true">→</span>' +
          cell(i, 'a', 'Одно действие', ph[2], r.a) +
          (i === 0 ? '<span class="kt-x" aria-hidden="true"></span>' : '<button type="button" class="kt-x" data-x="' + i + '" aria-label="Убрать строку ' + (i + 1) + '"><span aria-hidden="true">×</span></button>') +
          '</li>';
      }).join('');
      $('[data-add]').hidden = st.rows.length >= MAXROWS;
      [].forEach.call(rows.querySelectorAll('.kt-ta'), grow);
    }
    function grow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
    function renderAll() { renderRows(); $('[data-call]').value = st.call; }

    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-call')) st.call = t.value;
      else if (t.hasAttribute('data-r')) { st.rows[+t.getAttribute('data-r')][t.getAttribute('data-k')] = t.value; if (t.tagName === 'TEXTAREA') grow(t); }
      else return;
      save();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('.kt-in')) return;
      e.preventDefault();
      var all = [].slice.call(root.querySelectorAll('.kt-in')), i = all.indexOf(e.target);
      if (all[i + 1]) all[i + 1].focus();
    });

    function filled(r) { return (r.w + r.o + r.a).trim(); }
    root.wkPrintSheet = function () {
      var trs = st.rows.filter(filled).map(function (r) {
        return '<tr><td>' + esc(r.w.trim()) + '</td><td>' + esc(r.o.trim()) + '</td><td>' + esc(r.a.trim()) + '</td></tr>';
      }).join('') + '<tr class="kt-pr-blank"><td></td><td></td><td></td></tr><tr class="kt-pr-blank"><td></td><td></td><td></td></tr>';
      return '<div class="kt-print"><h1>Моя аптечка</h1><p class="kt-pr-sub">где я → что открыть → одно действие</p>' +
        '<table><thead><tr><th>Где я</th><th>Что открыть</th><th>Одно действие</th></tr></thead><tbody>' + trs + '</tbody></table>' +
        '<p class="kt-pr-call"><span>' + CALL + '</span> <b>' + (st.call.trim() ? esc(st.call.trim()) : '<i></i>') + '</b></p></div>';
    };
    root.wkText = function () {
      var r = st.rows.filter(filled).map(function (x) { return '— ' + [x.w.trim(), x.o.trim(), x.a.trim()].filter(Boolean).join(' → '); });
      if (!r.length && !st.call.trim()) return '';
      return 'Аптечка\n' + r.join('\n') + '\n' + CALL + ' ' + (st.call.trim() || '…');
    };

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-add]')) {
        if (st.rows.length >= MAXROWS) return;
        st.rows.push(row()); renderRows(); save();
        root.querySelector('[data-r="' + (st.rows.length - 1) + '"]').focus();
        return;
      }
      if ((b = e.target.closest('[data-x]'))) {
        var i = +b.getAttribute('data-x');
        st.rows.splice(i, 1); renderRows(); save();
        var nx = root.querySelector('[data-r="' + Math.min(i, st.rows.length - 1) + '"]');
        if (nx) nx.focus();
        say('Строка убрана.');
        return;
      }
      if (e.target.closest('[data-print]')) { printSheet(root.wkPrintSheet()); return; }
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

    renderAll();
    var lastW = root.offsetWidth;
    window.addEventListener('resize', function () {
      if (root.offsetWidth === lastW) return;
      lastW = root.offsetWidth;
      [].forEach.call(rows.querySelectorAll('.kt-ta'), grow);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { [].forEach.call(rows.querySelectorAll('.kt-ta'), grow); });
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="kit"]'), init); }
  window.WaykeeperKit = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
