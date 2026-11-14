import { getTop, xpToLevel, rankBadge } from '../lib/xp.js';

export default {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  category: 'xp',
  desc: 'Top 10 in this group',
  group: true,
  async run({ reply, jid }) {
    const top = getTop(jid, 10);
    if (!top.length) return reply('තවම කවුරුත් XP හොයාගෙන නෑ. Chat කරන්න! 💬');
    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((u, i) => `${medals[i] || `${i + 1}.`} @${u.jid.split('@')[0]} — Lv ${xpToLevel(u.xp)} ${rankBadge(xpToLevel(u.xp))} (${u.xp} XP)`);
    await reply(`🏆 *Leaderboard*\n\n${lines.join('\n')}`, { mentions: top.map((u) => u.jid) });
  },
};
