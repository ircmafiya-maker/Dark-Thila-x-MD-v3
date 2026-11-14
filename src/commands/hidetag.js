export default {
  name: 'hidetag',
  category: 'group',
  desc: 'Mention everyone invisibly',
  group: true,
  admin: true,
  async run({ sock, jid, args, quotedText, reply, prefix }) {
    const text = args.join(' ').trim() || quotedText;
    if (!text) return reply(`Usage: ${prefix}hidetag <text>  (or reply to a message)`);
    const meta = await sock.groupMetadata(jid);
    await sock.sendMessage(jid, { text, mentions: meta.participants.map((p) => p.id) });
  },
};
