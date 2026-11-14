import { updateStatus, getStatus } from '../lib/statusSettings.js';

export default {
  name: 'setstatusreact',
  category: 'status',
  desc: 'Emoji used for auto status react (empty = random)',
  owner: true,
  async run({ args, reply, prefix }) {
    const e = args.join('').trim();
    if (!e) return reply(`Current: ${getStatus().emoji || 'random (❤️ 🔥 😍 👍 💯 ✨)'}\nUsage: ${prefix}setstatusreact 🔥   (or "random")`);
    await updateStatus((s) => { s.emoji = e.toLowerCase() === 'random' ? '' : e; });
    await reply(`✅ Status react emoji → ${e}`);
  },
};
