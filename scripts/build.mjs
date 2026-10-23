import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const root = 'plugins/codex-lly-ui';
await mkdir(`${root}/server`, {recursive:true});
await build({entryPoints:['src/server.ts'],outfile:`${root}/server/index.mjs`,bundle:true,platform:'node',format:'esm',target:'node22',banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}});
await copyFile('node_modules/axe-core/axe.min.js',`${root}/server/axe.min.js`);
await copyFile('node_modules/axe-core/LICENSE',`${root}/server/AXE-LICENSE`);
// Preserve license metadata for all bundled production dependencies, including transitive ones.
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const sections=[];
for(const [path,entry] of Object.entries(lock.packages||{})){
 if(!path||entry.dev)continue;
 try{
  const meta=JSON.parse(await readFile(`${path}/package.json`,'utf8'));
  let text='';for(const name of ['LICENSE','LICENSE.md','LICENSE.txt','license','LICENCE','COPYING']){try{text=await readFile(`${path}/${name}`,'utf8');break;}catch{}}
  sections.push(`${meta.name}@${meta.version}\nLicense: ${typeof meta.license==='string'?meta.license:JSON.stringify(meta.license)}\n${text}`);
 }catch{}
}
await writeFile(`${root}/server/THIRD-PARTY-NOTICES.txt`,sections.join('\n\n--------------------\n\n'));
