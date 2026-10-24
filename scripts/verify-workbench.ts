import {CodexRuntime} from '../src/runtime.ts';
import {resolve} from 'node:path';
const r=new CodexRuntime();const cwd=resolve('demo/workbench');const base='evidence/plugin-0.4.0-final';
try{
 for(const device of ['desktop','mobile']){
 const x=await r.invoke('lly_ui_capture',{cwd,target:'index.html',out:base+'/'+device,device,steps:[
 {action:'click',selector:'#new-project'},
 {action:'assert',selector:'#project-name',condition:'focused'},
 {action:'key',key:'Tab',shift:true},
 {action:'assert',selector:'#project-dialog .icon-button',condition:'focused'},
 {action:'key',key:'Tab',shift:true},
 {action:'assert',selector:'#save-project',condition:'focused'},
 {action:'fill',selector:'#project-name',text:'新版插件实测'},
 {action:'fill',selector:'#client-name',text:'LLY'},
 {action:'fill',selector:'#project-date',text:'2026-10-30'},
 {action:'click',selector:'#save-project'},
 {action:'assert',selector:'#project-dialog',condition:'hidden'},
 {action:'reload'},
 {action:'fill',selector:'#search',text:'新版插件实测'},
 {action:'assert',selector:'.project-card',condition:'count',count:1},
 {action:'assert',selector:'.project-card h3',condition:'text',text:'新版插件实测'}
 ]});console.log(device,x.gate,x.failure||'');
 if(x.gate!=='pass')throw Error('Real journey failed');
 }
 const a=await r.invoke('lly_ui_audit',{cwd,target:'index.html',out:base+'/audit',devices:['desktop','mobile','tablet']});
 console.log('audit',a.gate,a.views.map((v:any)=>({device:v.device,gate:v.gate,incomplete:v.accessibility.incomplete.length})));
 const report=await r.invoke('lly_ui_report',{cwd,audits:[base+'/audit/audit.json'],interactions:[base+'/desktop/capture.json',base+'/mobile/capture.json'],out:base+'/report.html',title:'序间 · 插件 0.4.0 实际验收'});
 console.log(report.report);
}finally{await r.dispose();}
