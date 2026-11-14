import { findMedia, downloadFromMessage } from '../lib/media.js';

export default {
  name: 'send',
  aliases: ['save'],
  category: 'status',
  desc: 'Reply to a status to get its image/video here',
  async run({ sock, msg, jid, ctxInfo, reply, react }) {
    const m = findMedia(msg, ctxInfo, jid, ['imageMessage', 'videoMessage', 'audioMessage']);
    if (!m) return reply('Status ekakata (image/video) reply karala .send kiyanna.');
    await react('⏳');
    try {
      const buf = await downloadFromMessage(sock, m.fake);
      const caption = m.node.caption || '';
      if (m.type === 'imageMessage') await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
      else if (m.type === 'videoMessage') await sock.sendMessage(jid, { video: buf, caption, mimetype: 'video/mp4' }, { quoted: msg });
      else await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mp4', ptt: !!m.node.ptt }, { quoted: msg });
      await react('✅');
    } catch (err) {
      await react('❌');
      await reply(`❌ Status eka download karanna beri una (expire wela hari): ${err?.message || err}`);
    }
  },
};
