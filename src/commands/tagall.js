export default {
  name: 'tagall',
  category: 'group',
  desc: 'Mention everyone',
  group: true,
  admin: true,
  async run({ sock, jid, args }) {
    const meta = await sock.groupMetadata(jid);
    const ids = meta.participants.map((p) => p.id);
    const text = `📢 ${args.join(' ') || 'Attention!'}\n\n` + ids.map((id) => `▸ @${id.split('@')[0]}`).join('\n');
    await sock.sendMessage(jid, { text, mentions: ids });
  },
};
