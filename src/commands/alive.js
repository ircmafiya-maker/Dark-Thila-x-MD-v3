export default {
  name: 'alive',
  category: 'main',
  desc: 'Check if the bot is online',
  async run({ reply, config }) {
    const s = Math.floor(process.uptime());
    await reply(`✅ *${config.botName}* online\n⏱ Uptime: ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s\n🔧 Mode: ${config.mode}`);
  },
};
