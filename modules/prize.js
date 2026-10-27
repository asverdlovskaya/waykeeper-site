/* Waykeeper · практика «Приз в деньгах» · префикс pz-
   Контейнер: <div data-module="prize" data-clear></div>
   data-clear — без своей стеклянной подложки вокруг всего модуля (итог всё равно на стекле).
   Ответы — только в этом браузере: localStorage «waykeeper.prize». */
(function () {
  'use strict';

  var KEY = 'waykeeper.prize';
  var LV = [
    { id: 'min', n: 'Минимум', s: 'без этого никак' },
    { id: 'com', n: 'Комфорт', s: 'жизнь, которой хочется' },
    { id: 'dre', n: 'Мечта', s: 'если всё сложится' }
  ];
  /* категории — как в старом калькуляторе (05-site/waykeeper.html); ex — пример в подсказке */
  var CATS = [
    { id: 'home', n: 'Жильё', l: 'min', max: 4000, step: 50, ex: 1400 },
    { id: 'food', n: 'Еда дома', l: 'min', max: 1500, step: 10, ex: 400 },
    { id: 'move', n: 'Транспорт', l: 'min', max: 600, step: 10, ex: 90 },
    { id: 'health', n: 'Здоровье и страховка', l: 'min', max: 800, step: 10, ex: 160 },
    { id: 'phone', n: 'Связь и подписки', l: 'min', max: 300, step: 5, ex: 50 },
    { id: 'care', n: 'Помощь близким', l: 'min', max: 1500, step: 10, ex: 150 },
    { id: 'cafe', n: 'Кафе и встречи', l: 'com', max: 1200, step: 10, ex: 250 },
    { id: 'clothes', n: 'Одежда', l: 'com', max: 800, step: 10, ex: 100 },
    { id: 'body', n: 'Спорт и тело', l: 'com', max: 500, step: 5, ex: 60 },
    { id: 'learn', n: 'Обучение', l: 'com', max: 1000, step: 10, ex: 120 },
    { id: 'joy', n: 'Радости и хобби', l: 'com', max: 1000, step: 10, ex: 100 },
    { id: 'trip', n: 'Путешествия', l: 'com', max: 12000, step: 100, ex: 2500, y: 1 },
    { id: 'dream1', n: '', ph: 'Большое путешествие', l: 'dre', max: 30000, step: 100, ex: 4000, y: 1 },
    { id: 'dream2', n: '', ph: 'Курсы или мастерская', l: 'dre', max: 2000, step: 10, ex: 250 }
  ];
  var TAX = { id: 'tax', max: 50, step: 1, ex: 13 };
  /* подсказка в поле — словами, светлее введённых цифр: серое «1 400» читалось как уже вписанное (01-user.md, п. 5) */
  function exPh(v) { return 'например, ' + v; }
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nf(v) { return Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' '); }
  function mo(v) { var r = Math.round(v * 10) / 10; return (r % 1 ? r.toFixed(1) : String(r)).replace('.', ','); }
  function parse(s) { var d = String(s).replace(/[^\d]/g, ''); return d === '' ? null : Math.min(+d, 9999999); }
  function blank() { return { v: 1, a: {}, n: {}, tax: null, cush: null, lvl: 'com' }; }

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1 && d.a) { d.n = d.n || {}; d.lvl = d.lvl || 'com'; return d; }
    } catch (e) { }
    return blank();
  }

  function init(root) {
    if (root.__pz) return;
    root.__pz = true;
    var n = ++uid, P = 'pz' + n + '-';
    var st = load();
    var saveT = 0, liveT = 0;

    root.classList.add('pz');
    if (!root.hasAttribute('data-clear')) root.classList.add('pz--panel');

    /* ---------- разметка ---------- */
    function slider(c, label) {
      var ticks = '';
      for (var i = 0; i <= 10; i++) ticks += '<i style="left:' + (i * 10) + '%"' + (i % 5 ? '' : ' class="pz-tk5"') + '></i>';
      return '<div class="pz-sl" role="slider" tabindex="0" data-id="' + c.id + '" aria-label="' + esc(label) + '" aria-valuemin="0" aria-valuemax="' + c.max + '">' +
        '<div class="pz-track"><span class="pz-ticks" aria-hidden="true">' + ticks + '</span><i class="pz-fill"></i><i class="pz-thumb"></i></div></div>';
    }
    function row(c) {
      var unit = c.y ? '€ в год' : '€';
      var name = c.ph
        ? '<input class="pz-nm" type="text" id="' + P + 'n-' + c.id + '" data-name="' + c.id + '" placeholder="' + esc(c.ph) + '" aria-label="Своя мечта" maxlength="60">'
        : '<label class="pz-name" for="' + P + c.id + '">' + c.n + '</label>';
      var aria = (c.n || 'Мечта') + (c.y ? ', евро в год' : ', евро в месяц');
      return '<div class="pz-row" data-row="' + c.id + '">' + name +
        slider(c, aria) +
        '<label class="pz-amt"><input id="' + P + c.id + '" data-in="' + c.id + '" type="text" inputmode="numeric" autocomplete="off" placeholder="' + exPh(nf(c.ex)) + '" aria-label="' + esc(aria) + '"><span>' + unit + '</span></label></div>';
    }

    var h = '<div class="pz-in">';
    LV.forEach(function (lv) {
      h += '<section class="pz-group" aria-labelledby="' + P + 'g-' + lv.id + '"><h3 class="pz-gh" id="' + P + 'g-' + lv.id + '">' + lv.n + ' <span>' + lv.s + '</span></h3>';
      CATS.filter(function (c) { return c.l === lv.id; }).forEach(function (c) { h += row(c); });
      h += '</section>';
    });
    h += '<section class="pz-group pz-group--tax" aria-labelledby="' + P + 'g-tax"><h3 class="pz-gh" id="' + P + 'g-tax">Налог</h3>' +
      '<div class="pz-row" data-row="tax"><label class="pz-name" for="' + P + 'tax">Ставка</label>' + slider(TAX, 'Налог, процентов') +
      '<label class="pz-amt"><input id="' + P + 'tax" data-in="tax" type="text" inputmode="numeric" autocomplete="off" placeholder="' + exPh(TAX.ex) + '" aria-label="Налог, процентов"><span>%</span></label></div></section>';
    h += '</div>';

    h += '<aside class="pz-out" aria-label="Итог">' +
      '<div class="pz-lv" role="group" aria-label="Уровень жизни">' +
      LV.map(function (lv) { return '<button type="button" data-lv="' + lv.id + '" aria-pressed="false"><span>' + lv.n + '</span><b data-sum="' + lv.id + '">—</b></button>'; }).join('') +
      '</div>' +
      '<p class="pz-big"><span data-big>—</span><small> €</small></p>' +
      '<p class="pz-cap" data-cap>в месяц на руки</p>' +
      '<label class="pz-cush"><span class="pz-cl">Подушка — сколько отложено сейчас</span>' +
      '<span class="pz-amt pz-amt--big"><input id="' + P + 'cush" data-in="cush" type="text" inputmode="numeric" autocomplete="off" placeholder="' + exPh(nf(12000)) + '"><span>€</span></span></label>' +
      '<div class="pz-time" aria-hidden="true"><p class="pz-tt">Месяцы свободы</p><div class="pz-tl">' +
      '<i class="pz-base"></i><i class="pz-run"></i><span class="pz-mt"></span>' +
      '<i class="pz-now"></i><span class="pz-nowl">сейчас</span>' +
      '<span class="pz-end"><i class="pz-ring"></i><span class="pz-endl"></span></span>' +
      '</div></div>' +
      '<p class="pz-note" data-note></p>' +
      '<p class="pz-sr" data-live aria-live="polite"></p>' +
      '<div class="pz-foot"><button type="button" class="pz-clear" data-clear-all>Стереть ответы</button></div>' +
      '</aside>' +
      '<button type="button" class="pz-peek" data-peek tabindex="-1" aria-hidden="true"></button>';
    root.innerHTML = h;

    var $ = function (s) { return root.querySelector(s); };
    var $$ = function (s) { return [].slice.call(root.querySelectorAll(s)); };
    var catById = {}; CATS.forEach(function (c) { catById[c.id] = c; }); catById.tax = TAX;

    /* ---------- значения ---------- */
    function getV(id) { return id === 'tax' ? st.tax : st.a[id]; }
    function setV(id, v) { if (id === 'tax') st.tax = v; else if (v === null) delete st.a[id]; else st.a[id] = v; }

    function paintSlider(id) {
      var c = catById[id], v = getV(id), sl = root.querySelector('.pz-sl[data-id="' + id + '"]');
      var p = v === null || v === undefined ? 0 : Math.min(v, c.max) / c.max;
      sl.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      sl.classList.toggle('is-empty', v === null || v === undefined);
      sl.setAttribute('aria-valuenow', v == null ? 0 : Math.min(v, c.max));
      sl.setAttribute('aria-valuetext', v == null ? 'не задано' : (id === 'tax' ? v + ' %' : nf(v) + ' €' + (c.y ? ' в год' : ' в месяц')));
    }
    function paintInput(id) {
      var inp = root.querySelector('[data-in="' + id + '"]'), v = id === 'cush' ? st.cush : getV(id);
      inp.value = v == null ? '' : (id === 'tax' ? String(v) : nf(v));
    }

    function calc() {
      var s = { min: 0, com: 0, dre: 0 }, any = false;
      CATS.forEach(function (c) {
        var v = st.a[c.id];
        if (v == null) return;
        any = true;
        s[c.l] += v / (c.y ? 12 : 1);
      });
      return { any: any, lv: { min: s.min, com: s.min + s.com, dre: s.min + s.com + s.dre } };
    }

    function paintOut() {
      var r = calc(), lvl = st.lvl, val = r.lv[lvl], tax = st.tax ? Math.min(st.tax, 90) / 100 : 0;
      LV.forEach(function (lv) {
        var b = root.querySelector('[data-lv="' + lv.id + '"]');
        b.setAttribute('aria-pressed', lv.id === lvl ? 'true' : 'false');
        root.querySelector('[data-sum="' + lv.id + '"]').textContent = r.lv[lv.id] ? nf(r.lv[lv.id]) + ' €' : '—';
      });
      $('[data-big]').textContent = val ? nf(val) : '0';
      $('.pz-big').classList.toggle('is-empty', !val);
      $('[data-cap]').textContent = 'в месяц на руки' + (val && tax ? ' · до налогов ≈ ' + nf(val / (1 - tax)) + ' €' : '');

      /* линия времени */
      var tl = $('.pz-tl'), end = $('.pz-end'), endl = $('.pz-endl'), note = $('[data-note]');
      var months = (val && st.cush) ? st.cush / val : null;
      var scale = 12;
      if (months !== null) scale = months <= 12 ? 12 : months <= 24 ? 24 : months <= 36 ? 36 : months <= 60 ? 60 : 120;
      var stepT = scale <= 12 ? 1 : scale <= 36 ? 3 : scale <= 60 ? 6 : 12;
      var stepL = scale <= 12 ? 3 : scale <= 24 ? 6 : scale <= 60 ? 12 : 24;
      var mt = '';
      for (var m = 0; m <= scale; m += stepT) {
        var lab = m % stepL === 0;
        mt += '<i class="' + (lab ? 'pz-t5' : '') + '" style="left:' + (m / scale * 100) + '%"></i>' +
          (lab ? '<em style="left:' + (m / scale * 100) + '%">' + (m === scale ? m + ' мес' : m) + '</em>' : '');
      }
      $('.pz-mt').innerHTML = mt;
      tl.classList.toggle('is-on', months !== null);
      if (months !== null) {
        var p = Math.min(months / scale, 1);
        tl.style.setProperty('--m', (p * 100).toFixed(2) + '%');
        endl.innerHTML = 'здесь кончается подушка · <b>' + mo(months) + ' мес</b>';
        end.classList.toggle('pz-end--r', p > 0.5);
        note.textContent = '';
      } else {
        tl.style.setProperty('--m', '0%');
        endl.textContent = '';
        if (st.cush === 0 && val) note.textContent = 'Подушки нет — считаем от нуля: с первого месяца нужно ' + nf(val) + ' € на руки.';
        else if (!val) note.textContent = r.any ? 'На этом уровне пока пусто.' : 'Впиши траты — на линии появится, на сколько месяцев хватит подушки.';
        else note.textContent = 'Впиши подушку — на линии появится, где она кончается.';
      }

      $('[data-peek]').innerHTML = val
        ? '<span>' + LV.filter(function (l) { return l.id === lvl; })[0].n + '</span> <b>' + nf(val) + ' €</b>' + (months !== null ? ' <span>· ' + mo(months) + ' мес</span>' : '')
        : '';

      clearTimeout(liveT);
      liveT = setTimeout(function () {
        $('[data-live]').textContent = val
          ? (LV.filter(function (l) { return l.id === lvl; })[0].n + ': ' + nf(val) + ' € в месяц.' + (months !== null ? ' Подушки хватит на ' + mo(months) + ' мес.' : ''))
          : '';
      }, 700);
    }

    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () {
        try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { }
      }, 250);
    }

    function change(id, v, from) {
      if (id === 'cush') st.cush = v;
      else { setV(id, v); paintSlider(id); }
      if (from !== 'input') paintInput(id);
      paintOut();
      save();
    }

    /* ---------- ползунки: мышь, палец, клавиатура ---------- */
    $$('.pz-sl').forEach(function (sl) {
      var id = sl.getAttribute('data-id'), c = catById[id], drag = false;
      function fromX(x) {
        var r = sl.querySelector('.pz-track').getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (x - r.left) / r.width));
        return Math.round(p * c.max / c.step) * c.step;
      }
      /* палец: касание при прокрутке не вписывает сумму. Значение меняется, только если палец пошёл вбок
         (больше 8 px и сильнее, чем вниз), или это было короткое касание без движения. Если браузер забрал
         жест под прокрутку (pointercancel) — прежнее значение возвращается. */
      var touch = null;
      sl.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        if (e.pointerType === 'touch') { touch = { x: e.clientX, y: e.clientY, v: getV(id), id: e.pointerId, moved: false }; return; }
        drag = true; sl.classList.add('is-drag');
        try { sl.setPointerCapture(e.pointerId); } catch (er) { }
        sl.focus({ preventScroll: true });
        change(id, fromX(e.clientX));
        e.preventDefault();
      });
      sl.addEventListener('pointermove', function (e) {
        if (touch && !drag) {
          var dx = Math.abs(e.clientX - touch.x), dy = Math.abs(e.clientY - touch.y);
          if (dy > 8 && dy >= dx) { touch = null; return; }          // это прокрутка
          if (dx > 8 && dx > dy) {
            touch.moved = true; drag = true; sl.classList.add('is-drag');
            try { sl.setPointerCapture(e.pointerId); } catch (er) { }
          } else return;
        }
        if (drag) change(id, fromX(e.clientX));
      });
      function stop() { drag = false; sl.classList.remove('is-drag'); }
      sl.addEventListener('pointerup', function (e) {
        if (touch && !touch.moved && !drag) { change(id, fromX(e.clientX)); }
        touch = null; stop();
      });
      sl.addEventListener('pointercancel', function () {
        if (touch && touch.moved) change(id, touch.v == null ? null : touch.v);
        touch = null; stop();
      });
      sl.addEventListener('keydown', function (e) {
        var v = getV(id), cur = v == null ? 0 : Math.min(v, c.max), nv = null;
        switch (e.key) {
          case 'ArrowRight': case 'ArrowUp': nv = cur + c.step; break;
          case 'ArrowLeft': case 'ArrowDown': nv = cur - c.step; break;
          case 'PageUp': nv = cur + c.step * 10; break;
          case 'PageDown': nv = cur - c.step * 10; break;
          case 'Home': nv = 0; break;
          case 'End': nv = c.max; break;
          default: return;
        }
        e.preventDefault();
        change(id, Math.max(0, Math.min(c.max, nv)));
      });
    });

    /* ---------- поля ввода ---------- */
    root.addEventListener('input', function (e) {
      var id = e.target.getAttribute('data-in');
      if (id) { change(id, parse(e.target.value), 'input'); return; }
      var nm = e.target.getAttribute('data-name');
      if (nm) { if (e.target.value) st.n[nm] = e.target.value; else delete st.n[nm]; save(); }
    });
    root.addEventListener('focusout', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-in');
      if (id) paintInput(id);
    });

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]');
      if (b) { st.lvl = b.getAttribute('data-lv'); paintOut(); save(); return; }
      if (e.target.closest('[data-clear-all]')) {
        /* как в «Колесе», WOOP и «Контейнере»: первое нажатие спрашивает, второе (в течение 3 с) стирает */
        var cl = $('[data-clear-all]');
        if (!armed) {
          armed = setTimeout(function () { armed = 0; cl.textContent = 'Стереть ответы'; }, 3000);
          cl.textContent = 'Точно стереть?';
          return;
        }
        clearTimeout(armed); armed = 0;
        st = blank();
        try { localStorage.removeItem(KEY); } catch (er) { }
        paintAll();
        cl.textContent = 'Стёрто';
        $('[data-live]').textContent = 'Все ответы стёрты.';
        setTimeout(function () { cl.textContent = 'Стереть ответы'; }, 1600);
      }
    });

    /* телефон: итог внизу экрана, пока сам итог не виден */
    var peek = $('[data-peek]'), out = $('.pz-out'), seen = { in: false, out: false };
    function peekState() { root.classList.toggle('pz--peek', seen['in'] && !seen.out); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (en) { seen[en.target === out ? 'out' : 'in'] = en.isIntersecting; }); peekState(); })
        .observe(out);
      new IntersectionObserver(function (es) { es.forEach(function (en) { seen['in'] = en.isIntersecting; }); peekState(); })
        .observe($('.pz-in'));
    }
    peek.addEventListener('click', function () { out.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' }); });

    /* текст для «Скопировать текстом» (practice-kit): три цифры, налог, подушка и месяцы свободы, заполненные траты */
    root.wkText = function () {
      var r = calc(), lines = [];
      if (!r.any && st.cush == null && st.tax == null) return '';
      lines.push('Приз в деньгах');
      LV.forEach(function (lv) { if (r.lv[lv.id]) lines.push(lv.n + ': ' + nf(r.lv[lv.id]) + ' € в месяц на руки'); });
      if (st.tax) lines.push('Налог: ' + st.tax + ' %' + (r.lv[st.lvl] ? ' (до налогов ≈ ' + nf(r.lv[st.lvl] / (1 - Math.min(st.tax, 90) / 100)) + ' €)' : ''));
      if (st.cush != null) {
        var val = r.lv[st.lvl];
        lines.push('Подушка: ' + nf(st.cush) + ' €' + (val && st.cush ? ' — месяцев свободы: ' + mo(st.cush / val) + ' (уровень «' + LV.filter(function (l) { return l.id === st.lvl; })[0].n + '»)' : ''));
      }
      LV.forEach(function (lv) {
        var rows = CATS.filter(function (c) { return c.l === lv.id && st.a[c.id] != null; });
        if (!rows.length) return;
        lines.push(lv.n + ':');
        rows.forEach(function (c) { lines.push('— ' + (c.n || st.n[c.id] || c.ph) + ': ' + nf(st.a[c.id]) + ' €' + (c.y ? ' в год' : '')); });
      });
      return lines.join('\n');
    };

    function paintAll() {
      CATS.concat([TAX]).forEach(function (c) { paintSlider(c.id); paintInput(c.id); });
      paintInput('cush');
      $$('[data-name]').forEach(function (inp) { inp.value = st.n[inp.getAttribute('data-name')] || ''; });
      paintOut();
    }
    root.classList.add('pz--still');
    paintAll();
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('pz--still'); }); });
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="prize"]'), init); }
  window.WaykeeperPrize = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
