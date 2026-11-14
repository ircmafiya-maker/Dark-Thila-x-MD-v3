import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import ffmpegStatic from 'ffmpeg-static';

const exec = promisify(execFile);
const WIN = process.platform === 'win32';
const BIN_DIR = path.join(process.cwd(), 'bin');
const LOCAL_BIN = path.join(BIN_DIR, WIN ? 'yt-dlp.exe' : 'yt-dlp');
const MAX_AGE_MS = 3 * 24 * 3600 * 1000; // refresh yt-dlp every 3 days (YouTube breaks it often)

let binPath = process.env.YTDLP_PATH || LOCAL_BIN;
let ensuring = null;
let checkedAt = 0;

function assetName() {
  if (process.platform === 'linux') return process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
  if (WIN) return 'yt-dlp.exe';
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  return 'yt-dlp';
}

/** Downloads the latest standalone yt-dlp (no python needed on Linux) if missing/old. */
export function ensureYtDlp() {
  if (process.env.YTDLP_PATH) return Promise.resolve(binPath);
  // re-check once the binary is older than MAX_AGE_MS (a long-running process used to never refresh it)
  if (ensuring && Date.now() - checkedAt < MAX_AGE_MS) return ensuring;
  checkedAt = Date.now();
  ensuring = (async () => {
    try {
      const fresh = fs.existsSync(LOCAL_BIN) && Date.now() - fs.statSync(LOCAL_BIN).mtimeMs < MAX_AGE_MS;
      if (!fresh) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
        console.log('[yt-dlp] downloading latest build...');
        const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName()}`;
        const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000, maxRedirects: 5 });
        const tmp = `${LOCAL_BIN}.tmp`;
        fs.writeFileSync(tmp, Buffer.from(data));
        fs.chmodSync(tmp, 0o755);
        fs.renameSync(tmp, LOCAL_BIN);
        console.log('[yt-dlp] ready');
      }
      binPath = LOCAL_BIN;
    } catch (err) {
      console.error('[yt-dlp] auto-download failed:', err?.message);
      binPath = fs.existsSync(LOCAL_BIN) ? LOCAL_BIN : 'yt-dlp'; // fall back to system install
    }
    return binPath;
  })();
  // allow a retry on the next call if it failed completely
  ensuring.finally(() => { if (!fs.existsSync(LOCAL_BIN)) { ensuring = null; checkedAt = 0; } });
  return ensuring;
}

const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';

const cookiesFile = () => {
  const c = [process.env.YT_COOKIES_FILE, path.join(process.cwd(), 'cookies.txt')].filter(Boolean);
  return c.find((f) => fs.existsSync(f));
};

export const isYouTube = (url) => /(?:youtube\.com|youtu\.be)/i.test(url);

// YouTube breaks individual player clients often, so we cycle through several.
const YT_CLIENTS = [
  'tv_embedded,web_embedded',
  'android_vr,android_testsuite',
  'ios,ios_music',
  'tv,web_safari,mweb',
  'web,android',
];

const baseArgs = () => {
  const a = [
    '--no-playlist',
    '--no-check-certificate',
    '--geo-bypass',
    '--retries', '3',
    '--extractor-retries', '3',
    '--fragment-retries', '3',
    '--socket-timeout', '20',
    '--force-ipv4',
    '--ffmpeg-location', FFMPEG,
  ];
  const ck = cookiesFile();
  if (ck) a.push('--cookies', ck);
  return a;
};

/** Run yt-dlp. For YouTube links, retries across player clients. */
export async function runYtDlp(args, url, timeout = 120000) {
  await ensureYtDlp();
  const attempts = isYouTube(url)
    ? YT_CLIENTS.map((c) => ['--extractor-args', `youtube:player_client=${c};player_skip=webpage,configs`])
    : [[]];
  let lastErr;
  for (const extra of attempts) {
    try {
      return await exec(binPath, [...baseArgs(), ...extra, ...args, url], { timeout, maxBuffer: 32 * 1024 * 1024 });
    } catch (e) {
      const msg = (e?.stderr || e?.stdout || e?.message || String(e)).toString().trim();
      console.warn('[yt-dlp] attempt failed:', msg.slice(0, 250));
      lastErr = new Error(msg.split('\n').slice(-3).join(' | ').slice(0, 400));
    }
  }
  throw lastErr || new Error('yt-dlp failed');
}

const listFiles = (dir) =>
  fs.readdirSync(dir)
    .filter((f) => !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.endsWith('.json'))
    .map((f) => path.join(dir, f))
    .sort();

/**
 * Download media (video / image / carousel) to a temp folder.
 * Returns { files: [...], cleanup() }. ALWAYS call cleanup() when done.
 */
export async function downloadMedia(url, { maxHeight = 720, maxSecs = 0, timeout = 180000 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} };
  const out = ['-o', path.join(dir, '%(autonumber)s_%(id)s.%(ext)s')];
  const limits = ['--max-filesize', '95M'];
  if (maxSecs) limits.push('--match-filter', `duration<=${maxSecs}`);

  try {
    const fmt = `bv*[height<=${maxHeight}]+ba/b[height<=${maxHeight}]/b`;
    try {
      await runYtDlp(['-f', fmt, '--merge-output-format', 'mp4', ...limits, ...out], url, timeout);
    } catch (e) {
      // image-only posts (Pinterest / Instagram photos) have no video formats: retry without -f
      if (!listFiles(dir).length) await runYtDlp([...limits, ...out], url, timeout);
      else throw e;
    }
    const files = listFiles(dir);
    if (!files.length) throw new Error('No media downloaded (too long, too large, or unavailable).');
    return { files, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

/** Download audio as mp3. `target` = video URL. Returns { file, cleanup }. */
export async function downloadAudio(target, { timeout = 180000 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} };
  try {
    await runYtDlp(
      ['-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '5', '--max-filesize', '95M',
        '-o', path.join(dir, '%(id)s.%(ext)s')],
      target,
      timeout
    );
    const file = listFiles(dir)[0];
    if (!file) throw new Error('Audio file not created.');
    return { file, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}
