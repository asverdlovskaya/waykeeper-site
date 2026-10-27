/* design-layer.js — дизайн-слой v2 (внесён 27.10.2026). Подключается последним скриптом (defer) на каждой странице — _tools/head_meta.py.
   Части: 1) одна тёплая точка (из layer-color.js, п. 3); 2) типограф для текста, который рисуют скрипты (WK.typo, из layer-type.js);
   3) состояния: меню держит фокус, Esc, зоны нажатия (layer-states.js); 4) движение: свет, появление картин I «Тихий масштаб» (layer-motion.js).
   Стендовые куски layer-color.js (подмена картин и данных с 8082) не перенесены: картины faded3 лежат на своих местах. */

/* ===== 1. одна тёплая точка (layer-color.js, п. 3) ===== */
(function(){
  /* 3) одна тёплая точка: если на экране видна своя «ты здесь» (лестница, неделя, точка модуля),
        узел линии секции не горит. Это ПОЙДЁТ В v2 — см. patches/color.md, раздел 4 (atmo.js). */
  var HERE = '.kb-ladder li.is-here,.hm-stop--now,.pg-dot.pg-mine,.fold--week.is-current,.fold--week.pg-mine,.ns-ghost.is-idle,' +
             '.ch-frag.is-here,.tr-node--now,.alive-you,.cl-here,.wh-dot.is-f,.mn-v.is-done,.lf-seg[aria-pressed="true"],.tn-dots i.tn-cur';
  function watchHere(){
    var H = document.documentElement, ticking = false;
    /* у части точек размер 0×0 (сама точка — ::after внутри), поэтому проверяем положение, а не площадь */
    function check(){
      ticking = false; var vh = innerHeight, busy = false;
      document.querySelectorAll(HERE).forEach(function(el){
        if(busy) return;
        var r = el.getBoundingClientRect();
        if(r.bottom < 0 || r.top > vh) return;
        if(el.checkVisibility && !el.checkVisibility({opacityProperty:true, visibilityProperty:true})) return;
        busy = true;
      });
      H.classList.toggle('lc-here-busy', busy);
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(check); } }
    addEventListener('scroll', onScroll, {passive:true}); addEventListener('resize', onScroll);
    setInterval(onScroll, 1500); check();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchHere); else watchHere();

})();

/* ===== layer-type.js ===== */
/* layer-type.js — дизайн-слой v2: типограф для текста, который рисует JavaScript (модули практик, «Ресурсы», карта атласа, подсказки поиска).
   Статичный HTML обрабатывает patches/files/typograph.py при сборке; сюда он не дотягивается — эти строки живут в JS и JSON.
   Что делает: неразрывный пробел после коротких слов («в», «и», «не»…), перед тире, перед «же/ли/бы», между числом и словом.
   Только новый текст, только обычный пробел → повторная обработка ничего не меняет. Поля ввода, код и svg не трогает.
   При внедрении: функция WK.typo(строка) — в site-v2.js, модули вызывают её при вставке текста; наблюдатель ниже можно оставить как страховку. */
