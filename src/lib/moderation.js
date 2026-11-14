import { digits } from './utils.js';
import { getGroup, updateGroup } from './groupSettings.js';

/** +1 warn. When the limit is reached the user is removed and the counter reset. */
export async function addWarn(sock, groupJid, userJid) {
  const key = digits(userJid);
  let count = 0;
  await updateGroup(groupJid, (g) => {
    g.warns[key] = (g.warns[key] || 0) + 1;
    count = g.warns[key];
  });
  const limit = getGroup(groupJid).warnLimit;
  let kicked = false;
  if (count >= limit) {
    try {
      await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove');
      kicked = true;
      await updateGroup(groupJid, (g) => { delete g.warns[key]; });
    } catch (err) {
      console.error('[warn] kick failed (bot not admin?):', err?.message);
    }
  }
  return { count, limit, kicked };
}

export const deleteMsg = (sock, jid, key) => sock.sendMessage(jid, { delete: key }).catch(() => {});
