/* Waykeeper · site-v2 · энциклопедия переходов: со старых адресов на новые (пакет 4, 26.10.2026).
   Раньше все статьи жили на одной странице: encyclopedia.html#slug. Теперь у каждой статьи свой адрес:
   encyclopedia/<slug>.html. Подключается в <head> входа и срабатывает сразу, до показа страницы.
   Старые виды: #slug, #slug~N, #razdel-N, #slovar, #slovar~N, #literatura, #kak-ustroena, #vhod-… */
(function(){
  'use strict';
  var h = '';
  try { h = decodeURIComponent((location.hash || '').slice(1)); } catch(e) { return; }
  if(!h) return;
  var ON_PAGE = { begin:1, sit:1, questions:1, approaches:1, schools:1, concepts:1, marks:1, telegram:1, channel:1, main:1, 'not-yet':1 };
  if(ON_PAGE[h]) return;
  var to = null, m;
  if(/^slovar(~\d+)?$/.test(h)) to = 'glossary.html';
  else if(h === 'kak-ustroena' || /^kak-ustroena~\d+$/.test(h)) to = 'how.html';
  else if(h === 'literatura') to = 'encyclopedia.html#approaches';
  else if(h === 'vhod-situacii') to = 'encyclopedia.html#sit';
  else if(h === 'vhod-voprosy') to = 'encyclopedia.html#questions';
  else if(h === 'vhod-podhody') to = 'encyclopedia.html#approaches';
  else if((m = /^razdel-(\d+)(~\d+)?$/.exec(h))) {
    to = { 1:'encyclopedia/perehod.html', 2:'encyclopedia.html#sit', 3:'encyclopedia.html#questions', 4:'encyclopedia.html#approaches',
           5:'encyclopedia.html#schools', 6:'encyclopedia.html#concepts', 7:'encyclopedia.html#concepts' }[+m[1]] || 'encyclopedia.html';
  }
  else if((m = /^([a-z0-9-]+)(~\d+)?$/.exec(h))) to = 'encyclopedia/' + m[1] + '.html';
  if(to) location.replace(to);
})();
