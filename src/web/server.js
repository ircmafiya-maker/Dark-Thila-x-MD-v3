import http from 'http';
import crypto from 'crypto';
import { config } from '../config.js';
import { runtime } from '../lib/runtime.js';
import {
  sessions, createPending, destroySession, restartSession, requestCode,
  sendOtp, verifyOtp, findByNumber, pendingCount, canCreate,
} from '../connection.js';
import { homePage, pairPage, dashboardPage, loginPage, adminPage, adminLoginPage } from './pages.js';

const SESSION_MS = 12 * 3600 * 1000;
const ADMIN_COOKIE = 'dtx_admin';
const USER_COOKIE = 'dtx_user';
const PAIR_COOKIE = 'dtx_pair';

// ---------------------------------------------------------------- tokens
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const mac = (s) => crypto.createHmac('sha256', config.webSecret).update(s).digest('hex').slice(0, 40);
const sign = (kind, id, ttl) => { const exp = Date.now() + ttl; return `${id}.${exp}.${mac(`${kind}.${id}.${exp}`)}`; };
function verify(kind, tok) {
  const parts = String(tok || '').split('.');
  if (parts.length !== 3) return null;
  const [id, exp, m] = parts;
  if (Number(exp) < Date.now()) return null;
  const good = mac(`${kind}.${id}.${exp}`);
  if (m.length !== good.length || !crypto.timingSafeEqual(Buffer.from(m), Buffer.from(good))) return null;
  return id;
}
const cookieOf = (req, name) => {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
};
const setCookie = (req, name, value, maxAgeSec) =>
  `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}${String(req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : ''}`;

const isAdmin = (req) => !!config.adminPassword && verify('admin', cookieOf(req, ADMIN_COOKIE)) === 'admin';
const userSession = (req) => { const sid = verify('user', cookieOf(req, USER_COOKIE)); return sid ? sessions.get(sid) || null : null; };
const pairSession = (req) => { const sid = verify('pair', cookieOf(req, PAIR_COOKIE)); return sid ? sessions.get(sid) || null : null; };
const passwordOk = (pw) => !!config.adminPassword && crypto.timingSafeEqual(sha(pw ?? ''), sha(config.adminPassword));

