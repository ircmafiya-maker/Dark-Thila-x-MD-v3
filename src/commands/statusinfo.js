import { getStatus } from '../lib/statusSettings.js';

export default {
  name: 'statusinfo',
  category: 'status',
  desc: 'Show status automation settings',
  async run({ reply }) {
    const s = getStatus();
    const on = (b) => (b ? '✅ ON' : '🔴 OFF');
    await reply(
      `📊 *Status settings*\n\n👁️ Auto view : ${on(s.view)}\n⚡ Auto react: ${on(s.react)}\n💬 Auto reply: ${on(s.reply)}\n🎭 Emoji: ${s.emoji || 'random'}\n📝 Reply text: ${s.replyMsg || 'random'}`
    );
  },
};
