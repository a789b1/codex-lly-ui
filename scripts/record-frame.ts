// Record real browser frames and encode with the browser's built-in WebM encoder.
// No generated frames, interpolation, or re-staged HTML is used.
import {browserSession} from '../src/browser.ts';
import {mkdir,writeFile} from 'node:fs/promises';
const out='demo/frame/evidence/motion';await mkdir(out,{recursive:true});
const b=await browserSession();const frames:{time:number,data:string}[]=[];
try{
 await b.call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 const nav=await b.call('Page.navigate',{url:'http://127.0.0.1:4175/'});await b.waitForLoad(nav.loaderId);
 await b.evaluate(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`);
 const start=Date.now();let lastAction=-1;
 while(Date.now()-start<6500){
  const elapsed=Date.now()-start;const phase=Math.floor(elapsed/1100);
  if(phase!==lastAction){lastAction=phase;const selector=['#pick','#next','#pick','#expand','#close-lightbox','#view-toggle'][phase];if(selector){const r=await b.evaluate(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});}}
  const shot=await b.call('Page.captureScreenshot',{format:'jpeg',quality:75});frames.push({time:Date.now()-start,data:shot.data});await new Promise(r=>setTimeout(r,70));
 }
 await b.call('Page.navigate',{url:'about:blank'});
 await b.evaluate(`window.framesToEncode=${JSON.stringify(frames)};true`);
 const base64=await b.evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=900;document.body.append(canvas);const ctx=canvas.getContext('2d');const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';const recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:mime,videoBitsPerSecond:2500000});const chunks=[];const done=new Promise(resolve=>recorder.onstop=async()=>{const blob=new Blob(chunks,{type:mime});const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob)});recorder.ondataavailable=e=>chunks.push(e.data);const images=await Promise.all(window.framesToEncode.map(f=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.src='data:image/jpeg;base64,'+f.data})));recorder.start();let last=window.framesToEncode[0].time;for(let i=0;i<images.length;i++){const f=window.framesToEncode[i];await new Promise(r=>setTimeout(r,Math.max(0,f.time-last)));ctx.drawImage(images[i],0,0);last=f.time;}await new Promise(r=>setTimeout(r,250));recorder.stop();return done;})()`);
 await writeFile(out+'/real-interaction.webm',Buffer.from(base64,'base64'));
 await writeFile(out+'/recording.json',JSON.stringify({source:'Live local page, actual CDP pointer input and screenshots',encodedBy:'Chromium MediaRecorder VP9; no ffmpeg required',frameCount:frames.length,durationMs:frames.at(-1)!.time,actions:['加入潮线','下一张','加入山脊','放大','关闭','总览'],frameTimes:frames.map(f=>f.time)},null,2));
 console.log({frames:frames.length,file:out+'/real-interaction.webm'});
}finally{await b.close();}
