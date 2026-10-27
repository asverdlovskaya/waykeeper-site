/* =====================================================================
   Waykeeper · вход в базу знаний (knowledge.html): результаты поиска по адресу ?q=
   Пакет 2, 26.10.2026. Использует window.KB из assets/kb.js (реестр assets/data/kb-index.json).
   Показывает результаты сгруппированными по типу; по 8 строк в группе, «Показать ещё».
   ===================================================================== */
(function(){
  'use strict';
  var D = document;
  var box = D.getElementById('kn-results'), main = D.getElementById('q');
  if(!box || !main || !window.KB) return;
  var TYPE_ORDER = ['situation', 'question', 'practice', 'approach', 'school', 'concept', 'person', 'specialist', 'family', 'resource', 'term'];
  var PAGE = 8;
  var RTYPE = { book: 'книга', test: 'тест', workbook: 'тетрадь', tool: 'инструмент', app: 'приложение', podcast: 'подкаст', video: 'видео',
    article: 'статья', media: 'медиа', service: 'сервис', community: 'сообщество', course: 'курс', pro: 'для специалистов' };

  function el(tag, cls, text){ var e = D.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function plural(n, f){ var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : (a >= 2 && a <= 4 && (b < 10 || b >= 20)) ? f[1] : f[2]; }

  function kind(it){
    var s = [];
    if(it.type === 'practice' && it.minutes) s.push(it.minutes);
    if(it.type === 'resource'){ s.push(RTYPE[it.rtype] || 'ресурс'); }
    if(it.type === 'specialist' && it.level_name) s.push('уровень «' + it.level_name + '»');
    if(it.status === 'draft') s.push('черновик');
    if(it.status === 'plan') s.push('статья пишется');
    return s.join(' · ');
  }
  function row(it, idx){
    var li = el('li', 'kb-row');
    var k = el('span', 'k'); k.appendChild(el('b', null, idx.types[it.type] ? idx.types[it.type].label : it.type));
    var kd = kind(it); if(kd) k.appendChild(D.createTextNode(kd));
    li.appendChild(k);
    var mid = el('div'), t = el('span', 't'), a = el('a', null, it.title); a.href = KB.url(it); t.appendChild(a); mid.appendChild(t);
    if(it.author){ mid.appendChild(el('span', 'by', it.author)); }
    if(it.short){ mid.appendChild(el('span', 'd', it.short)); }
    li.appendChild(mid);
    var marks = el('span', 'marks');
    if(it.ev && (it.type === 'approach' || it.type === 'school' || it.type === 'resource' || it.type === 'practice')){
      var h = D.createElement('span'); h.innerHTML = KB.ev(it.ev); while(h.firstChild) marks.appendChild(h.firstChild);
    }
    li.appendChild(marks);
    var go = el('a', 'go', '→'); go.href = KB.url(it); go.setAttribute('aria-label', 'Открыть: ' + it.title);
    li.appendChild(go);
    return li;
  }

  function show(q){
    KB.ready(function(idx){
      var res = KB.search(q), items = res.map(function(r){ return r.item; });
      box.textContent = '';
      var fr = el('div', 'frame');
      if(!items.length){
        var none = el('div', 'kb-none');
        none.appendChild(el('p', 'kb-none-t', 'По слову «' + q + '» в базе ничего нет. База — про переходы, а не про деньги и право.'));
        var hint = el('p', 'kb-hint');
        hint.appendChild(D.createTextNode('Ближе всего: '));
        var a1 = el('a', null, 'ситуации'); a1.href = '#situations'; hint.appendChild(a1);
        hint.appendChild(D.createTextNode(' · '));
        var tg = D.querySelector('a[data-tg]');
        var a2 = el('a', null, 'написать в Telegram, чего не хватает'); a2.href = tg ? tg.getAttribute('href') : '#telegram'; hint.appendChild(a2);
        none.appendChild(hint); fr.appendChild(none);
      } else {
        var r = el('p', 'kb-result');
        r.appendChild(el('b', null, items.length + ' ' + plural(items.length, ['результат', 'результата', 'результатов'])));
        r.appendChild(el('span', null, 'по запросу «' + q + '»'));
        var reset = el('a', null, 'Сбросить'); reset.href = 'knowledge.html'; r.appendChild(reset);
        fr.appendChild(r);
        var groups = {};
        items.forEach(function(it){ (groups[it.type] = groups[it.type] || []).push(it); });
        TYPE_ORDER.forEach(function(ty){
          var g = groups[ty]; if(!g) return;
          var sec = el('section', 'kb-group'), h = el('div', 'kb-group-h');
          h.appendChild(el('h3', 'kb-h3', idx.types[ty].label_pl));
          h.appendChild(el('span', 'n', String(g.length)));
          sec.appendChild(h);
          var ol = el('ol', 'kb-rows'); sec.appendChild(ol);
          var shown = 0;
          function more(){
            var to = Math.min(shown + PAGE, g.length);
            for(; shown < to; shown++) ol.appendChild(row(g[shown], idx));
            if(btn){ if(shown >= g.length){ btn.parentNode.removeChild(btn); btn = null; } else { btn.textContent = 'Показать ещё ' + Math.min(PAGE, g.length - shown); } }
          }
          var btn = null;
          if(g.length > PAGE){
            var w = el('div', 'kb-more'); btn = el('button', 'btn quiet'); btn.type = 'button'; w.appendChild(btn); sec.appendChild(w);
            btn.addEventListener('click', more);
          }
          more();
          fr.appendChild(sec);
        });
      }
      box.appendChild(fr);
      box.hidden = false;
      D.title = 'Результаты: ' + q + ' · Waykeeper';
      if(location.hash === '' ){ box.scrollIntoView({ block: 'start' }); }
    });
  }

  var q = (new URLSearchParams(location.search).get('q') || '').trim();
  // kb.js ставит запрос в первое поле страницы (это поле шапки): оставляем его только в основном поиске
  var head = D.getElementById('kb-pop-q');
  if(head) head.value = '';
  if(q){ main.value = q; show(q); }
})();
