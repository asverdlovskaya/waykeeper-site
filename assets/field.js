/* =====================================================================
   Waykeeper · field.js · живое поле на фоне страницы («омут памяти»)
   Без библиотек. Подключение: <script src="assets/field.js" defer></script>
   и затем Field.init({...}) — см. _template.html и README.md.

   Что делает:
   1. Поле мелких мягких знаков на фиксированном холсте за контентом.
      Формы поля привязаны к СТРАНИЦЕ, а не к окну: у каждой секции свои формы
      (место, размер, наклон — свои), они лежат на полях и в пустых местах
      и плывут вместе со страницей, чуть отставая (глубина). За формами — мягкий
      свет страницы (голубое небо, реже тёплый). Под текстом поле расступается.
   2. Поле расступается под текстом: [data-clear], .prose, h1–h4, p, li …
   3. Густота по зонам: data-field="dense|soft|off" (или число 0…1).
   4. Огонёк-линза за курсором — тихий и только в зонах dense.
   4а. Фоновые фрагменты [data-ghost]: по очереди мягко проступают и растворяются (без интеракции).
   5. Притяжения: data-attract="warm .35 34" (тон, сила, радиус в px).
   6. (опционально) Пул .pool: омут → поверхность → связи, свои метки, координаты будущего.
   7. (опционально) «Остановиться и увидеть»: [data-stop] + .pt (точки силы).
   Первый экран главной — без интеракции: только поле и [data-ghost].
   8. Находки хранятся в localStorage «waykeeper.marks»; [data-marks-clear] стирает.
   9. Картины [data-field-photo] (site-v2, 26.10): под картиной знаки проступают её силуэтом, у растворённых
      краёв остаются. Сила — CSS-переменная --field-k на элементе (0…1, по умолчанию .3); её меняет site-v2.js.
   ===================================================================== */
(function(global){
'use strict';

var doc = document, root = doc.documentElement;
function mq(q){ try{ return global.matchMedia(q).matches; }catch(e){ return false; } }
var RM = mq('(prefers-reduced-motion: reduce)');
var TOUCH = mq('(hover: none)');
var LOW = TOUCH || global.innerWidth < 760 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);

var DEFAULTS = {
  base: .4,                                    /* густота обычных секций: поле живое, но тихое; под текстом расступается */
  levels: {dense: .8, soft: .4, off: 0},       /* значения data-field */
  cell: 9,                                     /* шаг сетки знаков, px (на слабых — 11) */
  fps: 30,
  lens: .6,                                    /* сила огонька в режиме курсора «lens» */
  idleLens: true,                              /* пока мышь не двигали, огонёк тихо ходит у фото в пуле */
  partRadius: 80,                              /* радиус расступания в режиме курсора «part», px */
  /* Реакция на курсор задаётся ТОЛЬКО явно: data-field-cursor="none|part|lens" или data-hero-motion="…".
     Без атрибута поле на курсор не реагирует. Пул .pool по умолчанию — «lens». */
  ghostPeriod: 16,                             /* секунд на один «проступающий» фрагмент [data-ghost] */
  clearSelector: '[data-clear], .prose, main h1, main h2, main h3, main h4, main p, main li, main blockquote, main dt, main dd, main summary, main label, main figcaption, main .t3, main .lead, main .small, main .note, main .btn, main input, main textarea, [data-module], .site-head a, .site-head button, .site-foot p, .site-foot a',
  clears: [],                                  /* доп. селекторы/элементы, под которыми поле расступается */
  zones: [],                                   /* доп. зоны: [{el|selector, k}] */
  clearPad: [10, 8],
  clearFall: 64,                               /* мягкость края расступания, px */
  zoneFall: 90,
  hoverAttract: '[data-attract-hover]',        /* под этими элементами при наведении поле сгущается (по умолчанию — нигде) */
  storageKey: 'waykeeper.marks',
  blobs: null,                                 /* свои формы ПЕРВОГО ЭКРАНА (доли первого экрана, см. BLOBS). Если заданы —
                                                  автоматических форм в первом экране (.hero) нет: страница рисует его сама.
                                                  blobs:false (или <body data-field-blobs="off">) — фоновые формы выключены:
                                                  нет форм обычных секций, света и пыли; знаки остаются только в «моментах»
                                                  (data-field="dense" или число ≥ .4), у меток, [data-attract], [data-ghost], в пуле */
  parallax: .35,                               /* насколько формы из blobs отстают от прокрутки (0 — висят в окне, 1 — едут со страницей) */
  forms: true,                                 /* автоматические формы в каждой секции <main> и в зонах data-field ≥ .4 */
  formsDepth: .9,                              /* формы секций едут со страницей чуть медленнее текста (глубина) */
  light: true,                                 /* мягкий свет за формами: голубое небо, реже тёплый */
  glassFloor: .45,                             /* под стеклом (.glass) поле не исчезает, а просвечивает размытым */
  dust: .12                                    /* редкая пыль между формами, чтобы фон не был пустым */
};

/* Пример формата blobs (Field.init({blobs:[…]})): доли ПЕРВОГО экрана; при прокрутке формы уезжают
   вверх медленнее страницы (parallax). По умолчанию не используются: формы секций строятся сами. */
var BLOBS_EXAMPLE = [
  {ax:.70, ay:.30, rx:.16, ry:.10, sx:.20, sy:.07, sp:.045, ph:0.0, a:.36, rot:-.5},
  {ax:.18, ay:.78, rx:.12, ry:.08, sx:.15, sy:.06, sp:.035, ph:2.1, a:.30, rot:.6},
  {ax:.86, ay:.80, rx:.08, ry:.12, sx:.07, sy:.18, sp:.040, ph:4.2, a:.28, rot:.2}
];
/* потоки материала внутри пула (доли пула) */
var POOL_STROKES = [
  {p:[[.60,.10],[.97,.16],[.95,.50]], a:.62, w:24},
  {p:[[.02,.98],[.18,.74],[.42,.70]], a:.55, w:20},
  {p:[[.13,.13],[.01,.30],[.10,.50]], a:.45, w:16}
];

var O = null, started = false;
var cv, ctx, W = 0, H = 0, DPR = 1, C = 9, atlas = null, ATL = 9;
var INK = [15,23,34], WARM = [234,95,34];
var t0 = 0, tFrozen = 6, frames = 0, last = 0, raf = 0, need = true;
var lens = {x:-1e4, y:-1e4, a:0, mode:'none'};

/* ---------- режимы реакции на курсор (расширяемо: Field.defineCursor) ----------
   fn(d, L, n) → новая густота клетки; L — сила курсора в клетке 0…1, n — шум 0…1.
   warm: true — в самой густой части знаки теплеют (огонёк). glow: тёплое свечение фона. */
var CURSORS = {
  none: null,
  /* огонёк: поле сгущается и теплеет вокруг курсора */
  lens: {radius:120, glow:true, warm:true, fn:function(d, L, n){ return d*(1 + 1.1*L) + .26*L*n; }},
  /* расступается: вокруг курсора поле мягко разрежается, без света и подсказок */
  part: {radius:80, glow:false, warm:false, fn:function(d, L){ return d*(1 - .92*L); }}
};
/* ---------- режимы первого экрана (расширяемо: Field.defineMotion) ----------
   data-hero-motion="calm|part|lens" на секции. cursor — режим курсора, ghosts — крутить [data-ghost] внутри. */
var MOTIONS = {
  calm: {cursor:'none', ghosts:true},     /* медленно живёт, один фрагмент проступает и растворяется */
  part: {cursor:'part', ghosts:true},     /* + поле расступается под курсором */
  lens: {cursor:'lens', ghosts:true}      /* + огонёк (как в скетче v3) */
};
var P = {x:-1e4, y:-1e4, seen:false, inWin:false};
var SCAN = {on:false, sticky:false, t:0, at:0, suppress:false, stop:null};
var pools = [], stops = [], ghosts = [], photos = [];
var staticClears = [], liveClears = [], staticZones = [], measuredAt = 0, dirty = true;
var hosts = [], forms = [], glows = [], formsSig = '';
var perf = {sum:0, n:0};

/* ---------- утилиты ---------- */
function hash(i,j,k){ var h = Math.sin(i*127.1 + j*311.7 + k*74.7)*43758.5453; return h - Math.floor(h); }
function smooth(e0,e1,x){ var t = (x-e0)/(e1-e0); t = t < 0 ? 0 : t > 1 ? 1 : t; return t*t*(3-2*t); }
function each(list, fn){ Array.prototype.forEach.call(list, fn); }
function $$(sel, ctx2){ return Array.prototype.slice.call((ctx2||doc).querySelectorAll(sel)); }
function pageKey(){ var p = location.pathname.split('/').pop(); return p || 'index.html'; }

/* ---------- хранилище находок ---------- */
var Store = {
  read: function(){
    try{ var s = global.localStorage.getItem(O.storageKey); var v = s ? JSON.parse(s) : null; return (v && v.items) ? v : {v:1, items:{}}; }
    catch(e){ return {v:1, items:{}}; }
  },
  get: function(key){ var v = Store.read().items[pageKey()+'|'+key]; return Array.isArray(v) ? v : []; },
  set: function(key, val){
    try{
      var all = Store.read(); var k = pageKey()+'|'+key;
      if(val && val.length) all.items[k] = val; else delete all.items[k];
      if(Object.keys(all.items).length) global.localStorage.setItem(O.storageKey, JSON.stringify(all));
      else global.localStorage.removeItem(O.storageKey);
    }catch(e){}
    Store.sync();
  },
  any: function(){ return Object.keys(Store.read().items).length > 0; },
  clear: function(){ try{ global.localStorage.removeItem(O.storageKey); }catch(e){} Store.sync(); },
  sync: function(){ var has = Store.any(); each(doc.querySelectorAll('[data-marks-clear]'), function(b){ b.hidden = !has; }); }
};

/* ---------- атлас знаков: мягкие точки, кольца, редкий «пиксель» ---------- */
/* строки: 0 — тёмные чёткие, 1 — тёмные мягкие, 2 — тёплые чёткие, 3 — тёплые мягкие */
var ALPHA = [.15,.19,.23,.26,.30,.35,.40,.46];
function buildAtlas(){
  var s = ATL = Math.round(C*DPR);
  atlas = doc.createElement('canvas'); atlas.width = s*8; atlas.height = s*4;
  var a = atlas.getContext('2d'), u = DPR;
  for(var row=0; row<4; row++){
    var warm = row >= 2, soft = row % 2 === 1, c = warm ? WARM : INK;
    for(var l=0; l<8; l++){
      var cx = l*s + s/2, cy = row*s + s/2, al = Math.min(1, ALPHA[l]*(warm?1.35:1));
      var col = 'rgba('+c[0]+','+c[1]+','+c[2]+',';
      if(soft){
        /* мягкий знак: размытый диск, радиус растёт с уровнем */
        var R = (1.1 + l*.36)*u + 1.1*u;
        var g = a.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, col+(al*.95)+')'); g.addColorStop(.45, col+(al*.55)+')'); g.addColorStop(1, col+'0)');
        a.fillStyle = g; a.beginPath(); a.arc(cx, cy, R, 0, 6.2832); a.fill();
        continue;
      }
      a.fillStyle = a.strokeStyle = col+al+')'; a.lineWidth = .8*u;
      a.beginPath();
      if(l===0){ a.arc(cx, cy, .55*u, 0, 6.2832); a.fill(); }
      else if(l===1){ a.arc(cx, cy, .8*u, 0, 6.2832); a.fill(); }
      else if(l===2){ a.arc(cx, cy, 1.05*u, 0, 6.2832); a.fill(); }
      else if(l===3){ a.fillRect(cx-.8*u, cy-.8*u, 1.6*u, 1.6*u); }            /* единственный «пиксель» */
      else if(l===4){ a.arc(cx, cy, 1.9*u, 0, 6.2832); a.stroke(); }
      else if(l===5){ a.arc(cx, cy, 1.5*u, 0, 6.2832); a.fill(); }
      else if(l===6){ a.arc(cx, cy, 2.4*u, 0, 6.2832); a.stroke(); a.beginPath(); a.arc(cx, cy, .7*u, 0, 6.2832); a.fill(); }
      else { a.arc(cx, cy, 2.1*u, 0, 6.2832); a.fill(); }
    }
  }
}

