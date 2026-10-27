/* Waykeeper · практика «Кит (kit): набор под состояние» · префикс mk-
   Контейнер: <div data-module="mykit" data-clear></div>
   data-clear — без своей стеклянной подложки
   data-store — свой ключ хранения (по умолчанию «waykeeper.mykit»)
   Шесть шагов плитками → карточка кита справа (на телефоне под шагами); вторая вкладка — «Кит, который работает не туда».
   Ничего не отправляется: ответы остаются в этом браузере (localStorage). Кнопки печати нет, как у ритуала.
   root.wkText() — ответы текстом для practice-kit («Скопировать текстом»); [data-clear-all] — «Стереть ответы»,
   его находит practice-kit и ставит рядом свои «Скопировать текстом» и строку про браузер. */
(function () {
  'use strict';

  var OWN = '__own';

  /* Каждый шаг — один экран. Ряд: k — ключ ответа, one — выбрать одно, max — потолок, min — с какого числа «Дальше» активна. */
  var STEPS = [
    { title: 'Состояние или роль', hint: 'Выбери одно: в него трудно входить или из него трудно выходить. Одно, не три.',
      rows: [{ k: 'state', one: true, opts: ['работать головой', 'двигаться', 'восстанавливаться', 'думать и писать', 'разговаривать с людьми', 'учиться', 'заканчивать день', 'начинать день'] }], need: ['state'] },
    { title: 'Когда оно включалось само', hint: 'Отметь всё, что было. Можно пропустить: это подсказки для следующих шагов.',
      rows: [{ k: 'auto', opts: ['не дома', 'утром, пока никого', 'вечером одному', 'у воды', 'в дороге', 'рядом с одним человеком', 'когда убрано', 'когда телефон далеко'] }] },
    { title: 'Предметы', hint: 'От трёх до пяти вещей, чтобы кит собирался за минуту и в плохой день. Всё из того, что уже есть.',
      rows: [{ k: 'items', min: 3, max: 5, opts: ['наушники', 'ноутбук', 'блокнот и ручка', 'бутылка воды', 'кружка', 'плед', 'коврик', 'кроссовки у двери', 'таймер', 'лампа', 'книга'] }] },
    { title: 'Место и дом кита', hint: 'Где кит работает и где он живёт, когда не нужен. По одному.',
      rows: [{ k: 'work', label: 'Где работает', one: true, opts: ['стол у окна', 'кофейня', 'библиотека', 'парк', 'кухня', 'коврик у стены'] },
             { k: 'lives', label: 'Где живёт', one: true, opts: ['у двери', 'в рюкзаке', 'в одной коробке', 'на столе под рукой'] }] },
    { title: 'Звук, свет, запах, одежда', hint: 'Что ещё помогает телу поверить. Одной-двух деталей хватает.',
      rows: [{ k: 'sense', max: 2, opts: ['один плейлист', 'тишина и беруши', 'настольная лампа', 'открытое окно', '«та самая» толстовка или рубашка', 'кофе'] }] },
    { title: 'Вход и выход', hint: 'Первое движение, с которого кит включается, и последнее, которым выключается.',
      rows: [{ k: 'entry', label: 'Вход', one: true, opts: ['надеть наушники', 'налить воду', 'закрыть дверь', 'включить лампу', 'выйти из дома'] },
             { k: 'exit', label: 'Выход', one: true, note: 'Без выхода кит растекается на весь день.', opts: ['убрать в коробку', 'снять наушники', 'закрыть ноутбук', 'выключить лампу', 'выйти на улицу'] }] }
  ];
  var WRONG = [
    { k: 'wfrom', label: 'Из чего он', max: 5, opts: ['телефон', 'лента', 'диван', 'холодильник', 'ноутбук', 'кровать', 'наушники', 'кружка', 'плед'] },
    { k: 'wentry', label: 'Вход', one: true, opts: ['взять в руки', 'сесть', 'открыть'] },
    { k: 'wmove', label: 'Что разнесу', one: true, opts: ['в другую комнату', 'в ящик', 'на третий экран', 'заменить на книгу или плед'] }
  ];
  var ROWLABEL = { state: 'Состояние', auto: 'Включалось само', items: 'Что в нём', work: 'Где', lives: 'Живёт', sense: 'Звук и свет', entry: 'Вход', exit: 'Выход' };
  var NOTE = 'Проверка: собрать три раза за неделю. Не включил — поменяй одну деталь. Чиним кит, а не себя.';
  var EX = [
    { state: ['думать и писать'], auto: ['не дома', 'утром, пока никого', 'когда телефон далеко'],
      items: ['ноутбук', 'наушники', 'блокнот и ручка', 'бутылка воды'],
      work: [OWN], lives: ['в рюкзаке'], sense: ['один плейлист', OWN], entry: [OWN], exit: [OWN],
      own: { work: 'кофейня с большими столами и окном, до десяти утра', sense: 'дневной свет', entry: 'сесть за стол и надеть наушники', exit: 'закрыть ноутбук и выйти на улицу' },
      note: 'Проверка из примера: дома тот же набор включается заметно хуже. Значит, деталь, которая держит, — место, и кит переезжает за ним, а не наоборот.' },
    { state: ['восстанавливаться'], auto: [],
      items: ['плед', OWN], work: [OWN], lives: [], sense: ['один плейлист'], entry: [], exit: [OWN],
      own: { items: 'чай и вода рядом, телефон в другой комнате', work: 'дом в режиме «тишина, чисто, одна»', exit: 'открыть окно' },
      note: 'Действие одно — лечь и слушать.' }
  ];

  var uid = 0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function blank() { return { v: 1, tab: 'build', step: 0, sel: {}, own: {}, name: '', note: '' }; }
  function load(key) {
    try {
      var d = JSON.parse(localStorage.getItem(key) || 'null');
      if (d && d.v === 1) { d.sel = d.sel || {}; d.own = d.own || {}; return d; }
    } catch (e) { }
    return blank();
  }
  function rowDef(k) {
    var r = null;
    STEPS.forEach(function (s) { s.rows.forEach(function (x) { if (x.k === k) r = x; }); });
    WRONG.forEach(function (x) { if (x.k === k) r = x; });
    return r;
  }

  function init(root) {
    if (root.__mk) return;
    root.__mk = true;
    var P = 'mk' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || 'waykeeper.mykit';
    var st = load(KEY), saveT = 0, armed = 0;
    if (st.step < 0 || st.step >= STEPS.length) st.step = 0;

    root.classList.add('mk');
    if (!root.hasAttribute('data-clear')) root.classList.add('mk--panel');

    root.innerHTML =
      '<div class="mk-main">' +
        '<div class="mk-tabs" role="tablist" aria-label="Что собираем">' +
          '<button type="button" class="mk-tab" role="tab" id="' + P + 't1" aria-controls="' + P + 'p" data-tab="build">Собрать кит</button>' +
          '<button type="button" class="mk-tab" role="tab" id="' + P + 't2" aria-controls="' + P + 'p" data-tab="wrong">Кит, который работает не туда</button>' +
        '</div>' +
        '<div class="mk-panel" id="' + P + 'p" role="tabpanel" data-panel></div>' +
      '</div>' +
      '<div class="mk-side">' +
        '<label class="mk-name" data-name-box><span>Название кита</span><input class="mk-in" type="text" data-name maxlength="50" autocomplete="off" placeholder="Назови его, если хочется"></label>' +
        '<article class="mk-card" data-card aria-live="polite"></article>' +
        '<div class="mk-acts" data-acts><button type="button" class="mk-btn" data-example>Пример: мой утренний кит</button></div>' +
        '<p class="mk-exnote" data-exnote hidden></p>' +
      '</div>' +
      '<p class="mk-sr" aria-live="polite" data-live></p>' +
      '<div class="mk-foot"><button type="button" class="mk-clear" data-clear-all>Стереть ответы</button></div>';

    var $ = function (s) { return root.querySelector(s); };
    var panel = $('[data-panel]'), card = $('[data-card]'), live = $('[data-live]'),
        nameIn = $('[data-name]'), nameBox = $('[data-name-box]'), acts = $('[data-acts]'), exnote = $('[data-exnote]');

    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }, 250);
    }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

    /* ---------- значения ---------- */
    function pressed(k) { return st.sel[k] || []; }
    function vals(k) {
      var out = [];
      pressed(k).forEach(function (v) {
        if (v === OWN) { var t = (st.own[k] || '').trim(); if (t) out.push(t); } else out.push(v);
      });
      return out;
    }
    function one(k) { return vals(k)[0] || ''; }
    function list(k) { return vals(k).join(', '); }

    /* ---------- плитки ---------- */
    function rowHtml(r, showLabel) {
      var cur = pressed(r.k), full = r.max && cur.length >= r.max;
      var h = '<div class="mk-row" role="group" aria-label="' + esc(r.label || ROWLABEL[r.k] || '') + '">';
      if (showLabel && r.label) h += '<p class="mk-rl">' + esc(r.label) + (r.max ? ' <small>— не больше ' + r.max + '</small>' : '') + '</p>';
      h += '<div class="mk-tiles">';
      r.opts.concat([OWN]).forEach(function (o) {
        var on = cur.indexOf(o) >= 0, dis = !on && !r.one && full;
        h += '<button type="button" class="mk-tile' + (o === OWN ? ' mk-tile--own' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" data-k="' + r.k + '" data-v="' + esc(o) + '"' + (dis ? ' disabled' : '') + '>' +
          (o === OWN ? 'своё…' : esc(o)) + '</button>';
      });
      h += '</div>';
      if (cur.indexOf(OWN) >= 0) h += '<input class="mk-in mk-own" type="text" maxlength="90" data-own="' + r.k + '" value="' + esc(st.own[r.k] || '') + '" placeholder="Напиши своё" aria-label="Своё: ' + esc(r.label || ROWLABEL[r.k] || '') + '">';
      if (r.note) h += '<p class="mk-rn">' + esc(r.note) + '</p>';
      return h + '</div>';
    }

    function stepReady(s) {
      var ok = true;
      (s.need || []).forEach(function (k) { if (!vals(k).length) ok = false; });
      s.rows.forEach(function (r) { if (r.min && vals(r.k).length < r.min) ok = false; });
      return ok;
    }
    function nextLabel(s) {
      var r = s.rows[0];
      if (r.min) return 'Дальше · выбрано ' + vals(r.k).length;
      return st.step === STEPS.length - 1 ? 'К карточке' : 'Дальше';
    }

    function paintPanel(focusSel) {
      var h = '';
      if (st.tab === 'build') {
        var s = STEPS[st.step], last = st.step === STEPS.length - 1;
        h += '<p class="mk-prog">Шаг ' + (st.step + 1) + ' из ' + STEPS.length + '</p>';
        h += '<h3 class="mk-q" tabindex="-1" data-q>' + esc(s.title) + '</h3><p class="mk-hint">' + esc(s.hint) + '</p>';
        s.rows.forEach(function (r) { h += rowHtml(r, s.rows.length > 1); });
        h += '<div class="mk-nav">' +
          (st.step > 0 ? '<button type="button" class="mk-btn mk-btn--ghost" data-prev>Назад</button>' : '') +
          '<button type="button" class="mk-btn mk-btn--main" data-next' + (stepReady(s) ? '' : ' disabled') + '>' + esc(nextLabel(s)) + '</button>' +
          '</div>';
        if (last) h += '<p class="mk-done">Карточка собрана. Проверка — неделя: ' + esc(NOTE.replace(/^Проверка: /, '').replace(/^./, function (c) { return c.toLowerCase(); })) + '</p>';
      } else {
        h += '<h3 class="mk-q" tabindex="-1" data-q>Кит, который работает не туда</h3>' +
          '<p class="mk-hint">Три ответа, свои тут уместнее примеров. Из этого получится одна короткая карточка: что разнести, чтобы кит перестал собираться сам.</p>';
        WRONG.forEach(function (r) { h += rowHtml(r, true); });
      }
      panel.innerHTML = h;
      if (focusSel) { var el = panel.querySelector(focusSel); if (el) el.focus({ preventScroll: focusSel === '[data-q]' }); }
    }

    /* ---------- карточка ---------- */
    function dl(rows) {
      var h = '<dl class="mk-dl">';
      rows.forEach(function (r) { h += '<div><dt>' + r[0] + '</dt><dd' + (r[1] ? '' : ' class="is-empty"') + '>' + (r[1] ? esc(r[1]) : '—') + '</dd></div>'; });
      return h + '</dl>';
    }
    function paintCard() {
      var h;
      if (st.tab === 'build') {
        var state = one('state'), nm = (st.name || '').trim();
        var title = nm || (state ? 'Кит: ' + state : 'Кит: …');
        h = '<h3 class="mk-ct' + (nm || state ? '' : ' is-empty') + '">' + esc(title) + '</h3>' +
          (nm && state ? '<p class="mk-cs">Кит: ' + esc(state) + '</p>' : '') +
          dl([['Где', one('work')], ['Что в нём', list('items')], ['Звук и свет', list('sense')], ['Вход', one('entry')], ['Выход', one('exit')], ['Живёт', one('lives')]]) +
          '<p class="mk-cn">' + NOTE + '</p>';
      } else {
        var en = one('wentry'), mv = one('wmove');
        h = '<h3 class="mk-ct">Разобрать' + (en || mv ? ': ' + esc(en || '…') + ' → ' + esc(mv || '…') : '') + '</h3>' +
          dl([['Из чего он', list('wfrom')], ['Вход', en], ['Что разнесу', mv]]) +
          '<p class="mk-cn">Не «больше никогда», а «добавить один шаг». Проверь неделю, как и любой кит.</p>';
      }
      card.innerHTML = h;
      nameBox.hidden = st.tab !== 'build';
      acts.hidden = st.tab !== 'build';
      var ex = st.tab === 'build' && st.note;
      exnote.hidden = !ex; exnote.textContent = ex ? st.note : '';
    }
    function paintTabs() {
      [].forEach.call(root.querySelectorAll('[data-tab]'), function (b) {
        var on = b.getAttribute('data-tab') === st.tab;
        b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      });
    }
    function paintAll(focusSel) { paintTabs(); paintPanel(focusSel); paintCard(); nameIn.value = st.name || ''; }

    /* ---------- события ---------- */
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-tab]'))) {
        st.tab = b.getAttribute('data-tab'); save(); paintAll(); return;
      }
      if ((b = e.target.closest('.mk-tile'))) {
        var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'), r = rowDef(k), cur = pressed(k).slice();
        var i = cur.indexOf(v);
        if (r.one) cur = i >= 0 ? [] : [v];
        else if (i >= 0) cur.splice(i, 1);
        else if (!r.max || cur.length < r.max) cur.push(v);
        st.sel[k] = cur; st.note = '';
        save(); paintPanel(v === OWN && cur.indexOf(OWN) >= 0 ? '[data-own="' + k + '"]' : null); paintCard();
        if (!(v === OWN && cur.indexOf(OWN) >= 0)) {
          var again = panel.querySelector('.mk-tile[data-k="' + k + '"][data-v="' + v.replace(/"/g, '\\"') + '"]');
          if (again) again.focus({ preventScroll: true });
        }
        return;
      }
      if (e.target.closest('[data-next]')) {
        if (st.step < STEPS.length - 1) { st.step++; save(); paintPanel('[data-q]'); }
        else { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); say('Карточка кита собрана.'); }
        return;
      }
      if (e.target.closest('[data-prev]')) { st.step = Math.max(0, st.step - 1); save(); paintPanel('[data-q]'); return; }
      if (e.target.closest('[data-example]')) {
        var ex = EX[pressed('state').indexOf('восстанавливаться') >= 0 ? 1 : 0];
        st.sel = {}; st.own = {};
        ['state', 'auto', 'items', 'work', 'lives', 'sense', 'entry', 'exit'].forEach(function (k) { st.sel[k] = (ex[k] || []).slice(); });
        for (var o in ex.own) st.own[o] = ex.own[o];
        st.note = ex.note; st.step = STEPS.length - 1;
        save(); paintAll(); say('Подставлен пример. Поменяй в нём любую деталь.');
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
        paintAll();
        b.textContent = 'Стёрто'; say('Ответы стёрты.');
        setTimeout(function () { b.textContent = 'Стереть ответы'; }, 1600);
      }
    });
    root.addEventListener('input', function (e) {
      var o = e.target.getAttribute && e.target.getAttribute('data-own');
      if (o) {
        st.own[o] = e.target.value; st.note = '';
        var s = STEPS[st.step], nb = panel.querySelector('[data-next]');
        if (nb && st.tab === 'build') { nb.disabled = !stepReady(s); nb.textContent = nextLabel(s); }
        paintCard(); save(); return;
      }
      if (e.target === nameIn) { st.name = e.target.value; paintCard(); save(); }
    });
    root.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute('role') === 'tab' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        st.tab = st.tab === 'build' ? 'wrong' : 'build'; save(); paintAll();
        var nt = root.querySelector('[data-tab="' + st.tab + '"]'); if (nt) nt.focus();
        e.preventDefault();
      }
    });

    root.wkText = function () {
      var out = [];
      var state = one('state');
      if (state || vals('items').length || one('work')) {
        out.push('Кит' + ((st.name || '').trim() ? ' «' + st.name.trim() + '»' : '') + (state ? ': ' + state : ''));
        ['auto', 'work', 'items', 'sense', 'entry', 'exit', 'lives'].forEach(function (k) {
          var v = list(k); if (v) out.push((k === 'auto' ? 'Включалось само' : ROWLABEL[k]) + ': ' + v);
        });
      }
      if (vals('wentry').length || vals('wmove').length || vals('wfrom').length) {
        out.push('Кит, который работает не туда');
        if (list('wfrom')) out.push('Из чего он: ' + list('wfrom'));
        if (one('wentry')) out.push('Вход: ' + one('wentry'));
        if (one('wmove')) out.push('Разобрать: ' + one('wmove'));
      }
      return out.join('\n');
    };

    paintAll();
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="mykit"]'), init); }
  window.WaykeeperMykit = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
