import { updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'setgoodbye',
  category: 'group',
  desc: 'Set goodbye text (use @user and @group)',
  group: true,
  admin: true,
  async run({ jid, argText, reply, prefix }) {
    const t = argText;
    if (!t) return reply(`Usage: ${prefix}setgoodbye Bye @user, we will miss you!\n(@user = member, @group = group name)`);
    await updateGroup(jid, (g) => { g.goodbye = t; g.welcomeOn = true; });
    await reply('✅ Goodbye message saved (welcome is ON).');
  },
};
