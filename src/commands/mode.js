export default {
  name: 'mode',
  category: 'owner',
  desc: 'public / private (this bot only)',
  owner: true,
  async run({ args, reply, settings, session }) {
    const m = (args[0] || '').toLowerCase();
    if (!['public', 'private'].includes(m)) return reply(`Current: *${settings.mode}*\nUse: .mode public | private`);
    settings.mode = m;
    await session?.save?.();
    await reply(`✅ Mode → *${m}*`);
  },
};
