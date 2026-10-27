/* =========================================================================
   Атлас помогающих профессий · вики (assets/pages/atlas-wiki.js).
   Страницы делает _tools/atlas_pages.py; этот скрипт только оживляет их:
     (поиск по базе знаний — общий assets/kb.js);
     [data-aw-req]      «С каким вопросом к кому» на входе: запрос → специалисты;
     [data-aw-reqpage]  фильтр указателя запросов (atlas/requests.html);
     [data-aw-all]      фильтры списка всех специалистов (atlas/all.html?fam=…&lvl=…);
     .aw-toc            оглавление статьи: огонёк у раздела, который читаешь;
     [data-aw-compare]  сравнение до четырёх специалистов (atlas/compare.html?ids=a,b,c,d).
   Корень сайта относительно страницы — body[data-aw-root] ("" или "../").
   ========================================================================= */
(function () {
'use strict';
const $ = (q, r) => (r || document).querySelector(q);
const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const low = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
const stem = w => w.slice(0, Math.max(3, w.length - 2));
const words = q => low(q).trim().split(/\s+/).filter(Boolean);
function plural(n, one, few, many) { const m10 = n % 10, m100 = n % 100; return n + ' ' + (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many); }

const ROOT = document.body.dataset.awRoot || '';
const page = id => ROOT + 'atlas/' + id + '.html';
let idxP = null;
const loadIndex = () => idxP || (idxP = fetch(ROOT + 'assets/data/atlas-index.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));

/* Поиск по базе знаний — общий assets/kb.js (форма .kb-search); здесь своего поиска нет. */

/* ---------- «С каким вопросом к кому» на входе ---------- */
const reqBox = $('[data-aw-req]');
if (reqBox) {
  const inp = $('input', reqBox), out = $('.aw-req-out', reqBox);
  const draw = () => loadIndex().then(I => {
    const ws = words(inp.value);
    if (!ws.length) { out.innerHTML = ''; return; }
    const hits = [];
    I.p.forEach(p => { if (p.alt) return; const m = p.q.filter(r => ws.every(w => low(r).includes(stem(w)))); if (m.length) hits.push({ p, m }); });
    hits.sort((a, b) => b.m.length - a.m.length || (a.p.l - b.p.l));
    const n = hits.reduce((a, h) => a + h.m.length, 0);
    out.innerHTML = hits.length
      ? `<ul>${hits.slice(0, 8).map(h => `<li><a href="${page(h.p.id)}"><b>${esc(h.p.s)}</b><em>${esc(h.p.fn)}</em><small>${esc(h.m[0])}</small></a></li>`).join('')}</ul>
         <p>${plural(n, 'запрос', 'запроса', 'запросов')} у ${plural(hits.length, 'специалиста', 'специалистов', 'специалистов')}${hits.length > 8 ? ' · показаны первые 8' : ''}</p>`
      : '<p>Ничего не нашлось. Попробуйте другое слово.</p>';
  });
  inp.addEventListener('input', draw);
  $$('[data-req-try]', reqBox).forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.reqTry; draw(); inp.focus(); }));
}

/* ---------- указатель запросов: фильтр ---------- */
const reqPage = $('[data-aw-reqpage]');
if (reqPage) {
  const inp = $('input', reqPage), cnt = $('[data-count]', reqPage), empty = $('.aw-empty', reqPage), total = +cnt.dataset.total;
  const fams = $$('.aw-reqfam', reqPage);
  const run = () => {
    const ws = words(inp.value); let n = 0;
    fams.forEach(d => {
      let k = 0;
      $$('li', d).forEach(li => { const ok = !ws.length || ws.every(w => li.dataset.q.includes(stem(w))); li.hidden = !ok; if (ok) k++; });
      d.hidden = !k; $('[data-n]', d).textContent = k; n += k;
      if (ws.length) d.open = k > 0 && k <= 40 || d.open;
    });
    cnt.textContent = ws.length ? plural(n, 'запрос', 'запроса', 'запросов') + ' подходит' : plural(total, 'запрос', 'запроса', 'запросов') + ' · нажмите на семью, чтобы раскрыть';
    empty.hidden = !!n;
  };
  inp.addEventListener('input', run);
  const h = decodeURIComponent(location.hash.slice(1)); const d = h && document.getElementById(h); if (d && d.tagName === 'DETAILS') d.open = true;
}

/* ---------- все специалисты: фильтры ---------- */
const allBox = $('[data-aw-all]');
if (allBox) {
  const q = $('[data-f="q"]', allBox), fam = $('[data-f="fam"]', allBox), lvl = $('[data-f="lvl"]', allBox);
  const rows = $$('tbody tr', allBox), cnt = $('[data-count]', allBox), empty = $('.aw-empty', allBox);
  const sp = new URLSearchParams(location.search);
  if (sp.get('fam')) fam.value = sp.get('fam');
  if (sp.get('lvl')) lvl.value = sp.get('lvl');
  if (sp.get('q')) q.value = sp.get('q');
  const run = () => {
    const ws = words(q.value), f = fam.value, l = lvl.value; let n = 0;
    rows.forEach(r => { const ok = (!f || r.dataset.fam === f) && (!l || r.dataset.lvl === l) && ws.every(w => r.dataset.q.includes(stem(w))); r.hidden = !ok; if (ok) n++; });
    cnt.textContent = (n === rows.length ? 'Все ' : 'Показано: ') + plural(n, 'специалист', 'специалиста', 'специалистов');
    empty.hidden = !!n;
    const p = new URLSearchParams(); if (f) p.set('fam', f); if (l) p.set('lvl', l); if (q.value.trim()) p.set('q', q.value.trim());
    try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { }
  };
  [q, fam, lvl].forEach(el => el.addEventListener(el === q ? 'input' : 'change', run)); run();
}

/* ---------- оглавление статьи: где я сейчас ---------- */
const toc = $('.aw-toc, .kb-toc');
if (toc && 'IntersectionObserver' in window) {
  const links = $$('a', toc), secs = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const vis = new Set();
  const mark = () => {
    const cur = secs.find(s => vis.has(s)) || null;
    links.forEach(a => a.classList.toggle('is-here', !!cur && a.hash === '#' + cur.id));
  };
  const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)); mark(); }, { rootMargin: '-15% 0px -60% 0px' });
  secs.forEach(s => io.observe(s));
}

