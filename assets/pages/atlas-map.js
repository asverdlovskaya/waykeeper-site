/* =========================================================================
   Большая карта · Waykeeper site-v2 (assets/pages/atlas-map.js).
   Перенос 04-encyclopedia/site/map.js: логика та же. С 26.10.2026 карта живёт на
   отдельной странице atlas-map.html во весь экран (запуск — atlas-map-page.js);
   «Во весь экран» прячет и узкую шапку карты. Кнопки панели ведут на страницы вики:
   X.pageHref(id) → atlas/<id>.html, X.famHref(id) → atlas/fam-<id>.html,
   X.compareHref(id) → atlas/compare.html?ids=<id>; о выборе сообщает X.onSelect(адрес | null).
   Колёсико мыши приближает карту, только когда на неё нажали (иначе страница листается);
   стрелки и +/- работают, пока фокус на карте. Колесо «семьи × кольца» как территория.
   Что умеет: приближение с подробностями по мере приближения; кольца
   перестраиваются по уровню, подготовке или характеру помощи; смысловая
   заливка территории; связи; «Как читать карту»; маршруты; наблюдения;
   паспорт семьи; «Моя сеть»; мини-карта; полный экран.
   Зависит от window.Atlas — ядра из atlas-map-page.js (данные, срезы, утилиты).
   Разделы: 1) константы 2) геометрия 3) камера 4) кадр и подписи
   5) выбор и панели 6) режимы территории 7) история, маршруты, наблюдения
   8) моя сеть 9) боковые панели 10) монтирование и события.
   ========================================================================= */
