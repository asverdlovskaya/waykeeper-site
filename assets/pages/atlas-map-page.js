/* =========================================================================
   Большая карта атласа · запуск страницы atlas-map.html (assets/pages/atlas-map-page.js).
   1) ядро данных window.Atlas (то же, что было в atlas.js: данные, срезы, связи, утилиты);
   2) монтирование карты (atlas-map.js) во весь экран;
   3) адреса: atlas-map.html#<id> — выбрать специалиста, #fam-<семья> — паспорт семьи,
      #route-<маршрут> — пройти маршрут, #story — «Как читать карту».
      При выборе на карте адрес меняется сам (ссылкой можно поделиться).
   Страницы специалистов: atlas/<id>.html (генерирует _tools/atlas_pages.py).
   ========================================================================= */
(function () {
'use strict';

/* ======================= 1. УТИЛИТЫ ======================= */
const $ = (q, r) => (r || document).querySelector(q);
const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('wk-atlas-' + k)); localStorage.setItem('wk-atlas-' + k, JSON.stringify(v)); } catch (e) { return null; } };
function plural(n, one, few, many) { const m10 = n % 10, m100 = n % 100; return n + ' ' + (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many); }
const CYR = 'а-яёa-z0-9';

/* ======================= 2. ДАННЫЕ И СРЕЗЫ ======================= */
let D, ALL = [], MAIN = [], ALT = [], BY = {}, FAMS = [], FAM = {}, TERMS = {}, ROUTES = {}, MENTIONS = {}, REL = {};

const ICON = {
  dx: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/></svg>',
  rx: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2.5" y="5.5" width="11" height="5" rx="2.5" transform="rotate(-35 8 8)"/><path d="m6.2 4.6 3.6 6.8" transform="rotate(-35 8 8)"/></svg>',
  body: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="3.5" r="1.8"/><path d="M8 6v4.5M4.5 7.5h7M6 15l2-4.5 2 4.5"/></svg>',
  grp: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="5" cy="6" r="2"/><circle cx="11" cy="6" r="2"/><path d="M1.5 13c.5-2.2 2-3.3 3.5-3.3S8 10.8 8.5 13M7.5 13c.5-2.2 2-3.3 3.5-3.3s3 1.1 3.5 3.3"/></svg>',
  search: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg>'
};
const FLAG_ICONS = [['Диагноз', 'dx', 'ставит диагноз'], ['Лекарства', 'rx', 'назначает лекарства'], ['Тело', 'body', 'работает с телом'], ['Группы', 'grp', 'работает с группами']];
function flagIcons(p) {
  return '<span class="icons">' + FLAG_ICONS.filter(f => p.flags[f[0]] === 'да').map(f => `<span title="${f[2]}">${ICON[f[1]]}</span>`).join('') + '</span>';
}

/* срезы: значение, подпись, цвет — используются в «раскрасить», «группировать», фильтрах и таблице */
const ORD = n => `var(--ord-${n})`;
const FACETS = {
  family: { label: 'Семья', values: () => FAMS.map(f => f.id), name: v => (FAM[v] || {}).name || v, color: v => `var(--fam-${v})`, of: p => p.family },
  level: { label: 'Уровень', values: () => ['1', '2', '3', '4'], name: v => v + '. ' + D.levels[v], color: v => ORD(+v + 1), of: p => String(p.level) },
  training: { label: 'Подготовка', values: () => D.training, name: v => v, color: v => ORD(D.training.indexOf(v) + 1), of: p => p.training },
  character: { label: 'Характер помощи', values: () => ['1', '2', '3', '4'], name: v => D.character[v], color: v => ORD(+v + 1), of: p => String(p.depth) },
  inRussia: { label: 'Есть в России', values: () => ['да', 'редко', 'нет'], name: v => v, color: v => ({ 'да': ORD(4), 'редко': ORD(2), 'нет': ORD(1) })[v], of: p => p.inRussia },
  verification: { label: 'Уровень проверки', values: () => ['высокий', 'средний', 'низкий'], name: v => v, color: v => ({ 'высокий': ORD(4), 'средний': ORD(3), 'низкий': ORD(1) })[v], of: p => p.verification },
  availability: { label: 'Доступность', values: () => D.availability, name: v => v, color: v => ORD(D.availability.indexOf(v) + 2), of: p => p.availability, multi: true },
  resource: { label: 'Ресурс', values: () => D.resources, name: v => v, color: () => ORD(3), of: p => p.resources, multi: true }
};

