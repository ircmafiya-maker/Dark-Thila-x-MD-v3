import fs from 'fs';
import path from 'path';

const IMG = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VID = new Set(['mp4', 'mkv', 'webm', 'mov', 'm4v']);
const AUD = new Set(['mp3', 'm4a', 'opus', 'ogg']);
const MAX_BYTES = 98 * 1024 * 1024;

/** Send a local file as image / video / audio / document depending on its extension. */
export async function sendFile(sock, jid, file, { caption = '', quoted, title } = {}) {
  const size = fs.statSync(file).size;
  if (size > MAX_BYTES) throw new Error('File too large for WhatsApp (max ~95MB).');
  const ext = path.extname(file).slice(1).toLowerCase();
  const buf = fs.readFileSync(file);
  const name = `${(title || path.basename(file, path.extname(file))).replace(/[\\/:*?"<>|]/g, '')}.${ext}`;

  if (IMG.has(ext)) return sock.sendMessage(jid, { image: buf, caption }, { quoted });
  if (VID.has(ext)) return sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', fileName: name, caption }, { quoted });
  if (AUD.has(ext)) return sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg', fileName: name }, { quoted });
  return sock.sendMessage(jid, { document: buf, mimetype: 'application/octet-stream', fileName: name, caption }, { quoted });
}

export function friendlyError(err) {
  const m = String(err?.message || err).toLowerCase();
  if (m.includes('too long') || m.includes('match-filter') || m.includes('does not pass')) return 'Video eka godak deegai.';
  if (m.includes('too large') || m.includes('max-filesize') || m.includes('larger than')) return 'File eka godak loku (95MB wadi).';
  if (m.includes('sign in') || m.includes('confirm you') || m.includes('bot')) return 'YouTube bot check ekak awa. cookies.txt ekak danna.';
  if (m.includes('private') || m.includes('login') || m.includes('log in') || m.includes('restricted')) return 'Private / login one post ekak. Public posts witharai.';
  if (m.includes('unsupported url')) return 'Meka support karana link ekak newei.';
  if (m.includes('not available') || m.includes('removed') || m.includes('unavailable')) return 'Meka dan available na (delete wela hari).';
  if (m.includes('timeout') || m.includes('timed out')) return 'Welawa iwara una (timeout). Ayeth try karanna.';
  return 'Download eka fail una. Link eka balala ayeth try karanna.';
}

/** Does `url` belong to one of the given host names? (proper hostname check, not substring) */
export function hostMatches(url, hosts) {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return hosts.some((x) => h === x || h.endsWith(`.${x}`));
  } catch (_) {
    return false;
  }
}

export const findUrl = (args = [], quotedText = '') =>
  args.find((a) => /^https?:\/\//i.test(a)) || (quotedText.match(/https?:\/\/\S+/) || [])[0];

// ── download media out of a WhatsApp message (own or quoted) ──────────────────
import pino from 'pino';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { unwrap } from './utils.js';

const silent = pino({ level: 'silent' });

export async function downloadFromMessage(sock, fakeMsg) {
  const buf = await downloadMediaMessage(fakeMsg, 'buffer', {}, { logger: silent, reuploadRequest: sock.updateMediaMessage });
  if (!buf?.length) throw new Error('Media has expired or is unavailable.');
  return buf;
}

/**
 * Find a media message of `type` ('imageMessage' | 'videoMessage' | 'audioMessage') either
 * on the command message itself (caption) or on the message it replies to.
 * Returns { fake, type, node } ready for downloadFromMessage, or null.
 */
export function findMedia(msg, ctxInfo, jid, types = ['imageMessage']) {
  const own = unwrap(msg.message);
  const ownType = types.find((t) => own[t]);
  if (ownType) return { fake: msg, type: ownType, node: own[ownType] };

  const q = ctxInfo?.quotedMessage ? unwrap(ctxInfo.quotedMessage) : null;
  const qType = q && types.find((t) => q[t]);
  if (qType) {
    return {
      fake: { key: { remoteJid: ctxInfo.remoteJid || jid, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false }, message: q },
      type: qType,
      node: q[qType],
    };
  }
  return null;
}