// ---------------------------------------------------------------- rate limits
const hits = new Map(); // key -> { n, reset }
function limited(key, max, windowMs) {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now) h = { n: 0, reset: now + windowMs };
  h.n += 1; hits.set(key, h);
  return h.n > max;
}
setInterval(() => { for (const [k, v] of hits) if (v.reset < Date.now()) hits.delete(k); }, 60000).unref();
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// ---------------------------------------------------------------- helpers
const SEC = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'",
};
const html = (res, body, code = 200) => { res.writeHead(code, { ...SEC, 'Content-Type': 'text/html; charset=utf-8' }); res.end(body); };
const json = (res, code, obj, cookies = []) => {
  res.writeHead(code, { ...SEC, 'Content-Type': 'application/json', ...(cookies.length ? { 'Set-Cookie': cookies } : {}) });
  res.end(JSON.stringify(obj));
};
const httpErr = (code, message) => Object.assign(new Error(message), { code });
const readBody = (req) => new Promise((resolve, reject) => {
  if (!(req.headers['content-type'] || '').includes('application/json')) return reject(httpErr(415, 'JSON only'));
  let n = 0; const chunks = [];
  req.on('data', (c) => { n += c.length; if (n > 20000) { reject(httpErr(413, 'Too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(httpErr(400, 'Bad JSON')); } });
  req.on('error', reject);
});
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const validNumber = (n) => n.length >= 8 && n.length <= 15;
const toJid = (v) => {
  const t = String(v ?? '').trim();
  if (t.includes('@')) return t;
  const d = digits(t);
  return validNumber(d) ? `${d}@s.whatsapp.net` : null;
};
const uptimeOf = (s) => (s.connectedAt ? Date.now() - s.connectedAt : 0);

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
const qrCache = new Map();
async function qrImage(text) {
  if (qrCache.has(text)) return qrCache.get(text);
  if (QRLib === undefined) { try { QRLib = (await import('qrcode')).default; } catch { QRLib = null; } }
  if (!QRLib) return null;
  const url = await QRLib.toDataURL(text, { margin: 1, width: 420, errorCorrectionLevel: 'M' });
  qrCache.set(text, url);
  if (qrCache.size > 50) qrCache.delete(qrCache.keys().next().value);
  return url;
}

const groupCache = new Map(); // sid -> { at, data }
async function groupsOf(s) {
  if (!s.sock || s.status !== 'online') throw httpErr(400, 'Bot is not connected');
  const c = groupCache.get(s.sid);
  if (c && Date.now() - c.at < 60000) return c.data;
  const all = await s.sock.groupFetchAllParticipating();
  const data = Object.values(all).map((g) => ({ id: g.id, name: g.subject, size: g.participants?.length || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  groupCache.set(s.sid, { at: Date.now(), data });
  return data;
}

const publicInfo = (s) => ({
  sid: s.sid,
  number: s.number,
  status: s.registered ? s.status : 'pairing',
  mode: s.settings.mode,
  prefix: s.settings.prefix,
  uptime: uptimeOf(s),
  createdAt: s.createdAt,
  legacy: s.legacy,
});

function applySettings(s, b) {
  if (b.mode !== undefined) {
    if (!['public', 'private'].includes(b.mode)) throw httpErr(400, 'Mode must be public or private');
    s.settings.mode = b.mode;
  }
  if (b.prefix !== undefined) {
    const p = String(b.prefix);
    if (!/^[^\s\w@]{1,3}$/u.test(p)) throw httpErr(400, 'Prefix: 1-3 symbols (for example . ! # $)');
    s.settings.prefix = p;
  }
  return s.save();
}

async function sendVia(s, b) {
  if (!s.sock || s.status !== 'online') throw httpErr(400, 'Bot is not connected');
  const jid = toJid(b.to);
  const text = String(b.text ?? '').trim();
  if (!jid) throw httpErr(400, 'Invalid number or group id');
  if (!text || text.length > 4000) throw httpErr(400, 'Message is empty or too long');
  await s.sock.sendMessage(jid, { text });
}

const logsFor = (sid, level) =>
  runtime.logs.filter((l) => (sid ? l.sid === sid : true)).slice(-200)
    .map((l) => ({ t: l.t, level: l.level, sid: l.sid, line: l.line }));

// ---------------------------------------------------------------- routes
async function route(req, res) {
  const { pathname, searchParams } = new URL(req.url, 'http://x');
  const key = `${req.method} ${pathname}`;
  const ip = ipOf(req);

  // ---- pages
  if (key === 'GET /health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (key === 'GET /') return html(res, homePage());
  if (key === 'GET /pair') return html(res, pairPage());
  if (key === 'GET /dashboard') return html(res, userSession(req) ? dashboardPage() : loginPage());
  if (key === 'GET /admin') return html(res, isAdmin(req) ? adminPage() : adminLoginPage(!!config.adminPassword));

  // ---- public stats
  if (key === 'GET /api/public') {
    const all = [...sessions.values()];
    return json(res, 200, { online: all.filter((s) => s.status === 'online').length, pairing: config.pairPublic || isAdmin(req), full: !canCreate() });
  }

  // ---- pairing (each visitor links their OWN number as their own session)
  if (key === 'GET /api/pair/state') {
    const s = pairSession(req);
    if (!s) return json(res, 200, { phase: 'none', open: config.pairPublic || isAdmin(req), full: !canCreate() });
    if (s.registered && s.status === 'online') {
      s.pairClaim = false;
      return json(res, 200, { phase: 'linked', number: s.number }, [
        setCookie(req, USER_COOKIE, sign('user', s.sid, SESSION_MS), SESSION_MS / 1000),
        setCookie(req, PAIR_COOKIE, '', 0),
      ]);
    }
    const codeAge = Date.now() - s.pairCodeAt;
    const qr = s.qr && Date.now() - s.qrAt < 70000 ? await qrImage(s.qr).catch(() => null) : null;
    return json(res, 200, {
      phase: s.qrSeen ? 'ready' : 'connecting',
      code: s.pairCode && codeAge < 120000 ? s.pairCode : null,
      codeAge: s.pairCode ? Math.floor(codeAge / 1000) : null,
      qr,
      qrMissing: !!(s.qr && !qr),
      number: s.pairNumber,
    });
  }

  if (key === 'POST /api/pair/start') {
    const b = await readBody(req);
    if (!config.pairPublic && !isAdmin(req)) return json(res, 403, { error: 'Pairing is closed right now.' });
    if (limited(`pair:${ip}`, 6, 10 * 60 * 1000)) return json(res, 429, { error: 'Too many attempts. Try again in a few minutes.' });
    const number = b.number ? digits(b.number) : null;
    if (b.number && !validNumber(number)) return json(res, 400, { error: 'Enter the number with country code, digits only.' });
    const old = pairSession(req);
    if (old && !old.registered) await destroySession(old.sid);
    if ([...sessions.values()].filter((x) => !x.registered && x.ip === ip).length >= 2) return json(res, 429, { error: 'Finish or cancel your current pairing first.' });
    if (pendingCount() >= 8) return json(res, 503, { error: 'Many people are pairing right now. Try again in a minute.' });
    try {
      const s = createPending({ number, ip });
      return json(res, 200, { ok: true }, [setCookie(req, PAIR_COOKIE, sign('pair', s.sid, 15 * 60 * 1000), 900)]);
    } catch (e) { return json(res, 503, { error: e.message }); }
  }

  if (key === 'POST /api/pair/code') {
    const b = await readBody(req);
    const s = pairSession(req);
    if (!s || s.registered) return json(res, 400, { error: 'Start pairing first.' });
    const number = digits(b.number);
    if (!validNumber(number)) return json(res, 400, { error: 'Enter the number with country code, digits only.' });
    s.pairNumber = number;
    try { s.pairCode = null; await requestCode(s, number); return json(res, 200, { ok: true }); }
    catch (e) { return json(res, 400, { error: e?.message || 'Could not get a code' }); }
  }

  if (key === 'POST /api/pair/cancel') {
    const s = pairSession(req);
    if (s && !s.registered) await destroySession(s.sid);
    return json(res, 200, { ok: true }, [setCookie(req, PAIR_COOKIE, '', 0)]);
  }

  // ---- dashboard login: a code is sent to the user's own WhatsApp
  if (key === 'POST /api/user/otp') {
    const b = await readBody(req);
    const number = digits(b.number);
    if (!validNumber(number)) return json(res, 400, { error: 'Enter your number with country code.' });
    if (limited(`otp-ip:${ip}`, 6, 10 * 60 * 1000) || limited(`otp:${number}`, 3, 10 * 60 * 1000)) {
      return json(res, 429, { error: 'Too many requests. Try again in a few minutes.' });
    }
    try { await sendOtp(number); } catch (e) { console.error('[otp]', e?.message); }
    // same answer whether or not the number is linked (no number lookup)
    return json(res, 200, { ok: true });
  }
  if (key === 'POST /api/user/login') {
    const b = await readBody(req);
    const number = digits(b.number);
    if (limited(`login:${ip}`, 12, 10 * 60 * 1000)) return json(res, 429, { error: 'Too many attempts. Try again later.' });
    const s = validNumber(number) ? verifyOtp(number, b.code) : null;
    if (!s) return json(res, 401, { error: 'Wrong or expired code' });
    return json(res, 200, { ok: true }, [setCookie(req, USER_COOKIE, sign('user', s.sid, SESSION_MS), SESSION_MS / 1000)]);
  }
  if (key === 'POST /api/user/signout') return json(res, 200, { ok: true }, [setCookie(req, USER_COOKIE, '', 0)]);

  // ---- user dashboard API (only ever touches the signed-in user's own session)
  if (pathname.startsWith('/api/me/')) {
    const s = userSession(req);
    if (!s) return json(res, 401, { error: 'Not signed in' });

    if (key === 'GET /api/me/status') {
      return json(res, 200, { ...publicInfo(s), botName: config.botName, commands: (await commandList()).length, owner: s.legacy ? config.ownerNumber : s.number });
    }
    if (key === 'GET /api/me/logs') return json(res, 200, { logs: logsFor(s.sid) });
    if (key === 'GET /api/me/commands') return json(res, 200, { commands: await commandList() });
    if (key === 'GET /api/me/groups') return json(res, 200, { groups: await groupsOf(s) });
    if (req.method === 'POST') {
      const b = await readBody(req);
      if (key === 'POST /api/me/settings') { await applySettings(s, b); return json(res, 200, { ok: true }); }
      if (key === 'POST /api/me/restart') { restartSession(s.sid); return json(res, 200, { ok: true }); }
      if (key === 'POST /api/me/send') { await sendVia(s, b); return json(res, 200, { ok: true }); }
      if (key === 'POST /api/me/unlink') {
        await destroySession(s.sid, { logout: true });
        return json(res, 200, { ok: true }, [setCookie(req, USER_COOKIE, '', 0)]);
      }
    }
    return json(res, 404, { error: 'Not found' });
  }

  // ---- admin login
  if (key === 'POST /api/admin/login') {
    const b = await readBody(req);
    if (!config.adminPassword) return json(res, 403, { error: 'ADMIN_PASSWORD is not set' });
    if (limited(`adm:${ip}`, 6, 10 * 60 * 1000)) return json(res, 429, { error: 'Too many attempts. Try again in 10 minutes.' });
    if (!passwordOk(b.password)) return json(res, 401, { error: 'Wrong password' });
    hits.delete(`adm:${ip}`);
    return json(res, 200, { ok: true }, [setCookie(req, ADMIN_COOKIE, sign('admin', 'admin', SESSION_MS), SESSION_MS / 1000)]);
  }
  if (key === 'POST /api/admin/signout') return json(res, 200, { ok: true }, [setCookie(req, ADMIN_COOKIE, '', 0)]);

  // ---- admin API (platform owner: sees and manages every session)
  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return json(res, 401, { error: 'Not signed in' });

    if (key === 'GET /api/admin/overview') {
      const all = [...sessions.values()];
      return json(res, 200, {
        platform: {
          total: all.length,
          online: all.filter((s) => s.status === 'online').length,
          pairing: all.filter((s) => !s.registered).length,
          max: config.maxSessions,
          publicPairing: config.pairPublic,
          uptime: Date.now() - runtime.startedAt,
          memMb: Math.round(process.memoryUsage().rss / 1048576),
          node: process.version,
          storage: runtime.storage,
          commands: (await commandList()).length,
          owner: config.ownerNumber,
        },
        sessions: all.map(publicInfo).sort((a, b) => b.createdAt - a.createdAt),
      });
    }
    if (key === 'GET /api/admin/logs') return json(res, 200, { logs: logsFor(searchParams.get('sid') || null) });
    if (key === 'GET /api/admin/commands') return json(res, 200, { commands: await commandList() });
    if (key === 'GET /api/admin/groups') {
      const s = sessions.get(searchParams.get('sid'));
      if (!s) return json(res, 404, { error: 'Session not found' });
      return json(res, 200, { groups: await groupsOf(s) });
    }
    if (req.method === 'POST') {
      const b = await readBody(req);
      if (key === 'POST /api/admin/settings') {
        if (b.publicPairing !== undefined) config.pairPublic = !!b.publicPairing;
        if (b.maxSessions !== undefined) {
          const n = Math.floor(Number(b.maxSessions));
          if (!(n >= 1 && n <= 200)) return json(res, 400, { error: 'Max sessions must be 1-200' });
          config.maxSessions = n;
        }
        return json(res, 200, { ok: true });
      }
      if (key === 'POST /api/admin/session') {
        const s = sessions.get(b.sid);
        if (!s) return json(res, 404, { error: 'Session not found' });
        if (b.action === 'restart') restartSession(s.sid);
        else if (b.action === 'settings') await applySettings(s, b);
        else if (b.action === 'send') await sendVia(s, b);
        else if (b.action === 'delete') await destroySession(s.sid, { logout: true });
        else return json(res, 400, { error: 'Unknown action' });
        return json(res, 200, { ok: true });
      }
    }
  }

  return json(res, 404, { error: 'Not found' });
}

export function startWebServer() {
  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => {
      const known = e?.code >= 400 && e.code < 500;
      console.error('[web]', e?.message || e);
      if (!res.headersSent) json(res, known ? e.code : 500, { error: known ? e.message : 'Server error' });
    });
  });
  server.listen(config.port, '0.0.0.0', () => console.log(`[http] listening on ${config.port}`));
  if (!config.adminPassword) console.warn('[web] ADMIN_PASSWORD is not set: admin panel is locked');
  return server;
}