(function () {
'use strict';

/* ---------------- 1. КОНСТАНТЫ ---------------- */
const D2R = Math.PI / 180;
// мировые координаты: центр колеса (0,0); внутренний и внешний радиусы колец
const G = { r0: 130, rOut: 1050, supR: 1100, supIn: 1074, supOut: 1126, famR: 1180, gap: 26, ext: 1330, island: { x: 1500, y: 1010, r: 225 } };
// ступени подробности: во сколько раз приближено относительно «вся карта»
const STEPS = [{ s: 1, name: 'Обзор' }, { s: 2.1, name: 'Имена' }, { s: 3.6, name: 'Детали' }, { s: 5.8, name: 'Карточки' }];
// подписи точек — размером --s5 (13 px): типографика v1, пять размеров
const F_NAME = '500 13px Onest, sans-serif', F_META = '400 13px Onest, sans-serif', F_RESP = '400 13px Onest, sans-serif';
const TRAIN_SHORT = { 'без подготовки': 'без подготовки', 'короткие курсы': 'короткие курсы', 'длительная подготовка и сертификация': 'длительная подготовка', 'профильное образование': 'профильное образование', 'образование и государственный допуск': 'образование и допуск' };
const CHAR_SHORT = { 1: 'поддержка', 2: 'сопровождение', 3: 'терапия', 4: 'лечение' };
const MARKS = { have: 'Есть контакт', want: 'Хочу найти', learn: 'Изучить' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pol = (r, a) => [r * Math.cos(a * D2R), r * Math.sin(a * D2R)];
const f1 = n => Math.round(n * 10) / 10;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let X = null, M = null;

// чем можно раскладывать кольца
const RINGS = {
  level: { label: 'Уровень', hint: 'на чём держится помощь в России', vals: () => [1, 2, 3, 4], name: v => X.D.levels[v], of: p => p.level, wall: 3 },
  training: { label: 'Подготовка', hint: 'насколько серьёзно обучен специалист', vals: () => [1, 2, 3, 4, 5], name: v => TRAIN_SHORT[X.D.training[v - 1]], of: p => X.D.training.indexOf(p.training) + 1, wall: 4 },
  character: { label: 'Характер помощи', hint: 'что происходит в работе', vals: () => [1, 2, 3, 4], name: v => CHAR_SHORT[v], of: p => p.depth, wall: null }
};
// чем можно залить территорию: доля специалистов участка, у которых это есть
function metrics() {
  const L = [
    { id: 'dx', label: 'Ставят диагноз', short: 'ставят диагноз', test: p => (p.flags || {})['Диагноз'] === 'да' },
    { id: 'rx', label: 'Назначают лекарства', short: 'назначают лекарства', test: p => (p.flags || {})['Лекарства'] === 'да' },
    { id: 'free', label: 'Есть бесплатно', short: 'есть бесплатно', test: p => (p.availability || []).some(a => a !== 'платно') },
    { id: 'online', label: 'Можно онлайн', short: 'работают онлайн', test: p => p.online === 'да' },
    { id: 'ru', label: 'Есть в России', short: 'есть в России', test: p => p.inRussia === 'да' },
    { id: 'ver', label: 'Надёжно проверены', short: 'проверены надёжно', test: p => p.verification === 'высокий' }
  ];
  X.D.resources.forEach((r, i) => L.push({ id: 'res' + i, label: r[0].toUpperCase() + r.slice(1), short: 'дают: ' + r, test: p => (p.resources || []).includes(r), res: true }));
  return L;
}

const cvs = document.createElement('canvas').getContext('2d');
const mw = (t, f) => { cvs.font = f; return cvs.measureText(t).width; };
function wrap(text, font, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (!cur || mw(t, font) <= maxW) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  if (maxLines && lines.length > maxLines) {
    let last = lines.slice(maxLines - 1).join(' ');
    while (last.length > 1 && mw(last + '…', font) > maxW) last = last.slice(0, -1);
    return lines.slice(0, maxLines - 1).concat(last.replace(/[\s,.;:—-]+$/, '') + '…');
  }
  return lines;
}
function arcPath(ri, ro, a0, a1) {
  const lg = a1 - a0 > 180 ? 1 : 0, [x0, y0] = pol(ro, a0), [x1, y1] = pol(ro, a1), [x2, y2] = pol(ri, a1), [x3, y3] = pol(ri, a0);
  return `M${f1(x0)} ${f1(y0)}A${f1(ro)} ${f1(ro)} 0 ${lg} 1 ${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}A${f1(ri)} ${f1(ri)} 0 ${lg} 0 ${f1(x3)} ${f1(y3)}Z`;
}
const ring = (ri, ro) => `M${ro} 0A${ro} ${ro} 0 1 1 ${-ro} 0A${ro} ${ro} 0 1 1 ${ro} 0ZM${ri} 0A${ri} ${ri} 0 1 0 ${-ri} 0A${ri} ${ri} 0 1 0 ${ri} 0Z`;
function bounds(a0, a1, ri, ro) {
  const b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; for (const r of [ri, ro]) { const [x, y] = pol(r, a); b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); } }
  return b;
}
const esc = s => X.esc(s);
// поиск по началу слова: «сплю» найдёт «не сплю», но не «бесплатный»
const LETTER = /[а-яёa-z0-9]/i;
function hasStem(hay, st) { let i = hay.indexOf(st); while (i >= 0) { if (i === 0 || !LETTER.test(hay[i - 1])) return true; i = hay.indexOf(st, i + 1); } return false; }
const queryStems = q => q.toLowerCase().split(/\s+/).filter(w => w.length >= 3).map(w => w.slice(0, Math.max(3, w.length - 2)));
const plural = (n, a, b, c) => X.plural(n, a, b, c);

/* ---------------- 2. ГЕОМЕТРИЯ ---------------- */
/* раскладка точек в участке «семья × кольцо»: ряды по радиусу, в каждом ряду — поровну по дуге */
function layoutCell(items, ri, ro, a0, a1) {
  const n = items.length; if (!n) return [];
  const rin = ri + 30, rout = ro - 14, T = Math.max(10, rout - rin);
  let best = null;
  for (let R = 1; R <= Math.min(n, 8); R++) {
    const rows = [];
    for (let i = 0; i < R; i++) { const r = R === 1 ? (rin + rout) / 2 : rin + T * (i + .5) / R; rows.push({ r, arc: Math.max(12, (a1 - a0) * D2R * r - 30) }); }
    const tot = rows.reduce((s, x) => s + x.arc, 0);
    rows.forEach(x => x.n = Math.max(1, Math.round(n * x.arc / tot)));
    let sum = rows.reduce((s, x) => s + x.n, 0);
    while (sum > n) { let j = -1; rows.forEach((x, i) => { if (x.n > 1 && (j < 0 || x.arc / x.n < rows[j].arc / rows[j].n)) j = i; }); if (j < 0) break; rows[j].n--; sum--; }
    while (sum < n) { let j = 0; rows.forEach((x, i) => { if (x.arc / (x.n + 1) > rows[j].arc / (rows[j].n + 1)) j = i; }); rows[j].n++; sum++; }
    if (sum !== n) continue;
    const score = Math.min(Math.min(...rows.map(x => x.arc / x.n)), (T / R) * 1.5);
    if (!best || score > best.score) best = { score, rows };
  }
  const out = []; let k = 0;
  best.rows.forEach(row => {
    const padA = 15 / row.r / D2R, span = (a1 - a0) - 2 * padA;
    for (let j = 0; j < row.n; j++) out.push({ p: items[k++], r: row.r, a: a0 + padA + span * (j + .5) / row.n });
  });
  return out;
}
function buildSectors() {
  const fams = X.FAMS.filter(f => f.id !== 'support');
  const cnt = id => X.MAIN.filter(p => p.family === id).length;
  // размер сектора растёт с числом специалистов, но мягко: маленькие семьи не исчезают
  const w = fams.map(f => Math.pow(Math.max(cnt(f.id), 5), 0.8)), tot = w.reduce((a, b) => a + b, 0), span = 360 - G.gap;
  let a = -90 + G.gap / 2;
  return fams.map((f, i) => { const a0 = a, a1 = a + span * w[i] / tot; a = a1; return { id: f.id, f, a0, a1, am: (a0 + a1) / 2, n: cnt(f.id) }; });
}
/* кольца для выбранного режима: толщина кольца растёт с самым населённым участком в нём */
function layoutRings(mode) {
  const RM = RINGS[mode], vals = RM.vals(), tr = X.D.training;
  const cellSort = (a, b) => (tr.indexOf(a.training) - tr.indexOf(b.training)) || (a.level - b.level) || a.short.localeCompare(b.short, 'ru');
  const main = X.MAIN.filter(p => p.family !== 'support');
  const m = vals.map(v => Math.max(...M.sectors.map(s => main.filter(p => p.family === s.id && RM.of(p) === v).length)));
  const t = m.map(c => 70 + 24 * c), k = (G.rOut - G.r0) / t.reduce((a, b) => a + b, 0);
  const R = [G.r0]; t.forEach(x => R.push(R[R.length - 1] + x * k));
  const cells = [], pos = new Map();
  M.sectors.forEach(s => vals.forEach((v, i) => {
    const items = main.filter(p => p.family === s.id && RM.of(p) === v).sort(cellSort);
    cells.push({ fam: s.id, l: v, i, a0: s.a0, a1: s.a1, am: s.am, ri: R[i], ro: R[i + 1], n: items.length, items, hk: 0 });
    layoutCell(items, R[i], R[i + 1], s.a0, s.a1).forEach(o => pos.set(o.p.id, { r: o.r, a: o.a }));
  }));
  return { R, cells, pos, vals };
}
function buildPins() {
  const pins = [];
  X.MAIN.filter(p => p.family !== 'support').forEach(p => pins.push({ p, r: 0, a: 0 }));
  const sup = X.MAIN.filter(p => p.family === 'support').sort((a, b) => a.short.localeCompare(b.short, 'ru'));
  sup.forEach((p, k) => pins.push({ p, r: G.supR, a: -90 + (k - (sup.length - 1) / 2) * 4.8 }));
  X.ALT.forEach((p, k) => { const ang = (-90 + k * 360 / X.ALT.length) * D2R; pins.push({ p, fixed: true, x: G.island.x + 150 * Math.cos(ang), y: G.island.y + 150 * Math.sin(ang) }); });
  pins.forEach((q, i) => { q.i = i; q.id = q.p.id; });
  return pins;
}
function setXY(q) { if (!q.fixed) { q.x = q.r * Math.cos(q.a * D2R); q.y = q.r * Math.sin(q.a * D2R); } }

/* ---------------- 3. КАМЕРА ---------------- */
function avail() {
  const mob = M.W < 760;
  const pr = M.panelOpen && !mob ? Math.min(400, M.W * 0.42) : 0;
  const pl = M.drawer && !mob ? 444 : 0;
  const pb = mob ? (M.panelOpen ? M.H * 0.56 : M.drawer ? M.H * 0.6 : 70) : 0;
  return { x: pl, y: 0, w: Math.max(200, M.W - pr - pl), h: Math.max(200, M.H - pb) };
}
const sNow = () => M.v.k / M.fitK;
const clampK = k => Math.max(M.fitK * 0.55, Math.min(M.fitK * 14, k));
function setView(cx, cy, k) { const a = avail(); M.v = { k, x: a.x + a.w / 2 - cx * k, y: a.y + a.h / 2 - cy * k }; req(); }
function center() { const a = avail(); return [(a.x + a.w / 2 - M.v.x) / M.v.k, (a.y + a.h / 2 - M.v.y) / M.v.k]; }
function zoomAt(px, py, f) { const k = clampK(M.v.k * f), r = k / M.v.k; M.v.x = px - (px - M.v.x) * r; M.v.y = py - (py - M.v.y) * r; M.v.k = k; req(); }
function stopMotion() { if (M.flyRaf) cancelAnimationFrame(M.flyRaf); M.flyRaf = 0; M.inertia = null; M.zoomT = null; }
function fly(cx, cy, k, dur) {
  k = clampK(k); stopMotion();
  const [c0x, c0y] = center(), k0 = M.v.k;
  dur = reduced ? 0 : (dur == null ? 750 : dur);
  if (!dur) { setView(cx, cy, k); return; }
  // при дальнем перелёте камера чуть отъезжает, как на настоящих картах
  const dist = Math.hypot(cx - c0x, cy - c0y) * Math.min(k0, k) / Math.max(M.W, 1);
  const bump = Math.min(1.4, Math.max(0, dist - .5) * .9);
  let t0 = null;
  const step = now => {
    if (t0 === null) t0 = now;
    const t = Math.max(0, Math.min(1, (now - t0) / dur)), e = ease(t);
    const kk = Math.exp(Math.log(k0) + (Math.log(k) - Math.log(k0)) * e) / (1 + bump * Math.sin(Math.PI * e));
    setView(c0x + (cx - c0x) * e, c0y + (cy - c0y) * e, kk);
    M.flyRaf = t < 1 ? requestAnimationFrame(step) : 0;
  };
  M.flyRaf = requestAnimationFrame(step);
}
function flyBounds(b, maxS, dur) {
  const a = avail(), k = Math.min(a.w / (b.x1 - b.x0), a.h / (b.y1 - b.y0)) * .84;
  fly((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, Math.min(k, M.fitK * (maxS || 6)), dur);
}
const fitAll = dur => fly(0, 0, M.fitK, dur);
function flySector(id) {
  if (id === 'support') { flyBounds({ x0: -380, y0: -1210, x1: 380, y1: -960 }, 5); return; }
  if (id === 'alt') { const I = G.island; flyBounds({ x0: I.x - I.r - 40, y0: I.y - I.r - 110, x1: I.x + I.r + 40, y1: I.y + I.r + 20 }, 5); return; }
  const s = M.sectors.find(x => x.id === id); if (s) flyBounds(bounds(s.a0, s.a1, G.r0, G.rOut), 4);
}
function flyCell(fam, v) { const c = M.cells.find(x => x.fam === fam && String(x.l) === String(v)); if (c) flyBounds(bounds(c.a0, c.a1, c.ri, c.ro), 7); }

/* ---------------- 4. КАДР И ПОДПИСИ ---------------- */
function req() { if (M && !M.raf) M.raf = requestAnimationFrame(draw); }
const hit = (a, b) => a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + b.h + 3 && b.y < a.y + a.h + 3;

function labelDims(p, tier) {
  const key = p.id + tier; if (M.dims.has(key)) return M.dims.get(key);
  let d;
  const icons = ['Диагноз', 'Лекарства', 'Тело', 'Группы'].filter(k => (p.flags || {})[k] === 'да').length;
  const meta = (TRAIN_SHORT[p.training] || p.training || '') + (p.inRussia && p.inRussia !== 'да' ? ' · в России ' + p.inRussia : '');
  const nl = wrap(p.short || p.name, F_NAME, tier === 4 ? 196 : 150, 2);
  if (tier === 4) {
    const rl = wrap(p.responsible || '', F_RESP, 196, 3), ml = wrap(meta, F_META, 196 - (icons ? icons * 16 + 2 : 0), 2);
    d = { w: 212, h: 10 + nl.length * 15 + ml.length * 15 + 4 + rl.length * 15, html: `<span class="a-n">${nl.map(esc).join('<br>')}</span><span class="a-meta">${X.flagIcons(p)}<span>${ml.map(esc).join('<br>')}</span></span><span class="a-resp">${rl.map(esc).join('<br>')}</span>` };
  } else {
    const nw = Math.max(...nl.map(l => mw(l, F_NAME)));
    if (tier === 3) { const metaW = mw(meta, F_META) + icons * 16 + (icons ? 2 : 0); d = { w: Math.ceil(Math.max(nw, metaW)) + 14, h: 6 + nl.length * 15 + 15, html: `<span class="a-n">${nl.map(esc).join('<br>')}</span><span class="a-meta">${X.flagIcons(p)}<span>${esc(meta)}</span></span>` }; }
    else d = { w: Math.ceil(nw) + 14, h: 6 + nl.length * 15, html: `<span class="a-n">${nl.map(esc).join('<br>')}</span>` };
  }
  M.dims.set(key, d); return d;
}
const SIDES = [(w, h) => ({ x: -w / 2, y: 9 }), (w, h) => ({ x: 11, y: -h / 2 }), (w, h) => ({ x: -w - 11, y: -h / 2 }), (w, h) => ({ x: -w / 2, y: -h - 9 })];

function draw(now) {
  M.raf = 0; if (!M) return;
  now = now || performance.now();
  let again = false;
  // перестройка колец: точки плавно переезжают на новые места
  if (M.morph) {
    if (M.morph.t0 == null) M.morph.t0 = now;
    const t = Math.min(1, (now - M.morph.t0) / M.morph.dur);
    M.pins.forEach(q => { if (!q.to) return; const d = Math.min(1, Math.max(0, (t - q.delay) / .75)), e = ease(d); q.r = lerp(q.from.r, q.to.r, e); q.a = lerp(q.from.a, q.to.a, e); setXY(q); });
    if (M.sel || M.hoverId) drawLinks();
    if (t >= 1) M.morph = null; else again = true;
  }
  // инерция после перетаскивания
  if (M.inertia) { M.v.x += M.inertia.vx; M.v.y += M.inertia.vy; M.inertia.vx *= .92; M.inertia.vy *= .92; if (Math.hypot(M.inertia.vx, M.inertia.vy) < .3) M.inertia = null; else again = true; }
  // плавное приближение колёсиком мыши
  if (M.zoomT) {
    const z = M.zoomT, kk = clampK(M.v.k * Math.pow(z.k / M.v.k, .28)), r = kk / M.v.k;
    M.v.x = z.px - (z.px - M.v.x) * r; M.v.y = z.py - (z.py - M.v.y) * r; M.v.k = kk;
    if (Math.abs(Math.log(z.k / M.v.k)) < .004) M.zoomT = null; else again = true;
  }
  const { x: vx, y: vy, k } = M.v, s = k / M.fitK, W = M.W, H = M.H;
  M.world.setAttribute('transform', `translate(${f1(vx)} ${f1(vy)}) scale(${k.toFixed(5)})`);
  M.world.style.setProperty('--k', k.toFixed(5));
  const sx = x => x * k + vx, sy = y => y * k + vy;
  const on = (x, y, m) => x > -m && x < W + m && y > -m && y < H + m;
  // препятствия: панели интерфейса поверх карты
  const rootR = M.root.getBoundingClientRect(), boxes = [];
  M.hud.forEach(el => { if (el.hidden || el.offsetParent === null) return; const r = el.getBoundingClientRect(); if (r.width) boxes.push({ x: r.left - rootR.left, y: r.top - rootR.top, w: r.width, h: r.height }); });
  // постоянные подписи: семьи, кольца, центр, остров; подписи участков — если есть место
  M.fixed.concat(M.ringFixed).forEach(f => {
    const X0 = sx(f.x), Y0 = sy(f.y), show = f.when(s) && on(X0, Y0, 200);
    if (!show) { if (!f.el.hidden) f.el.hidden = true; return; }
    let bx = f.anchor === 'l' ? X0 : f.anchor === 'r' ? X0 - f.w : X0 - f.w / 2;
    if (f.clamp && W >= 760) bx = Math.max(92, Math.min(W - f.w - 6, bx));
    const box = { x: bx, y: Y0 - f.h / 2, w: f.w, h: f.h };
    if (f.soft && boxes.some(b => hit(b, box))) { if (!f.el.hidden) f.el.hidden = true; return; }
    f.el.hidden = false; f.el.style.transform = `translate(${f1(box.x)}px,${f1(box.y)}px)`; boxes.push(box);
  });
  // специалисты: подписи раскладываются без наложений, важные — первыми
  const tierWant = s < STEPS[1].s ? 1 : s < STEPS[2].s ? 2 : s < STEPS[3].s ? 3 : 4;
  const dots = [];
  M.pins.forEach(q => { q.sx = sx(q.x); q.sy = sy(q.y); q.vis = on(q.sx, q.sy, 240); if (q.vis && !(M.spot && !q.lit) && !q.dim) dots.push({ i: q.i, x: q.sx - 7, y: q.sy - 7, w: 14, h: 14 }); });
  const few = M.match && M.match.size <= 40;
  M.order.forEach(i => {
    const q = M.pins[i], el = q.el;
    if (!q.vis) { if (!el.hidden) el.hidden = true; return; }
    if (el.hidden) el.hidden = false;
    el.style.transform = `translate(${f1(q.sx)}px,${f1(q.sy)}px)`;
    let max = (q.dim || (M.spot && !q.lit)) ? 1 : tierWant;
    if (q.id === M.sel || q.rel || (few && M.match.has(q.id)) || (M.spot && q.lit && M.spotNames)) max = Math.max(max, 2);
    let placed = null;
    for (let t = max; t >= 2 && !placed; t--) {
      const d = labelDims(q.p, t);
      for (let si = 0; si < 4; si++) {
        const o = SIDES[si](d.w, d.h), box = { x: q.sx + o.x, y: q.sy + o.y, w: d.w, h: d.h };
        if (box.x < 4 || box.y < 4 || box.x + box.w > W - 4 || box.y + box.h > H - 4) continue;
        if (boxes.some(b => hit(b, box)) || dots.some(b => b.i !== q.i && hit(b, box))) continue;
        placed = { t, si, o, d, box }; break;
      }
    }
    const lab = q.lab;
    if (!placed) { if (!lab.hidden) { lab.hidden = true; q.lt = ''; } return; }
    boxes.push(placed.box);
    const key = placed.t + ':' + placed.si;
    if (q.lt !== key) {
      if (q.lt.split(':')[0] !== String(placed.t)) { lab.innerHTML = placed.d.html; lab.className = 'a-lab t' + placed.t; }
      lab.style.width = placed.d.w + 'px'; lab.style.left = f1(placed.o.x) + 'px'; lab.style.top = f1(placed.o.y) + 'px';
      q.lt = key;
    }
    if (lab.hidden) lab.hidden = false;
  });
  drawMini(); drawCrumbs(); drawZoom(s);
  if (again) req();
}

/* мини-карта, «где я», шкала подробности */
const MINI_VB = { x: -1350, y: -1350, w: 3110, h: 2700 };
function drawMini() {
  const { x, y, k } = M.v;
  M.miniVp.setAttribute('x', f1(-x / k)); M.miniVp.setAttribute('y', f1(-y / k));
  M.miniVp.setAttribute('width', f1(M.W / k)); M.miniVp.setAttribute('height', f1(M.H / k));
}
function locate(cx, cy, s) {
  const r = Math.hypot(cx, cy);
  if (s > 1.3 && Math.hypot(cx - G.island.x, cy - G.island.y) < G.island.r + 120) return { alt: true };
  if (r < G.r0) return { center: true };
  if (r > G.supIn - 20 && r < G.supOut + 60) return { support: true };
  if (r > G.rOut) return {};
  let a = Math.atan2(cy, cx) / D2R; if (a < -90 + G.gap / 2) a += 360;
  const sec = M.sectors.find(x => a >= x.a0 && a < x.a1); if (!sec) return {};
  const i = M.R.findIndex((rr, j) => j < M.R.length - 1 && r >= rr && r < M.R[j + 1]);
  return { fam: sec.id, v: i >= 0 ? M.vals[i] : null };
}
function ringName(v) { return (M.ring === 'level' ? v + ' · ' : '') + RINGS[M.ring].name(v); }
function drawCrumbs() {
  const s = sNow(), [cx, cy] = center();
  const w = s < 1.35 ? {} : locate(cx, cy, s); if (s < 2) delete w.v;
  const key = JSON.stringify(w) + M.ring; if (key === M.crumbKey) return; M.crumbKey = key;
  const parts = [`<button type="button" data-crumb="all">Весь ландшафт</button>`];
  if (w.alt) parts.push(`<button type="button" data-crumb="fam:alt">Отдельный слой</button>`);
  if (w.center) parts.push('<span>Человек и близкие</span>');
  if (w.support) parts.push(`<button type="button" data-crumb="fam:support">Опора для помогающих</button>`);
  if (w.fam) parts.push(`<button type="button" data-crumb="fam:${w.fam}"><i style="background:var(--fam-${w.fam})"></i>${esc(X.FAM[w.fam].name)}</button>`);
  if (w.v) parts.push(`<button type="button" data-crumb="cell:${w.fam}:${w.v}">${esc(ringName(w.v))}</button>`);
  M.crumbs.innerHTML = parts.join('<span class="a-sep">›</span>');
}
const zPos = s => Math.max(0, Math.min(1, Math.log(s / .55) / Math.log(14 / .55)));
function drawZoom(s) {
  M.zThumb.style.top = (100 - zPos(s) * 100).toFixed(1) + '%';
  const cur = STEPS.reduce((c, st, i) => s >= st.s * .98 ? i : c, 0);
  if (cur !== M.zCur) { M.zCur = cur; M.root.querySelectorAll('[data-step]').forEach((b, i) => b.classList.toggle('on', i === cur)); }
}

/* ---------------- 5. ВЫБОР, СВЯЗИ, ПАНЕЛИ ---------------- */
function relOf(id) {
  const m = new Map();
  (X.REL[id] || []).forEach(r => m.set(r.id, m.get(r.id) === 'confused' ? 'confused' : r.kind));
  Object.entries(X.REL).forEach(([src, list]) => list.forEach(r => { if (r.id === id) m.set(src, m.get(src) === 'confused' || r.kind === 'confused' ? 'confused' : 'partners'); }));
  return [...m].filter(([k]) => M.byId[k]).map(([id, kind]) => ({ id, kind }));
}
function computeOrder() {
  const rank = q => q.id === M.sel ? 0 : q.rel ? 1 : (M.match && M.match.has(q.id)) ? 2 : q.lit ? 3 : 4;
  M.order = M.pins.map(q => q.i).sort((a, b) => (rank(M.pins[a]) - rank(M.pins[b])) || (a - b));
}
function applyClasses() {
  const relSet = new Map((M.rels || []).map(r => [r.id, r.kind])), met = M.heat && M.metric;
  M.pins.forEach(q => {
    q.rel = relSet.get(q.id) || null;
    q.dim = (M.match && !M.match.has(q.id)) || (M.sel && q.id !== M.sel && !q.rel);
    const c = q.el.classList;
    c.toggle('sel', q.id === M.sel); c.toggle('rel', !!q.rel); c.toggle('conf', q.rel === 'confused');
    c.toggle('dim', !!q.dim); c.toggle('hit', !!(M.match && M.match.has(q.id)));
    c.toggle('no', !!(met && !met.test(q.p))); c.toggle('lit', !!q.lit);
    const mk = M.net[q.id]; ['have', 'want', 'learn'].forEach(k => c.toggle('mk-' + k, mk === k));
  });
  computeOrder(); if (M.dims.size > 800) M.dims.clear(); req();
}
function drawLinks() {
  const id = M.sel || M.hoverId, q = M.byId[id];
  if (!q) { M.links.innerHTML = ''; return; }
  const rels = M.sel ? M.rels : relOf(id);
  M.links.classList.toggle('preview', !M.sel);
  M.links.innerHTML = rels.map(r => {
    const t = M.byId[r.id]; const mx = (q.x + t.x) / 2, my = (q.y + t.y) / 2, fam = t.p.layer === 'alt' ? 'alt' : t.p.family;
    return `<path class="a-link ${r.kind}" style="--lc:var(--fam-${fam})" d="M${f1(q.x)} ${f1(q.y)}Q${f1(mx * .55)} ${f1(my * .55)} ${f1(t.x)} ${f1(t.y)}"/>`;
  }).join('');
}
function select(id, o) {
  o = o || {};
  const q = M.byId[id]; if (!q) return;
  M.sel = id; M.hoverId = null; M.rels = relOf(id);
  drawLinks(); applyClasses();
  if (!(o.noPanel && M.W < 760)) openSpecialist(q.p);
  const a = avail(), s = sNow(), px = q.x * M.v.k + M.v.x, py = q.y * M.v.k + M.v.y;
  const inside = px > a.x + 90 && px < a.x + a.w - 90 && py > a.y + 90 && py < a.y + a.h - 90;
  if (o.force || !inside || s < 3) fly(q.x, q.y, Math.max(M.v.k, M.fitK * (o.s || 4.2)), o.dur);
  else req();
}
function deselect(keepHash) {
  const had = M.sel; M.sel = null; M.rels = []; drawLinks(); applyClasses(); closePanel();
}
const chip = id => { const t = X.BY[id]; return t ? `<button type="button" class="chip a-go" data-go="${id}"><i style="background:var(--fam-${t.layer === 'alt' ? 'alt' : t.family})"></i>${esc(t.short)}</button>` : ''; };
function showPanel(html, kind) {
  M.panel.innerHTML = html; M.panel.hidden = false; M.panelOpen = true; M.panelKind = kind;
  M.root.classList.add('panel-open'); M.panel.scrollTop = 0; req();
}
function closePanel() { if (!M.panelOpen) return; M.panel.hidden = true; M.panelOpen = false; M.panelKind = null; M.famOpen = null; M.root.classList.remove('panel-open'); req(); if (X.onSelect) X.onSelect(null); }
function markSeg(id) { return `<div class="a-mark" role="group" aria-label="Моя сеть">${Object.entries(MARKS).map(([k, n]) => `<button type="button" data-mark="${k}" data-id="${id}" aria-pressed="${M.net[id] === k}"><i class="mk ${k}"></i>${n}</button>`).join('')}</div>`; }
function openSpecialist(p) {
  const isAlt = p.layer === 'alt';
  const partners = M.rels.filter(r => r.kind === 'partners'), confused = M.rels.filter(r => r.kind === 'confused');
  const q = M.byId[p.id];
  const near = M.pins.filter(o => o !== q && o.p.family === p.family && o.p.level === p.level && o.p.layer === p.layer);
  const row = (k, v) => v ? `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>` : '';
  showPanel(`<div class="a-panel-h"><div class="tags">${isAlt ? '<button type="button" class="tag warn" data-gofam="alt">отдельный слой</button>'
    : `<button type="button" class="tag" data-gofam="${p.family}"><i style="background:var(--fam-${p.family})"></i>${esc(p.familyName)}</button><button type="button" class="tag strong" data-golevel="${p.family}:${p.level}">${p.level} · ${esc(p.levelName)}</button>`}</div>
    <button type="button" class="a-x" data-close aria-label="Закрыть">×</button></div>
  <div class="a-panel-b"><h2 id="aPanelT">${esc(p.name)}</h2>${p.en ? `<p class="muted">${esc(p.en)}</p>` : ''}
    <p class="a-one">${esc(p.responsible)}</p>
    ${markSeg(p.id)}
    <dl class="a-facts">${row('Подготовка', p.training)}${row('Характер помощи', p.character)}${row('Есть в России', p.inRussia)}${row('Доступность', (p.availability || []).join(' · '))}${row('Онлайн', p.online)}${row('Что можно получить', (p.resources || []).join(', '))}${row('Проверка', p.verification)}</dl>
    <div><span class="label">С чем приходят</span><ul class="reqs">${(p.requests || []).slice(0, 4).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    ${partners.length ? `<div><span class="label"><span class="a-key"></span>С кем стыкуется · ${partners.length}</span><div class="a-chips">${partners.map(r => chip(r.id)).join('')}</div></div>` : ''}
    ${confused.length ? `<div><span class="label"><span class="a-key conf"></span>С кем путают · ${confused.length}</span><div class="a-chips">${confused.map(r => chip(r.id)).join('')}</div></div>` : ''}
    ${near.length ? `<div><span class="label">Рядом на карте</span><div class="a-chips">${near.map(o => chip(o.id)).join('')}</div></div>` : ''}
  </div>
  <div class="a-panel-f"><a class="btn primary" href="${X.pageHref(p.id)}">Открыть страницу →</a><a class="btn quiet" href="${X.compareHref(p.id)}">Сравнить</a></div>`, 'p');
  if (X.onSelect) X.onSelect(p.id);
}
/* паспорт семьи: сколько, на каких кольцах, что можно получить, кто здесь */
function bars(rows, total, color) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return `<div class="a-bars">${rows.map(r => `<div class="a-bar"><span>${esc(r[0])}</span><i><b style="width:${(r[1] / (total || max) * 100).toFixed(1)}%;background:${r[2] || color}"></b></i><em>${r[1]}</em></div>`).join('')}</div>`;
}
function openFamily(id) {
  M.famOpen = id;
  if (id === 'alt' || id === 'support') {
    const list = id === 'alt' ? X.ALT : X.MAIN.filter(p => p.family === 'support');
    const title = id === 'alt' ? 'Отдельный слой' : 'Опора для помогающих';
    const text = id === 'alt' ? 'Альтернативные и эзотерические практики. К ним массово идут в кризисе, поэтому мы их описываем: что обещают, что известно научно, какие риски. Описываем, не рекомендуем.' : (X.FAM.support || {}).essence;
    showPanel(`<div class="a-panel-h"><span class="label">${id === 'alt' ? 'Вне карты' : 'Внешний пояс'}</span><button type="button" class="a-x" data-close aria-label="Закрыть">×</button></div>
      <div class="a-panel-b"><h2 id="aPanelT">${esc(title)}</h2><p class="a-one">${esc(text)}</p><div><span class="label">Кто здесь · ${list.length}</span><div class="a-chips">${list.map(p => chip(p.id)).join('')}</div></div></div>
      <div class="a-panel-f"><a class="btn primary" href="${X.famHref(id)}">Открыть список →</a></div>`, 'f');
    if (X.onSelect) X.onSelect('fam-' + id);
    return;
  }
  const f = X.FAM[id], list = X.MAIN.filter(p => p.family === id), n = list.length, RM = RINGS[M.ring];
  const ringRows = M.vals.map((v, i) => [RM.name(v), list.filter(p => RM.of(p) === v).length, `var(--ord-${Math.min(5, i + 2)})`]);
  const resRows = X.D.resources.map(r => [r, list.filter(p => (p.resources || []).includes(r)).length]).sort((a, b) => b[1] - a[1]);
  const kp = [['ставят диагноз', list.filter(p => (p.flags || {})['Диагноз'] === 'да').length], ['есть бесплатно', list.filter(p => (p.availability || []).some(a => a !== 'платно')).length], ['работают онлайн', list.filter(p => p.online === 'да').length], ['редко в России', list.filter(p => p.inRussia !== 'да').length]];
  const mine = list.filter(p => M.net[p.id] === 'have').length;
  showPanel(`<div class="a-panel-h"><span class="label" style="color:var(--fam-${id})">Паспорт семьи</span><button type="button" class="a-x" data-close aria-label="Закрыть">×</button></div>
  <div class="a-panel-b"><h2 id="aPanelT">${esc(f.name)}</h2><p class="a-one">${esc(f.essence)}</p>
    <div class="a-kpis"><div><b>${n}</b><span>${plural(n, 'роль', 'роли', 'ролей').replace(/^\d+ /, '')}</span></div>${kp.map(x => `<div><b>${x[1]}</b><span>${esc(x[0])}</span></div>`).join('')}</div>
    <div><span class="label">${esc(RM.label)} · по кольцам</span>${bars(ringRows, n)}</div>
    <div><span class="label">Что можно получить</span>${bars(resRows, n, `var(--fam-${id})`)}</div>
    ${M.vals.map(v => { const c = list.filter(p => RM.of(p) === v); return c.length ? `<div><span class="label">${esc(ringName(v))}</span><div class="a-chips">${c.map(p => chip(p.id)).join('')}</div></div>` : ''; }).join('')}
    ${mine ? `<p class="a-netline"><i class="mk have"></i>В твоей сети: ${mine} из ${n}</p>` : ''}
    ${f.neighbors && f.neighbors.length ? `<div><span class="label">Соседние семьи</span><div class="a-chips">${f.neighbors.filter(x => X.FAM[x]).map(x => `<button type="button" class="chip" data-gofam="${x}"><i style="background:var(--fam-${x})"></i>${esc(X.FAM[x].name)}</button>`).join('')}</div></div>` : ''}
  </div>
  <div class="a-panel-f"><a class="btn primary" href="${X.famHref(id)}">Все специалисты семьи →</a></div>`, 'f');
  if (X.onSelect) X.onSelect('fam-' + id);
}
function goFamily(id) { if (M.sel) deselect(true); openFamily(id); flySector(id); }

/* ---------------- 6. РЕЖИМЫ ТЕРРИТОРИИ ---------------- */
function renderCells(fade) {
  const RM = RINGS[M.ring], n = M.vals.length, met = M.heat && M.metric;
  let g = '';
  M.cells.forEach(c => {
    let style, cls = 'a-cell';
    if (met) { c.hk = c.items.filter(met.test).length; const sh = c.n ? c.hk / c.n : 0; style = `--fc:var(--c-heat);--o:${c.n ? (0.05 + 0.6 * sh).toFixed(3) : 0.02}`; cls += ' heat' + (c.n && !c.hk ? ' zero' : ''); }
    else style = `--fc:var(--fam-${c.fam});--o:${(0.055 + 0.11 * c.i / Math.max(1, n - 1)).toFixed(3)}`;
    g += `<path class="${cls}" data-fam="${c.fam}" data-l="${c.l}" d="${arcPath(c.ri, c.ro, c.a0, c.a1)}" style="${style}"/>`;
  });
  for (let i = 1; i < n; i++) g += `<circle r="${f1(M.R[i])}" class="a-ringline"/>`;
  g += `<circle r="${G.rOut}" class="a-ringline"/>`;
  if (RM.wall) g += `<circle r="${f1(M.R[RM.wall])}" class="a-dopusk"/>`;
  M.cellsG.innerHTML = g;
  if (fade && !reduced) { M.cellsG.classList.remove('fresh'); requestAnimationFrame(() => M && M.cellsG.classList.add('fresh')); }
}
function addFixed(list, html, cls, x, y, anchor, when, soft, clamp) {
  const el = document.createElement('div'); el.className = 'a-fix ' + cls; el.innerHTML = html; el.hidden = true; M.labels.appendChild(el);
  const f = { el, x, y, anchor, when, soft, clamp, w: 0, h: 0 }; list.push(f); return f;
}
function famSub(s) {
  const met = M.heat && M.metric;
  if (!met) return plural(s.n, 'специалист', 'специалиста', 'специалистов');
  return `${X.MAIN.filter(p => p.family === s.id && met.test(p)).length} из ${s.n} · ${met.short}`;
}
function buildFixed() {
  M.fixed = [];
  M.sectors.forEach(s => {
    const [x, y] = pol(G.famR, s.am), c = Math.cos(s.am * D2R), anchor = c > .3 ? 'l' : c < -.3 ? 'r' : 'c';
    const f = addFixed(M.fixed, `<button type="button" data-gofam="${s.id}"><b><i style="background:var(--fam-${s.id})"></i>${esc(s.f.name)}</b><small></small></button>`, 'a-famlab' + (anchor === 'r' ? ' ar' : anchor === 'c' ? ' ac' : ''), x, y, anchor, sc => M.W >= 760 || sc >= 1.6, false, true);
    f.sub = f.el.querySelector('small'); f.sector = s;
  });
  addFixed(M.fixed, 'Опора для помогающих', 'a-lvl a-suplab', 0, -(G.supOut + 22), 'c', () => true);
  addFixed(M.fixed, `<b>Человек</b><small>и близкие</small>`, 'a-center', 0, 0, 'c', () => true);
  addFixed(M.fixed, '<b>Отдельный слой</b><small>альтернативные практики · вне карты</small>', 'a-islab', G.island.x, G.island.y - G.island.r - 80, 'c', () => true);
  addFixed(M.fixed, 'описываем,<br>не рекомендуем', 'a-isnote', G.island.x, G.island.y, 'c', s => s > 1.6, true);
}
function buildRingLabels() {
  (M.ringFixed || []).forEach(f => f.el.remove()); M.ringFixed = [];
  const RM = RINGS[M.ring], met = M.heat && M.metric;
  M.vals.forEach((v, i) => addFixed(M.ringFixed, esc(RM.name(v)), 'a-lvl', 0, -(M.R[i] + M.R[i + 1]) / 2, 'c', s => s < 9 && (M.W >= 760 || s > 1.4)));
  if (RM.wall) addFixed(M.ringFixed, 'граница допуска', 'a-dop', 0, -M.R[RM.wall], 'c', () => true);
  M.cells.forEach(c => {
    if (!c.n) return;
    const [x, y] = pol(c.ri + 15, c.am), t = `${RM.name(c.l)} · ${met ? `${c.hk} из ${c.n}` : c.n}`;
    addFixed(M.ringFixed, esc(t), 'a-cap', x, y, 'c', s => s >= 1.9, true);
  });
  M.fixed.forEach(f => { if (f.sub) f.sub.textContent = famSub(f.sector); });
  measureFixed();
}
// размеры постоянных подписей меряем по настоящей вёрстке
function measureFixed() {
  const all = M.fixed.concat(M.ringFixed || []);
  all.forEach(f => { f.el.hidden = false; f.el.style.transform = 'translate(-9999px,-9999px)'; });
  all.forEach(f => { f.w = f.el.offsetWidth; f.h = f.el.offsetHeight; });
  all.forEach(f => { f.el.hidden = true; });
}
function setRing(mode, anim) {
  if (!RINGS[mode]) return;
  const L = layoutRings(mode), first = !M.R, instant = first || anim === false || reduced;
  M.ring = mode; M.R = L.R; M.cells = L.cells; M.vals = L.vals; X.store('atlasRing', mode);
  renderCells(!first); buildRingLabels();
  M.pins.forEach(q => {
    const t = L.pos.get(q.id); if (!t) { setXY(q); return; }
    q.from = { r: q.r, a: q.a }; q.to = t; q.delay = Math.min(.25, (t.r - G.r0) / (G.rOut - G.r0) * .25);
    if (instant) { q.r = t.r; q.a = t.a; setXY(q); }
  });
  M.morph = instant ? null : { t0: null, dur: 1000 };
  if (M.sel) drawLinks();
  if (M.spot) spot(M.spot, M.spotNames);
  M.crumbKey = ''; if (M.panelKind === 'f' && M.famOpen) openFamily(M.famOpen);
  updateStatus(); refreshDrawer(); req();
}
function setHeat(id) {
  M.heat = id || null; M.metric = M.heat ? M.metrics.find(m => m.id === M.heat) : null;
  if (M.heat && !M.metric) M.heat = null;
  renderCells(true); buildRingLabels(); applyClasses(); updateStatus(); refreshDrawer();
}
function pinColor(p) {
  const fc = X.FACETS[M.colorBy];
  if (p.layer === 'alt' && (M.colorBy === 'family' || M.colorBy === 'level')) return 'var(--fam-alt)';
  const v = fc.of(p), val = Array.isArray(v) ? v[0] : v;
  return val == null || val === '' ? 'var(--fam-alt)' : (fc.color(val) || 'var(--fam-alt)');
}
function recolor() { M.pins.forEach(q => q.el.style.setProperty('--pc', pinColor(q.p))); updateStatus(); refreshDrawer(); }
function updateStatus() {
  const parts = [`<span>Кольца: <b>${esc(RINGS[M.ring].label.toLowerCase())}</b></span>`];
  if (M.metric) parts.push(`<span>Заливка: <b>${esc(M.metric.short)}</b></span>`);
  parts.push(`<span>Цвет точек: <b>${esc(X.FACETS[M.colorBy].label.toLowerCase())}</b></span>`);
  M.status.innerHTML = parts.join('') + (M.metric ? `<span class="a-grad" aria-hidden="true"><i></i>0–100%</span>` : '');
}

/* выделение части карты (для «Как читать карту») */
function spot(spec, names) {
  M.spot = spec || null; M.spotNames = !!names;
  M.root.classList.toggle('spot', !!spec);
  const litFam = id => spec && (spec.fam === id || (spec.fams || []).includes(id));
  M.root.querySelectorAll('.a-cell').forEach(c => c.classList.toggle('hl', !!spec && (litFam(c.dataset.fam) || (spec.ring && +c.dataset.l === spec.ring))));
  M.root.querySelector('.a-sup').classList.toggle('hl', !!(spec && spec.support));
  M.root.querySelector('.a-island').classList.toggle('hl', !!(spec && spec.island));
  M.root.querySelector('.a-core').classList.toggle('hl', !!(spec && spec.core));
  M.pins.forEach(q => {
    const p = q.p;
    q.lit = !!spec && ((spec.ring && p.layer !== 'alt' && p.family !== 'support' && RINGS[M.ring].of(p) === spec.ring) || litFam(p.family) || (spec.support && p.family === 'support') || (spec.island && p.layer === 'alt'));
  });
  applyClasses();
}
function flash(on) { const d = M.root.querySelector('.a-dopusk'); if (d) d.classList.toggle('flash', !!on); }

/* ---------------- 7. ИСТОРИЯ, МАРШРУТЫ, НАБЛЮДЕНИЯ ---------------- */
function storySteps() {
  const cnt = l => X.MAIN.filter(p => p.level === l).length;
  return [
    { t: 'Человек в центре', p: 'В центре — человек и его близкие. Всё вокруг — те, кто может помочь: от того, кто прошёл через похожее, до врача и нотариуса.', go: () => { fly(0, 0, M.fitK * 2.6); spot({ core: true }); } },
    { t: 'Кольцо 1 · Опыт', p: `${cnt(1)} ролей. Помогают своим прожитым опытом: равные консультанты, волонтёры, спонсоры. Формальных требований нет.`, go: () => { fly(0, 0, M.fitK * 2.5); spot({ ring: 1 }, true); } },
    { t: 'Кольцо 2 · Практика', p: `${cnt(2)} ролей — самое населённое кольцо. Человек обучился методу на курсах или в ассоциации, но государственного допуска нет. Подготовка здесь очень разная.`, go: () => { fitAll(); spot({ ring: 2 }); } },
    { t: 'Кольцо 3 · Профессия', p: `${cnt(3)} ролей. Профильное образование или профстандарт: психологи, социальные работники, юристы, медиаторы.`, go: () => { fitAll(); spot({ ring: 3 }); } },
    { t: 'Граница допуска', p: 'Пунктир — главная линия карты. Дальше начинаются диагноз, лечение, больничный и юридически значимые документы. Для этого нужен государственный допуск.', go: () => { fitAll(); spot({ ring: 4 }); const T = M.tour, i = T.i; setTimeout(() => M && M.tour === T && T.i === i && flash(true), 450); } },
    { t: 'Кольцо 4 · Полномочия', p: `${cnt(4)} ролей: врачи, нотариусы, арбитражные управляющие, уполномоченный по правам человека.`, go: () => { fitAll(); spot({ ring: 4 }, true); } },
    { t: 'Десять семей', p: 'По кругу — семьи: за какую сферу жизни отвечает специалист. Чем больше сектор, тем больше в семье ролей. Соседи по кругу чаще всего передают людей друг другу.', go: () => { fitAll(); sweep(); } },
    { t: 'Опора для помогающих', p: 'Внешний пояс — те, кто поддерживает самих помогающих: супервизоры, ведущие балинтовских групп, преподаватели.', go: () => { flySector('support'); spot({ support: true }, true); } },
    { t: 'Отдельный слой', p: 'Остров за пределами карты — альтернативные и эзотерические практики. К ним массово идут в кризисе, поэтому мы их описываем, но не рекомендуем.', go: () => { flySector('alt'); spot({ island: true }, true); } },
    { t: 'Дальше — ты', p: 'Приближай карту: появятся имена, затем подробности и карточки. В «Территории» кольца перестраиваются по подготовке или характеру помощи, а заливка показывает смысл: где ставят диагноз, где бесплатно, где онлайн.', go: () => { fitAll(); spot(null); } }
  ];
}
function sweep() {
  let i = 0; clearInterval(M.sweepT);
  const tick = () => { if (!M) return; if (i >= M.sectors.length) { clearInterval(M.sweepT); spot(null); return; } spot({ fam: M.sectors[i].id }); i++; };
  tick(); M.sweepT = setInterval(tick, reduced ? 50 : 420);
}
function routeSteps(r) {
  return r.steps.map(st => {
    const ref = st.ref;
    const title = ref.startsWith('family:') ? 'Семья: ' + (X.FAM[ref.slice(7)] || {}).name : ref.startsWith('term:') ? 'Понятие: ' + (X.TERMS[ref.slice(5)] || {}).term : (X.BY[ref] || {}).name || ref;
    const go = () => {
      if (ref.startsWith('family:')) { deselect(true); goFamily(ref.slice(7)); }
      else if (ref.startsWith('term:')) { deselect(true); if (M.ring !== 'level') setRing('level', false); fitAll(); if (ref === 'term:dopusk') setTimeout(() => M && flash(true), 450); }
      else if (M.byId[ref]) select(ref, { s: 4.6, force: true, noPanel: true });
    };
    return { t: title, p: st.text, go };
  });
}
function startTour(kind, id) {
  closeDrawer(); M.root.querySelector('#aHint').hidden = true;
  if (kind === 'story') { if (M.ring !== 'level') setRing('level', false); if (M.heat) setHeat(null); deselect(true); M.tour = { name: 'Как читать карту', steps: storySteps(), i: 0, kind }; }
  else { const r = X.ROUTES[id]; if (!r) return; M.tour = { name: r.name, steps: routeSteps(r), i: 0, kind }; }
  goStep();
}
function endTour() { if (!M.tour) return; const story = M.tour.kind === 'story'; M.tour = null; clearInterval(M.sweepT); M.tourEl.hidden = true; M.root.classList.remove('touring'); flash(false); spot(null); if (story) { X.store('atlasHint', 1); fitAll(); } req(); }
function goStep() {
  const T = M.tour, st = T.steps[T.i];
  clearInterval(M.sweepT); flash(false); if (T.kind === 'route') spot(null);
  st.go();
  const last = T.i === T.steps.length - 1;
  M.tourEl.innerHTML = `<div class="a-tour-t"><span class="label">${esc(T.name)} · ${T.i + 1} из ${T.steps.length}</span><b>${esc(st.t)}</b><p>${esc(st.p)}</p>
    <div class="a-tour-dots">${T.steps.map((_, i) => `<i class="${i === T.i ? 'on' : i < T.i ? 'done' : ''}"></i>`).join('')}</div></div>
    <div class="a-tour-nav"><button type="button" class="btn quiet sm" data-tour="-1" ${T.i ? '' : 'disabled'} aria-label="Предыдущий шаг">←</button>${last ? '<button type="button" class="btn primary btn-sm" data-tour="x">Готово</button>' : '<button type="button" class="btn primary btn-sm" data-tour="1">Дальше →</button>'}<button type="button" class="a-x" data-tour="x" aria-label="Закончить">×</button></div>`;
  M.tourEl.hidden = false; M.root.classList.add('touring'); req();
}
/* наблюдения: выводы, которые считаются из данных при каждой сборке */
function buildInsights() {
  const MAIN = X.MAIN, ALL = X.ALL, n = MAIN.length, by = id => M.metrics.find(m => m.id === id), cnt = t => MAIN.filter(t).length;
  const out = [];
  const dx = MAIN.filter(by('dx').test), dx4 = dx.filter(p => p.level === 4).length;
  out.push({ n: dx.length, t: dx4 === dx.length ? `ролей ставят диагноз — и все они за границей допуска, на уровне «Полномочия».` : `ролей ставят диагноз; ${dx4} из них — за границей допуска.`, act: () => { setRing('level'); setHeat('dx'); deselect(true); fitAll(); } });
  const l2 = MAIN.filter(p => p.level === 2), tr2 = new Set(l2.map(p => p.training)).size;
  out.push({ n: l2.length, t: `из ${n} ролей — на уровне «Практика», без государственного допуска. Подготовка там очень разная: ${tr2} ступени, от «без подготовки» до многолетней сертификации. Перестрой кольца по подготовке — увидишь разброс.`, act: () => { setHeat(null); setRing('training'); fitAll(); } });
  out.push({ n: cnt(by('free').test), t: `ролей можно найти бесплатно: в госмедицине, госучреждениях или НКО. Заливка покажет, в каких частях карты бесплатного больше.`, act: () => { setHeat('free'); fitAll(); } });
  out.push({ n: cnt(by('online').test), t: `ролей полноценно работают онлайн. Ближе к границе допуска онлайна меньше: там нужен очный приём.`, act: () => { setHeat('online'); fitAll(); } });
  out.push({ n: ALL.filter(p => p.inRussia !== 'да').length, t: `ролей в России встречаются редко или пока не существуют. Это профессии, которые здесь только складываются.`, act: () => { setHeat('ru'); fitAll(); } });
  const fams = M.sectors.slice().sort((a, b) => b.n - a.n), lastF = fams[fams.length - 1];
  out.push({ n: fams[0].n, t: `ролей в самой населённой семье — «${fams[0].f.name}». В самой тихой, «${lastF.f.name}», всего ${lastF.n}.`, act: () => goFamily(fams[0].id) });
  const resC = X.D.resources.map((r, i) => [i, cnt(p => (p.resources || []).includes(r))]).sort((a, b) => b[1] - a[1]), rl = resC[resC.length - 1];
  out.push({ n: resC[0][1], t: `ролей дают «${X.D.resources[resC[0][0]]}» — это самый частый ресурс. Самый редкий — «${X.D.resources[rl[0]]}»: ${rl[1]}.`, act: () => { setHeat('res' + resC[0][0]); fitAll(); } });
  const docI = X.D.resources.indexOf('официальный документ');
  if (docI >= 0) { const doc = MAIN.filter(p => p.resources.includes('официальный документ')); out.push({ n: doc.length, t: `ролей могут дать официальный документ. Они живут в ${new Set(doc.map(p => p.family)).size} семьях — не только у врачей и юристов.`, act: () => { setHeat('res' + docI); fitAll(); } }); }
  const inConf = {}, deg = {};
  Object.values(X.REL).forEach(list => list.forEach(r => { if (r.kind === 'confused') inConf[r.id] = (inConf[r.id] || 0) + 1; }));
  MAIN.forEach(p => deg[p.id] = relOf(p.id).length);
  const topConf = Object.entries(inConf).sort((a, b) => b[1] - a[1])[0];
  if (topConf && X.BY[topConf[0]]) out.push({ n: topConf[1], t: `карточек упоминают, что их путают со специалистом «${X.BY[topConf[0]].short}». Это самая размытая граница на карте.`, act: () => select(topConf[0], { force: true }) });
  const topDeg = Object.entries(deg).sort((a, b) => b[1] - a[1])[0];
  if (topDeg && X.BY[topDeg[0]]) out.push({ n: topDeg[1], t: `связей у специалиста «${X.BY[topDeg[0]].short}» — больше всех на карте. К нему направляют и от него передают чаще всего.`, act: () => select(topDeg[0], { force: true }) });
  out.push({ n: ALL.filter(p => p.verification === 'высокий').length, t: `карточек из ${ALL.length} проверены надёжно — почти без непроверенных утверждений. Заливка покажет, где база знаний ещё тонкая.`, act: () => { setHeat('ver'); fitAll(); } });
  return out;
}

/* ---------------- 8. МОЯ СЕТЬ ---------------- */
function setMark(id, mark) {
  if (M.net[id] === mark) delete M.net[id]; else M.net[id] = mark;
  X.store('net', M.net);
  M.root.querySelectorAll(`[data-mark][data-id="${id}"]`).forEach(b => b.setAttribute('aria-pressed', M.net[id] === b.dataset.mark));
  if (M.f.net) refilter(); else applyClasses();
  updateRailBadges(); if (M.drawer === 'net') refreshDrawer();
}
function netText() {
  const lines = ['Моя сеть помогающих специалистов', ''];
  Object.entries(MARKS).forEach(([k, n]) => { const ids = Object.keys(M.net).filter(id => M.net[id] === k && X.BY[id]); if (ids.length) lines.push(n + ': ' + ids.map(id => X.BY[id].name).join('; ')); });
  return lines.join('\n');
}

/* ---------------- 9. БОКОВЫЕ ПАНЕЛИ ---------------- */
const IC = {
  plus: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 3v10M3 8h10"/></svg>',
  minus: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 8h10"/></svg>',
  fit: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="5.2"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>',
  fs: '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  filter: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5h14M5.5 10h9M8 15h4"/></svg>',
  terrain: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.6"/><path d="M10 3v3.4M15 5l-2.4 2.4"/></svg>',
  spark: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3M5 5l1.8 1.8M13.2 13.2 15 15M15 5l-1.8 1.8M6.8 13.2 5 15"/><circle cx="10" cy="10" r="2.2"/></svg>',
  route: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="4.5" cy="15.5" r="2"/><circle cx="15.5" cy="4.5" r="2"/><path d="M6.5 15.5h5.5a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h5.5"/></svg>',
  net: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="5" r="2.2"/><circle cx="4.5" cy="14.5" r="2.2"/><circle cx="15.5" cy="14.5" r="2.2"/><path d="m8.9 6.9-3.3 5.6M11.1 6.9l3.3 5.6M6.7 14.5h6.6"/></svg>',
  play: '<svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7.5"/><path d="M8.3 7v6l5-3z" fill="currentColor" stroke="none"/></svg>'
};
const RAIL = [['filters', 'Фильтры', IC.filter], ['terrain', 'Территория', IC.terrain], ['insights', 'Наблюдения', IC.spark], ['routes', 'Маршруты', IC.route], ['net', 'Моя сеть', IC.net]];
function openDrawer(key) {
  if (M.drawer === key) { closeDrawer(); return; }
  const was = !!M.drawer, c = center();
  M.drawer = key; M.drawerEl.hidden = false; M.root.classList.add('drawer-open');
  if (M.W < 760 && M.panelOpen) deselect(true);
  refreshDrawer(); M.drawerEl.scrollTop = 0;
  M.root.querySelectorAll('.a-rail [data-drawer]').forEach(b => b.setAttribute('aria-pressed', b.dataset.drawer === key));
  // карта отъезжает, чтобы не прятаться под панелью
  if (!was && M.W >= 760) fly(c[0], c[1], M.v.k, 420); else req();
}
function closeDrawer() {
  if (!M.drawer) return; const c = center(); M.drawer = null; if (M.W >= 760 && !M.tour) fly(c[0], c[1], M.v.k, 420); M.drawerEl.hidden = true; M.root.classList.remove('drawer-open');
  M.root.querySelectorAll('.a-rail [data-drawer]').forEach(b => b.setAttribute('aria-pressed', 'false')); req();
}
function refreshDrawer() {
  if (!M.drawer) return;
  const body = { filters: drFilters, terrain: drTerrain, insights: drInsights, routes: drRoutes, net: drNet }[M.drawer]();
  const title = RAIL.find(r => r[0] === M.drawer)[1], st = M.drawerEl.scrollTop;
  M.drawerEl.innerHTML = `<div class="a-dr-h"><h3>${title}</h3><button type="button" class="a-x" data-drclose aria-label="Закрыть">×</button></div><div class="a-dr-b">${body}</div>`;
  M.drawerEl.scrollTop = st;
}
const chipF = (key, v, label, on) => `<button type="button" class="chip" data-af="${key}" data-v="${esc(v)}" aria-pressed="${on}">${esc(label)}</button>`;
function drFilters() {
  const f = M.f, D = X.D;
  return `<p class="a-dr-note">Подходящие специалисты остаются яркими, остальные бледнеют. Внутри одной группы условия складываются через «или», между группами — через «и».</p>
  <section><h4>Может</h4><div class="a-chips">${[['Диагноз', 'ставит диагноз'], ['Лекарства', 'назначает лекарства'], ['Тело', 'работает с телом'], ['Группы', 'работает с группами']].map(x => chipF('flags', x[0], x[1], f.flags.has(x[0]))).join('')}</div></section>
  <section><h4>Что можно получить</h4><div class="a-chips">${D.resources.map(r => chipF('res', r, r, f.res.has(r))).join('')}</div></section>
  <section><h4>Подготовка</h4><div class="a-chips">${D.training.map(r => chipF('train', r, r, f.train.has(r))).join('')}</div></section>
  <section><h4>Условия</h4><div class="a-chips">${chipF('free', '', 'есть бесплатно', f.free)}${chipF('online', '', 'можно онлайн', f.online)}${chipF('ru', '', 'есть в России', f.ru)}${chipF('net', '', 'только моя сеть', f.net)}</div></section>
  <button type="button" class="btn quiet sm" id="aReset">Сбросить фильтры</button>`;
}
function drTerrain() {
  const fc = X.FACETS[M.colorBy];
  const opt = m => `<button type="button" class="a-opt" data-heat="${m.id}" aria-pressed="${M.heat === m.id}">${esc(m.label)}<small>${X.ALL.filter(m.test).length}</small></button>`;
  return `<section><h4>Кольца показывают</h4><div class="a-seg3">${Object.entries(RINGS).map(([k, r]) => `<button type="button" data-ring="${k}" aria-pressed="${M.ring === k}"><b>${esc(r.label)}</b><small>${esc(r.hint)}</small></button>`).join('')}</div>
    <p class="a-dr-note">Семьи остаются на своих местах, а специалисты переезжают на кольца по выбранному признаку.</p></section>
  <section><h4>Заливка территории</h4><p class="a-dr-note">Чем гуще цвет участка, тем больше там специалистов с этим признаком. Залитая точка — признак есть, пустая — нет.</p>
    <div class="a-opts"><button type="button" class="a-opt" data-heat="" aria-pressed="${!M.heat}">Цвета семей<small></small></button>${M.metrics.filter(m => !m.res).map(opt).join('')}</div>
    <h5>Что можно получить</h5><div class="a-opts">${M.metrics.filter(m => m.res).map(opt).join('')}</div>
    ${M.heat ? `<div class="a-gradbar"><i></i><span>0%</span><span>100% участка</span></div>` : ''}</section>
  <section><h4>Цвет точек</h4><select class="sel" id="aColor" aria-label="Цвет точек">${['family', 'level', 'training', 'character', 'inRussia', 'verification', 'availability'].map(k => `<option value="${k}"${M.colorBy === k ? ' selected' : ''}>${esc(X.FACETS[k].label)}</option>`).join('')}</select>
    <div class="a-legend-b">${M.colorBy === 'family'
      ? X.FAMS.map(f => `<button type="button" data-gofam="${f.id}"><i style="background:var(--fam-${f.id})"></i>${esc(f.name)}<small>${X.MAIN.filter(p => p.family === f.id).length}</small></button>`).join('') + `<button type="button" data-gofam="alt"><i style="background:var(--fam-alt)"></i>Отдельный слой<small>${X.ALT.length}</small></button>`
      : fc.values().map(v => `<span><i style="background:${fc.color(v)}"></i>${esc(fc.name(v))}</span>`).join('')}</div></section>
  <section><h4>Линии связей</h4><p class="a-dr-note"><span class="a-key"></span>сплошная — стыкуются, передают людей друг другу<br><span class="a-key conf"></span>пунктир — их часто путают<br>Цвет линии — семья того, к кому она ведёт.</p></section>`;
}
function drInsights() {
  return M.insights.map((x, i) => `<button type="button" class="a-ins" data-ins="${i}"><b>${x.n}</b><span>${esc(x.t)}</span><small>Показать на карте →</small></button>`).join('');
}
function drRoutes() {
  return `<button type="button" class="a-route story" data-story><b>${IC.play} Как читать карту</b><small>10 шагов: центр, кольца, граница допуска, семьи, внешний пояс, отдельный слой</small></button>` +
    X.D.content.routes.map(r => `<button type="button" class="a-route" data-route="${r.id}"><b>${esc(r.name)}</b><small>${esc(r.desc)} · ${plural(r.steps.length, 'шаг', 'шага', 'шагов')}</small></button>`).join('');
}
function drNet() {
  const ids = k => Object.keys(M.net).filter(id => M.net[id] === k && X.BY[id]);
  const have = ids('have'), want = ids('want');
  const fams = M.sectors.map(s => ({ s, have: have.filter(id => X.BY[id].family === s.id).length, want: want.filter(id => X.BY[id].family === s.id).length }));
  const covered = fams.filter(x => x.have).length, empty = fams.filter(x => !x.have);
  return `<p class="a-dr-note">Отмечай в карточке специалиста: у кого есть контакт, кого хочешь найти, о ком хочешь узнать больше. Так карта становится картой твоих опор. Отметки хранятся только в этом браузере.</p>
  <div class="a-kpis">${Object.entries(MARKS).map(([k, n]) => `<div><b>${ids(k).length}</b><span><i class="mk ${k}"></i>${esc(n.toLowerCase())}</span></div>`).join('')}</div>
  <section><h4>Опора по семьям</h4><p class="a-dr-note">Контакты есть в ${covered} из ${M.sectors.length} семей. <span class="a-key solid-acc"></span>есть контакт <span class="a-key solid-warm"></span>хочу найти</p>
    <div class="a-bars">${fams.map(x => `<button type="button" class="a-bar" data-gofam="${x.s.id}"><span><i style="background:var(--fam-${x.s.id})"></i>${esc(x.s.f.name)}</span><i><b style="width:${(x.have / x.s.n * 100).toFixed(1)}%;background:var(--c-accent)"></b><b style="width:${(x.want / x.s.n * 100).toFixed(1)}%;background:var(--c-warm)"></b></i><em>${x.have}/${x.s.n}</em></button>`).join('')}</div>
    ${covered && empty.length ? `<p class="a-dr-note">Пока без контактов: ${empty.map(x => esc(x.s.f.name)).join(', ')}.</p>` : ''}</section>
  ${Object.entries(MARKS).map(([k, n]) => { const l = ids(k); return l.length ? `<section><h4><i class="mk ${k}"></i>${esc(n)}</h4><div class="a-chips">${l.map(id => chip(id)).join('')}</div></section>` : ''; }).join('')}
  <div class="a-chips">${chipF('net', '', 'показать на карте только сеть', M.f.net)}<button type="button" class="btn quiet sm" id="aCopyNet"${Object.keys(M.net).length ? '' : ' disabled'}>Скопировать списком</button></div>
  <textarea id="aNetText" class="a-nettext" readonly hidden aria-label="Список моей сети"></textarea>`;
}
function updateRailBadges() {
  const nf = [M.f.flags.size, M.f.res.size, M.f.train.size, +M.f.free, +M.f.online, +M.f.ru, +M.f.net].reduce((a, b) => a + b, 0);
  M.root.querySelector('.a-rail [data-drawer="filters"] b').textContent = nf || '';
  M.root.querySelector('.a-rail [data-drawer="net"] b').textContent = Object.keys(M.net).length || '';
}

/* фильтры */
function okP(p) {
  const f = M.f;
  if (f.flags.size && ![...f.flags].every(k => (p.flags || {})[k] === 'да')) return false;
  if (f.res.size && !(p.resources || []).some(r => f.res.has(r))) return false;
  if (f.train.size && !f.train.has(p.training)) return false;
  if (f.free && !(p.availability || []).some(a => a !== 'платно')) return false;
  if (f.online && p.online === 'нет') return false;
  if (f.ru && p.inRussia !== 'да') return false;
  if (f.net && !M.net[p.id]) return false;
  if (f.q) {
    const hay = (p.name + ' ' + p.short + ' ' + (p.en || '') + ' ' + p.responsible + ' ' + (p.requests || []).join(' ')).toLowerCase();
    const st = queryStems(f.q); if (st.length && !st.every(w => hasStem(hay, w))) return false;
  }
  return true;
}
function filtersOn() { const f = M.f; return !!(f.q || f.flags.size || f.res.size || f.train.size || f.free || f.online || f.ru || f.net); }
function refilter() {
  M.match = filtersOn() ? new Set(M.pins.filter(q => okP(q.p)).map(q => q.id)) : null;
  M.count.innerHTML = M.match ? `Подходят: ${M.match.size} из ${M.pins.length}<button type="button" data-clearf aria-label="Сбросить фильтры">×</button>` : '';
  M.count.hidden = !M.match;
  updateRailBadges(); applyClasses();
}

/* полноэкранный режим: прячем шапку сайта и просим браузер развернуть страницу */
function toggleFs(force) {
  const on = force == null ? !document.body.classList.contains('atlas-immersive') : force;
  document.body.classList.toggle('atlas-immersive', on);
  M.fsBtn.setAttribute('aria-pressed', on); M.fsBtn.querySelector('span').textContent = on ? 'Свернуть' : 'Во весь экран';
  if (on) { M.fsFrom = document.activeElement; M.stage.focus({ preventScroll: true }); } else if (M.fsFrom && M.fsFrom.focus) { M.fsFrom.focus({ preventScroll: true }); }
  setTimeout(resize, 60);
}

/* ---------------- 10. МОНТИРОВАНИЕ И СОБЫТИЯ ---------------- */
function worldSVG() {
  let g = `<circle r="${G.supOut + 50}" class="a-halo"/>`;
  g += `<path d="${ring(G.supIn, G.supOut)}" fill-rule="evenodd" class="a-sup" data-fam="support"/>`;
  g += `<g class="a-cells"></g>`;
  g += `<circle r="${G.r0}" class="a-core"/>`;
  g += `<circle cx="${G.island.x}" cy="${G.island.y}" r="${G.island.r}" class="a-island" data-fam="alt"/>`;
  g += `<g class="a-links"></g>`;
  return g;
}
function miniSVG() {
  let g = M.sectors.map(s => `<path d="${arcPath(G.r0, G.rOut, s.a0, s.a1)}" fill="var(--fam-${s.id})" fill-opacity=".55" stroke="var(--c-surface)" stroke-width="14"/>`).join('');
  g += `<path d="${ring(G.supIn, G.supOut)}" fill-rule="evenodd" fill="var(--fam-support)" fill-opacity=".35"/>`;
  g += `<circle cx="${G.island.x}" cy="${G.island.y}" r="${G.island.r}" fill="var(--fam-alt)" fill-opacity=".25" stroke="var(--fam-alt)" stroke-width="12" stroke-dasharray="40 30"/>`;
  g += `<rect class="a-mini-vp" rx="30"/>`;
  return `<svg viewBox="${MINI_VB.x} ${MINI_VB.y} ${MINI_VB.w} ${MINI_VB.h}" aria-hidden="true">${g}</svg>`;
}
function hudHTML() {
  return `
  <div class="a-hud a-hud-tl">
    <div class="a-searchrow"><label class="a-q">${X.ICON.search}<input id="aq" type="search" autocomplete="off" placeholder="Специалист или запрос: «не сплю»" aria-label="Найти на карте"></label></div>
    <div class="a-sugg" id="aSugg" hidden></div>
    <div class="a-crumbrow"><nav class="a-crumbs" id="aCrumbs" aria-label="Навигация по карте"></nav><span class="a-count" id="aCount" hidden></span></div>
  </div>
  <nav class="a-hud a-rail" aria-label="Инструменты карты">${RAIL.map(r => `<button type="button" data-drawer="${r[0]}" aria-pressed="false">${r[2]}<span>${r[1]}</span><b></b></button>`).join('')}<button type="button" data-story>${IC.play}<span>Как читать</span></button></nav>
  <aside class="a-hud a-drawer" id="aDrawer" hidden></aside>
  <div class="a-hud a-hud-tr"><button type="button" class="a-btn" id="aFs" aria-pressed="false">${IC.fs}<span>Во весь экран</span></button></div>
  <div class="a-hud a-zoom" role="group" aria-label="Масштаб">
    <button type="button" class="a-zb" data-z="in" aria-label="Приблизить">${IC.plus}</button>
    <div class="a-ztrack"><i class="a-zthumb"></i>${STEPS.map((st, i) => `<button type="button" data-step="${i}" style="top:${(100 - zPos(st.s) * 100).toFixed(1)}%" aria-label="${st.name}"><span>${st.name}</span></button>`).join('')}</div>
    <button type="button" class="a-zb" data-z="out" aria-label="Отдалить">${IC.minus}</button>
    <button type="button" class="a-zb" data-z="fit" aria-label="Показать всю карту" title="Вся карта (0)">${IC.fit}</button>
  </div>
  <div class="a-hud a-mini" aria-label="Мини-карта">${miniSVG()}</div>
  <button type="button" class="a-hud a-status" id="aStatus" data-drawer="terrain" title="Изменить в «Территории»"></button>
  <div class="a-hud a-tour" id="aTour" hidden></div>
  <div class="a-hud a-hint" id="aHint" hidden><div><b>Атлас помогающих специалистов</b><p>${X.MAIN.length} ролей: ${X.FAMS.length - 1} семей по кругу, 4 уровня от центра к краю. Приближай колёсиком или щипком, тяни карту, нажимай на точки.</p></div><div class="a-hint-b"><button type="button" class="btn sm a-hint-go" data-story>${IC.play} Как читать карту · 1 мин</button><button type="button" class="btn sm a-hint-skip" id="aHintOk">Сразу исследовать</button></div></div>
  <div class="a-tip" id="aTip" hidden></div>
  <aside class="a-panel" id="aPanel" hidden aria-labelledby="aPanelT"></aside>`;
}

function mount(host, arg) {
  X = window.Atlas; if (!X) return;
  M = { v: { x: 0, y: 0, k: 1 }, fitK: 1, W: 0, H: 0, raf: 0, flyRaf: 0, dims: new Map(), sel: null, rels: [], match: null, order: [], tour: null, panelOpen: false, crumbKey: '', zCur: -1,
    colorBy: X.store('atlasColor') || 'family', net: X.store('net') || {}, f: { q: '', flags: new Set(), res: new Set(), train: new Set(), free: false, online: false, ru: false, net: false }, heat: null, metric: null, drawer: null };
  M.sectors = buildSectors(); M.pins = buildPins(); M.metrics = metrics();
  M.byId = {}; M.pins.forEach(q => M.byId[q.id] = q);
  const root = document.createElement('section'); root.className = 'atlas'; root.setAttribute('aria-label', 'Карта помогающих специалистов'); root.setAttribute('role', 'region');
  root.innerHTML = `<div class="a-stage" id="aStage" tabindex="0" aria-label="Карта. Стрелки двигают, плюс и минус приближают, ноль показывает всю карту, F открывает на весь экран"><svg class="a-svg" aria-hidden="true"><g class="a-world">${worldSVG()}</g></svg><div class="a-labels"></div><div class="a-pins" role="group" aria-label="Специалисты на карте. Стрелки — к следующему, Home и End — к первому и последнему"></div></div>${hudHTML()}`;
  host.querySelectorAll('[data-boot]').forEach(b => b.remove());
  host.appendChild(root);
  const $r = q => root.querySelector(q);
  Object.assign(M, { root, stage: $r('.a-stage'), world: $r('.a-world'), cellsG: $r('.a-cells'), links: $r('.a-links'), labels: $r('.a-labels'), panel: $r('#aPanel'), crumbs: $r('#aCrumbs'), count: $r('#aCount'),
    tourEl: $r('#aTour'), fsBtn: $r('#aFs'), miniVp: $r('.a-mini-vp'), zThumb: $r('.a-zthumb'), drawerEl: $r('#aDrawer'), status: $r('#aStatus'), tip: $r('#aTip') });
  M.hud = [...root.querySelectorAll('.a-searchrow, #aSugg, .a-crumbrow, .a-hud-tr, .a-zoom, .a-mini, .a-rail, .a-drawer, .a-status, .a-tour, .a-hint, .a-panel')];
  // точки-специалисты: кнопки, порядок табуляции — по семьям и кольцам
  const pinsHost = $r('.a-pins'), frag = document.createDocumentFragment();
  M.pins.forEach(q => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'a-pin'; el.dataset.pin = q.id; el.tabIndex = -1;   // кнопка (без role=listitem): диктор называет её кнопкой
    el.setAttribute('aria-label', q.p.name + (q.p.layer === 'alt' ? ' (отдельный слой)' : ' — ' + q.p.familyName + ', ' + q.p.levelName));
    el.innerHTML = '<span class="a-dot"></span><span class="a-badge"></span><span class="a-lab" hidden></span>';
    el.hidden = true; q.el = el; q.lab = el.lastChild; q.lt = ''; frag.appendChild(el);
  });
  pinsHost.appendChild(frag);
  // 27.10 (patches/states.md): одна остановка Tab на все точки вместо ~125 подряд; внутри — стрелки, Home, End.
  // Остановка «помнит» последнюю точку; если та скрылась фильтром или масштабом — переходит на первую видимую.
  const visPins = () => M.pins.map(q => q.el).filter(el => !el.hidden);
  let rove = null;
  const setRove = el => { if (rove && rove !== el) rove.tabIndex = -1; rove = el; if (el) el.tabIndex = 0; };
  const fixRove = () => { if (!rove || rove.hidden) setRove(visPins()[0] || null); };
  pinsHost.addEventListener('focusin', e => { const p = e.target.closest('.a-pin'); if (p) setRove(p); });
  pinsHost.addEventListener('keydown', e => {
    const p = e.target.closest('.a-pin'); if (!p) return;
    const L = visPins(), i = L.indexOf(p); let n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = L[(i + 1) % L.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = L[(i - 1 + L.length) % L.length];
    else if (e.key === 'Home') n = L[0];
    else if (e.key === 'End') n = L[L.length - 1];
    if (!n) return;
    e.preventDefault(); e.stopPropagation(); e.atlasHandled = true;   // стрелки не двигают карту, пока фокус на точке
    setRove(n); n.focus({ preventScroll: true });
  });
  new MutationObserver(fixRove).observe(pinsHost, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  buildFixed();
  setRing(RINGS[X.store('atlasRing')] ? X.store('atlasRing') : 'level', false);
  M.pins.forEach(q => { setXY(q); q.el.style.setProperty('--d', Math.round(Math.min(1, Math.hypot(q.x, q.y) / 1900) * 700) + 'ms'); });
  M.insights = buildInsights();
  recolor(); refilter(); bind();
  resize(true);
  if (!X.store('atlasHint')) $r('#aHint').hidden = false;
  // вход: карта «разбегается» от центра к краю
  setView(0, 0, M.fitK * .82);
  if (arg) setTimeout(() => go(arg), reduced ? 0 : 350); else fitAll(900);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!M) return; M.dims.clear(); measureFixed(); M.pins.forEach(q => q.lt = ''); req(); });
}

