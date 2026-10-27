/* =====================================================================
   Waykeeper · site.js · мелочи сайта (без поля)
   1. Адреса Telegram — в одном месте. Все кнопки с data-tg ведут сюда,
      все ссылки с data-channel — на канал.
   2. Меню-лист на телефоне (кнопка .menu-btn в шапке).
   3. Шапка при прокрутке: стекло после 80 px, прячется вниз / возвращается вверх;
      точная высота шапки — в CSS-переменной --head-h на <html> (её читают
      прилипающие полоски страниц, напр. недели на «Переходе»).
   4. Заглушки фото [data-photo-placeholder]: подпись только для экранных чтецов.
   ===================================================================== */
(function(){
'use strict';

/* [ссылка на Telegram] — личный аккаунт Саши. Подставить ОДИН раз здесь, например 'https://t.me/username'. */
var TG = 'https://t.me/asverdlovskaya';
/* Канал в Telegram (подвал, «Открыто без регистрации»). */
var CHANNEL = 'https://t.me/refdesign';

function external(a, url){
  a.setAttribute('href', url);
  if(/^https?:/.test(url)){ a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
}
/* data-tg-text="…" — готовый текст первого сообщения: ссылка откроет чат с Сашей с этим текстом
   (https://t.me/…?text=…). Адрес по-прежнему один — TG выше. */
function tgUrl(a){
  var t = a && a.getAttribute('data-tg-text');
  return t ? TG + '?text=' + encodeURIComponent(t) : TG;
}
Array.prototype.forEach.call(document.querySelectorAll('[data-tg]'), function(a){ external(a, tgUrl(a)); });
Array.prototype.forEach.call(document.querySelectorAll('[data-channel]'), function(a){ external(a, CHANNEL); });
/* кнопки, которые модули дорисовали позже (например, «Записаться в список ожидания» в «Новом сезоне»), тоже ведут в Telegram */
document.addEventListener('click', function(e){
  var a = e.target.closest && e.target.closest('a[data-tg], a[data-channel]');
  if(!a || /^https?:/.test(a.getAttribute('href') || '')) return;
  var url = a.hasAttribute('data-tg') ? tgUrl(a) : CHANNEL;
  external(a, url);
  e.preventDefault();
  window.open(url, '_blank', 'noopener');
}, true);

/* меню-лист */
var head = document.querySelector('.site-head');
var btn = head && head.querySelector('.menu-btn');
var nav = head && head.querySelector('.site-nav');
if(head && btn && nav){
  var scrim = head.querySelector('.menu-scrim');
  if(!scrim){ scrim = document.createElement('div'); scrim.className = 'menu-scrim'; head.appendChild(scrim); }
  function set(open){
    head.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Закрыть' : 'Меню';
    if(open){ var first = nav.querySelector('a'); if(first) first.focus({preventScroll:true}); }
  }
  btn.addEventListener('click', function(){ set(!head.classList.contains('is-open')); });
  scrim.addEventListener('click', function(){ set(false); });
  nav.addEventListener('click', function(e){ if(e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && head.classList.contains('is-open')){ set(false); btn.focus(); } });
  window.matchMedia('(min-width: 981px)').addEventListener('change', function(m){ if(m.matches) set(false); });
}

/* заглушки фото: на экране тихое пятно, текст атрибута — только в aria-label */
Array.prototype.forEach.call(document.querySelectorAll('[data-photo-placeholder]'), function(f){
  var t = f.getAttribute('data-photo-placeholder');
  if(!f.hasAttribute('role')) f.setAttribute('role', 'img');
  if(t && !f.hasAttribute('aria-label')) f.setAttribute('aria-label', t);
});

/* высота шапки → --head-h */
if(head){
  var setHeadH = function(){ document.documentElement.style.setProperty('--head-h', Math.round(head.getBoundingClientRect().height) + 'px'); };
  setHeadH();
  if(window.ResizeObserver){ try{ new ResizeObserver(setHeadH).observe(head); }catch(e){} }
  window.addEventListener('resize', setHeadH);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(setHeadH);
}

/* шапка при прокрутке: стекло после 80 px, прячется при прокрутке вниз */
if(head){
  var lastY = window.scrollY, ticking = false;
  function onScroll(){
    var y = window.scrollY;
    head.classList.toggle('is-glass', y > 80);
    if(!head.classList.contains('is-open')){
      if(y > lastY + 4 && y > 160) head.classList.add('is-hidden');
      else if(y < lastY - 4 || y <= 160) head.classList.remove('is-hidden');
    }
    document.documentElement.classList.toggle('head-hidden', head.classList.contains('is-hidden'));
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
  head.addEventListener('focusin', function(){ head.classList.remove('is-hidden'); });
  onScroll();
}
})();
