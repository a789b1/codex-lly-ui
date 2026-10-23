import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserSession } from './browser.ts';
import { Workspace } from './workspace.ts';
export const VIEWPORTS = { desktop: {width:1440,height:900}, mobile: {width:390,height:844}, tablet: {width:768,height:1024} };
export type Device = keyof typeof VIEWPORTS;
const axePath = () => {
  const here=dirname(fileURLToPath(import.meta.url));
  return join(here, here.endsWith('server') ? 'axe.min.js' : '../node_modules/axe-core/axe.min.js');
};
export async function pageURL(w: Workspace, cwd: string, target: string): Promise<string> {
  if (/^https?:\/\//i.test(target)) {
    const u = new URL(target);
    if (u.username || u.password) throw new Error('Page URL must not include credentials');
    return u.href;
  }
  const file = await w.scopedPath(cwd, target);
  if (!(await lstat(file)).isFile()) throw new Error('Audit target must be an HTML file or HTTP(S) URL');
  const base = await w.preview(cwd);
  const { relative, sep } = await import('node:path');
  return base+'/'+relative(cwd,file).split(sep).map(encodeURIComponent).join('/');
}
// DOM observations are evidence, not a subjective visual score or a full WCAG certification.
const OBSERVE = `(() => {
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 const nodes=[...document.querySelectorAll('body *')].filter(visible);
 const count=(items)=>Object.entries(items.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([value,count])=>({value,count}));
 const styles=nodes.map(e=>getComputedStyle(e));
 const root=getComputedStyle(document.documentElement); const custom={};
 for(const k of root)if(k.startsWith('--'))custom[k]=root.getPropertyValue(k).trim();
 return { title:document.title, lang:document.documentElement.lang,
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   overflowElements:nodes.filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left < -1).slice(0,20).map(e=>({tag:e.tagName,id:e.id,className:String(e.className).slice(0,100)})),
   brokenImages:[...document.images].filter(e=>visible(e)&&e.complete&&e.naturalWidth===0).map(e=>({src:e.getAttribute('src'),alt:e.alt})),
   smallTargets:nodes.filter(e=>e.matches('button,a[href],input:not([type=hidden]),select,[role=button]')).filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24}).slice(0,30).map(e=>({tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,80)})),
   tokens:{custom,colors:count(styles.map(s=>s.color)),backgrounds:count(styles.map(s=>s.backgroundColor)),fontFamilies:count(styles.map(s=>s.fontFamily)),fontSizes:count(styles.map(s=>s.fontSize)),spacing:count(styles.flatMap(s=>[s.paddingTop,s.paddingRight,s.gap]).filter(x=>x!=='0px'&&x!=='normal'))},
   reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
   headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map(e=>({level:Number(e.tagName[1]),text:e.innerText.slice(0,160)}))};
})()`;
export async function audit(w: Workspace, cwd: string, args: {target:string;out:string;devices:Device[]}, signal?: AbortSignal) {
  const url = await pageURL(w,cwd,args.target);
  const output=await w.scopedPath(cwd,args.out); await mkdir(output,{recursive:true});
  // Immutable run folders prevent a second audit from silently destroying baseline evidence.
  const axe=await readFile(axePath(),'utf8'); const b=await browserSession(signal);
  const views: any[]=[];
  try {
    for(const device of args.devices){
      const size=VIEWPORTS[device];
      await b.call('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:device==='mobile'});
      await b.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      b.errors.length=0;
      const nav=await b.call('Page.navigate',{url}); if(nav.errorText)throw new Error(nav.errorText);
      await b.waitForLoad(nav.loaderId);
      await b.evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+20000;const check=()=>{if(document.readyState==='complete')resolve(true);else if(Date.now()>end)reject(Error('Page load timed out'));else setTimeout(check,50)};check()})`);
      const resourceState=await b.evaluate(`Promise.race([Promise.all([document.fonts.ready,...[...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))]).then(()=> 'settled'),new Promise(r=>setTimeout(()=>r('resource-timeout'),10000))])`);
      await b.evaluate(axe);
      const accessibility=await b.evaluate(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(r=>({violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.slice(0,30).map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,help:v.help,nodes:v.nodes.length})),passes:r.passes.length}))`);
      const dom=await b.evaluate(OBSERVE);
      const image=await b.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      const screenshot=join(output,device+'.png');await writeFile(screenshot,Buffer.from(image.data,'base64'));
      const blocking=accessibility.violations.filter((v:any)=>['critical','serious'].includes(v.impact)).length;
      views.push({device,...size,screenshot,accessibility,dom,consoleErrors:[...b.errors],resourceState,
        gate: blocking||dom.overflow||dom.brokenImages.length||b.errors.length||resourceState!=='settled' ? 'fail':'pass'});
    }
  } finally { await b.close(); }
  const result={schemaVersion:1,createdAt:new Date().toISOString(),target:args.target,views,gate:views.some(v=>v.gate==='fail')?'fail':'pass',
    limitations:['Automated checks do not certify WCAG compliance or judge visual quality.','Axe incomplete results require manual review.','Main user journeys, keyboard flow, authentication and persistence require separate interaction tests.','Reduced-motion is enabled for reproducible screenshots; animation requires a separate review.']};
  const report=join(output,'audit.json');await writeFile(report,JSON.stringify(result,null,2));
  return {...result,report};
}
