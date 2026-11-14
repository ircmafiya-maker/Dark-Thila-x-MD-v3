export default {
  name: 'promote',
  category: 'group',
  desc: 'Promote a member (mention or reply)',
  group: true,
  admin: true,
  async run({ sock, jid, reply, mentioned, quotedSender }) {
    const target = mentioned[0] || quotedSender;
    if (!target) return reply('Kenekwa mention karanna, nathnam reply karanna.');
    try {
      await sock.groupParticipantsUpdate(jid, [target], 'promote');
      await reply(`✅ @${target.split('@')[0]} dan admin kenek 👑`, { mentions: [target] });
    } catch (err) {
      await reply('❌ Beri una. Bot group admin kenek wenna one.');
    }
  },
};
