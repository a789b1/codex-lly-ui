import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {browserSession} from './browser.ts';
import {pageURL,VIEWPORTS,type Device} from './audit.ts';
import {Workspace} from './workspace.ts';
export type Step={action:'click'|'fill'|'key'|'waitFor'|'reload'|'assert';selector?:string;text?:string;key?:'Tab'|'Enter'|'Escape'|'Space';timeoutMs?:number;condition?:'visible'|'hidden'|'text'|'value'|'focused'|'count';count?:number;shift?:boolean};
export async function capture(w:Workspace,cwd:string,args:{target:string;out:string;device:Device;steps?:Step[];fullPage?:boolean},signal?:AbortSignal){
 const url=await pageURL(w,cwd,args.target);const out=await w.freshDirectory(cwd,args.out);
 const b=await browserSession(signal);const size=VIEWPORTS[args.device];const performed:any[]=[];let failure:string|undefined;
 try{
  await b.call('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:args.device==='mobile'});
  const nav=await b.call('Page.navigate',{url});if(nav.errorText)throw new Error(nav.errorText);await b.waitForLoad(nav.loaderId);
  await b.evaluate('document.fonts.ready.then(()=>true)');
  for(const step of args.steps||[]){
   try {
   if(step.action==='reload'){
    const nav=await b.call('Page.navigate',{url});if(nav.errorText)throw new Error(nav.errorText);await b.waitForLoad(nav.loaderId);
   }else if(step.action==='assert'){
    if(!step.selector||!step.condition)throw new Error('Assertion requires selector and condition');
    if(['text','value'].includes(step.condition)&&step.text===undefined)throw new Error('Assertion requires expected text');
    if(step.condition==='count'&&step.count===undefined)throw new Error('Count assertion requires count');
    const assertion=await b.evaluate(`new Promise(resolve=>{const end=Date.now()+${step.timeoutMs??3000};const check=()=>{const nodes=[...document.querySelectorAll(${JSON.stringify(step.selector)})];const visible=nodes.filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'});const e=visible[0];const condition=${JSON.stringify(step.condition)};const actual=condition==='count'?nodes.length:condition==='text'?e?.innerText:condition==='value'?e?.value:condition==='focused'?e===document.activeElement:visible.length;const pass=condition==='hidden'?visible.length===0:condition==='visible'?visible.length===1:condition==='count'?actual===${step.count??0}:condition==='focused'?visible.length===1&&actual===true:visible.length===1&&actual===${JSON.stringify(step.text??'')};if(pass||Date.now()>=end)resolve({pass,actual});else setTimeout(check,50)};check()})`);
    performed.push({...step,...assertion});if(!assertion.pass){failure='Assertion failed at step '+performed.length;break;}continue;
   }else if(step.action==='key'){
    if(!step.key)throw new Error('key is required for a keyboard step');
    const keys={Tab:{key:'Tab',code:'Tab',windowsVirtualKeyCode:9},Enter:{key:'Enter',code:'Enter',windowsVirtualKeyCode:13},Escape:{key:'Escape',code:'Escape',windowsVirtualKeyCode:27},Space:{key:' ',code:'Space',windowsVirtualKeyCode:32}};
    const key=keys[step.key||'Enter'];await b.call('Input.dispatchKeyEvent',{type:'keyDown',...key,modifiers:step.shift?8:0});await b.call('Input.dispatchKeyEvent',{type:'keyUp',...key,modifiers:step.shift?8:0});
   }else{
    if(!step.selector)throw new Error('Selector is required for '+step.action);
    const selector=JSON.stringify(step.selector);
    const locate=`(()=>{const nodes=[...document.querySelectorAll(${selector})].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'});if(nodes.length!==1)throw Error('Expected one visible target, found '+nodes.length);return nodes[0]})()`;
    if(step.action==='waitFor'){
     await b.evaluate(`new Promise((ok,no)=>{const end=Date.now()+${Math.min(step.timeoutMs||5000,20000)};const check=()=>{try{const e=${locate};ok(true)}catch{if(Date.now()>end)no(Error('Target did not appear'));else setTimeout(check,50)}};check()})`);
    }else{
     const point=await b.evaluate(`(()=>{const e=${locate};e.scrollIntoView({block:'center',inline:'center'});e.focus();const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
     if(step.action==='click'){
      await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
     }else{
      await b.evaluate(`(()=>{const e=${locate};if(!e.matches('input,textarea'))throw Error('Fill target must be an input or textarea');const setter=Object.getOwnPropertyDescriptor(e.tagName==='INPUT'?HTMLInputElement.prototype:HTMLTextAreaElement.prototype,'value').set;setter.call(e,${JSON.stringify(step.text||'')});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
     }
    }
   }
   performed.push({...step,pass:true});
   }catch(error){failure=String(error);performed.push({...step,pass:false,error:failure});break;}
  }
  await b.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');
  const params:Record<string,unknown>={format:'png',captureBeyondViewport:Boolean(args.fullPage)};
  if(args.fullPage){const {cssContentSize}=await b.call('Page.getLayoutMetrics');params.clip={x:0,y:0,width:Math.min(cssContentSize.width,16384),height:Math.min(cssContentSize.height,30000),scale:1};}
  const image=await b.call('Page.captureScreenshot',params);const screenshot=join(out,'capture.png');await writeFile(screenshot,Buffer.from(image.data,'base64'));
  const observed=await b.evaluate(`({title:document.title,url:location.href,text:document.body.innerText.slice(0,12000),activeElement:document.activeElement?.outerHTML.slice(0,500)})`);
  const result={schemaVersion:1,kind:'interaction',createdAt:new Date().toISOString(),ok:!failure,gate:failure||b.errors.length?'fail':performed.some(s=>s.action==='assert')?'pass':'review',failure,target:args.target,device:args.device,viewport:size,screenshot,steps:performed,observed,consoleErrors:[...b.errors],note:'Pass covers only explicit assertions. Reload stays in the isolated session; no backend success is inferred. Failure stops the flow and preserves screenshot and observations.'};
  await writeFile(join(out,'capture.json'),JSON.stringify(result,null,2));return result;
 }finally{await b.close();}
}
