import { getMeta } from '../lib/utils.js';

export default {
  name: 'tagall',
  category: 'group',
  desc: 'Mention everyone',
  group: true,
  admin: true,
  async run({ sock, jid, argText }) {
    const meta = await getMeta(sock, jid);
    const ids = meta.participants.map((p) => p.id);
    const text = `📢 ${argText || 'Attention!'}\n\n` + ids.map((id) => `▸ @${id.split('@')[0]}`).join('\n');
    await sock.sendMessage(jid, { text, mentions: ids });
  },
};
