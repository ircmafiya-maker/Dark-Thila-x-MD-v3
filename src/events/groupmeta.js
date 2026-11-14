import { invalidateMeta } from '../lib/utils.js';

// Keep the group metadata cache fresh (runs before welcome.js: files load alphabetically).
export default function groupMeta(sock) {
  sock.ev.on('group-participants.update', ({ id }) => invalidateMeta(id));
  sock.ev.on('groups.update', (updates) => {
    for (const u of updates || []) if (u?.id) invalidateMeta(u.id);
  });
}
