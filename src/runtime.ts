import {isAbsolute} from 'node:path';
import {realpath,stat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Ajv} from 'ajv';
import {Workspace} from './workspace.ts';
import {findBrowser} from './chrome.ts';
import {audit,type Device} from './audit.ts';
import {capture} from './capture.ts';
import {baseline,evidenceReport} from './evidence.ts';
import {designBrief,exploration} from './exploration.ts';
import {assetRecord} from './assets.ts';
const str={type:'string',minLength:1,maxLength:12000};
const device={type:'string',enum:['desktop','mobile','tablet']};
const obj=(properties:Record<string,unknown>,required:string[]=[])=>({type:'object',additionalProperties:false,properties,required});
const contract=(properties:Record<string,unknown>,required:string[]=[])=>obj({cwd:{...str,description:'Absolute user workspace path, never the plugin installation directory'},...properties},['cwd',...required]);
const direction=obj({name:str,layout:str,typography:str,color:str,taskFit:str,tradeoff:str,mobileStrategy:str},['name','layout','typography','color']);
const schemas={
 lly_ui_status:contract({}),
 lly_ui_brief:contract({goal:str,audience:str,primaryAction:str,constraints:{type:'array',items:str,maxItems:30},qualityCriteria:{type:'array',items:str,minItems:1,maxItems:12},directions:{type:'array',items:direction,minItems:1,maxItems:4},out:str},['goal','audience','primaryAction','directions']),
 lly_ui_explorer:contract({candidates:{type:'array',minItems:2,maxItems:4,items:obj({name:str,path:str,reason:str},['name','path','reason'])},device,out:str},['candidates']),
 lly_ui_capture:contract({target:str,out:str,device,fullPage:{type:'boolean'},steps:{type:'array',maxItems:40,items:obj({action:{type:'string',enum:['click','fill','key','waitFor','reload','assert']},condition:{type:'string',enum:['visible','hidden','text','value','focused','count']},count:{type:'integer',minimum:0},shift:{type:'boolean'},selector:str,text:{type:'string',maxLength:12000},key:{type:'string',enum:['Tab','Enter','Escape','Space']},timeoutMs:{type:'integer',minimum:1,maximum:20000}},['action'])}},['target']),
 lly_ui_audit:contract({target:str,out:str,devices:{type:'array',items:device,minItems:1,maxItems:3,uniqueItems:true}},['target']),
 lly_ui_baseline:contract({action:{type:'string',enum:['capture','compare']},audit:str,baseline:str,maxChangedRatio:{type:'number',minimum:0,maximum:1},pixelThreshold:{type:'number',minimum:0,maximum:1},out:str,overwrite:{type:'boolean'}},['action','audit','baseline']),
 lly_ui_report:contract({audits:{type:'array',items:str,minItems:1,maxItems:20},out:str,title:str,interactions:{type:'array',items:str,maxItems:20}},['audits']),
 lly_ui_assets:contract({file:str,sourceURL:str,license:str,attribution:str,out:str},['file','sourceURL','license','attribution'])
};
const descriptions:Record<keyof typeof schemas,string>={
 lly_ui_status:'Read-only local readiness check. Reports actual browser and Node availability; no network, updates or credential access.',
 lly_ui_brief:'Record the designer-provided goal, audience, primary action, constraints and distinct direction cards. Validates structural alternatives and writes a new brief file.',
 lly_ui_explorer:'Render 2–4 local candidate pages into actual screenshots and build a standalone comparison with selection and actual-size inspection. Snapshot comparison, not an interactive prototype.',
 lly_ui_capture:'Operate a page through click/fill/key/waitFor/reload/assert steps (visible, hidden, exact text/value, focused, count); failed assertions stop and save evidence, capture a screenshot, and return observed DOM text and focus. Does not infer business success from a click.',
 lly_ui_audit:'Run axe accessibility checks and desktop/mobile/tablet screenshots, overflow, broken-image and runtime checks; extract observed design tokens. Automated evidence, not WCAG certification.',
 lly_ui_baseline:'Save an explicit accepted baseline or compare an audit against it using SHA-256 integrity checks, pixel diff PNGs and per-viewport thresholds. Replacing a baseline requires overwrite=true.',
 lly_ui_report:'Build an offline visual report from existing audits and screenshots with findings, tokens and SHA-256 inventory. Never fabricates manual-review results.',
 lly_ui_assets:'Record provenance, attribution, supplied license and hash for an existing asset. Does not download media or certify license claims; verify permission at the source.'
};
const ajv=new Ajv({allErrors:true,strict:true});const validators=Object.fromEntries(Object.entries(schemas).map(([k,v])=>[k,ajv.compile(v)]));
export const tools=Object.entries(schemas).map(([name,inputSchema])=>({name,inputSchema,description:descriptions[name as keyof typeof schemas],annotations:{readOnlyHint:name==='lly_ui_status',destructiveHint:name==='lly_ui_baseline'||name==='lly_ui_assets',openWorldHint:['lly_ui_audit','lly_ui_capture','lly_ui_explorer'].includes(name),idempotentHint:name==='lly_ui_status'}}));
export class CodexRuntime{
 readonly workspace=new Workspace();private queues=new Map<string,Promise<unknown>>();
 async invoke(name:string,input:unknown,signal?:AbortSignal):Promise<any>{
  const validate=validators[name];if(!validate)throw new Error('Unknown tool: '+name);
  if(!validate(input))throw new Error('Invalid arguments: '+ajv.errorsText(validate.errors));
  const a=input as Record<string,any>;if(!isAbsolute(a.cwd))throw new Error('cwd must be absolute');const cwd=await realpath(a.cwd);if(!(await stat(cwd)).isDirectory())throw new Error('cwd must be an existing directory');
  const result=(this.queues.get(cwd)||Promise.resolve()).catch(()=>{}).then(()=>{if(signal?.aborted)throw new Error('Tool invocation aborted');return this.execute(name,cwd,a,signal);});
  this.queues.set(cwd,result);try{return await result;}finally{if(this.queues.get(cwd)===result)this.queues.delete(cwd);}
 }
 private async execute(name:string,cwd:string,a:Record<string,any>,signal?:AbortSignal){
  const run=()=>`lly-evidence/${Date.now()}-${randomUUID().slice(0,8)}`;
  switch(name){
   case 'lly_ui_status':return {ok:true,plugin:'codex-lly-ui',version:'0.6.0',node:process.version,cwd,browser:findBrowser(),readyForAudit:Boolean(findBrowser()),tools:tools.map(t=>t.name),imageGeneration:'Use the Codex native image tool; this plugin does not access image-service credentials or payment APIs.'};
   case 'lly_ui_brief':return designBrief(this.workspace,cwd,{...a,constraints:a.constraints||[],out:a.out||'lly-design-brief.json'} as any);
   case 'lly_ui_explorer':return exploration(this.workspace,cwd,{...a,out:a.out||run(),device:a.device||'desktop'} as any,signal);
   case 'lly_ui_capture':return capture(this.workspace,cwd,{...a,out:a.out||run(),device:a.device||'desktop'} as any,signal);
   case 'lly_ui_audit':{const out=a.out||run();await this.workspace.freshDirectory(cwd,out);return audit(this.workspace,cwd,{target:a.target,out,devices:a.devices||['desktop','mobile'] as Device[]},signal);}
   case 'lly_ui_baseline':return baseline(this.workspace,cwd,a as any);
   case 'lly_ui_report':return evidenceReport(this.workspace,cwd,{audits:a.audits,out:a.out||`lly-review-${Date.now()}.html`,title:a.title,interactions:a.interactions});
   case 'lly_ui_assets':return assetRecord(this.workspace,cwd,{...a,out:a.out||'lly-assets.json'} as any);
  }
 }
 async dispose(){await this.workspace.dispose();}
}
