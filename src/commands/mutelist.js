import { getGroup } from '../lib/groupSettings.js';

export default {
  name: 'mutelist',
  category: 'moderation',
  desc: 'Muted members',
  group: true,
  async run({ jid, reply }) {
    const m = getGroup(jid).muted;
    if (!m.length) return reply('🔊 Kisiwek mute karala na.');
    await reply('🔇 *Muted*\n\n' + m.map((n) => `▸ @${n}`).join('\n'), { mentions: m.map((n) => `${n}@s.whatsapp.net`) });
  },
};
