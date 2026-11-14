import axios from 'axios';
import { withLimit } from '../lib/limiter.js';
import { downloadMedia } from '../lib/ytdlp.js';
import { sendFile, friendlyError, hostMatches, findUrl } from '../lib/media.js';

const fmt = (n) => Number(n || 0).toLocaleString();

export default {
  name: 'tt',
  aliases: ['ttdl', 'tiktok'],
  category: 'download',
  desc: 'TikTok downloader (no watermark)',
  async run({ sock, jid, msg, args, reply, react, prefix }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const url = findUrl(args, quoted?.conversation || quoted?.extendedTextMessage?.text || '');
    if (!url || !hostMatches(url, ['tiktok.com'])) {
      return reply(`🎵 *TikTok downloader*\n\nUsage: ${prefix}tt <TikTok link>`);
    }

    await react('⏳');
    try {
      await withLimit(async () => {
        // 1) tikwm API (no watermark, supports photo slideshows)
        let d = null;
        try {
          const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, { timeout: 20000 });
          if (r.data?.code === 0) d = r.data.data;
        } catch (_) {}

        if (d && (d.play || d.hdplay)) {
          const caption =
            `🎵 *${d.title || 'TikTok'}*\n👤 ${d.author?.nickname || d.author?.unique_id || ''}\n` +
            `❤️ ${fmt(d.digg_count)}  👁 ${fmt(d.play_count)}  💬 ${fmt(d.comment_count)}`;

          if (Array.isArray(d.images) && d.images.length) {
            for (const [i, img] of d.images.slice(0, 10).entries()) {
              const { data } = await axios.get(img, { responseType: 'arraybuffer', timeout: 30000 });
              await sock.sendMessage(jid, { image: Buffer.from(data), caption: i === 0 ? caption : '' }, { quoted: msg });
            }
            return;
          }
          const { data } = await axios.get(d.hdplay || d.play, { responseType: 'arraybuffer', timeout: 60000 });
          return sock.sendMessage(jid, { video: Buffer.from(data), mimetype: 'video/mp4', caption }, { quoted: msg });
        }

        // 2) fallback: yt-dlp
        const job = await downloadMedia(url, { maxHeight: 720 });
        try {
          for (const f of job.files.slice(0, 10)) await sendFile(sock, jid, f, { caption: '🎵 TikTok', quoted: msg });
        } finally {
          job.cleanup();
        }
      });
      await react('✅');
    } catch (err) {
      console.error('[tt]', err?.message);
      await react('❌');
      await reply(`❌ ${friendlyError(err)}`);
    }
  },
};
