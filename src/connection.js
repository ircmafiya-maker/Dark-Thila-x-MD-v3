// Session manager: one WhatsApp socket per linked number.
//   sessions   Map<sid, session>
//   bootSessions()   start every saved session (Mongo ids "dtx_*" + legacy SESSION_ID, or data/sessions/*)
//   createPending()  start a new, not-yet-linked session for the /pair page
//   destroySession() stop a session and delete its credentials + data
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pino from 'pino';
import {
  makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  isJidBroadcast,
} from '@whiskeysockets/baileys';
import { config } from './config.js';
import { useSQLiteAuthState } from './auth/sqlite.js';
import { useMongoAuthState, deleteMongoAuthState, listMongoSessionIds, mongoCollection } from './auth/mongo.js';
import { handleMessage } from './handler.js';
import { registerEvents } from './events/index.js';
import { runtime } from './lib/runtime.js';
import { runInSession } from './lib/context.js';

const logger = pino({ level: 'silent' });
const BASE_DELAY = 3000;
const MAX_DELAY = 60000;
const PENDING_TTL = 10 * 60 * 1000; // a pairing attempt is dropped after 10 minutes
const SID_PREFIX = 'dtx_';

export const sessions = new Map(); // sid -> session
const digits = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

// ---------------------------------------------------------------- helpers
export const newSid = () => SID_PREFIX + crypto.randomBytes(5).toString('hex');
export const findByNumber = (number) => [...sessions.values()].find((s) => s.number && s.number === String(number));
export const canCreate = () => sessions.size < config.maxSessions;
export const pendingCount = () => [...sessions.values()].filter((s) => !s.registered).length;

function makeSession(sid, extra = {}) {
  const s = {
    sid,
    legacy: sid === config.sessionId,
    status: 'starting', // starting | connecting | online | reconnecting
    registered: false,
    number: null,
    user: null,
    sock: null,
    qr: null,
    qrAt: 0,
    qrSeen: false,
    pairNumber: null,
    pairCode: null,
    pairCodeAt: 0,
    lastPairReq: 0,
    createdAt: Date.now(),
    startedAt: Date.now(),
    connectedAt: 0,
    retry: 0,
    stopped: false,
    timer: null,
    closeAuth: null,
    msgCache: new Map(),
    settings: { mode: config.mode, prefix: config.prefix },
    ip: null,
    pairClaim: false, // created from /pair, waiting for the browser to collect it
    ...extra,
  };
  s.save = () => saveMeta(s);
  return s;
}

// ---------------------------------------------------------------- metadata (number, mode, prefix)
const META_FILE = path.join(config.dataDir, 'sessions-meta.json');
let metaQueue = Promise.resolve();
const readMetaFile = () => { try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch { return {}; } };
const metaDoc = (s) => ({ number: s.number, mode: s.settings.mode, prefix: s.settings.prefix, createdAt: s.createdAt });

async function loadMeta() {
  if (config.mongoUri) {
    try {
      const rows = await (await mongoCollection(config.mongoUri, 'dtx_sessions')).find({}).toArray();
      return Object.fromEntries(rows.map((r) => [String(r._id), r]));
    } catch (e) { console.error('[sessions] meta load failed:', e?.message); return {}; }
  }
  return readMetaFile();
}
function saveMeta(s) {
  if (!s.registered) return Promise.resolve();
  if (config.mongoUri) {
    return mongoCollection(config.mongoUri, 'dtx_sessions')
      .then((c) => c.updateOne({ _id: s.sid }, { $set: metaDoc(s) }, { upsert: true }))
      .catch((e) => console.error('[sessions] meta save failed:', e?.message));
  }
  metaQueue = metaQueue.then(() => {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const d = readMetaFile(); d[s.sid] = metaDoc(s);
    fs.writeFileSync(META_FILE, JSON.stringify(d, null, 2));
  }).catch(() => {});
  return metaQueue;
}
function removeMeta(sid) {
  if (config.mongoUri) {
    return mongoCollection(config.mongoUri, 'dtx_sessions').then((c) => c.deleteOne({ _id: sid })).catch(() => {});
  }
  metaQueue = metaQueue.then(() => {
    const d = readMetaFile(); delete d[sid];
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(META_FILE, JSON.stringify(d, null, 2));
  }).catch(() => {});
  return metaQueue;
}

// ---------------------------------------------------------------- auth storage
const sessionDir = (sid) => path.join(config.dataDir, 'sessions', sid);
const sqlitePath = (sid) => (sid === config.sessionId ? path.join(config.dataDir, 'auth.db') : path.join(sessionDir(sid), 'auth.db'));

async function openAuth(sid) {
  if (config.mongoUri) {
    runtime.storage = 'mongodb';
    return useMongoAuthState({ uri: config.mongoUri, sessionId: sid });
  }
  fs.mkdirSync(path.dirname(sqlitePath(sid)), { recursive: true });
  return useSQLiteAuthState(sqlitePath(sid));
}