/* ---------- размеры ---------- */
function resize(){
  DPR = Math.min(global.devicePixelRatio || 1, LOW ? 1.5 : 2);
  W = global.innerWidth; H = global.innerHeight;
  C = O.cell + (LOW ? 2 : 0) + (W < 760 ? -1 : 0);
  if(C < 7) C = 7;
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  buildAtlas(); dirty = true;
  pools.forEach(function(p){ p.layout(); });
  stops.forEach(function(s){ s.drawRays(false); });
  poke();
}

/* ---------- замеры: что расступается и где зоны ---------- */
function isLive(el){ return !!(el.closest('.pool') || el.getAttribute('data-clear') === 'live'); }
function collect(){
  var sel = O.clearSelector, extra = O.clears || [];
  var list = $$(sel);
  extra.forEach(function(x){ if(typeof x === 'string') list = list.concat($$(x)); else if(x && x.nodeType === 1) list.push(x); });
  staticClears = []; liveClears = [];
  var seen = new Set();
  list.forEach(function(el){
    if(seen.has(el)) return; seen.add(el);
    if(el.closest('.field-ignore')) return;
    var inPool = el.closest('.pool');
    if(inPool && !el.hasAttribute('data-clear')) return;          /* слова и фото пула — часть поля */
    if(isLive(el)) liveClears.push(el); else staticClears.push({el:el, l:0, t:0, r:0, b:0, fl:(el.classList.contains('glass') ? O.glassFloor : .03)});
  });
  staticZones = [];
  $$('[data-field], [data-hero-motion], [data-field-cursor]').forEach(function(el){
    staticZones.push({el:el, k:el.hasAttribute('data-field') ? zoneValue(el.getAttribute('data-field')) : null, cur:cursorOf(el), l:0,t:0,r:0,b:0});
  });
  (O.zones || []).forEach(function(z){
    var els = typeof z.el === 'string' ? $$(z.el) : (z.el ? [z.el] : []);
    els.forEach(function(el){ staticZones.push({el:el, k:+z.k, l:0,t:0,r:0,b:0}); });
  });
  /* хозяева форм: каждая секция <main> и зоны data-field ≥ .4 */
  hosts = []; formsSig = '';
  var quiet = blobsOff();
  if(O.forms !== false){
    var hs = $$('main section, main [data-field], [data-field-forms]'), seenH = new Set();
    hs.forEach(function(el, i){
      if(seenH.has(el)) return; seenH.add(el);
      if(el.getAttribute('data-field-forms') === 'none' || el.closest('.pool, .site-foot, .field-ignore')) return;
      if(Array.isArray(O.blobs) && el.closest('.hero')) return;                      /* первый экран со своими формами */
      var v = el.getAttribute('data-field'), k = v == null ? null : zoneValue(v);
      if(k === 0) return;                                              /* off: поля нет совсем */
      if((quiet || el.tagName !== 'SECTION') && !el.hasAttribute('data-field-forms') && !(k >= .4)) return;
      hosts.push({el:el, k:k, dense:v === 'dense' || k >= .6, seed:hosts.length + 1, l:0, t:0, r:0, b:0});
    });
  }
  dirty = false; measure();
}
function cursorOf(el){
  var c = el.getAttribute('data-field-cursor');
  if(c && c in CURSORS) return c;
  var m = MOTIONS[el.getAttribute('data-hero-motion')];
  return m ? m.cursor : null;
}
function zoneValue(v){ if(v in O.levels) return O.levels[v]; var n = parseFloat(v); return isNaN(n) ? O.base : n; }
function measure(){
  var sx = global.scrollX, sy = global.scrollY;
  function m(o){ var r = o.el.getBoundingClientRect(); o.l = r.left+sx; o.r = r.right+sx; o.t = r.top+sy; o.b = r.bottom+sy; o.z = r.width === 0 && r.height === 0; }
  staticClears.forEach(m); staticZones.forEach(m); hosts.forEach(m);
  measuredAt = performance.now();
  layoutForms();
}

