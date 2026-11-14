import './src/lib/runtime.js'; // first: starts capturing logs for the admin panel
import axios from 'axios';
import { config } from './src/config.js';
import { startBot, shutdown } from './src/connection.js';
import { ensureYtDlp } from './src/lib/ytdlp.js';
import { startWebServer } from './src/web/server.js';

// Web: / (status) /pair (get pairing code) /admin (panel) /health (keep-alive)
startWebServer();

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

// Render free web services sleep after ~15 min without traffic. Ping ourselves
// (RENDER_EXTERNAL_URL is set by Render automatically, or set KEEP_ALIVE_URL).
const selfUrl = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
if (selfUrl) {
  setInterval(() => {
    axios.get(`${selfUrl.replace(/\/$/, '')}/health`, { timeout: 15000 }).catch(() => {});
  }, 10 * 60 * 1000);
  console.log(`[keep-alive] pinging ${selfUrl} every 10 min`);
}

// Render sends SIGTERM on redeploy: flush the WhatsApp session first
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    console.log(`[${sig}] shutting down...`);
    await Promise.race([shutdown(), new Promise((r) => setTimeout(r, 5000))]);
    process.exit(0);
  });
}

ensureYtDlp(); // download latest yt-dlp in the background
startBot().catch((e) => console.error('[bot] start failed:', e?.message || e));
