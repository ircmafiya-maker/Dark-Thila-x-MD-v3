import { updateJson, readJson } from './store.js';

const COOLDOWN_MS = 60_000;
const XP_MIN = 3;
const XP_MAX = 8;

export const xpToLevel = (xp) => Math.floor(Math.sqrt(xp / 30));
export const xpForLevel = (lvl) => lvl * lvl * 30;

export const rankBadge = (lvl) => {
  if (lvl >= 50) return '👑 LEGEND';
  if (lvl >= 40) return '🌌 MYTHIC';
  if (lvl >= 30) return '💎 DIAMOND';
  if (lvl >= 20) return '🔥 ELITE';
  if (lvl >= 15) return '⚡ EXPERT';
  if (lvl >= 10) return '⭐ PRO';
  if (lvl >= 5) return '🌿 RISING';
  return '🌱 NEWBIE';
};

const store = (groupJid) => `xp-${groupJid.replace(/[^a-zA-Z0-9]/g, '_')}`;

/** Adds XP (1 min cooldown). Returns { leveled, newLevel, xp } or null if on cooldown. */
const lastXp = new Map(); // "group|user" -> timestamp (in memory: no file I/O on every chat message)

export async function addXp(groupJid, userJid) {
  const ck = `${groupJid}|${userJid}`;
  if (Date.now() - (lastXp.get(ck) || 0) < COOLDOWN_MS) return null;
  lastXp.set(ck, Date.now());
  if (lastXp.size > 5000) lastXp.delete(lastXp.keys().next().value);
  let result = null;
  await updateJson(store(groupJid), (data) => {
    const now = Date.now();
    const e = data[userJid] || { xp: 0, last: 0 };
    if (now - e.last < COOLDOWN_MS) return data;
    const before = xpToLevel(e.xp);
    e.xp += Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
    e.last = now;
    data[userJid] = e;
    const after = xpToLevel(e.xp);
    result = { leveled: after > before, newLevel: after, xp: e.xp };
    return data;
  });
  return result;
}

export const getXp = (groupJid, userJid) => readJson(store(groupJid))[userJid]?.xp || 0;
export const getTop = (groupJid, n = 10) =>
  Object.entries(readJson(store(groupJid)))
    .map(([jid, v]) => ({ jid, xp: v.xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, n);
