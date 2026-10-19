'use strict';
const events=[{id:1,title:'Керамика: руки в деле',description:'Лепим первую чашку и отпускаем перфекционизм.',date:'24 ОКТ · СБ · 15:00',category:'creative',tag:'Творчество',format:'offline',price:2000,art:'create',label:'лепи<br>своё.',symbol:'◉'},{id:2,title:'Вечер новых знакомств',description:'Настолки, чай и разговоры обо всём.',date:'25 ОКТ · ВС · 18:00',category:'meet',tag:'Встречи',format:'offline',price:0,art:'talk',label:'привет,<br>свои.',symbol:'☺'},{id:3,title:'От идеи к своему проекту',description:'Разбираем идеи и находим первый шаг.',date:'28 ОКТ · СР · 19:00',category:'learn',tag:'Развитие',format:'online',price:0,art:'learn',label:'а что,<br>если?',symbol:'✳'}];
const $=s=>document.querySelector(s);let category='all';const free=$('#free-only');const search=$('#search');
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
const preferences=read('teplo-preferences',{});free.checked=!!preferences.free;const initialFormat=['all','offline','online'].includes(preferences.format)?preferences.format:'all';document.querySelector(`input[name="format"][value="${initialFormat}"]`).checked=true;
function render(animate = true){const format=$('input[name="format"]:checked').value;const q=search.value.trim().toLocaleLowerCase('ru');const filtered=events.filter(e=>(category==='all'||e.category===category)&&(!free.checked||e.price===0)&&(format==='all'||e.format===format)&&(`${e.title} ${e.description} ${e.tag} ${e.format==='online'?'онлайн':'вживую'}`.toLocaleLowerCase('ru').includes(q)));const markup=filtered.map(e=>`<article class="event-card" data-card-id="${e.id}"><div class="event-art art-${e.art}"><span class="event-tag">${e.tag}</span><div class="art-title">${e.label}</div><span class="art-drawing" aria-hidden="true">${e.symbol}</span></div><div class="event-info"><div class="event-meta">${e.date}</div><h3>${e.title}</h3><p>${e.description}</p><div class="event-card-bottom"><span>${e.price?e.price.toLocaleString('ru')+' ₸':'Бесплатно'} · ${e.format==='online'?'Онлайн':'Вживую'}</span><button class="round-button" data-event="${e.id}" aria-label="Записаться: ${e.title}">↗</button></div></div></article>`).join('');updateEventGrid(markup, filtered.length, animate);save('teplo-preferences',{free:free.checked,format});}
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const eventSection = $('#events');
const eventGrid = $('#event-grid');
let gridRevision = 0;
let eventsVisible = false;
const runningAnimations = new Set();
function motion(element, frames, options) {
  if (motionPreference.matches || !element.animate) return null;
  const animation = element.animate(frames, options);
  runningAnimations.add(animation);
  animation.finished.catch(() => {}).finally(() => runningAnimations.delete(animation));
  return animation;
}
function enterCards() {
  eventGrid.querySelectorAll('.event-card').forEach((card, index) => {
    motion(card, [{opacity:0, transform:'translateY(22px) scale(.97)'}, {opacity:1, transform:'translateY(0) scale(1)'}],
      {duration:460, delay:index*75, easing:'cubic-bezier(.2,.75,.25,1)'});
  });
}
async function updateEventGrid(markup, count, animate) {
  const revision = ++gridRevision;
  runningAnimations.forEach(animation => animation.cancel());
  const shouldAnimate = animate && eventsVisible && !motionPreference.matches;
  eventGrid.setAttribute('aria-busy', 'true');
  const oldHeight = eventGrid.getBoundingClientRect().height;
  const oldCards = [...eventGrid.querySelectorAll('.event-card')];
  if (shouldAnimate && oldCards.length) {
    const exits = oldCards.map(card => motion(card,
      [{opacity:1, transform:'translateY(0)'}, {opacity:0, transform:'translateY(-8px)'}],
      {duration:130, easing:'ease-in', fill:'forwards'}));
    await Promise.all(exits.filter(Boolean).map(animation => animation.finished.catch(() => {})));
  }
  if (revision !== gridRevision) return;
  runningAnimations.forEach(animation => animation.cancel());
  // Commit once, after the exit; rapid input always keeps the latest results.
  const focusWasInCards = eventGrid.contains(document.activeElement);
  eventGrid.innerHTML = markup;
  $('#empty').hidden = count > 0;
  $('#event-count').textContent = `Показано ${count} из ${events.length} событий`;
  eventGrid.setAttribute('aria-busy', 'false');
  if (shouldAnimate) {
    if (count) {
      const newHeight = eventGrid.getBoundingClientRect().height;
      if (oldHeight && newHeight && Math.abs(oldHeight-newHeight)>1) {
        motion(eventGrid, [{height:oldHeight+'px'}, {height:newHeight+'px'}], {duration:330,easing:'cubic-bezier(.2,.75,.25,1)'});
      }
      enterCards();
    } else {
      motion($('#empty'), [{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'translateY(0)'}], {duration:240,easing:'ease-out'});
    }
  }
  if (focusWasInCards) search.focus({preventScroll:true});
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    eventsVisible = true;
    [eventSection.querySelector('.section-head'), eventSection.querySelector('.event-toolbar')].forEach((el, index) => {
      motion(el, [{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}], {duration:500,delay:index*80,easing:'ease-out'});
    });
    enterCards();
    observer.disconnect();
  }, {threshold:.12});
  observer.observe(eventSection);
} else eventsVisible = true;
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) runningAnimations.forEach(animation => animation.cancel());
});
eventGrid.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || motionPreference.matches) return;
  const card = e.target.closest('.event-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--art-shift', ((e.clientX-rect.left)/rect.width-.5)*12+'deg');
});
eventGrid.addEventListener('pointerout', e => {
  const card = e.target.closest('.event-card');
  if (card && !card.contains(e.relatedTarget)) card.style.removeProperty('--art-shift');
});
eventSection.addEventListener('pointerdown', e => {
  const button = e.target.closest('button');
  if (!button || motionPreference.matches) return;
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className='button-ripple';
  ripple.setAttribute('aria-hidden','true');
  ripple.style.left=(e.clientX-rect.left)+'px';
  ripple.style.top=(e.clientY-rect.top)+'px';
  button.append(ripple);
  const animation = motion(ripple,[{transform:'translate(-50%,-50%) scale(0)',opacity:.25},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:480,easing:'ease-out'});
  if (animation) animation.finished.catch(()=>{}).finally(()=>ripple.remove());
  else ripple.remove();
});
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});render()}));search.addEventListener('input',render);free.addEventListener('change',render);document.querySelectorAll('[name="format"]').forEach(x=>x.addEventListener('change',render));$('#reset').addEventListener('click',()=>{category='all';search.value='';free.checked=false;$('[name="format"][value="all"]').checked=true;document.querySelectorAll('.filter').forEach(x=>{const active=x.dataset.category==='all';x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});render()});render(false);
let selectedEvent='';const joinDialog=$('#join-dialog');function openJoin(title){selectedEvent=title;$('#join-event').textContent=title;$('#join-form').hidden=false;$('#join-form').reset();$('#join-status').textContent='';joinDialog.showModal()}
document.addEventListener('click',e=>{const join=e.target.closest('[data-join]');if(join)openJoin(join.dataset.join);const event=e.target.closest('[data-event]');if(event)openJoin(events.find(x=>x.id===Number(event.dataset.event)).title);const image=e.target.closest('[data-image]');if(image){$('#large-image').src=image.dataset.image;$('#large-image').alt=image.querySelector('img').alt;$('#large-caption').textContent=image.dataset.caption;$('#image-dialog').showModal()}});
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
$('#join-form').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const ok=save('teplo-last-application',{...data,event:selectedEvent,date:new Date().toISOString()});$('#join-status').textContent=ok?'Готово! Демозаявка сохранена на этом устройстве. Организатору она не отправлялась.':'Браузер не разрешил сохранение. Попробуй разрешить локальное хранение данных.';if(ok)e.target.hidden=true});
$('#feedback').addEventListener('submit',e=>{e.preventDefault();const ok=save('teplo-feedback',{...Object.fromEntries(new FormData(e.target)),date:new Date().toISOString()});$('#feedback-status').textContent=ok?'Сообщение сохранено на этом устройстве. Спасибо за твою идею!':'Не получилось сохранить: локальное хранение данных недоступно.';if(ok)e.target.reset()});
const menuButton=$('.menu-button');menuButton.addEventListener('click',()=>{const open=$('#menu').classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню')});document.querySelectorAll('#menu a').forEach(a=>a.addEventListener('click',()=>{$('#menu').classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');document.querySelectorAll('#menu a').forEach(x=>x.classList.toggle('active',x===a))}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#menu').classList.remove('open');menuButton.setAttribute('aria-expanded','false')}});
