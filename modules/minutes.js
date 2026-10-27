/* =====================================================================
   Waykeeper · «Сколько у тебя сейчас есть?» · префикс mn-
   Игровой слой, «Практики» (00-ix-play.md, решение 3).

   Человек выбирает, сколько у него сейчас времени, — и из поля проступает
   ОДНА практика, которая в это время помещается, с кнопкой «Сделать →».
   «другую» — следующая из того же времени. Ничего не хранит.

   Разметка (страница «Практики», блок «Сделать прямо здесь», между строкой про «стереть» и карточками):
     <div data-module="minutes" data-clear data-ill="assets/ill/" data-then-now-href="program.html#then-now"></div>
   data-ill            — папка иллюстраций-сцен (по умолчанию assets/ill/); рисунок вставляется inline,
                         чтобы работало оживание из assets/ill/ill.css; без сервера — обычной картинкой
   data-no-art         — флаг «без картинки» (26.10, решение Саши: svg-схемы на сайте не возвращаем): блока с рисунком
                         нет совсем, схему никто не запрашивает, карточка в одну колонку
   data-then-now-href  — адрес «Тогда и сейчас» (по умолчанию program.html#then-now)
   «Сделать →» ведёт прямо на страницу практики (practices/t-*.html), «Тогда и сейчас» — на «Переход».
   После выбора времени карточки этого же блока, которые в него не помещаются, прячутся.
   ===================================================================== */
