import http from 'http';
import crypto from 'crypto';
import { config } from '../config.js';
import { runtime, requestPair } from '../lib/runtime.js';
import { homePage, pairPage, loginPage, adminPage } from './pages.js';

const COOKIE = 'dtx_admin';
const SESSION_MS = 12 * 3600 * 1000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const secret = () => sha(`dtxmd:${config.adminPassword}`);

// ---- auth ----------------------------------------------------------------
const sign = (exp) => crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');
const makeToken = () => { const exp = Date.now() + SESSION_MS; return `${exp}.${sign(exp)}`; };
function validToken(tok) {
  if (!config.adminPassword || !tok) return false;
  const [exp, mac] = String(tok).split('.');
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return mac.length === good.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good));
}
const cookieOf = (req) => {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
};
const isAdmin = (req) => validToken(cookieOf(req));
const passwordOk = (pw) =>
  !!config.adminPassword && crypto.timingSafeEqual(sha(pw ?? ''), sha(config.adminPassword));

// 6 wrong passwords per IP -> 10 minute lockout
const fails = new Map();
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
function locked(ip) { const f = fails.get(ip); return f && f.n >= 6 && f.until > Date.now(); }
function failed(ip) {
  const f = fails.get(ip) || { n: 0, until: 0 };
  f.n += 1; f.until = Date.now() + 10 * 60 * 1000; fails.set(ip, f);
}
setInterval(() => { for (const [k, v] of fails) if (v.until < Date.now()) fails.delete(k); }, 60000).unref();

