import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { serialize } from './utils.js';
import { currentSid } from './context.js';

/** Tiny JSON-file store: data/sessions/<sid>/<name>.json (one folder per linked number) */
/** Data folder of the current session (legacy/no session = data/). */
export const sessionDataDir = (sid = currentSid()) =>
  !sid || sid === config.sessionId ? config.dataDir : path.join(config.dataDir, 'sessions', sid);

const file = (name) => {
  const dir = sessionDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${name}.json`);
};

export const readJson = (name, fallback = {}) => {
  try {
    const f = file(name);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {}
  return fallback;
};

export const writeJson = (name, data) => {
  try { fs.writeFileSync(file(name), JSON.stringify(data, null, 2)); } catch (_) {}
};

/** Safe read-modify-write (serialized per name). */
export const updateJson = (name, mutate, fallback = {}) =>
  serialize(`store:${currentSid() || '-'}:${name}`, async () => {
    const data = readJson(name, fallback);
    const out = (await mutate(data)) ?? data;
    writeJson(name, out);
    return out;
  });