(function () {
  'use strict';
  var SHORT = 'в|во|и|а|но|да|с|со|к|ко|о|об|обо|у|не|ни|на|по|за|из|изо|от|ото|до|для|без|при|про|под|над';
  var NB = ' ';
  var reShort = new RegExp('(^|[\\s («„"\\[—–])(' + SHORT + ') (?=[0-9A-Za-zА-Яа-яЁё«„"(\\[№€$])', 'gi');
  var reDash = /([^\s ]) ([—])/g;                       // слово — слово
  var reAfter = /([0-9A-Za-zА-Яа-яЁё»)]) (же|ли|бы)(?![0-9A-Za-zА-Яа-яЁё-])/g;
  var reNum = /(^|[^\w.,])(\d+(?:[.,]\d+)?) (?=[A-Za-zА-Яа-яЁё€₽$%])/g;
  var reThousands = /(^|[^\d.,])(\d{1,3}) (?=\d{3}(?!\d))/g;

  function typo(s) {
    if (!s || s.indexOf(' ') < 0) return s;
    var prev;
    do { prev = s; s = s.replace(reShort, function (m, a, w) { return a + w + NB; }); } while (s !== prev); // цепочки «и в доме»
    return s.replace(reDash, '$1' + NB + '$2').replace(reAfter, '$1' + NB + '$2')
            .replace(reThousands, '$1$2' + NB).replace(reNum, '$1$2' + NB);
  }
  window.WK = window.WK || {};
  window.WK.typo = typo;

  var SKIP = 'script,style,code,pre,kbd,textarea,input,select,[contenteditable],[data-no-typo],.site-head nav';
  function walk(root) {
    if (root.nodeType === 3) { fix(root); return; }
    if (root.nodeType !== 1 || (root.closest && root.closest(SKIP))) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(fix);
  }
  function fix(n) {
    var p = n.parentElement; if (!p || p.closest(SKIP)) return;
    var v = n.nodeValue; if (!v || v.indexOf(' ') < 0) return;
    var t = typo(v); if (t !== v) n.nodeValue = t;
  }
  var queue = [], scheduled = false;
  function flush() { scheduled = false; var q = queue; queue = []; q.forEach(walk); }
  function start() {
    walk(document.body);  // то, что модули уже успели нарисовать
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { for (var i = 0; i < m.addedNodes.length; i++) queue.push(m.addedNodes[i]); });
      if (queue.length && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* ===== layer-states.js ===== */
/* =====================================================================
   layer-states.js — дизайн-слой v2: СОСТОЯНИЯ (песочница options-v2/layer, 26.10.2026)
   При внедрении: части 1–2 вливаются в assets/site.js (меню) и site-v2.js (окошко),
   часть 3 — в site-v2.js. Подробно — patches/states.md.
   1. Меню на телефоне: фокус не уходит на страницу под меню (inert + Tab по кругу);
      Esc закрывает меню и из поля поиска (раньше форма гасила нажатие).
   2. Окошко «База знаний» и поиск: Esc сначала закрывает подсказки, вторым нажатием — окошко
      или меню; открытое с клавиатуры окошко ставит курсор в поиск (аудит 06-A, М3).
   3. Касание ≥ 44 px для мелких ссылок без сдвига вёрстки: невидимая зона нажатия .st-hit,
      не больше середины промежутка до соседней ссылки (зоны не налезают друг на друга).
   ===================================================================== */
(function(){
'use strict';
var D = document, W = window;
var head = D.querySelector('.site-head');
var menuBtn = head && head.querySelector('.menu-btn');
var nav = head && head.querySelector('.site-nav');
var DESK = W.matchMedia('(min-width: 981px)');

function visible(el){ return !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
function focusables(root){
  return Array.prototype.filter.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,summary,[tabindex]:not([tabindex="-1"])'), visible);
}
function menuOpen(){ return !!(head && head.classList.contains('is-open')) && !DESK.matches; }

/* подсказки поиска, если открыты: закрыть их (то же, что делает kb.js по Esc) */
function closeSuggest(input){
  var id = input && input.getAttribute('aria-controls'), panel = id && D.getElementById(id);
  if(!panel || panel.hidden) return false;
  panel.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  return true;
}

/* ---------- 1. меню на телефоне ---------- */
if(head && menuBtn && nav){
  var outside = [];
  function setInert(on){
    if(on){
      outside = Array.prototype.filter.call(D.body.children, function(el){ return el !== head && !el.contains(head) && el.tagName !== 'SCRIPT'; });
      outside.forEach(function(el){ el.inert = true; el.setAttribute('data-st-inert', ''); });
    } else {
      Array.prototype.forEach.call(D.querySelectorAll('[data-st-inert]'), function(el){ el.inert = false; el.removeAttribute('data-st-inert'); });
      outside = [];
    }
  }
  new MutationObserver(function(){ setInert(menuOpen()); }).observe(head, {attributes:true, attributeFilter:['class']});
  DESK.addEventListener && DESK.addEventListener('change', function(){ setInert(menuOpen()); });

  /* Tab по кругу внутри шапки: знак → «Закрыть» → пункты меню → «Написать в Telegram» → знак */
  head.addEventListener('keydown', function(e){
    if(e.key !== 'Tab' || !menuOpen()) return;
    var list = focusables(head);
    if(!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if(e.shiftKey && D.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && D.activeElement === last){ e.preventDefault(); first.focus(); }
  });
}

/* ---------- 2. Esc: подсказки → окошко / меню ---------- */
/* слушаем на window в фазе захвата: раньше обработчика site-v2.js (document, захват)
   и раньше формы поиска, которая гасит всплытие (onkeydown="event.stopPropagation()") */
W.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  var t = e.target;
  var inSearch = t && t.matches && t.matches('.kb-search input');
  if(inSearch && closeSuggest(t)){ e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(menuOpen() && head.contains(t)){
    e.preventDefault(); e.stopImmediatePropagation();
    menuBtn.click();                       /* site.js закрывает меню и меняет подпись на «Меню» */
    menuBtn.focus({preventScroll:true});
  }
}, true);

/* окошко на компьютере, открытое с клавиатуры: курсор сразу в поиск (самое частое действие) */
var kbBtn = D.querySelector('.site-head .kb-btn'), kbQ = D.getElementById('kb-pop-q');
if(kbBtn && kbQ){
  kbBtn.addEventListener('click', function(e){
    if(e.detail !== 0 || !DESK.matches) return;
    setTimeout(function(){ if(kbBtn.getAttribute('aria-expanded') === 'true') kbQ.focus({preventScroll:true}); }, 0);
  });
  kbBtn.addEventListener('keydown', function(e){
    if(e.key === 'ArrowDown' && DESK.matches) setTimeout(function(){ kbQ.focus({preventScroll:true}); }, 0);
  });
}

/* ---------- 3. зона нажатия ≥ 44 px ---------- */
var TOUCH = W.matchMedia('(hover: none), (pointer: coarse)');
var MIN = 44;
var SEL = 'a[href],button,summary,[role="button"]';
function hasPseudo(el){
  var b = getComputedStyle(el, '::before');
  return b.content && b.content !== 'none' && b.content !== 'normal';
}
function fitHits(){
  Array.prototype.forEach.call(D.querySelectorAll('.st-hit'), function(el){ el.classList.remove('st-hit'); el.style.removeProperty('--st-hit-t'); el.style.removeProperty('--st-hit-b'); });
  if(!TOUCH.matches) return;
  var all = Array.prototype.filter.call(D.querySelectorAll(SEL), visible);
  var rects = all.map(function(el){ return el.getBoundingClientRect(); });
  all.forEach(function(el, i){
    var r = rects[i];
    if(r.height >= MIN || r.width === 0) return;
    var cs = getComputedStyle(el);
    if(cs.position !== 'static' || hasPseudo(el) || el.closest('.a-stage, svg')) return;
    var need = (MIN - r.height) / 2, up = need, down = need;
    for(var j = 0; j < rects.length; j++){
      if(j === i) continue;
      var o = rects[j];
      if(o.right <= r.left - 4 || o.left >= r.right + 4) continue;          /* не над и не под нами */
      if(o.bottom <= r.top) up = Math.min(up, (r.top - o.bottom) / 2);
      else if(o.top >= r.bottom) down = Math.min(down, (o.top - r.bottom) / 2);
    }
    if(up < 2 && down < 2) return;
    el.classList.add('st-hit');
    el.style.setProperty('--st-hit-t', Math.max(0, Math.floor(up)) + 'px');
    el.style.setProperty('--st-hit-b', Math.max(0, Math.floor(down)) + 'px');
  });
}
var tHit = 0;
function later(){ clearTimeout(tHit); tHit = setTimeout(fitHits, 250); }
function start(){
  fitHits();
  setTimeout(fitHits, 1500);                                   /* модули дорисовываются позже */
  W.addEventListener('resize', later);
  TOUCH.addEventListener && TOUCH.addEventListener('change', later);
  if(D.fonts && D.fonts.ready) D.fonts.ready.then(later);
}
if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();

W.WKStates = { fitHits: fitHits };
})();

/* ===== layer-motion.js ===== */
/* =====================================================================
   layer-motion.js — дизайн-слой v2: движение (26.10.2026). Пара: layer-motion.css.
   1. Свет атмосферы: до первой отрисовки без переходов (html.wk-live ставится после load + 2 кадра),
      поэтому пятна сразу стоят на месте, а не едут 4 с при каждой загрузке и переходе.
   2. Появление картин .plate-alive — вместо проявки site-v2.js (размытый подмалёвок, 3,6 с).
      Варианты (выбор Саши, options-v2/reveal):
        A «Лист ложится» — шторка по диагонали, край рваной бумаги (Саша: не нравится).
        I «Тихий масштаб» — прозрачность 0→1 и масштаб 1,03→1, без маски. ПО УМОЛЧАНИЮ (решение Саши 27.10).
        B «Из зерна»     — картина собирается из точек растра от главной точки картины.
        C «Окно»         — окно мягкой неровной формы раскрывается, картина приближается.
        D «Чернила»      — от главной точки растекается чернильный оттиск, за ним приходит цвет.
      Переключатель: --wk-reveal на :root (a|b|c|d) или класс html.reveal-b и т. п.; для показа ?reveal=b.
      Правила: одна кривая (--ease-slow), первый экран --dur-5 (1,2 с), ниже — --dur-4 (0,8 с);
      ОДИН РАЗ ЗА ВИЗИТ на картину (sessionStorage), повтор — сразу итог; «меньше движения» — сразу итог;
      без размытия; подпись и текст не ждут. Служебное: ?rv-t=0.4 — застыть в доле времени (раскадровка).
   ===================================================================== */
(function(){
'use strict';
var D = document, W = window, H = D.documentElement;
var RM = W.matchMedia('(prefers-reduced-motion: reduce)');
var Q = new URLSearchParams(location.search);
/* картины первого экрана, которые CSS-страховка уже показала (скрипт пришёл поздно, медленный телефон):
   их не прячем и не проявляем заново — «показанное не прятать». Смотрим до того, как снять страховку. */
var SHOWN = [];
Array.prototype.forEach.call(D.querySelectorAll('figure.plate-alive[data-pa-eager] .pa-img'), function(w){
  if(getComputedStyle(w).visibility === 'visible') SHOWN.push(w.parentNode);
});
H.classList.add('wk-rv-on');

/* ---------- 1. Свет: переходы включаются только после загрузки ---------- */
function live(){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ H.classList.add('wk-live'); }); }); }
if(D.readyState === 'complete') live(); else W.addEventListener('load', live, {once: true});

/* ---------- 2. Появление картин ---------- */
var qv = (Q.get('reveal') || '').toLowerCase();
if(/^[abcdi]$/.test(qv)){ H.classList.remove('reveal-a', 'reveal-b', 'reveal-c', 'reveal-d', 'reveal-i'); H.classList.add('reveal-' + qv); }
var cs0 = getComputedStyle(H);
var V = (cs0.getPropertyValue('--wk-reveal') || 'i').trim().toLowerCase(); if(!/^[abcdi]$/.test(V)) V = 'i';
H.setAttribute('data-reveal', V);
function secs(name, def){ var v = cs0.getPropertyValue(name).trim(); if(!v) return def; return /ms$/.test(v) ? parseFloat(v)/1000 : parseFloat(v) || def; }
var DUR_COVER = Math.min(1.2, secs('--dur-5', 1.2)), DUR_INNER = secs('--dur-4', .8);
var FIX = Q.has('rv-t') ? Math.max(0, Math.min(1, parseFloat(Q.get('rv-t')))) : -1;

/* кривая из токена --ease-slow: cubic-bezier(x1,y1,x2,y2) */
function bezier(x1, y1, x2, y2){
  function a(p1, p2){ return 1 - 3*p2 + 3*p1; } function b(p1, p2){ return 3*p2 - 6*p1; } function c(p1){ return 3*p1; }
  function at(t, p1, p2){ return ((a(p1,p2)*t + b(p1,p2))*t + c(p1))*t; }
  function slope(t, p1, p2){ return 3*a(p1,p2)*t*t + 2*b(p1,p2)*t + c(p1); }
  return function(x){
    if(x <= 0) return 0; if(x >= 1) return 1;
    var t = x; for(var i = 0; i < 8; i++){ var s = slope(t, x1, x2); if(Math.abs(s) < 1e-6) break; t -= (at(t, x1, x2) - x)/s; }
    if(t < 0 || t > 1){ var lo = 0, hi = 1; t = x; for(var j = 0; j < 30; j++){ var v = at(t, x1, x2); if(v < x) lo = t; else hi = t; t = (lo + hi)/2; } }
    return at(t, y1, y2);
  };
}
var EASE = (function(){
  var m = /cubic-bezier\(([^)]+)\)/.exec(cs0.getPropertyValue('--ease-slow') || ''), n = m ? m[1].split(',').map(parseFloat) : [];
  return n.length === 4 && n.every(isFinite) ? bezier(n[0], n[1], n[2], n[3]) : bezier(.35, 0, .15, 1);
})();

