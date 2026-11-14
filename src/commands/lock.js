export default {
  name: 'lock',
  category: 'group',
  desc: 'Only admins can edit group info',
  group: true,
  admin: true,
  async run({ sock, jid, reply }) {
    try { await sock.groupSettingUpdate(jid, 'locked'); await reply('🔒 Group info edit karanna puluwan admins witharai.'); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