/* ---------- формы секций: в пустых местах страницы, у каждой секции свои ---------- */
function freeAt(x, y, list){
  var best = 1e9;
  for(var i=0; i<list.length; i++){
    var o = list[i], dx = Math.max(o.l - x, 0, x - o.r), dy = Math.max(o.t - y, 0, y - o.b);
    var dd = dx*dx + dy*dy; if(dd < best) best = dd;
  }
  return Math.sqrt(best);
}
function blobsOff(){ return O.blobs === false || (doc.body && doc.body.getAttribute('data-field-blobs') === 'off'); }
function layoutForms(){
  var sig = W + '|' + root.scrollHeight + '|' + hosts.map(function(h){ return Math.round(h.t) + ':' + Math.round(h.b - h.t); }).join(',');
  if(sig === formsSig) return;
  formsSig = sig; forms = []; glows = [];
  var lastSide = 0, mob = W < 760;
  hosts.forEach(function(hs, hi){
    if(hs.z) return;
    var h = hs.b - hs.t; if(h < 60) return;
    var L = Math.max(0, hs.l), R = Math.min(W, hs.r); if(R - L < 120) return;
    var near = staticClears.filter(function(o){ return !o.z && o.fl < .1 && o.b > hs.t - 200 && o.t < hs.b + 200; });
    var n = Math.max(1, Math.min(3, Math.round(h/560))) + (hs.dense ? 1 : 0);
    if(LOW) n = Math.min(n, 2);
    var cols = mob ? 5 : 9, rows = Math.max(3, Math.min(14, Math.round(h/90))), cand = [];
    for(var j=0; j<rows; j++) for(var i=0; i<cols; i++){
      var x = L + (i + .5 + (hash(i, j, hs.seed) - .5)*.6)*(R - L)/cols, y = hs.t + (j + .5)*h/rows;
      var D = Math.min(freeAt(x, y, near), mob ? 120 : 240);
      var side = x < W/2 ? -1 : 1;
      var sc = (D + 30)*(.45 + 1.1*hash(i*7 + 3, j*5 + 1, hs.seed*13)) * (lastSide && side !== lastSide ? 1.3 : 1);
      cand.push({x:x, y:y, D:D, sc:sc, side:side});
    }
    cand.sort(function(a, b){ return b.sc - a.sc; });
    var chosen = [];
    for(var c=0; c<cand.length && chosen.length < n; c++){
      var C0 = cand[c], ok = true;
      for(var q=0; q<chosen.length; q++) if(Math.hypot(C0.x - chosen[q].x, C0.y - chosen[q].y) < (mob ? 180 : 300)) ok = false;
      if(ok) chosen.push(C0);
    }
    if(chosen.length) lastSide = chosen[0].side;
    chosen.forEach(function(C0, ci){
      var r1 = hash(hs.seed, ci, 31), r2 = hash(ci, hs.seed, 37), r3 = hash(hs.seed*3, ci*5, 41);
      var big = mob ? 150 : 270, sx = Math.max(mob ? 46 : 70, Math.min(big, C0.D*.75 + 50 + 60*r1));
      var sy = sx*(.28 + .32*r2), rot = (r3 - .5)*1.9, sp = .028 + .03*r1, ph = r2*6.28;
      var a = (hs.dense ? .62 : .56)*(.85 + .3*r3);
      var stream = !mob && r1 > .62;                      /* «поток»: цепочка из трёх форм по дуге */
      if(stream){
        var ca = Math.cos(rot), sa = Math.sin(rot), step = sx*.9;
        for(var s3=-1; s3<=1; s3++){
          var bend = s3*s3*sy*.8*(r2 > .5 ? 1 : -1);
          forms.push({x:C0.x + s3*step*ca - bend*sa, y:C0.y + s3*step*sa + bend*ca, sx:sx*(.55 - .12*Math.abs(s3)), sy:sy*.6, rot:rot + s3*.35, a:a*(1 - .2*Math.abs(s3)), sp:sp, ph:ph + s3*.4, dr:.14});
        }
      } else forms.push({x:C0.x, y:C0.y, sx:sx, sy:sy, rot:rot, a:a, sp:sp, ph:ph, dr:.2});
      if(O.light && ci === 0 && !blobsOff()){
        var warm = hs.dense ? r3 > .45 : r3 > .82;           /* обычно голубое небо, в моментах чаще тёплый свет */
        glows.push({x:C0.x, y:C0.y, r:(mob ? 300 : 520)*(.8 + .4*r2), warm:warm, a:(hs.dense ? 1 : .8)*(warm ? .16 : .3), ph:ph});
      }
    });
  });
}
var mTimer = 0;
function remeasureSoon(full){ if(full) dirty = true; clearTimeout(mTimer); mTimer = setTimeout(function(){ if(dirty) collect(); else measure(); poke(); }, 60); }

/* ---------- маски фрагментов (под водой) ---------- */
function maskFromImage(img, w, h){
  try{
    var c = doc.createElement('canvas'); c.width = w; c.height = h; var a = c.getContext('2d');
    a.drawImage(img, 0, 0, w, h); var px = a.getImageData(0, 0, w, h).data, d = new Float32Array(w*h);
    for(var k=0; k<w*h; k++){
      var lum = (px[k*4]*.3 + px[k*4+1]*.59 + px[k*4+2]*.11)/255;
      var dk = Math.max(0, Math.min(1, (1-lum-.18)*1.5));
      var xx = (k%w)/w-.5, yy = Math.floor(k/w)/h-.5, rr = Math.sqrt(xx*xx*3.2+yy*yy*3.2);
      d[k] = dk*Math.max(0, Math.min(1, (1-rr)*1.6));
    }
    return {w:w, h:h, d:d};
  }catch(e){
    /* файл открыт с диска (file://): браузер не даёт читать пиксели — мягкое пятно вместо снимка */
    return maskSpot(w, h);
  }
}
function maskEllipse(w, h){ var d = new Float32Array(w*h); for(var y=0;y<h;y++) for(var x=0;x<w;x++){ var u=(x+.5)/w*2-1, v=(y+.5)/h*2-1; d[y*w+x] = Math.max(0, 1-(u*u+v*v)); } return {w:w,h:h,d:d}; }
function maskSpot(w, h){ var d = new Float32Array(w*h); for(var y=0;y<h;y++) for(var x=0;x<w;x++){ var u=(x+.5)/w*2-1, v=(y+.5)/h*2-1, e = Math.max(0, 1-(u*u+v*v)*1.1); d[y*w+x] = e*(.45 + .55*hash(x,y,9)) * (y > h*.55 ? 1 : .7); } return {w:w,h:h,d:d}; }

/* =====================================================================
   РИСОВАНИЕ
   ===================================================================== */
