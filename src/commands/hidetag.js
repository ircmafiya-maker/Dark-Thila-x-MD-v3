import { getMeta } from '../lib/utils.js';

export default {
  name: 'hidetag',
  category: 'group',
  desc: 'Mention everyone invisibly',
  group: true,
  admin: true,
  async run({ sock, jid, argText, quotedText, reply, prefix }) {
    const text = argText || quotedText;
    if (!text) return reply(`Usage: ${prefix}hidetag <text>  (or reply to a message)`);
    const meta = await getMeta(sock, jid);
    await sock.sendMessage(jid, { text, mentions: meta.participants.map((p) => p.id) });
  },
};
