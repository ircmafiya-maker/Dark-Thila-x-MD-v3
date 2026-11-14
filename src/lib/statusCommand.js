import { updateStatus, getStatus } from './statusSettings.js';

/** on/off switch command for one status setting. */
export function statusToggle({ name, aliases = [], key, label, emoji }) {
  return {
    name,
    aliases,
    category: 'status',
    desc: `${label} on/off`,
    owner: true,
    async run({ args, reply, prefix }) {
      const a = (args[0] || '').toLowerCase();
      if (a !== 'on' && a !== 'off') {
        return reply(`${emoji} *${label}* is *${getStatus()[key] ? 'ON' : 'OFF'}*\nUsage: ${prefix}${name} on | off`);
      }
      await updateStatus((s) => { s[key] = a === 'on'; });
      await reply(`${emoji} *${label}* → *${a.toUpperCase()}*`);
    },
  };
}