function go(arg) {
  if (!M) return;
  if (!arg) { deselect(true); return; }
  if (arg.startsWith('family:')) { goFamily(arg.slice(7)); return; }
  if (M.byId[arg]) select(arg, { force: true });
}

function resize(first) {
  if (!M) return;
  const r = M.root.getBoundingClientRect();
  const c = first === true ? [0, 0] : center(), s = first === true ? 1 : sNow();
  M.W = r.width; M.H = r.height;
  M.fitK = Math.min(M.W, M.H * 1.04) / (2 * G.ext);
  if (M.W < 760) M.fitK = Math.min(M.W / (2 * (G.supOut + 30)), (M.H - 70) / (2 * G.ext));
  measureFixed();
  setView(c[0], c[1], M.fitK * s);
}

function bind() {
  const root = M.root, stage = M.stage, ptrs = new Map();
  let drag = null, pinchPrev = null, trail = [];
  const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.a-pin, .a-fix button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { stage.setPointerCapture(e.pointerId); } catch (x) { }
    M.active = true; root.classList.add('is-active');
    ptrs.set(e.pointerId, local(e)); stopMotion(); X.hidePv(); M.tip.hidden = true;
    if (ptrs.size === 1) { drag = { moved: 0, target: e.target }; trail = []; } else if (drag) drag.moved = 99;
    pinchPrev = null; stage.classList.add('grabbing');
  });
  stage.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) { hoverTip(e); return; }
    const prev = ptrs.get(e.pointerId), cur = local(e);
    if (ptrs.size === 1) {
      M.v.x += cur[0] - prev[0]; M.v.y += cur[1] - prev[1];
      if (drag) drag.moved += Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]);
      trail.push([performance.now(), cur[0] - prev[0], cur[1] - prev[1]]); if (trail.length > 6) trail.shift();
      req(); ptrs.set(e.pointerId, cur); return;
    }
    ptrs.set(e.pointerId, cur);
    const [a, b] = [...ptrs.values()], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinchPrev) { M.v.x += mid[0] - pinchPrev.mid[0]; M.v.y += mid[1] - pinchPrev.mid[1]; zoomAt(mid[0], mid[1], dist / Math.max(1, pinchPrev.dist)); }
    pinchPrev = { mid, dist };
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); pinchPrev = null;
    if (ptrs.size) return;
    stage.classList.remove('grabbing');
    if (drag && drag.moved < 6) tap(drag.target);
    else if (drag && !reduced) {
      // инерция: карта ещё немного катится после броска
      const t = performance.now(), rec = trail.filter(x => t - x[0] < 80);
      if (rec.length) { const vx = rec.reduce((s, x) => s + x[1], 0) / rec.length, vy = rec.reduce((s, x) => s + x[2], 0) / rec.length; if (Math.hypot(vx, vy) > 2) { M.inertia = { vx, vy }; req(); } }
    }
    drag = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinchPrev = null; drag = null; stage.classList.remove('grabbing'); });
  // нажали вне карты — колёсико снова листает страницу
  M.onDoc = e => { if (M.active && !M.root.contains(e.target)) { M.active = false; M.root.classList.remove('is-active'); } };
  document.addEventListener('pointerdown', M.onDoc);
  stage.addEventListener('pointerleave', () => { M.tip.hidden = true; });
  stage.addEventListener('wheel', e => {
    if (!M.active && !e.ctrlKey && !document.body.classList.contains('atlas-immersive') && !X.fullPage) return;   // страница листается как обычно (на atlas-map.html листать нечего — колёсико сразу приближает)
    e.preventDefault(); if (M.flyRaf) { cancelAnimationFrame(M.flyRaf); M.flyRaf = 0; } M.inertia = null; X.hidePv(); M.tip.hidden = true;
    const m = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1, dx = e.deltaX * m, dy = e.deltaY * m;
    if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy)) { M.v.x -= dx; req(); return; }
    const [px, py] = local(e);
    if (e.ctrlKey || Math.abs(dy) < 40) { M.zoomT = null; zoomAt(px, py, Math.exp(-dy * (e.ctrlKey ? .012 : .0035))); return; }
    // щелчок колеса мыши — плавный шаг приближения
    const base = M.zoomT ? M.zoomT.k : M.v.k;
    M.zoomT = { k: clampK(base * Math.exp(-dy * .0028)), px, py }; req();
  }, { passive: false });
  stage.addEventListener('dblclick', e => { if (e.target.closest('.a-pin')) return; const [px, py] = local(e); fly((px - M.v.x) / M.v.k, (py - M.v.y) / M.v.k, M.v.k * 2, 450); });
  // наведение на специалиста: видны его связи
  const pinsHost = root.querySelector('.a-pins');
  pinsHost.addEventListener('mouseover', e => { const p = e.target.closest('[data-pin]'); if (!p || M.sel || ptrs.size) return; M.hoverId = p.dataset.pin; drawLinks(); M.tip.hidden = true; });
  pinsHost.addEventListener('mouseout', e => { const p = e.target.closest('[data-pin]'); if (!p || M.sel) return; M.hoverId = null; drawLinks(); });
  pinsHost.addEventListener('focusin', e => { const p = e.target.closest('[data-pin]'); if (!p) return; const q = M.byId[p.dataset.pin], a = avail(); const px = q.x * M.v.k + M.v.x, py = q.y * M.v.k + M.v.y; if (px < a.x + 40 || px > a.x + a.w - 40 || py < 40 || py > a.y + a.h - 40) fly(q.x, q.y, Math.max(M.v.k, M.fitK * 2.2), 350); });
  root.addEventListener('mouseover', e => { const b = e.target.closest('[data-gofam]'); if (b && b.closest('.a-labels, .a-drawer')) hlFam(b.dataset.gofam); });
  root.addEventListener('mouseout', e => { const b = e.target.closest('[data-gofam]'); if (b) hlFam(null); });
  root.addEventListener('click', onClick);
  root.addEventListener('change', e => { if (e.target.id === 'aColor') { M.colorBy = e.target.value; X.store('atlasColor', M.colorBy); recolor(); } });
  // поиск: имя или слова из запросов людей
  const q = root.querySelector('#aq'), sugg = root.querySelector('#aSugg');
  let sel = 0, res = [];
  const drawSugg = () => {
    const v = q.value.trim().toLowerCase();
    if (!v) { sugg.hidden = true; res = []; return; }
    const ws = v.split(/\s+/).filter(w => w.length >= 3), st = ws.map(w => w.slice(0, Math.max(3, w.length - 2)));
    if (!ws.length) { sugg.hidden = true; res = []; return; }
    res = M.pins.map(o => {
      const p = o.p, nm = (p.short + ' ' + p.name).toLowerCase(), hay = nm + ' ' + (p.requests || []).join(' ').toLowerCase() + ' ' + p.responsible.toLowerCase(); let sc = 0;
      for (let i = 0; i < ws.length; i++) { if (nm.startsWith(ws[i])) sc += 6; else if (hasStem(nm, st[i])) sc += 3; else if (hasStem(hay, st[i])) sc += 1; else return null; }
      const reqHit = sc < 3 ? (p.requests || []).find(r => st.some(s => hasStem(r.toLowerCase(), s))) : null;
      return [sc, o, reqHit];
    }).filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 8);
    sel = Math.min(sel, Math.max(0, res.length - 1));
    sugg.innerHTML = res.length ? res.map(([, o, rq], i) => `<button type="button" data-go="${o.id}" class="${i === sel ? 'on' : ''}"><i style="background:${pinColor(o.p)}"></i><span><b>${esc(o.p.short)}</b><small>${esc(o.p.layer === 'alt' ? 'отдельный слой' : o.p.familyName + ' · ' + o.p.levelName)}</small>${rq ? `<em>${esc(rq)}</em>` : ''}</span></button>`).join('') + `<p class="a-sugg-f">Все совпадения подсвечены на карте</p>` : '<p class="muted">Ничего не нашлось</p>';
    sugg.hidden = false; req();
  };
  q.addEventListener('input', () => { sel = 0; M.f.q = q.value.trim(); drawSugg(); refilter(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(res.length - 1, sel + 1); drawSugg(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); drawSugg(); e.preventDefault(); }
    else if (e.key === 'Enter' && res[sel]) { select(res[sel][1].id, { force: true }); sugg.hidden = true; q.blur(); }
    else if (e.key === 'Escape') { q.value = ''; M.f.q = ''; drawSugg(); refilter(); q.blur(); e.stopPropagation(); }
  });
  q.addEventListener('focus', drawSugg);
  // мини-карта: нажать или тянуть — перейти туда
  const mini = root.querySelector('.a-mini svg');
  const miniGo = e => { const r = mini.getBoundingClientRect(); const s = Math.max(MINI_VB.w / r.width, MINI_VB.h / r.height); const ox = (r.width * s - MINI_VB.w) / 2, oy = (r.height * s - MINI_VB.h) / 2; setView((e.clientX - r.left) * s - ox + MINI_VB.x, (e.clientY - r.top) * s - oy + MINI_VB.y, M.v.k); };
  let miniDrag = false;
  mini.addEventListener('pointerdown', e => { miniDrag = true; stopMotion(); try { mini.setPointerCapture(e.pointerId); } catch (x) { } miniGo(e); });
  mini.addEventListener('pointermove', e => { if (miniDrag) miniGo(e); });
  mini.addEventListener('pointerup', () => { miniDrag = false; });
  M.onKey = e => { if (e.key === 'Escape' && document.body.classList.contains('atlas-immersive') && !(e.target instanceof Node && root.contains(e.target))) onKey(e); };
  root.addEventListener('keydown', onKey); window.addEventListener('keydown', M.onKey);
  M.ro = new ResizeObserver(() => resize()); M.ro.observe(root);
}
function hlFam(id) { M.root.querySelectorAll('.a-cell, .a-sup, .a-island').forEach(c => c.classList.toggle('hl-h', !!id && c.dataset.fam === id)); }
/* подсказка при наведении на участок карты (на обзоре) */
function hoverTip(e) {
  const t = e.target.closest && e.target.closest('.a-cell, .a-sup, .a-island');
  if (!t || sNow() > 2.6 || M.sel || matchMedia('(hover: none)').matches) { M.tip.hidden = true; return; }
  let html;
  if (t.classList.contains('a-sup')) html = `<b>Опора для помогающих</b><span>${X.MAIN.filter(p => p.family === 'support').length} роли · внешний пояс</span>`;
  else if (t.classList.contains('a-island')) html = `<b>Отдельный слой</b><span>${X.ALT.length} альтернативных практик · вне карты</span>`;
  else {
    const c = M.cells.find(x => x.fam === t.dataset.fam && String(x.l) === t.dataset.l); if (!c) return;
    html = `<b><i style="background:var(--fam-${c.fam})"></i>${esc(X.FAM[c.fam].name)}</b><span>${esc(ringName(c.l))} · ${plural(c.n, 'специалист', 'специалиста', 'специалистов')}</span>${M.metric && c.n ? `<span class="a-tip-h">${c.hk} из ${c.n} — ${esc(M.metric.short)}</span>` : ''}`;
  }
  if (M.tip.dataset.k !== html) { M.tip.innerHTML = html; M.tip.dataset.k = html; }
  const r = M.root.getBoundingClientRect(); let x = e.clientX - r.left + 16, y = e.clientY - r.top + 18;
  M.tip.hidden = false; const w = M.tip.offsetWidth, h = M.tip.offsetHeight;
  if (x + w > M.W - 8) x -= w + 30; if (y + h > M.H - 8) y -= h + 34;
  M.tip.style.transform = `translate(${x}px,${y}px)`;
}

