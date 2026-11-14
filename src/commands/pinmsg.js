import { digits } from '../lib/utils.js';

// (.pin is the Pinterest downloader, so message pinning is .pinmsg / .unpinmsg)
export default {
  name: 'pinmsg',
  category: 'group',
  desc: 'Pin the replied message (24h default: .pinmsg 7d)',
  group: true,
  admin: true,
  async run({ sock, jid, ctxInfo, args, reply, prefix }) {
    if (!ctxInfo?.stanzaId) return reply(`Pin karanna one message ekata reply karanna.\nUsage: ${prefix}pinmsg [24h | 7d | 30d]`);
    let secs = 86400;
    const m = (args[0] || '').toLowerCase().match(/^(\d+)([hd])?$/);
    if (m) secs = Math.min(Math.max(Number(m[1]) * (m[2] === 'd' ? 86400 : 3600), 3600), 30 * 86400);
    try {
      const fromMe = digits(ctxInfo.participant) === digits(sock.user?.id);
      await sock.sendMessage(jid, { pin: { key: { remoteJid: jid, fromMe, id: ctxInfo.stanzaId, participant: ctxInfo.participant }, type: 1, time: secs } });
      await reply(`📌 Pinned for ${secs >= 86400 ? `${Math.round(secs / 86400)}d` : `${Math.round(secs / 3600)}h`}.`);
    } catch (err) {
      await reply('❌ Pin karanna beri una.');
    }
  },
};
