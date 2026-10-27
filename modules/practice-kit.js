/* Waykeeper · общие механики страницы практики · префикс pk-
   Чек-лист шагов с отметками, таймер на N минут, «Скопировать текстом», «Стереть ответы».
   Кит не перерисовывает разметку страницы, а дополняет её — без кита страница работает как обычный текст с полями.

   <div data-module="practice-kit" data-id="t-wheel" data-title="Колесо контекстов" data-minutes="20"
        data-store="waykeeper.practice.t-wheel">
     <ol data-kit-steps><li data-kit-step="0">Текст шага</li>…</ol>
     <div data-kit-fields>
       <div><label for="f-0">Подпись</label><textarea id="f-0" data-kit-field="0"></textarea><p class="pr-ex">Например: …</p></div>
     </div>
     <div data-kit-bar></div>
   </div>

   data-minutes — число; пусто или 0 — без таймера. Таймер встаёт перед шагами (нет шагов — в [data-kit-bar]).
   data-store   — ключ хранения; по умолчанию «waykeeper.practice.<data-id>».
   Пример в p.pr-ex (или [data-kit-example]) получает ссылку «взять как заготовку».
   «Скопировать текстом» собирает: название, текст живых инструментов на странице (root.wkText() у любого
   [data-module], кроме кита) и ответы полей с их подписями. «Стереть ответы» стирает только отметки и поля кита.

   Живой инструмент внутри кита: <div data-kit-tool><div data-module="wheel" …></div></div>.
   Тогда своей нижней строки у кита нет: «Скопировать текстом» и строка «Ответы остаются в этом браузере.»
   встают в нижнюю строку инструмента, рядом с его «Стереть ответы», и это «Стереть» стирает заодно отметки и поля кита.
   Скрипт модуля подключается раньше practice-kit.js, чтобы его нижняя строка уже была на месте. */
