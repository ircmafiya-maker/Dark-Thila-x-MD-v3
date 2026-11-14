import { findMedia, downloadFromMessage } from '../lib/media.js';

export default {
  name: 'setgroupdp',
  aliases: ['setgpp'],
  category: 'group',
  desc: 'Set group photo (send image with caption, or reply to an image)',
  group: true,
  admin: true,
  async run({ sock, jid, msg, ctxInfo, reply, prefix }) {
    const m = findMedia(msg, ctxInfo, jid, ['imageMessage']);
    if (!m) return reply(`Image ekak ${prefix}setgroupdp caption ekka yawanna, nathnam image ekakata reply karanna.`);
    try {
      const buf = await downloadFromMessage(sock, m.fake);
      await sock.updateProfilePicture(jid, buf);
      await reply('✅ Group photo updated.');
    } catch (err) {
      await reply(`❌ Beri una: ${err?.message || err}`);
    }
  },
};
