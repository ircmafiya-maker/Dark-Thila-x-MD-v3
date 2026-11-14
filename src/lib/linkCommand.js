import axios from 'axios';
import { downloadMedia } from './ytdlp.js';
import { withLimit } from './limiter.js';
import { sendFile, friendlyError, hostMatches, findUrl } from './media.js';

/**
 * Builds a "paste a link, get the media" command.
 *   hosts     : allowed hostnames
 *   prepare   : optional async (url) => url   (e.g. resolve short links)
 *   fallback  : optional async (url) => { url, type: 'image'|'video' }  used if yt-dlp fails
 */
export function makeLinkCommand({ name, aliases = [], label, emoji, hosts, desc, maxHeight = 720, prepare, fallback }) {
  return {
    name,
    aliases,
    category: 'download',
    desc: desc || `${label} downloader`,
    async run({ sock, jid, msg, args, reply, react, prefix }) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
      let url = findUrl(args, quotedText);

      if (!url || !hostMatches(url, hosts)) {
        return reply(`${emoji} *${label} downloader*\n\nUsage: ${prefix}${name} <${label} link>`);
      }

      await react('⏳');
      try {
        if (prepare) url = await prepare(url);
        await withLimit(async () => {
          let job;
          try {
            job = await downloadMedia(url, { maxHeight });
          } catch (err) {
            if (!fallback) throw err;
            console.warn(`[${name}] yt-dlp failed, using fallback:`, err?.message?.slice(0, 150));
            const f = await fallback(url);
            if (!f?.url) throw err;
            const { data } = await axios.get(f.url, { responseType: 'arraybuffer', timeout: 60000 });
            const content = f.type === 'video'
              ? { video: Buffer.from(data), mimetype: 'video/mp4' }
              : { image: Buffer.from(data) };
            return sock.sendMessage(jid, { ...content, caption: `${emoji} ${label}` }, { quoted: msg });
          }
          try {
            for (const file of job.files.slice(0, 10)) {
              await sendFile(sock, jid, file, { caption: `${emoji} ${label}`, quoted: msg });
            }
          } finally {
            job.cleanup();
          }
        });
        await react('✅');
      } catch (err) {
        console.error(`[${name}]`, err?.message);
        await react('❌');
        await reply(`❌ ${friendlyError(err)}`);
      }
    },
  };
}