(function () {
  'use strict';

  var P = {
    'worry':    { t: 'Контейнер для тревоги', m: 2, d: 'отложить мысль до назначенного часа', h: 'practices/t-worry.html', ill: 'konteiner-dlya-trevogi' },
    'monday':   { t: 'Проверка «завтра понедельник»', m: 2, d: 'уменьшить шаг до выполнимого', h: 'practices/t-monday.html', ill: 'zavtra-ponedelnik' },
    'then-now': { t: 'Тогда и сейчас', m: 3, d: 'что ты умеешь, если забыть про должность', h: null, ill: 'togda-i-seichas' },
    'mykit':    { t: 'Кит (kit)', m: 20, d: 'набор под одно состояние', h: 'practices/t-mykit.html', ill: 'sobrat-kit' },
    'ritual':   { t: 'Собрать один ритуал', m: 15, d: 'карточка из пяти деталей', h: 'practices/t-ritual.html', ill: 'sobrat-odin-ritual' },
    'prize':    { t: 'Приз в деньгах', m: 20, d: 'сколько стоит желанная жизнь', h: 'practices/t-money.html', ill: 'priz-v-dengah' },
    'wheel':    { t: 'Колесо контекстов', m: 20, d: 'где ты в каждой сфере жизни', h: 'practices/t-wheel.html', ill: 'koleso-kontekstov' },
    'kit':      { t: 'Аптечка на стену', m: 30, d: 'страница на плохой день', h: 'practices/t-kit.html', ill: 'aptechka-na-stenu' }
  };
  // порядок внутри времени — мой выбор: сначала то, с чего я бы начала
  // max — сколько минут помещается: карточки ниже, которые дольше, на время выбора прячутся
  var BUCKETS = [
    { id: '2', t: '2 минуты', max: 2, list: ['worry', 'monday'] },
    { id: '20', t: '20 минут', max: 20, list: ['then-now', 'prize', 'ritual', 'mykit', 'wheel'] },
    { id: '30', t: 'полчаса', max: 30, list: ['prize', 'kit', 'mykit', 'wheel', 'ritual'] }
  ];
  // что человек уже делал в этой вкладке (след, sessionStorage «waykeeper.trail»): это не предлагаем первым
  function done(key) {
    try {
      var d = JSON.parse(sessionStorage.getItem('waykeeper.trail') || 'null'), it = d && d.items || {};
      return key === 'then-now' ? !!it.thennow : !!it['p:' + key];
    } catch (e) { return false; }
  }
  var T = {
    ask: 'Сколько у тебя сейчас времени?',
    go: 'Сделать →',
    other: 'другую',
    min: ' мин'
  };

  var cache = {};
  function rm() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function art(base, name, box) {
    var url = base + name + '.svg';
    function asImg() { box.innerHTML = '<img src="' + esc(url) + '" alt="" width="120" height="120">'; }
    if (cache[url]) { box.innerHTML = cache[url]; return; }
    if (!window.fetch || location.protocol === 'file:') { asImg(); return; }
    fetch(url).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (txt) {
      if (txt.indexOf('<svg') < 0) throw 0;
      cache[url] = txt.slice(txt.indexOf('<svg'));
      box.innerHTML = cache[url];
    }).catch(asImg);
  }

  function init(root) {
    if (root.wkMinutes) return root.wkMinutes;
    var base = root.getAttribute('data-ill') || 'assets/ill/';
    var tnHref = root.getAttribute('data-then-now-href') || 'program.html#then-now';
    var noArt = root.hasAttribute('data-no-art');
    var uid = 'mn' + (init.n = (init.n || 0) + 1);
    var st = { b: -1, i: 0, order: [], key: null };
    // карточки этого же блока («Сделать прямо здесь»): после выбора времени остаются только те, что в него помещаются
    var sec = root.closest('section');
    var cards = sec ? Array.prototype.slice.call(sec.querySelectorAll('.pr-grid > .pr-card, .pr-mosaic > .pr-card')) : [];
    function minsOf(c) { var m = c.querySelector('.small'); var v = m && parseInt(m.textContent, 10); return isNaN(v) ? 0 : v; }
    function filterCards(max) {
      cards.forEach(function (c) { c.hidden = max != null && minsOf(c) > max; });
      if (window.Field) Field.refresh();
    }

    root.classList.add('mn');
    var h = '<p class="mn-ask" id="' + uid + '-q">' + T.ask + '</p>' +
      '<div class="mn-opts" role="radiogroup" aria-labelledby="' + uid + '-q">';
    BUCKETS.forEach(function (b, i) {
      h += '<button type="button" class="mn-opt" role="radio" aria-checked="false" tabindex="' + (i ? -1 : 0) + '" data-b="' + i + '">' + b.t + '</button>';
    });
    h += '</div>' +
      '<div class="mn-card glass' + (noArt ? ' mn-card--plain' : '') + '" hidden aria-live="polite">' +
        (noArt ? '' : '<div class="mn-art" aria-hidden="true"></div>') +
        '<div class="mn-body">' +
          '<p class="mn-name"></p>' +
          '<p class="mn-what"></p>' +
          '<p class="mn-meta small"></p>' +
          '<p class="mn-acts"><a class="btn primary sm mn-go" href="#">' + T.go + '</a>' +
          '<button type="button" class="link small mn-other">' + T.other + '</button></p>' +
        '</div>' +
      '</div>';
    root.innerHTML = h;

    var opts = Array.prototype.slice.call(root.querySelectorAll('.mn-opt'));
    var card = root.querySelector('.mn-card');
    var name = root.querySelector('.mn-name'), what = root.querySelector('.mn-what'), meta = root.querySelector('.mn-meta');
    var go = root.querySelector('.mn-go'), other = root.querySelector('.mn-other'), box = noArt ? null : root.querySelector('.mn-art');

    function show(focusCard) {
      var b = BUCKETS[st.b], key = st.order[st.i % st.order.length], p = P[key];
      st.key = key;
      filterCards(b.max);
      opts.forEach(function (o, i) { var on = i === st.b; o.setAttribute('aria-checked', on ? 'true' : 'false'); o.tabIndex = on ? 0 : -1; });
      card.hidden = false;
      // проявление: имя проступает из размытого, как фрагмент из поля
      card.classList.remove('is-in');
      name.textContent = p.t;
      what.textContent = p.d.charAt(0).toUpperCase() + p.d.slice(1) + '.';
      meta.textContent = p.m + T.min;
      go.setAttribute('href', p.h || tnHref);
      other.hidden = b.list.length < 2;
      if (box) art(base, p.ill, box);
      if (rm()) card.classList.add('is-in');
      else { void card.offsetWidth; card.classList.add('is-in'); }
      if (window.Field) Field.refresh();
      if (focusCard) go.focus({ preventScroll: true });
    }
    // порядок внутри времени — выбор Саши (00-ix-play.md, решение 3); уже сделанное и только что показанное уходят в конец,
    // поэтому при смене времени карточка заметно меняется
    function orderFor(i) {
      var list = BUCKETS[i].list, prev = st.key;
      var fresh = list.filter(function (k) { return !done(k) && k !== prev; });
      var rest = list.filter(function (k) { return fresh.indexOf(k) < 0; });
      return fresh.concat(rest);
    }
    // повторный щелчок по выбранному времени снимает выбор: снова видны все карточки
    function clear() {
      st.b = null; filterCards(null); card.hidden = true;
      opts.forEach(function (o, i) { o.setAttribute('aria-checked', 'false'); o.tabIndex = i ? -1 : 0; });
      if (window.Field) Field.refresh();
    }
    function pick(i) { if (st.b === i && opts[i].getAttribute('aria-checked') === 'true') { clear(); return; } if (st.b !== i) { st.order = orderFor(i); st.b = i; st.i = 0; } show(false); }

    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { pick(i); });
      o.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        var n = (i + d + opts.length) % opts.length; opts[n].focus(); pick(n);
      });
    });
    other.addEventListener('click', function () { st.i++; show(false); });

    var api = { pick: function (i, k) { st.order = orderFor(i); st.b = i; st.i = k || 0; show(false); } };
    root.wkMinutes = api;
    return api;
  }

  function boot() { document.querySelectorAll('[data-module="minutes"]').forEach(function (el) { init(el); }); }
  window.WaykeeperMinutes = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