(function () {
  'use strict';

  var uid = 0;
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function minWord(n) {
    var a = n % 10, b = n % 100;
    return (a === 1 && b !== 11) ? 'минуту' : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 'минуты' : 'минут';
  }

  function init(root) {
    if (root.__pk) return;
    root.__pk = true;
    var P = 'pk' + (++uid) + '-';
    var KEY = root.getAttribute('data-store') || ('waykeeper.practice.' + (root.getAttribute('data-id') || 'page'));
    var title = root.getAttribute('data-title') || '';
    var minutes = parseInt(root.getAttribute('data-minutes'), 10) || 0;
    var st = { v: 1, c: [], f: {} };
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1) st = { v: 1, c: d.c || [], f: d.f || {} };
    } catch (e) { }
    var saveT = 0;
    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }, 250);
    }

    root.classList.add('pk');
    var live = document.createElement('p');
    live.className = 'pk-sr'; live.setAttribute('aria-live', 'polite');
    root.appendChild(live);
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

    /* ---------- шаги ---------- */
    var list = root.querySelector('[data-kit-steps]');
    var steps = list ? [].slice.call(list.querySelectorAll('[data-kit-step]')) : [];
    if (list) list.classList.add('pk-steps');
    steps.forEach(function (li) {
      var n = li.getAttribute('data-kit-step');
      var lab = document.createElement('label'), cb = document.createElement('input'), box = document.createElement('span'), tx = document.createElement('span');
      lab.className = 'pk-step';
      cb.type = 'checkbox'; cb.className = 'pk-cb'; cb.setAttribute('data-pk-c', n);
      box.className = 'pk-box'; box.setAttribute('aria-hidden', 'true');
      tx.className = 'pk-st';
      while (li.firstChild) tx.appendChild(li.firstChild);
      lab.appendChild(cb); lab.appendChild(box); lab.appendChild(tx);
      li.appendChild(lab);
    });
    function paintSteps() {
      steps.forEach(function (li) {
        var n = li.getAttribute('data-kit-step'), on = st.c.indexOf(n) >= 0;
        li.querySelector('.pk-cb').checked = on;
        li.classList.toggle('is-done', on);
      });
    }

    /* ---------- поля ---------- */
    var fields = [].slice.call(root.querySelectorAll('[data-kit-field]'));
    function grow(ta) {
      if (ta.tagName !== 'TEXTAREA') return;
      ta.style.height = 'auto';
      ta.style.height = (ta.scrollHeight + 2) + 'px';
    }
    fields.forEach(function (ta) {
      ta.classList.add('pk-ta');
      var box = ta.parentNode, ex = box.querySelector('.pr-ex, [data-kit-example]');
      if (!ex) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pk-use'; b.textContent = 'взять как заготовку';
      b.setAttribute('data-pk-use', ta.getAttribute('data-kit-field'));
      ex.appendChild(document.createTextNode(' '));
      ex.appendChild(b);
    });
    function paintFields() { fields.forEach(function (ta) { ta.value = st.f[ta.getAttribute('data-kit-field')] || ''; grow(ta); }); }
    function labelOf(ta) {
      var l = ta.id && root.querySelector('label[for="' + ta.id + '"]');
      return txt(l) || ta.getAttribute('aria-label') || ta.getAttribute('placeholder') || '';
    }

    /* ---------- нижняя строка ---------- */
    var NOTE = 'Ответы остаются в этом браузере.';
    var toolBox = root.querySelector('[data-kit-tool]');
    var bar = root.querySelector('[data-kit-bar]');
    var outEl = document.createElement('textarea');
    outEl.className = 'pk-out'; outEl.readOnly = true; outEl.hidden = true; outEl.setAttribute('aria-label', 'Текст для копирования');
    function ownBar() {
      if (!bar) { bar = document.createElement('div'); bar.setAttribute('data-kit-bar', ''); root.appendChild(bar); }
      bar.classList.add('pk-bar');
      bar.innerHTML =
        '<div class="pk-acts"><button type="button" class="pk-btn pk-btn--main" data-pk-copy>Скопировать текстом</button>' +
        '<button type="button" class="pk-clear" data-pk-clear>Стереть ответы</button></div>' +
        '<span class="pk-note">' + NOTE + '</span>';
      bar.appendChild(outEl);
    }
    /* инструмент на странице: одна нижняя строка — его */
    function adopt() {
      var clr = toolBox && toolBox.querySelector('[data-clear-all]');
      if (!clr) return false;
      var foot = clr.parentNode;
      foot.setAttribute('data-pk-foot', '');
      var hasText = fields.length || [].some.call(toolBox.querySelectorAll('[data-module]'), function (m) { return typeof m.wkText === 'function'; });
      if (hasText) {
        var cb = document.createElement('button');
        cb.type = 'button'; cb.className = 'pk-link'; cb.setAttribute('data-pk-copy', ''); cb.textContent = 'Скопировать текстом';
        foot.insertBefore(cb, clr);
      }
      var nt = document.createElement('span');
      nt.className = 'pk-note'; nt.textContent = NOTE;
      foot.appendChild(nt);
      clr.addEventListener('click', function () {
        setTimeout(function () { if (/стёрто/i.test(clr.textContent)) clearKit(); }, 0);
      });
      if (bar) bar.parentNode.removeChild(bar);
      bar = null;
      (fields.length ? root.querySelector('[data-kit-fields]') : toolBox).insertAdjacentElement('afterend', outEl);
      return true;
    }
    if (toolBox) {
      if (!adopt()) {
        ownBar();
        setTimeout(function () { if (bar && toolBox.querySelector('[data-clear-all]')) { bar.parentNode.removeChild(bar); bar = null; adopt(); } }, 0);
      }
    } else ownBar();

    /* ---------- таймер ---------- */
    var tm = null;
    if (minutes > 0) {
      var tmEl = document.createElement('div');
      tmEl.className = 'pk-timer';
      tmEl.innerHTML =
        '<button type="button" class="pk-btn" data-pk-go aria-describedby="' + P + 'tt">Засечь ' + minutes + ' ' + minWord(minutes) + '</button>' +
        '<span class="pk-tt" id="' + P + 'tt" role="timer" aria-live="off" hidden></span>' +
        '<button type="button" class="pk-link" data-pk-reset hidden>сбросить</button>' +
        '<span class="pk-run" aria-hidden="true" hidden><i></i></span>';
      if (list) list.parentNode.insertBefore(tmEl, list); else bar.insertBefore(tmEl, bar.firstChild);
      tm = { el: tmEl, total: minutes * 60, left: minutes * 60, end: 0, iv: 0 };
    }
    function tPaint() {
      var go = tm.el.querySelector('[data-pk-go]'), tt = tm.el.querySelector('.pk-tt'), rs = tm.el.querySelector('[data-pk-reset]'), run = tm.el.querySelector('.pk-run');
      var started = tm.iv || tm.left < tm.total;
      tt.hidden = rs.hidden = run.hidden = !started;
      tt.textContent = tm.left <= 0 ? 'Время вышло' : mmss(tm.left);
      go.textContent = !started ? 'Засечь ' + minutes + ' ' + minWord(minutes) : tm.left <= 0 ? 'Ещё раз' : tm.iv ? 'Пауза' : 'Дальше';
      run.querySelector('i').style.width = ((1 - tm.left / tm.total) * 100).toFixed(2) + '%';
      tm.el.classList.toggle('is-over', tm.left <= 0);
    }
    function tStop() { clearInterval(tm.iv); tm.iv = 0; }
    function tTick() {
      tm.left = (tm.end - Date.now()) / 1000;
      if (tm.left <= 0) { tm.left = 0; tStop(); say('Время вышло.'); }
      tPaint();
    }

    /* ---------- события ---------- */
    root.addEventListener('change', function (e) {
      var n = e.target.getAttribute && e.target.getAttribute('data-pk-c');
      if (n === null || n === undefined) return;
      st.c = st.c.filter(function (x) { return x !== n; });
      if (e.target.checked) st.c.push(n);
      e.target.closest('li').classList.toggle('is-done', e.target.checked);
      save();
    });
    root.addEventListener('input', function (e) {
      var n = e.target.getAttribute && e.target.getAttribute('data-kit-field');
      if (n === null || n === undefined) return;
      if (e.target.value) st.f[n] = e.target.value; else delete st.f[n];
      grow(e.target); save();
    });

    var armed = 0;
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-pk-use]'))) {
        var n = b.getAttribute('data-pk-use'), ta = root.querySelector('[data-kit-field="' + n + '"]');
        var ex = txt(b.parentNode).replace(/\s*взять как заготовку\s*$/, '').replace(/^Например:\s*/i, '');
        ta.value = ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n' + ex : ex;
        st.f[n] = ta.value; save(); grow(ta);
        ta.focus();
        return;
      }
      if (tm && e.target.closest('[data-pk-go]')) {
        if (tm.iv) { tStop(); tPaint(); return; }
        if (tm.left <= 0) tm.left = tm.total;
        tm.end = Date.now() + tm.left * 1000;
        tm.iv = setInterval(tTick, 250);
        tPaint();
        return;
      }
      if (tm && e.target.closest('[data-pk-reset]')) {
        tStop(); tm.left = tm.total; tPaint();
        tm.el.querySelector('[data-pk-go]').focus();
        return;
      }
      if ((b = e.target.closest('[data-pk-copy]'))) { copy(b); return; }
      if ((b = e.target.closest('[data-pk-clear]'))) {
        if (!armed) {
          armed = setTimeout(function () { armed = 0; b.textContent = 'Стереть ответы'; }, 3000);
          b.textContent = 'Точно стереть?';
          return;
        }
        clearTimeout(armed); armed = 0;
        clearKit();
        b.textContent = 'Стёрто';
        say('Отметки и ответы стёрты.');
        setTimeout(function () { b.textContent = 'Стереть ответы'; }, 1600);
      }
    });

    function clearKit() {
      st = { v: 1, c: [], f: {} };
      try { localStorage.removeItem(KEY); } catch (er) { }
      paintSteps(); paintFields();
    }

    function collect() {
      var parts = [];
      if (title) parts.push(title.toUpperCase());
      [].forEach.call(document.querySelectorAll('[data-module]'), function (m) {
        if (m === root || m.getAttribute('data-module') === 'practice-kit' || typeof m.wkText !== 'function') return;
        var t = ''; try { t = m.wkText(); } catch (e) { }
        if (t) parts.push(t);
      });
      fields.forEach(function (ta) { if (ta.value.trim()) parts.push(labelOf(ta) + ':\n' + ta.value.trim()); });
      return parts.join('\n\n');
    }
    function copy(btn) {
      var t = collect(), out = outEl;
      if (!t || t === title.toUpperCase()) { say('Пока нечего копировать: ответов нет.'); btn.textContent = 'Пока пусто'; setTimeout(function () { btn.textContent = 'Скопировать текстом'; }, 1600); return; }
      function ok() { btn.textContent = 'Скопировано'; say('Текст скопирован.'); setTimeout(function () { btn.textContent = 'Скопировать текстом'; }, 1600); }
      function fb() {
        out.hidden = false; out.value = t; grow(out); out.focus(); out.select();
        var done = false; try { done = document.execCommand('copy'); } catch (e) { }
        if (done) ok(); else { btn.textContent = 'Текст выделен ниже'; say('Текст выделен ниже, скопируй его.'); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fb);
      else fb();
    }

    paintSteps(); paintFields();
    if (tm) tPaint();
  }

  function boot() { [].forEach.call(document.querySelectorAll('[data-module="practice-kit"]'), init); }
  window.WaykeeperPracticeKit = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
