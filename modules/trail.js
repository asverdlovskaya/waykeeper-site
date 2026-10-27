/* =====================================================================
   Waykeeper · «След» и «Что уже нашлось» · префикс tr-
   Игровой слой, сквозная тихая мета (00-ix-play.md, решения 2 и 2а).

   1) СЛЕД. Скрипт, подключённый на странице, сам и молча запоминает
      в ЭТОЙ ВКЛАДКЕ (sessionStorage «waykeeper.trail») то, что человек нашёл:
        · строку, выбранную в «Что ближе к тебе сейчас?» (модуль choice, режим program);
        · вывод «Тогда и сейчас»: что осталось с тобой и что пропало из дней (модуль then-now);
        · какие практики начаты на странице (prize, wheel, seasons, ritual, kit, worry, monday);
        · точку из «Поставить точку» (модуль coordinate пишет её сам).
      Ничего не показывает и ничего не отправляет. Код других модулей не трогает:
      смотрит на их разметку. Новый модуль может сообщить находку сам:
        document.dispatchEvent(new CustomEvent('wk:trail', {detail:{id:'my-id', t:'что найдено'}}))

   2) «ЧТО УЖЕ НАШЛОСЬ» — на «Разговоре», в блоке «Первое сообщение»:
        <div data-module="trail" data-mode="log" data-clear></div>
      Если находок нет — модуль скрыт целиком (пустого состояния нет).
      Тонкая линия-маршрут: найденное → тёплая точка «сейчас» → пунктир в белое → точка впереди.
      Кнопка «стереть» очищает след этой вкладки.
   ===================================================================== */
