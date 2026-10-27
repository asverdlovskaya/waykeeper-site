/* =====================================================================
   Главная · «Хаос собирается» (00-ix-spec.md, 4.1 вариант А и 5.1), перенос с главной v1.
   Без интеракции. Невидимые точки-притяжения (data-attract) в сцене .hm-stage вокруг
   вида первого экрана: 0–0,8 с редкий неровный шум, затем медленно стягиваются в три
   спокойные формы у краёв листа (на самом листе знаков нет: поле лежит под картинкой).
   Возврат в той же вкладке и «уменьшить движение» — сразу итог. Телефон: схождение
   начинается, когда вид въезжает в экран, 4 с. field.js не меняется.
   ===================================================================== */
(function(){
  'use strict';
  var KEY = 'waykeeper.home.gathered';
  var MQ = window.matchMedia('(max-width: 760px)');
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* формы вокруг фото: центр относительно фото (доли его ширины/высоты + px), полуоси, наклон, вес */
  /* три формы, разные по размеру и не по сторонам света: большая вытянутая уходит за фото по диагонали,
     средняя ниже, маленькая справа тянется к белому месту, где проступит координата */
  /* формы в долях сцены (= места фото справа): большая ложится туманом под гору, средняя — в небо у левого склона,
     маленькая — у правого края внизу. На самом кадре знаков нет: он не «пачкается» */
  var CL_DESK = [
    {fx:-.07, fy:.70, dx:0, dy:0, rx:34,  ry:200, rot:.10, w:11},
    {fx:.80,  fy:-.05, dx:0, dy:0, rx:130, ry:18, rot:-.06, w:6},
    {fx:.30,  fy:1.03, dx:0, dy:0, rx:120, ry:12, rot:.02,  w:4}
  ];
  var CL_MOB = [
    {fx:.50, fy:-.04, dx:0, dy:0, rx:150, ry:12, rot:-.03, w:7},
    {fx:.10, fy:1.02, dx:0, dy:0, rx:60,  ry:9,  rot:.04,  w:3},
    {fx:.92, fy:.60,  dx:0, dy:0, rx:8,   ry:60, rot:0,    w:2}
  ];

  function rnd(a, b){ return a + Math.random()*(b - a); }
  function clamp(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }

  var stage, gather, frame, zone, pts = [], T0 = 0, dur = 6, running = false, done = false, mobile = MQ.matches, raf = 0;

  /* 26.10, решение Саши: серые скопления знаков и кольца вокруг картины читаются как шум и спорят с ней.
     Картина теперь проявляется сама (.plate-alive, site-v2.js); точки-притяжения вокруг листа не ставим. */
  var GATHER = false;
  function build(){
    gather.innerHTML = ''; pts = [];
    if(!GATHER) return;
    var CL = mobile ? CL_MOB : CL_DESK, n = 0;
    CL.forEach(function(c, ci){
      for(var k=0; k<Math.round(c.w*2.5); k++){
        /* точка внутри эллипса формы: ближе к центру гуще */
        var ang = rnd(0, 6.2832), rr = Math.pow(Math.random(), .8)*.95;
        var el = document.createElement('span');
        gather.appendChild(el);
        pts.push({el:el, c:ci, u:Math.cos(ang)*rr, v:Math.sin(ang)*rr,
          sx:Math.random(), sy:Math.random(),               /* разброс шума — доли зоны */
          ph:rnd(0, 6.28), dl:Math.random()*.18,             /* дрожь и небольшая разница во времени */
          a1:rnd(.24, .36) * (1 - rr*.5), s1:rnd(22, 36) * (mobile ? .8 : 1)});
        n++;
      }
    });
  }

  function place(t){
    var sr = stage.getBoundingClientRect(), fr = frame.getBoundingClientRect(), zr = zone.getBoundingClientRect();
    if(!sr.width) return;
    var px = fr.left - sr.left, py = fr.top - sr.top, pw = fr.width, ph = fr.height;
    var zl = zr.left - sr.left, zt = zr.top - sr.top, zw = zr.width, zh = zr.height;
    var CL = mobile ? CL_MOB : CL_DESK;
    var noise = .8*(dur/6), tg = t - noise, span = dur - noise;
    for(var i=0; i<pts.length; i++){
      var p = pts[i], c = CL[p.c];
      var u = done ? 1 : clamp((tg/span - p.dl)/(1 - p.dl));
      var e = 1 - Math.pow(1 - u, 3);
      /* после схождения формы почти неподвижны: дрейф вдвое медленнее обычного */
      var dt = done ? t : 0;
      var cx = px + c.fx*pw + c.dx + 9*Math.sin(dt*.05 + p.c*1.7);
      var cy = py + c.fy*ph + c.dy + 7*Math.cos(dt*.04 + p.c*2.3);
      var co = Math.cos(c.rot), si = Math.sin(c.rot);
      var tx = cx + p.u*c.rx*co - p.v*c.ry*si, ty = cy + p.u*c.rx*si + p.v*c.ry*co;
      var x0 = zl + 20 + p.sx*(zw - 40), y0 = zt + 20 + p.sy*(zh - 40);
      var j = (1 - e)*2.4;                                   /* лёгкая дрожь шума */
      var x = x0 + (tx - x0)*e + j*Math.sin(t*7 + p.ph), y = y0 + (ty - y0)*e + j*Math.cos(t*6 + p.ph*1.3);
      var a = .42 + (p.a1 - .42)*e, s = 8 + (p.s1 - 8)*e;
      p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      p.el.setAttribute('data-attract', 'ink ' + a.toFixed(3) + ' ' + s.toFixed(1));
    }
  }

  function finish(){
    done = true;
    try{ sessionStorage.setItem(KEY, '1'); }catch(e){}
  }

  function tick(now){
    var t = (now - T0)/1000;
    if(!done && t >= dur) finish();
    place(t);
    raf = requestAnimationFrame(tick);
  }

  function start(){
    if(running) return; running = true;
    T0 = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function showFinal(){
    done = true;
    place(0);
    if(window.Field) Field.poke();
  }

  /* при прокрутке ниже первого экрана — стоп, вернулся — дальше дрейф */
  function watchVisibility(){
    if(!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!done) return;
        if(e.isIntersecting){ if(!raf && !RM){ raf = requestAnimationFrame(tick); } }
        else if(raf){ cancelAnimationFrame(raf); raf = 0; }
      });
    }, {rootMargin:'200px'}).observe(stage);
  }

  function setHeroZone(){
    /* телефон: за текстом поле очень бледное (0,15), полоса — за фото */
    document.getElementById('top').setAttribute('data-field', mobile ? '.15' : '0');
  }

  document.addEventListener('DOMContentLoaded', function(){
    stage = document.getElementById('hero-stage');
    gather = stage.querySelector('.hm-gather');
    frame = document.querySelector('.hm-plate .pa-img');
    zone = stage.querySelector('.hm-zone');
    setHeroZone();
    build();

    /* без большой формы сверху справа (она спорила бы со схождением) и без формы у правого края:
       правый край остаётся белым; одна тихая форма слева внизу */
    Field.init({blobs:[]});

    var seen = false; try{ seen = sessionStorage.getItem(KEY) === '1'; }catch(e){}
    if(RM || seen){ showFinal(); if(!RM){ running = true; T0 = performance.now(); raf = requestAnimationFrame(tick); } }
    else {
      place(0);
      if(mobile && 'IntersectionObserver' in window){
        dur = 4;
        var io = new IntersectionObserver(function(es){
          if(es.some(function(e){ return e.isIntersecting; })){ io.disconnect(); start(); }
        }, {threshold:.25});
        io.observe(frame);
      } else start();
    }
    watchVisibility();

    window.addEventListener('resize', function(){
      if(MQ.matches !== mobile){ mobile = MQ.matches; setHeroZone(); build(); place(done ? (performance.now() - T0)/1000 : 0); if(window.Field) Field.refresh(); }
      else if(RM && window.Field){ place(0); Field.poke(); }
    });
  });
})();
