import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { serialize } from './utils.js';

/** Tiny JSON-file store: data/<name>.json (in-memory cache, atomic writes) */
const cache = new Map();

const file = (name) => {
  fs.mkdirSync(config.dataDir, { recursive: true });
  return path.join(config.dataDir, `${name}.json`);
};

export const readJson = (name, fallback = {}) => {
  if (cache.has(name)) return structuredClone(cache.get(name));
  try {
    const f = file(name);
    if (fs.existsSync(f)) {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      cache.set(name, data);
      return structuredClone(data);
    }
  } catch (err) {
    console.error(`[store] could not read ${name}.json:`, err?.message);
  }
  return fallback;
};

export const writeJson = (name, data) => {
  cache.set(name, structuredClone(data));
  try {
    const f = file(name);
    const tmp = `${f}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, f); // atomic: a crash can never leave half a file
  } catch (err) {
    console.error(`[store] could not write ${name}.json:`, err?.message);
  }
};

/** Safe read-modify-write (serialized per name). */
export const updateJson = (name, mutate, fallback = {}) =>
  serialize(`store:${name}`, async () => {
    const data = readJson(name, fallback);
    const out = (await mutate(data)) ?? data;
    writeJson(name, out);
    return out;
  });
