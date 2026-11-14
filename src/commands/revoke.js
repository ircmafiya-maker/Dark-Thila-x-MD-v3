export default {
  name: 'revoke',
  aliases: ['resetlink'],
  category: 'group',
  desc: 'Reset the invite link',
  group: true,
  admin: true,
  async run({ sock, jid, reply }) {
    try { await reply(`✅ Link eka reset kala:\nhttps://chat.whatsapp.com/${await sock.groupRevokeInvite(jid)}`); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
