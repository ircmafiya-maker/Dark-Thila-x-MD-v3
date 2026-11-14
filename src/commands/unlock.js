export default {
  name: 'unlock',
  category: 'group',
  desc: 'Everyone can edit group info',
  group: true,
  admin: true,
  async run({ sock, jid, reply }) {
    try { await sock.groupSettingUpdate(jid, 'unlocked'); await reply('🔓 Dan okkoma kenekta group info edit karanna puluwan.'); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
