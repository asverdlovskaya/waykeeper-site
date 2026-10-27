/* Главная на телефоне — вариант A «под кат» (решение Саши 27.10; образец options-v2/reveal/m-home-a.html).
   Работает только до 760 px (стили в home-mobile.css); на ноутбуке страница как есть.
   Кнопка «Как устроен „Переход“» в первом экране; «Работа со мной» поднята выше базы знаний;
   длинное прячется под «Показать ещё» / «Читать дальше» (строки одобрены Сашей). */
(function(){
  var D = document, H = D.documentElement, V = H.getAttribute('data-mh');
  function $(s, r){ return (r || D).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  /* кнопка в первый экран — та же надпись, что у карточки «Перехода» ниже */
  var ct = $('.hm-cover .cover-text');
  if(ct){ var a = D.createElement('div'); a.className = 'actions mh-cta'; a.innerHTML = '<a class="btn primary" href="program.html">Как устроен «Переход» →</a><a class="link mh-start" href="#start">С чего начать ↓</a>'; ct.appendChild(a); }
  /* под кат: прячем всё после первых keep, кнопка раскрывает */
  function cut(after, items, keep, label){
    items = items.filter(Boolean); if(items.length <= keep) return;
    var hid = items.slice(keep); hid.forEach(function(el){ el.classList.add('mh-hidden'); });
    var b = D.createElement('button'); b.type = 'button'; b.className = 'mh-more'; b.textContent = label || 'Показать ещё';
    b.addEventListener('click', function(){ hid.forEach(function(el){ el.classList.remove('mh-hidden'); }); b.remove(); });
    after.insertAdjacentElement('afterend', b);
  }
  var whoProse = $('.hm-who-intro .prose');
  if(whoProse){ var whoRest = $$('p', whoProse).slice(1).concat([$('.hm-parts-lead'), $('.hm-parts'), $('.hm-parts-choose')]);
    whoRest.forEach(function(el){ if(el) el.classList.add('mh-hidden'); });
    cut($('.hm-who-intro .s-6'), [whoProse].concat(whoRest), 1, 'Читать дальше'); }
  var proj = $('.hm-project .prose'); if(proj) cut($('.hm-project .band-main'), $$('p', proj).concat(V === 'a' ? [$('.hm-route')] : []), 1, 'Читать дальше');
  var me = $('.hm-me-text'); if(me) cut(me.lastElementChild, [$('.prose', me).firstElementChild, $('.lede-em', me), $$('.prose', me)[1]], 1, 'Читать дальше');
  if(V === 'a'){
    var ix = $('.hm-sit .index'); if(ix) cut(ix, $$('li', ix).concat([$('.hm-deep')]), 4);
    var kt = $('.hm-kb .tiles');
    if(kt){ var tl = $$('.tile', kt), more = tl.slice(2);
      tl.slice(0, 2).forEach(function(t){ var ps = $$('p', t); if(ps[1] && !ps[1].classList.contains('tile-go')) more.push(ps[1]); });
      cut(kt, [D.createElement('i')].concat(more), 1); }
    var tr = $('.hm-tries'); if(tr) cut(tr, $$('li', tr), 2);
  }
})();
