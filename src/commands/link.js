export default {
  name: 'link',
  aliases: ['grouplink', 'invite'],
  category: 'group',
  desc: 'Get the group invite link',
  group: true,
  admin: true,
  async run({ sock, jid, reply }) {
    try { await reply(`🔗 https://chat.whatsapp.com/${await sock.groupInviteCode(jid)}`); }
    catch (_) { await reply('❌ Link eka ganna beri una. Bot admin kenek wenna one.'); }
  },
};
