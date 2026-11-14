import { getGroup } from '../lib/groupSettings.js';
import { digits } from '../lib/utils.js';

export default {
  name: 'warns',
  category: 'moderation',
  desc: 'Show warnings (all, or one member)',
  group: true,
  async run({ jid, reply, mentioned, quotedSender }) {
    const g = getGroup(jid);
    const target = mentioned[0] || quotedSender;
    if (target) return reply(`⚠️ @${target.split('@')[0]}: ${g.warns[digits(target)] || 0}/${g.warnLimit}`, { mentions: [target] });
    const rows = Object.entries(g.warns);
    if (!rows.length) return reply('✅ Warnings nathi.');
    await reply(`⚠️ *Warnings* (limit ${g.warnLimit})\n\n` + rows.map(([n, c]) => `▸ @${n}: ${c}`).join('\n'), { mentions: rows.map(([n]) => `${n}@s.whatsapp.net`) });
  },
};
