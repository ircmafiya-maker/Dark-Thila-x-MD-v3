export default {
  name: 'menu',
  aliases: ['help'],
  category: 'main',
  desc: 'Show all commands',
  async run({ reply, commands, prefix, config }) {
    const groups = {};
    for (const c of commands.values()) (groups[c.category || 'other'] ||= []).push(c);
    let out = `╭─「 *${config.botName}* 」\n`;
    for (const [cat, list] of Object.entries(groups)) {
      out += `│\n│ *${cat.toUpperCase()}*\n`;
      for (const c of list) out += `│  ▸ ${prefix}${c.name}${c.desc ? ` — ${c.desc}` : ''}\n`;
    }
    out += '╰──────────────';
    await reply(out);
  },
};
