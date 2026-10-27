/* =====================================================================
   Waykeeper · база знаний · assets/kb.js (пакет 1, 26.10.2026)
   Поиск одной строкой по kb-index.json: подсказки по типам, «/», стрелки, Enter, Esc.
   Подключение (после kb.css): <script src="assets/kb.js" defer></script>
   Разметка: любой <form class="kb-search"><input type="search">…</form> (см. assets/kb.css, раздел 16)
   подхватывается сам. Выключить на конкретном поле: data-kb-manual.
   Для других скриптов — window.KB:
     KB.ready(fn)            вызвать fn(index), когда реестр загружен
     KB.search(q, opts)      [{item, score}], opts: {limit, types:[…], situation:'slug'}
     KB.resolve(alias)       запись по ключу (type:id) или по псевдониму (woop-5, job-ended)
     KB.url(item)            адрес для ссылки с учётом глубины страницы (пока нет страницы — url_now)
     KB.ev(code)             готовая разметка метки доказательности (.ev), единый способ на всю базу
     KB.situations(fn)       fn(списокСитуаций) из situations.json
   Данные: assets/data/kb-index.json, situations.json (их собирает _tools/kb_index.py).
   ===================================================================== */
(function(){
  'use strict';
  var D = document;
  var script = D.currentScript;
  var scriptUrl = script && script.src ? script.src : (location.origin + '/assets/kb.js');
  var ASSETS = scriptUrl.replace(/[^\/]*$/, '');                // …/assets/
  var ROOT = ASSETS.replace(/assets\/$/, '');                   // корень сайта
  var INDEX_URL = ASSETS + 'data/kb-index.json';
  var SIT_URL = ASSETS + 'data/situations.json';

  var GROUP_LABEL = { situations: 'Ситуация', understand: 'Понять', 'do': 'Сделать', help: 'Кто помогает', read: 'Почитать' };
  var GROUP_ORDER = ['situations', 'understand', 'do', 'help', 'read'];
  var PER_GROUP = 3;
  var RTYPE = { book: 'книга', test: 'тест', workbook: 'тетрадь', tool: 'инструмент', app: 'приложение', podcast: 'подкаст',
    video: 'видео', article: 'статья', media: 'медиа', service: 'сервис', community: 'сообщество', course: 'курс', pro: 'для специалистов' };

  var idx = null, byKey = {}, loading = null, waiting = [], sitData = null;

  /* ---------- загрузка ---------- */
  function load(cb){
    if(idx){ if(cb) cb(idx); return; }
    if(cb) waiting.push(cb);
    if(loading) return;
    loading = fetch(INDEX_URL, { credentials: 'same-origin' }).then(function(r){ return r.json(); }).then(function(d){
      idx = d;
      d.items.forEach(function(it){ byKey[it.key] = it; it._s = null; });
      var w = waiting; waiting = [];
      w.forEach(function(f){ f(idx); });
    }).catch(function(){ loading = null; });
  }

  /* ---------- нормализация и поиск ---------- */
  function norm(s){
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"'“”„()\[\]{}.,;:!?—–\-\/\\|+*=<>№#@&%$^~`]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function prep(it){
    if(it._s) return it._s;
    var names = [it.title].concat(it.aka || []);
    it._s = {
      names: names.map(norm),
      words: norm(names.join(' ')).split(' '),
      ids: [it.id].concat(it.aliases || []).map(norm),
      rest: norm([it.short, it.group, it.author].join(' '))
    };
    return it._s;
  }
  function stem(t){ return t.length > 5 ? t.slice(0, -2) : t; }

  function scoreItem(it, toks, full){
    var s = prep(it), score = 0, i, j;
    for(i = 0; i < s.ids.length; i++) if(s.ids[i] === full){ return 200; }
    for(i = 0; i < s.names.length; i++){
      if(s.names[i] === full){ score = Math.max(score, 150); }
      else if(s.names[i].indexOf(full) === 0){ score = Math.max(score, 110); }
    }
    var total = 0;
    for(i = 0; i < toks.length; i++){
      var t = toks[i], st = stem(t), best = 0;
      for(j = 0; j < s.words.length; j++){
        var w = s.words[j];
        if(w === t){ best = Math.max(best, 40); }
        else if(w.indexOf(t) === 0){ best = Math.max(best, 32); }
        else if(st.length >= 4 && w.indexOf(st) === 0){ best = Math.max(best, 24); }
      }
      if(!best && t.length >= 3 && s.rest.indexOf(st.length >= 4 ? st : t) > -1){ best = 6; }
      if(!best) return 0;                                     // каждое слово запроса должно найтись
      total += best;
    }
    return Math.max(score, total / toks.length + (s.names[0].indexOf(toks[0]) === 0 ? 20 : 0));
  }

  var TYPE_BONUS = { situation: 6, question: 4, practice: 3, approach: 2, concept: 2, specialist: 1, resource: 0, school: 0, person: -1, family: -1, term: -2 };

  function search(q, opts){
    opts = opts || {};
    var full = norm(q);
    if(!idx || !full) return [];
    var toks = full.split(' ').filter(Boolean), out = [];
    idx.items.forEach(function(it){
      if(opts.types && opts.types.indexOf(it.type) < 0) return;
      if(opts.situation && (it.situations || []).indexOf(opts.situation) < 0) return;
      var sc = scoreItem(it, toks, full);
      if(sc) out.push({ item: it, score: sc + (TYPE_BONUS[it.type] || 0) - it.title.length * 0.05 });   // при равенстве — короткое название вперёд
    });
    out.sort(function(a, b){ return b.score - a.score || a.item.title.localeCompare(b.item.title, 'ru'); });
    return opts.limit ? out.slice(0, opts.limit) : out;
  }

  function resolve(k){
    if(!idx) return null;
    if(byKey[k]) return byKey[k];
    var a = idx.aliases && idx.aliases[k];
    return a ? byKey[a] : null;
  }

  /* ---------- адреса и разметка ---------- */
  function url(it){
    var u = (it.exists === false && it.url_now) ? it.url_now : it.url;
    return ROOT + u;
  }
  function ev(code){
    var meta = idx && idx.ev && idx.ev[code];
    if(!meta) return '';
    var cls = code === 'strong' ? 'strong' : code;
    return '<span class="ev ev--' + cls + '"><span class="ev-dots" aria-hidden="true"><i></i><i></i><i></i></span>' + meta.label + '</span>';
  }
  function el(tag, cls, text){
    var e = D.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;
    return e;
  }
  function metaNode(it){
    var m = el('span', 'm'), parts = [];
    var tl = idx.types[it.type] ? idx.types[it.type].label.toLowerCase() : it.type;
    if(it.type === 'practice'){ parts.push('практика'); if(it.minutes) parts.push(it.minutes); }
    else if(it.type === 'resource'){ parts.push(RTYPE[it.rtype] || 'ресурс'); if(it.author) parts.push(it.author); }
    else if(it.type === 'specialist'){ parts.push('атлас'); if(it.level_name) parts.push('уровень «' + it.level_name + '»'); }
    else if(it.type === 'term'){ parts.push('термин'); }
    else { parts.push(tl); if(it.status === 'draft') parts.push('черновик'); if(it.status === 'plan') parts.push('статья пишется'); }
    m.appendChild(D.createTextNode(parts.join(' · ')));
    if(it.ev && (it.type === 'approach' || it.type === 'school' || it.type === 'resource' || it.type === 'practice')){
      m.appendChild(D.createTextNode(' · '));
      var holder = D.createElement('span');
      holder.innerHTML = ev(it.ev);
      while(holder.firstChild) m.appendChild(holder.firstChild);
    }
    return m;
  }
  function groupOf(it){ return (idx.types[it.type] || {}).near_group || 'understand'; }

  /* ---------- подсказки у поля ---------- */
  var seq = 0;
  function attach(box){
    var input = box.querySelector('input');
    if(!input || input.hasAttribute('data-kb-manual') || input._kb) return;
    input._kb = true;
    var panel = el('div', 'kb-suggest');
    panel.id = 'kb-sg-' + (++seq);
    panel.hidden = true;
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Подсказки поиска');
    box.appendChild(panel);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', panel.id);
    input.setAttribute('autocomplete', 'off');
    var links = [], cur = -1, lastQ = '';

    function close(){
      panel.hidden = true; cur = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function mark(n){
      if(!links.length) return;
      cur = (n + links.length) % links.length;
      links.forEach(function(a, i){ a.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
      input.setAttribute('aria-activedescendant', links[cur].id);
      links[cur].scrollIntoView({ block: 'nearest' });
    }
    function allUrl(q){ return ROOT + 'knowledge.html?q=' + encodeURIComponent(q); }

    function render(){
      var q = input.value.trim();
      lastQ = q;
      panel.textContent = '';
      links = []; cur = -1;
      if(!q){ close(); return; }
      var res = search(q);
      if(!res.length){
        var none = el('div', 'kb-none');
        none.appendChild(el('p', 'kb-none-t', 'По слову «' + q + '» в базе ничего нет. База — про переходы.'));
        var hint = el('p', 'kb-hint');
        hint.appendChild(D.createTextNode('Ближе всего: '));
        var a1 = el('a', null, 'ситуации'); a1.href = ROOT + 'knowledge.html#situations';
        hint.appendChild(a1);
        hint.appendChild(D.createTextNode(' · '));
        var tgSrc = D.querySelector('a[data-tg]');
        var a2 = el('a', null, 'написать в Telegram, чего не хватает');
        a2.href = tgSrc ? tgSrc.getAttribute('href') : '#telegram';
        hint.appendChild(a2);
        none.appendChild(hint);
        panel.appendChild(none);
        panel.hidden = false; input.setAttribute('aria-expanded', 'true');
        return;
      }
      var groups = {};
      res.forEach(function(r){ var g = groupOf(r.item); (groups[g] = groups[g] || []).push(r.item); });
      var dl = el('dl', 'kb-near'), n = 0;
      GROUP_ORDER.forEach(function(g){
        if(!groups[g]) return;
        var row = D.createElement('div'), dt = el('dt', null, GROUP_LABEL[g]), dd = el('dd');
        groups[g].slice(0, PER_GROUP).forEach(function(it){
          var a = el('a'); a.href = url(it); a.id = panel.id + '-' + (n++); a.setAttribute('role', 'option'); a.setAttribute('aria-selected', 'false');
          a.appendChild(el('span', 't', it.title));
          a.appendChild(metaNode(it));
          dd.appendChild(a); links.push(a);
        });
        row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
      });
      panel.appendChild(dl);
      var all = el('p', 'kb-hint'), aa = el('a', null, 'Все ' + res.length + ' ' + plural(res.length) + ' →');
      aa.href = allUrl(q); all.appendChild(aa); panel.appendChild(all);
      panel.hidden = false; input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('focus', function(){ load(); });
    input.addEventListener('input', function(){ if(idx) render(); else load(render); });
    input.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){ if(!panel.hidden){ close(); e.preventDefault(); } else if(input.value){ input.value = ''; } return; }
      if(e.key === 'ArrowDown'){ if(panel.hidden && input.value.trim()){ render(); } mark(cur + 1); e.preventDefault(); return; }
      if(e.key === 'ArrowUp'){ mark(cur - 1); e.preventDefault(); return; }
      if(e.key === 'Enter'){
        e.preventDefault();
        var q = input.value.trim();
        if(!q) return;
        if(cur >= 0 && links[cur]){ location.href = links[cur].href; return; }
        if(idx && lastQ === q && links[0]){ location.href = links[0].href; return; }
        load(function(){ var r = search(q); location.href = r.length ? url(r[0].item) : allUrl(q); });
      }
    });
    panel.addEventListener('mousedown', function(e){ e.preventDefault(); });
    D.addEventListener('click', function(e){ if(!box.contains(e.target)) close(); });
    input.addEventListener('blur', function(){ setTimeout(function(){ if(!box.contains(D.activeElement)) close(); }, 120); });
    if(box.tagName === 'FORM') box.addEventListener('submit', function(e){ e.preventDefault(); });
  }

  function plural(n){
    var a = n % 10, b = n % 100;
    if(a === 1 && b !== 11) return 'результат';
    if(a >= 2 && a <= 4 && (b < 10 || b >= 20)) return 'результата';
    return 'результатов';
  }

  function init(){
    var boxes = D.querySelectorAll('.kb-search');
    for(var i = 0; i < boxes.length; i++) attach(boxes[i]);
    // «/» — к поиску (если страница не перехватила её сама)
    D.addEventListener('keydown', function(e){
      if(e.key !== '/' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target, tag = t && t.tagName;
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      var first = D.querySelector('.kb-search input:not([data-kb-manual])');
      if(first && first.offsetParent !== null){ e.preventDefault(); first.focus(); first.select(); }
    });
    var q = new URLSearchParams(location.search).get('q');
    if(q && boxes[0]){ var inp = boxes[0].querySelector('input'); if(inp && !inp.value){ inp.value = q; } }
  }

  window.KB = {
    ready: function(fn){ load(fn); },
    search: search,
    resolve: resolve,
    url: url,
    ev: ev,
    norm: norm,
    situations: function(fn){
      if(sitData){ fn(sitData); return; }
      fetch(SIT_URL).then(function(r){ return r.json(); }).then(function(d){ sitData = d.items; fn(sitData); });
    }
  };

  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