var ZF = null, KF = null, gridCols = 0, gridRows = 0;
function draw(){
  var tStart = performance.now();
  var t = RM ? tFrozen : SCAN.on ? SCAN.t : (tStart - t0)/1000;
  var sY = global.scrollY;
  if(dirty) collect(); else if(tStart - measuredAt > 700) measure();

  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, cv.width, cv.height);

  /* мягкий тёплый свет под линзой — огонёк на задней части страницы */
  var CUR = CURSORS[lens.mode] || null, R2 = CUR ? 1/(2*CUR.radius*CUR.radius) : 0;
  if(CUR && CUR.glow && lens.a > .02){
    var g = ctx.createRadialGradient(lens.x*DPR, lens.y*DPR, 0, lens.x*DPR, lens.y*DPR, 240*DPR);
    g.addColorStop(0, 'rgba(255,178,127,'+(.10*lens.a)+')'); g.addColorStop(1, 'rgba(255,178,127,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  }

  /* свет страницы: большие мягкие пятна неба (реже тёплые) за формами секций; едут со страницей, глубже форм */
  for(var gi=0; gi<glows.length; gi++){
    var G = glows[gi], gy = H/2 + (G.y - sY - H/2)*.8 + 30*Math.cos(t*.03 + G.ph), gx = G.x + 40*Math.sin(t*.025 + G.ph);
    if(gy < -G.r || gy > H + G.r) continue;
    var gg = ctx.createRadialGradient(gx*DPR, gy*DPR, 0, gx*DPR, gy*DPR, G.r*DPR), col = G.warm ? '255,178,127,' : '169,193,238,';
    gg.addColorStop(0, 'rgba(' + col + G.a + ')'); gg.addColorStop(.55, 'rgba(' + col + (G.a*.35) + ')'); gg.addColorStop(1, 'rgba(' + col + '0)');
    ctx.fillStyle = gg; ctx.fillRect((gx - G.r)*DPR, (gy - G.r)*DPR, 2*G.r*DPR, 2*G.r*DPR);
  }

  /* сетка привязана к документу: знаки едут вместе со страницей, без мерцания */
  var j0 = Math.floor(sY / C), off = sY - j0*C;
  var cols = Math.ceil(W / C) + 1, rows = Math.ceil(H / C) + 2, N = cols*rows;
  if(!ZF || gridCols !== cols || gridRows !== rows){ ZF = new Float32Array(N); KF = new Float32Array(N); gridCols = cols; gridRows = rows; }
  ZF.fill(O.base); KF.fill(1);
  function cellY(j){ return j*C - off + C/2; }

  /* зоны густоты: в порядке документа, вложенная перекрывает внешнюю */
  function applyZone(l, tp, r, b, k, fall){
    if(b < -fall || tp > H + fall) return;
    var i0 = Math.max(0, Math.floor((l - fall)/C)), i1 = Math.min(cols-1, Math.ceil((r + fall)/C));
    var jA = Math.max(0, Math.floor((tp - fall + off)/C) - 1), jB = Math.min(rows-1, Math.ceil((b + fall + off)/C));
    for(var j=jA; j<=jB; j++){
      var y = cellY(j), dy = Math.max(tp - y, 0, y - b);
      for(var i=i0; i<=i1; i++){
        var x = i*C + C/2, dx = Math.max(l - x, 0, x - r), dist = dy || dx ? Math.sqrt(dx*dx + dy*dy) : 0;
        var w = 1 - smooth(0, fall, dist); if(w <= 0) continue;
        var idx = j*cols + i; ZF[idx] += (k - ZF[idx])*w;
      }
    }
  }
  for(var z=0; z<staticZones.length; z++){ var Z = staticZones[z]; if(Z.z || Z.k == null) continue; applyZone(Z.l, Z.t - sY, Z.r, Z.b - sY, Z.k, O.zoneFall); }
  var futs = [];
  pools.forEach(function(p){
    var r = p.el.getBoundingClientRect(); p.rect = r;
    if(r.bottom < -200 || r.top > H + 200) return;
    applyZone(r.left, r.top, r.right, r.bottom, p.zone, O.zoneFall);
    if(p.future){ var fx = r.left + p.future*r.width; futs.push({x0:fx-40, x1:fx+90, t:r.top-60, b:r.bottom+60}); }
  });

  /* под текстом поле расступается */
  var px = O.clearPad[0], py = O.clearPad[1], fall = O.clearFall;
  function applyClear(l, tp, r, b, fl){
    l -= px; r += px; tp -= py; b += py;
    if(b < -fall || tp > H + fall || r < -fall || l > W + fall) return;
    var i0 = Math.max(0, Math.floor((l - fall)/C)), i1 = Math.min(cols-1, Math.ceil((r + fall)/C));
    var jA = Math.max(0, Math.floor((tp - fall + off)/C) - 1), jB = Math.min(rows-1, Math.ceil((b + fall + off)/C));
    for(var j=jA; j<=jB; j++){
      var y = cellY(j), dy = Math.max(tp - y, 0, y - b);
      for(var i=i0; i<=i1; i++){
        var x = i*C + C/2, dx = Math.max(l - x, 0, x - r);
        var dist = dy || dx ? Math.sqrt(dx*dx + dy*dy) : 0; if(dist >= fall) continue;
        KF[j*cols + i] *= fl + (1 - fl)*smooth(0, fall, dist);
      }
    }
  }
  for(var c=0; c<staticClears.length; c++){ var K = staticClears[c]; if(K.z) continue; applyClear(K.l, K.t - sY, K.r, K.b - sY, K.fl); }
  for(var c2=0; c2<liveClears.length; c2++){
    var el = liveClears[c2]; if(!el.isConnected) continue;
    var lr = el.getBoundingClientRect(); if(lr.width === 0 && lr.height === 0) continue;
    if(el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
    if(+getComputedStyle(el).opacity < .05) continue;
    applyClear(lr.left, lr.top, lr.right, lr.bottom, .03);
  }

  /* притяжения: «ты здесь», наведённая карточка, отмеченная неделя */
  var atts = [];
  each(doc.querySelectorAll('[data-attract]'), function(el){
    var r = el.getBoundingClientRect(); if(r.bottom < -300 || r.top > H + 300) return;
    var p = el.getAttribute('data-attract').split(/\s+/);
    atts.push({x:r.left + r.width/2, y:r.top + r.height/2, warm:p[0] === 'warm', a:parseFloat(p[1]) || .4, s:parseFloat(p[2]) || 40});
  });
  /* фрагменты под водой проступают знаками */
  var masks = [];
  pools.forEach(function(p){ p.frags.forEach(function(f){
    if(f.up || !f.mask || f.el.classList.contains('scan')) return;
    var r = f.el.getBoundingClientRect(); if(r.bottom < 0 || r.top > H) return;
    var pad = f.kind === 'photo' ? 8 : 26;
    masks.push({l:r.left-pad, t:r.top-pad, w:r.width+2*pad, h:r.height+2*pad, m:f.mask, k:(f.kind === 'photo' ? 1 : .42)*(1 - f.r*.9)});
  }); });
  /* фоновые фрагменты: по очереди проступают и растворяются */
  ghosts.forEach(function(gh){
    if(!gh.mask) return;
    var r = gh.el.getBoundingClientRect(); if(r.bottom < 0 || r.top > H || r.width === 0) return;
    var pad = gh.kind === 'photo' ? 10 : 26;
    masks.push({l:r.left-pad, t:r.top-pad, w:r.width+2*pad, h:r.height+2*pad, m:gh.mask, k:(gh.kind === 'photo' ? 1 : .5)*(.22 + .78*gh.s)});
  });
  /* картины [data-field-photo]: силуэт знаками под листом и у его краёв */
  photos.forEach(function(ph){
    if(!ph.mask) return;
    var r = ph.el.getBoundingClientRect(); if(r.bottom < -40 || r.top > H + 40 || r.width === 0) return;
    var kk = parseFloat(ph.el.style.getPropertyValue('--field-k')); if(isNaN(kk)) kk = .3; if(kk < .01) return;
    var pad = Math.min(60, r.width*.1);
    masks.push({l:r.left-pad, t:r.top-pad, w:r.width+2*pad, h:r.height+2*pad, m:ph.mask, k:kk});
  });
  /* потоки материала в пулах */
  var strokes = [];
  pools.forEach(function(pl){
    var pr = pl.rect; if(!pr || pr.bottom < 0 || pr.top > H || !pl.strokes) return;
    pl.strokes.forEach(function(S, si){
      var pts = S.p.map(function(q, qi){ return [pr.left + (q[0] + .018*Math.sin(t*.21 + si*2 + qi))*pr.width, pr.top + (q[1] + .018*Math.cos(t*.17 + si + qi*1.7))*pr.height]; });
      var smp = [], l = 1e9, tt = 1e9, rr = -1e9, bb = -1e9;
      for(var k=0; k<=18; k++){
        var u = k/18, a = (1-u)*(1-u), b = 2*(1-u)*u, cc = u*u;
        var x = a*pts[0][0] + b*pts[1][0] + cc*pts[2][0], y = a*pts[0][1] + b*pts[1][1] + cc*pts[2][1];
        var w = S.w*(.35 + .9*Math.sin(Math.PI*u));
        smp.push([x, y, 1/(2*w*w)]); l = Math.min(l, x-3*S.w); rr = Math.max(rr, x+3*S.w); tt = Math.min(tt, y-3*S.w); bb = Math.max(bb, y+3*S.w);
      }
      strokes.push({s:smp, a:S.a, l:l, r:rr, t:tt, b:bb});
    });
  });

  var Hs = Math.min(H, 1000), Ws = Math.max(Math.min(W, 1600), 700);
  /* формы первого экрана от страницы (blobs): привязаны к началу страницы, при прокрутке отстают (parallax) */
  var blobDefs = Array.isArray(O.blobs) ? O.blobs : []; if(LOW) blobDefs = blobDefs.slice(0, 2);
  var blobs = [];
  blobDefs.forEach(function(b){
    var cx = W*(b.ax + b.rx*Math.sin(t*b.sp + b.ph)), cy = Hs*(b.ay + b.ry*Math.cos(t*b.sp*1.3 + b.ph)) + (H > Hs ? b.ay*(H-Hs) : 0) - sY*O.parallax;
    var rot = b.rot + .25*Math.sin(t*b.sp*.7 + b.ph), sx = Ws*b.sx, sy = Hs*b.sy*1.4, lim = 3*Math.max(sx, sy);
    if(cy < -lim || cy > H + lim) return;
    blobs.push({cx:cx, cy:cy, c:Math.cos(rot), s:Math.sin(rot), ix:1/(2*sx*sx), iy:1/(2*sy*sy), a:b.a, lim:lim});
  });
  /* формы секций: привязаны к странице, медленно дышат на месте */
  for(var fi=0; fi<forms.length; fi++){
    var F = forms[fi], fl = 3*Math.max(F.sx, F.sy);
    var fy = H/2 + (F.y - sY - H/2)*O.formsDepth + F.sy*F.dr*2*Math.cos(t*F.sp*1.3 + F.ph);
    if(fy < -fl || fy > H + fl) continue;
    var fx = F.x + F.sx*F.dr*Math.sin(t*F.sp + F.ph), fr = F.rot + .18*Math.sin(t*F.sp*.7 + F.ph);
    blobs.push({cx:fx, cy:fy, c:Math.cos(fr), s:Math.sin(fr), ix:1/(2*F.sx*F.sx), iy:1/(2*F.sy*F.sy), a:F.a, lim:fl});
  }
  var dust = blobsOff() ? 0 : (O.dust || 0);

  var s = ATL, half = s/2, tk = Math.floor(t*.9);
  for(var j=0; j<rows; j++){
    var y = cellY(j), dj = j + j0, Yd = y + sY;
    if(y < -C || y > H + C) continue;
    for(var i=0; i<cols; i++){
      var idx = j*cols + i, base = ZF[idx]*KF[idx];
      if(base < .012) continue;                                /* текст, зона «off» — пропускаем сразу */
      var x = i*C + C/2;
      var n = (Math.sin(x*.019 + t*.16) + Math.sin(Yd*.016 - t*.12) + Math.sin((x+Yd)*.009 + t*.07))/6 + .5;
      var d = 0;
      for(var bi=0; bi<blobs.length; bi++){
        var B = blobs[bi], dx = x-B.cx, dy = y-B.cy;
        if(dx > B.lim || dx < -B.lim || dy > B.lim || dy < -B.lim) continue;
        var uu = dx*B.c + dy*B.s, vv = -dx*B.s + dy*B.c;
        d += B.a*Math.exp(-(uu*uu*B.ix + vv*vv*B.iy));
      }
      d *= (.25 + 1.05*n);
      if(dust) d += dust*smooth(.58, .9, n);
      for(var st=0; st<strokes.length; st++){
        var Sx = strokes[st]; if(x < Sx.l || x > Sx.r || y < Sx.t || y > Sx.b) continue;
        var best = 0;
        for(var k2=0; k2<Sx.s.length; k2++){ var q = Sx.s[k2], ex = x-q[0], ey = y-q[1], ve = Math.exp(-(ex*ex+ey*ey)*q[2]); if(ve > best) best = ve; }
        d += Sx.a*best*(.45 + .75*n);
      }
      var inM = false;
      for(var mm=0; mm<masks.length; mm++){
        var M = masks[mm];
        if(x >= M.l && x < M.l+M.w && y >= M.t && y < M.t+M.h){ inM = true;
          var mx = Math.floor((x-M.l)/M.w*M.m.w), my = Math.floor((y-M.t)/M.h*M.m.h);
          d += M.m.d[my*M.m.w + mx]*M.k*(.7 + .45*n);
        }
      }
      for(var fu=0; fu<futs.length; fu++){ var F = futs[fu]; if(y > F.t && y < F.b && x > F.x0) d *= 1 - .97*smooth(F.x0, F.x1, x); }
      var warmA = 0;
      for(var q2=0; q2<atts.length; q2++){
        var A = atts[q2], ax = x-A.x, ay = y-A.y, ad = A.a*Math.exp(-(ax*ax + ay*ay)/(2*A.s*A.s));
        d += ad*(.4 + .9*n); if(A.warm) warmA += ad;
      }
      var L = 0;
      if(CUR && lens.a > .01){ var lx = x-lens.x, ly = y-lens.y; L = lens.a*Math.exp(-(lx*lx + ly*ly)*R2); d = CUR.fn(d, L, n); if(!CUR.warm) L = 0; }
      d *= base;

      /* смещение внутри клетки: знаки не стоят строем */
      var ox = (hash(i, dj, 11) - .5)*.62*C, oy = (hash(dj, i, 13) - .5)*.62*C;
      var gx = (x + ox)*DPR - half, gy = (y + oy)*DPR - half;
      if(d < .07){
        if(d > .012 && hash(i, dj, tk) < d*1.6) ctx.drawImage(atlas, hash(i,dj,5) < .5 ? 0 : s, s, s, s, gx, gy, s, s);
        continue;
      }
      var jit = (hash(i, dj, Math.floor(t*.7 + hash(dj, i, 3)*5)) - .5)*.5;
      var lvl = Math.floor(d*(1 + jit)*8.5); if(lvl < 0) lvl = 0; if(lvl > 7) lvl = 7;
      if(hash(dj, i, tk + 7) > .55 + d) continue;            /* распад на точки */
      var warm = (!inM && L > .55 && d > .45) || (warmA > .22 && d > .3) ? 1 : 0;
      if(warm && lvl > 4) lvl = 4;
      var soft = (d < .3 || hash(i, dj, 17) < .24) ? 1 : 0;  /* края форм — размытые знаки */
      ctx.drawImage(atlas, lvl*s, (warm*2 + soft)*s, s, s, gx, gy, s, s);
    }
  }

  /* слабое устройство: если кадр дорогой — крупнее клетка */
  var dt = performance.now() - tStart; perf.sum += dt; perf.n++;
  if(perf.n >= 24){ if(perf.sum/perf.n > 16 && C < 14){ C++; buildAtlas(); } perf.sum = 0; perf.n = 0; }
}

/* =====================================================================
   ПУЛ: омут → поверхность → связи
   ===================================================================== */
function Pool(el, index){
  var self = this;
  this.el = el; this.index = index;
  this.id = el.id || el.getAttribute('data-pool') || ('pool' + index);
  this.zone = parseFloat(el.getAttribute('data-zone') || '1');
  this.cursor = (el.getAttribute('data-field-cursor') in CURSORS) ? el.getAttribute('data-field-cursor') : 'lens';
  this.future = el.hasAttribute('data-future') ? parseFloat(el.getAttribute('data-future')) : 0;
  var sd = el.getAttribute('data-strokes');
  this.strokes = sd === 'none' ? null : (sd ? safeJSON(sd, POOL_STROKES) : POOL_STROKES);
  this.svg = el.querySelector('svg.links');
  if(!this.svg){ this.svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.svg.setAttribute('class', 'links'); this.svg.setAttribute('aria-hidden', 'true'); el.insertBefore(this.svg, el.firstChild); }
  this.cross = el.querySelector('.cross') || mk('span', 'cross', el);
  this.hint = el.querySelector('.pool-hint') || mk('span', 'pool-hint', el);
  this.cross.setAttribute('aria-hidden', 'true'); this.hint.setAttribute('aria-hidden', 'true');
  this.frags = $$('.frag', el).map(function(f, i){
    var up = f.classList.contains('up');
    if(!f.getAttribute('tabindex') && f.tagName !== 'BUTTON') f.setAttribute('tabindex', '0');
    if(f.tagName !== 'BUTTON') f.setAttribute('role', 'button');
    if(!up) f.setAttribute('aria-pressed', 'false');
    return {el:f, i:i, kind:f.getAttribute('data-kind') || (f.classList.contains('photo') ? 'photo' : 'word'), up:up, up0:up, r:up ? 1 : 0, mask:null, focus:false};
  });
  this.order0 = $$('[data-start]', el).sort(function(a, b){ return a.getAttribute('data-start') - b.getAttribute('data-start'); });
  this.order = this.order0.slice(); this.newest = null; this.editing = false; this.saved = [];
  this.frags.forEach(function(f){
    if(f.kind === 'photo'){
      var img = f.el.querySelector('img');
      if(img){ var go = function(){ f.mask = maskFromImage(img, 66, 44); poke(); }; if(img.complete && img.naturalWidth) go(); else img.addEventListener('load', go); }
    } else f.mask = maskEllipse(24, 10);
    if(f.up) return;
    f.el.addEventListener('click', function(e){ e.stopPropagation(); if(SCAN.on || SCAN.suppress || e.target.closest('.pt')) return; self.surface(f, true); });
    f.el.addEventListener('keydown', function(e){ if(e.target === f.el && e.key === 'Enter'){ e.preventDefault(); self.surface(f, true); } });
    f.el.addEventListener('focus', function(){ f.focus = true; });
    f.el.addEventListener('blur', function(){ f.focus = false; });
  });
  el.addEventListener('click', function(e){
    if(e.target.closest('.frag, .mark, .pool-foot, button, a, input') || self.editing || SCAN.on || SCAN.suppress) return;
    var r = el.getBoundingClientRect();
    self.place((e.clientX - r.left)/r.width*100, (e.clientY - r.top)/r.height*100);
  });
  el.addEventListener('pointerenter', function(e){ if(e.pointerType !== 'touch') self.cross.style.opacity = 1; });
  el.addEventListener('pointerleave', function(){ self.cross.style.opacity = 0; });
  el.addEventListener('pointermove', function(e){
    var r = el.getBoundingClientRect(); self.cross.style.left = (e.clientX - r.left) + 'px'; self.cross.style.top = (e.clientY - r.top) + 'px';
    self.cross.style.opacity = e.target.closest('.pool-foot, .pt') ? 0 : 1;
  });
  this.restore();
}
function mk(tag, cls, parent){ var e = doc.createElement(tag); e.className = cls; parent.appendChild(e); return e; }
function safeJSON(s, fb){ try{ return JSON.parse(s); }catch(e){ return fb; } }

Pool.prototype.layout = function(){
  var w = this.el.clientWidth, h = this.el.clientHeight; this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); this.links(false);
};
Pool.prototype.center = function(node){ return {x:node.offsetLeft, y:node.offsetTop}; };
Pool.prototype.links = function(animate){
  var html = '', co = this.el.querySelectorAll('.coord');
  if(co.length){
    var lastN = this.order.length ? this.center(this.order[this.order.length - 1]) : null;
    for(var c=0; c<co.length; c++){
      var A = c === 0 ? lastN : this.center(co[c-1]), B = this.center(co[c]); if(!A) continue;
      html += '<line class="fut' + (c > 0 ? ' far' : '') + '" x1="' + A.x.toFixed(1) + '" y1="' + A.y.toFixed(1) + '" x2="' + B.x.toFixed(1) + '" y2="' + B.y.toFixed(1) + '"/>';
    }
  }
  for(var k=1; k<this.order.length; k++){
    var a = this.center(this.order[k-1]), b = this.center(this.order[k]);
    html += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '"' + (k === this.order.length - 1 && this.newest ? ' class="new"' : '') + '/>';
  }
  this.svg.innerHTML = html;
  if(animate && !RM){
    var ln = this.svg.lastElementChild; if(!ln || ln.classList.contains('fut')) return;
    var len = Math.hypot(ln.x2.baseVal.value - ln.x1.baseVal.value, ln.y2.baseVal.value - ln.y1.baseVal.value);
    ln.style.strokeDasharray = len; ln.style.strokeDashoffset = len; ln.getBoundingClientRect();
    ln.style.transition = 'stroke-dashoffset .7s cubic-bezier(.16,1,.3,1)'; ln.style.strokeDashoffset = 0;
  }
};
Pool.prototype.setNewest = function(node){
  if(this.newest) this.newest.removeAttribute('data-attract');
  this.newest = node; if(node) node.setAttribute('data-attract', 'warm .45 60');
};
Pool.prototype.surface = function(f, user){
  if(f.up) return;
  f.up = true; f.r = 1; f.el.style.setProperty('--r', 1); f.el.classList.add('up'); f.el.setAttribute('aria-pressed', 'true');
  this.order.push(f.el); this.setNewest(f.el); this.links(!!user);
  if(user){ this.saved.push({f:f.i}); this.save(); }
  poke();
};
Pool.prototype.addMark = function(px, py, text){
  var m = doc.createElement('div'); m.className = 'mark mine user' + (px > 70 ? ' l' : ''); m.style.left = px + '%'; m.style.top = py + '%';
  m.innerHTML = '<i></i>';
  if(text != null){ var sp = doc.createElement('span'); sp.setAttribute('data-clear', ''); sp.textContent = text; m.appendChild(sp); }
  this.el.appendChild(m); this.order.push(m); return m;
};
Pool.prototype.place = function(px, py){
  var self = this;
  var mine = this.el.querySelectorAll('.mark.user');
  if(mine.length >= 5){ var old = mine[0]; this.order.splice(this.order.indexOf(old), 1); old.remove(); this.saved = this.saved.filter(function(s){ return s.f != null || !(s.x === parseFloat(old.style.left) && s.y === parseFloat(old.style.top)); }); }
  var m = this.addMark(px, py, null); this.editing = true;
  var inp = doc.createElement('input'); inp.type = 'text'; inp.maxLength = 40; inp.placeholder = 'что здесь было?'; inp.setAttribute('aria-label', 'Подпись метки'); inp.setAttribute('data-clear', 'live');
  m.appendChild(inp); this.setNewest(m); this.links(true);
  inp.focus({preventScroll:true});
  var done = false;
  function commit(keep){
    if(done) return; done = true; self.editing = false;
    var v = inp.value.trim();
    if(!keep || !v){ self.order.splice(self.order.indexOf(m), 1); m.remove(); self.setNewest(null); self.links(false); poke(); return; }
    var sp = doc.createElement('span'); sp.setAttribute('data-clear', ''); sp.textContent = v; inp.replaceWith(sp);
    self.saved.push({x:+px.toFixed(2), y:+py.toFixed(2), t:v}); self.save(); remeasureSoon(true); poke();
  }
  inp.addEventListener('click', function(e){ e.stopPropagation(); });
  inp.addEventListener('keydown', function(e){ e.stopPropagation(); if(e.key === 'Enter') commit(true); if(e.key === 'Escape') commit(false); });
  inp.addEventListener('blur', function(){ setTimeout(function(){ commit(true); }, 0); });
  remeasureSoon(true); poke();
};
Pool.prototype.save = function(){ Store.set('pool|' + this.id, this.saved); };
Pool.prototype.restore = function(){
  var self = this, items = Store.get('pool|' + this.id);
  items.forEach(function(it){
    if(it && it.f != null){ var f = self.frags[it.f]; if(f && !f.up){ self.surface(f, false); self.saved.push({f:it.f}); } }
    else if(it && typeof it.t === 'string'){ var m = self.addMark(+it.x, +it.y, it.t.slice(0, 40)); self.setNewest(m); self.saved.push({x:+it.x, y:+it.y, t:it.t}); }
  });
};
Pool.prototype.reset = function(){
  var self = this;
  $$('.mark.user', this.el).forEach(function(m){ m.remove(); });
  this.frags.forEach(function(f){ if(f.up && !f.up0){ f.up = false; f.r = 0; f.el.classList.remove('up'); f.el.style.setProperty('--r', 0); f.el.setAttribute('aria-pressed', 'false'); f.el.removeAttribute('data-attract'); } });
  this.order = this.order0.slice(); this.saved = []; this.setNewest(null); this.links(false);
};
/* насколько проступил фрагмент */
Pool.prototype.tick = function(){
  var self = this, hintTxt = '', hintAt = null, pr = this.el.getBoundingClientRect();
  if(pr.bottom < 0 || pr.top > H) return;
  this.frags.forEach(function(f){
    if(f.up || f.el.classList.contains('scan')) return;
    var r = f.el.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2, tgt = 0;
    if(f.focus) tgt = 1;
    else if(lens.mode === 'lens' && lens.a > .02){
      var dx = Math.max(r.left - lens.x, 0, lens.x - r.right), dy = Math.max(r.top - lens.y, 0, lens.y - r.bottom);
      var dr = Math.hypot(dx, dy), dc = Math.hypot(lens.x - cx, lens.y - cy)/Math.hypot(r.width/2, r.height/2);
      tgt = lens.a*Math.max(0, 1 - dr/150)*(.6 + .4*Math.max(0, 1 - dc*.7));
    }
    f.r += (tgt - f.r)*(RM || frames < 3 ? 1 : .12);
    f.el.style.setProperty('--r', f.r.toFixed(3));
    if(f.r > .45 && !hintTxt){ hintTxt = 'нажми, чтобы вытащить'; hintAt = {x:r.left - pr.left - 16, y:r.bottom - pr.top - 4}; }
  });
  var userMarks = this.el.querySelector('.mark.user');
  if(!hintTxt && P.seen && P.inWin && !userMarks && !this.editing && !SCAN.on && lens.x > pr.left && lens.x < pr.right && lens.y > pr.top && lens.y < pr.bottom){
    var over = doc.elementFromPoint(lens.x, lens.y);
    if(over && over.closest && !over.closest('.pool-foot, .frag, .pt, .mark')){ hintTxt = 'нажми — своя метка'; hintAt = {x:lens.x - pr.left, y:lens.y - pr.top}; }
  }
  this.hint.style.opacity = hintTxt ? 1 : 0;
  if(hintTxt){ this.hint.setAttribute('data-clear', 'live'); this.hint.textContent = hintTxt; this.hint.style.left = (hintAt.x + 16) + 'px'; this.hint.style.top = (hintAt.y + 14) + 'px'; }
  else this.hint.removeAttribute('data-clear');
};

/* =====================================================================
   ФОНОВЫЕ ФРАГМЕНТЫ [data-ghost]: без интеракции, по очереди
   ===================================================================== */
function Ghost(el, index){
  var self = this;
  this.el = el; this.index = index; this.s = 0;
  this.kind = el.querySelector('img') ? 'photo' : 'word';
  var host = el.closest('[data-hero-motion]'), m = host ? MOTIONS[host.getAttribute('data-hero-motion')] : null;
  this.off = !!(m && m.ghosts === false);
  el.setAttribute('aria-hidden', 'true'); el.classList.add('ghost');
  if(this.kind === 'photo'){
    var img = el.querySelector('img');
    var go = function(){ self.mask = maskFromImage(img, 66, 44); poke(); };
    if(img.complete && img.naturalWidth) go(); else img.addEventListener('load', go);
  } else this.mask = maskEllipse(24, 10);
}
function ghostTick(t){
  if(!ghosts.length) return;
  var P0 = O.ghostPeriod, n = ghosts.length;
  var cur = Math.floor(t/P0) % n, u = (t % P0)/P0;
  ghosts.forEach(function(g, i){
    var s = 0;
    if(g.off){ g.s = 0; g.el.style.setProperty('--r', 0); return; }
    if(RM) s = i === 0 ? .45 : 0;
    else if(i === cur){ var w = Math.sin(Math.PI*u); s = w*w*w; }  /* мягко проступает — держится — растворяется */
    g.s = s; g.el.style.setProperty('--r', s.toFixed(3));
  });
}

/* =====================================================================
   «ОСТАНОВИТЬСЯ И УВИДЕТЬ»: [data-stop] с точками силы .pt
   ===================================================================== */
var veil = null, holdEl = null, holdPg = null;
var HINT_KEY = 'Посмотреть внимательнее';
var HINT_TOUCH = 'Посмотреть внимательнее';
function Stop(el, index){
  var self = this;
  this.el = el; this.id = el.getAttribute('data-stop') || el.id || ('stop' + index);
  this.pool = el.closest('.pool'); this.poolObj = null;
  this.layer = el.querySelector('.stop-layer');
  if(!this.layer){ this.layer = doc.createElement('div'); this.layer.className = 'stop-layer'; el.appendChild(this.layer); }
  this.rays = this.layer.querySelector('.stop-rays');
  if(!this.rays){ this.rays = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.rays.setAttribute('class', 'stop-rays'); this.rays.setAttribute('viewBox', '0 0 100 100'); this.rays.setAttribute('preserveAspectRatio', 'none'); this.rays.setAttribute('aria-hidden', 'true'); this.layer.insertBefore(this.rays, this.layer.firstChild); }
  this.pts = $$('.pt', el).map(function(p){
    if(p.parentNode !== self.layer) self.layer.appendChild(p);
    if(p.hasAttribute('data-x')) p.style.left = parseFloat(p.getAttribute('data-x')) + '%';
    if(p.hasAttribute('data-y')) p.style.top = parseFloat(p.getAttribute('data-y')) + '%';
    if(!p.querySelector('i')){ var txt = p.textContent.trim(); p.textContent = ''; p.appendChild(doc.createElement('i')); var sp = doc.createElement('span'); sp.textContent = txt; p.appendChild(sp); }
    if(!p.classList.contains('l') && !p.classList.contains('r') && parseFloat(p.style.left) > 58) p.classList.add('l');
    if(p.tagName === 'BUTTON') p.type = 'button';
    var label = p.querySelector('span') ? p.querySelector('span').textContent : '';
    p.setAttribute('aria-label', 'Точка силы: ' + label); p.setAttribute('aria-pressed', 'false');
    p.addEventListener('click', function(e){ e.stopPropagation(); if(SCAN.stop !== self) return; p.classList.toggle('on'); p.setAttribute('aria-pressed', p.classList.contains('on')); self.drawRays(false); self.text(); self.future(); self.save(); poke(); });
    return p;
  });
  this.btns = [];
  this.restore(); this.drawRays(false); this.future();

  /* касание: удержать палец на снимке (или на поле, если снимок в пуле) */
  var host = this.pool || el;
  host.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'touch' || e.target.closest('.pt, .pool-foot, .stop-btn, input')) return; if(self.pool && self !== stopInPool(self.pool)) return; holdStart(self, e.clientX, e.clientY); });
  host.addEventListener('pointermove', function(e){ if(e.pointerType === 'touch' && HOLD.on && Math.hypot(e.clientX - HOLD.x, e.clientY - HOLD.y) > 12) holdCancel(); });
  ['pointerup', 'pointercancel'].forEach(function(ev){ host.addEventListener(ev, function(e){
    if(e.pointerType !== 'touch') return;
    if(HOLD.done){ SCAN.suppress = true; setTimeout(function(){ SCAN.suppress = false; }, 400); HOLD.done = false; }
    holdEnd();
  }); });
  host.addEventListener('contextmenu', function(e){ if(TOUCH) e.preventDefault(); });
}
function stopInPool(pool){ for(var i=0; i<stops.length; i++) if(stops[i].pool === pool) return stops[i]; return null; }
Stop.prototype.found = function(){ return this.pts.filter(function(p){ return p.classList.contains('on'); }).length; };
Stop.prototype.text = function(){
  var self = this;
  this.btns.forEach(function(b){
    if(SCAN.stop !== self){ b.textContent = TOUCH ? HINT_TOUCH : HINT_KEY; b.setAttribute('aria-pressed', 'false'); return; }
    b.setAttribute('aria-pressed', 'true');
    b.textContent = 'Вернуться';
  });
};
Stop.prototype.drawRays = function(animate){
  var h = '';
  this.pts.forEach(function(p){ h += '<line pathLength="100" x1="50" y1="50" x2="' + parseFloat(p.style.left) + '" y2="' + parseFloat(p.style.top) + '"' + (p.classList.contains('on') ? ' class="on"' : '') + '/>'; });
  this.rays.innerHTML = h;
  if(animate && !RM){
    each(this.rays.querySelectorAll('line'), function(l, i){
      l.style.strokeDasharray = 100; l.style.strokeDashoffset = 100; l.getBoundingClientRect();
      l.style.transition = 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1) ' + (.38 + i*.15) + 's'; l.style.strokeDashoffset = 0;
    });
  }
};
/* найденное понемногу проявляет ближнюю координату будущего */
Stop.prototype.future = function(){
  var f = this.found(), c1 = this.pool ? this.pool.querySelector('.coord') : null;
  if(!c1) return;
  if(f) c1.setAttribute('data-attract', 'ink ' + (.08*f).toFixed(2) + ' 34'); else c1.removeAttribute('data-attract');
};
Stop.prototype.save = function(){ var on = []; this.pts.forEach(function(p, i){ if(p.classList.contains('on')) on.push(i); }); Store.set('stop|' + this.id, on); };
Stop.prototype.restore = function(){ var self = this; Store.get('stop|' + this.id).forEach(function(i){ var p = self.pts[i]; if(p){ p.classList.add('on'); p.setAttribute('aria-pressed', 'true'); } }); };
Stop.prototype.reset = function(){ this.pts.forEach(function(p){ p.classList.remove('on'); p.setAttribute('aria-pressed', 'false'); }); this.drawRays(false); this.future(); this.text(); };
Stop.prototype.enter = function(sticky){
  if(SCAN.on) return;
  var self = this;
  SCAN.on = true; SCAN.sticky = !!sticky; SCAN.stop = this; SCAN.t = (performance.now() - t0)/1000; SCAN.at = performance.now();
  doc.body.classList.add('is-scan'); this.el.classList.add('scan'); if(this.pool) this.pool.classList.add('scan-host');
  var f = fragOf(this.el); if(f){ f.r = 1; this.el.style.setProperty('--r', 1); }
  this.pts.forEach(function(p, i){ p.classList.remove('show'); if(RM) p.classList.add('show'); else setTimeout(function(){ if(SCAN.stop === self) p.classList.add('show'); }, 420 + i*150); });
  this.drawRays(true); this.text();
  if(TOUCH && navigator.vibrate) try{ navigator.vibrate(10); }catch(e){}
  poke();
};
Stop.prototype.exit = function(){
  if(SCAN.stop !== this) return;
  SCAN.on = false; SCAN.stop = null; t0 += performance.now() - SCAN.at;
  doc.body.classList.remove('is-scan'); this.el.classList.remove('scan'); if(this.pool) this.pool.classList.remove('scan-host');
  this.pts.forEach(function(p){ p.classList.remove('show'); });
  this.text(); if(this.poolObj) this.poolObj.links(false); poke();
};
function fragOf(el){ for(var i=0; i<pools.length; i++) for(var k=0; k<pools[i].frags.length; k++) if(pools[i].frags[k].el === el) return pools[i].frags[k]; return null; }

