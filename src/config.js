import 'dotenv/config';
import crypto from 'crypto';

const digits = (v = '') => String(v).replace(/\D/g, '');
const adminPassword = process.env.ADMIN_PASSWORD || '';

export const config = {
  botName: process.env.BOT_NAME || 'DARK THILA X MD',
  prefix: process.env.PREFIX || '.',                 // default prefix for new sessions
  ownerNumber: digits(process.env.OWNER_NUMBER),     // platform owner (also gets owner rights on the legacy SESSION_ID session)
  ownerSudo: String(process.env.OWNER_SUDO || '').toLowerCase() === 'true', // true = OWNER_NUMBER is owner on EVERY session
  mode: (process.env.MODE || 'public').toLowerCase(), // default mode for new sessions: public | private
  mongoUri: process.env.MONGODB_URI || '',
  sessionId: process.env.SESSION_ID || 'main',       // legacy single-session id (adopted automatically if it exists)
  port: Number(process.env.PORT) || 8080,
  dataDir: 'data',
  adminPassword,
  // anyone can pair their own number on /pair (false = only the signed-in admin can)
  pairPublic: String(process.env.PAIR_PUBLIC ?? 'true').toLowerCase() !== 'false',
  maxSessions: Number(process.env.MAX_SESSIONS) || 15,
  // signs login cookies. Set SESSION_SECRET so logins survive restarts.
  webSecret:
    process.env.SESSION_SECRET ||
    (adminPassword ? crypto.createHash('sha256').update(`dtxsec:${adminPassword}`).digest('hex') : crypto.randomBytes(32).toString('hex')),
};
