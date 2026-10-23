import {createServer,type Server} from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,lstat,stat,mkdir} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname,basename,sep,extname} from 'node:path';
/** Every request is rooted in its explicit workspace. No global project directory. */
export class Workspace {
 private hosts=new Map<string,{server:Server;url:string}>();
 private closed=false;
 async scopedPath(cwd:string,input:string):Promise<string>{
  if(this.closed)throw new Error('Workspace service is closed');
  if(typeof input!=='string'||!input.trim()||input.includes('\0'))throw new Error('A file path is required');
  const root=await realpath(cwd);const target=resolve(root,input);
  const rel=relative(root,target);
  if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))throw new Error('Path is outside the workspace');
  if(rel.split(sep).some(p=>p.startsWith('.')))throw new Error('Hidden paths are not exposed by UI tools');
  let cursor=target;
  while(cursor!==root){
   const info=await lstat(cursor).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
   if(info?.isSymbolicLink())throw new Error('Symbolic links are not allowed in workspace evidence paths');
   const parent=dirname(cursor);if(parent===cursor)throw new Error('Invalid workspace path');cursor=parent;
  }
  return target;
 }
 async freshDirectory(cwd:string,input:string){const path=await this.scopedPath(cwd,input);await mkdir(dirname(path),{recursive:true});await mkdir(path);return path;}
 async preview(cwd:string){
  const root=await realpath(cwd);const found=this.hosts.get(root);if(found)return found.url;
  const types:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4','.webm':'video/webm'};
  const server=createServer(async(req,res)=>{
   try{
    if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405).end();return;}
    // Reject hostile Host headers rather than serving the project through DNS rebinding.
    if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')){res.writeHead(403).end();return;}
    const raw=decodeURIComponent(new URL(req.url||'/','http://127.0.0.1').pathname);
    let path=await this.scopedPath(root,raw.replace(/^\//,'')||'index.html');
    let info=await stat(path);if(info.isDirectory()){path=await this.scopedPath(root,relative(root,path)+'/index.html');info=await stat(path);}
    if(!info.isFile())throw new Error('Not a file');
    res.writeHead(200,{'content-type':types[extname(path).toLowerCase()]||'application/octet-stream','content-length':info.size,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"frame-ancestors 'none'"});
    if(req.method==='HEAD')res.end();else createReadStream(path).on('error',()=>res.destroy()).pipe(res);
   }catch{if(!res.headersSent)res.writeHead(404).end();else res.destroy();}
  });
  await new Promise<void>((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',no);ok();});});
  const address=server.address();if(!address||typeof address==='string')throw new Error('Preview binding failed');
  const url=`http://127.0.0.1:${address.port}`;this.hosts.set(root,{server,url});return url;
 }
 async dispose(){this.closed=true;for(const {server} of this.hosts.values()){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}this.hosts.clear();}
}
