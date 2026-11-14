import './src/lib/runtime.js'; // first: starts capturing logs for the admin panel
import axios from 'axios';
import { config } from './src/config.js';
import { startBot } from './src/connection.js';
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

ensureYtDlp(); // download latest yt-dlp in the background
startBot();
