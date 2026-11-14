import { getXp, xpToLevel, xpForLevel, rankBadge } from '../lib/xp.js';

export default {
  name: 'level',
  aliases: ['rank'],
  category: 'xp',
  desc: 'Your level in this group',
  group: true,
  async run({ reply, jid, sender, mentioned }) {
    const target = mentioned[0] || sender;
    const xp = getXp(jid, target);
    const lvl = xpToLevel(xp);
    await reply(
      `📊 @${target.split('@')[0]}\nLevel: *${lvl}* ${rankBadge(lvl)}\nXP: ${xp} / ${xpForLevel(lvl + 1)}`,
      { mentions: [target] }
    );
  },
};