function init(data) {
  D = data;
  MAIN = D.professions; ALT = D.alt; ALL = MAIN.concat(ALT);
  ALL.forEach(p => BY[p.id] = p);
  FAMS = D.families; FAMS.forEach(f => FAM[f.id] = f);
  D.content.terms.forEach(t => TERMS[t.id] = t);
  D.content.routes.forEach(r => ROUTES[r.id] = r);
  // упоминания: кто ссылается на специалиста в полях «с кем путают», «с кем стыкуется», «чем не занимается»
  const pats = MAIN.map(p => ({ id: p.id, re: nameRe(p) }));
  MAIN.forEach(src => {
    const txt = ['partners', 'confused', 'notDo'].map(k => src.sections[k] || '').join(' ');
    pats.forEach(t => { if (t.id !== src.id && t.re && t.re.test(txt)) (MENTIONS[t.id] = MENTIONS[t.id] || []).push(src.id); });
    // связи для карты: с кем стыкуется и с кем путают
    ['partners', 'confused'].forEach(kind => pats.forEach(t => { if (t.id !== src.id && t.re && t.re.test(src.sections[kind] || '')) (REL[src.id] = REL[src.id] || []).push({ id: t.id, kind }); }));
  });
}
function nameRe(p) {
  // имя в любом падеже: «клинический психолог» найдёт и «клиническому психологу»
  const stem = w => (w.length > 5 ? w.replace(/(ий|ый|ой|ая|ое|ые|ие|а|я|ь|й|о|е|ы|и)$/, '') : w).replace(/[.*+?^${}()|[\]\\«»]/g, '\\$&') + `[${CYR}]{0,4}`;
  const first = p.name.split(' / ')[0], cut = p.name.includes(' / ') && !first.includes(' ');
  const names = [cut ? '' : first, p.short].filter(n => n && n.length >= 6).map(n => n.toLowerCase().replace(/[«»"]/g, '').split(/\s+/).map(stem).join('\\s+'));
  if (!names.length) return null;
  return new RegExp(`(?<![${CYR}])(${[...new Set(names)].join('|')})(?![${CYR}])`, 'i');
}
const BY_LEN = () => MAIN.slice().sort((a, b) => b.name.length - a.name.length);
const sortP = (a, b) => (a.level - b.level) || a.short.localeCompare(b.short, 'ru');

/* ======================= ЗАПУСК КАРТЫ ======================= */
const PAGES = 'atlas/';
function argOf(hash) {
  const h = decodeURIComponent((hash || '').replace(/^#/, ''));
  if (!h) return { arg: null };
  if (h === 'story') return { tour: ['story'] };
  if (h.startsWith('route-')) return { tour: ['route', h.slice(6)] };
  if (h.startsWith('fam-')) return { arg: 'family:' + h.slice(4) };
  return { arg: BY[h] ? h : null };
}
let selfHash = '';
function onSelect(h) {
  selfHash = h ? '#' + h : '';
  try { history.replaceState(null, '', location.pathname + location.search + selfHash); } catch (e) { }
}
function run(o) {
  const M = window.AtlasMap;
  if (o.tour) { M.tour(o.tour[0], o.tour[1]); return; }
  M.go(o.arg);
}
function boot(data) {
  init(data);
  window.Atlas = { D, MAIN, ALT, ALL, BY, FAMS, FAM, TERMS, ROUTES, REL, MENTIONS, FACETS, ICON, FLAG_ICONS, flagIcons, esc, plural, store, sortP,
    hidePv: () => { }, isCompared: () => false,
    pageHref: id => PAGES + encodeURIComponent(id) + '.html',
    famHref: id => PAGES + 'fam-' + id + '.html',
    compareHref: id => PAGES + 'compare.html?ids=' + encodeURIComponent(id),
    onSelect, fullPage: true };
  renderCounts();
  const host = $('#atlasMap'); if (!host || !window.AtlasMap) return;
  const first = argOf(location.hash);
  window.AtlasMap.mount(host, first.arg);
  if (first.tour) setTimeout(() => run(first), 500);
  window.addEventListener('hashchange', () => { if (location.hash !== selfHash) run(argOf(location.hash)); });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-tour-story]')) { e.preventDefault(); window.AtlasMap.tour('story'); }
  });
  document.documentElement.classList.add('atlas-ready');
}
function renderCounts() {
  $$('[data-n="main"]').forEach(e => e.textContent = MAIN.length);
  $$('[data-n="alt"]').forEach(e => e.textContent = ALT.length);
  $$('[data-n="fams"]').forEach(e => e.textContent = FAMS.length - 1);
}
fetch('assets/data/atlas.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(boot).catch(err => {
  $$('[data-boot]').forEach(b => { b.textContent = location.protocol === 'file:' ? 'Карта открывается только с сайта (адрес http://…), не двойным щелчком по файлу.' : 'Не удалось загрузить данные атласа (' + err.message + '). Обновите страницу.'; });
});
})();
