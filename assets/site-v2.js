/* =====================================================================
   Waykeeper · site-v2.js · слой v2 «Атлас на бумаге» (26.10.2026)
   Подключение: <script src="assets/site-v2.js" defer></script> сразу после site.js.
   1. Окошко «База знаний» в шапке: наведение или нажатие открывает; Esc закрывает
      и возвращает фокус на пункт; стрелки ходят по строкам; Tab с последней строки
      и щелчок мимо — закрывают. На телефоне окошко раскрыто внутри листа меню.
   2. Бумага: волокна и пятнышки (canvas, один раз) — слой .paper-layer.
   3. Рельеф [data-topo]: горизонтали по шуму (marching squares), один раз на размер.
   4. Проявление при прокрутке: .rise и сами компоненты v2; дисплей — строками.
   5. Виды .view: картинка чуть медленнее страницы (параллакс ±3 %).
   6. Роза ветров .rose: стрелка слегка покачивается от прокрутки и успокаивается.
   7. Рамка атмосферы: вертикали atmo стоят в полях страницы, а не у колонки 1200.
   8. Живые картины .plate-alive (проявка: бледный подмалёвок → пятно резкости и цвета растекается) и картинки карточек, которые тают (.tile-view--melt).
   «Уменьшить движение»: 4–6 выключены, всё видно сразу. Без библиотек.
   ===================================================================== */