(function () {
  'use strict';

  var KEY = 'waykeeper.trail';
  var PRACTICES = {
    prize: 'Приз в деньгах',
    wheel: 'Колесо контекстов',
    seasons: 'Три живых периода',
    ritual: 'Собрать один ритуал',
    kit: 'Аптечка на стену',
    worry: 'Контейнер для тревоги',
    monday: 'Проверка «завтра понедельник»'
  };
  var T = {
    h: 'Что уже нашлось',
    keep: 'Осталось с тобой',
    gone: 'Пропало из дней',
    point: 'и точка впереди, отмеченная на главной',
    clear: 'стереть'
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  var Store = {
    read: function () {
      try { var d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (d && d.v === 1 && d.items) return d; } catch (e) { }
      return { v: 1, items: {} };
    },
    put: function (id, val) {
      try {
        var d = Store.read();
        if (val) { val.at = Date.now(); d.items[id] = val; } else delete d.items[id];
        if (Object.keys(d.items).length) sessionStorage.setItem(KEY, JSON.stringify(d)); else sessionStorage.removeItem(KEY);
      } catch (e) { }
    },
    clear: function () { try { sessionStorage.removeItem(KEY); } catch (e) { } }
  };

  /* ---------------- 1. запись следа ---------------- */
  function recordChoice(btn) {
    if (!btn || btn.getAttribute('aria-checked') !== 'true') return;
    var t = clean((btn.querySelector('.ch-t') || btn).textContent);
    if (!t || /^другое\.?$/i.test(t)) { Store.put('choice', null); return; }
    Store.put('choice', { t: t });
  }
  function recordThenNow(mod) {
    var keepEl = mod.querySelector('.tn-keep'), goneEl = mod.querySelector('.tn-gone');
    if (!keepEl && !goneEl) return;
    function list(el) { return el ? Array.prototype.map.call(el.querySelectorAll('.tn-chip'), function (c) { return clean(c.textContent); }) : []; }
    var keep = list(keepEl), gone = list(goneEl);
    if (keep.length || gone.length) Store.put('thennow', { keep: keep, gone: gone });
  }
  function startRecording() {
    var hasChoice = document.querySelector('[data-module="choice"]');
    var hasTn = document.querySelector('[data-module="then-now"]');
    if ((hasChoice || hasTn) && window.MutationObserver) {
      var tnT = 0;
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var m = list[i], tg = m.target;
          if (m.type === 'attributes' && tg.getAttribute && tg.getAttribute('role') === 'radio' && tg.closest('[data-module="choice"]')) recordChoice(tg);
          if (m.type === 'childList' && tg.closest) {
            var tn = tg.closest('[data-module="then-now"]');
            if (tn) { clearTimeout(tnT); tnT = setTimeout(function () { recordThenNow(tn); }, 120); }
          }
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked'] });
      // выбор, который уже стоит при загрузке (пришли с главной по ссылке)
      setTimeout(function () {
        document.querySelectorAll('[data-module="choice"] [role="radio"][aria-checked="true"]').forEach(recordChoice);
        document.querySelectorAll('[data-module="then-now"]').forEach(recordThenNow);
      }, 600);
    }
    // практики: первое, что человек вписал или подвинул
    function touched(e) {
      var mod = e.target.closest && e.target.closest('[data-module]');
      if (!mod) return;
      var name = mod.getAttribute('data-module');
      if (PRACTICES[name] && e.target.matches('input, textarea, select')) {
        if (!Store.read().items['p:' + name]) Store.put('p:' + name, { t: PRACTICES[name] });
      }
    }
    document.addEventListener('input', touched, true);
    document.addEventListener('change', touched, true);
    // модуль может сообщить сам
    document.addEventListener('wk:trail', function (e) {
      var d = e.detail || {};
      if (!d.id || d.id === 'point') return;                 // точку coordinate пишет сам
      Store.put(String(d.id), d.t ? { t: clean(d.t).slice(0, 160) } : null);
    });
  }

  /* ---------------- 2. «Что уже нашлось» ---------------- */
  function rows(items) {
    var out = [];
    if (items.choice && items.choice.t) out.push({ kind: 'found', html: '<span class="tr-quote">' + esc(items.choice.t) + '</span>' });
    var tn = items.thennow;
    if (tn && tn.keep && tn.keep.length) out.push({ kind: 'found', html: '<span class="tr-k">' + T.keep + '</span> ' + esc(tn.keep.join(', ')) });
    if (tn && tn.gone && tn.gone.length) out.push({ kind: 'gone', html: '<span class="tr-k">' + T.gone + '</span> ' + esc(tn.gone.join(', ')) });
    var pr = [];
    Object.keys(PRACTICES).forEach(function (k) { if (items['p:' + k]) pr.push(PRACTICES[k]); });
    if (pr.length) out.push({ kind: 'found', html: esc(pr.join(' · ')) });
    Object.keys(items).forEach(function (k) {                 // находки от других модулей через wk:trail
      if (/^(choice|thennow|point|p:)/.test(k) || !items[k] || !items[k].t) return;
      out.push({ kind: 'found', html: esc(items[k].t) });
    });
    return out;
  }

  function initLog(root) {
    if (root.wkTrail) return root.wkTrail;
    var uid = 'tr' + (initLog.n = (initLog.n || 0) + 1);
    root.classList.add('tr');

    function render() {
      var items = Store.read().items, list = rows(items);
      if (!list.length) { root.hidden = true; root.innerHTML = ''; if (window.Field) Field.refresh(); return; }
      root.hidden = false;
      var pt = items.point && typeof items.point.x === 'number';
      var h = '<h3 class="tr-h" id="' + uid + '">' + T.h + '</h3>' +
        '<ol class="tr-line" aria-labelledby="' + uid + '">';
      list.forEach(function (r) { h += '<li class="tr-node tr-node--' + r.kind + '"><i aria-hidden="true"></i><span class="tr-v">' + r.html + '</span></li>'; });
      h += '<li class="tr-node tr-node--now" aria-hidden="true"><i></i></li>';
      if (pt) h += '<li class="tr-node tr-node--point"><i aria-hidden="true"></i><span class="visually-hidden">' + T.point + '</span></li>';
      h += '</ol><p class="tr-foot"><button type="button" class="link small tr-clear">' + T.clear + '</button></p>';
      root.innerHTML = h;
      root.classList.toggle('has-point', !!pt);
      root.querySelector('.tr-clear').addEventListener('click', function () {
        Store.clear();
        try { document.dispatchEvent(new CustomEvent('wk:trail-cleared')); } catch (e) { }
        render();
      });
      if (window.Field) Field.refresh();
    }
    render();
    var api = { render: render, clear: function () { Store.clear(); render(); } };
    root.wkTrail = api;
    return api;
  }

  function boot() {
    startRecording();
    document.querySelectorAll('[data-module="trail"]').forEach(function (el) {
      if ((el.getAttribute('data-mode') || 'log') === 'log') initLog(el);
    });
  }
  window.WaykeeperTrail = { init: initLog, store: Store };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
