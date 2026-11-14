import { isAdmin } from '../lib/utils.js';
import { addWarn } from '../lib/moderation.js';

export default {
  name: 'warn',
  category: 'moderation',
  desc: 'Warn a member (mention or reply). Kicked at the limit',
  group: true,
  admin: true,
  async run({ sock, jid, args, reply, mentioned, quotedSender, prefix }) {
    const target = mentioned[0] || quotedSender;
    if (!target) return reply(`Usage: ${prefix}warn @user [reason]  (or reply)`);
    if (await isAdmin(sock, jid, target)) return reply('Admin kenekwa warn karanna ba.');
    const reason = args.filter((a) => !a.startsWith('@')).join(' ');
    const w = await addWarn(sock, jid, target);
    await reply(
      `⚠️ @${target.split('@')[0]} warned ${w.count}/${w.limit}${reason ? `\n📝 ${reason}` : ''}${w.kicked ? '\n🚫 Limit reach wuna nisa remove kala.' : ''}`,
      { mentions: [target] }
    );
  },
};
