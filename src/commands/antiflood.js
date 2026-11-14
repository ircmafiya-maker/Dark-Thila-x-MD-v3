import { getGroup, updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'antiflood',
  category: 'moderation',
  desc: 'Delete spam (6 msgs / 8s) + warn',
  group: true,
  admin: true,
  async run({ jid, args, reply, prefix }) {
    const a = (args[0] || '').toLowerCase();
    if (a !== 'on' && a !== 'off') return reply(`🌊 Anti-flood is *${getGroup(jid).antiflood ? 'ON' : 'OFF'}*\nUsage: ${prefix}antiflood on | off\n(Bot must be a group admin)`);
    await updateGroup(jid, (g) => { g.antiflood = a === 'on'; });
    await reply(`🌊 Anti-flood → *${a.toUpperCase()}*`);
  },
};
