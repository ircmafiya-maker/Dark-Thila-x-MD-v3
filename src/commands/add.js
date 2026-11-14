import { sleep } from '../lib/utils.js';

export default {
  name: 'add',
  category: 'group',
  desc: 'Add members: .add 9477xxxxxxx, 9477yyyyyyy',
  group: true,
  admin: true,
  async run({ sock, jid, args, reply, prefix }) {
    const nums = [...new Set(
      args.join(' ').split(/[,;\s\n]+/).map((n) => n.replace(/\D/g, '')).filter((n) => n.length >= 7 && n.length <= 16)
    )].slice(0, 30);
    if (!nums.length) return reply(`Usage: ${prefix}add 94771234567\nBulk: ${prefix}add 9477..., 9477...`);

    const ok = [], invited = [], failed = [];
    for (let i = 0; i < nums.length; i += 5) {
      const chunk = nums.slice(i, i + 5).map((n) => `${n}@s.whatsapp.net`);
      try {
        const res = await sock.groupParticipantsUpdate(jid, chunk, 'add');
        for (const r of res || []) {
          const n = (r.jid || '').split('@')[0];
          const st = String(r.status);
          if (st === '200') ok.push(n);
          else if (st === '403') invited.push(n);
          else failed.push(`${n} (${st})`);
        }
      } catch (err) {
        chunk.forEach((c) => failed.push(`${c.split('@')[0]} (${err?.message || 'error'})`));
      }
      if (i + 5 < nums.length) await sleep(1500);
    }

    // privacy-blocked users get the invite link by DM
    let sent = 0;
    if (invited.length) {
      try {
        const link = `https://chat.whatsapp.com/${await sock.groupInviteCode(jid)}`;
        for (const n of invited) {
          try { await sock.sendMessage(`${n}@s.whatsapp.net`, { text: `You are invited to join our group:\n${link}` }); sent++; } catch (_) {}
        }
      } catch (_) {}
    }

    let out = '👥 *Add result*\n';
    if (ok.length) out += `\n✅ Added (${ok.length}): ${ok.join(', ')}`;
    if (invited.length) out += `\n📨 Privacy blocked (${invited.length}), invite link DM sent to ${sent}`;
    if (failed.length) out += `\n❌ Failed (${failed.length}): ${failed.join(', ')}`;
    await reply(out);
  },
};
