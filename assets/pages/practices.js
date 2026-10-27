/* Waykeeper · «Практики» · каталог (practices.html) и страницы практик (practices/*.html)
   Каталог: фильтр «С чем ты пришёл» (выпадающий список из situations.json) и переключатель «Все / Основные»;
   выбор записывается в адрес (?sit=slug&only=core), «назад» возвращает состояние. Без скрипта виден весь список.
   Страница практики: «Распечатать» и «Скопировать шаги» в блоке «Для специалистов». Ничего не отправляется. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- каталог */
  function catalog() {
    var list = document.querySelector('.pr-list');
    var sel = document.querySelector('[data-sit-select]');
    if (!list || !sel) return;
    var rows = [].slice.call(list.querySelectorAll('.pr-row'));
    var groups = [].slice.call(list.querySelectorAll('.pr-group'));
    var segs = [].slice.call(document.querySelectorAll('[data-only]'));
    var res = document.querySelector('[data-result]');
    var none = list.querySelector('[data-none]');
    var resets = [].slice.call(document.querySelectorAll('[data-reset]'));
    var total = rows.length;
    var st = { sit: '', only: 'all' };

    function inSit(r) { return !st.sit || (' ' + r.getAttribute('data-sit') + ' ').indexOf(' ' + st.sit + ' ') >= 0; }
    function isCore(r) { return r.getAttribute('data-core') === '1'; }

    function paint() {
      var shown = 0, cAll = 0, cCore = 0;
      rows.forEach(function (r) {
        var s = inSit(r);
        if (s) { cAll++; if (isCore(r)) cCore++; }
        var on = s && (st.only === 'all' || isCore(r));
        r.hidden = !on;
        if (on) shown++;
      });
      groups.forEach(function (g) {
        var n = g.querySelectorAll('.pr-row:not([hidden])').length;
        g.hidden = !n;
        var c = g.querySelector('[data-n]'); if (c) c.textContent = n;
      });
      segs.forEach(function (b) {
        var k = b.getAttribute('data-only'), n = k === 'core' ? cCore : cAll;
        b.setAttribute('aria-pressed', k === st.only ? 'true' : 'false');
        b.querySelector('.n').textContent = n;
        b.disabled = n === 0 && k !== st.only;
      });
      sel.value = st.sit;
      var bits = [shown + ' из ' + total];
      if (st.sit) bits.push(sel.options[sel.selectedIndex].text.toLowerCase());
      if (st.only === 'core') bits.push('основные');
      if (res) res.textContent = bits.join(' · ');
      var dirty = !!st.sit || st.only !== 'all';
      resets.forEach(function (a) { if (a.parentNode.classList && a.parentNode.classList.contains('kb-result')) a.hidden = !dirty; });
      if (none) none.hidden = shown !== 0;
      if (window.Field && Field.refresh) { try { Field.refresh(); } catch (e) { } }
    }
    function url() {
      var q = [];
      if (st.sit) q.push('sit=' + encodeURIComponent(st.sit));
      if (st.only === 'core') q.push('only=core');
      return location.pathname + (q.length ? '?' + q.join('&') : '') + (location.hash && /^#catalog/.test(location.hash) ? location.hash : '#catalog');
    }
    function readUrl() {
      var m = /[?&]sit=([^&#]+)/.exec(location.search);
      var s = m ? decodeURIComponent(m[1]) : '';
      st.sit = [].some.call(sel.options, function (o) { return o.value === s; }) ? s : '';
      st.only = /[?&]only=core/.test(location.search) ? 'core' : 'all';
    }
    function change(push) {
      paint();
      if (push) { try { history.pushState(null, '', url()); } catch (e) { } }
    }

    sel.addEventListener('change', function () { st.sit = sel.value; change(true); });
    segs.forEach(function (b) {
      b.addEventListener('click', function () { st.only = b.getAttribute('data-only'); change(true); });
    });
    resets.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); st.sit = ''; st.only = 'all'; change(true); });
    });
    window.addEventListener('popstate', function () { readUrl(); paint(); });

    readUrl(); paint();
    if (st.sit || st.only !== 'all') {
      var c = document.getElementById('catalog');
      if (c && !location.hash) { try { c.scrollIntoView(); } catch (e) { } }
    }
    /* старые адреса вида #catalog-compass (этапы) просто открывают каталог */
    if (/^#catalog-/.test(location.hash)) {
      var cc = document.getElementById('catalog'); if (cc) cc.scrollIntoView();
    }
  }

  /* ---------------------------------------------------------------- страница практики: для специалистов */
  function pros() {
    var print = document.querySelector('[data-print-page]');
    var copy = document.querySelector('[data-copy-steps]');
    if (print) print.addEventListener('click', function () { window.print(); });
    if (!copy) return;
    var note = document.querySelector('[data-copy-note]');
    function text() {
      var t = document.querySelector('.pr-title');
      var out = [t ? t.textContent.trim() : ''];
      var steps = [].slice.call(document.querySelectorAll('[data-kit-steps] > li'));
      steps.forEach(function (li, i) { out.push((i + 1) + '. ' + li.textContent.replace(/\s+/g, ' ').trim()); });
      var care = [].slice.call(document.querySelectorAll('.pr-careful li'));
      if (care.length) {
        out.push('', 'Осторожно:');
        care.forEach(function (li) { out.push('— ' + li.textContent.replace(/\s+/g, ' ').trim()); });
      }
      out.push('', location.href.replace(/[?#].*$/, ''));
      return out.join('\n');
    }
    function say(t) { if (note) { note.textContent = t; setTimeout(function () { note.textContent = ''; }, 2600); } }
    function fallback(s) {
      var ta = document.createElement('textarea');
      ta.value = s; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(ta);
      say(ok ? 'Скопировано.' : 'Не получилось скопировать: выдели шаги на странице.');
    }
    copy.addEventListener('click', function () {
      var s = text();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(function () { say('Скопировано.'); }, function () { fallback(s); });
      } else fallback(s);
    });
  }

  function boot() { catalog(); pros(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
