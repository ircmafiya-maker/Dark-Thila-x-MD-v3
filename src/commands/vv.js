import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { unwrap, isGroup } from '../lib/utils.js';
import { downloadFromMessage } from '../lib/media.js';

export default {
  name: 'vv',
  aliases: ['v', 'viewonce'],
  category: 'tools',
  desc: 'Unlock a view-once message (reply to it). Sent to your DM',
  async run({ sock, msg, jid, sender, fromMe, ctxInfo, reply, react }) {
    const q = ctxInfo?.quotedMessage;
    if (!q) return reply('👁️ View-once message ekakata reply karala .vv kiyanna.');

    const inner = unwrap(q);
    const type = ['imageMessage', 'videoMessage', 'audioMessage'].find((t) => inner[t]);
    if (!type) return reply('❌ Image / video / audio view-once witharai support karanne.');

    await react('👁️');
    try {
      const buf = await downloadFromMessage(sock, {
        key: { remoteJid: jid, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false },
        message: inner,
      });

      // deliver to the requester's DM (never into the group)
      const dm = fromMe
        ? jidNormalizedUser(sock.user.id)
        : isGroup(jid) ? (msg.key.participantAlt || sender) : jid;

      const node = inner[type];
      const caption = `👁️ View once unlocked${node.caption ? `\n\n${node.caption}` : ''}`;
      if (type === 'imageMessage') await sock.sendMessage(dm, { image: buf, caption });
      else if (type === 'videoMessage') await sock.sendMessage(dm, { video: buf, caption, mimetype: node.mimetype || 'video/mp4' });
      else await sock.sendMessage(dm, { audio: buf, mimetype: node.mimetype || 'audio/mp4', ptt: !!node.ptt });

      if (dm !== jid) await reply('🔓 View-once eka oyage DM ekata yewwa.');
      await react('🔓');
    } catch (err) {
      console.error('[vv]', err?.message);
      await react('❌');
      await reply(`❌ Unlock karanna beri una: ${err?.message || err}`);
    }
  },
};
