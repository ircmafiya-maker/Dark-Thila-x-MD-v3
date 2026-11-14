import fs from 'fs';
import path from 'path';
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
import { useMongoAuthState, deleteMongoAuthState } from './auth/mongo.js';
import { handleMessage } from './handler.js';
import { registerEvents } from './events/index.js';
import { runtime } from './lib/runtime.js';

const logger = pino({ level: 'silent' });
const BASE_DELAY = 3000;
const MAX_DELAY = 60000;

let retry = 0;
let closeAuth = null;
const msgCache = new Map(); // small cache for getMessage()

async function clearSession() {
  try {
    if (config.mongoUri) await deleteMongoAuthState({ uri: config.mongoUri, sessionId: config.sessionId });
    for (const f of ['auth.db', 'auth.db-wal', 'auth.db-shm']) {
      fs.rmSync(path.join(config.dataDir, f), { force: true });
    }
  } catch (_) {}
}

export async function startBot() {
  fs.mkdirSync(config.dataDir, { recursive: true });

  let state, saveCreds;
  if (config.mongoUri) {
    ({ state, saveCreds, close: closeAuth } = await useMongoAuthState({
      uri: config.mongoUri,
      sessionId: config.sessionId,
    }));
    runtime.storage = 'mongodb';
    console.log('[auth] MongoDB (session survives redeploys)');
  } else {
    ({ state, saveCreds, close: closeAuth } = await useSQLiteAuthState(path.join(config.dataDir, 'auth.db')));
    console.log('[auth] SQLite (session is lost if the disk is wiped, set MONGODB_URI on Render)');
  }

  const { version } = await fetchLatestBaileysVersion();
  const unregistered = !state.creds?.registered;
  const autoPair = unregistered && !!config.pairNumber; // PAIR_NUMBER set: code printed in the log

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: unregistered ? Browsers.ubuntu('Chrome') : [config.botName, 'Chrome', '136.0.0.0'],
    printQRInTerminal: unregistered && !config.pairNumber,
    logger,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    defaultQueryTimeoutMs: 0,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid) && jid !== 'status@broadcast',
    getMessage: async (key) => msgCache.get(key.id) || { conversation: '' },
  });

  sock.ev.on('creds.update', saveCreds);

  runtime.sock = sock;
  runtime.registered = !unregistered;
  runtime.qrSeen = false;
  runtime.status = 'connecting';

  if (autoPair) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairNumber);
        runtime.pairCode = code;
        runtime.pairCodeAt = Date.now();
        console.log(`\n[pair] Pairing code: ${code}\n(WhatsApp > Linked devices > Link with phone number)\n`);
      } catch (err) {
        console.error('[pair] failed:', err?.message || err);
      }
    }, 4000);
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) { runtime.qrSeen = true; runtime.qr = qr; runtime.qrAt = Date.now(); }
    if (connection === 'open') {
      retry = 0;
      runtime.status = 'online';
      runtime.registered = true;
      runtime.user = sock.user;
      runtime.pairCode = null;
      runtime.qr = null;
      console.log(`[bot] ${config.botName} connected as ${sock.user?.id}`);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      runtime.status = 'reconnecting';
      runtime.qrSeen = false;
      runtime.qr = null;
      try { await closeAuth?.(); } catch (_) {}

      if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
        console.log('[bot] logged out / bad session, clearing session and restarting');
        runtime.status = 'logged_out';
        runtime.user = null;
        await clearSession();
        return setTimeout(startBot, 1500);
      }
      if (code === DisconnectReason.restartRequired) return setTimeout(startBot, 800);

      retry++;
      const exp = Math.min(BASE_DELAY * 2 ** (retry - 1), MAX_DELAY);
      const delay = Math.max(BASE_DELAY, exp + exp * 0.2 * (Math.random() * 2 - 1));
      console.log(`[bot] connection closed (${code}), reconnecting in ${Math.round(delay / 1000)}s`);
      setTimeout(startBot, delay);
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.id) {
        msgCache.set(msg.key.id, msg.message);
        if (msgCache.size > 500) msgCache.delete(msgCache.keys().next().value);
      }
      handleMessage(sock, msg).catch((err) => console.error('[handler]', err));
    }
  });

  registerEvents(sock);
  return sock;
}
