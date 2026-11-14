import { AsyncLocalStorage } from 'async_hooks';

// Every WhatsApp session (one per linked number) runs inside its own async context,
// so shared code (store, handler, commands, logs) knows which session it is serving.
const als = new AsyncLocalStorage();
export const runInSession = (session, fn) => als.run(session, fn);
export const getSession = () => als.getStore() || null;
export const currentSid = () => als.getStore()?.sid || null;
