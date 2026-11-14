export default {
  name: 'close',
  category: 'group',
  desc: 'Only admins can send messages',
  group: true,
  admin: true,
  async run({ sock, jid, reply }) {
    try { await sock.groupSettingUpdate(jid, 'announcement'); await reply('🔒 Group eka close kala. Admins witharai message karanna puluwan.'); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
