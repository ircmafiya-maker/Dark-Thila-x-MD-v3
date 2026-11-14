import { updateStatus, getStatus } from '../lib/statusSettings.js';

export default {
  name: 'setstatusreplymsg',
  category: 'status',
  desc: 'Text sent by auto status reply (empty = random)',
  owner: true,
  async run({ args, reply, prefix }) {
    const t = args.join(' ').trim();
    if (!t) return reply(`Current: ${getStatus().replyMsg || 'random'}\nUsage: ${prefix}setstatusreplymsg <text>   (or "random")`);
    await updateStatus((s) => { s.replyMsg = t.toLowerCase() === 'random' ? '' : t; });
    await reply('✅ Status reply message updated.');
  },
};
