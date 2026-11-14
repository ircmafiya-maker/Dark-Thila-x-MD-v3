import { updateGroup } from '../lib/groupSettings.js';
import { digits } from '../lib/utils.js';

export default {
  name: 'resetwarn',
  aliases: ['unwarn'],
  category: 'moderation',
  desc: 'Clear warnings (one member, or all)',
  group: true,
  admin: true,
  async run({ jid, reply, mentioned, quotedSender }) {
    const target = mentioned[0] || quotedSender;
    await updateGroup(jid, (g) => { if (target) delete g.warns[digits(target)]; else g.warns = {}; });
    await reply(target ? `✅ @${target.split('@')[0]} warnings clear kala.` : '✅ Okkoma warnings clear kala.', { mentions: target ? [target] : [] });
  },
};
