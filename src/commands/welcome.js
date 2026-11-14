import { getGroup, updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'welcome',
  category: 'group',
  desc: 'Welcome/goodbye messages on|off',
  group: true,
  admin: true,
  async run({ jid, args, reply, prefix }) {
    const a = (args[0] || '').toLowerCase();
    if (a !== 'on' && a !== 'off') return reply(`👋 Welcome is *${getGroup(jid).welcomeOn ? 'ON' : 'OFF'}*\nUsage: ${prefix}welcome on | off\nText: ${prefix}setwelcome / ${prefix}setgoodbye`);
    await updateGroup(jid, (g) => { g.welcomeOn = a === 'on'; });
    await reply(`👋 Welcome / goodbye → *${a.toUpperCase()}*`);
  },
};
