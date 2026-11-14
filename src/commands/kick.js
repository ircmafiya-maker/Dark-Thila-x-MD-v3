import { isAdmin } from '../lib/utils.js';

export default {
  name: 'kick',
  category: 'group',
  desc: 'Remove a member (mention or reply)',
  group: true,
  admin: true,
  async run({ sock, jid, reply, mentioned, quotedSender }) {
    const target = mentioned[0] || quotedSender;
    if (!target) return reply('Kenekwa mention karanna, nathnam reply karanna.');
    if (await isAdmin(sock, jid, target)) return reply('Admin kenekwa kick karanna ba.');
    await sock.groupParticipantsUpdate(jid, [target], 'remove');
    await reply('✅ Removed.');
  },
};