/* шум: значения в узлах сетки + сглаживание, несколько октав */
function hash(x, y, s){ var h = (Math.imul(x|0, 374761393) + Math.imul(y|0, 668265263) + Math.imul(s|0, 1442695041))|0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0)/4294967296; }
function vnoise(x, y, s){
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  var u = xf*xf*(3 - 2*xf), v = yf*yf*(3 - 2*yf);
  var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a)*u + (c - a)*v + (a - b - c + d)*u*v;
}
function fbm(x, y, s, oct){ var sum = 0, amp = .5, f = 1, norm = 0; for(var o = 0; o < oct; o++){ sum += amp*vnoise(x*f, y*f, s + o*31); norm += amp; amp *= .5; f *= 2.03; } return sum/norm; }
function clamp01(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
function sstep(a, b, x){ var t = clamp01((x - a)/(b - a)); return t*t*(3 - 2*t); }

/* один раз за визит: флаг на картину в sessionStorage; нет хранилища — показываем как «уже видели» не будем, проявляем */
var store = null; try{ store = W.sessionStorage; store.setItem('wk-t', '1'); store.removeItem('wk-t'); }catch(e){ store = null; }
function seen(k){ try{ return !!store && store.getItem(k) === '1'; }catch(e){ return false; } }
function markSeen(k){ try{ if(store) store.setItem(k, '1'); }catch(e){} }

var plates = [];
function setup(fig, k){
  var wrap = fig.querySelector('.pa-img'), img = wrap && wrap.querySelector('img:not(.pa-ghost)');
  if(!wrap || !img) return;
  var cover = fig.hasAttribute('data-pa-eager') || !!fig.closest('.cover, .kb-cover, .fs-cover, [data-rv-cover]');
  var st = { fig: fig, wrap: wrap, img: img, k: k, cover: cover, dur: cover ? DUR_COVER : DUR_INNER,
    from: (fig.getAttribute('data-pa-from') || '.5 .55').split(' ').map(Number),
    key: 'wk-rv:' + V + ':' + (img.getAttribute('src') || k), w: 0, h: 0, raf: 0, cv: null, state: 'wait' };
  st.shown = SHOWN.indexOf(fig) >= 0;
  plates.push(st);
  function ready(){
    measure(st);
    if(RM.matches){ finish(st, false); return; }
    if(FIX >= 0){ frame(st, FIX); return; }
    if(seen(st.key) || st.shown){ finish(st, !!st.shown); return; }
    hold(st);
    if(cover && inView(fig)) play(st); else watch(st);
  }
  if(img.complete && img.naturalWidth) ready();
  else {
    if(!RM.matches && !st.shown) hold(st);
    img.addEventListener('load', ready, {once: true});
    img.addEventListener('error', function(){ finish(st, false); }, {once: true});
  }
}
function inView(el){ var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
function watch(st){
  if(!('IntersectionObserver' in W)){ play(st); return; }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ io.disconnect(); play(st); } }); }, {threshold: .25});
  io.observe(st.fig); st.io = io;
}
function measure(st){
  var r = st.wrap.getBoundingClientRect(); st.w = Math.max(40, Math.round(r.width)); st.h = Math.max(40, Math.round(r.height));
  st.fields = null;
}
/* «держать»: до начала картина не видна (только её место), подпись видна всегда */
function hold(st){ st.fig.classList.add('wk-hold'); st.state = 'hold'; }