/* удержание: кольцо заполняется полсекунды */
var HOLD = {on:false, start:0, done:false, x:0, y:0, stop:null};
function holdStart(stop, x, y){
  if(SCAN.on || HOLD.on) return;
  HOLD.on = true; HOLD.done = false; HOLD.start = performance.now(); HOLD.x = x; HOLD.y = y; HOLD.stop = stop;
  holdEl.style.left = x + 'px'; holdEl.style.top = y + 'px'; holdEl.style.opacity = 1; holdPg.style.strokeDashoffset = 100.6;
  requestAnimationFrame(holdTick);
}
function holdTick(){
  if(!HOLD.on) return;
  var p = Math.min(1, (performance.now() - HOLD.start)/(RM ? 1 : 520));
  holdPg.style.strokeDashoffset = (100.6*(1 - p)).toFixed(1);
  if(p >= 1){ HOLD.on = false; HOLD.done = true; holdEl.style.opacity = 0; HOLD.stop.enter(false); return; }
  requestAnimationFrame(holdTick);
}
function holdCancel(){ HOLD.on = false; holdEl.style.opacity = 0; }
function holdEnd(){ if(HOLD.on) holdCancel(); if(SCAN.on && !SCAN.sticky) SCAN.stop.exit(); }
/* какой снимок ближе к центру экрана */
function visibleStop(){
  var best = null, bd = 1e9;
  stops.forEach(function(s){
    var r = s.el.getBoundingClientRect(); if(r.bottom < 120 || r.top > H - 120 || r.width === 0) return;
    var d = Math.abs((r.top + r.bottom)/2 - H/2); if(d < bd){ bd = d; best = s; }
  });
  return best;
}
function bindStopUI(){
  veil = doc.querySelector('.stop-veil') || mk('div', 'stop-veil', doc.body);
  veil.setAttribute('aria-hidden', 'true');
  veil.addEventListener('click', function(){ if(SCAN.on){ SCAN.sticky = false; SCAN.stop.exit(); } });
  holdEl = doc.querySelector('.stop-hold');
  if(!holdEl){ holdEl = mk('div', 'stop-hold', doc.body); holdEl.setAttribute('aria-hidden', 'true'); holdEl.innerHTML = '<svg viewBox="0 0 40 40"><circle class="tr" cx="20" cy="20" r="16"/><circle class="pg" cx="20" cy="20" r="16"/></svg>'; }
  holdPg = holdEl.querySelector('.pg');
  /* кнопки-строки: data-stop-btn="id" или пусто — ближайший снимок в той же секции */
  $$('[data-stop-btn]').forEach(function(b){
    var id = b.getAttribute('data-stop-btn'), s = null;
    if(id) s = stops.filter(function(x){ return x.id === id; })[0];
    if(!s){ var scope = b.closest('.pool') || b.closest('section') || doc; s = stops.filter(function(x){ return scope.contains(x.el); })[0] || stops[0]; }
    if(!s) return;
    if(b.tagName === 'BUTTON') b.type = 'button';
    b.classList.add('stop-btn'); b.setAttribute('aria-pressed', 'false'); s.btns.push(b);
    b.addEventListener('click', function(e){ e.stopPropagation(); if(SCAN.stop === s){ SCAN.sticky = false; s.exit(); } else if(!SCAN.on) s.enter(true); });
  });
  stops.forEach(function(s){ s.text(); });
  global.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && SCAN.on){ SCAN.sticky = false; SCAN.stop.exit(); return; }
    if(e.code !== 'Space' || !stops.length) return;
    var tg = e.target; if(tg && tg.closest && tg.closest('input, textarea, select, button, a, summary, [role=button], [contenteditable]')) return;
    if(SCAN.on || HOLD.on){ e.preventDefault(); return; }
    var s = visibleStop(); if(!s) return;
    e.preventDefault(); if(e.repeat) return;
    var c;
    if(P.seen && P.inWin) c = {x:P.x, y:P.y}; else { var r = s.el.getBoundingClientRect(); c = {x:r.left + r.width/2, y:r.top + r.height/2}; }
    holdStart(s, c.x, c.y);
  });
  global.addEventListener('keyup', function(e){ if(e.code === 'Space') holdEnd(); });
}

