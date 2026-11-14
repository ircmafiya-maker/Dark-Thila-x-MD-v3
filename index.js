import http from 'http';
import { config } from './src/config.js';
import { startBot } from './src/connection.js';
import { ensureYtDlp } from './src/lib/ytdlp.js';

// Tiny health server so Render/Heroku keep the service alive.
http
  .createServer((_, res) => { res.writeHead(200); res.end(`${config.botName} is running`); })
  .listen(config.port, () => console.log(`[http] listening on ${config.port}`));

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

ensureYtDlp(); // download latest yt-dlp in the background
startBot();