/* ---------- маски A и D: сетка 2 css px, растягивается мягко ---------- */
var CELL = 2;
function fieldsAD(st){
  var w = st.w, h = st.h, mw = Math.ceil(w/CELL), mh = Math.ceil(h/CELL), n = mw*mh;
  var FIN = new Float32Array(n), ARR = new Float32Array(n), s = 7 + st.k*13, maxd = 0;
  for(var y = 0; y < mh; y++) for(var x = 0; x < mw; x++){
    var i = y*mw + x, px = (x + .5)*CELL, py = (y + .5)*CELL;
    var e = Math.min(px, w - px, py, h - py);                       /* до ближайшего края, css px */
    if(V === 'a'){
      /* рваная бумага: мелкие зубцы + крупная волна; переход ~1 клетка — край почти чёткий */
      var o = 7 + (fbm(px/38, py/38, s, 3) - .5)*14 + (vnoise(px/3.2, py/3.2, s + 5) - .5)*3.2;
      FIN[i] = sstep(o - 1.1, o + 1.1, e);
      /* шторка: от левого нижнего угла к правому верхнему; фронт тоже рваный */
      var sd = (px/w + (1 - py/h))/2;
      ARR[i] = sd + (fbm(px/26, py/26, s + 9, 3) - .5)*.09;
    } else {
      /* мазок кисти: шум вытянут по горизонтали, у каждой стороны свой характер */
      var streak = fbm(px/120, py/9, s, 4), lump = fbm(px/60, py/60, s + 3, 2);
      var side = (e === px) ? 1.25 : (e === w - px) ? .7 : (e === py) ? .9 : 1.1;
      var od = (6 + streak*26 + (lump - .5)*14)*side;
      var dry = (vnoise(px/2.5, py/14, s + 11) - .5)*7;              /* «сухая кисть» у края */
      FIN[i] = sstep(od - 7, od + 7, e + dry);
      /* чернила: расстояние от главной точки, искажённое шумом — языки и затёки */
      var M = Math.max(w, h), wx = (fbm(px/90, py/90, s + 17, 3) - .5)*.55, wy = (fbm(px/90 + 40, py/90, s + 23, 3) - .5)*.55;
      var dx = px/M - st.from[0]*w/M + wx*.35, dy = py/M - st.from[1]*h/M + wy*.35;
      var d = Math.sqrt(dx*dx + dy*dy) + (fbm(px/22, py/22, s + 29, 3) - .5)*.09;
      ARR[i] = d; if(d > maxd) maxd = d;
    }
  }
  if(V === 'd'){ for(var j = 0; j < n; j++) ARR[j] = Math.max(0, ARR[j]/maxd); }
  var mc = D.createElement('canvas'); mc.width = mw; mc.height = mh;
  var mg = mc.getContext('2d'), id = mg.createImageData(mw, mh), extra = null;
  if(V === 'd'){ var mc2 = D.createElement('canvas'); mc2.width = mw; mc2.height = mh; var g2 = mc2.getContext('2d'); extra = {mc: mc2, mg: g2, id: g2.createImageData(mw, mh)}; }
  return {mw: mw, mh: mh, FIN: FIN, ARR: ARR, mc: mc, mg: mg, id: id, extra: extra};
}
function maskAD(F, P, soft, target){
  var t = target || F, md = t.id.data, FIN = F.FIN, ARR = F.ARR, n = FIN.length;
  for(var i = 0; i < n; i++){
    var a = P >= 2 ? FIN[i] : FIN[i]*clamp01((P - ARR[i])/soft);
    md[i*4 + 3] = (a*255 + .5)|0;
  }
  t.mg.putImageData(t.id, 0, 0);
  return t.mc;
}
/* ---------- B: точки растра ---------- */
function fieldsB(st){
  var w = st.w, h = st.h, c = w < 360 ? 4 : 5, cols = Math.ceil(w/c) + 1, rows = Math.ceil(h/c) + 1, n = cols*rows;
  var T = new Float32Array(n), FR = new Float32Array(n), s = 41 + st.k*7, maxd = 0;
  var fx = st.from[0]*w, fy = st.from[1]*h, EW = Math.min(44, Math.min(w, h)*.12);
  for(var y = 0; y < rows; y++) for(var x = 0; x < cols; x++){
    var i = y*cols + x, px = x*c, py = y*c;
    var d = Math.sqrt((px - fx)*(px - fx) + (py - fy)*(py - fy)); if(d > maxd) maxd = d;
    T[i] = d;
    var e = Math.min(px, w - px, py, h - py) + (fbm(px/70, py/70, s, 3) - .5)*30;
    var fr = sstep(-4, EW, e);
    FR[i] = fr >= .995 ? 1 : fr*(.7 + .45*hash(x, y, s + 2));
  }
  for(var j = 0; j < n; j++) T[j] = .5*hash(j, 7, s) + .5*(T[j]/maxd);
  var dpr = Math.min(2, W.devicePixelRatio || 1);
  var mc = D.createElement('canvas'); mc.width = Math.round(w*dpr); mc.height = Math.round(h*dpr);
  return {c: c, cols: cols, rows: rows, T: T, FR: FR, mc: mc, mg: mc.getContext('2d'), dpr: dpr};
}
function maskB(F, p){
  var g = F.mg, c = F.c, R = c*.75*F.dpr, sc = F.dpr, P = p*1.4, cols = F.cols, rows = F.rows;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, F.mc.width, F.mc.height); g.fillStyle = '#000'; g.beginPath();
  for(var y = 0; y < rows; y++) for(var x = 0; x < cols; x++){
    var i = y*cols + x, k = p >= 1 ? 1 : clamp01((P - F.T[i])/.4), r = R*F.FR[i]*k;
    if(r < .35) continue;
    var cx = x*c*sc, cy = y*c*sc; g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, 6.2832);
  }
  g.fill();
  return F.mc;
}
/* ---------- C: окно мягкой формы ---------- */
function fieldsC(st){
  var w = st.w, h = st.h, mw = Math.ceil(w/CELL), mh = Math.ceil(h/CELL), s = 61 + st.k*5;
  var mc = D.createElement('canvas'); mc.width = mw; mc.height = mh;
  var mg = mc.getContext('2d'), id = mg.createImageData(mw, mh), md = id.data, portrait = h > w*1.15;
  for(var y = 0; y < mh; y++) for(var x = 0; x < mw; x++){
    var px = (x + .5)*CELL, py = (y + .5)*CELL, nx = (px/w)*2 - 1, ny = (py/h)*2 - 1;
    var ang = Math.atan2(ny, nx), wob = (fbm(Math.cos(ang)*1.6 + 5, Math.sin(ang)*1.6 + 5, s, 3) - .5)*.07, r;
    if(portrait && ny < 0) r = Math.pow(Math.pow(Math.abs(nx), 2.4) + Math.pow(Math.abs(ny), 2.4), 1/2.4);
    else r = Math.pow(Math.pow(Math.abs(nx), 5.2) + Math.pow(Math.abs(ny), 5.2), 1/5.2);
    var edge = .965 + wob, soft = .018 + .07*fbm(Math.cos(ang)*1.1 + 9, Math.sin(ang)*1.1 + 9, s + 4, 2);
    md[(y*mw + x)*4 + 3] = ((1 - sstep(edge - soft, edge, r))*255 + .5)|0;
  }
  mg.putImageData(id, 0, 0);
  return {mc: mc};
}
/* картинка в холст с учётом object-fit: cover и object-position */
function drawImg(g, st, cw, ch){
  var im = st.img, cs = getComputedStyle(im), iw = im.naturalWidth, ih = im.naturalHeight;
  if(cs.objectFit !== 'cover' || !iw){ g.drawImage(im, 0, 0, cw, ch); return; }
  var sc = Math.max(cw/iw, ch/ih), sw = cw/sc, sh = ch/sc, op = cs.objectPosition.split(' ');
  function frac(v){ return v.indexOf('%') > 0 ? parseFloat(v)/100 : .5; }
  g.drawImage(im, (iw - sw)*frac(op[0]), (ih - sh)*frac(op[1] || '50%'), sw, sh, 0, 0, cw, ch);
}
function ensureCanvas(st){
  if(st.cv) return;
  var cv = D.createElement('canvas'); cv.className = 'wk-rv-cv'; cv.setAttribute('aria-hidden', 'true');
  var dpr = Math.min(2, W.devicePixelRatio || 1); cv.width = Math.round(st.w*dpr); cv.height = Math.round(st.h*dpr);
  st.wrap.appendChild(cv); st.cv = cv; st.ctx = cv.getContext('2d');
  if(V === 'd'){
    /* чернильный оттиск: та же картина в одном цвете (тон чернил сайта), без размытия */
    var duo = D.createElement('canvas'); duo.width = cv.width; duo.height = cv.height;
    var g = duo.getContext('2d'); g.filter = 'grayscale(1) contrast(1.15) brightness(1.04)'; drawImg(g, st, duo.width, duo.height); g.filter = 'none';
    g.globalCompositeOperation = 'color'; g.fillStyle = '#2c4366'; g.fillRect(0, 0, duo.width, duo.height);
    var sc = D.createElement('canvas'); sc.width = cv.width; sc.height = cv.height;
    st.duo = duo; st.scratch = sc; st.sg = sc.getContext('2d');
  }
}
function frame(st, t){                        /* t — доля времени 0…1 */
  var p = EASE(t);
  st.fig.classList.remove('wk-hold');
  if(V === 'i'){ applyI(st, p); return; }
  if(V === 'c'){ applyC(st, p); return; }
  st.fig.classList.add('wk-run');
  if(!st.fields) st.fields = V === 'b' ? fieldsB(st) : fieldsAD(st);
  ensureCanvas(st);
  var ctx = st.ctx, cw = st.cv.width, ch = st.cv.height, F = st.fields;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cw, ch);
  if(V === 'a'){
    var s = 1 + .08*(1 - p);                   /* лист «садится» к левому нижнему углу, откуда идёт шторка */
    ctx.setTransform(s, 0, 0, s, 0, ch*(1 - s));
    drawImg(ctx, st, cw, ch); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-in'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(maskAD(F, p >= 1 ? 2 : p*1.12, .014), 0, 0, cw, ch);
  } else if(V === 'b'){
    drawImg(ctx, st, cw, ch);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(maskB(F, p), 0, 0, cw, ch);
  } else {
    var Pi = p >= 1 ? 2 : p*1.25, Pc = p >= 1 ? 2 : p*1.25 - .2;   /* цвет идёт следом за чернилами */
    drawImg(ctx, st, cw, ch);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(maskAD(F, Pc, .1), 0, 0, cw, ch);
    var sg = st.sg; sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, cw, ch);
    sg.drawImage(st.duo, 0, 0); sg.globalCompositeOperation = 'destination-in'; sg.drawImage(maskAD(F, Pi, .025, F.extra), 0, 0, cw, ch);
    ctx.globalCompositeOperation = 'destination-over'; ctx.drawImage(st.scratch, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-over';
}
function scrollK(st){
  if(RM.matches) return 1;
  var r = st.fig.getBoundingClientRect(), q = clamp01((innerHeight - r.top)/(innerHeight + r.height));
  return 1 + .07*q;
}
function applyC(st, p){
  if(!st.cmask){ st.cmask = 'url(' + fieldsC(st).mc.toDataURL() + ')'; setMask(st.wrap, st.cmask); }
  var m = (70 + 30*p).toFixed(2) + '% ' + (70 + 30*p).toFixed(2) + '%';
  st.wrap.style.webkitMaskSize = m; st.wrap.style.maskSize = m;
  st.wrap.style.webkitMaskPosition = st.wrap.style.maskPosition = (st.from[0]*100).toFixed(0) + '% ' + (st.from[1]*100).toFixed(0) + '%';
  var s = (1 + .14*(1 - p))*scrollK(st);
  st.img.style.transformOrigin = (st.from[0]*100) + '% ' + (st.from[1]*100) + '%';
  st.img.style.transform = 'scale(' + s.toFixed(4) + ')';
}
/* I «Тихий масштаб» (выбор Саши 27.10): картина на месте, только прозрачность 0→1 и масштаб 1,03→1, без маски и без размытия */
function applyI(st, p){ st.img.style.opacity = p.toFixed(3); st.img.style.transform = 'scale(' + (1 + .03*(1 - p)).toFixed(4) + ')'; st.img.style.transformOrigin = '50% 50%'; }
function setMask(el, u){ el.style.webkitMaskImage = u; el.style.maskImage = u; el.style.webkitMaskRepeat = el.style.maskRepeat = 'no-repeat'; el.style.webkitMaskSize = el.style.maskSize = '100% 100%'; }