/* =====================================================================
   ЛИНЗА, ЦИКЛ, ЗАПУСК
   ===================================================================== */
function idleTarget(t){
  for(var i=0; i<pools.length; i++) for(var k=0; k<pools[i].frags.length; k++){
    var f = pools[i].frags[k]; if(f.kind !== 'photo') continue;
    var ph = f.el.getBoundingClientRect(); if(ph.bottom < 0 || ph.top > H) return null;
    var cx = ph.left + ph.width/2, cy = ph.top + ph.height/2;
    return {x:cx + Math.cos(t*.45)*ph.width*.16, y:cy + Math.sin(t*.6)*ph.height*.14};
  }
  return null;
}
/* какой режим курсора действует в точке: внутренняя зона важнее внешней */
function cursorAt(x, y){
  var mode = null, sy = global.scrollY, Y = y + sy;
  for(var i=0; i<staticZones.length; i++){ var Z = staticZones[i]; if(Z.cur && !Z.z && x >= Z.l && x <= Z.r && Y >= Z.t && Y <= Z.b) mode = Z.cur; }
  for(var k=0; k<pools.length; k++){ var r = pools[k].rect; if(r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) mode = pools[k].cursor; }
  return mode || 'none';
}
function updLens(){
  var t = RM ? tFrozen : (performance.now() - t0)/1000;
  var tx = lens.x, ty = lens.y, ta = 0, focused = null, mode = 'none';
  pools.forEach(function(p){ p.frags.forEach(function(f){ if(f.focus) focused = f; }); });
  if(SCAN.on){ ta = 0; }
  else if(focused && O.lens){ var r = focused.el.getBoundingClientRect(); tx = r.left + r.width/2; ty = r.top + r.height/2; ta = 1; }
  else if(P.seen && P.inWin){ mode = cursorAt(P.x, P.y); if(mode !== 'none'){ tx = P.x; ty = P.y; ta = mode === 'lens' ? O.lens : 1; } }
  else if(O.idleLens && O.lens && !P.seen && !TOUCH){ var it = idleTarget(t); if(it){ tx = it.x; ty = it.y; ta = O.lens*.9; mode = 'lens'; } }
  if(focused) mode = 'lens';
  /* смена режима: старый эффект сначала гаснет, потом включается новый */
  if(mode !== lens.mode && mode !== 'none'){ if(lens.a < .04 || lens.mode === 'none') lens.mode = mode; else ta = 0; }
  if(mode === 'none') ta = 0;
  var snap = RM || lens.x < -9000 || frames < 3;
  if(snap){ lens.x = tx; lens.y = ty; lens.a = ta; if(mode !== 'none') lens.mode = mode; }
  else { lens.x += (tx - lens.x)*.18; lens.y += (ty - lens.y)*.18; lens.a += (ta - lens.a)*.08; }
}
function frame(){ frames++; updLens(); ghostTick(RM ? tFrozen : SCAN.on ? SCAN.t : (performance.now() - t0)/1000); pools.forEach(function(p){ p.tick(); }); draw(); }
function loop(now){
  raf = requestAnimationFrame(loop);
  if(now - last < 1000/(LOW ? Math.min(O.fps, 24) : O.fps) - 2) return;
  last = now; frame();
}
function start(){ if(RM || raf || doc.hidden) return; raf = requestAnimationFrame(loop); }
function stopLoop(){ if(raf){ cancelAnimationFrame(raf); raf = 0; } }
/* при «уменьшить движение» — один кадр по требованию */
var rmQueued = false;
function poke(){
  need = true;
  if(!started) return;
  if(RM || !raf){ if(rmQueued) return; rmQueued = true; requestAnimationFrame(function(){ rmQueued = false; if(doc.hidden) return; frame(); }); }
}

