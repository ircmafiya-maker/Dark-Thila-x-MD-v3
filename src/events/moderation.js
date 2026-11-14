import { config } from '../config.js';
import { getSession } from '../lib/context.js';
import { getText, isGroup, digits, isAdmin } from '../lib/utils.js';
import { getGroup } from '../lib/groupSettings.js';
import { addWarn, deleteMsg } from '../lib/moderation.js';

const LINK_RE = /(https?:\/\/|chat\.whatsapp\.com\/|www\.)\S+/i;
const FLOOD_COUNT = 6;       // messages
const FLOOD_WINDOW = 8000;   // ms
const flood = new Map();     // "group|user" -> timestamps

// Anti-link, anti-flood and muted members. The bot must be a group admin to delete messages.
export default function moderation(sock) {
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      handle(msg).catch((err) => console.error('[moderation]', err?.message));
    }
  });

  async function handle(msg) {
    const jid = msg.key.remoteJid;
    if (!msg.message || msg.key.fromMe || !isGroup(jid)) return;
    const sender = msg.key.participant;
    if (!sender) return;

    const g = getGroup(jid);
    if (!g.antilink && !g.antiflood && !g.muted.length) return;

    const who = digits(sender);
    const sess = getSession();
    if (who === sess?.number) return;
    if (config.ownerNumber && who === config.ownerNumber && (config.ownerSudo || sess?.legacy)) return;

    // muted member: just delete
    if (g.muted.includes(who)) return void deleteMsg(sock, jid, msg.key);

    const text = getText(msg.message);

    if (g.antilink && LINK_RE.test(text)) {
      if (await isAdmin(sock, jid, sender)) return; // fails open on errors
      await deleteMsg(sock, jid, msg.key);
      const w = await addWarn(sock, jid, sender);
      return void sock.sendMessage(jid, {
        text: `🔗 @${who} links danna epa! Warn ${w.count}/${w.limit}${w.kicked ? ' → removed' : ''}`,
        mentions: [sender],
      });
    }

    if (g.antiflood) {
      const k = `${sess?.sid}|${jid}|${who}`;
      const now = Date.now();
      const arr = (flood.get(k) || []).filter((t) => now - t < FLOOD_WINDOW);
      arr.push(now);
      flood.set(k, arr);
      if (arr.length >= FLOOD_COUNT) {
        flood.delete(k);
        if (await isAdmin(sock, jid, sender)) return;
        await deleteMsg(sock, jid, msg.key);
        const w = await addWarn(sock, jid, sender);
        sock.sendMessage(jid, {
          text: `🌊 @${who} spam karanna epa! Warn ${w.count}/${w.limit}${w.kicked ? ' → removed' : ''}`,
          mentions: [sender],
        });
      }
    }
  }
}
