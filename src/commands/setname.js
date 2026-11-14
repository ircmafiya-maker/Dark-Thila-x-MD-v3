export default {
  name: 'setname',
  category: 'group',
  desc: 'Change group name',
  group: true,
  admin: true,
  async run({ sock, jid, args, reply, prefix }) {
    const name = args.join(' ').trim();
    if (!name) return reply(`Usage: ${prefix}setname <new name>`);
    try { await sock.groupUpdateSubject(jid, name.slice(0, 100)); await reply('✅ Group name updated.'); }
    catch (_) { await reply('❌ Beri una. Bot admin kenek wenna one.'); }
  },
};
