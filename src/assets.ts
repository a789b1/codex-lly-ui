import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {dirname,relative} from 'node:path';
import {Workspace} from './workspace.ts';
import {sha256} from './evidence.ts';
/** Records supplied source/license claims. Does not invent permission or silently fetch media. */
export async function assetRecord(w:Workspace,cwd:string,a:{file:string;sourceURL:string;license:string;attribution:string;out:string}){
 const file=await w.scopedPath(cwd,a.file);if(!(await stat(file)).isFile())throw new Error('Asset must be an existing local file');
 const source=new URL(a.sourceURL);if(!['https:','http:'].includes(source.protocol)||source.username||source.password)throw new Error('Source must be an HTTP(S) URL without credentials');
 const bytes=await readFile(file);const out=await w.scopedPath(cwd,a.out);if(!out.endsWith('.json'))throw new Error('Asset inventory must be JSON');
 let records:any[]=[];try{records=JSON.parse(await readFile(out,'utf8'));if(!Array.isArray(records))throw new Error('Inventory must be an array');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const item={path:relative(cwd,file),sha256:sha256(bytes),bytes:bytes.length,sourceURL:source.href,license:a.license,attribution:a.attribution,recordedAt:new Date().toISOString(),licenseVerification:'User-supplied claim; verify at the source before publication'};
 const next=records.filter(x=>x.path!==item.path);next.push(item);await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(next,null,2));return {ok:true,inventory:out,item};
}