function tap(target) {
  const cell = target.closest && target.closest('.a-cell, .a-sup, .a-island');
  M.root.querySelector('#aSugg').hidden = true; M.tip.hidden = true;
  if (cell) {
    const fam = cell.dataset.fam;
    if (fam === 'support' || fam === 'alt' || sNow() < 2.2) goFamily(fam); else flyCell(fam, cell.dataset.l);
    return;
  }
  if (M.panelOpen || M.sel) deselect();
}

function onClick(e) {
  const t = e.target;
  if (t.closest('[data-closefull]') && document.body.classList.contains('atlas-immersive')) toggleFs(false);
  const pin = t.closest('[data-pin]'); if (pin) { X.hidePv(); if (M.sel === pin.dataset.pin && M.panelOpen) return; select(pin.dataset.pin); return; }
  const go = t.closest('[data-go]'); if (go) { M.root.querySelector('#aSugg').hidden = true; if (M.W < 760) closeDrawer(); select(go.dataset.go, { force: true }); return; }
  const gf = t.closest('[data-gofam]'); if (gf) { if (M.W < 760) closeDrawer(); goFamily(gf.dataset.gofam); return; }
  const gl = t.closest('[data-golevel]'); if (gl) { const [f, l] = gl.dataset.golevel.split(':'); if (M.ring !== 'level') setRing('level'); flyCell(f, l); return; }
  const cr = t.closest('[data-crumb]'); if (cr) { const v = cr.dataset.crumb; if (v === 'all') { deselect(); fitAll(); } else if (v.startsWith('fam:')) goFamily(v.slice(4)); else { const [, f, l] = v.split(':'); flyCell(f, l); } return; }
  if (t.closest('[data-close]')) { deselect(); return; }
  const mk = t.closest('[data-mark]'); if (mk) { setMark(mk.dataset.id, mk.dataset.mark); return; }
  const z = t.closest('[data-z]'); if (z) { const v = z.dataset.z; if (v === 'fit') fitAll(); else { const [cx, cy] = center(); fly(cx, cy, M.v.k * (v === 'in' ? 1.6 : 1 / 1.6), 320); } return; }
  const stp = t.closest('[data-step]'); if (stp) { const [cx, cy] = center(); fly(cx, cy, M.fitK * STEPS[+stp.dataset.step].s, 450); return; }
  const dr = t.closest('[data-drawer]'); if (dr) { openDrawer(dr.dataset.drawer); return; }
  if (t.closest('[data-drclose]')) { closeDrawer(); return; }
  if (t.closest('[data-story]')) { startTour('story'); return; }
  const rt = t.closest('[data-route]'); if (rt) { startTour('route', rt.dataset.route); return; }
  const rg = t.closest('[data-ring]'); if (rg) { setRing(rg.dataset.ring); return; }
  const ht = t.closest('[data-heat]'); if (ht) { setHeat(ht.dataset.heat); return; }
  const ins = t.closest('[data-ins]'); if (ins) { const x = M.insights[+ins.dataset.ins]; if (M.W < 760) closeDrawer(); x.act(); M.root.querySelectorAll('.a-ins').forEach(b => b.classList.toggle('on', b === ins)); return; }
  const af = t.closest('[data-af]'); if (af) {
    const k = af.dataset.af, f = M.f;
    if (k in { free: 1, online: 1, ru: 1, net: 1 }) f[k] = !f[k]; else { const set = f[k]; set.has(af.dataset.v) ? set.delete(af.dataset.v) : set.add(af.dataset.v); }
    refilter(); refreshDrawer(); return;
  }
  if (t.closest('#aReset') || t.closest('[data-clearf]')) { const f = M.f; f.flags.clear(); f.res.clear(); f.train.clear(); f.free = f.online = f.ru = f.net = false; f.q = ''; M.root.querySelector('#aq').value = ''; M.root.querySelector('#aSugg').hidden = true; refilter(); refreshDrawer(); return; }
  if (t.closest('#aCopyNet')) {
    const txt = netText(), ta = M.root.querySelector('#aNetText'), b = t.closest('#aCopyNet');
    const fallback = () => { ta.hidden = false; ta.value = txt; ta.select(); b.textContent = 'Выделено — скопируй'; };
    try { navigator.clipboard.writeText(txt).then(() => { b.textContent = 'Скопировано'; }, fallback); } catch (x) { fallback(); }
    return;
  }
  const tr = t.closest('[data-tour]'); if (tr) { const v = tr.dataset.tour; if (v === 'x') endTour(); else { M.tour.i = Math.max(0, Math.min(M.tour.steps.length - 1, M.tour.i + +v)); goStep(); } return; }
  if (t.closest('#aFs')) { toggleFs(); return; }
  if (t.closest('#aHintOk')) { M.root.querySelector('#aHint').hidden = true; X.store('atlasHint', 1); req(); return; }
}

