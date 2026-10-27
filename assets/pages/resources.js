/* =====================================================================
   Waykeeper · site-v2 · страница «Ресурсы» (пакет 6 базы знаний, 26.10.2026)
   Список строк с фильтрами по макету _ux/kb-resources.html; разметка и стили — assets/kb.css.
   Данные: assets/data/resources.json (записи), situations.json (12 ситуаций), kb-index.json (названия для колонки справа).
   Страница копий данных не держит: пересборка файлов подхватывается сама.
   Решения Саши: наличие книги (availability) не показывается; ru_status — спокойной мелкой строкой;
   «на английском» / «есть русские субтитры» — мелко; «художественное» — тип записи, не метка.
   Фильтры записываются в адрес (?sit=…&do=…&ru=1&free=1&ev=…&type=…); строка по адресу #<id> раскрывается.
   ===================================================================== */
(function(){
'use strict';
var D = document;
var DATA = 'assets/data/';
var PAGE_FILTERED = 20;   /* строк в группе, когда выбран фильтр */
var PAGE_OVERVIEW = 6;    /* строк в группе без фильтров: обзор, не простыня */
var PAGE_STEP = 20;       /* «Показать ещё 20» */

/* ---------- словари ---------- */
var TYPE_NAME = { book:'Книга', article:'Статья', media:'Медиа', podcast:'Подкаст', video:'Видео', test:'Тест',
  tool:'Инструмент', workbook:'Тетрадь', app:'Приложение', service:'Сервис', community:'Сообщество' };
var TYPE_PL = { book:'книги', article:'статьи', media:'медиа', podcast:'подкасты', video:'видео', test:'тесты',
  tool:'инструменты', workbook:'тетради', app:'приложения', service:'сервисы', community:'сообщества' };
var TYPE_ORDER = ['book','article','media','podcast','video','test','tool','workbook','app','service','community'];
var GROUPS = [['read','Читать'], ['listen','Слушать'], ['watch','Смотреть'], ['test','Пройти тест'], ['do','Сделать']];
var GROUP_OF = { book:'read', article:'read', media:'read', podcast:'listen', video:'watch', test:'test',
  tool:'do', workbook:'do', app:'do', service:'do', community:'do' };
/* метки: те же коды и слова, что в kb.css и kb.js (KB.ev) */
var EV_CODE = { 'сильная':'strong', 'умеренная':'mid', 'ранняя':'early', 'спорная':'contested', 'практика':'craft' };
var EV_LABEL = { strong:'сильная', mid:'умеренная', early:'ранняя', contested:'спорная', craft:'опыт практиков' };
var EV_RANK = { strong:0, mid:1, early:2, craft:3, contested:4 };
/* короткие названия ситуаций для строки результата */
var SIT_SHORT = { 'rabota-zakonchilas':'закончилась работа', 'pereezd':'переезд', 'krizis-identichnosti':'кризис идентичности',
  'sily-konchilis':'силы кончились', 'ne-mogu-vybrat':'развилка', 'plany-sryvayutsya':'планы срываются', 'ne-moe-strashno':'«не моё»',
  'ne-znayu-k-komu-idti':'к кому идти', 'ryadom-chelovek-v-krizise':'близкий в кризисе', 'podvesti-god':'подвести год',
  'trevoga':'тревога', 'poterya-blizkogo':'потеря близкого' };
/* «Если начать с одного»: по одной записи на ситуацию, выбрано руками */
var PICK = { '':'book-bridges-transitions', 'rabota-zakonchilas':'book-bridges-transitions', 'pereezd':'book-petrova-emigration',
  'krizis-identichnosti':'book-harris-trap', 'sily-konchilis':'book-nagoski-burnout', 'ne-mogu-vybrat':'vid-ruth-chang',
  'plany-sryvayutsya':'tool-woop', 'ne-moe-strashno':'book-dyl', 'ne-znayu-k-komu-idti':'art-yasno-difference',
  'ryadom-chelovek-v-krizise':'book-crowe-card', 'podvesti-god':'wb-yearcompass' };
/* если по ситуации записей нет — куда посмотреть рядом */
var NEAREST = { 'trevoga':'sily-konchilis', 'poterya-blizkogo':'ryadom-chelovek-v-krizise' };

/* ---------- помощники ---------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function q(sel, root){ return (root || D).querySelector(sel); }
function qa(sel, root){ return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }
function safeUrl(u){ return /^https?:\/\//i.test(u || '') ? u : '#'; }
function plural(n, f){ var m = n % 10, h = n % 100; return n + ' ' + (m === 1 && h !== 11 ? f[0] : (m >= 2 && m <= 4 && (h < 12 || h > 14) ? f[1] : f[2])); }
function reduced(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
function evHtml(code){
  if(!code || !EV_LABEL[code]) return '';
  return '<span class="ev ev--' + code + '"><span class="ev-dots" aria-hidden="true"><i></i><i></i><i></i></span>' + EV_LABEL[code] + '</span>';
}
function evOf(r){ return EV_CODE[r.evidence] || ''; }
function isFiction(r){ return r.evidence === 'художественное'; }
function groupOf(r){ return GROUP_OF[r.type] || 'do'; }
function hasRu(r){ return r.lang === 'ru' || r.lang === 'оба'; }
function timeText(r){ if(typeof r.minutes === 'number') return r.minutes + ' мин'; return r.length ? String(r.length) : ''; }
function langText(r){
  var t = r.lang === 'ru' ? 'по-русски' : (r.lang === 'en' ? 'на английском' : 'по-русски и в оригинале');
  if(r.lang === 'en' && r.type === 'video' && r.subtitles_ru === true) t += ' · есть русские субтитры';
  return t;
}
function freeText(r){ return r.free === true ? 'бесплатно' : (r.free === 'частично' ? 'частично бесплатно' : ''); }

/* ---------- состояние ---------- */
var R = [], BY = {}, SIT = [], SIT_BY = {}, KBI = null;
var st = { sit:'', doo:'', ru:false, free:false, ev:'', type:'' };
var shown = {};          /* group → сколько строк показано */
var lastAdded = null;    /* куда вернуть фокус после «Показать ещё» */

function readUrl(){
  var p = new URLSearchParams(location.search);
  var sit = p.get('sit') || '', d = p.get('do') || '', ev = p.get('ev') || '', ty = p.get('type') || '';
  st.sit = SIT_BY[sit] ? sit : '';
  st.doo = GROUPS.some(function(g){ return g[0] === d; }) ? d : '';
  st.ru = p.get('ru') === '1';
  st.free = p.get('free') === '1';
  st.ev = EV_LABEL[ev] ? ev : '';
  st.type = TYPE_NAME[ty] ? ty : '';
}
function urlFor(s){
  var p = [];
  if(s.sit) p.push('sit=' + s.sit);
  if(s.doo) p.push('do=' + s.doo);
  if(s.ru) p.push('ru=1');
  if(s.free) p.push('free=1');
  if(s.ev) p.push('ev=' + s.ev);
  if(s.type) p.push('type=' + s.type);
  return location.pathname + (p.length ? '?' + p.join('&') : '');
}
function pushUrl(){ try { history.pushState(null, '', urlFor(st) + location.hash); } catch(e){} }
function active(){ return !!(st.sit || st.doo || st.ru || st.free || st.ev || st.type); }
function nActive(){ return (st.sit ? 1 : 0) + (st.doo ? 1 : 0) + (st.ru ? 1 : 0) + (st.free ? 1 : 0) + (st.ev ? 1 : 0) + (st.type ? 1 : 0); }

/* ---------- отбор ---------- */
function codesOf(slug){ var s = SIT_BY[slug]; return s ? (s.codes || []) : []; }
function match(r, skip){
  skip = skip || '';
  if(skip !== 'sit' && st.sit){
    var codes = codesOf(st.sit), ok = false;
    (r.situations || []).forEach(function(c){ if(codes.indexOf(c) > -1) ok = true; });
    if(!ok) return false;
  }
  if(skip !== 'doo' && st.doo && groupOf(r) !== st.doo) return false;
  if(skip !== 'ru' && st.ru && !hasRu(r)) return false;
  if(skip !== 'free' && st.free && r.free !== true) return false;
  if(skip !== 'ev' && st.ev && evOf(r) !== st.ev) return false;
  if(skip !== 'type' && st.type && r.type !== st.type) return false;
  return true;
}
function found(skip){ return R.filter(function(r){ return match(r, skip); }); }

var ORDER = {};   /* порядок внутри группы: при ситуации — как в situations.json, иначе по силе метки */
function rank(r){ var e = evOf(r); return e ? EV_RANK[e] : 5; }
function sortList(list){
  var s = SIT_BY[st.sit], pos = {};
  if(s && s.resources) s.resources.forEach(function(id, i){ pos[id] = i; });
  return list.slice().sort(function(a, b){
    if(s && s.resources){ var pa = pos[a.id] == null ? 999 : pos[a.id], pb = pos[b.id] == null ? 999 : pos[b.id]; if(pa !== pb) return pa - pb; }
    var ra = hasRu(a) ? 0 : 1, rb = hasRu(b) ? 0 : 1; if(ra !== rb) return ra - rb;
    if(rank(a) !== rank(b)) return rank(a) - rank(b);
    return ORDER[a.id] - ORDER[b.id];
  });
}
function pickRecord(all){
  var id = PICK[st.sit == null ? '' : st.sit];
  var r = id ? BY[id] : null;
  if(!r) return null;
  return all.indexOf(r) > -1 ? r : null;
}

/* ---------- разметка строки ---------- */
function rowHtml(r, isPick){
  var sub = [];
  if(timeText(r)) sub.push(esc(timeText(r)));
  if(isFiction(r)) sub.push('художественное');
  var by = [];
  if(r.author) by.push(esc(r.author));
  if(r.year) by.push(esc(r.year));
  if(r.publisher_ru) by.push(esc(r.publisher_ru));
  var note = [];
  if(r.ru_status) note.push(esc(r.ru_status));
  var det = [];
  if(r.for_whom) det.push('<div><dt>Для кого</dt><dd>' + esc(r.for_whom) + '</dd></div>');
  if(r.caveat) det.push('<div><dt>Оговорка</dt><dd>' + esc(r.caveat) + '</dd></div>');
  if(r.title_original && r.title_original !== r.title) det.push('<div><dt>В оригинале</dt><dd>' + esc(r.title_original) + '</dd></div>');
  var sl = [];
  SIT.forEach(function(s){
    var hit = false; (r.situations || []).forEach(function(c){ if((s.codes || []).indexOf(c) > -1) hit = true; });
    if(hit) sl.push('<a href="' + urlFor({ sit:s.slug }) + '" data-sit="' + esc(s.slug) + '">' + esc(SIT_SHORT[s.slug] || s.title) + '</a>');
  });
  if(sl.length) det.push('<div><dt>В ситуациях</dt><dd class="res-sits">' + sl.join(', ') + '</dd></div>');
  var ext = esc(safeUrl(r.url));
  var m1 = evHtml(evOf(r));
  var m2 = [langText(r)]; if(freeText(r)) m2.push(freeText(r));
  return '<li class="kb-row' + (isPick ? ' is-pick' : '') + '" id="' + esc(r.id) + '">' +
    '<span class="k"><b>' + esc(TYPE_NAME[r.type] || r.type) + '</b>' + (sub.length ? '<span class="res-sub">' + sub.join('</span><span class="res-sub">') + '</span>' : '') + '</span>' +
    '<div><span class="t"><a href="' + ext + '" target="_blank" rel="noopener">' + esc(r.title) + '<span class="visually-hidden"> (откроется в новой вкладке)</span></a></span>' +
      (by.length ? '<span class="by">' + by.join(' · ') + '</span>' : '') +
      '<span class="d">' + esc(r.summary) + '</span>' +
      (note.length ? '<span class="res-note">' + note.join(' · ') + '</span>' : '') +
      (det.length ? '<details><summary>Подробнее</summary><dl>' + det.join('') + '</dl></details>' : '') + '</div>' +
    '<span class="marks">' + m1 + '<span>' + m2.join(' · ') + '</span></span>' +
    '<a class="go" href="' + ext + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">↗</a></li>';
}

/* ---------- элементы управления (рисуются один раз, дальше только обновляются) ---------- */
function controlsHtml(where){
  var sitOpts = '<option value="">Все ситуации</option>' + SIT.map(function(s){ return '<option value="' + esc(s.slug) + '">' + esc(s.title) + '</option>'; }).join('');
  var seg = '<div class="kb-seg" role="group" aria-label="Что делать"><button type="button" data-f="doo" data-v="" aria-pressed="true">Всё<span class="n"></span></button>' +
    GROUPS.map(function(g){ return '<button type="button" data-f="doo" data-v="' + g[0] + '" aria-pressed="false">' + g[1] + '<span class="n"></span></button>'; }).join('') + '</div>';
  var evOpts = '<option value="">Любая метка</option>' + ['strong','mid','early','craft','contested'].map(function(c){ return '<option value="' + c + '">' + EV_LABEL[c] + '</option>'; }).join('');
  var tyOpts = '<option value="">Любой тип</option>' + TYPE_ORDER.map(function(t){ return '<option value="' + t + '">' + TYPE_NAME[t] + '</option>'; }).join('');
  var sel = '<label class="kb-select"><span class="visually-hidden">С чем ты сейчас</span><select data-f="sit">' + sitOpts + '</select></label>';
  var tog = '<label class="kb-toggle"><input type="checkbox" data-f="ru"> По-русски</label><label class="kb-toggle"><input type="checkbox" data-f="free"> Бесплатно</label>';
  var more = '<label class="kb-select"><span class="visually-hidden">Метка</span><select data-f="ev">' + evOpts + '</select></label>' +
    '<label class="kb-select"><span class="visually-hidden">Тип</span><select data-f="type">' + tyOpts + '</select></label>';
  if(where === 'sheet'){
    return '<p class="kb-h3">Фильтры</p>' +
      '<p class="label res-sh-l">С чем ты сейчас</p>' + sel +
      '<p class="label res-sh-l">Что делать</p>' + seg +
      '<p class="res-sh-t">' + tog + '</p>' +
      '<p class="label res-sh-l">Ещё</p><p class="res-sh-m">' + more + '</p>' +
      '<p class="res-sh-go"><button type="button" class="btn primary" data-res="sheet-ok">Показать</button></p>';
  }
  return '<div class="kb-filters-row">' +
    '<button type="button" class="btn quiet glass sm kb-filters-btn" data-res="sheet-open" aria-haspopup="dialog" aria-expanded="false">Фильтры<span class="n"></span></button>' +
    sel + seg + tog + '</div>' +
    '<details class="res-more-f"><summary>Ещё фильтры</summary><div class="res-more-row">' + more + '</div></details>' +
    '<p class="kb-result" aria-live="polite"></p>';
}
function syncControls(){
  qa('[data-f="sit"]').forEach(function(e){ e.value = st.sit; });
  qa('[data-f="ev"]').forEach(function(e){ e.value = st.ev; });
  qa('[data-f="type"]').forEach(function(e){ e.value = st.type; });
  qa('[data-f="ru"]').forEach(function(e){ e.checked = st.ru; });
  qa('[data-f="free"]').forEach(function(e){ e.checked = st.free; });
  var base = found('doo');
  var counts = { '': base.length };
  GROUPS.forEach(function(g){ counts[g[0]] = base.filter(function(r){ return groupOf(r) === g[0]; }).length; });
  qa('button[data-f="doo"]').forEach(function(b){
    var v = b.getAttribute('data-v'), n = counts[v] || 0;
    b.setAttribute('aria-pressed', String(v === st.doo));
    b.querySelector('.n').textContent = n;
    b.disabled = v !== '' && n === 0 && v !== st.doo;
  });
  var more = q('.res-more-f'); if(more && (st.ev || st.type)) more.open = true;
  qa('[data-res="sheet-open"] .n').forEach(function(n){ n.textContent = nActive() ? ' (' + nActive() + ')' : ''; });
  /* строка результата */
  var res = q('.kb-result'), tot = R.length, n = found().length;
  if(res){
    var parts = [];
    if(st.sit) parts.push(SIT_SHORT[st.sit] || SIT_BY[st.sit].title);
    if(st.doo) parts.push(GROUPS.filter(function(g){ return g[0] === st.doo; })[0][1].toLowerCase());
    if(st.ru) parts.push('по-русски');
    if(st.free) parts.push('бесплатно');
    if(st.ev) parts.push('метка «' + EV_LABEL[st.ev] + '»');
    if(st.type) parts.push(TYPE_PL[st.type]);
    res.innerHTML = '<span><b>' + n + '</b> из ' + tot + '</span>' + (parts.length ? '<span>' + esc(parts.join(' · ')) + '</span><a href="' + location.pathname + '" data-res="reset">Сбросить</a>' : '');
  }
  var okBtn = q('[data-res="sheet-ok"]'); if(okBtn) okBtn.textContent = 'Показать ' + n;
}

/* ---------- список ---------- */
function relatedBlock(slug){
  var s = SIT_BY[slug]; if(!s || !KBI) return '';
  function item(key, meta){
    var it = KBI[key]; if(!it) return '';
    var u = (it.exists === false && it.url_now) ? it.url_now : it.url;
    return '<a href="' + esc(u) + '"><span class="t">' + esc(it.title) + '</span>' + (meta ? '<span class="m">' + esc(meta) + '</span>' : '') + '</a>';
  }
  var rows = [];
  var art = item('situation:' + s.slug, '');
  if(art) rows.push(['Статья', art]);
  var pr = (s.practices || []).slice(0, 3).map(function(id){ var it = KBI['practice:' + id]; return item('practice:' + id, it && it.minutes ? (/^\d+$/.test(String(it.minutes)) ? it.minutes + ' мин' : String(it.minutes)) : ''); }).join('');
  if(pr) rows.push(['Сделать', pr]);
  var sp = (s.specialists || []).slice(0, 2).map(function(id){ return item('specialist:' + id, ''); }).join('');
  if(sp) rows.push(['Кто помогает', sp]);
  if(!rows.length) return '';
  return '<dl class="kb-near">' + rows.map(function(r){ return '<div class="res-near-row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
}
function emptyHtml(){
  /* сказать, чего нет; предложить ближайшее и сбросить один фильтр */
  var lines = [], title;
  var wants = [];
  if(st.doo) wants.push(GROUPS.filter(function(g){ return g[0] === st.doo; })[0][1].toLowerCase());
  var tail = [];
  if(st.sit) tail.push('по ситуации «' + (SIT_SHORT[st.sit] || SIT_BY[st.sit].title) + '»');
  if(st.ru) tail.push('по-русски');
  if(st.free) tail.push('бесплатно');
  if(st.ev) tail.push('с меткой «' + EV_LABEL[st.ev] + '»');
  if(st.type) tail.push(TYPE_PL[st.type]);
  title = 'Здесь пока ничего нет';
  if(st.sit && !R.some(function(r){ return codesOf(st.sit).some(function(c){ return (r.situations || []).indexOf(c) > -1; }); })){
    title = 'По этой ситуации ресурсов пока нет';
  } else if(st.doo && st.ru){
    title = 'По-русски ' + (st.doo === 'watch' ? 'видео' : wants[0]) + ' про это пока нет';
  }
  var body = '<p class="small">Ничего не нашлось' + (tail.length ? ': ' + esc((wants.length ? wants[0] + ', ' : '') + tail.join(', ')) : '') + '.</p>';
  /* какой фильтр убрать, чтобы появились записи */
  var drops = [];
  [['sit', st.sit, 'ситуацию'], ['doo', st.doo, 'выбор «' + (st.doo ? GROUPS.filter(function(g){ return g[0] === st.doo; })[0][1] : '') + '»'],
   ['ru', st.ru, '«по-русски»'], ['free', st.free, '«бесплатно»'], ['ev', st.ev, 'метку'], ['type', st.type, 'тип']].forEach(function(f){
    if(!f[1]) return;
    var n = found(f[0]).length;
    if(n) drops.push('<button type="button" class="link small" data-drop="' + f[0] + '">Убрать ' + f[2] + ': ' + plural(n, ['запись','записи','записей']) + '</button>');
  });
  if(drops.length) body += '<p class="res-drops">' + drops.join('') + '</p>';
  if(NEAREST[st.sit]){
    var ns = SIT_BY[NEAREST[st.sit]];
    if(ns) body += '<p class="small">Ближе всего по теме — <a href="' + urlFor({ sit:ns.slug }) + '" data-sit="' + esc(ns.slug) + '">«' + esc(SIT_SHORT[ns.slug]) + '»</a>.</p>';
  }
  var rel = relatedBlock(st.sit);
  if(rel) body += '<p class="label res-near-l">По этой ситуации в базе</p>' + rel;
  body += '<p class="small">Знаешь хороший ресурс&nbsp;— <a class="link" href="https://t.me/asverdlovskaya" target="_blank" rel="noopener" data-tg>напиши в&nbsp;Telegram</a>.</p>';
  return '<div class="kb-empty"><p class="kb-h3">' + esc(title) + '</p>' + body + '</div>';
}
function renderList(){
  var main = q('[data-res="main"]');
  var all = found();
  var out = '';
  if(!all.length){
    main.innerHTML = emptyHtml();
  } else {
    var pick = pickRecord(all);
    if(pick){
      out += '<section class="kb-group res-start"><div class="kb-group-h"><h2 class="kb-h3">Если начать с одного</h2><span class="n">выбрано руками</span></div><ol class="kb-rows">' + rowHtml(pick, true) + '</ol></section>';
    }
    var base = all.filter(function(r){ return r !== pick; });
    GROUPS.forEach(function(g){
      var list = sortList(base.filter(function(r){ return groupOf(r) === g[0]; }));
      if(!list.length) return;
      var lim = shown[g[0]] || (active() ? PAGE_FILTERED : PAGE_OVERVIEW);
      shown[g[0]] = lim;
      var vis = list.slice(0, lim), rest = list.length - vis.length;
      out += '<section class="kb-group" id="g-' + g[0] + '"><div class="kb-group-h"><h2 class="kb-h3">' + g[1] + '</h2><span class="n">' + list.length + '</span></div>' +
        '<ol class="kb-rows">' + vis.map(function(r){ return rowHtml(r, false); }).join('') + '</ol>' +
        (rest > 0 ? '<p class="kb-more"><button type="button" class="btn quiet glass" data-more="' + g[0] + '">Показать ещё ' + Math.min(PAGE_STEP, rest) + '</button></p>' : '') + '</section>';
    });
    main.innerHTML = out;
  }
  renderAside();
  syncControls();
}
function renderAside(){
  var a = q('[data-res="aside"]');
  var h = '';
  var rel = st.sit ? relatedBlock(st.sit) : '';
  if(rel) h += '<span class="label">По этой ситуации в базе</span>' + rel.replace('<dl class="kb-near">', '<dl class="kb-near res-near-side">');
  h += '<p class="kb-hint res-legend">Метки: ' + ['strong','mid','early','contested','craft'].map(evHtml).join(' ') + ' · <a href="how.html#marks">что значат</a></p>';
  a.innerHTML = h;
}

/* ---------- изменение состояния ---------- */
function apply(next, push){
  Object.keys(next).forEach(function(k){ st[k] = next[k]; });
  shown = {};
  if(push) pushUrl();
  renderList();
}
function resetAll(){ apply({ sit:'', doo:'', ru:false, free:false, ev:'', type:'' }, true); }

function bind(){
  D.addEventListener('change', function(e){
    var t = e.target, f = t.getAttribute && t.getAttribute('data-f'); if(!f) return;
    if(t.type === 'checkbox') apply((function(){ var o = {}; o[f] = t.checked; return o; })(), true);
    else if(t.tagName === 'SELECT') apply((function(){ var o = {}; o[f] = t.value; return o; })(), true);
  });
  D.addEventListener('click', function(e){
    var t = e.target.closest ? e.target : e.target.parentNode;
    var seg = t.closest('button[data-f="doo"]');
    if(seg){ apply({ doo: seg.getAttribute('data-v') }, true); return; }
    var more = t.closest('[data-more]');
    if(more){
      var g = more.getAttribute('data-more'), before = qa('#g-' + g + ' .kb-row').length;
      shown[g] = (shown[g] || PAGE_OVERVIEW) + PAGE_STEP;
      renderList();
      var rows = qa('#g-' + g + ' .kb-row'); var nx = rows[before]; if(nx){ var a = q('.t a', nx); if(a) a.focus({ preventScroll:true }); }
      return;
    }
    var drop = t.closest('[data-drop]');
    if(drop){ var o = {}, k = drop.getAttribute('data-drop'); o[k] = (k === 'ru' || k === 'free') ? false : ''; apply(o, true); return; }
    var reset = t.closest('[data-res="reset"]');
    if(reset){ e.preventDefault(); resetAll(); return; }
    var sit = t.closest('a[data-sit]');
    if(sit){ e.preventDefault(); apply({ sit: sit.getAttribute('data-sit') }, true); var top = q('.kb-filters'); if(top) window.scrollTo({ top: Math.max(0, q('.kb-cover').offsetHeight - 40), behavior: reduced() ? 'auto' : 'smooth' }); return; }
    var op = t.closest('[data-res="sheet-open"]'); if(op){ openSheet(); return; }
    if(t.closest('[data-res="sheet-ok"]') || t.closest('[data-res="scrim"]')){ closeSheet(); return; }
  });
  window.addEventListener('popstate', function(){ readUrl(); shown = {}; renderList(); });
  window.addEventListener('hashchange', function(){ openById(location.hash.slice(1)); });
  D.addEventListener('keydown', function(e){
    var sheet = q('[data-res="sheet"]');
    if(!sheet || sheet.hidden) return;
    if(e.key === 'Escape'){ closeSheet(); return; }
    if(e.key === 'Tab'){
      var f = qa('select, button, input, a[href]', sheet).filter(function(x){ return !x.disabled && x.offsetParent !== null; });
      if(!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && D.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && D.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
}
function openSheet(){
  var sheet = q('[data-res="sheet"]'), scrim = q('[data-res="scrim"]'), btn = q('[data-res="sheet-open"]');
  sheet.hidden = false; scrim.hidden = false; if(btn) btn.setAttribute('aria-expanded', 'true');
  var f = q('select, button', sheet); if(f) f.focus();
}
function closeSheet(){
  var sheet = q('[data-res="sheet"]'), scrim = q('[data-res="scrim"]'), btn = q('[data-res="sheet-open"]');
  sheet.hidden = true; scrim.hidden = true;
  if(btn){ btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
}

/* ---------- строка по адресу #id ---------- */
function openById(id){
  if(!id || !BY[id]) return;
  var el = D.getElementById(id);
  if(!el){
    /* записи нет под текущими фильтрами — сбросить и показать её группу целиком до неё */
    if(!match(BY[id])){ st = { sit:'', doo:'', ru:false, free:false, ev:'', type:'' }; try { history.replaceState(null, '', location.pathname + location.hash); } catch(e){} }
    shown = {};
    var all = found(), pick = pickRecord(all), g = groupOf(BY[id]);
    var list = sortList(all.filter(function(r){ return r !== pick && groupOf(r) === g; }));
    var i = list.indexOf(BY[id]);
    if(i > -1){ var base = active() ? PAGE_FILTERED : PAGE_OVERVIEW; shown[g] = Math.max(base, i + 1); }
    renderList();
    el = D.getElementById(id);
  }
  if(!el) return;
  var det = q('details', el); if(det) det.open = true;
  el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit');
  var bar = q('.kb-filters'), off = (bar ? bar.offsetHeight : 0) + 90;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - off, behavior: reduced() ? 'auto' : 'smooth' });
  var a = q('.t a', el); if(a) a.focus({ preventScroll:true });
}

/* ---------- запуск ---------- */
function json(name){ return fetch(DATA + name, { cache:'no-cache' }).then(function(r){ if(!r.ok) throw new Error(name + ' ' + r.status); return r.json(); }); }
function init(res, sits, kbi){
  if(!Array.isArray(res)) throw new Error('resources.json: ожидался список');
  R = res; R.forEach(function(r, i){ BY[r.id] = r; ORDER[r.id] = i; });
  SIT = sits.items || []; SIT.forEach(function(s){ SIT_BY[s.slug] = s; });
  KBI = {}; ((kbi && kbi.items) || []).forEach(function(it){ KBI[it.key] = it; });
  var tot = q('[data-res="total"]'); if(tot) tot.textContent = plural(R.length, ['запись','записи','записей']);
  q('[data-res="bar"]').innerHTML = controlsHtml('bar');
  q('[data-res="sheet"]').innerHTML = controlsHtml('sheet');
  readUrl();
  bind();
  renderList();
  if(location.hash.length > 1) setTimeout(function(){ openById(decodeURIComponent(location.hash.slice(1))); }, 80);
}
function fail(err){
  if(window.console) console.warn('Ресурсы: не удалось загрузить данные', err);
  var m = q('[data-res="main"]'); if(m) m.innerHTML = '<div class="kb-empty"><p class="kb-h3">Список не загрузился</p><p class="small">Обнови страницу чуть позже.</p></div>';
}
function start(){
  Promise.all([json('resources.json'), json('situations.json'), json('kb-index.json').catch(function(){ return null; })])
    .then(function(a){ init(a[0], a[1], a[2]); }).catch(fail);
}
if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