/* ---------- сравнение ---------- */
const cmpBox = $('[data-aw-compare]');
if (cmpBox) {
  const PAIRS = [['counselling-psychologist', 'psychotherapist-psychologist', 'psychiatrist'], ['life-coach', 'counselling-psychologist'], ['death-doula', 'palliative-nurse'], ['family-therapist', 'family-mediator'], ['legal-aid-lawyer', 'family-lawyer'], ['alt-family-constellations', 'family-therapist']];
  const plain = s => String(s || '').replace(/\s*\[(\d+(?:\s*,\s*\d+)*)\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').trim();
  fetch(ROOT + 'assets/data/atlas.json').then(r => r.json()).then(D => {
    const ALL = D.professions.concat(D.alt), BY = {}; ALL.forEach(p => BY[p.id] = p);
    const fam = p => p.layer === 'alt' ? 'alt' : p.family;
    const ROWS = [['Семья', p => esc(p.layer === 'alt' ? 'Отдельный слой' : p.familyName)], ['Уровень', p => p.level ? p.level + ' · ' + esc(p.levelName) : '—'], ['Подготовка', p => esc(p.training)], ['Характер помощи', p => esc(p.character || '—')],
      ['Есть в России', p => esc(p.inRussia)], ['Доступность', p => esc(p.availability.join(' · '))], ['Онлайн', p => esc(p.online)], ['Что можно получить', p => esc(p.resources.join(', '))],
      ...D.flags.map(k => [k, p => esc(p.flags[k] || '—')]),
      ['За что отвечает', p => esc(p.responsible), true], ['Запросы', p => '<ul>' + p.requests.slice(0, 5).map(r => `<li>${esc(r)}</li>`).join('') + '</ul>', true], ['Чего не делает', p => esc(plain(p.sections.notDo)), true]];
    let ids = (new URLSearchParams(location.search).get('ids') || '').split(',').filter(id => BY[id]).slice(0, 4);
    const save = () => { try { history.replaceState(null, '', location.pathname + (ids.length ? '?ids=' + ids.join(',') : '')); } catch (e) { } };
    const draw = () => {
      const ps = ids.map(i => BY[i]);
      const pick = `<div class="aw-cmp-pick"><label class="aw-q"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg><span class="visually-hidden">Добавить специалиста</span><input id="cq" list="cqlist" placeholder="Добавить специалиста в сравнение" autocomplete="off"></label><datalist id="cqlist">${ALL.map(p => `<option value="${esc(p.short)}">${esc(p.name)}</option>`).join('')}</datalist></div>`;
      const table = ps.length >= 2
        ? `<div class="aw-cmp"><table><thead><tr><th scope="col"><span class="visually-hidden">Поле</span></th>${ps.map(p => `<th scope="col"><a href="${p.id}.html">${esc(p.short)}</a>${p.name !== p.short ? `<small>${esc(p.name)}</small>` : ''}<button type="button" class="aw-x" data-un="${p.id}">убрать</button></th>`).join('')}</tr></thead><tbody>
          ${ROWS.map(r => { const v = ps.map(r[1]); const diff = !r[2] && new Set(v).size > 1; return `<tr class="${diff ? 'diff' : ''}"><th scope="row">${esc(r[0])}</th>${v.map(x => `<td>${x}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`
        : `<p class="aw-meta" style="margin-top:var(--sp-4)">${ps.length ? 'Добавьте ещё одного специалиста: «' + esc(ps[0].short) + '» уже в сравнении. <button type="button" class="aw-x" data-un="' + ps[0].id + '">убрать</button>' : 'Выберите двух-четырёх специалистов в поле выше или нажмите «Сравнить с другим» на странице специалиста.'}</p>`;
      cmpBox.innerHTML = pick + table + `<div class="aw-cmp-pairs"><h2>Кого чаще всего путают</h2><p class="aw-chips">${PAIRS.filter(pp => pp.every(x => BY[x])).map(pp => `<a class="aw-chip" href="?ids=${pp.join(',')}">${pp.map(x => esc(BY[x].short)).join(' · ')}</a>`).join('')}</p></div>`;
      const inp = $('#cq', cmpBox);
      inp.addEventListener('change', () => { const p = ALL.find(x => x.short === inp.value || x.name === inp.value); if (p && !ids.includes(p.id)) { if (ids.length >= 4) ids.shift(); ids.push(p.id); save(); draw(); $('#cq', cmpBox).focus(); } });
    };
    cmpBox.addEventListener('click', e => { const b = e.target.closest('[data-un]'); if (b) { ids = ids.filter(x => x !== b.dataset.un); save(); draw(); } });
    draw();
  }).catch(err => { cmpBox.innerHTML = '<p class="aw-meta">Не удалось загрузить данные атласа (' + esc(err.message) + '). Обновите страницу.</p>'; });
}
})();
