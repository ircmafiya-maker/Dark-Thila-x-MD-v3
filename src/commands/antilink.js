import { getGroup, updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'antilink',
  category: 'moderation',
  desc: 'Delete links + warn (admins exempt)',
  group: true,
  admin: true,
  async run({ jid, args, reply, prefix }) {
    const a = (args[0] || '').toLowerCase();
    if (a !== 'on' && a !== 'off') return reply(`🔗 Anti-link is *${getGroup(jid).antilink ? 'ON' : 'OFF'}*\nUsage: ${prefix}antilink on | off\n(Bot must be a group admin)`);
    await updateGroup(jid, (g) => { g.antilink = a === 'on'; });
    await reply(`🔗 Anti-link → *${a.toUpperCase()}*`);
  },
};
