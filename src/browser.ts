import { isolatedChrome } from './chrome.ts';
/** Isolated browser/CDP session. Every pending call is bounded and cancelled on teardown. */
export async function browserSession(signal?: AbortSignal) {
  const chrome = isolatedChrome();
  let socket: WebSocket | undefined;
  let seq = 0;
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const errors: string[] = [];
  const loaded = new Set<string>();
  const fail = (e: Error) => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(e); } pending.clear(); };
  const abort = () => { fail(new Error('Audit cancelled')); socket?.close(); };
  signal?.addEventListener('abort', abort, { once: true });
  const close = async () => {
    signal?.removeEventListener('abort', abort);
    fail(new Error('Browser session closed'));
    try { await chrome.stop(socket); } finally { socket?.close(); chrome.dispose(); }
  };
  try {
    if (signal?.aborted) throw new Error('Audit cancelled');
    socket = new WebSocket(await chrome.launch());
    await new Promise<void>((ok, no) => {
      const timer = setTimeout(() => no(new Error('Browser connect timed out')), 15000);
      socket!.onopen = () => { clearTimeout(timer); ok(); };
      socket!.onerror = () => { clearTimeout(timer); no(new Error('Browser connection failed')); };
    });
    socket.onmessage = event => {
      const m = JSON.parse(String(event.data));
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id)!; clearTimeout(p.timer); pending.delete(m.id);
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      } else if (m.method === 'Page.lifecycleEvent' && m.params.name === 'load') loaded.add(m.params.loaderId);
      else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a: any) => String(a.value || a.description)).join(' '));
    };
    socket.onclose = () => fail(new Error('Browser disconnected'));
    const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> => {
      if (signal?.aborted) return Promise.reject(new Error('Audit cancelled'));
      return new Promise((resolve, reject) => {
        const id = ++seq;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 45000);
        pending.set(id, { resolve, reject, timer });
        socket!.send(JSON.stringify({ id, method, params, ...(sessionId ? {sessionId} : {}) }));
      });
    };
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method: string, params: Record<string, unknown> = {}) => send(method, params, sessionId);
    await call('Page.enable'); await call('Page.setLifecycleEventsEnabled',{enabled:true}); await call('Runtime.enable');
    const evaluate = async (expression: string) => {
      const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const waitForLoad=async(loaderId?:string)=>{
      if(!loaderId)return; const deadline=Date.now()+25000;
      while(!loaded.has(loaderId)){if(signal?.aborted)throw new Error('Audit cancelled');if(Date.now()>deadline)throw new Error('Page load timed out');await new Promise(r=>setTimeout(r,50));}
    };
    return { call, evaluate, close, errors, waitForLoad };
  } catch (e) { await close(); throw e; }
}