function bindHover(){
  if(!O.hoverAttract) return;
  $$(O.hoverAttract).forEach(function(c){
    if(c.hasAttribute('data-attract')) return;
    function on(){ c.setAttribute('data-attract', 'ink .55 130'); poke(); }
    function off(){ c.removeAttribute('data-attract'); poke(); }
    c.addEventListener('mouseenter', on); c.addEventListener('mouseleave', off);
    c.addEventListener('focusin', on); c.addEventListener('focusout', off);
  });
}

function init(options){
  if(started) return Field;
  O = {}; var k;
  for(k in DEFAULTS) O[k] = DEFAULTS[k];
  options = options || {};
  for(k in options) if(options[k] !== undefined) O[k] = options[k];
  if(options.levels){ O.levels = {}; for(k in DEFAULTS.levels) O.levels[k] = DEFAULTS.levels[k]; for(k in options.levels) O.levels[k] = options.levels[k]; }

  cv = doc.querySelector('canvas.field-canvas');
  if(!cv){ cv = doc.createElement('canvas'); cv.className = 'field-canvas'; cv.setAttribute('aria-hidden', 'true'); doc.body.insertBefore(cv, doc.body.firstChild); }
  ctx = cv.getContext('2d');
  t0 = performance.now();

  pools = $$('.pool').map(function(el, i){ return new Pool(el, i); });
  ghosts = $$('[data-ghost]').map(function(el, i){ return new Ghost(el, i); });
  photos = $$('[data-field-photo]').map(function(el){
    var o = {el:el, mask:null}, img = el.querySelector('img');
    if(img){ var go = function(){ o.mask = maskFromImage(img, 48, 48); poke(); }; if(img.complete && img.naturalWidth) go(); else img.addEventListener('load', go); }
    return o;
  });
  stops = $$('[data-stop]').map(function(el, i){ var s = new Stop(el, i); s.poolObj = s.pool ? pools.filter(function(p){ return p.el === s.pool; })[0] : null; return s; });
  if(stops.length) bindStopUI();
  bindHover();

  each(doc.querySelectorAll('[data-marks-clear]'), function(b){
    b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); Field.marks.clear(); });
  });
  Store.sync();

  global.addEventListener('pointermove', function(e){ if(e.pointerType === 'touch') return; P.x = e.clientX; P.y = e.clientY; P.seen = true; P.inWin = true; if(RM) poke(); }, {passive:true});
  doc.addEventListener('pointerleave', function(){ P.inWin = false; poke(); });
  doc.documentElement.addEventListener('mouseleave', function(){ P.inWin = false; });
  global.addEventListener('blur', function(){ P.inWin = false; });
  global.addEventListener('resize', function(){ resize(); remeasureSoon(true); });
  global.addEventListener('scroll', function(){ if(RM) poke(); }, {passive:true});
  global.addEventListener('load', function(){ remeasureSoon(true); });
  doc.addEventListener('toggle', function(){ remeasureSoon(false); }, true);
  doc.addEventListener('visibilitychange', function(){ if(doc.hidden) stopLoop(); else { start(); poke(); } });
  if(global.ResizeObserver){ try{ new ResizeObserver(function(){ remeasureSoon(false); }).observe(doc.body); }catch(e){} }
  if(global.MutationObserver){ try{ new MutationObserver(function(list){
    for(var i=0; i<list.length; i++){ var tg = list[i].target; if(tg.closest && tg.closest('.pool, .stop-layer')) continue; remeasureSoon(true); return; }
  }).observe(doc.querySelector('main') || doc.body, {childList:true, subtree:true}); }catch(e){} }
  if(doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function(){ remeasureSoon(true); pools.forEach(function(p){ p.layout(); }); });

  started = true;
  resize(); collect();
  pools.forEach(function(p){ p.links(false); });
  if(RM) poke(); else start();

  /* демо-адреса для проверки: #stop — сразу режим «посмотреть внимательнее» */
  if(location.hash === '#stop' && stops[0]){ stops[0].enter(true); }
  return Field;
}

