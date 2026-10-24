(() => {
'use strict';
const photos = window.FRAME_PHOTOS;
const $ = id => document.getElementById(id);
const KEY = 'frame-selection-v1';
const ids = new Set(photos.map(p => p.id));
let state = {version:1, selected:[], notes:{}};
let active = photos[0].id, scope = 'all', view = 'single', pending = null, toastTimer;
const drafts = {};
function showError(message, retry) { $('error-text').textContent = message; $('save-error').hidden = false; $('retry').hidden = !retry; pending = retry; $('save-status').textContent = '更改尚未保存'; }
try {
 const raw = localStorage.getItem(KEY);
 if(raw) { const parsed = JSON.parse(raw); if(parsed.version !== 1 || !Array.isArray(parsed.selected) || !parsed.selected.every(id => ids.has(id)) || !parsed.notes || typeof parsed.notes !== 'object' || Array.isArray(parsed.notes) || !Object.entries(parsed.notes).every(([id,n]) => ids.has(id) && typeof n === 'string' && n.length <= 300)) throw new Error('invalid'); state = parsed; }
} catch { showError('无法读取上次的选片记录。当前显示全部照片，已有记录不会被自动覆盖。', null); }
function save(next, success) {
 try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; pending = null; $('save-error').hidden = true; $('save-status').textContent = '已保存到此浏览器'; success?.(); return true; }
 catch { showError('保存失败，更改尚未生效；笔记输入已保留。请允许浏览器存储后重试。', () => save(next, success)); return false; }
}
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => {$('toast').hidden = true;}, 2600); }
function visible() {
 const query = $('search').value.trim().toLocaleLowerCase(); const category = $('category').value;
 return photos.filter(p => (scope === 'all' || state.selected.includes(p.id)) && (category === 'all' || p.category === category) && (!query || (p.title+' '+p.id+' '+p.author).toLocaleLowerCase().includes(query)));
}
function current() {return photos.find(p=>p.id===active);}
function img(p, className='') {const el = document.createElement('img');el.src=p.file;el.alt=p.title;el.className=className;el.loading='eager';return el;}
function setPhoto(id) {const fromThumb = document.activeElement?.classList.contains('thumb-open'); active=id;render(); if(fromThumb) {document.querySelector(`[data-photo="${id}"]`)?.focus({preventScroll:true}); if(matchMedia('(max-width:1000px)').matches) document.querySelector('.viewer').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}}
function togglePick(id) {
 const adding = !state.selected.includes(id);
 const next = {...state, selected:adding ? [...state.selected,id] : state.selected.filter(x=>x!==id)};
 save(next, () => {render(); document.querySelector(`[data-frame="${id}"]`)?.classList.add('just-picked'); toast(adding ? '已加入选片' : '已移出选片');});
}
function render() {
 const items = visible(); if(items.length && !items.some(p=>p.id===active)) active=items[0].id;
 $('selected-count').textContent=state.selected.length;
 $('export').disabled=state.selected.length===0;
 for(const [id,on] of [['all-tab',scope==='all'],['selected-tab',scope==='selected']]) {$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',String(on));}
 $('stage').hidden = !items.length || view==='grid';$('grid-view').hidden=!items.length || view!=='grid';$('empty').hidden=items.length>0;$('filmstrip').hidden=!items.length || view==='grid';
 $('view-toggle').setAttribute('aria-pressed',String(view==='grid'));$('view-toggle').innerHTML=view==='grid' ? '<span aria-hidden="true">▣</span> 单张' : '<span aria-hidden="true">▦</span> 总览';
 $('empty-title').textContent = scope==='selected' && state.selected.length===0 ? '还没有入选照片' : '没有匹配的照片';
 $('empty-copy').textContent = scope==='selected' && state.selected.length===0 ? '回到全部照片，找到值得留下的那一帧。' : '换个关键词，或清除筛选继续浏览。';
 if(items.length) renderCurrent(items);
 $('visible-count').textContent=items.length+' 张';
 $('thumbnails').replaceChildren();$('grid-view').replaceChildren();
 for(const p of items){
  const picked=state.selected.includes(p.id);
  const frame=document.createElement('div');frame.className='frame';frame.dataset.frame=p.id;
  const button=document.createElement('button');button.className='thumb-open'+(p.id===active?' current':'');button.setAttribute('aria-label','查看 '+p.title);button.setAttribute('aria-pressed',String(p.id===active));button.dataset.photo=p.id;button.append(img(p));button.onclick=()=>setPhoto(p.id);frame.append(button);
  if(picked){const check=document.createElement('span');check.className='selected-mark';check.textContent='✓';check.setAttribute('aria-label','已入选');frame.append(check);}
  const caption=document.createElement('div');caption.className='thumb-caption';const name=document.createElement('span');name.textContent=p.title;const number=document.createElement('small');number.textContent=p.id;caption.append(name,number);frame.append(caption);$('thumbnails').append(frame);
  const card=document.createElement('article');card.className='grid-photo';
  const open=document.createElement('button');open.className='grid-open';open.setAttribute('aria-label','检视 '+p.title);open.append(img(p));open.onclick=()=>{view='single';setPhoto(p.id);$('image-open').focus();};
  const row=document.createElement('div');row.className='grid-caption';const title=document.createElement('h2');title.textContent=p.title;const id=document.createElement('small');id.textContent=p.id;title.append(id);
  const pick=document.createElement('button');pick.className='grid-pick';pick.dataset.pick=p.id;pick.setAttribute('aria-pressed',String(picked));pick.setAttribute('aria-label',(picked?'移出':'入选')+' '+p.title);pick.textContent=picked?'✓ 已入选':'＋ 入选';pick.onclick=()=>{togglePick(p.id);document.querySelector(`[data-pick="${p.id}"]`)?.focus();};row.append(title,pick);card.append(open,row);$('grid-view').append(card);
 }
 if($('lightbox').open) renderLightbox(items);
}
function renderCurrent(items){
 const p=current();const position=items.findIndex(x=>x.id===p.id);
 if($('hero').getAttribute('src')!==p.file) $('hero').src=p.file;
 $('hero').alt=p.title+'，'+p.category+'摄影';$('image-open').setAttribute('aria-label','放大查看 '+p.title);
 $('photo-title').textContent=p.title;$('photo-id').textContent=p.id;$('category-label').textContent=p.category;$('photo-description').textContent=p.description;
 $('photo-author').textContent=p.author;$('photo-dimensions').textContent=p.originalWidth+' × '+p.originalHeight;
 $('photo-license').textContent=p.license+' ↗';$('photo-license').href=p.licenseUrl;$('photo-source').href=p.source;
 $('image-position').textContent=String(position+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
 $('previous').disabled=position===0;$('next').disabled=position===items.length-1;
 const picked=state.selected.includes(p.id);$('pick').setAttribute('aria-pressed',String(picked));$('pick-text').textContent=picked?'✓ 已入选 · 点击移出':'＋ 加入选片';$('pick-state').textContent=picked?'已加入你的选片清单':'尚未入选';
 $('note').value=drafts[p.id] ?? state.notes[p.id] ?? '';updateNoteState();
}
function updateNoteState(){const p=current();const value=$('note').value;const dirty=value!==(state.notes[p.id]??'');$('note-state').textContent=dirty?'未保存':state.notes[p.id]?'已保存':'';$('save-note').disabled=!dirty;}
function move(direction){const list=visible();const index=list.findIndex(p=>p.id===active);const dest=index+direction;if(dest>=0 && dest<list.length)setPhoto(list[dest].id);}
function renderLightbox(list=visible()){const p=current();const index=list.findIndex(x=>x.id===active);$('lightbox-title').textContent=p.title+' · '+p.id;$('lightbox-image').src=p.file;$('lightbox-image').alt=p.title+'，完整摄影';$('lightbox-count').textContent=`${index+1} / ${list.length}`;$('lightbox-prev').disabled=index===0;$('lightbox-next').disabled=index===list.length-1;}
function openLightbox(){if(!visible().length)return;renderLightbox();$('lightbox').showModal();}
$('all-tab').onclick=()=>{scope='all';render();};$('selected-tab').onclick=()=>{scope='selected';render();};
$('search').oninput=render;$('category').onchange=render;$('view-toggle').onclick=()=>{view=view==='single'?'grid':'single';render();};
$('reset-filters').onclick=()=>{scope='all';$('search').value='';$('category').value='all';render();$('all-tab').focus();};
$('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);$('pick').onclick=()=>togglePick(active);
$('expand').onclick=openLightbox;$('image-open').onclick=openLightbox;$('close-lightbox').onclick=()=>$('lightbox').close();$('lightbox-prev').onclick=()=>move(-1);$('lightbox-next').onclick=()=>move(1);
$('lightbox').addEventListener('click',e=>{if(e.target===$('lightbox') && (e.clientX<$('lightbox').getBoundingClientRect().left || e.clientX>$('lightbox').getBoundingClientRect().right))$('lightbox').close();});
$('note').oninput=()=>{drafts[active]=$('note').value;updateNoteState();};
$('note-form').onsubmit=e=>{e.preventDefault();const id=active;const value=$('note').value;const next={...state,notes:{...state.notes,[id]:value}};save(next,()=>{delete drafts[id];render();toast('笔记已保存');});};
$('retry').onclick=()=>pending?.();
$('export').onclick=()=>{
 const unsaved=state.selected.some(id=>drafts[id]!==undefined && drafts[id] !== (state.notes[id]??''));
 if(unsaved){toast('入选照片还有未保存笔记，请先保存后导出');return;}
 const selection=photos.filter(p=>state.selected.includes(p.id)).map(p=>({...p,note:state.notes[p.id]??''}));
 const result={app:'帧间 / FRAME',album:'冰岛 · 地貌观察',exportedAt:new Date().toISOString(),count:selection.length,photos:selection};
 const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='frame-iceland-selection.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast(`已导出 ${selection.length} 张照片的清单`);
};
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey || e.target.closest('input,textarea,select') || e.repeat)return;
 if($('lightbox').open){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}return;}
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}
 if(e.key.toLowerCase()==='p' && visible().length){e.preventDefault();togglePick(active);}
 if(e.key.toLowerCase()==='g'){e.preventDefault();view=view==='single'?'grid':'single';render();}
 if(e.code==='Space' && !e.target.closest('button,a')){e.preventDefault();openLightbox();}
});
const compact = matchMedia('(max-width:1000px)');
function setDetailsLayout(){ $('more-info').open = !compact.matches; }
compact.addEventListener('change', setDetailsLayout);setDetailsLayout();
render();
})();