function onKey(e) {
  if (!M || e.atlasHandled || document.getElementById('pal')) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.key === 'Escape') {
    if (M.tour) endTour(); else if (M.drawer) closeDrawer(); else if (M.sel || M.panelOpen) deselect(); else if (document.body.classList.contains('atlas-immersive')) toggleFs(false);
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  const cx = M.W / 2, cy = M.H / 2;
  switch (e.key) {
    case '+': case '=': zoomAt(cx, cy, 1.4); break;
    case '-': case '_': zoomAt(cx, cy, 1 / 1.4); break;
    case '0': fitAll(); break;
    case 'ArrowLeft': if (M.tour) { if (M.tour.i) { M.tour.i--; goStep(); } } else { M.v.x += 90; req(); } break;
    case 'ArrowRight': if (M.tour) { if (M.tour.i < M.tour.steps.length - 1) { M.tour.i++; goStep(); } } else { M.v.x -= 90; req(); } break;
    case 'ArrowUp': M.v.y += 90; req(); break;
    case 'ArrowDown': M.v.y -= 90; req(); break;
    case 'f': case 'F': case 'а': case 'А': toggleFs(); break;
    default: return;
  }
  e.preventDefault();
}

function unmount() {
  if (!M) return;
  stopMotion(); if (M.raf) cancelAnimationFrame(M.raf); clearInterval(M.sweepT);
  window.removeEventListener('keydown', M.onKey); M.root.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', M.onDoc);
  M.ro && M.ro.disconnect();
  document.body.classList.remove('atlas-immersive');
  M.root.remove(); M = null;
}

window.AtlasMap = {
  mount, unmount, go, mounted: () => !!M,
  tour: (kind, id) => { if (M) startTour(kind, id); },
  exitFull: () => { if (M && document.body.classList.contains('atlas-immersive')) toggleFs(false); },
  // для проверки: показать карту с заданным приближением
  view: (s, cx, cy) => { if (!M) return; stopMotion(); setView(cx || 0, cy || 0, M.fitK * s); if (M.raf) cancelAnimationFrame(M.raf); M.raf = 0; draw(); },
  state: () => M && { v: M.v, fitK: M.fitK, W: M.W, H: M.H, ring: M.ring, heat: M.heat, drawer: M.drawer }
};
})();
