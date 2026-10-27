/* =====================================================================
   Waykeeper · словарь (glossary.html): поиск по словарю на месте, без перезагрузки.
   Пакет 2, 26.10.2026. Фильтр прячет термины и буквы без совпадений, строка результата во время поиска — «Найдено: N» (с 27.10; без поиска пусто).
   ===================================================================== */
(function(){
  'use strict';
  var D = document;
  var input = D.getElementById('gl-q'), terms = D.querySelectorAll('.gl-term'), groups = D.querySelectorAll('.gl-group');
  var result = D.getElementById('gl-result'), none = D.getElementById('gl-none');
  if(!input || !terms.length) return;
  var total = terms.length;
  function norm(s){ return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim(); }
  function plural(n){ var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'термин' : (a >= 2 && a <= 4 && (b < 10 || b >= 20)) ? 'термина' : 'терминов'; }
  function apply(){
    var q = norm(input.value), toks = q ? q.split(' ') : [], shown = 0, i, j;
    for(i = 0; i < terms.length; i++){
      var t = terms[i], hay = t.getAttribute('data-t') + ' ' + norm(t.textContent), ok = true;
      for(j = 0; j < toks.length; j++){ if(hay.indexOf(toks[j]) < 0){ ok = false; break; } }
      t.hidden = !ok; if(ok) shown++;
    }
    for(i = 0; i < groups.length; i++){ groups[i].hidden = !groups[i].querySelector('.gl-term:not([hidden])'); }
    result.innerHTML = '';
    var b = D.createElement('b'); b.textContent = q ? 'Найдено: ' + shown : '';  /* число — только во время поиска (решение Саши 27.10) */
    result.appendChild(b);
    if(q){
      var reset = D.createElement('a'); reset.href = '#'; reset.textContent = 'Сбросить';
      reset.addEventListener('click', function(e){ e.preventDefault(); input.value = ''; apply(); input.focus(); });
      result.appendChild(reset);
    }
    none.hidden = shown > 0;
  }
  input.addEventListener('input', apply);
  input.addEventListener('keydown', function(e){ if(e.key === 'Escape' && input.value){ input.value = ''; apply(); e.preventDefault(); } });
  // переход по #term-… к скрытому термину не нужен: при адресе с якорем фильтр пуст
})();
