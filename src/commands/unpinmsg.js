import { digits } from '../lib/utils.js';

export default {
  name: 'unpinmsg',
  category: 'group',
  desc: 'Unpin the replied message',
  group: true,
  admin: true,
  async run({ sock, jid, ctxInfo, reply }) {
    if (!ctxInfo?.stanzaId) return reply('Pin karapu message ekata reply karanna.');
    try {
      const fromMe = digits(ctxInfo.participant) === digits(sock.user?.id);
      await sock.sendMessage(jid, { pin: { key: { remoteJid: jid, fromMe, id: ctxInfo.stanzaId, participant: ctxInfo.participant }, type: 2 } });
      await reply('📌 Unpinned.');
    } catch (err) {
      await reply('❌ Unpin karanna beri una.');
    }
  },
};
