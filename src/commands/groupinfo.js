export default {
  name: 'groupinfo',
  aliases: ['ginfo'],
  category: 'group',
  desc: 'Group details',
  group: true,
  async run({ sock, jid, reply }) {
    const m = await sock.groupMetadata(jid);
    const admins = m.participants.filter((p) => p.admin).length;
    const created = m.creation ? new Date(m.creation * 1000).toISOString().slice(0, 10) : '-';
    await reply(
      `👥 *${m.subject}*\n\n🆔 ${m.id}\n📅 Created: ${created}\n👤 Members: ${m.participants.length}\n👑 Admins: ${admins}\n` +
      `✉️ Messages: ${m.announce ? 'admins only' : 'everyone'}\n⚙️ Edit info: ${m.restrict ? 'admins only' : 'everyone'}\n\n📝 ${m.desc || '(no description)'}`
    );
  },
};
