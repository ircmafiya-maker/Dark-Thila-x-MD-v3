import axios from 'axios';

export const digits = (jid = '') => String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
export const isGroup = (jid = '') => jid.endsWith('@g.us');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Strip ephemeral / view-once / caption wrappers so the real message type is on top. */
export function unwrap(message = {}) {
  let m = message || {};
  for (let i = 0; i < 4; i++) {
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message;
    if (!inner) break;
    m = inner;
  }
  return m;
}

/** contextInfo (quoted message, mentions...) from whatever message type carries it. */
export function getContextInfo(message = {}) {
  const m = unwrap(message);
  for (const k of Object.keys(m)) if (m[k]?.contextInfo) return m[k].contextInfo;
  return undefined;
}

/** Pull plain text out of any kind of incoming message. */
export function getText(message = {}) {
  const m = unwrap(message);
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

/**
 * Send an image reliably: download with axios first, send the buffer,
 * fall back to plain text if the image fails. (Inline `{image:{url}}` sends
 * can fail silently.)
 */
export async function sendImage(sock, jid, url, caption, quoted) {
  try {
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    return await sock.sendMessage(jid, { image: Buffer.from(data), caption }, { quoted });
  } catch (err) {
    console.error('[sendImage] failed, falling back to text:', err?.message);
    return sock.sendMessage(jid, { text: caption }, { quoted });
  }
}

/**
 * Is `userJid` an admin of the group?
 * - Compares phone digits as well as raw JID (WhatsApp mixes @lid and @s.whatsapp.net).
 * - FAILS OPEN on metadata errors: an API hiccup must never punish a real admin.
 */
export async function isAdmin(sock, groupJid, userJid, { failOpen = true } = {}) {
  try {
    const meta = await getMeta(sock, groupJid);
    const want = digits(userJid);
    if (!want) return false;
    return meta.participants.some(
      (p) =>
        (p.admin === 'admin' || p.admin === 'superadmin') &&
        [p.id, p.phoneNumber, p.lid].filter(Boolean).some((id) => id === userJid || digits(id) === want)
    );
  } catch (err) {
    console.error(`[isAdmin] metadata failed, failing ${failOpen ? 'open' : 'closed'}:`, err?.message);
    return failOpen;
  }
}

/** Is the bot itself an admin of this group? (needed for kick / delete / warn...) */
export async function isBotAdmin(sock, groupJid) {
  try {
    const meta = await getMeta(sock, groupJid);
    const mine = [sock.user?.id, sock.user?.lid].filter(Boolean).map(digits);
    return meta.participants.some(
      (p) =>
        (p.admin === 'admin' || p.admin === 'superadmin') &&
        [p.id, p.phoneNumber, p.lid].filter(Boolean).some((id) => mine.includes(digits(id)))
    );
  } catch (_) {
    return true; // unknown: let the action try
  }
}

// ── group metadata cache (stops one WhatsApp request per command / message) ──
const META_TTL = 5 * 60 * 1000;
const metaCache = new Map(); // jid -> { at, meta }

export async function getMeta(sock, groupJid) {
  const hit = metaCache.get(groupJid);
  if (hit && Date.now() - hit.at < META_TTL) return hit.meta;
  const meta = await sock.groupMetadata(groupJid);
  metaCache.set(groupJid, { at: Date.now(), meta });
  if (metaCache.size > 300) metaCache.delete(metaCache.keys().next().value);
  return meta;
}
export const peekMeta = (groupJid) => metaCache.get(groupJid)?.meta;
export const invalidateMeta = (groupJid) => metaCache.delete(groupJid);

/** Per-key async queue so read-modify-write on the same key never races. */
const queues = new Map();
export function serialize(key, fn) {
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  queues.set(key, next);
  next.finally(() => { if (queues.get(key) === next) queues.delete(key); });
  return next;
}
