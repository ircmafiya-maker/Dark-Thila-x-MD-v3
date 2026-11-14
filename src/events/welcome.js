import fs from 'fs';
import { getGroup, imgPath } from '../lib/groupSettings.js';
import { getMeta, invalidateMeta } from '../lib/utils.js';

// Texts use @user and @group.  .welcome on|off  .setwelcome  .setgoodbye  .setwelcomeimg  .setgoodbyeimg
const DEFAULT_WELCOME = '👋 Welcome @user to *@group*!';
const DEFAULT_GOODBYE = '👋 Bye @user';

export default function welcome(sock) {
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add' && action !== 'remove') return;
    const g = getGroup(id);
    if (!g.welcomeOn) return;

    const kind = action === 'add' ? 'welcome' : 'goodbye';
    const tpl = (action === 'add' ? g.welcome : g.goodbye) || (action === 'add' ? DEFAULT_WELCOME : DEFAULT_GOODBYE);

    let image = null;
    if (g[`${kind}Img`]) {
      try { image = fs.readFileSync(imgPath(id, kind)); } catch (_) {}
    }

    let subject = '';
    try { invalidateMeta(id); subject = (await getMeta(sock, id)).subject || ''; } catch (_) {}

    for (const p of participants) {
      const jid = typeof p === 'string' ? p : p.id;
      const text = tpl.replace(/@user/g, () => `@${jid.split('@')[0]}`).replace(/@group/g, () => subject);
      const content = image ? { image, caption: text, mentions: [jid] } : { text, mentions: [jid] };
      await sock.sendMessage(id, content).catch(async () => {
        // image send failed: fall back to plain text so the greeting is never lost
        if (image) await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
      });
    }
  });
}
