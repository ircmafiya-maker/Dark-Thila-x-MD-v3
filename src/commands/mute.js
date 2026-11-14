import { isAdmin, digits } from '../lib/utils.js';
import { updateGroup } from '../lib/groupSettings.js';

export default {
  name: 'mute',
  category: 'moderation',
  desc: "Delete a member's messages (mention or reply)",
  group: true,
  admin: true,
  async run({ sock, jid, reply, mentioned, quotedSender, prefix }) {
    const target = mentioned[0] || quotedSender;
    if (!target) return reply(`Usage: ${prefix}mute @user  (or reply). Bot must be a group admin.`);
    if (await isAdmin(sock, jid, target)) return reply('Admin kenekwa mute karanna ba.');
    await updateGroup(jid, (g) => { const d = digits(target); if (!g.muted.includes(d)) g.muted.push(d); });
    await reply(`🔇 @${target.split('@')[0]} muted. Message delete wenawa.`, { mentions: [target] });
  },
};
