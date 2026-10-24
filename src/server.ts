/** Codex LLY UI standard MCP stdio entrypoint. */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CodexRuntime,tools } from './runtime.ts';
const runtime=new CodexRuntime();
const server=new Server({name:'codex-lly-ui',version:'0.4.0'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
server.setRequestHandler(CallToolRequestSchema,async(request,extra)=>{
 try {
  const result=await runtime.invoke(request.params.name,request.params.arguments||{},extra.signal);
  return {content:[{type:'text' as const,text:JSON.stringify(result)}],isError:result?.ok===false};
 } catch(e){return {content:[{type:'text' as const,text:JSON.stringify({ok:false,error:e instanceof Error?e.message:'Tool failed'})}],isError:true};}
});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await runtime.dispose();await server.close();}
process.on('SIGINT',()=>{void stop();});process.on('SIGTERM',()=>{void stop();});
process.stdin.on('end',()=>{void stop();});
await server.connect(new StdioServerTransport());
