import { getStatus } from '../lib/statusSettings.js';

const EMOJIS = ['❤️', '🔥', '😍', '👍', '💯', '✨'];
const REPLIES = [
  '🖤 Status eka nikan lassanai! 😍',
  '🔥 Class status ekak ne! 💯',
  '✨ Status eka fire! 😍',
  '👀 Status eka balagen inne... 🔥',
  '💎 Oyage vibes eka hari lassanai ✨',
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Auto view / react / reply to contacts' statuses (settings: .autostatusview .autostatusreact .autostatusreply)
export default function statusEvents(sock) {
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.remoteJid !== 'status@broadcast' || msg.key.fromMe) continue;
      const poster = msg.key.participant;
      if (!poster) continue;

      (async () => {
        await new Promise((r) => setTimeout(r, 2000)); // look natural
        const s = getStatus();

        if (s.view) {
          sock.readMessages([{ remoteJid: 'status@broadcast', id: msg.key.id, participant: poster }]).catch(() => {});
        }
        if (s.react) {
          sock.sendMessage(
            'status@broadcast',
            { react: { text: s.emoji || pick(EMOJIS), key: msg.key } },
            { statusJidList: [poster] }
          ).catch(() => {});
        }
        if (s.reply) {
          sock.sendMessage(poster, {
            text: s.replyMsg || pick(REPLIES),
            contextInfo: { stanzaId: msg.key.id, participant: poster, remoteJid: 'status@broadcast' },
          }).catch(() => {});
        }
      })().catch(() => {});
    }
  });
}
