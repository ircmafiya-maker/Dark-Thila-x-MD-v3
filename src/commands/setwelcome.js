import { updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'setwelcome',
  category: 'group',
  desc: 'Set welcome text (use @user and @group)',
  group: true,
  admin: true,
  async run({ jid, argText, reply, prefix }) {
    const t = argText;
    if (!t) return reply(`Usage: ${prefix}setwelcome Hi @user, welcome to @group!\n(@user = member, @group = group name)`);
    await updateGroup(jid, (g) => { g.welcome = t; g.welcomeOn = true; });
    await reply('✅ Welcome message saved (welcome is ON).');
  },
};