async function clearAuth(sid) {
  try {
    if (config.mongoUri) await deleteMongoAuthState({ uri: config.mongoUri, sessionId: sid });
    if (sid === config.sessionId) {
      for (const f of ['auth.db', 'auth.db-wal', 'auth.db-shm']) fs.rmSync(path.join(config.dataDir, f), { force: true });
    } else {
      fs.rmSync(sessionDir(sid), { recursive: true, force: true });
    }
  } catch (_) {}
}

async function listSessionIds() {
  if (config.mongoUri) {
    try { return await listMongoSessionIds({ uri: config.mongoUri, prefix: SID_PREFIX, exact: [config.sessionId] }); }
    catch (e) { console.error('[sessions] list failed:', e?.message); return []; }
  }
  const ids = [];
  try {
    for (const d of fs.readdirSync(path.join(config.dataDir, 'sessions'))) {
      if (fs.existsSync(path.join(config.dataDir, 'sessions', d, 'auth.db'))) ids.push(d);
    }
  } catch (_) {}
  if (fs.existsSync(path.join(config.dataDir, 'auth.db'))) ids.push(config.sessionId);
  return ids;
}

// ---------------------------------------------------------------- baileys version (shared, cached 6h)
let versionCache = { at: 0, v: null };
async function getVersion() {
  if (versionCache.v && Date.now() - versionCache.at < 6 * 3600 * 1000) return versionCache.v;
  try { versionCache = { at: Date.now(), v: (await fetchLatestBaileysVersion()).version }; } catch (_) {}
  return versionCache.v;
}

// ---------------------------------------------------------------- pairing code
export async function requestCode(s, number) {
  if (!s?.sock) throw new Error('Session is starting, try again in a few seconds.');
  if (s.registered) throw new Error('This session is already linked.');
  if (!s.qrSeen) throw new Error('Connection is not ready yet. Wait a few seconds.');
  if (Date.now() - s.lastPairReq < 8000) throw new Error('Slow down, try again in a few seconds.');
  s.lastPairReq = Date.now();
  const raw = await s.sock.requestPairingCode(number);
  s.pairCode = String(raw).replace(/(.{4})(?=.)/, '$1-');
  s.pairCodeAt = Date.now();
  return s.pairCode;
}

// ---------------------------------------------------------------- start / reconnect one session
export async function startSession(sid, { boot = false } = {}) {
  const s = sessions.get(sid);
  if (!s || s.stopped) return;
  s.status = 'connecting';
  s.startedAt = s.startedAt || Date.now();

  const later = (ms) => { clearTimeout(s.timer); s.timer = setTimeout(() => startSession(sid), ms); };

  let auth;
  try { auth = await openAuth(sid); }
  catch (e) { console.error(`[${sid}] auth failed:`, e?.message); s.status = 'reconnecting'; return later(10000); }
  if (s.stopped) { try { await auth.close?.(); } catch (_) {} return; }

  const { state, saveCreds, close } = auth;
  s.closeAuth = close;
  const unregistered = !state.creds?.registered;

  // a saved-but-never-linked session left over from a restart: drop it
  if (boot && unregistered) { console.log(`[${sid}] unlinked leftover session removed`); return destroySession(sid); }

  const version = await getVersion();
  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: unregistered ? Browsers.ubuntu('Chrome') : [config.botName, 'Chrome', '136.0.0.0'],
    printQRInTerminal: false,
    logger,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    defaultQueryTimeoutMs: 0,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid) && jid !== 'status@broadcast',
    getMessage: async (key) => s.msgCache.get(key.id) || { conversation: '' },
  });

  // Every listener we register runs inside this session's async context.
  const ev = sock.ev;
  const rawOn = ev.on.bind(ev);
  ev.on = (name, fn) => rawOn(name, (...a) => runInSession(s, () => fn(...a)));

  s.sock = sock;
  s.registered = !unregistered;
  s.qrSeen = false;
  s.qr = null;
  if (!unregistered) s.number = digits(state.creds.me?.id) || s.number;

  ev.on('creds.update', saveCreds);

  ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (s.stopped || s.sock !== sock) return;
    if (qr) {
      s.qrSeen = true; s.qr = qr; s.qrAt = Date.now();
      if (s.pairNumber && !s.pairCode && !s.registered) requestCode(s, s.pairNumber).catch((e) => console.error('[pair]', e?.message));
    }
    if (connection === 'open') {
      s.retry = 0; s.status = 'online'; s.registered = true; s.user = sock.user;
      s.number = digits(sock.user?.id) || s.number; s.qr = null; s.pairCode = null; s.connectedAt = Date.now();
      console.log(`[bot] ${config.botName} connected as +${s.number}`);
      // same number linked again: the older session is replaced
      for (const o of [...sessions.values()]) if (o !== s && o.number && o.number === s.number) {
        console.log(`[sessions] replacing older session ${o.sid} of +${s.number}`);
        destroySession(o.sid).catch(() => {});
      }
      s.save();
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      s.status = 'reconnecting'; s.qrSeen = false; s.qr = null;
      try { await s.closeAuth?.(); } catch (_) {}
      if (s.stopped) return;

      if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
        console.log('[bot] logged out / bad session, session removed');
        return destroySession(sid);
      }
      if (code === DisconnectReason.restartRequired) return later(800);

      s.retry++;
      const exp = Math.min(BASE_DELAY * 2 ** (s.retry - 1), MAX_DELAY);
      const delay = Math.max(BASE_DELAY, exp + exp * 0.2 * (Math.random() * 2 - 1));
      console.log(`[bot] connection closed (${code}), reconnecting in ${Math.round(delay / 1000)}s`);
      later(delay);
    }
  });

  ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.id) {
        s.msgCache.set(msg.key.id, msg.message);
        if (s.msgCache.size > 300) s.msgCache.delete(s.msgCache.keys().next().value);
      }
      handleMessage(sock, msg).catch((err) => console.error('[handler]', err));
    }
  });

  registerEvents(sock);
}

