/* =====================================================================
   Waykeeper · атмосфера страницы (atmo.js)
   Без библиотек. Запускается сам после DOMContentLoaded.
   Что делает:
   1) кладёт под всё неподвижный слой .atmo: тёплая основа, 4 мягких пятна
      света, растворённое фото/облака, плёночное зерно, рамка колонки;
   2) кладёт в документ слой .atmo-marks: тонкие линии секций с узлами
      на рамке и бледные кольца у отмеченных мест;
   3) по прокрутке меняет «свет» под секцию (data-atmo), подставляет её
      фото (data-atmo-photo), делает тёплым узел секции, где ты сейчас.
   Слои ниже поля field.js (z-index -3 и -2 против его -1), его не трогает.
   Атрибуты — README.md, раздел «Атмосфера».
   ===================================================================== */
(function(){
  'use strict';
  var D = document, W = window, HTML = D.documentElement;
  var RM = W.matchMedia('(prefers-reduced-motion: reduce)');
  var MOB = W.matchMedia('(max-width: 760px)');
  var WIDE = W.matchMedia('(min-width: 1280px)');
  var LIGHTS = {dawn:1, day:1, haze:1, 'night-soft':1};

  /* Зерно по вариантам. size — сторона плитки в css px; film — зёрна ~1 px,
     clump — комочки ~3 px (то, что делает зерно «плёночным», а не песком),
     micro — самые мелкие точки на ретине; a — сила; lift — доля светлых зёрен. */
  var GRAIN = {
    a: {size:240, film:1,   clump:.45, clumpPx:3,   micro:.3,  a:.06,  lift:.6,  dark:[92,70,48]},
    b: {size:260, film:.7,  clump:.75, clumpPx:3.5, micro:.2,  a:.068, lift:.5,  dark:[96,74,50]},
    c: {size:220, film:1,   clump:.3,  clumpPx:2.5, micro:.45, a:.06,  lift:.65, dark:[52,44,36]}
  };

  var A = {inited:false};
  var atmo, light, clouds, photo, slots = [], grainEls = [], rails, marks;
  var variant = 'a', sections = [], rules = [], rings = [], curSec = null, curPhoto = '', slotIx = 0, raf = 0;
  var photoCache = {};

  /* ---------- шум ---------- */
  function gauss(){ return (Math.random() + Math.random() + Math.random() - 1.5) * 1.15; }
  /* решётка случайных значений, сглаженно растянутая на n×n с бесшовным краем */
  function lattice(n, step){
    var g = Math.max(1, Math.round(n / step)), L = new Float32Array(g*g), out = new Float32Array(n*n), i, x, y;
    for(i=0;i<g*g;i++) L[i] = gauss();
    var k = g / n;
    for(y=0;y<n;y++){
      var fy = y*k, y0 = Math.floor(fy), ty = fy - y0, y1 = (y0+1) % g; y0 %= g;
      ty = ty*ty*(3-2*ty);
      for(x=0;x<n;x++){
        var fx = x*k, x0 = Math.floor(fx), tx = fx - x0, x1 = (x0+1) % g; x0 %= g;
        tx = tx*tx*(3-2*tx);
        var a = L[y0*g+x0] + (L[y0*g+x1]-L[y0*g+x0])*tx,
            b = L[y1*g+x0] + (L[y1*g+x1]-L[y1*g+x0])*tx;
        out[y*n+x] = a + (b-a)*ty;
      }
    }
    return out;
  }

  function grainTile(cfg, dpr){
    var n = Math.round(cfg.size * dpr);
    var film = lattice(n, dpr),                    /* 1 css px, мягко */
        clump = lattice(n, cfg.clumpPx * dpr);     /* комочки */
    var cv = D.createElement('canvas'); cv.width = cv.height = n;
    var cx = cv.getContext('2d'), im = cx.createImageData(n, n), d = im.data;
    var dk = cfg.dark, i, v, al;
    for(i=0;i<n*n;i++){
      v = film[i]*cfg.film + clump[i]*cfg.clump + gauss()*cfg.micro*(dpr > 1 ? 1 : .5);
      if(v >= 0){ al = v * cfg.a * cfg.lift; d[i*4]=255; d[i*4+1]=253; d[i*4+2]=248; }
      else { al = -v * cfg.a; d[i*4]=dk[0]; d[i*4+1]=dk[1]; d[i*4+2]=dk[2]; }
      d[i*4+3] = Math.min(255, Math.round(al*255));
    }
    cx.putImageData(im, 0, 0);
    return cv;
  }

  /* облака / растворённое абстрактное изображение: дробный шум, тёплые тени */
  function cloudsCanvas(){
    var w = 360, h = 220, cv = D.createElement('canvas'); cv.width = w; cv.height = h;
    var cx = cv.getContext('2d'), im = cx.createImageData(w, h), d = im.data;
    var oct = [lattice2(w,h,120), lattice2(w,h,60), lattice2(w,h,28)], wt = [1,.5,.22];
    for(var y=0;y<h;y++) for(var x=0;x<w;x++){
      var i = y*w+x, v = 0;
      for(var o=0;o<3;o++) v += oct[o][i]*wt[o];
      v = v*.4 + .5 + (y/h - .55)*.5;                         /* к низу облака плотнее */
      var t = Math.max(0, Math.min(1, (v - .38) / .42)); t = t*t*(3-2*t);
      var sh = Math.max(0, Math.min(1, (v - .66) / .34));     /* тени внутри облака */
      /* светлая масса — тёплый белый, тени — серо-золотистые */
      d[i*4]   = Math.round(252 - sh*44);
      d[i*4+1] = Math.round(248 - sh*50);
      d[i*4+2] = Math.round(240 - sh*62);
      d[i*4+3] = Math.round(255 * Math.min(1, t*.85 + sh*.3));
    }
    cx.putImageData(im, 0, 0);
    return cv;
  }
  function lattice2(w, h, step){
    var gx = Math.ceil(w/step)+1, gy = Math.ceil(h/step)+1, L = new Float32Array(gx*gy), out = new Float32Array(w*h);
    for(var i=0;i<gx*gy;i++) L[i] = gauss();
    for(var y=0;y<h;y++){
      var fy = y/step, y0 = Math.floor(fy), ty = fy-y0; ty = ty*ty*(3-2*ty);
      for(var x=0;x<w;x++){
        var fx = x/step, x0 = Math.floor(fx), tx = fx-x0; tx = tx*tx*(3-2*tx);
        var a = L[y0*gx+x0] + (L[y0*gx+x0+1]-L[y0*gx+x0])*tx,
            b = L[(y0+1)*gx+x0] + (L[(y0+1)*gx+x0+1]-L[(y0+1)*gx+x0])*tx;
        out[y*w+x] = a + (b-a)*ty;
      }
    }
    return out;
  }

  function toURL(cv, cb){
    if(cv.toBlob){
      try { cv.toBlob(function(b){ cb(b ? URL.createObjectURL(b) : cv.toDataURL()); }); return; } catch(e){}
    }
    cb(cv.toDataURL());
  }

  /* ---------- слой ---------- */
  function el(tag, cls, parent){ var e = D.createElement(tag); if(cls) e.className = cls; if(parent) parent.appendChild(e); return e; }

  function build(){
    atmo = el('div', 'atmo');
    atmo.setAttribute('aria-hidden', 'true');
    atmo.setAttribute('data-v', variant);
    atmo.setAttribute('data-light', defaultLight());
    light = el('div', 'atmo-light', atmo);
    for(var i=1;i<=4;i++) el('b', '', el('i', 'atmo-blob atmo-b'+i, light));
    clouds = el('div', 'atmo-clouds', atmo); el('i', '', clouds);
    photo = el('div', 'atmo-photo', atmo);
    slots = [el('div', 'atmo-ph', photo), el('div', 'atmo-ph', photo)];
    grainEls = [el('div', 'atmo-grain', atmo)];
    if(variant === 'c') grainEls.push(el('div', 'atmo-grain', atmo));
    rails = el('div', 'atmo-rails', atmo); el('i', '', rails); el('i', '', rails);
    if(D.body.hasAttribute('data-atmo-frame')) atmo.classList.add('has-frame');
    D.body.appendChild(atmo);

    marks = el('div', 'atmo-marks');
    marks.setAttribute('aria-hidden', 'true');
    D.body.appendChild(marks);
  }

  function makeGrain(){
    var dpr = Math.min(2, Math.max(1, W.devicePixelRatio || 1));
    var cfg = GRAIN[variant] || GRAIN.a;
    grainEls.forEach(function(g){
      toURL(grainTile(cfg, dpr), function(url){
        g.style.backgroundImage = 'url("' + url + '")';
        g.style.backgroundSize = cfg.size + 'px ' + cfg.size + 'px';
      });
    });
  }

  var cloudsReady = false;
  function makeClouds(){
    if(cloudsReady) return; cloudsReady = true;
    toURL(cloudsCanvas(), function(url){ clouds.firstChild.style.backgroundImage = 'url("' + url + '")'; });
  }

  function defaultLight(){
    var v = D.body.getAttribute('data-atmo-default');
    return LIGHTS[v] ? v : 'day';
  }

  /* ---------- метки в документе ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent){
    var e = D.createElementNS(SVGNS, tag);
    for(var k in attrs) e.setAttribute(k, attrs[k]);
    if(parent) parent.appendChild(e);
    return e;
  }

  /* Кольцо = «где я». Внутренний круг — опора; пунктир — путь вперёд;
     шкала — 12 недель программы (длинные деления) и 84 дня (короткие);
     один узел на пунктире сверху — начало пути. Подписей нет. */
  function ringSVG(R, plain){
    var pad = 24, S = 2*(R+pad), c = S/2;
    var s = svg('svg', {width:S, height:S, viewBox:'0 0 '+S+' '+S, 'class':'atmo-ring', fill:'none'});
    var ln = 'rgba(15,23,34,.09)', ln2 = 'rgba(15,23,34,.15)';
    svg('circle', {cx:c, cy:c, r:R*.6, stroke:ln, 'stroke-width':1}, s);
    svg('circle', {cx:c, cy:c, r:R*.8, stroke:ln2, 'stroke-width':1, 'stroke-dasharray':'1.5 7', 'stroke-linecap':'round'}, s);
    if(!plain){
      var g = svg('g', {'class':'r-dial'}, s), path = '';
      for(var i=0;i<84;i++){
        var a = i/84*Math.PI*2 - Math.PI/2, big = i % 7 === 0;
        var r1 = R - (big ? 9 : 4), r2 = R;
        path += 'M'+(c+Math.cos(a)*r1).toFixed(1)+' '+(c+Math.sin(a)*r1).toFixed(1)+'L'+(c+Math.cos(a)*r2).toFixed(1)+' '+(c+Math.sin(a)*r2).toFixed(1);
      }
      svg('path', {d:path, stroke:'rgba(15,23,34,.15)', 'stroke-width':1}, g);
      svg('circle', {cx:c, cy:c, r:R+14, stroke:'rgba(15,23,34,.05)', 'stroke-width':1}, s);
    }
    svg('circle', {cx:c, cy:c - R*.8, r:4.5, fill:'var(--atmo-node)', stroke:'rgba(15,23,34,.24)', 'stroke-width':1}, s);
    return {el:s, size:S};
  }

  function layout(){
    if(!marks) return;
    marks.style.height = '0px';
    var sy = W.scrollY || W.pageYOffset, vw = HTML.clientWidth;
    marks.innerHTML = ''; rules = []; rings = [];
    var wrap = parseFloat(getComputedStyle(HTML).getPropertyValue('--atmo-frame')) || parseFloat(getComputedStyle(HTML).getPropertyValue('--wrap')) || 1200;   /* v2: рамка в полях страницы (--atmo-frame ставит site-v2.js) */
    var frame = atmo.classList.contains('has-frame') && WIDE.matches;
    var xl = vw/2 - wrap/2, xr = vw/2 + wrap/2 - 1;

    D.querySelectorAll('[data-atmo-rule]').forEach(function(sec){
      var r = sec.getBoundingClientRect(), y = Math.round(r.top + sy);
      if(r.height === 0) return;
      var line = el('div', 'atmo-rule', marks); line.style.top = y + 'px';
      var nodes = [];
      if(frame){
        [xl, xr].forEach(function(x){ var n = el('i', 'atmo-node', marks); n.style.left = (x + .5) + 'px'; n.style.top = (y + .5) + 'px'; nodes.push(n); });
      }
      rules.push({sec:sec, y:y, nodes:nodes});
    });

    D.querySelectorAll('[data-atmo-ring]').forEach(function(t){
      var r = t.getBoundingClientRect(); if(r.width === 0 && r.height === 0) return;
      var v = t.getAttribute('data-atmo-ring') || '', m = v.match(/\d+/);
      var R = m ? +m[0] : Math.min(r.width, r.height) * .5;
      R = Math.max(110, Math.min(R, MOB.matches ? vw*.42 : 560));
      var ring = ringSVG(R, /plain/.test(v));
      ring.el.style.left = (r.left + r.width/2 - ring.size/2) + 'px';
      ring.el.style.top = (r.top + sy + r.height/2 - ring.size/2) + 'px';
      marks.appendChild(ring.el);
    });

    var docH = Math.max(D.body.scrollHeight, HTML.scrollHeight);
    marks.style.height = docH + 'px';
    collect();
    tick();
  }

  function collect(){
    sections = Array.prototype.slice.call(D.querySelectorAll('[data-atmo],[data-atmo-photo]'));
  }

  /* ---------- где я: свет, фото, узел ---------- */
  function tick(){
    raf = 0;
    var vh = W.innerHeight, probe = vh * .5, hit = null;
    for(var i=0;i<sections.length;i++){
      var r = sections[i].getBoundingClientRect();
      if(r.top <= probe && r.bottom > probe) hit = sections[i];   /* вложенные: побеждает последний */
    }
    if(hit !== curSec){
      curSec = hit;
      var L = hit && hit.getAttribute('data-atmo');
      atmo.setAttribute('data-light', LIGHTS[L] ? L : defaultLight());
      setPhoto(hit ? (hit.getAttribute('data-atmo-photo') || '') : '', hit && hit.getAttribute('data-atmo-photo-pos'));
      var cl = hit && hit.hasAttribute('data-atmo-clouds');
      if(cl || variant === 'b'){ makeClouds(); }
      atmo.classList.toggle('has-clouds', !!cl || variant === 'b');
    }
    /* узел: последняя линия секции, которую уже прошли */
    var y = (W.scrollY || W.pageYOffset) + probe, here = -1;
    for(var j=0;j<rules.length;j++) if(rules[j].y <= y) here = j;
    rules.forEach(function(rl, k){ rl.nodes.forEach(function(n){ n.classList.toggle('is-here', k === here); }); });
  }
  function onScroll(){ if(!raf) raf = W.requestAnimationFrame(tick); }

  function setPhoto(src, pos){
    if(pos) atmo.setAttribute('data-photo-pos', pos); else atmo.removeAttribute('data-photo-pos');
    if(src === curPhoto) return;
    curPhoto = src;
    atmo.classList.remove('is-abstract');
    if(!src){ atmo.classList.remove('has-photo'); slots.forEach(function(s){ s.classList.remove('on'); }); return; }
    var go = function(ok){
      if(src !== curPhoto) return;                 /* пока грузилось, уже уехали */
      if(!ok){                                     /* фото нет — растворённое абстрактное */
        makeClouds(); atmo.classList.add('is-abstract'); atmo.classList.remove('has-photo');
        slots.forEach(function(s){ s.classList.remove('on'); }); return;
      }
      var next = slots[slotIx = 1 - slotIx], prev = slots[1 - slotIx];
      next.innerHTML = ''; var img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = src; next.appendChild(img);
      atmo.classList.add('has-photo');
      W.requestAnimationFrame(function(){ next.classList.add('on'); prev.classList.remove('on'); });
    };
    if(photoCache[src] !== undefined){ go(photoCache[src]); return; }
    var probe = new Image();
    probe.onload = function(){ photoCache[src] = true; go(true); };
    probe.onerror = function(){ photoCache[src] = false; go(false); };
    probe.src = src;
  }

  /* ---------- пауза и тишина ---------- */
  function still(){
    var s = RM.matches;
    atmo.classList.toggle('is-still', s); marks.classList.toggle('is-still', s);
  }
  function vis(){
    var h = D.hidden;
    atmo.classList.toggle('is-paused', h); marks.classList.toggle('is-paused', h);
  }

  var rT = 0;
  function onResize(){ clearTimeout(rT); rT = setTimeout(layout, 160); }

  A.init = function(opts){
    if(A.inited) return; A.inited = true;
    opts = opts || {};
    var v = opts.variant || HTML.getAttribute('data-atmo-variant') || 'a';
    variant = GRAIN[v] ? v : 'a';
    build(); makeGrain(); still(); vis();
    layout();
    W.addEventListener('scroll', onScroll, {passive:true});
    W.addEventListener('resize', onResize);
    D.addEventListener('visibilitychange', vis);
    if(RM.addEventListener) RM.addEventListener('change', still);
    if(W.ResizeObserver){ var last = 0; new ResizeObserver(function(){ var h = D.body.scrollHeight; if(Math.abs(h - last) > 2){ last = h; onResize(); } }).observe(D.body); }
    if(D.fonts && D.fonts.ready) D.fonts.ready.then(layout);
    W.addEventListener('load', layout);
  };
  A.refresh = function(){ layout(); };
  A.set = function(lightName){ if(atmo && LIGHTS[lightName]) atmo.setAttribute('data-light', lightName); };

  W.Atmo = A;
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function(){ A.init(); });
  else A.init();
})();
