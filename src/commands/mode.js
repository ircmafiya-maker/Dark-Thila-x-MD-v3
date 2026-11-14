import { config } from '../config.js';

export default {
  name: 'mode',
  category: 'owner',
  desc: 'public / private (runtime)',
  owner: true,
  async run({ args, reply }) {
    const m = (args[0] || '').toLowerCase();
    if (!['public', 'private'].includes(m)) return reply(`Current: *${config.mode}*\nUse: .mode public | private`);
    config.mode = m;
    await reply(`✅ Mode → *${m}*`);
  },
};
