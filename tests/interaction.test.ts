import {it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CodexRuntime} from '../src/runtime.ts';
it('persists through reload, saves failed assertions, and includes both outcomes in reports',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'lly-browser-'));const r=new CodexRuntime();
 try{
 await writeFile(join(cwd,'index.html'),`<!doctype html><html lang="en"><title>Save</title><body><main><h1>Save</h1><label>Name<input id="name"></label><button id="save">Save</button><p id="result"></p></main><script>result.textContent=localStorage.getItem('name')||'';save.onclick=()=>{localStorage.setItem('name',document.querySelector('#name').value);result.textContent=document.querySelector('#name').value}</script></body></html>`);
 const success=await r.invoke('lly_ui_capture',{cwd,target:'index.html',out:'success',steps:[{action:'fill',selector:'#name',text:'Persisted'},{action:'click',selector:'#save'},{action:'reload'},{action:'assert',selector:'#result',condition:'text',text:'Persisted'}]});
 expect(success.gate).toBe('pass');
 const failed=await r.invoke('lly_ui_capture',{cwd,target:'index.html',out:'failed',steps:[{action:'assert',selector:'#result',condition:'text',text:'Wrong',timeoutMs:1},{action:'click',selector:'#save'}]});
 expect(failed.gate).toBe('fail');expect(failed.steps).toHaveLength(1);expect((await readFile(failed.screenshot)).length).toBeGreaterThan(100);
 const unverified=await r.invoke('lly_ui_capture',{cwd,target:'index.html',out:'unverified'});expect(unverified.gate).toBe('review');
 await r.invoke('lly_ui_audit',{cwd,target:'index.html',out:'audit',devices:['desktop']});
 const report=await r.invoke('lly_ui_report',{cwd,audits:['audit/audit.json'],interactions:['success/capture.json','failed/capture.json']});
 expect(await readFile(report.report,'utf8')).toContain('Assertion failed');
 }finally{await r.dispose();await rm(cwd,{recursive:true,force:true});}
},60000);