function play(st){
  if(st.state === 'run' || st.state === 'done') return;
  st.state = 'run'; if(st.io){ st.io.disconnect(); st.io = null; }
  var T0 = performance.now();
  function tick(now){
    var t = (now - T0)/1000/st.dur;
    if(t >= 1){ finish(st, true); return; }
    frame(st, Math.max(0, t)); st.raf = requestAnimationFrame(tick);
  }
  st.raf = requestAnimationFrame(tick);
}
/* итог: маска ставится на обёртку картинки один раз, холст убирается */
function finish(st, mark){
  cancelAnimationFrame(st.raf); st.state = 'done';
  if(st.io){ st.io.disconnect(); st.io = null; }
  if(mark) markSeen(st.key);
  if(!st.w) measure(st);
  if(V === 'i'){ applyI(st, 1); st.img.style.opacity = ''; st.img.style.transform = ''; }
  else if(V === 'c'){ st.cmask = null; applyC(st, 1); }
  else {
    if(!st.fields) st.fields = V === 'b' ? fieldsB(st) : fieldsAD(st);
    setMask(st.wrap, 'url(' + (V === 'b' ? maskB(st.fields, 1) : maskAD(st.fields, 2, 1)).toDataURL() + ')');
  }
  if(st.cv){ st.cv.remove(); st.cv = null; }
  st.fig.classList.remove('wk-hold', 'wk-run'); st.fig.classList.add('wk-done');
}
function reset(st){
  cancelAnimationFrame(st.raf); if(st.io){ st.io.disconnect(); st.io = null; }
  if(st.cv){ st.cv.remove(); st.cv = null; }
  st.wrap.style.webkitMaskImage = st.wrap.style.maskImage = ''; st.img.style.transform = ''; st.cmask = null;
  st.fig.classList.remove('wk-done', 'wk-run'); st.state = 'wait';
  measure(st); hold(st);
}
/* C: медленный масштаб по прокрутке — только у окон, которые уже раскрылись */
if(V === 'c'){
  var ticking = false;
  W.addEventListener('scroll', function(){
    if(ticking || RM.matches) return; ticking = true;
    requestAnimationFrame(function(){ ticking = false; plates.forEach(function(st){ if(st.state === 'done' && inView(st.fig)) applyC(st, 1); }); });
  }, {passive: true});
}
/* смена размера окна — пересчитать итоговую маску */
var rz = 0, lastW = innerWidth;
W.addEventListener('resize', function(){
  if(innerWidth === lastW) return; lastW = innerWidth;        /* на телефоне высота меняется при прокрутке — не пересчитываем */
  clearTimeout(rz); rz = setTimeout(function(){ plates.forEach(function(st){ if(st.state === 'done'){ measure(st); st.cmask = null; finish(st, false); } }); }, 200);
});
/* для показа: заново проиграть появление на этой странице */
W.wkReveal = { variant: V, replay: function(){
  plates.forEach(function(st){ try{ store && store.removeItem(st.key); }catch(e){} reset(st); });
  plates.forEach(function(st){ if(inView(st.fig)) play(st); else watch(st); });
} };

function init(){ Array.prototype.forEach.call(D.querySelectorAll('figure.plate-alive'), setup); }
if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
