import fs from 'fs';
import { findMedia, downloadFromMessage } from './media.js';
import { updateGroup, imgPath } from './groupSettings.js';

/** Builds .setwelcomeimg / .setgoodbyeimg */
export function makeSetImageCommand(kind) {
  const flag = `${kind}Img`;
  const name = `set${kind}img`;
  return {
    name,
    category: 'group',
    desc: `Set ${kind} picture (send image with caption, or reply to an image; "off" removes it)`,
    group: true,
    admin: true,
    async run({ sock, jid, msg, ctxInfo, args, reply, prefix }) {
      if ((args[0] || '').toLowerCase() === 'off') {
        try { fs.rmSync(imgPath(jid, kind), { force: true }); } catch (_) {}
        await updateGroup(jid, (g) => { g[flag] = false; });
        return reply(`🗑️ ${kind} picture removed.`);
      }
      const m = findMedia(msg, ctxInfo, jid, ['imageMessage']);
      if (!m) return reply(`Image ekak ${prefix}${name} caption ekka yawanna, nathnam image ekakata reply karanna.\nRemove: ${prefix}${name} off`);
      try {
        const buf = await downloadFromMessage(sock, m.fake);
        fs.mkdirSync('data', { recursive: true });
        fs.writeFileSync(imgPath(jid, kind), buf);
        await updateGroup(jid, (g) => { g[flag] = true; if (kind === 'welcome') g.welcomeOn = true; if (kind === 'goodbye') g.welcomeOn = true; });
        await reply(`✅ ${kind} picture saved (welcome is ON).`);
      } catch (err) {
        await reply(`❌ Beri una: ${err?.message || err}`);
      }
    },
  };
}
