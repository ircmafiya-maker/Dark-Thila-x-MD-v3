import 'dotenv/config';

const digits = (v = '') => String(v).replace(/\D/g, '');

export const config = {
  botName: process.env.BOT_NAME || 'DARK THILA X MD',
  prefix: process.env.PREFIX || '.',
  ownerNumber: digits(process.env.OWNER_NUMBER),
  pairNumber: digits(process.env.PAIR_NUMBER),
  mode: (process.env.MODE || 'public').toLowerCase(), // public | private
  mongoUri: process.env.MONGODB_URI || '',
  sessionId: process.env.SESSION_ID || 'main',
  port: Number(process.env.PORT) || 8080,
  adminPassword: process.env.ADMIN_PASSWORD || '',
  pairPublic: String(process.env.PAIR_PUBLIC || '').toLowerCase() === 'true',
  dataDir: 'data',
};
