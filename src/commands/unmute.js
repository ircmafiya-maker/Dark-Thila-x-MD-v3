import { digits } from '../lib/utils.js';
import { updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'unmute',
  category: 'moderation',
  desc: 'Unmute a member',
  group: true,
  admin: true,
  async run({ jid, reply, mentioned, quotedSender, prefix }) {
    const target = mentioned[0] || quotedSender;
    if (!target) return reply(`Usage: ${prefix}unmute @user  (or reply)`);
    await updateGroup(jid, (g) => { g.muted = g.muted.filter((x) => x !== digits(target)); });
    await reply(`🔊 @${target.split('@')[0]} unmuted.`, { mentions: [target] });
  },
};
