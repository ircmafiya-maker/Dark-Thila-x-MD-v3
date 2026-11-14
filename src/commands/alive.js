export default {
  name: 'alive',
  category: 'main',
  desc: 'Check if the bot is online',
  async run({ reply, config, settings, session }) {
    const s = Math.floor((Date.now() - (session?.connectedAt || session?.startedAt || Date.now() - process.uptime() * 1000)) / 1000);
    await reply(`✅ *${config.botName}* online\n⏱ Uptime: ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s\n🔧 Mode: ${settings.mode}`);
  },
};
