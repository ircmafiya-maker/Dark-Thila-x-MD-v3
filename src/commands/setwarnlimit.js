import { getGroup, updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'setwarnlimit',
  category: 'moderation',
  desc: 'Warnings before kick (default 3)',
  group: true,
  admin: true,
  async run({ jid, args, reply, prefix }) {
    const n = parseInt(args[0], 10);
    if (!(n >= 1 && n <= 20)) return reply(`Current: ${getGroup(jid).warnLimit}\nUsage: ${prefix}setwarnlimit <1-20>`);
    await updateGroup(jid, (g) => { g.warnLimit = n; });
    await reply(`✅ Warn limit → ${n}`);
  },
};
