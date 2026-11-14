export default {
  name: 'open',
  category: 'group',
  desc: 'Everyone can send messages',
  group: true,
  admin: true,
  async run({ sock, jid, reply }) {
    try { await sock.groupSettingUpdate(jid, 'not_announcement'); await reply('🔓 Group eka open kala. Okkoma kenekta message karanna puluwan.'); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
