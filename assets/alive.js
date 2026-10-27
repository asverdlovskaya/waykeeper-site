/* =====================================================================
   Waykeeper · Живые фото · общий слой (пара к assets/alive.css)
   Метка места силы, точки → фото, двойная экспозиция, зерно поверх фото.
   Одна анимация фото за раз: наезд первого экрана останавливается, когда экран ушёл.
   Подключение: <script src="assets/alive.js"></script> в конце <body>.
   ===================================================================== */
(function(){
  'use strict';
  var D = document, RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(s){ return [].slice.call(D.querySelectorAll(s)); }
  /* зерно атмосферы — и поверх фото */
  function grain(n){
    var g = D.querySelector('.atmo-grain'), bg = g && g.style.backgroundImage;
    if(bg && bg !== 'none') D.documentElement.style.setProperty('--alive-grain', bg);
    else if(n < 40) setTimeout(function(){ grain(n + 1); }, 120);
  }
  /* метка стоит в точке СНИМКА (проценты кадра) с учётом обрезки object-fit:cover */
  function pin(){
    $$('[data-alive-pin]').forEach(function(m){
      var box = m.parentNode.querySelector('.alive-deep'), img = box && box.querySelector('img');
      if(!img || !img.naturalWidth || getComputedStyle(m).display === 'none') return;
      var xy = m.getAttribute('data-alive-pin').split(' ').map(Number);
      var bw = box.offsetWidth, bh = box.offsetHeight, iw = img.naturalWidth, ih = img.naturalHeight;
      var sc = Math.max(bw / iw, bh / ih), dw = iw * sc, dh = ih * sc;
      var op = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
      m.style.left = (box.offsetLeft + (bw - dw) * op[0] / 100 + dw * xy[0] / 100) + 'px';
      m.style.top = (box.offsetTop + (bh - dh) * op[1] / 100 + dh * xy[1] / 100) + 'px';
    });
  }
  function init(){
    grain(0);
    var deep = $$('.alive-deep img');
    deep.forEach(function(i){ if(i.complete) pin(); else i.addEventListener('load', pin); });
    addEventListener('resize', pin);
    var IO = 'IntersectionObserver' in window;
    /* наезд первого экрана — только пока экран виден */
    if(IO) $$('.alive-deep, .alive-you').forEach(function(b){
      new IntersectionObserver(function(es){ es.forEach(function(e){ b.classList.toggle('is-off', !e.isIntersecting); }); }).observe(b);
    });
    /* B: точки → фото, один раз */
    var dots = $$('[data-alive-dots]');
    if(IO && !RM){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(!e.isIntersecting) return;
          var el = e.target; el.classList.add('is-in'); io.unobserve(el);
          setTimeout(function(){ el.classList.add('is-done'); }, 2400);
        });
      }, {threshold:.35});
      dots.forEach(function(el){ io.observe(el); });
    } else dots.forEach(function(el){ el.classList.add('is-in', 'is-done'); });
    /* C: доля прохода полосы через экран → смешивание, линия, лёгкий параллакс */
    var bands = $$('[data-alive-band]');
    if(!bands.length) return;
    var ticking = false;
    function tick(){
      ticking = false;
      var vh = innerHeight;
      bands.forEach(function(b){
        var r = b.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) return;
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))), k = RM ? .6 : p;
        b.style.setProperty('--mix', (.15 + .7 * Math.min(1, Math.max(0, (k - .2) / .5))).toFixed(3));
        b.style.setProperty('--line', Math.min(1, Math.max(0, (k - .3) / .35)).toFixed(3));
        b.style.setProperty('--py', RM ? '0px' : ((p - .5) * -40).toFixed(1) + 'px');
      });
    }
    addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(tick); } }, {passive:true});
    addEventListener('resize', tick); tick();
  }
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
