import { withLimit } from '../lib/limiter.js';
import { downloadMedia } from '../lib/ytdlp.js';
import { findVideo } from '../lib/youtube.js';
import { sendFile, friendlyError } from '../lib/media.js';
import { sendImage } from '../lib/utils.js';

const MAX_SECS = 15 * 60;

export default {
  name: 'video',
  aliases: ['ytmp4', 'vdl', 'videodl'],
  category: 'download',
  desc: 'Download a YouTube video (name or link)',
  async run({ sock, jid, msg, args, reply, react, prefix }) {
    const q = args.join(' ').trim();
    if (!q) return reply(`🎬 Usage: ${prefix}video <video name | YouTube link>`);

    await react('🔍');
    try {
      const v = await findVideo(q);
      if (!v) { await react('❌'); return reply('❌ Video eka hoyaganna beri una.'); }
      if (v.seconds > MAX_SECS) { await react('❌'); return reply('❌ Video eka minutes 15k wada deegai.'); }

      const card = `🎬 *${v.title}*\n👤 ${v.author}\n⏱ ${v.timestamp}\n📥 480p\n\n⏳ Downloading...`;
      if (v.thumbnail) await sendImage(sock, jid, v.thumbnail, card, msg);
      else await reply(card);

      await react('⏳');
      await withLimit(async () => {
        const job = await downloadMedia(v.url, { maxHeight: 480, maxSecs: MAX_SECS });
        try {
          await sendFile(sock, jid, job.files[0], { caption: `🎬 ${v.title}`, quoted: msg, title: v.title });
        } finally {
          job.cleanup();
        }
      });
      await react('✅');
    } catch (err) {
      console.error('[video]', err?.message);
      await react('❌');
      await reply(`❌ ${friendlyError(err)}`);
    }
  },
};