// ---- helpers -------------------------------------------------------------
const SEC = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'",
};
const html = (res, body, code = 200) => { res.writeHead(code, { ...SEC, 'Content-Type': 'text/html; charset=utf-8' }); res.end(body); };
const json = (res, code, obj, headers = {}) => { res.writeHead(code, { ...SEC, 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve, reject) => {
  if (!(req.headers['content-type'] || '').includes('application/json')) return reject(Object.assign(new Error('JSON only'), { code: 415 }));
  let n = 0; const chunks = [];
  req.on('data', (c) => { n += c.length; if (n > 20000) { reject(Object.assign(new Error('Too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(Object.assign(new Error('Bad JSON'), { code: 400 })); } });
  req.on('error', reject);
});
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const toJid = (v) => {
  const t = String(v ?? '').trim();
  if (t.includes('@')) return t;
  const d = digits(t);
  return d.length >= 8 && d.length <= 15 ? `${d}@s.whatsapp.net` : null;
};

let cmdList = null;
async function commandList() {
  if (cmdList) return cmdList;
  try {
    const { commands } = await import('../commands/index.js');
    cmdList = [...commands.values()].map((c) => ({ name: c.name, category: c.category || 'other', desc: c.desc || '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { cmdList = []; }
  return cmdList;
}

// QR image (needs the `qrcode` package; cached per QR string)
let QRLib;
let qrCache = { text: '', url: '' };
async function qrImage(text) {
  if (qrCache.text === text) return qrCache.url;
  if (QRLib === undefined) { try { QRLib = (await import('qrcode')).default; } catch { QRLib = null; } }
  if (!QRLib) return null;
  const url = await QRLib.toDataURL(text, { margin: 1, width: 420, errorCorrectionLevel: 'M' });
  qrCache = { text, url };
  return url;
}
const pairAllowed = (req) => config.pairPublic || isAdmin(req);

let groupCache = { at: 0, data: [] };

// ---- routes --------------------------------------------------------------
async function route(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  const key = `${req.method} ${pathname}`;
  const ip = ipOf(req);
  const secure = String(req.headers['x-forwarded-proto'] || '').includes('https');

  if (key === 'GET /health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (key === 'GET /') return html(res, homePage());
  if (key === 'GET /pair') return html(res, pairPage());
  if (key === 'GET /admin') return html(res, isAdmin(req) ? adminPage() : loginPage(!!config.adminPassword));

  if (key === 'GET /api/pair/status') {
    return json(res, 200, {
      status: runtime.status,
      registered: runtime.registered,
      ready: runtime.qrSeen && !runtime.registered,
      user: runtime.user?.id ? digits(runtime.user.id.split(':')[0]) : null,
      needsPassword: !config.pairPublic,
      passwordConfigured: !!config.adminPassword,
      loggedIn: isAdmin(req),
    });
  }

  if (key === 'GET /api/pair/qr') {
    if (!pairAllowed(req)) return json(res, 401, { error: 'Locked' });
    if (runtime.registered) return json(res, 200, { qr: null, error: 'Already linked' });
    if (!runtime.qr || Date.now() - runtime.qrAt > 70000) return json(res, 200, { qr: null, error: 'Waiting for QR…' });
    const qr = await qrImage(runtime.qr);
    return json(res, 200, qr ? { qr } : { qr: null, error: 'QR support missing: run npm install (package "qrcode")' });
  }

  if (key === 'POST /api/pair') {
    const b = await readBody(req);
    if (!config.pairPublic) {
      if (!config.adminPassword) return json(res, 403, { error: 'Pairing is locked. Set ADMIN_PASSWORD or PAIR_PUBLIC=true.' });
      if (!isAdmin(req)) {
        if (locked(ip)) return json(res, 429, { error: 'Too many attempts. Try again later.' });
        if (!passwordOk(b.password)) { failed(ip); return json(res, 401, { error: 'Wrong password' }); }
      }
    }
    const number = digits(b.number);
    if (number.length < 8 || number.length > 15) return json(res, 400, { error: 'Enter the number with country code, digits only.' });
    try { return json(res, 200, { code: await requestPair(number) }); }
    catch (e) { return json(res, 400, { error: e?.message || 'Could not get a code' }); }
  }

  if (key === 'POST /api/admin/login') {
    const b = await readBody(req);
    if (!config.adminPassword) return json(res, 403, { error: 'ADMIN_PASSWORD is not set' });
    if (locked(ip)) return json(res, 429, { error: 'Too many attempts. Try again in 10 minutes.' });
    if (!passwordOk(b.password)) { failed(ip); return json(res, 401, { error: 'Wrong password' }); }
    fails.delete(ip);
    return json(res, 200, { ok: true }, {
      'Set-Cookie': `${COOKIE}=${encodeURIComponent(makeToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure ? '; Secure' : ''}`,
    });
  }
  if (key === 'POST /api/admin/signout') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
  }

  // everything below needs a valid admin cookie
  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return json(res, 401, { error: 'Not signed in' });

    if (key === 'GET /api/admin/status') {
      return json(res, 200, {
        status: runtime.status,
        registered: runtime.registered,
        user: runtime.user?.id ? digits(runtime.user.id.split(':')[0]) : null,
        owner: config.ownerNumber,
        prefix: config.prefix,
        mode: config.mode,
        uptime: Date.now() - runtime.startedAt,
        storage: runtime.storage,
        commands: (await commandList()).length,
        memMb: Math.round(process.memoryUsage().rss / 1048576),
        node: process.version,
      });
    }
    if (key === 'GET /api/admin/logs') return json(res, 200, { logs: runtime.logs.slice(-150) });
    if (key === 'GET /api/admin/commands') return json(res, 200, { commands: await commandList() });

    if (key === 'GET /api/admin/groups') {
      if (!runtime.sock || runtime.status !== 'online') return json(res, 400, { error: 'Bot is not connected' });
      if (Date.now() - groupCache.at > 60000) {
        const all = await runtime.sock.groupFetchAllParticipating();
        groupCache = {
          at: Date.now(),
          data: Object.values(all).map((g) => ({ id: g.id, name: g.subject, size: g.participants?.length || 0 }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      }
      return json(res, 200, { groups: groupCache.data });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      if (key === 'POST /api/admin/mode') {
        if (!['public', 'private'].includes(b.mode)) return json(res, 400, { error: 'public or private' });
        config.mode = b.mode;
        return json(res, 200, { ok: true });
      }
      if (key === 'POST /api/admin/restart') {
        if (!runtime.sock) return json(res, 400, { error: 'No active connection' });
        runtime.sock.end(new Error('Restart from admin panel'));
        return json(res, 200, { ok: true });
      }
      if (key === 'POST /api/admin/logout-wa') {
        if (!runtime.sock) return json(res, 400, { error: 'No active connection' });
        try { await runtime.sock.logout(); } catch { runtime.sock.end(new Error('Logout from admin panel')); }
        return json(res, 200, { ok: true });
      }
      if (key === 'POST /api/admin/send') {
        if (!runtime.sock || runtime.status !== 'online') return json(res, 400, { error: 'Bot is not connected' });
        const jid = toJid(b.to);
        const text = String(b.text ?? '').trim();
        if (!jid) return json(res, 400, { error: 'Invalid number or group id' });
        if (!text || text.length > 4000) return json(res, 400, { error: 'Message is empty or too long' });
        await runtime.sock.sendMessage(jid, { text });
        return json(res, 200, { ok: true });
      }
    }
  }

  return json(res, 404, { error: 'Not found' });
}

export function startWebServer() {
  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => {
      console.error('[web]', e?.message || e);
      if (!res.headersSent) json(res, e?.code >= 400 && e.code < 500 ? e.code : 500, { error: e?.code >= 400 && e.code < 500 ? e.message : 'Server error' });
    });
  });
  server.listen(config.port, '0.0.0.0', () => console.log(`[http] listening on ${config.port}`));
  if (!config.adminPassword) console.warn('[web] ADMIN_PASSWORD is not set: admin panel is locked' + (config.pairPublic ? '' : ' and pairing is locked'));
  return server;
}
