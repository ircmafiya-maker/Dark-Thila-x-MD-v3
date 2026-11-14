export default {
  name: 'setdesc',
  category: 'group',
  desc: 'Change group description',
  group: true,
  admin: true,
  async run({ sock, jid, argText, reply, prefix }) {
    const d = argText;
    if (!d) return reply(`Usage: ${prefix}setdesc <description>`);
    try { await sock.groupUpdateDescription(jid, d); await reply('✅ Description updated.'); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
