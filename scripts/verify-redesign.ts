import {CodexRuntime} from '../src/runtime.ts';
import {resolve} from 'node:path';
const r=new CodexRuntime();const cwd=resolve('demo/workbench-next');const run='evidence/acceptance';
try{
 for(const device of ['desktop','mobile']){
 const x=await r.invoke('lly_ui_capture',{cwd,target:'index.html',out:run+'/'+device,device,steps:[
 {action:'assert',selector:'#focus-project h2',condition:'text',text:'拾光咖啡'},
 {action:'click',selector:'#focus-project [data-project]'},
 {action:'assert',selector:'#detail-title',condition:'text',text:'拾光咖啡 · 品牌焕新'},
 {action:'click',selector:'#advance-project'},
 {action:'assert',selector:'#focus-project h2',condition:'text',text:'禾野'},
 {action:'reload'},
 {action:'assert',selector:'#focus-project h2',condition:'text',text:'禾野'},
 {action:'click',selector:'#new-project'},
 {action:'click',selector:'#save-project'},
 {action:'assert',selector:'#form-error',condition:'visible'},
 {action:'assert',selector:'#project-name',condition:'focused'},
 {action:'fill',selector:'#project-name',text:'新版序间交付实测'},
 {action:'fill',selector:'#client-name',text:'序间工作室'},
 {action:'click',selector:'#save-project'},
 {action:'assert',selector:'#project-dialog',condition:'hidden'},
 {action:'reload'},
 {action:'fill',selector:'#search',text:'新版序间交付实测'},
 {action:'assert',selector:'.project-card h3',condition:'text',text:'新版序间交付实测'},
 {action:'fill',selector:'#search',text:'不存在的项目'},
 {action:'assert',selector:'#empty-state',condition:'visible'},
 {action:'click',selector:'#clear-filters'},
 {action:'assert',selector:'.project-card',condition:'count',count:5}
 ]});console.log(device,x.gate,x.failure||'');if(x.gate!=='pass')throw Error('Journey failed');
 }
 const a=await r.invoke('lly_ui_audit',{cwd,target:'index.html',out:run+'/audit',devices:['desktop','mobile','tablet']});
 console.log('audit',a.gate,a.views.map((v:any)=>({device:v.device,gate:v.gate,violations:v.accessibility.violations.map((x:any)=>x.id),incomplete:v.accessibility.incomplete})));
 const report=await r.invoke('lly_ui_report',{cwd,audits:[run+'/audit/audit.json'],interactions:[run+'/desktop/capture.json',run+'/mobile/capture.json'],out:'acceptance-report.html',title:'序间 · 创作交接台验收'});
 console.log(report.report);
}finally{await r.dispose();}
