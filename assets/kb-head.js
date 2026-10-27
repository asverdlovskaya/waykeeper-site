/* =====================================================================
   Waykeeper · поиск в окошке «База знаний» (пакет 2, 26.10.2026)
   Подключается на всех страницах из _tools/v2_chrome.py после kb.js.
   1. «/» ведёт к поиску: если на странице есть свой поиск (вход в базу, разделы) — к нему,
      иначе открывает окошко «База знаний» (на телефоне — меню) и ставит курсор в строку поиска.
   2. Пока курсор в строке поиска окошка, оно не закрывается от ухода мыши.
   ===================================================================== */
(function(){
  'use strict';
  var D = document;
  function isTyping(t){
    var tag = t && t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable);
  }
  D.addEventListener('keydown', function(e){
    if(e.key !== '/' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    var all = D.querySelectorAll('.kb-search input:not([data-kb-manual])'), main = null, i;
    for(i = 0; i < all.length; i++){
      if(!all[i].closest('.site-head') && all[i].getClientRects().length){ main = all[i]; break; }
    }
    if(main){ e.preventDefault(); main.focus(); main.select(); return; }
    var input = D.getElementById('kb-pop-q'), kb = D.querySelector('.site-head .kb');
    if(!input || !kb) return;
    e.preventDefault();
    if(window.matchMedia('(min-width: 981px)').matches){
      var btn = kb.querySelector('.kb-btn');
      if(btn && !kb.classList.contains('is-open')) btn.click();
    } else {
      var menu = D.querySelector('.menu-btn');
      if(menu && menu.getAttribute('aria-expanded') !== 'true') menu.click();
    }
    setTimeout(function(){ input.focus(); }, 30);
  }, true);

  var kb = D.querySelector('.site-head .kb'), inp = D.getElementById('kb-pop-q');
  if(kb && inp){
    kb.addEventListener('mouseleave', function(e){
      if(D.activeElement === inp && inp.value) e.stopImmediatePropagation();
    }, true);
  }
})();
