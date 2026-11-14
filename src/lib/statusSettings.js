import { readJson, updateJson } from './store.js';

const defaults = () => ({ view: true, react: false, emoji: '', reply: false, replyMsg: '' });

export const getStatus = () => ({ ...defaults(), ...readJson('status') });
export const updateStatus = (mutate) => updateJson('status', (d) => { const m = { ...defaults(), ...d }; mutate(m); return m; });
