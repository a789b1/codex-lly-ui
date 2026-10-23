import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { Workspace } from './workspace.ts';
export const sha256=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
export async function loadAudit(w:Workspace,cwd:string,path:string) {
  const file=await w.scopedPath(cwd,path);const bytes=await readFile(file);
  const a=JSON.parse(bytes.toString('utf8'));
  if(a.schemaVersion!==1||!Array.isArray(a.views)||!a.views.length||!['pass','fail'].includes(a.gate))throw new Error('Expected an LLY audit report');
  for(const v of a.views)if(!['desktop','mobile','tablet'].includes(v.device)||!v.screenshot||!v.dom||!v.accessibility)throw new Error('Invalid audit viewport');
  return {a,file,bytes};
}
export async function baseline(w:Workspace,cwd:string,args:{action:'capture'|'compare';audit:string;baseline:string;maxChangedRatio?:number;pixelThreshold?:number;out?:string;overwrite?:boolean}) {
  const {a}=await loadAudit(w,cwd,args.audit);
  if(!args.baseline.endsWith('.json'))throw new Error('Baseline path must end in .json');
  const base=await w.scopedPath(cwd,args.baseline);
  if(args.action==='capture'){
    if(await stat(base).then(()=>true,()=>false)&&!args.overwrite)throw new Error('Baseline exists; set overwrite=true only when user approved replacing it');
    // Refuse existing directories and validate every source before any baseline write.
    const samples=await Promise.all(a.views.map(async(v:any)=>({v,path:await w.scopedPath(cwd,v.screenshot)})));
    for(const x of samples) PNG.sync.read(await readFile(x.path));
    const pictures=base.replace(/\.json$/,'')+'-images';await mkdir(pictures,{recursive:true});
    const views=[];
    for(const {v,path} of samples){const bytes=await readFile(path);const png=PNG.sync.read(bytes);const dest=await w.scopedPath(cwd,join(pictures,v.device+'.png'));await copyFile(path,dest);views.push({device:v.device,width:png.width,height:png.height,path:relative(cwd,dest),sha256:sha256(bytes)});}
    await mkdir(dirname(base),{recursive:true});
    const data={schemaVersion:1,target:a.target,createdAt:new Date().toISOString(),views};await writeFile(base,JSON.stringify(data,null,2));
    return {ok:true,action:'capture',baseline:base,views};
  }
  const reference=JSON.parse(await readFile(base,'utf8'));
  if(reference.schemaVersion!==1||!Array.isArray(reference.views)||reference.target!==a.target)throw new Error('Baseline target/schema differs from audit target');
  const max=args.maxChangedRatio??0.01;const threshold=args.pixelThreshold??0.1;
  if(max<0||max>1||threshold<0||threshold>1)throw new Error('Thresholds must be between 0 and 1');
  const out=await w.scopedPath(cwd,args.out||join(dirname(args.audit),'regression'));await mkdir(out,{recursive:true});
  const results=[];
  const names=new Set([...reference.views.map((v:any)=>v.device),...a.views.map((v:any)=>v.device)]);
  for(const device of names){
    const before=reference.views.find((v:any)=>v.device===device),after=a.views.find((v:any)=>v.device===device);
    if(!before||!after){results.push({device,gate:'fail',reason:'viewport-missing'});continue;}
    const bytes=await readFile(await w.scopedPath(cwd,before.path));
    if(sha256(bytes)!==before.sha256)throw new Error('Baseline integrity check failed');
    const one=PNG.sync.read(bytes),two=PNG.sync.read(await readFile(await w.scopedPath(cwd,after.screenshot)));
    if(one.width!==two.width||one.height!==two.height){results.push({device,gate:'fail',reason:'dimensions-changed'});continue;}
    const diff=new PNG({width:one.width,height:one.height});
    const changedPixels=pixelmatch(one.data,two.data,diff.data,one.width,one.height,{threshold});
    const ratio=changedPixels/(one.width*one.height);const diffPath=await w.scopedPath(cwd,join(out,String(device)+'-diff.png'));
    await writeFile(diffPath,PNG.sync.write(diff));results.push({device,changedPixels,changedRatio:ratio,maxChangedRatio:max,gate:ratio<=max?'pass':'fail',diff:diffPath});
  }
  const result={ok:true,action:'compare',gate:results.some(x=>x.gate==='fail')?'fail':'pass',results,note:'Pixel changes flag visual differences, not whether the design is better. Dynamic content may need a stable fixture.'};
  const report=join(out,'regression.json');await writeFile(report,JSON.stringify(result,null,2));return {...result,report};
}
const escape=(x:unknown)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function evidenceReport(w:Workspace,cwd:string,args:{audits:string[];out:string;title?:string}) {
  if(!args.audits.length)throw new Error('At least one real audit report is required');
  if(!/\.html?$/i.test(args.out))throw new Error('Report output must be HTML');
  const out=await w.scopedPath(cwd,args.out);await mkdir(dirname(out),{recursive:true});
  const records=[];const cards=[];
  for(const path of args.audits){
    const {a,file,bytes}=await loadAudit(w,cwd,path);records.push({path:relative(cwd,file),sha256:sha256(bytes),bytes:bytes.length});
    for(const v of a.views){
      const image=await w.scopedPath(cwd,v.screenshot);const png=await readFile(image);PNG.sync.read(png);
      records.push({path:relative(cwd,image),sha256:sha256(png),bytes:png.length});
      cards.push(`<article><div class="meta"><strong>${escape(a.target)}</strong><span>${escape(v.device)} · ${escape(v.width)} × ${escape(v.height)}</span><b class="${v.gate==='pass'?'pass':'fail'}">${escape(v.gate)}</b></div><img alt="${escape(v.device)} screenshot" src="data:image/png;base64,${png.toString('base64')}"><div class="details"><h2>Accessibility</h2><p>${v.accessibility.violations.length} automatic findings · ${v.accessibility.incomplete.length} rules need manual review</p>${v.accessibility.violations.map((x:any)=>`<details><summary>${escape(x.impact)} · ${escape(x.help)}</summary><pre>${escape(JSON.stringify(x.nodes,null,2))}</pre></details>`).join('')}<h2>Layout & runtime</h2><p>Overflow: ${escape(v.dom.overflow)} · Broken images: ${v.dom.brokenImages.length} · Console errors: ${v.consoleErrors.length}</p><h2>Observed design tokens</h2><pre>${escape(JSON.stringify(v.dom.tokens,null,2))}</pre></div></article>`);
    }
  }
  const title=escape(args.title||'LLY UI · Evidence review');
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;background:#eef4f5;color:#14343b;font:16px/1.6 system-ui,sans-serif}header{padding:48px 5vw;background:#123e45;color:#f9faf7}header small{letter-spacing:.14em;color:#a9d6ce}h1{font-size:clamp(28px,4vw,48px);line-height:1.15;margin:12px 0}header p{max-width:65ch;color:#d1e5e3}main{max-width:1600px;margin:auto;padding:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:24px}article{background:#fff;border:1px solid #d9dcd4;border-radius:12px;overflow:hidden;align-self:start}.meta{padding:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}.meta span{color:#626b60}.meta b{margin-left:auto;text-transform:uppercase;font-size:12px;padding:4px 10px;border-radius:20px}.pass{background:#e5f0df;color:#2b5d20}.fail{background:#ffe7dc;color:#923a1c}img{display:block;width:100%;height:auto;border-block:1px solid #e4e6df}.details{padding:24px}h2{font-size:18px;margin:24px 0 8px}details{padding:10px 0;border-bottom:1px solid #e5e6e0}summary{cursor:pointer;min-height:44px}summary:focus-visible{outline:3px solid #136b68;outline-offset:4px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 ui-monospace,monospace;background:#f0f5f5;padding:14px;max-height:360px;overflow:auto}footer{padding:24px 5vw;color:#626b60}a{color:inherit}</style><header><small>CODEX LLY UI / VERIFIED ARTIFACTS</small><h1>${title}</h1><p>Actual screenshots, automated accessibility checks and observed tokens. A passing gate is not a visual quality score or a full accessibility certification.</p></header><main>${cards.join('')}</main><footer>Created ${escape(new Date().toISOString())}. Manual journey and keyboard review remain required. SHA-256 evidence inventory is saved alongside this report.</footer></html>`;
  await writeFile(out,html);
  const manifest=out.replace(/\.html?$/,'')+'.evidence.json';await writeFile(manifest,JSON.stringify({schemaVersion:1,files:records,report:{path:relative(cwd,out),sha256:sha256(Buffer.from(html))}},null,2));
  return {ok:true,report:out,manifest,artifacts:records.length,previewURL:(await w.preview(cwd))+'/'+relative(cwd,out).split('/').map(encodeURIComponent).join('/')};
}