// ---------------------------------------------------------------- create / destroy
/** New, not-yet-linked session for the /pair page. */
export function createPending({ number = null, ip = null } = {}) {
  if (!canCreate()) throw new Error('This bot is full right now. Try again later.');
  const sid = newSid();
  const s = makeSession(sid, { pairNumber: number, ip, pairClaim: true });
  sessions.set(sid, s);
  startSession(sid).catch((e) => console.error('[sessions] start failed:', e?.message));
  return s;
}

export async function destroySession(sid, { logout = false } = {}) {
  const s = sessions.get(sid);
  if (s) {
    s.stopped = true;
    clearTimeout(s.timer);
    if (logout && s.registered && s.sock) {
      try { await Promise.race([s.sock.logout(), new Promise((r) => setTimeout(r, 5000))]); } catch (_) {}
    }
    try { s.sock?.end(undefined); } catch (_) {}
    try { await s.closeAuth?.(); } catch (_) {} // flush first, then delete
    sessions.delete(sid);
  }
  await clearAuth(sid);
  await removeMeta(sid);
}

export function restartSession(sid) {
  const s = sessions.get(sid);
  if (!s?.sock) return false;
  s.sock.end(new Error('Restart requested'));
  return true;
}

// ---------------------------------------------------------------- boot
export async function bootSessions() {
  const [ids, meta] = await Promise.all([listSessionIds(), loadMeta()]);
  console.log(`[sessions] ${ids.length} saved session(s) found`);
  let i = 0;
  for (const sid of ids) {
    const m = meta[sid] || {};
    const s = makeSession(sid, { createdAt: m.createdAt || Date.now(), number: m.number || null });
    if (m.mode) s.settings.mode = m.mode;
    if (m.prefix) s.settings.prefix = m.prefix;
    sessions.set(sid, s);
    setTimeout(() => startSession(sid, { boot: true }).catch((e) => console.error('[sessions]', e?.message)), 1500 * i++); // stagger
  }
  // drop abandoned pairing attempts
  setInterval(() => {
    for (const s of sessions.values()) {
      if (!s.registered && Date.now() - s.createdAt > PENDING_TTL) {
        console.log(`[sessions] pairing attempt ${s.sid} expired`);
        destroySession(s.sid).catch(() => {});
      }
    }
  }, 60000).unref();
}

// ---------------------------------------------------------------- dashboard login codes (sent to the user's own WhatsApp)
const otps = new Map(); // number -> { hash, exp, tries }
const sha = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');

export async function sendOtp(number) {
  const s = findByNumber(number);
  if (!s || s.status !== 'online' || !s.sock) return false;
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  otps.set(number, { hash: sha(`${number}:${code}`), exp: Date.now() + 5 * 60 * 1000, tries: 0 });
  await s.sock.sendMessage(`${number}@s.whatsapp.net`, {
    text: `🔐 *${config.botName}* dashboard login code:\n\n*${code}*\n\nValid for 5 minutes. If this wasn't you, ignore it and don't share the code.`,
  });
  return true;
}

export function verifyOtp(number, code) {
  const o = otps.get(number);
  if (!o || o.exp < Date.now()) { otps.delete(number); return null; }
  if (++o.tries > 5) { otps.delete(number); return null; }
  if (o.hash !== sha(`${number}:${String(code).trim()}`)) return null;
  otps.delete(number);
  return findByNumber(number) || null;
}
setInterval(() => { for (const [k, v] of otps) if (v.exp < Date.now()) otps.delete(k); }, 60000).unref();
