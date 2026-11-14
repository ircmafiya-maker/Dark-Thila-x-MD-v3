import util from 'util';

/** Shared live state, read by the web panel (src/web/server.js). */
export const runtime = {
  startedAt: Date.now(),
  sock: null,
  status: 'starting', // starting | connecting | online | reconnecting | logged_out
  registered: false,
  qrSeen: false,      // socket is ready to accept a pairing request
  user: null,
  storage: 'sqlite',
  pairCode: null,
  pairCodeAt: 0,
  logs: [],
};

// Keep the last 300 console lines for the admin panel (still printed as usual).
const MAX_LOGS = 300;
for (const level of ['log', 'warn', 'error']) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    orig(...args);
    runtime.logs.push({ t: Date.now(), level, line: util.format(...args).slice(0, 2000) });
    if (runtime.logs.length > MAX_LOGS) runtime.logs.shift();
  };
}

let lastPair = 0;
/** Ask WhatsApp for a pairing code for `number` (digits only). */
export async function requestPair(number) {
  const s = runtime.sock;
  if (!s) throw new Error('Bot is starting, try again in a few seconds.');
  if (runtime.registered) throw new Error('This bot is already linked to a WhatsApp number.');
  if (!runtime.qrSeen) throw new Error('Connection is not ready yet. Wait ~10 seconds and try again.');
  if (Date.now() - lastPair < 8000) throw new Error('Slow down, try again in a few seconds.');
  lastPair = Date.now();
  const raw = await s.requestPairingCode(number);
  const code = String(raw).replace(/(.{4})(?=.)/, '$1-');
  runtime.pairCode = code;
  runtime.pairCodeAt = Date.now();
  return code;
}
