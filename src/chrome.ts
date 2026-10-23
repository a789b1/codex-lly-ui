import {spawn,type ChildProcess} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
export function findBrowser():string|null{
 const locations=[process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
  ...['PROGRAMFILES','PROGRAMFILES(X86)','LOCALAPPDATA'].flatMap(k=>process.env[k]?[join(process.env[k]!,'Google/Chrome/Application/chrome.exe'),join(process.env[k]!,'Microsoft/Edge/Application/msedge.exe')]:[])];
 return locations.find((p):p is string=>Boolean(p&&existsSync(p)))||null;
}
/** Launches only an owned temporary profile. Never attaches to the user's logged-in browser. */
export function isolatedChrome(){
 let child:ChildProcess|undefined;let profile:string|undefined;
 return {
  async launch(){
   const executable=findBrowser();if(!executable)throw new Error('Chrome/Chromium/Edge is required; set CHROME_PATH to its executable');
   profile=await mkdtemp(join(tmpdir(),'codex-lly-browser-'));
   child=spawn(executable,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--mute-audio','--enable-unsafe-swiftshader','about:blank'],{stdio:['ignore','ignore','pipe'],detached:process.platform!=='win32'});
   let startError:Error|undefined;child.once('error',e=>{startError=e;});
   const deadline=Date.now()+30000;
   while(Date.now()<deadline){
    if(startError)throw startError;
    try{const [port,endpoint]=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');if(/^\d+$/.test(port!)&&endpoint?.startsWith('/devtools/browser/'))return `ws://127.0.0.1:${port}${endpoint}`;}catch{}
    await new Promise(r=>setTimeout(r,80));
   }
   throw new Error('Browser startup timed out');
  },
  async stop(socket?:WebSocket){
   if(socket?.readyState===WebSocket.OPEN){try{socket.send(JSON.stringify({id:2147483000,method:'Browser.close'}));}catch{}await new Promise(r=>setTimeout(r,150));}
   if(child?.pid){try{if(process.platform==='win32')child.kill();else process.kill(-child.pid,'SIGTERM');}catch{}}
   if(child&&child.exitCode===null&&child.signalCode===null)await new Promise<void>(done=>{const timer=setTimeout(()=>{try{child?.kill('SIGKILL')}catch{}done()},1000);child!.once('close',()=>{clearTimeout(timer);done()})});
   if(profile)await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150}).catch(()=>{});
  },
  dispose(){if(child?.pid){try{if(process.platform==='win32')child.kill('SIGKILL');else process.kill(-child.pid,'SIGKILL');}catch{}}}
 };
}