var Field = {
  init: init,
  /* перерисовать (после своих изменений на странице) */
  poke: function(){ poke(); },
  /* заново найти тексты/зоны (после того как модуль вставил разметку) */
  refresh: function(){ remeasureSoon(true); },
  get pools(){ return pools; },
  get stops(){ return stops; },
  get ghosts(){ return ghosts; },
  /* новый режим курсора: Field.defineCursor('name', {radius:90, glow:false, warm:false, fn:function(d, L, n){ return d; }}) */
  defineCursor: function(name, def){ CURSORS[name] = def; dirty = true; poke(); },
  /* новый режим первого экрана: Field.defineMotion('name', {cursor:'part', ghosts:true}) — до Field.init() или затем Field.refresh() */
  defineMotion: function(name, def){ MOTIONS[name] = def; dirty = true; poke(); },
  get cursors(){ return Object.keys(CURSORS); },
  get motions(){ return Object.keys(MOTIONS); },
  stop: {
    enter: function(id){ var s = stops.filter(function(x){ return x.id === id; })[0] || stops[0]; if(s) s.enter(true); },
    exit: function(){ if(SCAN.on) SCAN.stop.exit(); }
  },
  marks: {
    get: function(){ return Store.read(); },
    clear: function(){ if(SCAN.on) SCAN.stop.exit(); Store.clear(); pools.forEach(function(p){ p.reset(); }); stops.forEach(function(s){ s.reset(); }); remeasureSoon(true); poke(); }
  },
  /* формы секций (для проверки): [{x,y,sx,sy,…}] в координатах страницы */
  get forms(){ return forms; },
  get reducedMotion(){ return RM; },
  get lowPower(){ return LOW; }
};
global.Field = Field;
})(window);
