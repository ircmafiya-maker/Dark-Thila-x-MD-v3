import axios from 'axios';
import { makeLinkCommand } from '../lib/linkCommand.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// pin.it short links -> real pin URL (query string removed)
async function resolve(url) {
  let u = url;
  if (/pin\.it/i.test(u)) {
    try {
      const r = await axios.get(u, { headers: { 'User-Agent': UA }, maxRedirects: 5, timeout: 15000 });
      u = r.request?.res?.responseUrl || u;
    } catch (_) {}
  }
  return u.split('?')[0].replace(/\/$/, '');
}

// If yt-dlp can't handle it, read og:video / og:image from the page.
async function ogFallback(url) {
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });
  const html = String(data);
  const pick = (prop) =>
    (html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) || [])[1];
  const video = pick('og:video') || pick('og:video:url');
  if (video && /\.mp4/i.test(video)) return { url: video, type: 'video' };
  const image = pick('og:image');
  return image ? { url: image.replace(/\/\d+x\//, '/originals/'), type: 'image' } : null;
}

export default makeLinkCommand({
  name: 'pin',
  aliases: ['pindl', 'pintdl', 'pinterest'],
  label: 'Pinterest',
  emoji: '📌',
  hosts: ['pinterest.com', 'pin.it', 'pinterest.co.uk', 'pinterest.ca', 'pinterest.fr', 'pinterest.de'],
  prepare: resolve,
  fallback: ogFallback,
});