(function(){
'use strict';
var D = document, W = window, HTML = D.documentElement;
var RM = W.matchMedia('(prefers-reduced-motion: reduce)');
var HOVER = W.matchMedia('(hover: hover) and (pointer: fine)');
var DESK = W.matchMedia('(min-width: 981px)');
HTML.classList.add('v2-js');

/* ---------- 1. «База знаний» ---------- */
function initKB(){
  var kb = D.querySelector('.site-head .kb'); if(!kb) return;
  var btn = kb.querySelector('.kb-btn'), pop = kb.querySelector('.kb-pop');
  if(!btn || !pop) return;
  var items = Array.prototype.slice.call(pop.querySelectorAll('a'));
  var tOpen = 0, tClose = 0;
  function isOpen(){ return kb.classList.contains('is-open'); }
  function open(focusFirst){
    clearTimeout(tClose);
    kb.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
    if(focusFirst && items[0]) items[0].focus({preventScroll:true});
  }
  function close(returnFocus){
    clearTimeout(tOpen);
    kb.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
    if(returnFocus) btn.focus({preventScroll:true});
  }
  btn.addEventListener('click', function(e){
    if(!DESK.matches) return;
    /* щелчок: открыть/закрыть; с клавиатуры (detail 0) — сразу фокус на первую строку */
    if(isOpen()) close(false); else open(e.detail === 0);
  });
  btn.addEventListener('keydown', function(e){
    if(e.key === 'ArrowDown'){ e.preventDefault(); open(true); }
  });
  kb.addEventListener('mouseenter', function(){ if(!HOVER.matches || !DESK.matches) return; clearTimeout(tClose); tOpen = setTimeout(function(){ open(false); }, 90); });
  kb.addEventListener('mouseleave', function(){ if(!HOVER.matches || !DESK.matches) return; clearTimeout(tOpen); tClose = setTimeout(function(){ close(false); }, 220); });
  pop.addEventListener('keydown', function(e){
    var i = items.indexOf(D.activeElement);
    if(e.key === 'ArrowDown'){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if(e.key === 'Home'){ e.preventDefault(); items[0].focus(); }
    else if(e.key === 'End'){ e.preventDefault(); items[items.length - 1].focus(); }
  });
  D.addEventListener('keydown', function(e){ if(e.key === 'Escape' && isOpen() && DESK.matches){ e.stopPropagation(); close(true); } }, true);
  kb.addEventListener('focusout', function(e){ if(DESK.matches && isOpen() && !kb.contains(e.relatedTarget)) close(false); });
  D.addEventListener('click', function(e){ if(isOpen() && !kb.contains(e.target)) close(false); });
  DESK.addEventListener && DESK.addEventListener('change', function(){ close(false); });
  /* проверка вида окошка без мыши: адрес с #kb-open (для снимков) */
  if(location.hash === '#kb-open' && DESK.matches) open(false);
}

/* ---------- 2. Бумага ---------- */
function rand(seed){ var s = seed >>> 0 || 1; return function(){ s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function initPaper(){
  /* решение Саши 26.10: зерно — только атмосфера v1; волокно включается вручную <body data-paper> */
  if(D.querySelector('.paper-layer') || !D.body.hasAttribute('data-paper')) return;
  var dpr = Math.min(W.devicePixelRatio || 1, 2), S = 420, c = D.createElement('canvas');
  c.width = c.height = S * dpr; var g = c.getContext('2d'); if(!g) return;
  g.scale(dpr, dpr); var r = rand(7331);
  /* мягкие пятна — неровность листа */
  for(var i = 0; i < 9; i++){
    var x = r()*S, y = r()*S, R = 40 + r()*90, gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, 'rgba(120,92,52,' + (0.018 + r()*0.016) + ')'); gr.addColorStop(1, 'rgba(120,92,52,0)');
    g.fillStyle = gr; g.fillRect(x - R, y - R, R*2, R*2);
  }
  /* волокна — короткие изогнутые штрихи разной темноты */
  g.lineCap = 'round';
  for(var k = 0; k < 170; k++){
    var x0 = r()*S, y0 = r()*S, len = 6 + r()*26, a = r()*Math.PI*2, bend = (r() - .5)*.9;
    var dark = r() < .7;
    g.strokeStyle = dark ? 'rgba(96,72,44,' + (0.035 + r()*0.05) + ')' : 'rgba(255,255,255,' + (0.25 + r()*0.3) + ')';
    g.lineWidth = .4 + r()*.5;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(a + bend)*len*.5, y0 + Math.sin(a + bend)*len*.5, x0 + Math.cos(a)*len, y0 + Math.sin(a)*len);
    g.stroke();
  }
  /* редкие тёмные крупинки, как в недорогой бумаге */
  for(var m = 0; m < 26; m++){ g.fillStyle = 'rgba(70,52,30,' + (0.08 + r()*0.12) + ')'; g.beginPath(); g.arc(r()*S, r()*S, .35 + r()*.55, 0, 6.283); g.fill(); }
  var layer = D.createElement('div'); layer.className = 'paper-layer'; layer.setAttribute('aria-hidden', 'true');
  layer.style.backgroundSize = S + 'px ' + S + 'px';
  var put = function(url){ layer.style.backgroundImage = 'url("' + url + '")'; D.body.appendChild(layer); };
  try{ c.toBlob(function(b){ put(b ? URL.createObjectURL(b) : c.toDataURL()); }); }catch(e){ put(c.toDataURL()); }
}

/* ---------- 3. Рельеф: горизонтали ---------- */
function noise2(seed){
  var r = rand(seed), P = 64, v = [];
  for(var i = 0; i < P*P; i++) v.push(r());
  function at(x, y){ x = ((x % P) + P) % P; y = ((y % P) + P) % P; return v[y*P + x]; }
  function sm(t){ return t*t*(3 - 2*t); }
  function vn(x, y){
    var xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    var a = at(xi, yi), b = at(xi+1, yi), c = at(xi, yi+1), d = at(xi+1, yi+1);
    return a + (b - a)*xf + (c - a)*yf + (a - b - c + d)*xf*yf;
  }
  return function(x, y){ return vn(x, y)*.6 + vn(x*2.1 + 17, y*2.1 + 9)*.28 + vn(x*4.3 + 3, y*4.3 + 31)*.12; };
}
function drawTopo(host){
  var layer = host.querySelector(':scope > .topo-layer');
  if(!layer){ layer = D.createElement('div'); layer.className = 'topo-layer'; layer.setAttribute('aria-hidden', 'true'); host.insertBefore(layer, host.firstChild); }
  var w = Math.round(host.clientWidth), h = Math.round(host.clientHeight);
  if(w < 50 || h < 50) return;
  if(layer._w === w && layer._h === h) return; layer._w = w; layer._h = h;
  var dpr = Math.min(W.devicePixelRatio || 1, 2), c = layer.querySelector('canvas') || layer.appendChild(D.createElement('canvas'));
  c.width = w*dpr; c.height = h*dpr; var g = c.getContext('2d'); if(!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  var seed = parseInt(host.getAttribute('data-topo'), 10) || 11, f = noise2(seed);
  var step = w < 700 ? 9 : 11, scale = 1/(w < 700 ? 150 : 230), cols = Math.ceil(w/step) + 1, rows = Math.ceil(h/step) + 1, F = new Float32Array(cols*rows);
  for(var j = 0; j < rows; j++) for(var i = 0; i < cols; i++) F[j*cols + i] = f(i*step*scale, j*step*scale);
  var levels = 14, lo = .22, hi = .78;
  for(var L = 0; L < levels; L++){
    var t = lo + (hi - lo)*L/(levels - 1), major = L % 5 === 2;
    g.strokeStyle = major ? 'rgba(15,23,34,.08)' : 'rgba(15,23,34,.045)';
    g.lineWidth = major ? .8 : .6;
    g.beginPath();
    for(var y = 0; y < rows - 1; y++) for(var x = 0; x < cols - 1; x++){
      var a = F[y*cols + x], b = F[y*cols + x + 1], cc = F[(y+1)*cols + x + 1], d = F[(y+1)*cols + x];
      var idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (cc > t ? 2 : 0) | (d > t ? 1 : 0);
      if(idx === 0 || idx === 15) continue;
      var X = x*step, Y = y*step;
      var top = [X + step*(t - a)/(b - a), Y], right = [X + step, Y + step*(t - b)/(cc - b)],
          bot = [X + step*(t - d)/(cc - d), Y + step], left = [X, Y + step*(t - a)/(d - a)];
      var segs;
      switch(idx){
        case 1: case 14: segs = [[left, bot]]; break;
        case 2: case 13: segs = [[bot, right]]; break;
        case 3: case 12: segs = [[left, right]]; break;
        case 4: case 11: segs = [[top, right]]; break;
        case 5: segs = [[left, top], [bot, right]]; break;
        case 6: case 9: segs = [[top, bot]]; break;
        case 7: case 8: segs = [[left, top]]; break;
        case 10: segs = [[left, bot], [top, right]]; break;
      }
      for(var s = 0; s < segs.length; s++){ g.moveTo(segs[s][0][0], segs[s][0][1]); g.lineTo(segs[s][1][0], segs[s][1][1]); }
    }
    g.stroke();
  }
}
function initTopo(){
  var hosts = D.querySelectorAll('[data-topo]'); if(!hosts.length) return;
  var run = function(){ Array.prototype.forEach.call(hosts, drawTopo); };
  run();
  var t = 0; W.addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(run, 200); });
  if(D.fonts && D.fonts.ready) D.fonts.ready.then(run);
}

/* ---------- 4. Проявление ---------- */
function initRise(){
  /* 27.10 (дизайн-слой, patches/motion.md п. 1): текст больше не прячется — мягко проявляются только картинки-виды и карты.
     Лесенка задержек и страховка 4 с убраны; заголовки .display не наблюдаются. */
  var auto = D.querySelectorAll('main .view, main .plate-map');
  Array.prototype.forEach.call(auto, function(el){ if(!el.closest('[data-module]')) el.classList.add('rise'); });
  var els = D.querySelectorAll('.rise');
  if(RM.matches || !('IntersectionObserver' in W)){ Array.prototype.forEach.call(els, function(el){ el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, {rootMargin:'0px 0px -6% 0px', threshold:.06});
  Array.prototype.forEach.call(els, function(el){ io.observe(el); });
}

/* ---------- 5–6. Параллакс видов и роза ---------- */
function initScrollBits(){
  var views = Array.prototype.slice.call(D.querySelectorAll('.view .view-img img, .plate-map:not(.plate-map--inset) .pm-img img'));
  var roses = Array.prototype.slice.call(D.querySelectorAll('.rose .rose-needle'));
  if(RM.matches || (!views.length && !roses.length)) return;
  var ticking = false, lastY = W.scrollY, turn = 0, settle = 0;
  function frame(){
    ticking = false;
    var vh = W.innerHeight, y = W.scrollY;
    views.forEach(function(img){
      var r = img.parentElement.getBoundingClientRect();
      if(r.bottom < -100 || r.top > vh + 100) return;
      var k = ((r.top + r.height/2) - vh/2) / (vh + r.height);   /* −0,5…0,5 */
      img.style.transform = 'translate3d(0,' + (k * -6).toFixed(2) + '%,0)';
    });
    if(roses.length){
      var dy = y - lastY; turn = Math.max(-14, Math.min(14, turn + dy*.08));
      roses.forEach(function(n){ n.style.setProperty('--rose-turn', turn.toFixed(1) + 'deg'); });
      clearTimeout(settle); settle = setTimeout(function(){ turn = 0; roses.forEach(function(n){ n.style.setProperty('--rose-turn', '0deg'); }); }, 380);
    }
    lastY = y;
  }
  W.addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(frame); } }, {passive:true});
  W.addEventListener('resize', frame);
  frame();
}

/* ---------- 7. Рамка атмосферы — в полях страницы ---------- */
function initFrame(){
  var probe = D.createElement('div'); probe.className = 'frame'; probe.style.cssText = 'position:absolute;visibility:hidden;height:0;left:0;right:0;top:0';
  D.body.appendChild(probe);
  function set(){
    var pl = parseFloat(getComputedStyle(probe).paddingLeft) || 0, vw = HTML.clientWidth;
    /* вертикаль стоит посередине поля: между краем окна и текстом */
    HTML.style.setProperty('--atmo-frame', Math.round(vw - pl) + 'px');
    if(W.Atmo && Atmo.refresh) Atmo.refresh();
  }
  set();
  var t = 0; W.addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(set, 180); });
}

/* ---------- 8. Живые картины .plate-alive ----------
   С 27.10 появление картин делает assets/design-layer.js (вариант I «Тихий масштаб», один раз за визит; решение Саши).
   Старая проявка (маска 30 раз в секунду, размытый подмалёвок) убрана — patches/motion.md, п. 2. */

/* картинки карточек тают в карточку, когда карточка въехала в экран */
function initMelt(){
  var els = D.querySelectorAll('.tile-view--melt'); if(!els.length) return;
  if(RM.matches || /[?&]pa-t=/.test(location.search) || !('IntersectionObserver' in W)){ Array.prototype.forEach.call(els, function(el){ el.style.transition = 'none'; el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, {threshold:.35});
  Array.prototype.forEach.call(els, function(el){ io.observe(el); });
}

function start(){
  initKB(); initPaper(); initTopo(); initRise(); initScrollBits(); initFrame(); initMelt();
}
if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
