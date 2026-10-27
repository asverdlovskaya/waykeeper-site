/* «Новый сезон»: два слоя и практика «Три момента года».
   Контейнер: <div data-module="season" data-clear></div>
   Необязательно: data-intro="none" — без вводного абзаца в слое (если он уже есть на странице);
                  data-cta="none" — без кнопки «Записаться в список ожидания».
   Ничего не отправляется: ответы хранятся в этом браузере (localStorage), как во всех практиках;
   «Стереть ответы» — в два нажатия («Точно стереть?», 3 с). Правка 27.10, patches/states.md.
   Видимых подсказок нет: куда нажать, показывает дышащее кольцо на линии; что дальше — кольца
   следующего сезона, которые проявляются с каждым моментом. Клавиатурная подсказка — только в aria. */
(function(){
'use strict';

var MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
var KEY = 'wk-season-v1';
var MAX = 3;
var CUT = 640;          // уже этого — слои друг под другом, линия года вертикальная

var TXT = {
  pastH: 'Увидеть свой год',
  pastP: 'Вспомни три момента этого года, которые, кажется, вспомнятся и через пять лет. Не обязательно хорошие, просто важные.',
  nextH: 'Выбрать, куда дальше',
  nextP: 'Два-три фокуса, чтобы не распыляться на тысячу разных штук.',
  end: 'Так выглядит первая часть итога, который ты соберёшь на встречах.',
  note: 'Ответы остаются у тебя в браузере. Если сейчас совсем тяжело, сначала врач или психолог.',
  cta: 'Записаться в список ожидания',
  tgText: 'Привет! Хочу в список ожидания «Нового сезона». Напиши, когда появятся даты.',
  clear: 'Стереть ответы',
  clearSure: 'Точно стереть?',
  edit: 'что это было?',
  change: 'что он поменял?',
  focus: 'одно слово'
};

var uid = 0;
function el(tag, cls, attrs){
  var n = document.createElement(tag);
  if(cls) n.className = cls;
  if(attrs) for(var k in attrs){ if(attrs[k] !== null) n.setAttribute(k, attrs[k]); }
  return n;
}
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function smooth(t){ return t*t*(3 - 2*t); }
function monthOf(t){ return Math.min(11, Math.floor(t*12)); }
function rm(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
function fine(){ return window.matchMedia && matchMedia('(pointer: fine)').matches; }

function load(){
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw){                                   // ответы, записанные до правки (только в этой вкладке), переносим
      raw = sessionStorage.getItem(KEY);
      if(raw){ localStorage.setItem(KEY, raw); sessionStorage.removeItem(KEY); }
    }
    var s = JSON.parse(raw); if(s && s.m && s.f) return s;
  }catch(e){}
  return null;
}
function fresh(){ return {m:[], f:['','',''], phase:0, front:'past'}; }

function mount(root){
  if(root.__ns) return; root.__ns = true;
  var id = 'ns' + (++uid);
  var S = load() || fresh();
  var editing = null;      // индекс момента в поле ввода
  var isNew = false;       // момент только что поставлен
  var cur = 5;             // месяц под клавиатурным курсором
  var G = null;            // геометрия линии
  var moving = false;      // слои меняются местами — связи ждут
  var step = 'x';          // поле ввода: 'x' — сам момент, 'c' — что он поменял
  var noCta = root.getAttribute('data-cta') === 'none';
  var kbd = false;         // последний момент поставлен с клавиатуры
  var closedAt = 0;        // когда поле закрылось по касанию мимо — это касание момент не ставит

  /* ---------- разметка ---------- */
  root.innerHTML = '';
  var wrap = el('div', 'ns ns-h ns-noanim');
  var stage = el('div', 'ns-stage');

  var past = el('section', 'ns-layer ns-past', {'aria-labelledby': id+'-ph'});
  var phd = el('div', 'ns-hd');
  var ph = el('h3', null, {id: id+'-ph'}); ph.textContent = TXT.pastH;
  // data-intro="none": страница сама даёт вводный абзац над модулем — в слое его не повторяем
  var noIntro = root.getAttribute('data-intro') === 'none';
  var pp = ph;
  phd.appendChild(ph);
  if(!noIntro){ pp = el('p'); pp.textContent = TXT.pastP; phd.appendChild(pp); }
  var year = el('div', 'ns-year');
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class','ns-svg'); svg.setAttribute('aria-hidden','true');
  var line = document.createElementNS(svgNS, 'path'); line.setAttribute('class','ns-line');
  var ticks = document.createElementNS(svgNS, 'g');
  svg.appendChild(line); svg.appendChild(ticks);
  var track = el('div', 'ns-track', {
    tabindex: '0', role: 'slider', 'aria-label': 'Линия года',
    'aria-valuemin': '1', 'aria-valuemax': '12', 'aria-describedby': id+'-kh'
  });
  var kh = el('span', 'ns-sr', {id: id+'-kh'}); kh.textContent = 'Стрелками выбери месяц, Enter — поставить момент.';
  var ghost = el('span', 'ns-ghost', {'aria-hidden':'true'});
  var gmo = el('b', 'ns-mo'); ghost.appendChild(el('i')); ghost.appendChild(gmo);
  var gfield = el('em', 'ns-gfield'); gfield.textContent = TXT.edit; ghost.appendChild(gfield);
  var pts = el('div', 'ns-pts');
  // textarea, а не input: длинная строка переносится, а не обрезается; Enter не переносит, а сохраняет
  var edit = el('textarea', 'ns-edit', {rows:'1', maxlength:'36', placeholder: TXT.edit, 'aria-label':'Момент года', autocomplete:'off', spellcheck:'false', enterkeyhint:'done', hidden:''});
  year.appendChild(svg); year.appendChild(track); year.appendChild(ghost); year.appendChild(pts); year.appendChild(edit);
  var liftPast = el('button', 'ns-lift', {type:'button', 'aria-label':'Вернуть вперёд: '+TXT.pastH, hidden:''});
  past.appendChild(phd); past.appendChild(year); past.appendChild(kh); past.appendChild(liftPast);

  var next = el('section', 'ns-layer ns-next', {'aria-labelledby': id+'-nh'});
  var nhd = el('div', 'ns-hd');
  var nh = el('h3', null, {id: id+'-nh'}); nh.textContent = TXT.nextH;
  var np = el('p'); np.textContent = TXT.nextP;
  nhd.appendChild(nh); nhd.appendChild(np);
  var route = document.createElementNS(svgNS, 'svg'); route.setAttribute('class','ns-route'); route.setAttribute('aria-hidden','true');
  var routeP = document.createElementNS(svgNS, 'path'); route.appendChild(routeP);
  next.appendChild(nhd); next.appendChild(route);
  var coords = [], inputs = [];
  for(var i=0; i<MAX; i++){
    var c = el('div', 'ns-coord');
    var r = el('i', 'ns-ring', {'aria-hidden':'true'});
    var inp = el('textarea', 'ns-focus', {rows:'1', maxlength:'24', placeholder: TXT.focus, 'aria-label':'Фокус '+(i+1), autocomplete:'off', spellcheck:'false'});
    c.appendChild(r); c.appendChild(inp); next.appendChild(c);
    coords.push(c); inputs.push(inp);
  }
  var liftNext = el('button', 'ns-lift', {type:'button', 'aria-label':'Вернуть вперёд: '+TXT.nextH, hidden:''});
  next.appendChild(liftNext);

  var links = document.createElementNS(svgNS, 'svg'); links.setAttribute('class','ns-links'); links.setAttribute('aria-hidden','true');
  stage.appendChild(past); stage.appendChild(next); stage.appendChild(links);

  var end = el('div', 'ns-end', {hidden:''});
  var endP = el('p'); endP.textContent = TXT.end;
  end.appendChild(endP);
  var cta = endP;
  if(!noCta){
    // адрес берём у кнопки шапки, которую site.js уже исправил (эта кнопка рисуется позже него)
    var tgSrc = document.querySelector('.site-head a[data-tg]'), tgHref = tgSrc && /^https?:/.test(tgSrc.getAttribute('href') || '') ? tgSrc.getAttribute('href') : '#telegram';
    // готовый текст сообщения: site.js тоже читает data-tg-text (если кнопка нажата до того, как адрес подставлен)
    if(tgHref !== '#telegram') tgHref = tgHref.split('?')[0] + '?text=' + encodeURIComponent(TXT.tgText);
    cta = el('a', 'ns-cta btn quiet glass', {href: tgHref, 'data-tg':'', 'data-tg-text': TXT.tgText});
    if(tgHref !== '#telegram'){ cta.setAttribute('target', '_blank'); cta.setAttribute('rel', 'noopener'); }
    cta.textContent = TXT.cta; end.appendChild(cta);
  }
  else endP.setAttribute('tabindex', '-1');
  var foot = el('div', 'ns-foot');
  var note = el('p', 'ns-note'); note.textContent = TXT.note;
  var clr = el('button', 'ns-clear', {type:'button', hidden:''}); clr.textContent = TXT.clear;
  foot.appendChild(note); foot.appendChild(clr);
  var live = el('p', 'ns-sr', {'aria-live':'polite'});

  wrap.appendChild(stage); wrap.appendChild(end); wrap.appendChild(foot); wrap.appendChild(live);
  root.appendChild(wrap);

  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
  function say(t){ live.textContent = ''; setTimeout(function(){ live.textContent = t; }, 60); }
  function filled(){ return S.m.filter(function(m){ return m.x; }).length; }
  // поле растёт по тексту, а не прячет его
  function grow(t){ t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

  /* ---------- геометрия линии года ---------- */
  function geo(){
    var W = year.clientWidth, H = year.clientHeight, v = wrap.classList.contains('ns-v');
    if(!v){
      var x0 = 40, x1 = W - 40;
      return { v:false, W:W, H:H,
        at: function(t){ return {x: x0 + t*(x1-x0), y: H*(0.80 - 0.50*smooth(t))}; },
        tOf: function(px){ return clamp((px - x0)/(x1 - x0), 0, 1); },
        off: function(px, py, t){ return Math.abs(py - this.at(t).y); } };
    }
    var y0 = phd.offsetTop + phd.offsetHeight + 44, y1 = H - 64;
    return { v:true, W:W, H:H,
      at: function(t){ return {x: 40 + 14*Math.sin(t*Math.PI), y: y0 + t*(y1-y0)}; },
      tOf: function(px, py){ return clamp((py - y0)/(y1 - y0), 0, 1); },
      // телефон: попадать в тонкую линию не нужно — касание в любом месте ряда ставит момент на этот месяц
      off: function(px, py){ return (py < y0 - 22 || py > y1 + 22) ? 999 : 0; } };
  }

  function drawLine(){
    G = geo();
    svg.setAttribute('viewBox', '0 0 '+G.W+' '+G.H);
    var d = '';
    for(var k=0; k<=80; k++){ var p = G.at(k/80); d += (k ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }
    line.setAttribute('d', d);
    var th = '';
    for(var m=0; m<12; m++){
      var q = G.at((m+.5)/12);
      th += G.v ? '<line class="ns-tick" x1="'+(q.x-4)+'" x2="'+(q.x+4)+'" y1="'+q.y+'" y2="'+q.y+'"/>'
                : '<line class="ns-tick" x1="'+q.x+'" x2="'+q.x+'" y1="'+(q.y-4)+'" y2="'+(q.y+4)+'"/>';
    }
    ticks.innerHTML = th;
  }

  /* ---------- моменты ---------- */
  function sorted(){ return S.m.map(function(m, i){ return {m:m, i:i}; }).sort(function(a, b){ return a.m.t - b.m.t; }); }

  function renderPts(){
    pts.innerHTML = '';
    S.m.forEach(function(m, i){
      var p = G.at(m.t);
      var b = el('button', 'ns-pt' + (m.x ? '' : ' is-empty') + (isNew && i === S.m.length-1 ? ' is-new' : '') + (editing === i ? ' is-edit' : ''), {
        type:'button', 'data-i': i,
        'aria-label': (m.x ? m.x : 'Момент без подписи') + (m.c ? ' — ' + m.c : '') + ', ' + MONTHS[monthOf(m.t)] + '. Enter — изменить, Delete — убрать.'
      });
      b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
      if(m.x && editing !== i){
        var cp = el('span', 'ns-cap', {'aria-hidden':'true'}); cp.textContent = m.x;
        if(m.c){ var ch = el('span', 'ns-chg'); ch.textContent = m.c; cp.appendChild(ch); }
        b.appendChild(cp);
      }
      var mo = el('span', 'ns-mo', {'aria-hidden':'true'}); mo.textContent = MONTHS[monthOf(m.t)]; b.appendChild(mo);
      pts.appendChild(b);
    });
    layoutCaps();
    isNew = false;
  }

  function rectIn(n, base){ var a = n.getBoundingClientRect(), o = base.getBoundingClientRect(); return {l:a.left-o.left, t:a.top-o.top, r:a.right-o.left, b:a.bottom-o.top}; }
  function hit(a, b){ return a.l < b.r + 6 && a.r + 6 > b.l && a.t < b.b + 4 && a.b + 4 > b.t; }

  // подписи не должны налезать на заголовок, подсказку и друг на друга
  function layoutCaps(){
    var obs = [rectIn(ph, year), rectIn(pp, year)];
    var placed = [];
    sorted().forEach(function(o){
      var b = pts.querySelector('[data-i="'+o.i+'"]'); if(!b) return;
      var cp = b.querySelector('.ns-cap'), mo = b.querySelector('.ns-mo');
      if(!cp){ placed.push(rectIn(b, year)); return; }
      if(!G.v){
        cp.style.setProperty('--dx', '0px');
        var a = rectIn(cp, year);
        var dx = 0; if(a.l < 12) dx = 12 - a.l; if(a.r > G.W - 12) dx = G.W - 12 - a.r;
        cp.style.setProperty('--dx', dx + 'px'); a = rectIn(cp, year);
        var bad = obs.concat(placed).some(function(z){ return hit(a, z); });
        if(bad){ cp.classList.add('is-down'); mo.classList.add('is-up'); a = rectIn(cp, year); }
        placed.push(a);
      } else {
        var p = G.at(o.m.t);
        cp.style.setProperty('--mw', Math.max(120, G.W - p.x - 64) + 'px');
        cp.style.setProperty('--dy', '0px');
        var a2 = rectIn(cp, year), dy = 0;
        placed.forEach(function(z){ if(hit(a2, z) && z.b + 4 - a2.t > dy) dy = z.b + 4 - a2.t; });
        if(dy){ cp.style.setProperty('--dy', dy + 'px'); a2 = rectIn(cp, year); }
        mo.style.top = (cp.offsetTop + cp.offsetHeight + 2) + 'px';   // месяц — под подписью, а не поверх строки «что поменял»
        placed.push(a2);
      }
    });
  }

  function setHint(){
    var n = S.m.length;
    track.setAttribute('aria-valuenow', cur+1);
    track.setAttribute('aria-valuetext', MONTHS[cur] + (n < MAX ? '' : '. Три момента уже стоят.'));
    showGhost(0, false);
  }

  // пока на линии пусто, на ней дышит кольцо: сюда можно нажать (вместо строки-подсказки)
  function idle(){ return S.m.length === 0 && editing === null && S.phase === 0; }
  function showGhost(t, on){
    ghost.classList.remove('is-idle');
    if(!on && idle()){ t = (cur + .5)/12; ghost.classList.add('is-idle'); on = true; }
    if(!on || S.m.length >= MAX || editing !== null){ ghost.classList.remove('is-on'); return; }
    var p = G.at(t);
    ghost.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
    gmo.textContent = MONTHS[monthOf(t)];
    gmo.classList.toggle('is-up', false);
    ghost.classList.add('is-on');
  }

  function near(t){
    for(var i=0; i<S.m.length; i++){ if(Math.abs(S.m[i].t - t) < 0.035) return i; }
    return -1;
  }

  function place(t){
    if(S.phase > 0 && S.front !== 'past') return;
    if(editing !== null){ closeEdit(true, false); if(S.m.length >= MAX) return; }
    var j = near(t);
    if(j > -1){ openEdit(j); return; }
    if(S.m.length >= MAX) return;
    S.m.push({t: t, x: ''});
    isNew = true;
    openEdit(S.m.length - 1);
  }

  function openEdit(i, st){
    editing = i; step = st || 'x';
    showGhost(0, false);
    renderPts();
    var m = S.m[i], p = G.at(m.t);
    edit.hidden = false;
    edit.value = step === 'x' ? m.x : (m.c || '');
    edit.placeholder = step === 'x' ? TXT.edit : TXT.change;
    edit.maxLength = step === 'x' ? 36 : 48;
    edit.setAttribute('aria-label', step === 'x' ? 'Момент года' : 'Что он поменял. Можно пропустить: Enter или Escape.');
    edit.classList.toggle('is-change', step === 'c');
    var w = G.v ? Math.min(260, G.W - p.x - 36) : 220;
    edit.style.width = w + 'px';
    placeEdit();
    edit.focus({preventScroll: true});
  }

  // поле над точкой, нижним краем на 24 px выше линии; если сверху мешает заголовок — под линией.
  // На телефоне — справа от точки, растёт вниз.
  function placeEdit(){
    if(editing === null) return;
    grow(edit);
    var p = G.at(S.m[editing].t), w = edit.offsetWidth, h = edit.offsetHeight;
    if(G.v){ edit.style.left = (p.x + 20) + 'px'; edit.style.top = (p.y - 18) + 'px'; return; }
    var l = clamp(p.x - w/2, 12, G.W - w - 12);
    var top = p.y - 24 - h;
    var hr = rectIn(pp, year);
    if(top < hr.b + 6 && l < hr.r) top = p.y + 24;
    edit.style.left = l + 'px'; edit.style.top = top + 'px';
  }

  // advance: Enter после самого момента ведёт к необязательной строке «что он поменял?»
  function closeEdit(keep, advance, byBlur){
    if(editing === null) return;
    if(byBlur) closedAt = Date.now();
    var i = editing, v = edit.value.replace(/\s+/g, ' ').trim();
    editing = null; edit.hidden = true;
    if(step === 'c'){
      if(keep){ S.m[i].c = v; }
    } else {
      if(keep && v){ S.m[i].x = v; }
      else if(!S.m[i].x || (keep && !v)){ S.m.splice(i, 1); }
      if(keep && v){
        say('Момент ' + filled() + ' из 3: ' + v + ', ' + MONTHS[monthOf(S.m[i].t)] + '.');
        if(advance){ save(); openEdit(i, 'c'); return; }
      }
    }
    step = 'x';
    save(); renderPts(); setHint(); refresh();
    var n = filled();
    if(S.phase === 0 && n === MAX){ setTimeout(release, rm() ? 0 : 450); }
    else if(kbd){ track.focus({preventScroll:true}); }
    else if(document.activeElement === edit){ edit.blur(); }
  }

  function removeAt(i){
    S.m.splice(i, 1); save(); renderPts(); setHint(); refresh();
    say('Момент убран.');
    track.focus({preventScroll:true});
  }

  /* ---------- слои ---------- */
  function setFront(which, focus){
    S.front = which; save();
    var pf = which === 'past';
    past.classList.toggle('ns-front', pf); past.classList.toggle('ns-back', !pf);
    next.classList.toggle('ns-front', !pf); next.classList.toggle('ns-back', pf);
    var open = S.phase > 0;
    liftPast.hidden = !(open && !pf); liftNext.hidden = !(open && pf);
    setInert(year, !pf); setInert(next.querySelector('.ns-hd'), pf);
    coords.forEach(function(c){ setInert(c, pf || !open); });
    if(focus){
      if(pf) track.focus({preventScroll:true});
      else if(fine()) inputs[firstEmpty()].focus({preventScroll:true});
    }
    if(rm()){ drawLinks(); return; }
    moving = true; links.innerHTML = '';
    clearTimeout(setFront.t);
    setFront.t = setTimeout(function(){ moving = false; drawLinks(); }, 900);
  }
  function setInert(n, on){ if(on){ n.setAttribute('inert',''); n.setAttribute('aria-hidden','true'); } else { n.removeAttribute('inert'); n.removeAttribute('aria-hidden'); } }
  function firstEmpty(){ for(var i=0; i<MAX; i++){ if(!S.f[i]) return i; } return 0; }

  function release(){
    if(S.phase > 0 || filled() < MAX) return;
    S.phase = 1;
    next.classList.remove('ns-pre');
    setFront('next', true);
    say('Прошлый сезон ушёл назад. Впереди следующий: можно назвать до трёх фокусов одним словом или оставить на встречу.');
    if(wrap.classList.contains('ns-v')) next.scrollIntoView({behavior: rm() ? 'auto' : 'smooth', block: 'center'});
    finish();     // итог и кнопка — сразу; фокусы называть по желанию, отдельная кнопка «дальше» не нужна
  }

  // нажатие на следующий сезон, пока он закрыт: прошлый слой коротко отзывается, кольцо на линии вспыхивает
  function nudge(){
    if(S.phase > 0) return;
    if(wrap.classList.contains('ns-v')){
      var r = past.getBoundingClientRect();
      if(r.top < 0) past.scrollIntoView({behavior: rm() ? 'auto' : 'smooth', block: 'start'});
    }
    wrap.classList.remove('ns-nudge'); void wrap.offsetWidth; wrap.classList.add('ns-nudge');
    clearTimeout(nudge.t); nudge.t = setTimeout(function(){ wrap.classList.remove('ns-nudge'); }, 1400);
  }

  function finish(){
    if(S.phase < 2){ S.phase = 2; save(); }
    end.hidden = false;
    refresh();
  }

  /* ---------- маршрут и связи ---------- */
  // ближняя координата ниже и левее, дальняя выше и правее — как линия года
  // на телефоне маршрут в верхней трети слоя, над заголовком
  var SPOTS = { h: [[.20,.42], [.50,.28], [.80,.14]], v: [[.22,.34], [.52,.22], [.80,.10]] };
  var FADE = [1, .7, .45];
  function placeCoords(){
    var v = wrap.classList.contains('ns-v'), set = SPOTS[v ? 'v' : 'h'];
    var W = next.clientWidth, H = next.clientHeight;
    route.setAttribute('viewBox', '0 0 '+W+' '+H);
    var pp2 = set.map(function(s){ return [s[0]*W, s[1]*H]; });
    var n = filled(), fw = Math.min(170, Math.round(W*(v ? .36 : .30)));
    coords.forEach(function(c, i){
      c.style.left = pp2[i][0] + 'px'; c.style.top = pp2[i][1] + 'px';
      ringOp(i, n);
      c.classList.toggle('is-named', !!S.f[i]);
      // поле фокуса шире прежнего и не вылезает за край слоя
      var inp = inputs[i];
      inp.style.width = fw + 'px';
      inp.style.left = (clamp(pp2[i][0] - fw/2, 14, W - fw - 14) - pp2[i][0]) + 'px';
      grow(inp);
    });
    var a = pp2[0], b = pp2[MAX-1];
    if(!(b[0] - a[0])) return;   // слой ещё без размера (скрыт или пересчитывается) — линию нарисуем при следующем пересчёте
    var k0 = (b[1]-a[1])/(b[0]-a[0]);
    routeP.setAttribute('d', 'M0 ' + (a[1] - k0*a[0]).toFixed(1) + ' L' + pp2.map(function(p){ return p[0].toFixed(1)+' '+p[1].toFixed(1); }).join(' L') +
      ' L' + W + ' ' + (b[1] + k0*(W - b[0])).toFixed(1));
  }

  // кольцо следующего сезона проявляется, когда для него есть момент: без слов видно, куда всё идёт
  // на компьютере ближнее кольцо закрыто передним слоем, поэтому до открытия проявляем с дальнего
  function ringOp(i, n){
    var k = (S.phase === 0 && !wrap.classList.contains('ns-v')) ? MAX - 1 - i : i;
    coords[i].querySelector('.ns-ring').style.opacity = (S.f[i] || k < n) ? 1 : FADE[i];
  }

  function drawLinks(){
    // до открытия связи рисуем только на телефоне: на компьютере их концы спрятаны под передним слоем
    if(moving || (S.phase === 0 && !wrap.classList.contains('ns-v'))){ links.innerHTML = ''; return; }
    var o = stage.getBoundingClientRect();
    links.setAttribute('viewBox', '0 0 ' + o.width + ' ' + o.height);
    var h = '';
    sorted().forEach(function(s, k){
      if(k >= MAX) return;
      var b = pts.querySelector('[data-i="'+s.i+'"]'); if(!b || !s.m.x) return;
      var a = b.getBoundingClientRect(), c = coords[k].querySelector('.ns-ring').getBoundingClientRect();
      var x1 = a.left + a.width/2 - o.left, y1 = a.top + a.height/2 - o.top;
      var x2 = c.left + c.width/2 - o.left, y2 = c.top + c.height/2 - o.top;
      var d;
      if(wrap.classList.contains('ns-v')){
        // телефон: связи уходят влево и идут вниз по своим дорожкам, не пересекаясь
        var L = 10 + 6*k, r = 8;
        x1 -= 7; x2 -= 10;
        d = 'M' + x1 + ' ' + y1 + ' H' + (L + r) + ' Q' + L + ' ' + y1 + ' ' + L + ' ' + (y1 + r) +
            ' V' + (y2 - r) + ' Q' + L + ' ' + y2 + ' ' + (L + r) + ' ' + y2 + ' H' + x2;
      } else {
        x1 += 7; x2 -= 10;
        var mx = (x1 + x2)/2;
        d = 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ',' + mx + ' ' + y2 + ',' + x2 + ' ' + y2;
      }
      h += '<path class="' + (S.f[k] ? 'is-warm' : '') + (S.phase === 0 ? ' is-pre' : '') + '" style="animation-delay:' + (S.phase === 0 ? 0 : k*0.18) + 's" d="' + d.replace(/(\d+\.\d{2})\d+/g, '$1') + '"/>';
    });
    links.innerHTML = h;
  }

  function refresh(){
    clr.hidden = !(S.m.length || S.f.some(Boolean));
    note.classList.toggle('is-on', !!(S.m.length || S.f.some(Boolean)));
    wrap.classList.toggle('ns-open', S.phase > 0);
    end.hidden = S.phase < 2;
    placeCoords();
    drawLinks();
  }

  /* ---------- раскладка ---------- */
  function layout(){
    var v = root.clientWidth < CUT;
    wrap.classList.toggle('ns-v', v); wrap.classList.toggle('ns-h', !v);
    drawLine();
    if(editing !== null){ var i = editing, st = step; editing = null; edit.hidden = true; renderPts(); openEdit(i, st); }
    else renderPts();
    setHint(); placeCoords(); drawLinks();
  }

  /* ---------- события ---------- */
  function local(e){ var o = year.getBoundingClientRect(); return {x: e.clientX - o.left, y: e.clientY - o.top}; }
  track.addEventListener('pointermove', function(e){
    if(e.pointerType === 'touch') return;
    var q = local(e), t = G.tOf(q.x, q.y), ok = G.off(q.x, q.y, t) < 34 && near(t) < 0;
    track.classList.toggle('is-near', ok && S.m.length < MAX);
    showGhost(t, ok);
  });
  track.addEventListener('pointerleave', function(){ showGhost(0, false); track.classList.remove('is-near'); });
  track.addEventListener('click', function(e){
    if(Date.now() - closedAt < 600) return;   // это касание только закрыло поле
    var q = local(e), t = G.tOf(q.x, q.y);
    if(G.off(q.x, q.y, t) > (e.pointerType === 'mouse' ? 34 : 44)) return;
    cur = monthOf(t); kbd = false;
    place(t);
  });
  track.addEventListener('focus', function(){ if(!track.matches(':focus-visible')) return; showGhost((cur+.5)/12, true); });
  track.addEventListener('blur', function(){ showGhost(0, false); });
  track.addEventListener('keydown', function(e){
    var k = e.key;
    if(k === 'ArrowRight' || k === 'ArrowDown'){ cur = Math.min(11, cur+1); }
    else if(k === 'ArrowLeft' || k === 'ArrowUp'){ cur = Math.max(0, cur-1); }
    else if(k === 'Home'){ cur = 0; }
    else if(k === 'End'){ cur = 11; }
    else if(k === 'Enter' || k === ' '){ e.preventDefault(); kbd = true; place((cur+.5)/12); return; }
    else return;
    e.preventDefault();
    setHint(); showGhost((cur+.5)/12, true);
  });

  pts.addEventListener('click', function(e){
    var b = e.target.closest('.ns-pt'); if(!b) return;
    e.stopPropagation(); kbd = e.detail === 0; openEdit(+b.getAttribute('data-i'));
  });
  pts.addEventListener('keydown', function(e){
    var b = e.target.closest('.ns-pt'); if(!b) return;
    if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); removeAt(+b.getAttribute('data-i')); }
  });

  edit.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); closeEdit(true, true); }
    else if(e.key === 'Escape'){
      e.preventDefault();
      if(step === 'c'){ closeEdit(false); return; }
      var i = editing; if(S.m[i] && S.m[i].x){ edit.value = S.m[i].x; } else { edit.value = ''; } closeEdit(!!edit.value);
    }
  });
  edit.addEventListener('input', function(){ if(edit.value.indexOf('\n') > -1) edit.value = edit.value.replace(/\s*\n\s*/g, ' '); placeEdit(); });
  edit.addEventListener('blur', function(){ setTimeout(function(){ if(editing !== null && document.activeElement !== edit) closeEdit(true, false, true); }, 0); });

  inputs.forEach(function(inp, i){
    inp.value = S.f[i] || '';
    inp.addEventListener('input', function(){
      if(inp.value.indexOf('\n') > -1) inp.value = inp.value.replace(/\s*\n\s*/g, ' ');
      grow(inp);
      S.f[i] = inp.value.trim(); save();
      coords[i].classList.toggle('is-named', !!S.f[i]);
      ringOp(i, filled());
      clr.hidden = false; note.classList.add('is-on');
    });
    inp.addEventListener('keydown', function(e){
      if(e.key !== 'Enter') return;
      e.preventDefault();
      if(i < MAX-1 && !S.f[i+1] && S.f[i]) inputs[i+1].focus();
      else if(S.f.some(Boolean)){ finish(); cta.focus({preventScroll:true}); }
    });
    inp.addEventListener('change', function(){ drawLinks(); if(S.f.some(Boolean)) finish(); });
  });
  next.addEventListener('click', function(e){ if(S.phase === 0 && !e.target.closest('.ns-lift')) nudge(); });

  liftPast.addEventListener('click', function(){ setFront('past', true); });
  liftNext.addEventListener('click', function(){ setFront('next', true); });

  var armed = 0;
  clr.addEventListener('click', function(){
    if(!armed){                                 // первое нажатие спрашивает
      armed = setTimeout(function(){ armed = 0; clr.textContent = TXT.clear; }, 3000);
      clr.textContent = TXT.clearSure;
      return;
    }
    clearTimeout(armed); armed = 0; clr.textContent = TXT.clear;
    try{ localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); }catch(e){}
    S = fresh(); editing = null; step = 'x'; edit.hidden = true; cur = 5;
    inputs.forEach(function(inp){ inp.value = ''; grow(inp); });
    next.classList.add('ns-pre');
    setFront('past', false);
    renderPts(); setHint(); refresh();
    say('Всё стёрто.');
    track.focus({preventScroll:true});
  });

  /* ---------- старт ---------- */
  if(S.phase === 0) next.classList.add('ns-pre');
  layout();
  setFront(S.phase > 0 ? S.front : 'past', false);
  refresh();
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ wrap.classList.remove('ns-noanim'); }); });

  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ es.forEach(function(e){ wrap.classList.toggle('ns-vis', e.isIntersecting); }); }).observe(wrap);
  } else wrap.classList.add('ns-vis');

  var lastW = 0;
  var onResize = function(){ var w = root.clientWidth; if(w === lastW) return; lastW = w; layout(); };
  if(window.ResizeObserver) new ResizeObserver(onResize).observe(root); else window.addEventListener('resize', onResize);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ lastW = 0; onResize(); });
}

function boot(){ document.querySelectorAll('[data-module="season"]').forEach(mount); }
window.WKSeason = { mount: mount };
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
