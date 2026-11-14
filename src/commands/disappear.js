export default {
  name: 'disappear',
  category: 'group',
  desc: 'Self-destructing message: .disappear 30 text',
  group: true,
  admin: true,
  async run({ sock, jid, msg, args, reply, prefix }) {
    const secs = parseInt(args[0], 10);
    const text = args.slice(1).join(' ').trim();
    if (!(secs >= 1 && secs <= 600) || !text) return reply(`Usage: ${prefix}disappear <1-600 seconds> <message>`);
    const sent = await sock.sendMessage(jid, { text: `💨 *${text}*\n\n⏱️ _${secs}s walin delete wenawa..._` }, { quoted: msg });
    setTimeout(() => sock.sendMessage(jid, { delete: sent.key }).catch(() => {}), secs * 1000);
  },
};
