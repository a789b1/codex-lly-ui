import {browserSession} from '../src/browser.ts';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve('demo/frame/evidence/recovery');await mkdir(out,{recursive:true});
const results:any[]=[];
for(let run=1;run<=3;run++){
 const b=await browserSession();const checks:string[]=[];
 const check=async(name:string,expression:string)=>{if(!await b.evaluate(expression))throw Error(name);checks.push(name);};
 const click=async(selector:string)=>{const r=await b.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});};
 try{
  await b.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const nav=await b.call('Page.navigate',{url:'http://127.0.0.1:4175/'});await b.waitForLoad(nav.loaderId);
  await check('fresh state has no selection',`document.querySelector('#selected-count').textContent==='0'`);
  await b.evaluate(`window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Injected test failure','QuotaExceededError')}`);
  await click('#pick');
  await check('failed selection is not presented as saved',`!document.querySelector('#save-error').hidden && document.querySelector('#selected-count').textContent==='0'`);
  await b.evaluate(`Storage.prototype.setItem=window.originalSetItem`);await click('#retry');
  await check('retry persists selected photo',`JSON.parse(localStorage.getItem('frame-selection-v1')).selected[0]==='IS-001' && document.querySelector('#selected-count').textContent==='1'`);
  await click('#note');await b.call('Input.insertText',{text:'保留倒影的完整构图'});
  await b.evaluate(`Storage.prototype.setItem=function(){throw new DOMException('Injected test failure','QuotaExceededError')}`);await click('#save-note');
  await check('failed note remains in input and not storage',`document.querySelector('#note').value==='保留倒影的完整构图' && !JSON.parse(localStorage.getItem('frame-selection-v1')).notes['IS-001']`);
  if(run===1){const s=await b.call('Page.captureScreenshot',{format:'png'});await writeFile(out+'/save-failure.png',Buffer.from(s.data,'base64'));}
  await b.evaluate(`Storage.prototype.setItem=window.originalSetItem`);await click('#retry');
  await b.call('Page.reload');await b.evaluate(`new Promise(resolve=>{const check=()=>document.readyState==='complete'&&document.querySelector('#note')?resolve(true):setTimeout(check,30);check()})`);
  await check('reload restores note and selection',`document.querySelector('#note').value==='保留倒影的完整构图' && document.querySelector('#selected-count').textContent==='1'`);
  await click('#note');await b.call('Input.insertText',{text:'；准备横版'});
  await click('#next');await click('#previous');
  await check('unsaved note survives photo switching',`document.querySelector('#note').value.includes('准备横版') && document.querySelector('#note-state').textContent==='未保存'`);
  await click('#export');await check('export blocks unsaved selected note',`document.querySelector('#toast').textContent.includes('未保存笔记')`);
  await click('#save-note');
  await b.evaluate(`window.lastExport=null;window.originalObjectURL=URL.createObjectURL;URL.createObjectURL=function(blob){blob.text().then(text=>window.lastExport=JSON.parse(text));return window.originalObjectURL(blob)}`);
  await click('#export');await b.evaluate(`new Promise(resolve=>{const check=()=>window.lastExport?resolve(true):setTimeout(check,20);check()})`);
  await check('export contains real IDs note and licenses',`window.lastExport.count===1 && window.lastExport.photos[0].id==='IS-001' && window.lastExport.photos[0].note.includes('准备横版') && window.lastExport.photos[0].license==='CC BY 4.0'`);
  if(run===1)await writeFile(out+'/export.json',JSON.stringify(await b.evaluate('window.lastExport'),null,2));
  await b.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await b.evaluate(`document.querySelector('[data-photo="IS-002"]').scrollIntoView();document.querySelector('[data-photo="IS-002"]').focus({preventScroll:true})`);await click('[data-photo="IS-002"]');
  await b.evaluate(`new Promise(resolve=>{const start=Date.now();const check=()=>Math.abs(document.querySelector('.viewer').getBoundingClientRect().top)<5||Date.now()-start>2000?resolve(true):setTimeout(check,30);check()})`);
  await check('mobile thumbnail returns to visible full image',`document.querySelector('#photo-title').textContent==='山脊' && document.querySelector('.viewer').getBoundingClientRect().top>=-5 && document.querySelector('.viewer').getBoundingClientRect().bottom<845`);
  await check('mobile layout has no horizontal overflow',`document.documentElement.scrollWidth<=390`);
  if(run===1){const s=await b.call('Page.captureScreenshot',{format:'png'});await writeFile(out+'/mobile-return.png',Buffer.from(s.data,'base64'));}
  results.push({run,pass:true,checks,consoleErrors:b.errors});
 }finally{await b.close();}
}
await writeFile(out+'/verification.json',JSON.stringify({createdAt:new Date().toISOString(),method:'Isolated Chrome; CDP pointer/typing; injected localStorage write failure; actual export Blob inspected',results},null,2));
console.log(results.map(r=>({run:r.run,checks:r.checks.length,pass:r.pass})));
