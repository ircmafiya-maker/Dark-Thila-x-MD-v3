export default {
  name: 'ping',
  aliases: ['speed'],
  category: 'main',
  desc: 'Bot speed',
  async run({ reply, msg }) {
    const lag = Date.now() - (Number(msg.messageTimestamp) * 1000 || Date.now());
    await reply(`🏓 Pong! ${Math.max(lag, 0)} ms`);
  },
};
